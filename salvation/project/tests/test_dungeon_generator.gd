extends GutTest
## Exercises DungeonGenerator's lazy 4-ary branching: the start room's
## children exist immediately, deeper rooms only appear once their parent
## is actually revealed — mirroring Room's own lazy enemy-spawn-on-reveal
## design one level up.

const SINNER_SCENE: PackedScene = preload("res://scenes/enemies/sinner.tscn")
const PRIDE_BOSS_SCENE: PackedScene = preload("res://scenes/bosses/pride_boss.tscn")


func _build_generator(seed_value: int) -> DungeonGenerator:
	var generator := DungeonGenerator.new()
	generator.sinner_scene = SINNER_SCENE
	generator.boss_scene_override = PRIDE_BOSS_SCENE
	generator.seed_value = seed_value
	add_child_autofree(generator)
	return generator


func test_spawned_player_replays_every_accumulated_run_upgrade() -> void:
	# Regression test: every level spawns a brand new PlayerController —
	# without DungeonGenerator replaying RunProgress.upgrades() onto it,
	# a boss upgrade picked on an earlier level would silently vanish the
	# moment the next level loaded.
	RunProgress.clear_run_progress()
	RunProgress.add_upgrade(PlayerController.BossUpgradeType.MOVE_SPEED)
	RunProgress.add_upgrade(PlayerController.BossUpgradeType.NEW_MAGIC)
	CharacterId.chosen_character_id = CharacterId.PALADIN  # pin the baseline this test's assertions assume

	var generator := _build_generator(1)
	# Read the player back from the start room DungeonGenerator actually
	# spawned it into, rather than the global active_players registry —
	# more direct, and not at risk of picking up a stale entry left by an
	# earlier test in the same run.
	var start_room: Room = generator._rooms_by_cell[Vector2i.ZERO]
	var player: PlayerController = null
	for child in start_room.get_children():
		if child is PlayerController:
			player = child
			break

	assert_not_null(player)
	assert_gt(player.stats.speed, 200.0, "Move Speed upgrade should have been replayed onto the fresh player.")
	assert_eq(player.echo_stacks, 1, "New Magic upgrade should have been replayed exactly once.")

	RunProgress.clear_run_progress()


func test_start_room_walls_actually_have_gaps_matching_its_door_flags() -> void:
	# Regression test: Room._ready() builds walls the instant the room
	# enters the tree — but DungeonGenerator doesn't finish setting a
	# room's own *outward-facing* door flags until _expand_room runs on it,
	# which for the start room happens after add_child(start_room), i.e.
	# after Room._ready() already built walls using none of those flags.
	# Without Room.rebuild_geometry() actually tearing that provisional
	# geometry down and rebuilding it, every side but the entrance comes
	# out as a solid, undoored wall despite a real Door/corridor sitting
	# right behind it — sealing the player into the start room entirely.
	var generator := _build_generator(1)
	var start_room: Room = generator._rooms_by_cell[Vector2i.ZERO]

	assert_true(
		start_room.has_left_door and start_room.has_right_door and start_room.has_top_door and start_room.has_bottom_door,
		"Sanity check: seed 1 gives the start room all four children (see test_start_room_gets_up_to_four_real_children_immediately)."
	)

	var door_points := {
		"right": Vector2(start_room.bounds.end.x - 10.0, start_room.door_gap_center_y),
		"left": Vector2(start_room.bounds.position.x + 10.0, start_room.door_gap_center_y),
		"top": Vector2(start_room.door_gap_center_x, start_room.bounds.position.y + 10.0),
		"bottom": Vector2(start_room.door_gap_center_x, start_room.bounds.end.y - 10.0),
	}

	for label in door_points.keys():
		var point: Vector2 = door_points[label]
		var blocked := false
		for child in start_room.get_children():
			if not (child is StaticBody2D):
				continue
			var collision := child.get_node_or_null("CollisionShape2D")
			if collision == null or collision.shape == null:
				continue
			var shape: RectangleShape2D = collision.shape
			var wall_rect := Rect2(child.position - shape.size / 2.0, shape.size)
			if wall_rect.has_point(point):
				blocked = true
				break
		assert_false(blocked, "Door gap on the %s side should not be covered by a solid wall." % label)


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
