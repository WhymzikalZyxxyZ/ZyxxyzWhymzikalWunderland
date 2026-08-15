class_name SlothBoss
extends SinBoss
## Trial VI. Slowest cooldowns of any trial boss — Sloth takes its time
## between strikes — but hits hard and shrugs off damage when it does move.

func _create_stats() -> Stats:
	return Stats.new(380.0, 0.0, 0.0, 14.0, 10.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.22, 0.26, 0.32))
