class_name DoubtBoss
extends SinBoss
## Trial IX. The last trial before the Adversary. Roughly half of Doubt's
## telegraphs are feints — the glow still plays, but nothing follows when
## the window closes. The other half land for more than a normal
## signature would, since a real strike still has to matter even when
## half of them aren't real. Reacting to every telegraph costs nothing but
## rhythm; ignoring all of them is the actual gamble.

@export var strike_damage: float = 24.0
@export var feint_chance: float = 0.5

var _is_feint: bool = false


func _create_stats() -> Stats:
	return Stats.new(340.0, 0.0, 0.0, 19.0, 9.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_doubt_boss(Color(0.35, 0.32, 0.38))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _start_signature() -> void:
	_is_feint = randf() < feint_chance


func _resolve_signature(range_now: float) -> void:
	if _is_feint:
		print("Doubt's telegraph was never real.")
		return

	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	print("Doubt commits, fully, this time.")
	_tracked_player.take_damage(strike_damage, global_position)
	_spawn_attack_slash(_tracked_player.global_position, 40.0)
