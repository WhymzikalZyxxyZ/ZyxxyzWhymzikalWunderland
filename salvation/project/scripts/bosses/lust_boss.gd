class_name LustBoss
extends SinBoss
## Trial VII. The only trial boss whose signature ignores range entirely —
## Lust closes the distance itself the instant the telegraph resolves,
## teleporting to the player's side before striking. Standing far away
## buys time before the telegraph starts, never safety once it does.

@export var strike_damage: float = 16.0
@export var arrival_offset: float = 48.0


func _create_stats() -> Stats:
	return Stats.new(310.0, 0.0, 0.0, 18.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_lust_boss(Color(0.5, 0.12, 0.32))


func _signature_ready(_range_now: float) -> bool:
	return is_instance_valid(_tracked_player)


func _resolve_signature(_range_now: float) -> void:
	if not is_instance_valid(_tracked_player):
		return

	var approach := global_position.direction_to(_tracked_player.global_position)
	if approach == Vector2.ZERO:
		approach = Vector2.RIGHT
	global_position = _tracked_player.global_position - approach * arrival_offset

	print("Lust closes the distance — there was never anywhere to hide.")
	_tracked_player.take_damage(strike_damage, global_position)
	_spawn_attack_slash(_tracked_player.global_position, 36.0)
