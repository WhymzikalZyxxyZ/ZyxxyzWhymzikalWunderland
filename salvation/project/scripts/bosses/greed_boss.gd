class_name GreedBoss
extends SinBoss
## Trial V. Wants both what you're holding and a piece of you regardless —
## unlike Envy, which takes Magic *or* deals damage depending on whether
## any is left to take, Greed drains whatever Magic is available *and*
## strikes anyway. Never satisfied by only one kind of theft.

@export var extort_drain_amount: float = 24.0
@export var extort_damage: float = 12.0


func _create_stats() -> Stats:
	return Stats.new(300.0, 0.0, 0.0, 16.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_greed_boss(Color(0.55, 0.46, 0.08))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _resolve_signature(range_now: float) -> void:
	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	if _tracked_player.stats.magic > 0.0:
		var stolen: float = minf(extort_drain_amount, _tracked_player.stats.magic)
		_tracked_player.stats.magic -= stolen
		stats.heal(stolen)
		print("Greed extorts %s Magic..." % stolen)

	print("...and takes a piece of the player regardless.")
	_tracked_player.take_damage(extort_damage, global_position)
	_spawn_attack_slash(_tracked_player.global_position, 40.0)
