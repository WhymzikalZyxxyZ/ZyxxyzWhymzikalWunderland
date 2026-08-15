class_name DeathScreen
extends Control
## Shown when the player falls. "SAVED" rather than "DIED" — the run ends
## in the same breath as the game's own thesis: every fight is a question
## of redemption, and death is just Salvation closing the question for you.
## Restarts the run on any of the existing gameplay actions being pressed,
## same dismissal pattern as TutorialScreen.

@export var restart_scene_path: String = "res://scenes/ui/tutorial_screen.tscn"

var _prompt: Label
var _pulse_time: float = 0.0


func _ready() -> void:
	# A loss ends this run — nothing left for MainMenuScreen's Continue to
	# resume into, so the saved level/character resume point clears here,
	# same as complete_run() already does on the opposite (victory) ending.
	RunProgress.clear_run_progress()

	_prompt = get_node_or_null("VBox/Prompt")


func _process(delta: float) -> void:
	_pulse_time += delta
	if _prompt != null:
		var alpha: float = 0.55 + 0.45 * sin(_pulse_time * 3.0)
		var c := _prompt.modulate
		c.a = alpha
		_prompt.modulate = c

	if Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("magic") or Input.is_action_just_pressed("dash"):
		get_tree().change_scene_to_file(restart_scene_path)
