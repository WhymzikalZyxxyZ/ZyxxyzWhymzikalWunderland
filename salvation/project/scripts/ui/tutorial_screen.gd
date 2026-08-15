class_name TutorialScreen
extends Control
## The controls legend shown before a run starts. Dismisses into character
## select (not straight into the dungeon) on any of the existing gameplay
## actions being pressed — the run needs a character chosen before
## DungeonGenerator can spawn one.

@export var next_scene_path: String = "res://scenes/ui/character_select_screen.tscn"

var _prompt: Label
var _pulse_time: float = 0.0


func _ready() -> void:
	_prompt = get_node_or_null("VBox/Prompt")


func _process(delta: float) -> void:
	_pulse_time += delta
	if _prompt != null:
		var alpha: float = 0.55 + 0.45 * sin(_pulse_time * 3.0)
		var c := _prompt.modulate
		c.a = alpha
		_prompt.modulate = c

	if Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("magic") or Input.is_action_just_pressed("dash"):
		get_tree().change_scene_to_file(next_scene_path)
