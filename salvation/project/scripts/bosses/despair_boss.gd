class_name DespairBoss
extends SinBoss
## Trial VIII. Past the seven sins — the trials still ahead. Despair hits
## harder and answers faster than anything so far, testing whether the
## player's resolve holds once the sins alone stop being the hardest part.

func _create_stats() -> Stats:
	return Stats.new(360.0, 0.0, 0.0, 20.0, 10.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.08, 0.08, 0.16))
