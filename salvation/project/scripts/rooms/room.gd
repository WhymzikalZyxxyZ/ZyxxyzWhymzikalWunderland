class_name Room
extends Node2D
## A single room: generates its own floor, boundary walls (with gaps on
## whichever sides have doors), and starts hidden until a player first
## steps inside — a plain AABB check against PlayerController.active_players.
## Tracks its enemies in a list and polls is_instance_valid each frame
## rather than relying on a freed reference lingering.
##
## Enemies are NOT attached up front. DungeonGenerator only hands a Room a
## list of PackedScenes to spawn (enemy_scenes_to_spawn) before add_child();
## the room doesn't actually instantiate any of them until the moment it's
## first revealed, so nothing exists — walking around, colliding, chasing —
## for a room the player hasn't stepped into yet.

const FLOOR_Z_INDEX := -2
const WALL_Z_INDEX := -1

## Room rectangle in this node's local space. Drives the floor, walls, and reveal check.
@export var bounds: Rect2 = Rect2(-200, -200, 400, 400)

@export var starts_hidden: bool = false
@export var wall_thickness: float = 20.0
@export var floor_color: Color = Color(0.09, 0.08, 0.1)
@export var wall_color: Color = Color(0.05, 0.045, 0.05)
@export var gore_seed: int = 0

@export var has_left_door: bool = false
@export var has_right_door: bool = false
@export var has_top_door: bool = false
@export var has_bottom_door: bool = false
@export var door_gap_center_y: float = 0.0
@export var door_gap_center_x: float = 0.0
@export var door_gap_size: float = 90.0

## Set by DungeonGenerator before add_child(). Instantiated lazily, only
## once this room is actually revealed — see _spawn_pending_enemies().
@export var enemy_scenes_to_spawn: Array[PackedScene] = []

var is_cleared: bool = false
var is_revealed: bool = false

var _enemies: Array[Enemy] = []
var _enemies_spawned: bool = false
var _camera: Camera2D


func _ready() -> void:
	_build_floor()
	_build_walls()
	_build_obstacles()
	_camera = _build_camera()

	# Nothing to spawn yet, so a room with no pending enemies is cleared
	# immediately; one that has enemies queued stays uncleared until they're
	# actually spawned (on reveal) and then defeated.
	is_cleared = enemy_scenes_to_spawn.is_empty()

	is_revealed = not starts_hidden
	visible = is_revealed
	if is_revealed:
		_camera.make_current()
		_spawn_pending_enemies()


func _physics_process(_delta: float) -> void:
	if not is_cleared:
		_enemies = _enemies.filter(func(e): return is_instance_valid(e))
		if _enemies_spawned and _enemies.is_empty():
			is_cleared = true

	if not is_revealed:
		for player: PlayerController in PlayerController.active_players:
			if not is_instance_valid(player):
				continue
			if not bounds.has_point(to_local(player.global_position)):
				continue

			is_revealed = true
			visible = true
			_camera.make_current()
			_spawn_pending_enemies()
			break


## Instantiates every queued enemy scene at a random position within this
## room's bounds — the same spread DungeonGenerator used to compute up
## front, now done here since spawning happens here. A no-op past the
## first call, so revealing a room twice (shouldn't normally happen, but
## cheap to guard) can't double-spawn.
func _spawn_pending_enemies() -> void:
	if _enemies_spawned:
		return
	_enemies_spawned = true

	if enemy_scenes_to_spawn.is_empty():
		return

	var rng := RandomNumberGenerator.new()
	rng.seed = gore_seed + 104729

	for scene in enemy_scenes_to_spawn:
		var enemy: Enemy = scene.instantiate()
		# A boss gets the room's center, same as the old up-front spawn did —
		# rank-and-file enemies still scatter randomly.
		enemy.position = bounds.get_center() if enemy.is_boss else Vector2(
			rng.randf_range(bounds.position.x + 60.0, bounds.end.x - 60.0),
			rng.randf_range(bounds.position.y + 60.0, bounds.end.y - 60.0)
		)
		add_child(enemy)
		_enemies.append(enemy)

	is_cleared = _enemies.is_empty()


## Copy of whatever's actually been spawned so far — used by DungeonGenerator
## to find the boss once it exists, since binding the health bar at
## generation time isn't possible anymore (nothing has spawned yet then).
func get_spawned_enemies() -> Array[Enemy]:
	return _enemies.duplicate()


## Isaac-style locked room camera: fixed on this room's center, swapped in via make_current the moment the room is revealed.
func _build_camera() -> Camera2D:
	var camera := Camera2D.new()
	camera.position = bounds.get_center()
	camera.zoom = Vector2(0.85, 0.85)
	add_child(camera)
	return camera


## Environment layer, always behind actors. DungeonGenerator attaches the
## player to the start Room BEFORE it enters the tree, and enemies are
## spawned later still (lazily, on reveal — see _spawn_pending_enemies),
## so actors can end up either earlier or later children than this floor
## depending on the room. Explicit z_index sidesteps child order entirely
## instead of relying on it either way.
func _build_floor() -> void:
	var tile := EnvironmentArt.build_floor_tile(floor_color)
	var floor_sprite := EnvironmentArt.build_tiled_sprite(tile, bounds.position, bounds.size)
	floor_sprite.z_index = FLOOR_Z_INDEX
	add_child(floor_sprite)

	# Decrepit ambiance: a handful of dark stains scattered across the
	# floor, seeded so the same room always looks the same across a
	# single generated run but varies room-to-room and dungeon-to-dungeon.
	var rng := RandomNumberGenerator.new()
	rng.seed = gore_seed
	var stain_count := rng.randi_range(3, 6)
	for i in range(stain_count):
		var center := Vector2(
			rng.randf_range(bounds.position.x + 40, bounds.end.x - 40),
			rng.randf_range(bounds.position.y + 40, bounds.end.y - 40)
		)
		var radius := rng.randf_range(14.0, 34.0)
		var stain := _build_stain(center, radius, rng)
		stain.z_index = FLOOR_Z_INDEX
		add_child(stain)


static func _build_stain(center: Vector2, radius: float, rng: RandomNumberGenerator) -> Polygon2D:
	const POINTS := 9
	var shape := PackedVector2Array()
	shape.resize(POINTS)
	for i in range(POINTS):
		var angle: float = TAU * i / POINTS
		var wobble := rng.randf_range(0.6, 1.15)
		shape[i] = center + Vector2(cos(angle), sin(angle)) * radius * wobble

	var stain := Polygon2D.new()
	stain.polygon = shape
	stain.color = Color(0.28, 0.03, 0.03, rng.randf_range(0.25, 0.45))
	return stain


func _build_walls() -> void:
	var left := bounds.position.x
	var right := bounds.end.x
	var top := bounds.position.y
	var bottom := bounds.end.y

	_build_horizontal_wall(top, left, right, has_top_door)
	_build_horizontal_wall(bottom, left, right, has_bottom_door)
	_build_vertical_wall(left, top, bottom, has_left_door)
	_build_vertical_wall(right, top, bottom, has_right_door)


func _build_horizontal_wall(y: float, left: float, right: float, has_gap: bool) -> void:
	var is_top: bool = y == bounds.position.y
	var wall_y: float = y - wall_thickness / 2.0 if is_top else y + wall_thickness / 2.0

	if not has_gap:
		_add_wall(Vector2((left + right) / 2.0, wall_y), Vector2(right - left, wall_thickness))
		return

	var gap_left := door_gap_center_x - door_gap_size / 2.0
	var gap_right := door_gap_center_x + door_gap_size / 2.0

	if gap_left > left:
		_add_wall(Vector2((left + gap_left) / 2.0, wall_y), Vector2(gap_left - left, wall_thickness))
	if gap_right < right:
		_add_wall(Vector2((gap_right + right) / 2.0, wall_y), Vector2(right - gap_right, wall_thickness))


func _build_vertical_wall(x: float, top: float, bottom: float, has_gap: bool) -> void:
	if not has_gap:
		_add_wall(Vector2(x, (top + bottom) / 2.0), Vector2(wall_thickness, bottom - top))
		return

	var gap_top := door_gap_center_y - door_gap_size / 2.0
	var gap_bottom := door_gap_center_y + door_gap_size / 2.0

	if gap_top > top:
		_add_wall(Vector2(x, (top + gap_top) / 2.0), Vector2(wall_thickness, gap_top - top))
	if gap_bottom < bottom:
		_add_wall(Vector2(x, (gap_bottom + bottom) / 2.0), Vector2(wall_thickness, bottom - gap_bottom))


func _add_wall(center: Vector2, size: Vector2) -> void:
	var body := StaticBody2D.new()
	body.position = center
	body.z_index = WALL_Z_INDEX

	var collision := CollisionShape2D.new()
	var shape := RectangleShape2D.new()
	shape.size = size
	collision.shape = shape
	body.add_child(collision)

	var tile := EnvironmentArt.build_wall_tile(wall_color)
	body.add_child(EnvironmentArt.build_tiled_sprite(tile, -size / 2.0, size))

	add_child(body)


## Scatters a handful of rock obstacles, but never one that would cut the
## room center off from a door: each candidate is checked with a flood-fill
## over a coarse walkability grid before it's kept, so it's not possible to
## end up boxed in — verified by construction, not just spaced out and hoped for.
func _build_obstacles() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = gore_seed + 7919

	var door_targets: Array[Vector2] = []
	const DOOR_MARGIN := 34.0
	if has_left_door:
		door_targets.append(Vector2(bounds.position.x + DOOR_MARGIN, door_gap_center_y))
	if has_right_door:
		door_targets.append(Vector2(bounds.end.x - DOOR_MARGIN, door_gap_center_y))
	if has_top_door:
		door_targets.append(Vector2(door_gap_center_x, bounds.position.y + DOOR_MARGIN))
	if has_bottom_door:
		door_targets.append(Vector2(door_gap_center_x, bounds.end.y - DOOR_MARGIN))

	var center := bounds.get_center()
	var accepted: Array[Dictionary] = []

	var attempts := rng.randi_range(2, 5)
	for i in range(attempts):
		var candidate := Vector2(
			rng.randf_range(bounds.position.x + 50.0, bounds.end.x - 50.0),
			rng.randf_range(bounds.position.y + 50.0, bounds.end.y - 50.0)
		)
		var radius := rng.randf_range(16.0, 26.0)

		if candidate.distance_to(center) < 70.0:
			continue

		var too_close_to_door := false
		for target in door_targets:
			if candidate.distance_to(target) < 60.0:
				too_close_to_door = true
				break
		if too_close_to_door:
			continue

		accepted.append({"pos": candidate, "radius": radius})
		if not is_fully_reachable(accepted, center, door_targets):
			accepted.pop_back()

	for obstacle in accepted:
		_add_obstacle(obstacle["pos"], obstacle["radius"])


## Coarse grid flood-fill from the room center; true only if every door
## target is still reachable.
func is_fully_reachable(obstacles: Array[Dictionary], start: Vector2, targets: Array[Vector2]) -> bool:
	const CELL_SIZE := 24.0
	const PLAYER_CLEARANCE := 18.0
	var cols: int = maxi(1, ceili(bounds.size.x / CELL_SIZE))
	var rows: int = maxi(1, ceili(bounds.size.y / CELL_SIZE))
	var blocked := []
	blocked.resize(cols * rows)
	blocked.fill(false)

	var to_cell := func(p: Vector2) -> Vector2i:
		return Vector2i(
			clampi(int((p.x - bounds.position.x) / CELL_SIZE), 0, cols - 1),
			clampi(int((p.y - bounds.position.y) / CELL_SIZE), 0, rows - 1)
		)

	for cx in range(cols):
		for cy in range(rows):
			var world := bounds.position + Vector2((cx + 0.5) * CELL_SIZE, (cy + 0.5) * CELL_SIZE)
			for obstacle in obstacles:
				if world.distance_to(obstacle["pos"]) < obstacle["radius"] + PLAYER_CLEARANCE:
					blocked[cy * cols + cx] = true
					break

	var start_cell: Vector2i = to_cell.call(start)
	if blocked[start_cell.y * cols + start_cell.x]:
		return false

	var visited := []
	visited.resize(cols * rows)
	visited.fill(false)
	var queue: Array[Vector2i] = [start_cell]
	visited[start_cell.y * cols + start_cell.x] = true
	var directions := [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]

	var head := 0
	while head < queue.size():
		var current: Vector2i = queue[head]
		head += 1
		for dir in directions:
			var next: Vector2i = current + dir
			if next.x < 0 or next.x >= cols or next.y < 0 or next.y >= rows:
				continue
			var idx := next.y * cols + next.x
			if visited[idx] or blocked[idx]:
				continue
			visited[idx] = true
			queue.append(next)

	for target in targets:
		var target_cell: Vector2i = to_cell.call(target)
		if not visited[target_cell.y * cols + target_cell.x]:
			return false

	return true


func _add_obstacle(pos: Vector2, radius: float) -> void:
	var body := Rock.new()
	body.position = pos
	body.z_index = WALL_Z_INDEX

	var collision := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = radius
	collision.shape = shape
	body.add_child(collision)
	body._collision = collision

	var texture := EnvironmentArt.build_rock(wall_color.lightened(0.06))
	var texture_size := texture.get_size()
	var sprite := Sprite2D.new()
	sprite.texture = texture
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sprite.scale = Vector2(radius * 2.0 / texture_size.x, radius * 2.0 / texture_size.y)
	body.add_child(sprite)
	body._sprite = sprite

	add_child(body)
