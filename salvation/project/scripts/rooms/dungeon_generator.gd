class_name DungeonGenerator
extends Node2D
## Builds a dungeon as a single procedurally-grown corridor rather than a
## fixed layout: starting from an empty start room, each step picks one of
## up to four unvisited cardinal neighbors at random to place the next
## room — "each room has 4 paths, and the one actually built is chosen
## randomly among them." The odds that any given room becomes the boss
## room climb by 1/BOSS_CHANCE_DENOMINATOR every step it doesn't: 1-in-6
## right after the start room, 2-in-6 the room after that, and so on,
## guaranteed by the sixth room if nothing rolled sooner. Door.gd seals
## the entry door behind the player once they arrive in a room, so a
## chosen turn can't be un-chosen.
##
## Room population order matters: Room._ready() (which builds walls from
## its door flags) fires the instant a Room enters the SceneTree. Door
## flags and the player have to be attached *before* add_child(room), not
## after, or Room._ready() runs against a half-configured room. Enemies
## are different: they're queued as PackedScenes on the room and only
## actually instantiated by the room itself once it's revealed — see
## Room._spawn_pending_enemies() — so nothing exists in a room the player
## hasn't stepped into yet.

const BOSS_CHANCE_DENOMINATOR := 6
const DIRECTIONS: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]

@export var paladin_scene: PackedScene
@export var sinner_scene: PackedScene
@export var pride_boss_scene: PackedScene
@export var boss_health_bar_path: NodePath
@export var player_hud_path: NodePath

@export var room_size: Vector2 = Vector2(480, 420)
@export var room_spacing: Vector2 = Vector2(600, 520)
@export var door_gap_size: float = 90.0
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
	var path := build_corridor(start, rng)
	var boss: Vector2i = path[path.size() - 1]

	var edges: Array[Array] = []
	for i in range(path.size() - 1):
		edges.append(normalize_edge(path[i], path[i + 1]))

	var distances := compute_distances(start, path, edges)

	var rooms: Dictionary = {}
	for cell in path:
		rooms[cell] = _build_room(cell, cell == start, cell == boss, rng)

	for edge in edges:
		_apply_door_flags(rooms, edge, distances)

	var paladin: PlayerController = null
	var boss_room: Room = null
	for cell in path:
		var room: Room = rooms[cell]
		if cell == start:
			paladin = _spawn_player(room)
		elif cell == boss:
			_queue_boss(room)
			boss_room = room
		else:
			_queue_enemies(room, rng)

	for cell in path:
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


## Grows a single corridor of cells from start: at every step, picks one
## of the current room's unvisited cardinal neighbors at random (never
## backtracking into an already-placed room), then rolls whether that new
## room becomes the boss room — starting at 1/BOSS_CHANCE_DENOMINATOR and
## climbing by the same fraction each additional step, so it's guaranteed
## by the BOSS_CHANCE_DENOMINATOR-th room even if every earlier roll
## missed. The returned array's last element is always the boss room.
static func build_corridor(start: Vector2i, rng: RandomNumberGenerator) -> Array[Vector2i]:
	var path: Array[Vector2i] = [start]
	var visited := {start: true}
	var current := start
	var rooms_placed := 0

	while true:
		var candidates: Array[Vector2i] = []
		for direction in DIRECTIONS:
			var next := current + direction
			if not visited.has(next):
				candidates.append(next)

		# Boxed in by its own earlier turns — vanishingly rare this early,
		# but the corridor has to end somewhere, so the last room placed
		# becomes the boss room rather than looping forever.
		if candidates.is_empty():
			break

		var next: Vector2i = candidates[rng.randi_range(0, candidates.size() - 1)]
		visited[next] = true
		path.append(next)
		current = next
		rooms_placed += 1

		var boss_chance: float = float(mini(rooms_placed, BOSS_CHANCE_DENOMINATOR)) / float(BOSS_CHANCE_DENOMINATOR)
		if rng.randf() < boss_chance:
			break

	return path


static func normalize_edge(a: Vector2i, b: Vector2i) -> Array:
	if a.x < b.x or (a.x == b.x and a.y < b.y):
		return [a, b]
	return [b, a]


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
