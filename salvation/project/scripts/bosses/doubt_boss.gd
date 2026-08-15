class_name DoubtBoss
extends SinBoss
## Trial IX. The last trial before the Adversary itself — Doubt mirrors
## almost as fast as it's struck, second-guessing every hit the instant
## it lands.

func _create_stats() -> Stats:
	return Stats.new(340.0, 0.0, 0.0, 19.0, 9.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.35, 0.32, 0.38))
