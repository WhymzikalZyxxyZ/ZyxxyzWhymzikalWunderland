class_name ItemRoster
extends RefCounted
## The fixed pool of mid-run stat items — distinct from relics (permanent,
## % based, meta-progression, see PlayerController.RELIC_DAMAGE_BONUS) and
## boss upgrades (per-run, chosen at a boss's defeat, see
## PlayerController.BossUpgradeType): items are flat stat bumps found by
## breaking Rocks (see Rock._break's ITEM_DROP_CHANCE) mid-level, applied
## the instant they're picked up, and can be picked up more than once —
## repeats stack, same as boss upgrades do.
##
## Static enum+describe+apply shape mirrors PlayerController.BossUpgradeType/
## describe_upgrade/apply_boss_upgrade deliberately, for the same reason:
## VictoryScreen needed a pure label lookup that doesn't require a live
## character instance, and StatItemPickup needs the same for items.

enum ItemType { VITALITY, FOCUS, MIGHT, WARD, HASTE, FORTUNE }

const VITALITY_HEALTH_AMOUNT := 20.0
const FOCUS_MAGIC_AMOUNT := 15.0
const MIGHT_POWER_AMOUNT := 3.0
const WARD_DEFENSE_AMOUNT := 2.0
const HASTE_SPEED_AMOUNT := 15.0
const FORTUNE_LUCK_AMOUNT := 2.0

const NAMES := {
	ItemType.VITALITY: "Vitality Charm",
	ItemType.FOCUS: "Focus Stone",
	ItemType.MIGHT: "Iron Bracer",
	ItemType.WARD: "Aegis Shard",
	ItemType.HASTE: "Swift Boots",
	ItemType.FORTUNE: "Fortune's Coin",
}

## Tints EnvironmentArt.build_item_gem() per type — StatItemPickup reads
## this rather than baking six separate gem textures (see build_item_gem's
## own docstring for why).
const TINT_COLORS := {
	ItemType.VITALITY: Color(0.85, 0.2, 0.28),
	ItemType.FOCUS: Color(0.4, 0.3, 0.85),
	ItemType.MIGHT: Color(0.85, 0.55, 0.15),
	ItemType.WARD: Color(0.3, 0.65, 0.8),
	ItemType.HASTE: Color(0.3, 0.85, 0.4),
	ItemType.FORTUNE: Color(0.95, 0.82, 0.2),
}


## Fixed-magnitude label for a given item type (e.g. "+20 Max Health") —
## static and pure, same reasoning as BossUpgradeType.describe_upgrade: a
## screen needs to show what an item does before/without touching any
## character instance.
static func describe_item(type: ItemType) -> String:
	match type:
		ItemType.VITALITY:
			return "+%d Max Health" % roundi(VITALITY_HEALTH_AMOUNT)
		ItemType.FOCUS:
			return "+%d Max Magic" % roundi(FOCUS_MAGIC_AMOUNT)
		ItemType.MIGHT:
			return "+%d Power" % roundi(MIGHT_POWER_AMOUNT)
		ItemType.WARD:
			return "+%d Defense" % roundi(WARD_DEFENSE_AMOUNT)
		ItemType.HASTE:
			return "+%d Speed" % roundi(HASTE_SPEED_AMOUNT)
		ItemType.FORTUNE:
			return "+%d Luck" % roundi(FORTUNE_LUCK_AMOUNT)

	return ""


static func name_of(type: ItemType) -> String:
	return NAMES.get(type, "Unknown Item")


## Applies one item's flat bump directly to a Stats instance — same
## direct-field-mutation convention PlayerController.apply_boss_upgrade
## already uses, rather than adding dedicated Stats mutator methods for
## each field. Max-stat items raise the current value too (not just the
## cap), matching how a fresh character's stats.gd _init already sets
## health/magic to their max, not to zero.
static func apply_item(stats: Stats, type: ItemType) -> void:
	match type:
		ItemType.VITALITY:
			stats.max_health += VITALITY_HEALTH_AMOUNT
			stats.health += VITALITY_HEALTH_AMOUNT
		ItemType.FOCUS:
			stats.max_magic += FOCUS_MAGIC_AMOUNT
			stats.magic += FOCUS_MAGIC_AMOUNT
		ItemType.MIGHT:
			stats.power += MIGHT_POWER_AMOUNT
		ItemType.WARD:
			stats.defense += WARD_DEFENSE_AMOUNT
		ItemType.HASTE:
			stats.speed += HASTE_SPEED_AMOUNT
		ItemType.FORTUNE:
			stats.luck += FORTUNE_LUCK_AMOUNT


static func random_item_type() -> ItemType:
	var values: Array[ItemType] = []
	values.assign(ItemType.values())
	return values[randi() % values.size()]
