extends Node
## Meta-progression persisted across runs: which characters and relics have
## been earned. Registered as an autoload singleton (see project.godot) so
## every scene can reach it as "RunProgress". A cleared run is never a dead
## end — complete_run always grants exactly one new unlock, so the game is
## provably finishable end to end: Paladin -> ... -> Prophet -> every relic.

const SAVE_PATH := "user://salvation_progress.cfg"

var _unlocked_characters: Dictionary = {CharacterId.PALADIN: true}
var _unlocked_relics: Array[String] = []


func _ready() -> void:
	_load()


func is_unlocked(id: int) -> bool:
	return _unlocked_characters.has(id)


func unlocked_relics() -> Array[String]:
	return _unlocked_relics


## Called when a run ends in victory (the current final boss of whatever
## content is unlocked is defeated). Grants the next locked character in
## sequence, or — once all five are unlocked — a relic-tier reward instead,
## so there is always a next thing to play for.
func complete_run() -> String:
	for candidate in [CharacterId.PALADIN, CharacterId.CLERIC, CharacterId.MONK, CharacterId.EXORCIST, CharacterId.PROPHET]:
		if not _unlocked_characters.has(candidate):
			_unlocked_characters[candidate] = true
			_save()
			return "%s has answered the call." % CharacterId.name_of(candidate)

	var relic_name := "Relic of the %d Trial" % (_unlocked_relics.size() + 1)
	_unlocked_relics.append(relic_name)
	_save()
	return "%s is yours." % relic_name


func _save() -> void:
	var config := ConfigFile.new()
	config.set_value("progress", "characters", _unlocked_characters.keys())
	config.set_value("progress", "relics", _unlocked_relics)
	config.save(SAVE_PATH)


func _load() -> void:
	var config := ConfigFile.new()
	if config.load(SAVE_PATH) != OK:
		return

	var characters = config.get_value("progress", "characters", [])
	for id in characters:
		_unlocked_characters[id] = true

	var relics = config.get_value("progress", "relics", [])
	for relic in relics:
		_unlocked_relics.append(relic)
