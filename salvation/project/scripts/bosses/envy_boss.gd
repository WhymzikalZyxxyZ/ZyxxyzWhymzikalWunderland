class_name EnvyBoss
extends SinBoss
## Trial II. Mirrors faster and lets go of its grudge sooner than Pride
## does — Envy can't stand watching you land a hit without answering it.

func _create_stats() -> Stats:
	return Stats.new(250.0, 0.0, 0.0, 12.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.14, 0.36, 0.18))
