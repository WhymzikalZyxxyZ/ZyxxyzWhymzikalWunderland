extends GutTest
## Door._ready() reads gated_room_path/destination_room_path the instant it
## enters the tree, so every test here sets those export paths on the door
## BEFORE add_child — the same ordering constraint DungeonGenerator follows
## for real. Room instances are added to the tree first so room.get_path()
## resolves to a real absolute NodePath the door can be pointed at.


func test_door_with_no_gated_room_starts_unlocked() -> void:
	var door := Door.new()
	add_child_autofree(door)

	assert_true(door._unlocked)


func test_door_gated_by_an_uncleared_room_starts_locked() -> void:
	var root := Node.new()
	add_child_autofree(root)

	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	room.add_child(Sinner.new())
	root.add_child(room)

	var door := Door.new()
	door.gated_room_path = room.get_path()
	root.add_child(door)

	assert_false(door._unlocked)


func test_door_unlocks_once_its_gated_room_clears() -> void:
	var root := Node.new()
	add_child_autofree(root)

	var room := Room.new()
	room.bounds = Rect2(-100, -100, 200, 200)
	root.add_child(room)

	var door := Door.new()
	door.gated_room_path = room.get_path()
	root.add_child(door)

	assert_true(door._unlocked, "A room with no enemies clears immediately, so its door should already be unlocked.")


func test_door_collapses_once_the_destination_room_is_revealed() -> void:
	var root := Node.new()
	add_child_autofree(root)

	var destination := Room.new()
	destination.bounds = Rect2(-100, -100, 200, 200)
	root.add_child(destination)
	destination.is_revealed = true

	var door := Door.new()
	door.destination_room_path = destination.get_path()
	root.add_child(door)

	door._physics_process(0.0)

	assert_true(door._collapsed)
