class_name Exorcist
extends PlayerController
## The Exorcist: the only character whose Magic ability is ranged.
## Banishing Rite fires a Projectile in the current facing direction
## instead of striking a cone — every other character's signature ability
## is still melee. Basic attack is a weak melee jab, same shape as
## everyone else's, since Exorcist is meant to lean on the Rite rather
## than trade blows up close.

@export var basic_attack_damage: float = 7.0
@export var basic_attack_range: float = 44.0

@export var rite_damage: float = 26.0
@export var rite_magic_cost: float = 20.0
@export var rite_speed: float = 420.0
@export var rite_max_distance: float = 320.0


func _init() -> void:
	character_id = CharacterId.EXORCIST


func _create_stats() -> Stats:
	return Stats.new(95.0, 55.0, 180.0, 11.0, 6.0, 10.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_exorcist()


func _attack() -> void:
	_strike_in_facing_cone(basic_attack_damage, basic_attack_range)
	_spawn_attack_slash(basic_attack_range * 0.6)
	print("Exorcist: warding strike!")


func _use_magic() -> void:
	if not stats.try_spend_magic(rite_magic_cost):
		print("Exorcist: not enough Magic for Banishing Rite.")
		return

	if get_parent() != null:
		var bolt := Projectile.new()
		bolt.speed = rite_speed
		bolt.max_distance = rite_max_distance
		bolt.damage = rite_damage
		get_parent().add_child(bolt)
		bolt.launch(global_position, Vector2.RIGHT.rotated(rotation))

	record_ability_used(rite_damage)
	print("Exorcist: Banishing Rite!")
