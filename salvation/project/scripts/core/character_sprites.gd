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


## Cleric: pale, unarmored robes and a raised gold circlet — the least
## armored of the five by silhouette, reading as a healer rather than a fighter.
static func build_cleric() -> Texture2D:
	var canvas := PixelCanvas.new(18, 20)

	canvas.fill_triangle(Vector2(3, 10), Vector2(1, 19), Vector2(9, 16), "R")
	canvas.fill_ellipse(10, 14, 5, 6, "r")
	canvas.fill_ellipse(12, 15, 3, 5, "R")
	canvas.fill_ellipse(10, 5, 3.3, 3.3, "r")

	# A circlet rather than pauldrons — nothing about this silhouette reads as armor.
	canvas.fill_rect(8, 2, 12, 3, "g")
	canvas.set_px(10, 1, "g")

	canvas.fill_rect(9, 8, 10, 17, "s")
	canvas.fill_rect(7, 12, 12, 13, "s")

	canvas.auto_outline("o")

	var palette := {
		"r": Color(0.88, 0.85, 0.78),
		"R": Color(0.68, 0.64, 0.56),
		"s": Color(0.94, 0.9, 0.8),
		"g": Color(0.85, 0.72, 0.3),
		"o": Color(0.05, 0.04, 0.03),
	}
	return canvas.bake(palette, 2)


## Monk: leaner and shorter than any other character, no cape, no armor —
## a plain wrapped robe built for speed rather than protection.
static func build_monk() -> Texture2D:
	var canvas := PixelCanvas.new(16, 19)

	canvas.fill_ellipse(8, 13, 4, 6, "r")
	canvas.fill_ellipse(9, 14, 2.5, 5, "R")
	canvas.fill_ellipse(8, 5, 3, 3, "r")

	# A wrapped sash, the only accent this character wears.
	canvas.fill_rect(5, 10, 11, 12, "g")

	canvas.auto_outline("o")

	var palette := {
		"r": Color(0.78, 0.42, 0.14),
		"R": Color(0.56, 0.28, 0.08),
		"g": Color(0.85, 0.75, 0.3),
		"o": Color(0.04, 0.03, 0.02),
	}
	return canvas.bake(palette, 2)


## Exorcist: dark robes with a bright holy symbol at the chest and a
## censer/rod silhouette at the hip — built to read as a caster, not a fighter.
static func build_exorcist() -> Texture2D:
	var canvas := PixelCanvas.new(18, 21)

	canvas.fill_triangle(Vector2(2, 10), Vector2(0, 20), Vector2(9, 17), "R")
	canvas.fill_ellipse(10, 15, 5, 6, "r")
	canvas.fill_ellipse(12, 16, 3, 5, "R")
	canvas.fill_ellipse(9, 5, 3, 3, "r")

	# The rod/censer at the hip — a distinct silhouette element none of the melee characters have.
	canvas.fill_rect(14, 13, 15, 19, "s")
	canvas.fill_ellipse(14, 12, 1.4, 1.4, "g")

	# Holy symbol at the chest — the brightest point on an otherwise dark figure.
	canvas.fill_rect(9, 11, 11, 15, "g")
	canvas.fill_rect(8, 12, 12, 13, "g")

	canvas.auto_outline("o")

	var palette := {
		"r": Color(0.22, 0.14, 0.32),
		"R": Color(0.13, 0.08, 0.2),
		"s": Color(0.15, 0.12, 0.1),
		"g": Color(0.88, 0.8, 0.4),
		"o": Color(0.03, 0.02, 0.04),
	}
	return canvas.bake(palette, 2)


## Prophet: the most ornate of the five — a tall staff-like silhouette and
## a glowing third-eye mark, deliberately the least armored and most
## magic-forward looking character in the roster.
static func build_prophet() -> Texture2D:
	var canvas := PixelCanvas.new(19, 22)

	canvas.fill_triangle(Vector2(2, 11), Vector2(0, 21), Vector2(10, 18), "R")
	canvas.fill_ellipse(11, 16, 5, 6, "r")
	canvas.fill_ellipse(13, 17, 3, 5, "R")
	canvas.fill_ellipse(9, 5, 3.2, 3.2, "r")

	# A tall staff — taller than any other character's silhouette element.
	canvas.fill_rect(15, 0, 16, 19, "s")
	canvas.fill_ellipse(15, 0, 1.6, 1.6, "g")

	# The glowing mark — the only actual light source on any character's face.
	canvas.fill_ellipse(9, 5, 0.9, 0.9, "e")

	canvas.auto_outline("o")

	var palette := {
		"r": Color(0.18, 0.14, 0.4),
		"R": Color(0.1, 0.08, 0.24),
		"s": Color(0.3, 0.24, 0.14),
		"g": Color(0.8, 0.7, 0.35),
		"e": Color(0.6, 0.85, 0.95),
		"o": Color(0.03, 0.02, 0.05),
	}
	return canvas.bake(palette, 2)


## A short energy bolt — Exorcist's Banishing Rite is the only ranged
## attack in the game, so this is the only projectile sprite needed.
static func build_projectile_bolt() -> Texture2D:
	var canvas := PixelCanvas.new(10, 5)
	canvas.fill_ellipse(5, 2, 4.5, 1.8, "g")
	canvas.fill_ellipse(6, 2, 2.5, 1.0, "e")
	canvas.auto_outline("o")

	var palette := {
		"g": Color(0.7, 0.55, 0.2),
		"e": Color(0.95, 0.9, 0.7),
		"o": Color(0.05, 0.04, 0.02),
	}
	return canvas.bake(palette, 3)


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


## Every trial-boss palette derives from a single base hue the same way —
## shadow/highlight/horn-dark from Color.darkened/.lightened, gold trim and
## outline held constant across every sin so a boss always reads as
## visually coherent regardless of which one it is.
static func _sin_palette(base_color: Color) -> Dictionary:
	return {
		"p": base_color,
		"P": base_color.darkened(0.35),
		"H": base_color.lightened(0.2),
		"k": base_color.darkened(0.6),
		"g": Color(0.78, 0.63, 0.24),
		"e": Color(0.9, 0.75, 0.3),
		"o": Color(0.03, 0.01, 0.04),
	}


## The classic robed-and-horned silhouette — Pride's original shape, and
## the Adversary's too (fitting: the last trial wears every sin at once,
## echoing the first). Every other trial boss gets its own distinct
## silhouette below rather than just a recolor of this one.
static func build_sin_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(25, 24)

	# Robe train dragging to one side, drawn first so the body overlaps
	# it — the asymmetry that sells "a figure", not a colored oval.
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
	return canvas.bake(_sin_palette(base_color), 2)


## Envy: a hunched, watchful shape — two extra "eyes" set asymmetrically
## into the shoulders (always watching what it doesn't have) and an arm
## reaching further than a normal Sinner's ever does.
static func build_envy_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(26, 22)

	canvas.fill_triangle(Vector2(3, 12), Vector2(0, 21), Vector2(10, 18), "P")
	canvas.fill_ellipse(12, 13, 8, 7, "p")
	canvas.fill_ellipse(15, 15, 5, 5, "P")
	canvas.fill_ellipse(8, 6, 3, 3, "H")

	# The reach — longer than any other trial boss's arm, always stretching for more.
	canvas.fill_rect(18, 11, 25, 13, "P")
	canvas.fill_triangle(Vector2(23, 10), Vector2(26, 12), Vector2(23, 14), "k")

	# Watching eyes: deliberately mismatched size and height.
	canvas.fill_ellipse(5, 10, 1.4, 1.4, "e")
	canvas.fill_ellipse(17, 8, 1.0, 1.0, "e")

	canvas.fill_rect(10, 12, 12, 14, "g")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Wrath: broad shoulders, a jagged blade-arm, and a single crack across
## the face — nothing ornamental, all of it built for hitting first.
static func build_wrath_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(25, 23)

	canvas.fill_ellipse(11, 14, 9, 8, "p")
	canvas.fill_ellipse(14, 16, 6, 6, "P")
	canvas.fill_ellipse(9, 6, 3.5, 3, "H")

	# Shoulder spikes — jagged, not the smooth horns other sins wear.
	canvas.fill_triangle(Vector2(2, 8), Vector2(0, 2), Vector2(6, 7), "k")
	canvas.fill_triangle(Vector2(16, 7), Vector2(19, 1), Vector2(20, 8), "k")

	# The blade-arm — a single jagged edge, longer and heavier than any base attack should look.
	canvas.fill_triangle(Vector2(17, 13), Vector2(25, 9), Vector2(18, 18), "k")

	# A crack across the face rather than the calm gold eyes other sins get.
	canvas.set_px(8, 5, "o")
	canvas.set_px(9, 6, "o")
	canvas.set_px(9, 7, "o")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Gluttony: wide, round, and low — a small head atop a body that's
## consumed more than any other trial boss, drooping under its own weight.
static func build_gluttony_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(27, 24)

	canvas.fill_ellipse(13, 14, 11, 8, "p")
	canvas.fill_ellipse(13, 20, 10, 4, "P")
	canvas.fill_ellipse(13, 5, 3, 3, "H")
	canvas.fill_ellipse(4, 15, 2.5, 3, "P")
	canvas.fill_ellipse(22, 15, 2.5, 3, "P")

	# A gold band strained across the belly — excess, not adornment.
	canvas.fill_rect(4, 16, 22, 18, "g")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Greed: a normal frame built entirely around one outstretched hand
## clutching a coin far larger than anything else on its body.
static func build_greed_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(26, 22)

	canvas.fill_triangle(Vector2(2, 12), Vector2(0, 21), Vector2(9, 18), "P")
	canvas.fill_ellipse(10, 13, 7, 7, "p")
	canvas.fill_ellipse(13, 15, 5, 5, "P")
	canvas.fill_ellipse(7, 6, 3, 3, "H")

	# The coin — the single largest gold shape of any trial boss.
	canvas.fill_ellipse(21, 12, 4, 4, "e")
	canvas.fill_ellipse(21, 12, 2.3, 2.3, "g")
	canvas.fill_rect(15, 11, 18, 13, "P")

	# Grasping fingers curled around it.
	canvas.fill_triangle(Vector2(17, 9), Vector2(19, 7), Vector2(18, 12), "k")
	canvas.fill_triangle(Vector2(17, 16), Vector2(19, 18), Vector2(18, 13), "k")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Sloth: low, slumped, unadorned — no horns, no reach, just weight and a
## robe dragged so far back it trails off the edge of the canvas.
static func build_sloth_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(26, 18)

	canvas.fill_triangle(Vector2(6, 10), Vector2(0, 17), Vector2(20, 15), "P")
	canvas.fill_ellipse(14, 11, 10, 6, "p")
	canvas.fill_ellipse(6, 9, 3, 2.5, "H")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Lust: slender and tall, with flowing trails streaming back from the
## head and a heart-shaped mark at the chest — the most ornamental silhouette.
static func build_lust_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(22, 25)

	canvas.fill_ellipse(11, 15, 5.5, 8, "p")
	canvas.fill_ellipse(11, 6, 3, 3, "H")

	# Flowing trails, thin and asymmetric.
	canvas.fill_triangle(Vector2(8, 4), Vector2(2, 2), Vector2(9, 9), "P")
	canvas.fill_triangle(Vector2(14, 4), Vector2(21, 8), Vector2(13, 9), "P")
	canvas.fill_triangle(Vector2(9, 5), Vector2(4, 12), Vector2(10, 10), "P")

	# Heart mark at the chest.
	canvas.fill_ellipse(9, 14, 1.4, 1.4, "e")
	canvas.fill_ellipse(12, 14, 1.4, 1.4, "e")
	canvas.fill_triangle(Vector2(7, 15), Vector2(14, 15), Vector2(10.5, 19), "e")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Despair: tall and gaunt, arms hanging, with a hollow void where every
## other trial boss has a lit face — nothing looks back at you.
static func build_despair_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(22, 27)

	canvas.fill_triangle(Vector2(4, 16), Vector2(1, 26), Vector2(11, 23), "P")
	canvas.fill_ellipse(11, 16, 6, 9, "p")
	canvas.fill_ellipse(11, 5, 3, 3.2, "k")  # hollow face, not "H" — nothing shines here.
	canvas.fill_rect(3, 12, 5, 22, "P")
	canvas.fill_rect(17, 12, 19, 22, "P")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## Doubt: split down the middle — one half drawn solid, the other faded
## and smaller, reading as two overlapping figures that never quite agree.
static func build_doubt_boss(base_color: Color) -> Texture2D:
	var canvas := PixelCanvas.new(24, 22)

	# Solid half.
	canvas.fill_ellipse(9, 13, 7, 8, "p")
	canvas.fill_ellipse(9, 5, 3, 3, "H")

	# Faded, offset half — smaller and set back, like an afterimage of doubt.
	canvas.fill_ellipse(16, 14, 5, 6, "P")
	canvas.fill_ellipse(16, 8, 2.2, 2.2, "k")

	canvas.auto_outline("o")
	return canvas.bake(_sin_palette(base_color), 2)


## A simple curved slash arc — the pixel-level attack effect, drawn once
## and reused for every strike rather than a full sprite-sheet animation.
## Native size is fixed; callers rotate the resulting Sprite2D to the
## attacker's facing direction.
static func build_slash() -> Texture2D:
	var canvas := PixelCanvas.new(20, 20)

	# An arc built from three overlapping ellipse rings, thickest at the
	# center and tapering at each end — reads as a curved sword-swing rather
	# than a straight bar.
	canvas.fill_ellipse(10, 10, 9, 9, "s")
	canvas.fill_ellipse(10, 10, 6, 6, ".")
	canvas.fill_ellipse(2, 4, 3, 3, ".")
	canvas.fill_ellipse(18, 4, 3, 3, ".")
	canvas.fill_ellipse(2, 16, 5, 5, ".")
	canvas.fill_ellipse(18, 16, 5, 5, ".")
	canvas.fill_ellipse(10, 3, 2, 2, "h")

	var palette := {
		"s": Color(0.92, 0.92, 0.98, 0.85),
		"h": Color(1.0, 1.0, 1.0, 0.95),
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
