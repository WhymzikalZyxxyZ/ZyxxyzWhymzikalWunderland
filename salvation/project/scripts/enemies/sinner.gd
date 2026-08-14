class_name Sinner
extends Enemy
## Basic rank-and-file enemy — a plain chaser, no special mechanic. Bosses subclass Enemy directly instead.


func _create_stats() -> Stats:
	return Stats.new(30.0, 0.0, 110.0, 5.0, 1.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sinner()
