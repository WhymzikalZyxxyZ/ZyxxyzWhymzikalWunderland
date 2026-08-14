extends GutTest
## Scene-level Room behavior — what's observable synchronously right after
## add_child(room), i.e. what Room._ready() itself sets up.


func test_room_with_no_enemies_is_cleared_immediately() -> void:
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	add_child_autofree(room)

	assert_true(room.is_cleared, "A room with no enemy children should be is_cleared immediately after _ready().")


func test_room_with_an_enemy_child_is_not_cleared_yet() -> void:
	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	room.add_child(Sinner.new())  # attached before entering the tree — see DungeonGenerator.gd's doc comment on why order matters
	add_child_autofree(room)

	assert_false(room.is_cleared, "A room with a live enemy child should not be is_cleared yet.")


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
