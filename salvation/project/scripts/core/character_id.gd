class_name CharacterId
extends RefCounted
## The five faithful. Order matches the Grace-gated unlock sequence:
## Paladin starts unlocked; each later id unlocks from a completed run's reward.

enum { PALADIN, CLERIC, MONK, EXORCIST, PROPHET }

const NAMES := {
	PALADIN: "Paladin",
	CLERIC: "Cleric",
	MONK: "Monk",
	EXORCIST: "Exorcist",
	PROPHET: "Prophet",
}


static func name_of(id: int) -> String:
	return NAMES.get(id, "Unknown")
