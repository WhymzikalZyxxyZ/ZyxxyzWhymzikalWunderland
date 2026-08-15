class_name GluttonyBoss
extends SinBoss
## Trial IV. The tankiest trial yet — Gluttony has simply consumed more
## than anything before it, at the cost of hitting less often.

func _create_stats() -> Stats:
	return Stats.new(340.0, 0.0, 0.0, 13.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.45, 0.28, 0.08))
