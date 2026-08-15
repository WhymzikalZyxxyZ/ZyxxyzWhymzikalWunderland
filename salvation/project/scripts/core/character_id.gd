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


## Which character the current run is actually playing as — set by
## CharacterSelectScreen, read by DungeonGenerator._spawn_player(). Same
## "static field hands a value forward without a full autoload" pattern
## VictoryScreen.next_boss_name already uses elsewhere. Defaults to
## Paladin so building a level directly (skipping character select, e.g.
## in tests) still spawns something valid.
static var chosen_character_id: int = PALADIN
