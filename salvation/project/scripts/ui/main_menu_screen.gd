class_name MainMenuScreen
extends Control
## The actual entry point (see project.godot's run/main_scene) — replaces
## TutorialScreen in that role, which now only shows once a run actually
## starts. Continue only appears when RunProgress.has_run_in_progress() is
## true, and picks the run back up exactly where DungeonGenerator last
## saved it — see RunProgress.save_run_progress, called by every level the
## instant it starts. New Run skips the controls legend once
## RunProgress.has_seen_tutorial() is true (see TutorialScreen); How to
## Play always shows it, on purpose, and returns here rather than starting
## a run.

@export var character_select_scene_path: String = "res://scenes/ui/character_select_screen.tscn"
@export var tutorial_scene_path: String = "res://scenes/ui/tutorial_screen.tscn"

const CHARACTER_IDS := [CharacterId.PALADIN, CharacterId.CLERIC, CharacterId.MONK, CharacterId.EXORCIST, CharacterId.PROPHET]


func _ready() -> void:
	var continue_button := get_node_or_null("VBox/ContinueButton")
	var new_run_button := get_node_or_null("VBox/NewRunButton")
	var how_to_play_button := get_node_or_null("VBox/HowToPlayButton")
	var reset_button := get_node_or_null("VBox/ResetButton")
	var reset_dialog := get_node_or_null("ResetConfirmDialog")
	var settings_button := get_node_or_null("VBox/SettingsButton")
	var items_button := get_node_or_null("VBox/ItemsButton")
	var progress_label := get_node_or_null("VBox/ProgressLabel")
	var stats_label := get_node_or_null("VBox/StatsLabel")
	var completions_label := get_node_or_null("VBox/CompletionsLabel")

	if continue_button != null:
		if RunProgress.has_run_in_progress():
			continue_button.pressed.connect(_on_continue_pressed)
		else:
			continue_button.visible = false

	if new_run_button != null:
		new_run_button.pressed.connect(_on_new_run_pressed)

	if how_to_play_button != null:
		how_to_play_button.pressed.connect(_on_how_to_play_pressed)

	if reset_button != null and reset_dialog != null:
		reset_button.pressed.connect(reset_dialog.popup_centered)
		reset_dialog.confirmed.connect(_on_reset_confirmed)

	if settings_button != null:
		settings_button.pressed.connect(_on_settings_pressed)

	if items_button != null:
		items_button.pressed.connect(_on_items_pressed)

	if progress_label != null:
		progress_label.text = _progress_summary()

	if stats_label != null:
		stats_label.text = "%d deaths — %d victories" % [RunProgress.total_deaths(), RunProgress.total_victories()]

	if completions_label != null:
		completions_label.text = _completions_summary()


func _on_continue_pressed() -> void:
	CharacterId.chosen_character_id = RunProgress.current_character_id()
	get_tree().change_scene_to_file(RunProgress.current_level_path())


func _on_new_run_pressed() -> void:
	# Without this, a New Run started over an abandoned-but-never-cleared
	# save (the player left mid-run instead of dying or finishing) would
	# silently inherit that old run's boss_order and elapsed timer — both
	# only ever reset by clear_run_progress(), which nothing on this path
	# otherwise calls. save_run_progress() (fired by the next level) only
	# overwrites level_path/character_id, not those two.
	RunProgress.clear_run_progress()

	if RunProgress.has_seen_tutorial():
		get_tree().change_scene_to_file(character_select_scene_path)
		return

	TutorialScreen.dismiss_scene_path = character_select_scene_path
	get_tree().change_scene_to_file(tutorial_scene_path)


func _on_how_to_play_pressed() -> void:
	# Always shows the tutorial, seen before or not, and returns to the
	# main menu afterward instead of character select — reviewing controls
	# shouldn't be indistinguishable from starting a run.
	TutorialScreen.dismiss_scene_path = "res://scenes/ui/main_menu_screen.tscn"
	get_tree().change_scene_to_file(tutorial_scene_path)


func _on_settings_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/settings_screen.tscn")


func _on_items_pressed() -> void:
	get_tree().change_scene_to_file("res://scenes/ui/items_screen.tscn")


func _on_reset_confirmed() -> void:
	RunProgress.reset_all()

	# reload_current_scene() errors outright if current_scene is unset —
	# always true in real play (this screen IS the current scene by the
	# time a player can click anything on it) but not guaranteed in a test
	# harness that instantiates this screen directly rather than through a
	# real scene change. Falling back to loading this same scene by path
	# gets the identical fresh-menu result either way.
	if get_tree().current_scene != null:
		get_tree().reload_current_scene()
	else:
		get_tree().change_scene_to_file(scene_file_path)


func _progress_summary() -> String:
	var unlocked_count := 0
	for id in CHARACTER_IDS:
		if RunProgress.is_unlocked(id):
			unlocked_count += 1

	var relic_count := RunProgress.unlocked_relics().size()
	if relic_count == 0:
		return "%d of 5 faithful answered." % unlocked_count

	var bonus_percent := roundi(relic_count * PlayerController.RELIC_DAMAGE_BONUS * 100)
	return "%d of 5 faithful answered. %d relic(s) earned (+%d%% Damage, every run)." % [unlocked_count, relic_count, bonus_percent]


func _completions_summary() -> String:
	var parts: Array[String] = []
	for id in CHARACTER_IDS:
		var count := RunProgress.victories_for_character(id)
		if count > 0:
			parts.append("%s x%d" % [CharacterId.name_of(id), count])

	if parts.is_empty():
		return ""
	return "Completed a run as: %s" % ", ".join(parts)
