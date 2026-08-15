class_name VictoryScreen
extends Control
## Shown when a boss falls. Alludes to whichever sin waits at the next
## trial rather than just saying "you win" — the run is one of ten,
## not one. Restarts on any of the existing gameplay actions being
## pressed, same dismissal pattern as TutorialScreen/DeathScreen.

## Set by Enemy._defeat() immediately before the scene change — the
## simplest way to hand one string forward without standing up a full
## autoload for it. Read once in _ready() and not touched again.
static var next_boss_name: String = ""

@export var restart_scene_path: String = "res://scenes/ui/tutorial_screen.tscn"

var _prompt: Label
var _next_boss_label: Label
var _pulse_time: float = 0.0


func _ready() -> void:
	_prompt = get_node_or_null("VBox/Prompt")
	_next_boss_label = get_node_or_null("VBox/NextBoss")

	if _next_boss_label != null:
		_next_boss_label.text = (
			"%s stirs, somewhere ahead." % next_boss_name if next_boss_name != ""
			else "Another trial waits ahead."
		)


func _process(delta: float) -> void:
	_pulse_time += delta
	if _prompt != null:
		var alpha: float = 0.55 + 0.45 * sin(_pulse_time * 3.0)
		var c := _prompt.modulate
		c.a = alpha
		_prompt.modulate = c

	if Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("magic") or Input.is_action_just_pressed("dash"):
		get_tree().change_scene_to_file(restart_scene_path)
