class_name TutorialScreen
extends Control
## The controls legend shown before a run starts. Optional past the first
## time: MainMenuScreen's New Run only routes here at all if
## RunProgress.has_seen_tutorial() is still false, skipping straight to
## character select otherwise — this screen doesn't decide that itself,
## it just marks itself seen the instant it's dismissed, regardless of how
## it was reached, so it's never shown involuntarily again. A "How to
## Play" button on the main menu can still route here on purpose any time
## (see dismiss_scene_path below), independent of the seen flag.

## Where dismissing sends the player — character select when this is
## shown as part of actually starting a run (the normal case), or back to
## the main menu when it's reached via "How to Play" instead (reviewing
## controls shouldn't force a run to start). Static so MainMenuScreen can
## point it wherever's appropriate before the scene change, same pattern
## VictoryScreen.next_boss_name/CharacterId.chosen_character_id already
## use elsewhere to hand a value across a scene boundary.
static var dismiss_scene_path: String = "res://scenes/ui/character_select_screen.tscn"

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
		RunProgress.mark_tutorial_seen()
		get_tree().change_scene_to_file(dismiss_scene_path)
