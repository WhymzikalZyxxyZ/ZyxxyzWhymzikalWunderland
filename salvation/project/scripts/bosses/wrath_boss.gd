class_name WrathBoss
extends SinBoss
## Trial III. Doesn't wait for a reason to strike — unlike Pride's mirror
## or Envy's covet, Wrath's signature is proactive: it fires on its own
## clock the instant it's in range, whether or not the player has done
## anything to provoke it.

@export var signature_damage: float = 26.0


func _create_stats() -> Stats:
	return Stats.new(260.0, 0.0, 0.0, 15.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_wrath_boss(Color(0.5, 0.08, 0.08))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _resolve_signature(range_now: float) -> void:
	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	print("Wrath's fury lands unprovoked!")
	_tracked_player.take_damage(signature_damage, global_position)
	_spawn_attack_slash(_tracked_player.global_position, 44.0)
