class_name CharacterRoster
extends RefCounted
## Maps each CharacterId to its playable scene and a one-line blurb — the
## single source of truth CharacterSelectScreen and DungeonGenerator both
## read from, so adding a sixth character later is one dictionary entry
## in each map here, not a scattered set of if/else chains.

const SCENE_PATHS := {
	CharacterId.PALADIN: "res://scenes/player/paladin.tscn",
	CharacterId.CLERIC: "res://scenes/player/cleric.tscn",
	CharacterId.MONK: "res://scenes/player/monk.tscn",
	CharacterId.EXORCIST: "res://scenes/player/exorcist.tscn",
	CharacterId.PROPHET: "res://scenes/player/prophet.tscn",
}

const BLURBS := {
	CharacterId.PALADIN: "Highest Defense of the five. A free sword strike, and Divine Smite when it isn't enough.",
	CharacterId.CLERIC: "Least armored of the five. Sacred Mend heals instead of striking — the only self-sustain in the roster.",
	CharacterId.MONK: "Fastest and frailest. Flurry Strike is cheap enough to throw out often rather than save.",
	CharacterId.EXORCIST: "The only ranged fighter. Banishing Rite fires a bolt instead of swinging.",
	CharacterId.PROPHET: "Glassiest of the five, and the hardest-hitting. The Final Verse costs the most Magic of any signature ability.",
}


static func scene_for(id: int) -> PackedScene:
	var path: String = SCENE_PATHS.get(id, SCENE_PATHS[CharacterId.PALADIN])
	return load(path)


static func blurb_for(id: int) -> String:
	return BLURBS.get(id, "")
