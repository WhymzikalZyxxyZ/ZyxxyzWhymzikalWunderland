extends GutTest
## Scene-level Room behavior — what's observable synchronously right after
## add_child(room), i.e. what Room._ready() itself sets up, plus the
## lazy enemy-spawn-on-reveal behavior that replaced up-front spawning.

const SINNER_SCENE: PackedScene = preload("res://scenes/enemies/sinner.tscn")


func test_room_with_no_enemies_is_cleared_immediately() -> void:
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	add_child_autofree(room)

	assert_true(room.is_cleared, "A room with nothing queued should be is_cleared immediately after _ready().")


func test_room_with_queued_enemies_is_not_cleared_yet() -> void:
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	room.enemy_scenes_to_spawn = [SINNER_SCENE]  # queued before entering the tree, same as DungeonGenerator does
	add_child_autofree(room)  # starts_hidden defaults false, so this reveals — and spawns — immediately

	assert_false(room.is_cleared, "A room with a live enemy should not be is_cleared yet.")
	assert_eq(room.get_spawned_enemies().size(), 1)


func test_room_becomes_cleared_once_its_last_enemy_is_freed() -> void:
	# Door.gd's unlock condition is literally `_gated_room.is_cleared` — this
	# is what actually drives "defeat everyone in the room to open its door."
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	room.enemy_scenes_to_spawn = [SINNER_SCENE]
	add_child_autofree(room)

	assert_false(room.is_cleared, "Sanity check: still uncleared with a live enemy.")

	room.get_spawned_enemies()[0].queue_free()
	await wait_physics_frames(2)

	assert_true(room.is_cleared, "Room should flip to cleared once its last enemy is actually freed.")


func test_hidden_room_does_not_spawn_its_queued_enemies_until_revealed() -> void:
	# The actual point of the lazy-spawn design: nothing should exist in a
	# room the player hasn't stepped into.
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	room.starts_hidden = true
	room.enemy_scenes_to_spawn = [SINNER_SCENE, SINNER_SCENE]
	add_child_autofree(room)

	assert_true(room.get_spawned_enemies().is_empty(), "A hidden room shouldn't have spawned anything yet.")
	assert_false(room.is_cleared, "It still has enemies queued, even though none exist as nodes yet.")

	# PlayerController.active_players is what Room polls for the reveal check.
	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = room.global_position

	await wait_physics_frames(2)

	assert_true(room.is_revealed)
	assert_eq(room.get_spawned_enemies().size(), 2, "Revealing the room should spawn exactly what was queued.")


func test_room_generates_at_least_one_wall_body() -> void:
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	add_child_autofree(room)

	var wall_count := 0
	for child in room.get_children():
		if child is StaticBody2D:
			wall_count += 1

	assert_gt(wall_count, 0, "Room._ready() should generate at least one StaticBody2D wall.")


func test_obstacle_directly_on_the_only_door_makes_it_unreachable() -> void:
	var room := Room.new()
	room.bounds = Rect2(-200, -200, 400, 400)
	add_child_autofree(room)

	var door_target := Vector2(190, 0)
	var obstacles: Array[Dictionary] = [{"pos": door_target, "radius": 60.0}]

	var reachable := room.is_fully_reachable(obstacles, room.bounds.get_center(), [door_target])

	assert_false(reachable)


func test_small_obstacle_away_from_the_path_stays_reachable() -> void:
	var room := Room.new()
	room.bounds = Rect2(-200, -200, 400, 400)
	add_child_autofree(room)

	var door_target := Vector2(190, 0)
	var obstacles: Array[Dictionary] = [{"pos": Vector2(-150, 150), "radius": 20.0}]

	var reachable := room.is_fully_reachable(obstacles, room.bounds.get_center(), [door_target])

	assert_true(reachable)
