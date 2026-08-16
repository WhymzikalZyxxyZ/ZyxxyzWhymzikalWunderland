class_name SettingsScreen
extends Control
## Reachable from the main menu, returns to it on Back. Deliberately
## small: Master Volume and Fullscreen are the only two settings that
## actually control something real right now (see GameSettings) — no
## placeholder options for systems (SFX mixing, key rebinding) that don't
## exist yet.

@export var back_scene_path: String = "res://scenes/ui/main_menu_screen.tscn"

var _volume_slider: HSlider
var _fullscreen_checkbox: CheckBox
var _back_button: Button


func _ready() -> void:
	_volume_slider = get_node_or_null("VBox/VolumeSlider")
	_fullscreen_checkbox = get_node_or_null("VBox/FullscreenCheckbox")
	_back_button = get_node_or_null("VBox/BackButton")

	if _volume_slider != null:
		_volume_slider.value = GameSettings.master_volume() * 100.0
		_volume_slider.value_changed.connect(_on_volume_changed)

	if _fullscreen_checkbox != null:
		_fullscreen_checkbox.button_pressed = GameSettings.is_fullscreen()
		_fullscreen_checkbox.toggled.connect(_on_fullscreen_toggled)

	if _back_button != null:
		_back_button.pressed.connect(_on_back_pressed)


func _on_volume_changed(value: float) -> void:
	GameSettings.set_master_volume(value / 100.0)


func _on_fullscreen_toggled(pressed: bool) -> void:
	GameSettings.set_fullscreen(pressed)


func _on_back_pressed() -> void:
	get_tree().change_scene_to_file(back_scene_path)
