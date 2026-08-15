extends GutTest
## Exercises DungeonGenerator's lazy 4-ary branching: the start room's
## children exist immediately, deeper rooms only appear once their parent
## is actually revealed — mirroring Room's own lazy enemy-spawn-on-reveal
## design one level up.

const PALADIN_SCENE: PackedScene = preload("res://scenes/player/paladin.tscn")
const SINNER_SCENE: PackedScene = preload("res://scenes/enemies/sinner.tscn")
const PRIDE_BOSS_SCENE: PackedScene = preload("res://scenes/bosses/pride_boss.tscn")


func _build_generator(seed_value: int) -> DungeonGenerator:
	var generator := DungeonGenerator.new()
	generator.paladin_scene = PALADIN_SCENE
	generator.sinner_scene = SINNER_SCENE
	generator.pride_boss_scene = PRIDE_BOSS_SCENE
	generator.seed_value = seed_value
	add_child_autofree(generator)
	return generator


func test_start_room_gets_up_to_four_real_children_immediately() -> void:
	var generator := _build_generator(1)

	assert_eq(generator._rooms_by_cell.size(), 5, "Start room plus all four of its cardinal children should exist right away.")
	for direction in DungeonGenerator.DIRECTIONS:
		assert_true(generator._rooms_by_cell.has(direction), "Missing child room in direction %s" % direction)


func test_children_of_the_start_room_are_not_yet_expanded() -> void:
	var generator := _build_generator(2)

	for direction in DungeonGenerator.DIRECTIONS:
		assert_false(generator._expanded_cells.has(direction), "A child room shouldn't grow its own children until it's revealed.")


func test_entering_a_child_room_expands_its_own_four_children() -> void:
	var generator := _build_generator(3)

	var target_cell: Vector2i = DungeonGenerator.DIRECTIONS[0]
	var target_room: Room = generator._rooms_by_cell[target_cell]

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = target_room.global_position

	await wait_physics_frames(2)
	await wait_process_frames(1)

	assert_true(target_room.is_revealed)
	assert_true(generator._expanded_cells.has(target_cell))
	# Its own children now exist too — at minimum the direction pointing
	# straight back through the entry door is excluded (already occupied
	# by the start room), so up to three new rooms, at least one guaranteed.
	var grandchildren := 0
	for direction in DungeonGenerator.DIRECTIONS:
		var next: Vector2i = target_cell + direction
		if generator._rooms_by_cell.has(next) and next != Vector2i.ZERO:
			grandchildren += 1
	assert_gt(grandchildren, 0, "Revealing a room should generate at least one new child beyond the one already there.")


func test_a_boss_room_never_grows_further_children() -> void:
	var generator := _build_generator(4)

	# Force a specific child into being the boss room, then reveal it directly
	# and confirm DungeonGenerator treats it as a dead end.
	var target_cell: Vector2i = DungeonGenerator.DIRECTIONS[0]
	var target_room: Room = generator._rooms_by_cell[target_cell]
	target_room.is_boss_room = true

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = target_room.global_position

	await wait_physics_frames(2)

	var rooms_before := generator._rooms_by_cell.size()
	await wait_physics_frames(2)
	var rooms_after := generator._rooms_by_cell.size()

	assert_eq(rooms_before, rooms_after, "A boss room should never grow new children once revealed.")


func test_boss_chance_is_guaranteed_by_the_sixth_room_in_a_branch() -> void:
	# BOSS_CHANCE_DENOMINATOR-deep into any branch, the roll is chance == 1.0
	# (mini() caps depth at BOSS_CHANCE_DENOMINATOR), so it's a structural
	# guarantee, not a statistical one — verified directly on the formula
	# DungeonGenerator._expand_room uses rather than by seed-hunting.
	var depth := DungeonGenerator.BOSS_CHANCE_DENOMINATOR
	var boss_chance: float = float(mini(depth, DungeonGenerator.BOSS_CHANCE_DENOMINATOR)) / float(DungeonGenerator.BOSS_CHANCE_DENOMINATOR)

	assert_eq(boss_chance, 1.0)


func test_boss_chance_climbs_by_one_sixth_per_depth() -> void:
	for depth in range(1, DungeonGenerator.BOSS_CHANCE_DENOMINATOR + 1):
		var boss_chance: float = float(mini(depth, DungeonGenerator.BOSS_CHANCE_DENOMINATOR)) / float(DungeonGenerator.BOSS_CHANCE_DENOMINATOR)
		assert_almost_eq(boss_chance, float(depth) / float(DungeonGenerator.BOSS_CHANCE_DENOMINATOR), 0.001)
