extends GutTest
## SettingsScreen touches the real GameSettings autoload (it's a direct
## settings editor, no throwaway-instance pattern makes sense here) —
## every test restores GameSettings to its defaults in after_each.

const SETTINGS_SCREEN_SCENE: PackedScene = preload("res://scenes/ui/settings_screen.tscn")


func after_each() -> void:
	GameSettings.set_master_volume(1.0)
	GameSettings.set_fullscreen(false)


func test_volume_slider_starts_at_the_current_setting() -> void:
	GameSettings.set_master_volume(0.5)

	var screen: SettingsScreen = SETTINGS_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_eq(screen._volume_slider.value, 50.0)


func test_fullscreen_checkbox_starts_at_the_current_setting() -> void:
	GameSettings.set_fullscreen(true)

	var screen: SettingsScreen = SETTINGS_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_true(screen._fullscreen_checkbox.button_pressed)


func test_moving_the_slider_updates_game_settings() -> void:
	var screen: SettingsScreen = SETTINGS_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	screen._volume_slider.value = 25.0

	assert_almost_eq(GameSettings.master_volume(), 0.25, 0.001)


func test_toggling_the_checkbox_updates_game_settings() -> void:
	var screen: SettingsScreen = SETTINGS_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	screen._fullscreen_checkbox.button_pressed = true
	screen._fullscreen_checkbox.toggled.emit(true)

	assert_true(GameSettings.is_fullscreen())
