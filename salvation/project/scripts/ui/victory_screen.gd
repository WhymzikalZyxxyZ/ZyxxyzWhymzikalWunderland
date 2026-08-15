class_name VictoryScreen
extends Control
## Shown when a boss falls. Alludes to whichever sin waits at the next
## trial rather than just saying "you win" — the run is one of ten,
## not one.
##
## Mid-run (a next level actually exists), the player picks one of two
## upgrade choices instead of the screen just auto-dismissing — that
## choice is the only way through, replacing the old "press any action to
## continue" prompt for this case. The final trial has no next level for
## an upgrade to matter on, so it skips the choice entirely and keeps the
## original any-action dismissal.

## All set by Enemy._defeat() immediately before the scene change — the
## simplest way to hand values forward without standing up a full
## autoload for it. Read once in _ready() and not touched again.
static var next_boss_name: String = ""
static var next_level_scene_path: String = ""
## Two distinct PlayerController.BossUpgradeType values (as plain ints —
## static typed arrays don't survive reliably across a fresh class reload
## the way a plain Array does) offered to the player, or empty on the
## final trial, where there's nothing left to offer a choice for.
static var upgrade_choices: Array = []

## Where "continue" goes once the final trial (next_level_scene_path
## empty) is cleared, after the run-completion reward is granted — the
## actual title screen (MainMenuScreen), not a level that doesn't exist.
@export var restart_scene_path: String = "res://scenes/ui/main_menu_screen.tscn"

var _prompt: Label
var _next_boss_label: Label
var _time_label: Label
var _choices_label: Label
var _choice_button_1: Button
var _choice_button_2: Button
var _pulse_time: float = 0.0
var _is_final_trial: bool = false
var _awaiting_choice: bool = false


func _ready() -> void:
	_prompt = get_node_or_null("VBox/Prompt")
	_next_boss_label = get_node_or_null("VBox/NextBoss")
	_time_label = get_node_or_null("VBox/TimeLabel")
	_choices_label = get_node_or_null("VBox/ChoicesLabel")
	_choice_button_1 = get_node_or_null("VBox/ChoiceButton1")
	_choice_button_2 = get_node_or_null("VBox/ChoiceButton2")

	_is_final_trial = next_level_scene_path == ""
	_awaiting_choice = not _is_final_trial and upgrade_choices.size() >= 2

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

	if _awaiting_choice:
		if _choices_label != null:
			_choices_label.visible = true
		if _prompt != null:
			_prompt.visible = false
		if _choice_button_1 != null:
			_choice_button_1.visible = true
			_choice_button_1.text = PlayerController.describe_upgrade(upgrade_choices[0])
			_choice_button_1.pressed.connect(_on_choice_picked.bind(upgrade_choices[0]))
		if _choice_button_2 != null:
			_choice_button_2.visible = true
			_choice_button_2.text = PlayerController.describe_upgrade(upgrade_choices[1])
			_choice_button_2.pressed.connect(_on_choice_picked.bind(upgrade_choices[1]))
	else:
		if _choices_label != null:
			_choices_label.visible = false
		if _choice_button_1 != null:
			_choice_button_1.visible = false
		if _choice_button_2 != null:
			_choice_button_2.visible = false


func _on_choice_picked(type: int) -> void:
	if not _awaiting_choice:
		return
	_awaiting_choice = false
	# Doesn't touch any PlayerController directly — the character that
	# earned this is about to be freed along with this whole level anyway.
	# DungeonGenerator replays every recorded upgrade onto whichever fresh
	# character the next level spawns.
	RunProgress.add_upgrade(type)
	get_tree().change_scene_to_file(next_level_scene_path)


func _process(delta: float) -> void:
	_pulse_time += delta
	if _prompt != null and _prompt.visible:
		var alpha: float = 0.55 + 0.45 * sin(_pulse_time * 3.0)
		var c := _prompt.modulate
		c.a = alpha
		_prompt.modulate = c

	if _awaiting_choice:
		return

	if Input.is_action_just_pressed("attack") or Input.is_action_just_pressed("magic") or Input.is_action_just_pressed("dash"):
		get_tree().change_scene_to_file(restart_scene_path if _is_final_trial else next_level_scene_path)
