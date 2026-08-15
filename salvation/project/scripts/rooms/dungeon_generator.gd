class_name DungeonGenerator
extends Node2D
## Builds a dungeon as a lazily-grown 4-ary tree: the room the player is
## currently standing in always has up to four real, already-built exits
## (up/down/left/right) to choose between, and a room's own four children
## aren't generated until the *player actually steps into it* — same lazy
## principle Room already uses for its enemies (see Room._spawn_pending_enemies),
## just one level up. Whichever of the four doors gets walked through, Door.gd
## seals that entry door behind the player the moment they arrive, so a
## turn taken can't be un-taken and the other three sibling rooms are simply
## abandoned, generated or not.
##
## Every room independently rolls its own odds of being the boss room the
## moment it's created, climbing by 1/BOSS_CHANCE_DENOMINATOR for every step
## deeper into whichever branch produced it — 1-in-6 for a room one step
## from the start, 2-in-6 two steps in, and so on, guaranteed by the sixth
## step. Because that roll only depends on how many rooms deep the branch
## is (not which of the four directions got taken to get there), the actual
## order the player enters rooms in never changes the odds — only depth does.
##
## Room population order matters: Room._ready() (which builds walls from
## its door flags) fires the instant a Room enters the SceneTree. Door
## flags and the player have to be attached *before* add_child(room), not
## after, or Room._ready() runs against a half-configured room.

const BOSS_CHANCE_DENOMINATOR := 6
const DIRECTIONS: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]

@export var paladin_scene: PackedScene
@export var sinner_scene: PackedScene
## Whichever trial boss guards this level's boss room — not Pride-specific
## despite the historical name of the level1 scene that first used this.
@export var boss_scene: PackedScene
@export var boss_health_bar_path: NodePath
@export var player_hud_path: NodePath

@export var room_size: Vector2 = Vector2(720, 640)
@export var room_spacing: Vector2 = Vector2(920, 800)
@export var door_gap_size: float = 100.0
## 0 = random each run.
@export var seed_value: int = 0
## Inclusive range for how many Sinners a non-start, non-boss room queues.
@export var min_enemies_per_room: int = 0
@export var max_enemies_per_room: int = 10

var _rng: RandomNumberGenerator
var _rooms_by_cell: Dictionary = {}
var _depth_by_cell: Dictionary = {}
var _expanded_cells: Dictionary = {}

# The boss doesn't exist until its room is revealed and lazily spawns it, so
# rather than pre-picking "the" boss room (multiple sibling branches can
# each independently roll a boss room that never actually gets reached —
# harmless, since only the branch the player walks ever spawns anything),
# _process just watches Enemy.active_enemies for whichever boss actually
# spawns and binds to that one.
var _boss_bar: BossHealthBar
var _boss_bar_bound: bool = false


func _ready() -> void:
	_rng = RandomNumberGenerator.new()
	if seed_value != 0:
		_rng.seed = seed_value
	else:
		_rng.randomize()

	var start := Vector2i.ZERO
	var start_room := _build_room(start, true, false)
	_rooms_by_cell[start] = start_room
	_depth_by_cell[start] = 0

	var paladin := _spawn_player(start_room)
	add_child(start_room)
	_expand_room(start, start_room, 0)

	if paladin != null and not player_hud_path.is_empty():
		var hud := get_node_or_null(player_hud_path)
		if hud != null:
			hud.bind_player(paladin)

	if not boss_health_bar_path.is_empty():
		_boss_bar = get_node_or_null(boss_health_bar_path)


func _process(_delta: float) -> void:
	# Snapshotting keys before the loop is required, not just convenient:
	# _expand_room adds newly-built children straight into _rooms_by_cell,
	# and mutating a Dictionary while iterating it live is unsafe.
	for cell in _rooms_by_cell.keys():
		if _expanded_cells.has(cell):
			continue
		var room: Room = _rooms_by_cell[cell]
		if not is_instance_valid(room) or not room.is_revealed:
			continue
		_expand_room(cell, room, _depth_by_cell[cell])

	if _boss_bar != null and not _boss_bar_bound:
		for enemy in Enemy.active_enemies:
			if enemy.is_boss:
				_boss_bar.bind_boss(enemy)
				_boss_bar_bound = true
				break


## Builds up to four new rooms adjacent to a just-revealed room — its full
## set of choosable exits — skipping any direction whose cell is already
## occupied by a different, previously-placed branch (self-intersection is
## possible on an unbounded grid; when it happens that room simply has
## fewer than four real doors rather than double-booking a cell). A room
## that itself rolled the boss on creation is a dead end: nothing spawns
## beyond a boss fight, so it never gets expanded.
func _expand_room(cell: Vector2i, room: Room, depth: int) -> void:
	_expanded_cells[cell] = true
	if room.is_boss_room:
		return

	for direction in DIRECTIONS:
		var next_cell: Vector2i = cell + direction
		if _rooms_by_cell.has(next_cell):
			continue

		var next_depth := depth + 1
		var boss_chance: float = float(mini(next_depth, BOSS_CHANCE_DENOMINATOR)) / float(BOSS_CHANCE_DENOMINATOR)
		var is_boss: bool = _rng.randf() < boss_chance

		var child := _build_room(next_cell, false, is_boss)
		_rooms_by_cell[next_cell] = child
		_depth_by_cell[next_cell] = next_depth

		_apply_door_flags(room, child, direction)

		if is_boss:
			_queue_boss(child)
		else:
			_queue_enemies(child)

		add_child(child)
		_build_door(room, child, direction)


func _cell_world_position(cell: Vector2i) -> Vector2:
	return Vector2(cell.x * room_spacing.x, cell.y * room_spacing.y)


func _build_room(cell: Vector2i, is_start: bool, is_boss: bool) -> Room:
	var room := Room.new()
	room.name = "Room_%d_%d" % [cell.x, cell.y]
	room.position = _cell_world_position(cell)
	room.bounds = Rect2(-room_size.x / 2.0, -room_size.y / 2.0, room_size.x, room_size.y)
	room.starts_hidden = not is_start
	room.door_gap_size = door_gap_size
	room.is_boss_room = is_boss
	room.floor_color = Color(0.16, 0.05, 0.07) if is_boss else Color(0.09, 0.08, 0.1)
	room.gore_seed = _rng.randi()
	return room


## direction points from source (the already-placed room) to target (the
## brand-new one) — always that way round now, since expansion only ever
## walks parent-to-child, never the reverse-distance lookup the old single
## corridor design needed.
static func _apply_door_flags(source: Room, target: Room, direction: Vector2i) -> void:
	if direction.x != 0:
		if direction.x > 0:
			source.has_right_door = true
			target.has_left_door = true
		else:
			source.has_left_door = true
			target.has_right_door = true
	else:
		if direction.y > 0:
			source.has_bottom_door = true
			target.has_top_door = true
		else:
			source.has_top_door = true
			target.has_bottom_door = true


func _build_door(source: Room, target: Room, direction: Vector2i) -> void:
	var horizontal: bool = direction.x != 0

	var gap_size: Vector2 = (
		Vector2(room_spacing.x - room_size.x, door_gap_size) if horizontal
		else Vector2(door_gap_size, room_spacing.y - room_size.y)
	)

	var door := Door.new()
	door.position = (source.position + target.position) / 2.0
	door.gated_room_path = NodePath("../" + source.name)
	door.destination_room_path = NodePath("../" + target.name)
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
	room.enemy_scenes_to_spawn = [boss_scene]


## 0 to max_enemies_per_room Sinners, inclusive — an empty room is a valid
## roll, same as a packed one. Position is picked by the room itself at
## spawn time, not here, since spawning no longer happens here either.
func _queue_enemies(room: Room) -> void:
	var count := _rng.randi_range(min_enemies_per_room, max_enemies_per_room)
	var scenes: Array[PackedScene] = []
	for i in range(count):
		scenes.append(sinner_scene)
	room.enemy_scenes_to_spawn = scenes
