class_name EnvironmentArt
extends RefCounted
## Small, seamlessly-tileable pixel-art textures for floors and walls,
## parametrized by a base color so a room's existing floor_color/wall_color
## (already varies per room type — boss rooms run redder) still drives the
## palette. Pair with texture_repeat = enabled and a region_rect covering
## the target area to tile across an arbitrarily large room.


## Shifts a color by a flat amount per channel rather than a percentage
## (Color.darkened/lightened) — floor/wall base colors here are already
## near-black, so a 40-60% multiplicative darken barely moves the number
## (0.09 -> 0.054) and reads as a flat, textureless blur. A flat shift
## stays visible no matter how dark the base color is.
static func _shift(c: Color, amount: float) -> Color:
	return Color(
		clampf(c.r + amount, 0.0, 1.0),
		clampf(c.g + amount, 0.0, 1.0),
		clampf(c.b + amount, 0.0, 1.0),
		c.a
	)


## Four flagstones per tile with mortar seams, corner grain, and a couple of worn/cracked pixels.
static func build_floor_tile(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(16, 16)
	canvas.fill_rect(0, 0, 15, 15, "f")

	# Mortar seams — thickened to 2px so they read clearly at nearest-filter scale.
	for i in range(16):
		canvas.set_px(i, 0, "m")
		canvas.set_px(i, 1, "m")
		canvas.set_px(i, 8, "m")
		canvas.set_px(i, 9, "m")
		canvas.set_px(0, i, "m")
		canvas.set_px(1, i, "m")
		canvas.set_px(8, i, "m")
		canvas.set_px(9, i, "m")

	# Grain scattered across each flagstone quadrant — worn low spots and dust-catch highlights.
	canvas.set_px(4, 4, "c")
	canvas.set_px(5, 4, "c")
	canvas.set_px(3, 12, "c")
	canvas.set_px(13, 4, "c")
	canvas.set_px(12, 13, "c")
	canvas.set_px(13, 12, "c")
	canvas.set_px(3, 3, "h")
	canvas.set_px(12, 4, "h")
	canvas.set_px(4, 13, "h")
	canvas.set_px(13, 13, "h")

	var palette := {
		"f": base_color,
		"m": _shift(base_color, -0.055),
		"c": _shift(base_color, -0.09),
		"h": _shift(base_color, 0.06),
	}
	return canvas.bake(palette, 3)


## Running-bond brick coursing (offset joints between rows), mortar-lined.
static func build_wall_tile(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(16, 8)
	canvas.fill_rect(0, 0, 15, 7, "b")

	# Horizontal mortar course splitting the two brick rows.
	for x in range(16):
		canvas.set_px(x, 3, "m")
	# Row 1 (y 0-2): a single vertical joint at x=7.
	for y in range(3):
		canvas.set_px(7, y, "m")
	# Row 2 (y 4-7): joints at x=3 and x=11 — offset by half a brick from row 1 (running bond).
	for y in range(4, 8):
		canvas.set_px(3, y, "m")
		canvas.set_px(11, y, "m")

	canvas.set_px(2, 1, "h")
	canvas.set_px(10, 5, "h")
	canvas.set_px(13, 2, "c")
	canvas.set_px(5, 6, "c")

	var palette := {
		"b": base_color,
		"m": _shift(base_color, -0.08),
		"h": _shift(base_color, 0.07),
		"c": _shift(base_color, -0.05),
	}
	return canvas.bake(palette, 3)


## A single jagged rubble/boulder obstacle. Callers scale it to whatever collision radius they used.
static func build_rock(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(12, 12)
	canvas.fill_ellipse(6, 7, 5, 4, "r")
	canvas.fill_ellipse(8, 8, 3, 3, "R")
	canvas.fill_ellipse(4, 5, 2, 1.5, "h")
	canvas.auto_outline("o")

	var palette := {
		"r": base_color,
		"R": _shift(base_color, -0.08),
		"h": _shift(base_color, 0.1),
		"o": Color(0.02, 0.02, 0.02),
	}
	return canvas.bake(palette, 3)


## A small pixel-art heart, for the health pickup rocks can drop.
static func build_heart() -> Texture2D:
	var canvas := PixelCanvas.new(10, 9)
	canvas.fill_ellipse(2, 2, 2, 2, "h")
	canvas.fill_ellipse(7, 2, 2, 2, "h")
	canvas.fill_triangle(Vector2(0, 3), Vector2(9, 3), Vector2(4, 8), "h")
	canvas.set_px(3, 2, "s")
	canvas.set_px(2, 1, "s")
	canvas.auto_outline("o")

	var palette := {
		"h": Color(0.72, 0.08, 0.14),
		"s": Color(0.92, 0.35, 0.38),
		"o": Color(0.02, 0.02, 0.02),
	}
	return canvas.bake(palette, 3)


## Configures a Sprite2D to tile the given texture across a rectangular area, crisp edges preserved.
static func build_tiled_sprite(tile: Texture2D, top_left: Vector2, size: Vector2) -> Sprite2D:
	var sprite := Sprite2D.new()
	sprite.texture = tile
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	sprite.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
	sprite.region_enabled = true
	sprite.region_rect = Rect2(Vector2.ZERO, size)
	sprite.centered = false
	sprite.position = top_left
	return sprite
