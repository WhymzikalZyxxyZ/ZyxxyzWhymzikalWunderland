class_name WrathBoss
extends SinBoss
## Trial III. Hits harder than anything before it and swings its base
## attack constantly — Wrath doesn't wait for a reason to strike.

func _create_stats() -> Stats:
	return Stats.new(260.0, 0.0, 0.0, 15.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.5, 0.08, 0.08))
