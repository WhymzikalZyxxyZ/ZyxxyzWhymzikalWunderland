class_name VictoryScreen
extends Control
## Shown when a boss falls. Alludes to whichever sin waits at the next
## trial rather than just saying "you win" — the run is one of ten,
## not one. Dismisses into whichever scene actually continues the run on
## any of the existing gameplay actions being pressed, same dismissal
## pattern as TutorialScreen/DeathScreen.

## Both set by Enemy._defeat() immediately before the scene change — the
## simplest way to hand two values forward without standing up a full
## autoload for it. Read once in _ready() and not touched again.
static var next_boss_name: String = ""
static var next_level_scene_path: String = ""

## Where "continue" goes once the final trial (next_level_scene_path
## empty) is cleared, after the run-completion reward is granted — the
## actual title screen (MainMenuScreen), not a level that doesn't exist.
@export var restart_scene_path: String = "res://scenes/ui/main_menu_screen.tscn"

var _prompt: Label
var _next_boss_label: Label
var _time_label: Label
var _pulse_time: float = 0.0
var _is_final_trial: bool = false


func _ready() -> void:
	_prompt = get_node_or_null("VBox/Prompt")
	_next_boss_label = get_node_or_null("VBox/NextBoss")
	_time_label = get_node_or_null("VBox/TimeLabel")

	_is_final_trial = next_level_scene_path == ""

	if _is_final_trial:
		# Read before complete_run() — it clears the run's elapsed timer
		# (among everything else about the resume point) as its first
		# step, so this has to happen first or there's nothing left to report.
		if _time_label != null:
			_time_label.text = "Completed in %s" % RunProgress.format_duration(RunProgress.run_elapsed_seconds())

		if _next_boss_label != null:
			# The last trial standing between the player and the run's
			# reward — RunProgress.complete_run() both grants it and
			# describes what it was, so there's nothing left to compute here.
			_next_boss_label.text = RunProgress.complete_run()
	elif _next_boss_label != null:
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
		get_tree().change_scene_to_file(restart_scene_path if _is_final_trial else next_level_scene_path)
