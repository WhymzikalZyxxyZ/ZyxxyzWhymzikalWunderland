class_name AdversaryBoss
extends SinBoss
## Trial X — the last one. Wears every sin at once rather than one of
## its own: proactive like Wrath (fires on its own clock, not waiting on
## the player), and its strike carries a brief Sloth-style slow on top of
## real damage. Same silhouette as Pride, too — the culmination of every
## trial before it, echoing the first. Its telegraph window is still
## exactly as long as Pride's, though — SinBoss's central promise (harder,
## never cheaper) holds all the way to the end.

@export var strike_damage: float = 22.0
@export var slow_multiplier: float = 0.65
@export var slow_duration: float = 1.2

var _slowed_player: PlayerController
var _slow_original_speed: float = 0.0
var _slow_time_remaining: float = 0.0


func _create_stats() -> Stats:
	return Stats.new(480.0, 0.0, 0.0, 26.0, 12.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.18, 0.03, 0.03))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _resolve_signature(range_now: float) -> void:
	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	print("The Adversary strikes — everything the nine trials before it taught, at once.")
	_tracked_player.take_damage(strike_damage, global_position)
	_spawn_attack_slash(_tracked_player.global_position, 44.0)

	if not is_instance_valid(_slowed_player) or _slowed_player != _tracked_player:
		_slow_original_speed = _tracked_player.stats.speed
	_slowed_player = _tracked_player
	_slowed_player.stats.speed = _slow_original_speed * slow_multiplier
	_slow_time_remaining = slow_duration


func _physics_process(delta: float) -> void:
	super._physics_process(delta)

	if _slow_time_remaining > 0.0:
		_slow_time_remaining -= delta
		if _slow_time_remaining <= 0.0:
			_clear_slow()


func _clear_slow() -> void:
	if is_instance_valid(_slowed_player):
		_slowed_player.stats.speed = _slow_original_speed
	_slowed_player = null


func _defeat() -> void:
	_clear_slow()
	super._defeat()
