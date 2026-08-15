class_name Prophet
extends PlayerController
## The Prophet: last character in the unlock chain, and the glassiest —
## lowest Defense and among the lowest Health of the five, but the
## highest Magic, Power, and Faith. Final Verse costs more Magic than any
## other signature ability and hits harder than any other, in melee reach
## rather than the Exorcist's ranged Rite — the payoff for playing the
## squishiest character in the roster.

@export var basic_attack_damage: float = 8.0
@export var basic_attack_range: float = 46.0

@export var verse_damage: float = 42.0
@export var verse_magic_cost: float = 30.0
@export var verse_range: float = 70.0


func _init() -> void:
	character_id = CharacterId.PROPHET


func _create_stats() -> Stats:
	return Stats.new(85.0, 80.0, 200.0, 18.0, 3.0, 15.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_prophet()


func _attack() -> void:
	_strike_in_facing_cone(basic_attack_damage, basic_attack_range)
	_spawn_attack_slash(basic_attack_range * 0.6)
	print("Prophet: staff strike!")


func _use_magic() -> void:
	if not stats.try_spend_magic(verse_magic_cost):
		print("Prophet: not enough Magic for the Final Verse.")
		return

	var landed := _strike_in_facing_cone(verse_damage, verse_range)
	if landed:
		record_ability_used(verse_damage)

	_spawn_attack_slash(verse_range * 0.6)
	print("Prophet: Final Verse!")
