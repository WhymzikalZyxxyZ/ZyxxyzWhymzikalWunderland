class_name GreedBoss
extends SinBoss
## Trial V. Wants back everything a landed hit cost it — mirrors sooner
## and more precisely than the trials before it.

func _create_stats() -> Stats:
	return Stats.new(300.0, 0.0, 0.0, 16.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.55, 0.46, 0.08))
