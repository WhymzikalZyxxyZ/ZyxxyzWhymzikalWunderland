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
	_strike_in_facing_cone(basic_attack_damage, basic_attack_range)
	_spawn_attack_slash(basic_attack_range * 0.6)
	print("Monk: quick strike!")


func _use_magic() -> void:
	if not stats.try_spend_magic(flurry_magic_cost):
		print("Monk: not enough Magic for Flurry Strike.")
		return

	var landed := _strike_in_facing_cone(flurry_damage, flurry_range)
	if landed:
		record_ability_used(flurry_damage)

	_spawn_attack_slash(flurry_range * 0.6)
	print("Monk: Flurry Strike!")
