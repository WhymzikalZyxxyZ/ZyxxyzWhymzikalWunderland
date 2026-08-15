class_name Cleric
extends PlayerController
## The Cleric: least armored of the five, and the only one whose Magic
## ability doesn't deal damage at all. Sacred Mend heals instead of
## striking — the game's one self-sustain tool. record_ability_used still
## fires with the heal amount, same as every damaging ability does, so
## Pride's mirror (and anything else that reads last_ability_damage) mirrors
## whatever value the last ability actually used, healing or not — no
## special-casing needed for a mirror to make dark sense of a heal.

@export var basic_attack_damage: float = 8.0
@export var basic_attack_range: float = 46.0

@export var mend_heal_amount: float = 35.0
@export var mend_magic_cost: float = 25.0


func _init() -> void:
	character_id = CharacterId.CLERIC


func _create_stats() -> Stats:
	return Stats.new(100.0, 70.0, 190.0, 12.0, 5.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_cleric()


func _attack() -> void:
	_strike_in_facing_cone(basic_attack_damage, basic_attack_range)
	_spawn_attack_slash(basic_attack_range * 0.6)
	print("Cleric: mace strike!")


func _use_magic() -> void:
	if not stats.try_spend_magic(mend_magic_cost):
		print("Cleric: not enough Magic to Mend.")
		return

	stats.heal(mend_heal_amount)
	record_ability_used(mend_heal_amount)
	_spawn_attack_slash(basic_attack_range * 0.6)
	print("Cleric: Sacred Mend!")
