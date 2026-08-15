class_name Stats
extends RefCounted
## The full stat block from the design doc: Health, Magic, Speed, Power,
## Defense, Faith, Luck, Critical Chance, Critical Damage. Current values
## are mutable at runtime (damage, healing, buffs); max_* fields represent
## the character's baseline before relics/blessings are applied.

var max_health: float
var health: float

var max_magic: float
var magic: float

var speed: float
var power: float
var defense: float

## Rises when enemies are redeemed rather than smitten. Gates Faith-locked
## relic effects and shifts cutscene tone at run's end.
var faith: float

## Improves item rarity odds on room clear.
var luck: float

var critical_chance: float
var critical_damage: float


func _init(
	p_max_health: float, p_max_magic: float, p_speed: float, p_power: float, p_defense: float,
	p_faith: float = 0.0, p_luck: float = 0.0, p_critical_chance: float = 0.0, p_critical_damage: float = 1.5
) -> void:
	max_health = p_max_health
	health = p_max_health
	max_magic = p_max_magic
	magic = p_max_magic
	speed = p_speed
	power = p_power
	defense = p_defense
	faith = p_faith
	luck = p_luck
	critical_chance = p_critical_chance
	critical_damage = p_critical_damage


func is_alive() -> bool:
	return health > 0.0


## Applies Defense as flat damage reduction, floored at 1 so Defense can never fully negate an attack.
func take_damage(raw_amount: float) -> void:
	var mitigated: float = max(raw_amount - defense, 1.0)
	health = max(health - mitigated, 0.0)


func heal(amount: float) -> void:
	health = min(health + amount, max_health)


func try_spend_magic(amount: float) -> bool:
	if magic < amount:
		return false
	magic -= amount
	return true


func restore_magic(amount: float) -> void:
	magic = min(magic + amount, max_magic)
