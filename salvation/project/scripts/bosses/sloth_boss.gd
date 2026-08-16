class_name SlothBoss
extends SinBoss
## Trial VI. Doesn't hit hard when its signature resolves — it hits slow:
## the player's own Speed is cut for a few seconds instead of taking
## direct damage. If Sloth is defeated while that debuff is still active,
## _defeat() restores the player's speed immediately rather than leaving
## them permanently slowed by a boss that no longer exists.

@export var slow_multiplier: float = 0.45
@export var slow_duration: float = 2.5

var _slowed_player: PlayerController
var _slow_original_speed: float = 0.0
var _slow_time_remaining: float = 0.0


func _create_stats() -> Stats:
	return Stats.new(380.0, 0.0, 0.0, 14.0, 10.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sloth_boss(Color(0.22, 0.26, 0.32))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _resolve_signature(range_now: float) -> void:
	if not is_instance_valid(_tracked_player) or global_position.distance_to(_tracked_player.global_position) > range_now:
		return

	# Refreshing an existing slow uses the ORIGINAL speed as the base, not
	# whatever the already-reduced current speed is — otherwise repeated
	# hits would compound into an ever-shrinking speed.
	if not is_instance_valid(_slowed_player) or _slowed_player != _tracked_player:
		_slow_original_speed = _tracked_player.stats.speed

	_slowed_player = _tracked_player
	_slowed_player.stats.speed = _slow_original_speed * slow_multiplier
	_slow_time_remaining = slow_duration
	print("Sloth's weight settles over the player — everything slows.")


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
