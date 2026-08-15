class_name Sinner
extends Enemy
## Basic rank-and-file enemy — a plain chaser, no special mechanic. Bosses subclass Enemy directly instead.
##
## Speed is randomized per-instance rather than a flat constant, so a room
## full of Sinners isn't a uniform wall moving at one speed — some visibly
## lag behind, some close distance faster than the player expects. Robe
## color is randomized too, picked from a small fixed set (ROBE_COLORS)
## rather than a fully continuous random hue — keeps every Sinner reading
## as clearly desaturated/grim (per CharacterSprites' own design
## principle) rather than risking a stray saturated color looking heroic,
## and keeps CharacterSprites.build_sinner's cache small (five distinct
## textures total, however many Sinners actually spawn over a run) rather
## than effectively never hitting the cache at all.

@export var speed_min: float = 80.0
@export var speed_max: float = 140.0

const ROBE_COLORS: Array[Color] = [
	Color(0.3, 0.08, 0.1),    # maroon — the original, unvaried color
	Color(0.09, 0.16, 0.22),  # murky slate-blue
	Color(0.14, 0.2, 0.08),   # dull olive
	Color(0.18, 0.1, 0.24),   # muted violet
	Color(0.24, 0.17, 0.05),  # dull ochre-brown
]


func _create_stats() -> Stats:
	return Stats.new(30.0, 0.0, randf_range(speed_min, speed_max), 5.0, 1.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sinner(ROBE_COLORS[randi() % ROBE_COLORS.size()])
