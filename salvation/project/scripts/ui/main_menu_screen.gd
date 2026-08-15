class_name MainMenuScreen
extends Control
## The actual entry point (see project.godot's run/main_scene) — replaces
## TutorialScreen in that role, which now only shows once a run actually
## starts. Continue only appears when RunProgress.has_run_in_progress() is
## true, and picks the run back up exactly where DungeonGenerator last
## saved it — see RunProgress.save_run_progress, called by every level the
## instant it starts. New Run always goes through the controls legend and
## character select, same as the very first run ever did.

@export var new_run_scene_path: String = "res://scenes/ui/tutorial_screen.tscn"


func _ready() -> void:
	var continue_button := get_node_or_null("VBox/ContinueButton")
	var new_run_button := get_node_or_null("VBox/NewRunButton")
	var progress_label := get_node_or_null("VBox/ProgressLabel")
	var stats_label := get_node_or_null("VBox/StatsLabel")

	if continue_button != null:
		if RunProgress.has_run_in_progress():
			continue_button.pressed.connect(_on_continue_pressed)
		else:
			continue_button.visible = false

	if new_run_button != null:
		new_run_button.pressed.connect(_on_new_run_pressed)

	if progress_label != null:
		progress_label.text = _progress_summary()

	if stats_label != null:
		stats_label.text = "%d deaths — %d victories" % [RunProgress.total_deaths(), RunProgress.total_victories()]


func _on_continue_pressed() -> void:
	CharacterId.chosen_character_id = RunProgress.current_character_id()
	get_tree().change_scene_to_file(RunProgress.current_level_path())


func _on_new_run_pressed() -> void:
	get_tree().change_scene_to_file(new_run_scene_path)


func _progress_summary() -> String:
	var unlocked_count := 0
	for id in [CharacterId.PALADIN, CharacterId.CLERIC, CharacterId.MONK, CharacterId.EXORCIST, CharacterId.PROPHET]:
		if RunProgress.is_unlocked(id):
			unlocked_count += 1

	var relic_count := RunProgress.unlocked_relics().size()
	if relic_count == 0:
		return "%d of 5 faithful answered." % unlocked_count
	return "%d of 5 faithful answered. %d relic(s) earned." % [unlocked_count, relic_count]
