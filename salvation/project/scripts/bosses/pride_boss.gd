class_name PrideBoss
extends SinBoss
## Trial I. See SinBoss for the shared mirror/telegraph/base-attack mechanic
## every trial boss shares — this class only supplies Pride's own stats and
## sprite palette.

func _create_stats() -> Stats:
	return Stats.new(220.0, 0.0, 0.0, 10.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.32, 0.14, 0.42))
