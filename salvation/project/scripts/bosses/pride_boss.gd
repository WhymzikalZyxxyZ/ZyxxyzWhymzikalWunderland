class_name PrideBoss
extends SinBoss
## Trial I. Mirrors the player's last-landed ability back at them on a
## delay instead of attacking on its own initiative — Pride only ever
## answers what you already did to it, never acts first.

var _mirrored_damage: float = 0.0
var _last_seen_ability_use_id: int = -1


func _create_stats() -> Stats:
	return Stats.new(220.0, 0.0, 0.0, 10.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_sin_boss(Color(0.32, 0.14, 0.42))


func _physics_process(delta: float) -> void:
	if _tracked_player != null and is_instance_valid(_tracked_player):
		if _last_seen_ability_use_id < 0:
			# First frame we've seen this player: baseline without mirroring
			# whatever they did before Pride ever noticed them.
			_last_seen_ability_use_id = _tracked_player.last_ability_use_id
		elif _tracked_player.last_ability_use_id != _last_seen_ability_use_id:
			_last_seen_ability_use_id = _tracked_player.last_ability_use_id
			_mirrored_damage = _tracked_player.last_ability_damage
			_signature_cooldown_remaining = _current_signature_interval()
			_is_telegraphing = false

	super._physics_process(delta)


func _signature_ready(range_now: float) -> bool:
	return (
		_mirrored_damage > 0.0
		and is_instance_valid(_tracked_player)
		and global_position.distance_to(_tracked_player.global_position) <= range_now
	)


func _resolve_signature(range_now: float) -> void:
	var damage := _mirrored_damage
	_mirrored_damage = 0.0

	if is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now:
		print("Pride's mirrored strike lands for %s damage!" % damage)
		_tracked_player.take_damage(damage, global_position)
		_spawn_attack_slash(_tracked_player.global_position, 40.0)
