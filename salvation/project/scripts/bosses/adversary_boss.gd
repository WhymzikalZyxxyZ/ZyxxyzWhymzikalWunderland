class_name AdversaryBoss
extends SinBoss
## Trial X — the last one. Everything the nine trials before it tested,
## at once: the hardest hits, the shortest telegraph-to-telegraph loop,
## and the longest reach of any trial boss. Its telegraph window is still
## exactly as long as Pride's, though — SinBoss's central promise (harder,
## never cheaper) holds all the way to the end.

func _create_stats() -> Stats:
	return Stats.new(480.0, 0.0, 0.0, 26.0, 12.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.18, 0.03, 0.03))
