class_name SinBoss
extends Enemy
## Shared scaffolding every trial boss builds on: staying stationary and
## tracking the nearest player instead of chasing, a plain-interval
## "base attack" for baseline pressure, and a telegraphed "signature
## ability" state machine — flare gold for telegraph_duration, then
## resolve — that every concrete sin fills in differently by overriding
## _signature_ready/_start_signature/_resolve_signature. See PrideBoss
## (mirrors the player's last-landed ability), EnvyBoss (drains Magic or
## punishes having none), WrathBoss (a proactive heavy strike, answering
## nothing but its own clock), etc. for what each sin actually does with
## the hook.
##
## Furi-inspired: the signature is always clearly telegraphed (a real
## window to dash or parry away) and every boss gets more aggressive, not
## less fair, past 50% health — cooldowns shrink but telegraph_duration
## never does. Harder is never cheaper, for any of the ten.
##
## A cached player reference is revalidated every frame with
## is_instance_valid before use — if that player dies and is freed,
## touching a stale reference would error.

@export var signature_interval: float = 4.0
@export var signature_range: float = 220.0
@export var telegraph_duration: float = 0.45

@export var enraged_health_threshold: float = 0.5
@export var enraged_signature_interval: float = 2.5
@export var enraged_signature_range: float = 280.0

## Baseline aggression independent of whatever the player does — the
## signature is each sin's telegraphed centerpiece, but standing still and
## never triggering it shouldn't mean a boss never attacks at all.
## Untelegraphed on purpose: this is meant to read as ordinary pressure,
## not another readable set piece competing with the signature for attention.
@export var base_attack_interval: float = 3.0
@export var base_attack_damage: float = 12.0
@export var base_attack_range: float = 90.0

var _base_attack_cooldown_remaining: float = 0.0
var _signature_cooldown_remaining: float = 0.0
var _tracked_player: PlayerController

var _is_telegraphing: bool = false
var _telegraph_time_remaining: float = 0.0
var _is_enraged: bool = false


func _chase() -> void:
	velocity = Vector2.ZERO

	if _tracked_player != null and not is_instance_valid(_tracked_player):
		_tracked_player = null

	if _tracked_player == null:
		_tracked_player = find_nearest_player()


func _current_signature_interval() -> float:
	return enraged_signature_interval if _is_enraged else signature_interval


func _current_signature_range() -> float:
	return enraged_signature_range if _is_enraged else signature_range


func _physics_process(delta: float) -> void:
	super._physics_process(delta)

	if not _is_enraged and health_ratio <= enraged_health_threshold:
		_is_enraged = true
		_on_enraged()
		print("%s's composure cracks — it stops holding back." % display_name)

	if _tracked_player == null or not is_instance_valid(_tracked_player):
		_update_telegraph_glow()
		return

	_base_attack_cooldown_remaining -= delta
	if _base_attack_cooldown_remaining <= 0.0 and global_position.distance_to(_tracked_player.global_position) <= base_attack_range:
		_tracked_player.take_damage(base_attack_damage, global_position)
		_spawn_attack_slash(_tracked_player.global_position, 40.0)
		_base_attack_cooldown_remaining = base_attack_interval
		print("%s lashes out with a base strike!" % display_name)

	if not _is_telegraphing:
		_signature_cooldown_remaining -= delta
		if _signature_cooldown_remaining <= 0.0 and _signature_ready(_current_signature_range()):
			_is_telegraphing = true
			_telegraph_time_remaining = telegraph_duration
			_start_signature()

	if _is_telegraphing:
		_telegraph_time_remaining -= delta
		if _telegraph_time_remaining <= 0.0:
			_is_telegraphing = false
			if sprite != null:
				sprite.modulate = Color.WHITE

			# Re-check at the moment of resolution, not just when the
			# telegraph started — stepping out during the window should
			# actually save you, not just delay the inevitable. Concrete
			# sins that resolve regardless of range (e.g. LustBoss closes
			# the distance first) simply don't rely on range_now here.
			_resolve_signature(_current_signature_range())
			_signature_cooldown_remaining = _current_signature_interval()

	_update_telegraph_glow()


## Whether this sin's signature is ready to telegraph right now, given the
## current (possibly enraged) range. Base default: never — a boss that
## doesn't override this only ever uses its base attack.
func _signature_ready(_range_now: float) -> bool:
	return false


## Called once, the instant a telegraph starts — the hook to snapshot
## whatever the resolve step needs (Pride's mirrored damage, etc.).
func _start_signature() -> void:
	pass


## Called once, the instant the telegraph window ends. range_now is the
## current (possibly enraged) range, handed over so a resolve that still
## cares about distance doesn't have to recompute enrage state itself.
func _resolve_signature(_range_now: float) -> void:
	pass


## Called exactly once, the instant this boss crosses enraged_health_threshold.
func _on_enraged() -> void:
	pass


func _update_telegraph_glow() -> void:
	if sprite == null or not _is_telegraphing:
		return

	# Pulses rather than a flat tint — a static glow is easy to miss, a pulse reads as "about to happen."
	var pulse: float = 0.6 + 0.4 * sin(_telegraph_time_remaining * 30.0)
	sprite.modulate = Color(1.0, 0.85 + 0.15 * pulse, 0.4 * pulse)
