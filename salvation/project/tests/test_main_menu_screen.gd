extends GutTest
## MainMenuScreen touches the real RunProgress autoload (it's the entry
## point, no throwaway-instance pattern makes sense here) — every test
## resets it in after_each so state doesn't leak between tests or pollute
## whatever the dev environment's real save file already had.

const MAIN_MENU_SCENE: PackedScene = preload("res://scenes/ui/main_menu_screen.tscn")


func after_each() -> void:
	RunProgress.clear_run_progress()


func test_continue_hidden_with_no_saved_run() -> void:
	RunProgress.clear_run_progress()

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)

	var continue_button := menu.get_node("VBox/ContinueButton")
	assert_false(continue_button.visible)


func test_continue_visible_once_a_level_has_saved_progress() -> void:
	RunProgress.save_run_progress("res://scenes/levels/level3.tscn", CharacterId.MONK)

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)

	var continue_button := menu.get_node("VBox/ContinueButton")
	assert_true(continue_button.visible)


func test_new_run_clears_a_stale_saved_run_before_leaving_the_menu() -> void:
	# Regression test: New Run over an abandoned (never death/victory-
	# cleared) save used to silently inherit that old run's boss_order and
	# elapsed timer, since only clear_run_progress() ever resets either
	# and nothing on the New Run path called it.
	var rng := RandomNumberGenerator.new()
	rng.seed = 1
	RunProgress.save_run_progress("res://scenes/levels/level5.tscn", CharacterId.EXORCIST)
	RunProgress.ensure_boss_order(rng)
	assert_false(RunProgress.boss_order().is_empty(), "Sanity check: the stale run actually has a boss order to leak.")

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)
	var new_run_button := menu.get_node("VBox/NewRunButton")
	new_run_button.pressed.emit()

	assert_true(RunProgress.boss_order().is_empty(), "New Run should leave nothing for the next level to inherit.")
	assert_false(RunProgress.has_run_in_progress())
	assert_eq(RunProgress.run_elapsed_seconds(), 0.0)


func test_new_run_goes_straight_to_character_select_once_tutorial_is_seen() -> void:
	RunProgress.mark_tutorial_seen()

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)
	menu.get_node("VBox/NewRunButton").pressed.emit()
	await wait_process_frames(1)

	assert_eq(get_tree().current_scene.scene_file_path, "res://scenes/ui/character_select_screen.tscn")


func test_how_to_play_always_shows_the_tutorial_and_returns_to_the_menu() -> void:
	RunProgress.mark_tutorial_seen()  # even though it's already been seen

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)
	menu.get_node("VBox/HowToPlayButton").pressed.emit()

	assert_eq(TutorialScreen.dismiss_scene_path, "res://scenes/ui/main_menu_screen.tscn")


func test_reset_confirmed_wipes_progress_and_reloads() -> void:
	RunProgress.save_run_progress("res://scenes/levels/level2.tscn", CharacterId.MONK)
	RunProgress.record_death()

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)
	menu.get_node("ResetConfirmDialog").confirmed.emit()

	assert_eq(RunProgress.total_deaths(), 0)
	assert_false(RunProgress.has_run_in_progress())


func test_completions_summary_lists_only_characters_with_a_finished_run() -> void:
	RunProgress.reset_all()
	RunProgress.save_run_progress("res://scenes/levels/level10.tscn", CharacterId.CLERIC)
	RunProgress.complete_run()

	var menu := MAIN_MENU_SCENE.instantiate()
	add_child_autofree(menu)

	var completions_label := menu.get_node("VBox/CompletionsLabel")
	assert_true(completions_label.text.contains("Cleric"), "Got: %s" % completions_label.text)
	assert_false(completions_label.text.contains("Paladin"), "Paladin hasn't completed a run — shouldn't be listed.")

	RunProgress.reset_all()
