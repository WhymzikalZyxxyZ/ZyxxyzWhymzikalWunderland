extends Node
## Persisted user preferences — deliberately a separate save file from
## RunProgress. RunProgress is about what the player has *accomplished*
## (unlocks, stats, an in-progress run); this is about how they want the
## game *presented* (volume, window mode), and the two shouldn't share a
## reset/wipe path — Reset Progress on the main menu clears RunProgress,
## not this.
##
## Registered as an autoload singleton (see project.godot) so every scene
## can reach it as "GameSettings". save_path is a constructor parameter,
## same reason/pattern as RunProgress's: lets tests point a throwaway
## instance at a temp file instead of ever touching the real one.

const SAVE_PATH := "user://salvation_settings.cfg"

var _save_path: String
var _master_volume: float = 1.0
var _fullscreen: bool = false


func _init(save_path: String = SAVE_PATH) -> void:
	_save_path = save_path


func _ready() -> void:
	_load()
	_apply_master_volume()
	_apply_fullscreen()


func master_volume() -> float:
	return _master_volume


func set_master_volume(value: float) -> void:
	_master_volume = clampf(value, 0.0, 1.0)
	_apply_master_volume()
	_save()


func is_fullscreen() -> bool:
	return _fullscreen


func set_fullscreen(value: bool) -> void:
	_fullscreen = value
	_apply_fullscreen()
	_save()


## No-op in headless test/CI environments — AudioServer still exists but
## there's no actual audio driver to hear the difference, and the bus
## lookup below just quietly does nothing if "Master" isn't found.
func _apply_master_volume() -> void:
	var bus_index := AudioServer.get_bus_index("Master")
	if bus_index < 0:
		return
	AudioServer.set_bus_volume_db(bus_index, linear_to_db(maxf(_master_volume, 0.0001)))
	AudioServer.set_bus_mute(bus_index, _master_volume <= 0.0001)


## Also effectively a no-op headless (DisplayServer's stub in that mode
## has nothing to actually toggle), and on Web specifically only takes
## effect when called from within a real user input event (a button
## click satisfies that) — a browser restriction, not something this
## code can work around.
func _apply_fullscreen() -> void:
	DisplayServer.window_set_mode(
		DisplayServer.WINDOW_MODE_FULLSCREEN if _fullscreen else DisplayServer.WINDOW_MODE_WINDOWED
	)


func _save() -> void:
	var config := ConfigFile.new()
	config.set_value("settings", "master_volume", _master_volume)
	config.set_value("settings", "fullscreen", _fullscreen)
	config.save(_save_path)


func _load() -> void:
	var config := ConfigFile.new()
	if config.load(_save_path) != OK:
		return
	_master_volume = config.get_value("settings", "master_volume", 1.0)
	_fullscreen = config.get_value("settings", "fullscreen", false)
