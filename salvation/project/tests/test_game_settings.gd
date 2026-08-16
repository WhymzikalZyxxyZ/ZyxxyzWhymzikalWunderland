extends GutTest
## GameSettings — a separate save file from RunProgress on purpose (user
## preferences, not game progress). Tests point throwaway instances at a
## temp path, same pattern RunProgress's tests already use, so the real
## settings file is never touched.

const GameSettingsScript := preload("res://scripts/core/game_settings.gd")

var _temp_path: String


func before_each() -> void:
	_temp_path = "user://test_game_settings_%d.cfg" % Time.get_ticks_usec()


func after_each() -> void:
	if FileAccess.file_exists(_temp_path):
		DirAccess.remove_absolute(_temp_path)


func _build() -> Node:
	var settings: Node = GameSettingsScript.new(_temp_path)
	add_child_autofree(settings)
	return settings


func test_defaults_are_full_volume_and_windowed() -> void:
	var settings := _build()

	assert_eq(settings.master_volume(), 1.0)
	assert_false(settings.is_fullscreen())


func test_set_master_volume_clamps_to_zero_and_one() -> void:
	var settings := _build()

	settings.set_master_volume(-0.5)
	assert_eq(settings.master_volume(), 0.0)

	settings.set_master_volume(1.5)
	assert_eq(settings.master_volume(), 1.0)

	settings.set_master_volume(0.4)
	assert_eq(settings.master_volume(), 0.4)


func test_set_fullscreen_toggles() -> void:
	var settings := _build()

	settings.set_fullscreen(true)
	assert_true(settings.is_fullscreen())

	settings.set_fullscreen(false)
	assert_false(settings.is_fullscreen())


func test_settings_persist_across_instances_pointed_at_the_same_path() -> void:
	var first: Node = GameSettingsScript.new(_temp_path)
	add_child_autofree(first)
	first.set_master_volume(0.3)
	first.set_fullscreen(true)

	var second: Node = GameSettingsScript.new(_temp_path)
	add_child_autofree(second)

	assert_eq(second.master_volume(), 0.3)
	assert_true(second.is_fullscreen())


func test_a_corrupted_save_file_is_treated_as_a_fresh_start() -> void:
	var file := FileAccess.open(_temp_path, FileAccess.WRITE)
	file.store_string("not a valid config file")
	file.close()

	var settings := _build()

	assert_eq(settings.master_volume(), 1.0)
	assert_false(settings.is_fullscreen())
