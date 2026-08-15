class_name Monk
extends PlayerController
## The Monk: fastest of the five, and the frailest — lowest Health and
## Defense in the roster. Flurry Strike is deliberately cheap (the
## lowest Magic cost of any signature ability), meant to be thrown out
## often rather than saved for one big moment the way Paladin's Smite or
## Prophet's Final Verse are.

@export var basic_attack_damage: float = 9.0
@export var basic_attack_range: float = 50.0

@export var flurry_damage: float = 22.0
@export var flurry_magic_cost: float = 12.0
@export var flurry_range: float = 56.0


func _init() -> void:
	character_id = CharacterId.MONK
	dash_cooldown = 0.4  # fastest recovery of the five, matching the fastest Speed stat.


func _create_stats() -> Stats:
	return Stats.new(90.0, 45.0, 260.0, 14.0, 4.0, 2.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_monk()


func _attack() -> void:
	var rolled := _rolled_damage(basic_attack_damage)
	_strike_in_facing_cone(rolled, basic_attack_range, _last_roll_was_crit)
	_spawn_attack_slash(basic_attack_range * 0.6)
	print("Monk: quick strike!")


func _use_magic() -> void:
	if not stats.try_spend_magic(flurry_magic_cost):
		print("Monk: not enough Magic for Flurry Strike.")
		return

	var rolled := _rolled_damage(flurry_damage)
	var landed := _strike_in_facing_cone(rolled, flurry_range, _last_roll_was_crit)
	if landed:
		record_ability_used(rolled)

	# Three overlapping slashes at slightly different angles rather than
	# one — this is a flurry of hits landing at once, not one bigger swing.
	_spawn_attack_slash(flurry_range * 0.6, -18.0)
	_spawn_attack_slash(flurry_range * 0.6, 0.0)
	_spawn_attack_slash(flurry_range * 0.6, 18.0)
	_trigger_arcane_echo(flurry_damage, Color(0.85, 0.75, 0.3, 0.7))
	print("Monk: Flurry Strike!")
