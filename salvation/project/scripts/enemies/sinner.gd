class_name Sinner
extends Enemy
## Basic rank-and-file enemy — a plain chaser, no special mechanic. Bosses subclass Enemy directly instead.
##
## Speed is randomized per-instance rather than a flat constant, so a room
## full of Sinners isn't a uniform wall moving at one speed — some visibly
## lag behind, some close distance faster than the player expects.

@export var speed_min: float = 80.0
@export var speed_max: float = 140.0


func _create_stats() -> Stats:
	return Stats.new(30.0, 0.0, randf_range(speed_min, speed_max), 5.0, 1.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sinner()
