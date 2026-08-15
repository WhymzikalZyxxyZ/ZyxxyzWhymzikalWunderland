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
##
## Which sin actually guards this level's boss room is runtime data, not
## something authored per level: BossRoster.boss_at() resolves it from
## RunProgress's per-run shuffled order (see RunProgress.ensure_boss_order),
## so the same level1.tscn can guard Pride in one run and Sloth in the
## next. The boss instance itself doesn't exist until its room is revealed
## and lazily spawns it (same as everything else in Room), so its
## display_name/next_boss_name/next_level_scene_path get set the moment it
## actually spawns — see _process's boss-configure poll — not at
## generation time.

const BOSS_CHANCE_DENOMINATOR := 6
const DIRECTIONS: Array[Vector2i] = [Vector2i(1, 0), Vector2i(-1, 0), Vector2i(0, 1), Vector2i(0, -1)]

@export var sinner_scene: PackedScene
## Forces a specific boss scene instead of resolving one through
## BossRoster/RunProgress — a debugging/testing escape hatch, not used by
## any of the ten real level scenes.
@export var boss_scene_override: PackedScene
@export var boss_health_bar_path: NodePath
@export var player_hud_path: NodePath
## Where this level sits in the ten-trial chain (1-10) — the index
## BossRoster.boss_at() resolves this level's actual boss from, and what
## "next level" (level_index + 1) means once that boss falls.
@export var level_index: int = 1
## The LevelTitleCard whose title this level overwrites with whichever
## boss BossRoster actually resolved — the .tscn's own title_text is only
## ever a fallback, immediately overridden the instant this runs.
@export var level_title_card_path: NodePath

## Every room's size is randomized within this range rather than fixed,
## so rooms actually look different from each other rather than
## copy-pasted — see _build_room. room_spacing has to stay comfortably
## larger than room_size_max on both axes or two big neighboring rooms
## could overlap.
@export var room_size_min: Vector2 = Vector2(560, 480)
@export var room_size_max: Vector2 = Vector2(840, 720)
@export var room_spacing: Vector2 = Vector2(1000, 880)
@export var door_gap_size: float = 100.0
## 0 = random each run.
@export var seed_value: int = 0
## Inclusive range for how many Sinners a non-start, non-boss room queues.
@export var min_enemies_per_room: int = 0
@export var max_enemies_per_room: int = 10

var _rng: RandomNumberGenerator
var _boss_info: Dictionary
var _rooms_by_cell: Dictionary = {}
var _depth_by_cell: Dictionary = {}
var _expanded_cells: Dictionary = {}

# The boss doesn't exist until its room is revealed and lazily spawns it, so
# rather than pre-picking "the" boss room (multiple sibling branches can
# each independently roll a boss room that never actually gets reached —
# harmless, since only the branch the player walks ever spawns anything),
# _process just watches Enemy.active_enemies for whichever boss actually
# spawns and binds to that one — and, the first time it does, also
# configures its display_name/next_boss_name/next_level_scene_path, since
# those depend on this run's shuffled boss order and can't be baked into
# the boss's own .tscn anymore.
var _boss_bar: BossHealthBar
var _boss_bar_bound: bool = false
var _boss_configured: bool = false


func _ready() -> void:
	_rng = RandomNumberGenerator.new()
	if seed_value != 0:
		_rng.seed = seed_value
	else:
		_rng.randomize()

	# Every level re-saves itself as the resume point the instant it
	# starts — see RunProgress.save_run_progress. get_tree().current_scene
	# is this level's own root node (Level1, Level2, ...), so its
	# scene_file_path is exactly the path MainMenuScreen's Continue button
	# needs to load back into.
	var scene := get_tree().current_scene
	if scene != null and not scene.scene_file_path.is_empty():
		RunProgress.save_run_progress(scene.scene_file_path, CharacterId.chosen_character_id)

	RunProgress.ensure_boss_order(_rng)
	_boss_info = BossRoster.boss_at(RunProgress.boss_order(), level_index)

	if not level_title_card_path.is_empty():
		var title_card := get_node_or_null(level_title_card_path)
		if title_card != null:
			title_card.title_text = String(_boss_info["name"]).to_upper()

	var start := Vector2i.ZERO
	var start_room := _build_room(start, true, false)
	_rooms_by_cell[start] = start_room
	_depth_by_cell[start] = 0

	var paladin := _spawn_player(start_room)
	add_child(start_room)

	# Only safe once start_room is actually in the tree: paladin was
	# attached to start_room *before* add_child(start_room) (Room._ready()
	# needs its children already in place, same reasoning as the door-flags
	# comment above), which means Paladin._ready() — and the stats it
	# sets up — hasn't run yet until this line. Replaying upgrades any
	# earlier hits a null stats.
	for upgrade_type in RunProgress.upgrades():
		paladin.apply_boss_upgrade(upgrade_type)

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

	if _boss_configured and (_boss_bar == null or _boss_bar_bound):
		return

	for enemy in Enemy.active_enemies:
		if not enemy.is_boss:
			continue
		if not _boss_configured:
			_configure_boss(enemy)
			_boss_configured = true
		if _boss_bar != null and not _boss_bar_bound:
			_boss_bar.bind_boss(enemy)
			_boss_bar_bound = true
		break


## Sets what the boss's own .tscn used to hardcode (display_name,
## next_boss_name, next_level_scene_path) from this run's actual resolved
## order instead — called once, the instant this level's boss spawns
## (well before the player could possibly have reached it).
func _configure_boss(enemy: Enemy) -> void:
	enemy.display_name = _boss_info["name"]

	if level_index >= BossRoster.TRIAL_COUNT:
		enemy.next_boss_name = ""
		enemy.next_level_scene_path = ""
		return

	var next_info := BossRoster.boss_at(RunProgress.boss_order(), level_index + 1)
	enemy.next_boss_name = next_info["name"]
	enemy.next_level_scene_path = "res://scenes/levels/level%d.tscn" % (level_index + 1)


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
	var size := Vector2(
		_rng.randf_range(room_size_min.x, room_size_max.x),
		_rng.randf_range(room_size_min.y, room_size_max.y)
	)

	var room := Room.new()
	room.name = "Room_%d_%d" % [cell.x, cell.y]
	room.position = _cell_world_position(cell)
	room.bounds = Rect2(-size.x / 2.0, -size.y / 2.0, size.x, size.y)
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


## Rooms are randomly sized now (see _build_room), so the corridor between
## any two neighbors isn't a fixed length — it's whatever's left of
## room_spacing after both rooms' own half-sizes along the connecting
## axis, computed per-pair from their actual bounds rather than a single
## generator-wide room_size the way it worked when every room was identical.
func _build_door(source: Room, target: Room, direction: Vector2i) -> void:
	var horizontal: bool = direction.x != 0

	var gap_size: Vector2
	if horizontal:
		var corridor_length: float = room_spacing.x - (source.bounds.size.x + target.bounds.size.x) / 2.0
		gap_size = Vector2(corridor_length, door_gap_size)
	else:
		var corridor_length: float = room_spacing.y - (source.bounds.size.y + target.bounds.size.y) / 2.0
		gap_size = Vector2(door_gap_size, corridor_length)

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


## Spawns whichever character CharacterSelectScreen set (defaults to
## Paladin so a level built directly, skipping character select, still
## works — see CharacterId.chosen_character_id). The run keeps one
## character across all ten levels; there's no per-level override.
##
## Every level spawns a brand new PlayerController instance — nothing
## about a previous level's character (including any boss upgrades
## picked) carries over on its own without explicitly replaying
## RunProgress.upgrades() back onto it. NOT done here: room.add_child(paladin)
## happens before room itself is in the tree (see _ready()'s door-flags
## comment — Room._ready() needs its children already attached), so
## Paladin._ready() — and the stats upgrades actually modify — hasn't run
## yet at this point. _ready() replays upgrades itself, right after
## add_child(start_room) actually puts everything in the live tree.
func _spawn_player(room: Room) -> PlayerController:
	var scene := CharacterRoster.scene_for(CharacterId.chosen_character_id)
	var paladin: PlayerController = scene.instantiate()
	paladin.position = room.bounds.get_center()
	room.add_child(paladin)
	return paladin


func _queue_boss(room: Room) -> void:
	var scene: PackedScene = boss_scene_override if boss_scene_override != null else load(_boss_info["scene"])
	room.enemy_scenes_to_spawn = [scene]


## 0 to max_enemies_per_room Sinners, inclusive — an empty room is a valid
## roll, same as a packed one. Position is picked by the room itself at
## spawn time, not here, since spawning no longer happens here either.
func _queue_enemies(room: Room) -> void:
	var count := _rng.randi_range(min_enemies_per_room, max_enemies_per_room)
	var scenes: Array[PackedScene] = []
	for i in range(count):
		scenes.append(sinner_scene)
	room.enemy_scenes_to_spawn = scenes
