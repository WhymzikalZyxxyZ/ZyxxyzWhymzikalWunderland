class_name EnvyBoss
extends SinBoss
## Trial II. Covets whatever Magic the player is currently holding: if
## they have any when the telegraph resolves, Envy drains it and heals
## itself by the same amount. Spend your Magic before the window closes
## and you deny the drain entirely — but Envy doesn't come away empty-
## handed either way, and lands a hit instead.

@export var covet_drain_amount: float = 18.0
@export var covet_punish_damage: float = 14.0


func _create_stats() -> Stats:
	return Stats.new(250.0, 0.0, 0.0, 12.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_envy_boss(Color(0.14, 0.36, 0.18))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _resolve_signature(range_now: float) -> void:
	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	if _tracked_player.stats.magic > 0.0:
		var stolen: float = minf(covet_drain_amount, _tracked_player.stats.magic)
		_tracked_player.stats.magic -= stolen
		stats.heal(stolen)
		print("Envy covets %s Magic and mends itself with it!" % stolen)
	else:
		_tracked_player.take_damage(covet_punish_damage, global_position)
		print("Envy finds nothing to covet — and takes something else instead.")

	_spawn_attack_slash(_tracked_player.global_position, 40.0)
