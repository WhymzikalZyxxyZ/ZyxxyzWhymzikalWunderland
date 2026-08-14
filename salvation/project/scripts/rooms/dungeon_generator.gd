class_name DungeonGenerator
extends Node2D
## Builds a branching, one-way dungeon on a small grid: a start room, a
## boss room grid_width-1 columns away, and three routes (top/middle/bottom
## row) between them that share an early trunk before forking at a
## randomized column — so the boss room ends up with a door for every
## route actually built, and each fork room can have doors on any of its
## four sides depending on which routes pass through it. Door.gd seals the
## entry door behind the player once they arrive in a room, so a chosen
## branch can't be un-chosen.
##
## Room population order matters: Room._ready() (which builds walls from
## its door flags and scans its children for enemies) fires the instant a
## Room enters the SceneTree. Everything a room needs — door flags,
## enemies, the player — has to be attached to it *before* add_child(room),
## not after, or Room._ready() runs against an empty/half-configured room.

@export var paladin_scene: PackedScene
@export var sinner_scene: PackedScene
@export var pride_boss_scene: PackedScene
@export var boss_health_bar_path: NodePath
@export var player_hud_path: NodePath

@export var grid_width: int = 5
@export var grid_height: int = 3
@export var room_size: Vector2 = Vector2(480, 420)
@export var room_spacing: Vector2 = Vector2(600, 520)
@export var door_gap_size: float = 90.0
## 0 = random each run.
@export var seed_value: int = 0


func _ready() -> void:
	var rng := RandomNumberGenerator.new()
	if seed_value != 0:
		rng.seed = seed_value
	else:
		rng.randomize()

	var mid_row := grid_height / 2
	var start := Vector2i(0, mid_row)
	var boss := Vector2i(grid_width - 1, mid_row)
	var branch_column: int = clampi(rng.randi_range(1, grid_width - 2), 1, grid_width - 2)

	var cells: Array[Vector2i] = [start, boss]
	var edges: Array[Array] = []  # each element is [Vector2i, Vector2i], normalized

	for row in range(grid_height):
		var path := build_l_path(start, Vector2i(branch_column, row), boss)
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
	var boss_enemies: Array[Enemy] = []
	for cell in cells:
		var room: Room = rooms[cell]
		if cell == start:
			paladin = _spawn_player(room)
		elif cell == boss:
			boss_enemies.append(_spawn_boss(room))
		else:
			_spawn_enemies(room, rng)

	for cell in cells:
		add_child(rooms[cell])

	for edge in edges:
		_build_door(rooms, edge, distances)

	if paladin != null and not player_hud_path.is_empty():
		var hud := get_node_or_null(player_hud_path)
		if hud != null:
			hud.bind_player(paladin)
	if not boss_enemies.is_empty() and not boss_health_bar_path.is_empty():
		var bar := get_node_or_null(boss_health_bar_path)
		if bar != null:
			bar.bind_boss(boss_enemies[0])


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


func _spawn_boss(room: Room) -> Enemy:
	var boss: Enemy = pride_boss_scene.instantiate()
	boss.position = room.bounds.get_center()
	room.add_child(boss)
	return boss


func _spawn_enemies(room: Room, rng: RandomNumberGenerator) -> void:
	var count := rng.randi_range(1, 2)
	for i in range(count):
		var sinner: Enemy = sinner_scene.instantiate()
		sinner.position = Vector2(
			rng.randf_range(room.bounds.position.x + 60.0, room.bounds.end.x - 60.0),
			rng.randf_range(room.bounds.position.y + 60.0, room.bounds.end.y - 60.0)
		)
		room.add_child(sinner)
