class_name LustBoss
extends SinBoss
## Trial VII. Fastest mirror loop of any trial boss yet — Lust can't leave
## a landed hit unanswered for long.

func _create_stats() -> Stats:
	return Stats.new(310.0, 0.0, 0.0, 18.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.5, 0.12, 0.32))
