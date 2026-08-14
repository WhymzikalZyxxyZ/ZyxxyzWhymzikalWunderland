class_name CharacterSprites
extends RefCounted
## Pixel-art textures for the game's actors, built once at runtime via
## PixelCanvas rather than hand-drawn. Each is a small grid (real per-pixel
## shading and outline, not a smooth vector shape) baked at pixel_scale so
## it stays crisp — pair with texture_filter = TEXTURE_FILTER_NEAREST
## wherever these are assigned, or the blocky edges blur away.


static func build_paladin() -> Texture2D:
	var canvas := PixelCanvas.new(18, 20)

	# Cape trailing back-left, drawn first so the body overlaps it — this
	# one asymmetric shape is what stops the whole figure reading as a
	# centered blob.
	canvas.fill_triangle(Vector2(2, 9), Vector2(0, 19), Vector2(8, 15), "R")

	canvas.fill_ellipse(10, 14, 5, 6, "r")
	canvas.fill_ellipse(12, 15, 3, 5, "R")
	canvas.fill_ellipse(10, 5, 3.3, 3.3, "r")

	# Pauldrons — the right (sword-arm) shoulder built up larger than the left.
	canvas.fill_ellipse(5, 10, 2, 1.5, "g")
	canvas.fill_ellipse(14, 10, 2.3, 1.7, "g")

	canvas.fill_rect(9, 5, 11, 5, "s")
	canvas.fill_rect(9, 8, 10, 16, "g")
	canvas.fill_rect(7, 11, 12, 12, "g")
	canvas.fill_rect(9, 8, 9, 9, "G")
	canvas.auto_outline("o")

	# Vivid, heroic — the Paladin should read clearly against the dark
	# world rather than blend into it, the way Link's green tunic pops
	# against duller dungeon palettes. Sinner/Pride stay desaturated and
	# grim by contrast.
	var palette := {
		"r": Color(0.16, 0.32, 0.6),
		"R": Color(0.09, 0.19, 0.36),
		"s": Color(0.08, 0.06, 0.05),
		"g": Color(0.95, 0.8, 0.35),
		"G": Color(0.72, 0.58, 0.22),
		"o": Color(0.03, 0.03, 0.04),
	}
	return canvas.bake(palette, 2)


static func build_sinner() -> Texture2D:
	var canvas := PixelCanvas.new(16, 16)
	canvas.fill_ellipse(8, 9, 5, 5, "r")
	canvas.fill_ellipse(10, 10, 3, 4, "R")
	canvas.fill_ellipse(6, 8, 2, 3, "H")
	# Hood tilted off-center — a hunched, off-balance stance rather than a figure standing upright and centered.
	canvas.fill_ellipse(6, 3, 3, 2.5, "r")
	canvas.fill_rect(5, 4, 5, 4, "e")
	canvas.fill_rect(7, 4, 7, 4, "e")
	# A thin, reaching arm — breaks the silhouette out of a pure oval.
	canvas.fill_rect(12, 8, 13, 11, "R")

	# Tattered hem: notches carved out of the bottom of the robe.
	canvas.fill_triangle(Vector2(2, 13), Vector2(4, 16), Vector2(5, 12), ".")
	canvas.fill_triangle(Vector2(6, 13), Vector2(7, 16), Vector2(9, 13), ".")
	canvas.fill_triangle(Vector2(9, 12), Vector2(11, 16), Vector2(12, 13), ".")

	canvas.auto_outline("o")

	var palette := {
		"r": Color(0.3, 0.08, 0.1),
		"R": Color(0.18, 0.04, 0.06),
		"H": Color(0.4, 0.13, 0.15),
		"e": Color(0.85, 0.35, 0.1),
		"o": Color(0.02, 0.01, 0.01),
	}
	return canvas.bake(palette, 2)


static func build_pride_boss() -> Texture2D:
	var canvas := PixelCanvas.new(25, 24)

	# Robe train dragging to one side, drawn first so the body overlaps
	# it — the asymmetry that sells "a figure", not a purple oval.
	canvas.fill_triangle(Vector2(3, 14), Vector2(0, 23), Vector2(11, 20), "P")

	canvas.fill_ellipse(12, 14, 9, 8, "p")
	canvas.fill_ellipse(15, 16, 6, 6, "P")
	canvas.fill_ellipse(8, 11, 3, 5, "H")
	canvas.fill_ellipse(12, 5, 5, 4, "p")
	canvas.fill_triangle(Vector2(5, 7), Vector2(1, 0), Vector2(9, 5), "k")
	# Right horn built larger/more curved than the left — deliberately lopsided, not mirrored.
	canvas.fill_triangle(Vector2(19, 7), Vector2(24, -1), Vector2(15, 5), "k")
	canvas.fill_rect(8, 3, 15, 4, "g")
	canvas.fill_rect(9, 5, 9, 5, "e")
	canvas.fill_rect(14, 5, 14, 5, "e")

	# Chest gem — the mark of a boss, not just a bigger Sinner.
	canvas.fill_rect(11, 12, 13, 14, "g")

	# Tattered hem, larger shreds befitting a boss-scale robe.
	canvas.fill_triangle(Vector2(3, 19), Vector2(6, 22), Vector2(8, 18), ".")
	canvas.fill_triangle(Vector2(10, 19), Vector2(12, 22), Vector2(14, 19), ".")
	canvas.fill_triangle(Vector2(16, 18), Vector2(18, 22), Vector2(21, 19), ".")

	canvas.auto_outline("o")

	var palette := {
		"p": Color(0.32, 0.14, 0.42),
		"P": Color(0.2, 0.08, 0.28),
		"H": Color(0.42, 0.2, 0.52),
		"k": Color(0.12, 0.04, 0.16),
		"g": Color(0.78, 0.63, 0.24),
		"e": Color(0.9, 0.75, 0.3),
		"o": Color(0.03, 0.01, 0.04),
	}
	return canvas.bake(palette, 2)


## Iron-bound gothic door. Native size is fixed; callers stretch via Sprite2D.scale to fit the actual gap.
static func build_door() -> Texture2D:
	var canvas := PixelCanvas.new(10, 18)
	canvas.fill_rect(1, 0, 8, 17, "w")
	canvas.fill_rect(1, 0, 8, 2, "a")
	canvas.fill_rect(0, 4, 9, 5, "b")
	canvas.fill_rect(0, 12, 9, 13, "b")
	canvas.fill_rect(4, 8, 5, 9, "k")
	canvas.auto_outline("o")

	var palette := {
		"w": Color(0.24, 0.18, 0.13),
		"a": Color(0.32, 0.26, 0.16),
		"b": Color(0.12, 0.11, 0.11),
		"k": Color(0.35, 0.3, 0.15),
		"o": Color(0.03, 0.03, 0.03),
	}
	return canvas.bake(palette, 2)
