class_name PrideBoss
extends Enemy
## Level 1 boss. Unique mechanic: mirrors the player's last-landed ability
## back at them on a delay instead of chasing — tests unpredictable ability
## use, since attacking recklessly hands Pride its own next attack.
##
## Furi-inspired on top of that: the counter-strike is clearly telegraphed
## (the boss flares gold for telegraph_duration before it actually lands,
## giving a real window to dash or parry away — Furi's bosses are brutal
## but never cheap, every hit is readable) and Pride gets more aggressive,
## not less fair, as its health drops: past 50% the mirror cooldown
## shortens and its range extends, but the telegraph window stays exactly
## as long. Faster fights, same rules.
##
## A cached player reference is revalidated every frame with
## is_instance_valid before use — if that player dies and is freed,
## touching a stale reference would error.

@export var mirror_interval: float = 4.0
@export var mirror_range: float = 220.0
@export var telegraph_duration: float = 0.45

@export var enraged_health_threshold: float = 0.5
@export var enraged_mirror_interval: float = 2.5
@export var enraged_mirror_range: float = 280.0

## Baseline aggression independent of whatever the player does — the mirror
## is Pride's signature (and telegraphed) counter, but standing still and
## never using an ability shouldn't mean Pride never attacks at all.
## Untelegraphed on purpose: this is meant to read as ordinary pressure,
## not another readable set piece competing with the mirror for attention.
@export var base_attack_interval: float = 3.0
@export var base_attack_damage: float = 12.0
@export var base_attack_range: float = 90.0

var _mirrored_damage: float = 0.0
var _mirror_cooldown_remaining: float = 0.0
var _base_attack_cooldown_remaining: float = 0.0
var _tracked_player: PlayerController
var _last_seen_ability_use_id: int = -1

var _is_telegraphing: bool = false
var _telegraph_time_remaining: float = 0.0
var _is_enraged: bool = false


func _create_stats() -> Stats:
	return Stats.new(220.0, 0.0, 0.0, 10.0, 6.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_pride_boss()


func _chase() -> void:
	velocity = Vector2.ZERO

	if _tracked_player != null and not is_instance_valid(_tracked_player):
		_tracked_player = null
		_last_seen_ability_use_id = -1

	if _tracked_player == null:
		_tracked_player = find_nearest_player()


func _physics_process(delta: float) -> void:
	super._physics_process(delta)

	if not _is_enraged and health_ratio <= enraged_health_threshold:
		_is_enraged = true
		print("Pride's composure cracks — it stops holding back.")

	var mirror_interval_now: float = enraged_mirror_interval if _is_enraged else mirror_interval
	var mirror_range_now: float = enraged_mirror_range if _is_enraged else mirror_range

	if _tracked_player == null or not is_instance_valid(_tracked_player):
		_update_telegraph_glow()
		return

	_base_attack_cooldown_remaining -= delta
	if _base_attack_cooldown_remaining <= 0.0 and global_position.distance_to(_tracked_player.global_position) <= base_attack_range:
		_tracked_player.take_damage(base_attack_damage)
		_spawn_attack_slash(_tracked_player.global_position, 40.0)
		_base_attack_cooldown_remaining = base_attack_interval
		print("Pride lashes out with a base strike!")

	if _last_seen_ability_use_id < 0:
		# First frame we've seen this player: baseline without mirroring
		# whatever they did before Pride ever noticed them.
		_last_seen_ability_use_id = _tracked_player.last_ability_use_id
	elif _tracked_player.last_ability_use_id != _last_seen_ability_use_id:
		_last_seen_ability_use_id = _tracked_player.last_ability_use_id
		_mirrored_damage = _tracked_player.last_ability_damage
		_mirror_cooldown_remaining = mirror_interval_now
		_is_telegraphing = false

	if _mirrored_damage > 0.0 and not _is_telegraphing:
		_mirror_cooldown_remaining -= delta
		if _mirror_cooldown_remaining <= 0.0 and global_position.distance_to(_tracked_player.global_position) <= mirror_range_now:
			_is_telegraphing = true
			_telegraph_time_remaining = telegraph_duration

	if _is_telegraphing:
		_telegraph_time_remaining -= delta
		if _telegraph_time_remaining <= 0.0:
			_is_telegraphing = false
			if sprite != null:
				sprite.modulate = Color.WHITE

			var damage := _mirrored_damage
			_mirrored_damage = 0.0

			# Re-check range at the moment of impact, not just when the
			# telegraph started — stepping out during the window should
			# actually save you, not just delay the inevitable.
			if is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= mirror_range_now:
				print("Pride's mirrored strike lands for %s damage!" % damage)
				_tracked_player.take_damage(damage)
				_spawn_attack_slash(_tracked_player.global_position, 40.0)

	_update_telegraph_glow()


func _update_telegraph_glow() -> void:
	if sprite == null or not _is_telegraphing:
		return

	# Pulses rather than a flat tint — a static glow is easy to miss, a pulse reads as "about to happen."
	var pulse: float = 0.6 + 0.4 * sin(_telegraph_time_remaining * 30.0)
	sprite.modulate = Color(1.0, 0.85 + 0.15 * pulse, 0.4 * pulse)
