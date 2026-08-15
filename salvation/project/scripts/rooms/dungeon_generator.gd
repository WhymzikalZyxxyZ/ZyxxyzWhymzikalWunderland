class_name DungeonGenerator
extends Node2D
## Builds a dungeon around a single empty start room: four routes, one per
## cardinal direction, each independently reaching out a random number of
## rooms before bending to converge on one shared boss room. Every route is
## capped at MAX_ROOMS_PER_ROUTE rooms (reach out + bend back included) —
## enforced by construction (see _max_reach_for), not just hoped for, since
## a route that starts by heading straight away from the boss has much
## less room to wander before it has to turn back than one already heading
## toward it. Door.gd seals the entry door behind the player once they
## arrive in a room, so a chosen branch can't be un-chosen.
##
## Room population order matters: Room._ready() (which builds walls from
## its door flags) fires the instant a Room enters the SceneTree. Door
## flags and the player have to be attached *before* add_child(room), not
## after, or Room._ready() runs against a half-configured room. Enemies
## are different: they're queued as PackedScenes on the room and only
## actually instantiated by the room itself once it's revealed — see
## Room._spawn_pending_enemies() — so nothing exists in a room the player
## hasn't stepped into yet.

const MAX_ROOMS_PER_ROUTE := 5
const DIRECTIONS: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]

@export var paladin_scene: PackedScene
@export var sinner_scene: PackedScene
@export var pride_boss_scene: PackedScene
@export var boss_health_bar_path: NodePath
@export var player_hud_path: NodePath

@export var room_size: Vector2 = Vector2(480, 420)
@export var room_spacing: Vector2 = Vector2(600, 520)
@export var door_gap_size: float = 90.0
## Where the boss room sits relative to the start room. Kept modest —
## every direction has to be able to reach it and bend back within
## MAX_ROOMS_PER_ROUTE rooms, and the farther away it is, the less reach
## the directions facing away from it get.
@export var boss_offset: Vector2i = Vector2i(2, 0)
## 0 = random each run.
@export var seed_value: int = 0
## Inclusive range for how many Sinners a non-start, non-boss room queues.
@export var min_enemies_per_room: int = 0
@export var max_enemies_per_room: int = 10

# The boss doesn't exist until its room is revealed and lazily spawns it,
# so the health bar can't bind at generation time — _process polls until
# it appears, then stops.
var _pending_boss_room: Room
var _pending_boss_bar: BossHealthBar


func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	if seed_value != 0:
		rng.seed = seed_value
	else:
		rng.randomize()

	var start := Vector2i.ZERO
	var boss := boss_offset

	var cells: Array[Vector2i] = [start, boss]
	var edges: Array[Array] = []  # each element is [Vector2i, Vector2i], normalized

	for direction in DIRECTIONS:
		var max_reach := _max_reach_for(direction, boss)
		var reach: int = rng.randi_range(1, max_reach)
		var waypoint := start + direction * reach
		var path := build_l_path(start, waypoint, boss)
		for cell in path:
			if not cells.has(cell):
				cells.append(cell)
		for i in range(path.size() - 1):
			var edge := normalize_edge(path[i], path[i + 1])
			if not _edges_contains(edges, edge):
				edges.append(edge)

	var distances := compute_distances(start, cells, edges)

	var rooms: Dictionary = {}
	for cell in cells:
		rooms[cell] = _build_room(cell, cell == start, cell == boss, rng)

	for edge in edges:
		_apply_door_flags(rooms, edge, distances)

	var paladin: PlayerController = null
	var boss_room: Room = null
	for cell in cells:
		var room: Room = rooms[cell]
		if cell == start:
			paladin = _spawn_player(room)
		elif cell == boss:
			_queue_boss(room)
			boss_room = room
		else:
			_queue_enemies(room, rng)

	for cell in cells:
		add_child(rooms[cell])

	for edge in edges:
		_build_door(rooms, edge, distances)

	if paladin != null and not player_hud_path.is_empty():
		var hud := get_node_or_null(player_hud_path)
		if hud != null:
			hud.bind_player(paladin)
	if boss_room != null and not boss_health_bar_path.is_empty():
		var bar := get_node_or_null(boss_health_bar_path)
		if bar != null:
			_pending_boss_room = boss_room
			_pending_boss_bar = bar


func _process(_delta: float) -> void:
	if _pending_boss_room == null:
		return

	var spawned := _pending_boss_room.get_spawned_enemies()
	if spawned.is_empty():
		return

	_pending_boss_bar.bind_boss(spawned[0])
	_pending_boss_room = null


## The largest `reach` (rooms traveled straight in `direction` from the
## start before bending toward `boss`) such that the FULL route — reach out,
## then Manhattan-distance back to boss — still fits within
## MAX_ROOMS_PER_ROUTE. Computed, not guessed: a direction pointed straight
## at the boss can reach further before it has to turn around than one
## pointed straight away from it, and this finds the exact cutoff for
## whichever direction it's asked about rather than assuming one number
## works for all four.
static func _max_reach_for(direction: Vector2i, boss: Vector2i) -> int:
	for reach in range(MAX_ROOMS_PER_ROUTE, 0, -1):
		var waypoint := direction * reach
		var route_length := reach + absi(waypoint.x - boss.x) + absi(waypoint.y - boss.y)
		if route_length <= MAX_ROOMS_PER_ROUTE:
			return reach
	return 1


static func build_l_path(start: Vector2i, waypoint: Vector2i, boss: Vector2i) -> Array[Vector2i]:
	var path: Array[Vector2i] = [start]
	var cur := start
	cur = _step_axis(cur, waypoint.x, true, path)
	cur = _step_axis(cur, waypoint.y, false, path)
	cur = _step_axis(cur, boss.x, true, path)
	cur = _step_axis(cur, boss.y, false, path)
	return path


static func _step_axis(cur: Vector2i, target: int, horizontal: bool, path: Array[Vector2i]) -> Vector2i:
	var current: int = cur.x if horizontal else cur.y
	var step: int = signi(target - current)
	while current != target:
		current += step
		cur = Vector2i(current, cur.y) if horizontal else Vector2i(cur.x, current)
		path.append(cur)
	return cur


static func normalize_edge(a: Vector2i, b: Vector2i) -> Array:
	if a.x < b.x or (a.x == b.x and a.y < b.y):
		return [a, b]
	return [b, a]


static func _edges_contains(edges: Array[Array], edge: Array) -> bool:
	for e in edges:
		if e[0] == edge[0] and e[1] == edge[1]:
			return true
	return false


static func compute_distances(start: Vector2i, cells: Array[Vector2i], edges: Array[Array]) -> Dictionary:
	var adjacency: Dictionary = {}
	for cell in cells:
		adjacency[cell] = []
	for edge in edges:
		var a: Vector2i = edge[0]
		var b: Vector2i = edge[1]
		adjacency[a].append(b)
		adjacency[b].append(a)

	var distances := {start: 0}
	var queue: Array[Vector2i] = [start]
	var head := 0
	while head < queue.size():
		var current: Vector2i = queue[head]
		head += 1
		for neighbor in adjacency[current]:
			if distances.has(neighbor):
				continue
			distances[neighbor] = distances[current] + 1
			queue.append(neighbor)
	return distances


func _cell_world_position(cell: Vector2i) -> Vector2:
	return Vector2(cell.x * room_spacing.x, cell.y * room_spacing.y)


func _build_room(cell: Vector2i, is_start: bool, is_boss: bool, rng: RandomNumberGenerator) -> Room:
	var room := Room.new()
	room.name = "Room_%d_%d" % [cell.x, cell.y]
	room.position = _cell_world_position(cell)
	room.bounds = Rect2(-room_size.x / 2.0, -room_size.y / 2.0, room_size.x, room_size.y)
	room.starts_hidden = not is_start
	room.door_gap_size = door_gap_size
	room.floor_color = Color(0.16, 0.05, 0.07) if is_boss else Color(0.09, 0.08, 0.1)
	room.gore_seed = rng.randi()
	return room


static func _apply_door_flags(rooms: Dictionary, edge: Array, distances: Dictionary) -> void:
	var a: Vector2i = edge[0]
	var b: Vector2i = edge[1]
	var source: Vector2i = a if distances[a] <= distances[b] else b
	var target: Vector2i = b if source == a else a
	var delta: Vector2i = target - source

	var source_room: Room = rooms[source]
	var target_room: Room = rooms[target]

	if delta.x != 0:
		if delta.x > 0:
			source_room.has_right_door = true
			target_room.has_left_door = true
		else:
			source_room.has_left_door = true
			target_room.has_right_door = true
	else:
		if delta.y > 0:
			source_room.has_bottom_door = true
			target_room.has_top_door = true
		else:
			source_room.has_top_door = true
			target_room.has_bottom_door = true


func _build_door(rooms: Dictionary, edge: Array, distances: Dictionary) -> void:
	var a: Vector2i = edge[0]
	var b: Vector2i = edge[1]
	var source: Vector2i = a if distances[a] <= distances[b] else b
	var target: Vector2i = b if source == a else a
	var delta: Vector2i = target - source

	var source_room: Room = rooms[source]
	var target_room: Room = rooms[target]
	var horizontal: bool = delta.x != 0

	var gap_size: Vector2 = (
		Vector2(room_spacing.x - room_size.x, door_gap_size) if horizontal
		else Vector2(door_gap_size, room_spacing.y - room_size.y)
	)

	var door := Door.new()
	door.position = (source_room.position + target_room.position) / 2.0
	door.gated_room_path = NodePath("../" + source_room.name)
	door.destination_room_path = NodePath("../" + target_room.name)
	# Same environment layer as Room's walls — characters must always draw in front of it.
	door.z_index = -1

	# The door's pixel-art texture is drawn tall-and-narrow (fits a
	# horizontal room-to-room connection natively); rotate it 90° for
	# vertical connections instead of drawing a second variant.
	var door_texture := CharacterSprites.build_door()
	var texture_size := door_texture.get_size()
	var sprite := Sprite2D.new()
	sprite.name = "Sprite2D"
	sprite.texture = door_texture
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	if horizontal:
		sprite.scale = Vector2(gap_size.x / texture_size.x, gap_size.y / texture_size.y)
	else:
		sprite.rotation_degrees = 90.0
		sprite.scale = Vector2(gap_size.y / texture_size.x, gap_size.x / texture_size.y)
	door.add_child(sprite)

	var collision := CollisionShape2D.new()
	collision.name = "CollisionShape2D"
	var shape := RectangleShape2D.new()
	shape.size = gap_size
	collision.shape = shape
	door.add_child(collision)

	add_child(door)


func _spawn_player(room: Room) -> PlayerController:
	var paladin: PlayerController = paladin_scene.instantiate()
	paladin.position = room.bounds.get_center()
	room.add_child(paladin)
	return paladin


func _queue_boss(room: Room) -> void:
	room.enemy_scenes_to_spawn = [pride_boss_scene]


## 0 to max_enemies_per_room Sinners, inclusive — an empty room is a valid
## roll, same as a packed one. Position is picked by the room itself at
## spawn time, not here, since spawning no longer happens here either.
func _queue_enemies(room: Room, rng: RandomNumberGenerator) -> void:
	var count := rng.randi_range(min_enemies_per_room, max_enemies_per_room)
	var scenes: Array[PackedScene] = []
	for i in range(count):
		scenes.append(sinner_scene)
	room.enemy_scenes_to_spawn = scenes
