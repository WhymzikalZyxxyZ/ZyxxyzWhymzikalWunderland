class_name Paladin
extends PlayerController
## The Paladin: highest Defense of the five. Free basic sword swing always
## available; Divine Smite is the Magic-costing signature ability.
## First character in the MVP vertical slice.

@export var basic_attack_damage: float = 10.0
@export var basic_attack_range: float = 48.0

@export var smite_damage: float = 30.0
@export var smite_magic_cost: float = 15.0
@export var smite_range: float = 64.0


func _init() -> void:
	character_id = CharacterId.PALADIN


func _create_stats() -> Stats:
	return Stats.new(130.0, 40.0, 200.0, 16.0, 8.0, 5.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_paladin()


func _attack() -> void:
	_strike_in_facing_cone(basic_attack_damage, basic_attack_range)
	print("Paladin: sword strike!")


func _use_magic() -> void:
	if not stats.try_spend_magic(smite_magic_cost):
		print("Paladin: not enough Magic to Smite.")
		return

	var landed := _strike_in_facing_cone(smite_damage, smite_range)
	if landed:
		record_ability_used(smite_damage)

	print("Paladin: Divine Smite!")


func _strike_in_facing_cone(damage: float, attack_range: float) -> bool:
	var origin := global_position
	var facing := Vector2.RIGHT.rotated(rotation)
	var landed := false

	for target: Enemy in Enemy.active_enemies:
		if not is_instance_valid(target):
			continue
		if origin.distance_to(target.global_position) > attack_range:
			continue
		if origin.direction_to(target.global_position).dot(facing) < 0.5:
			continue

		target.take_damage(damage)
		landed = true

	for rock: Rock in Rock.active_rocks:
		if not is_instance_valid(rock):
			continue
		if origin.distance_to(rock.global_position) > attack_range:
			continue
		if origin.direction_to(rock.global_position).dot(facing) < 0.5:
			continue

		rock.take_damage(damage)
		landed = true

	return landed
