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
