extends GutTest


func test_new_canvas_is_fully_transparent() -> void:
	var canvas := PixelCanvas.new(4, 4)

	assert_eq(canvas.get_px(0, 0), ".")
	assert_eq(canvas.get_px(3, 3), ".")


func test_set_out_of_bounds_is_ignored_not_errored() -> void:
	var canvas := PixelCanvas.new(4, 4)

	canvas.set_px(-1, -1, "x")
	canvas.set_px(100, 100, "x")

	assert_eq(canvas.get_px(0, 0), ".")


func test_get_out_of_bounds_returns_transparent_rather_than_erroring() -> void:
	var canvas := PixelCanvas.new(4, 4)

	assert_eq(canvas.get_px(-5, 2), ".")
	assert_eq(canvas.get_px(2, 999), ".")


func test_fill_rect_fills_inclusive_range_only() -> void:
	var canvas := PixelCanvas.new(4, 4)

	canvas.fill_rect(1, 1, 2, 2, "a")

	assert_eq(canvas.get_px(1, 1), "a")
	assert_eq(canvas.get_px(2, 2), "a")
	assert_eq(canvas.get_px(0, 0), ".")
	assert_eq(canvas.get_px(3, 3), ".")


func test_fill_ellipse_fills_center_but_not_far_corners() -> void:
	var canvas := PixelCanvas.new(10, 10)

	canvas.fill_ellipse(5, 5, 3, 3, "e")

	assert_eq(canvas.get_px(5, 5), "e")
	assert_eq(canvas.get_px(0, 0), ".")


func test_auto_outline_only_marks_transparent_pixels_touching_a_filled_one() -> void:
	var canvas := PixelCanvas.new(5, 5)
	canvas.set_px(2, 2, "f")

	canvas.auto_outline("o")

	assert_eq(canvas.get_px(1, 2), "o")
	assert_eq(canvas.get_px(3, 2), "o")
	assert_eq(canvas.get_px(2, 2), "f")
	assert_eq(canvas.get_px(0, 0), ".")


func test_set_can_carve_a_notch_back_to_transparent() -> void:
	# This is exactly how CharacterSprites carves tattered robe hems:
	# fill a shape, then set specific pixels back to ".".
	var canvas := PixelCanvas.new(5, 5)
	canvas.fill_rect(0, 0, 4, 4, "r")

	canvas.set_px(2, 2, ".")

	assert_eq(canvas.get_px(2, 2), ".")
	assert_eq(canvas.get_px(0, 0), "r")
