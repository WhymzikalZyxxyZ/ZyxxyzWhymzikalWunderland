class_name DespairBoss
extends SinBoss
## Trial VIII. Past the seven sins — the trials still ahead. Its strike
## lands twice: once immediately, then again a moment later — the weight
## of it doesn't lift when the hit itself is over. If Despair is defeated
## before the second tick lands, the lingering damage simply never
## resolves (is_instance_valid guards it) rather than erroring.

@export var strike_damage: float = 18.0
@export var lingering_damage: float = 9.0
@export var lingering_delay: float = 1.2

var _lingering_target: PlayerController
var _lingering_time_remaining: float = 0.0


func _create_stats() -> Stats:
	return Stats.new(360.0, 0.0, 0.0, 20.0, 10.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_despair_boss(Color(0.08, 0.08, 0.16))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _resolve_signature(range_now: float) -> void:
	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	print("Despair's strike lands — and doesn't let go.")
	_tracked_player.take_damage(strike_damage, global_position)
	_spawn_attack_slash(_tracked_player.global_position, 40.0)

	_lingering_target = _tracked_player
	_lingering_time_remaining = lingering_delay


func _physics_process(delta: float) -> void:
	super._physics_process(delta)

	if _lingering_time_remaining > 0.0:
		_lingering_time_remaining -= delta
		if _lingering_time_remaining <= 0.0:
			if is_instance_valid(_lingering_target):
				_lingering_target.take_damage(lingering_damage, global_position)
			_lingering_target = null
