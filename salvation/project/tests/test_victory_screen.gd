extends GutTest
## VictoryScreen's continuation routing: Enemy._defeat() sets static
## fields (next_boss_name, next_level_scene_path, upgrade_choices) before
## the scene change, and VictoryScreen decides at _ready() whether it's
## mid-run (offer the two upgrade choices, wait for a pick) or the final
## trial (grant the run-completion reward, skip the choice UI entirely,
## and dismiss on any action like before).

const VICTORY_SCREEN_SCENE: PackedScene = preload("res://scenes/ui/victory_screen.tscn")


func after_each() -> void:
	# Static fields persist across scene instances by design (that's how
	# Enemy._defeat() hands them to the next VictoryScreen at all) — but
	# that means tests have to reset them, or one test's state leaks into
	# the next.
	VictoryScreen.next_boss_name = ""
	VictoryScreen.next_level_scene_path = ""
	VictoryScreen.upgrade_choices = []
	RunProgress.clear_run_progress()


func test_mid_run_shows_the_next_boss_hint_and_is_not_final() -> void:
	VictoryScreen.next_boss_name = "Envy"
	VictoryScreen.next_level_scene_path = "res://scenes/levels/level2.tscn"

	var screen: VictoryScreen = VICTORY_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_false(screen._is_final_trial)
	assert_eq(screen._next_boss_label.text, "Envy stirs, somewhere ahead.")


func test_final_trial_is_detected_from_an_empty_next_level_path() -> void:
	VictoryScreen.next_boss_name = ""
	VictoryScreen.next_level_scene_path = ""

	var screen: VictoryScreen = VICTORY_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_true(screen._is_final_trial)
	# RunProgress.complete_run() always returns a non-empty description of
	# whatever it just granted — asserting the exact string would couple
	# this test to RunProgress's persisted unlock state across runs.
	assert_false(screen._next_boss_label.text.is_empty())
	assert_true(screen._time_label.text.begins_with("Completed in "), "Got: %s" % screen._time_label.text)


func test_mid_run_does_not_show_a_completion_time() -> void:
	VictoryScreen.next_boss_name = "Envy"
	VictoryScreen.next_level_scene_path = "res://scenes/levels/level2.tscn"

	var screen: VictoryScreen = VICTORY_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_eq(screen._time_label.text, "", "Only the final trial's victory reports a completion time.")


func test_mid_run_with_two_choices_shows_both_buttons_labeled() -> void:
	VictoryScreen.next_boss_name = "Envy"
	VictoryScreen.next_level_scene_path = "res://scenes/levels/level2.tscn"
	VictoryScreen.upgrade_choices = [PlayerController.BossUpgradeType.DAMAGE, PlayerController.BossUpgradeType.MOVE_SPEED]

	var screen: VictoryScreen = VICTORY_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_true(screen._awaiting_choice)
	assert_true(screen._choice_button_1.visible)
	assert_true(screen._choice_button_2.visible)
	assert_eq(screen._choice_button_1.text, PlayerController.describe_upgrade(PlayerController.BossUpgradeType.DAMAGE))
	assert_eq(screen._choice_button_2.text, PlayerController.describe_upgrade(PlayerController.BossUpgradeType.MOVE_SPEED))


func test_picking_a_choice_records_it_and_continues_to_the_next_level() -> void:
	RunProgress.clear_run_progress()
	VictoryScreen.next_boss_name = "Envy"
	VictoryScreen.next_level_scene_path = "res://scenes/levels/level2.tscn"
	VictoryScreen.upgrade_choices = [PlayerController.BossUpgradeType.CRIT_CHANCE, PlayerController.BossUpgradeType.NEW_MAGIC]

	var screen: VictoryScreen = VICTORY_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)
	screen._choice_button_1.pressed.emit()

	assert_false(screen._awaiting_choice, "Picking a choice should stop waiting for one.")
	assert_eq(RunProgress.upgrades(), [PlayerController.BossUpgradeType.CRIT_CHANCE])


func test_final_trial_never_offers_a_choice_even_if_some_were_set() -> void:
	VictoryScreen.next_boss_name = ""
	VictoryScreen.next_level_scene_path = ""
	# Defensive: Enemy._defeat() shouldn't set these on the final trial,
	# but the screen itself should refuse to show a choice UI regardless
	# if there's genuinely no next level to apply it to.
	VictoryScreen.upgrade_choices = [PlayerController.BossUpgradeType.DAMAGE, PlayerController.BossUpgradeType.MOVE_SPEED]

	var screen: VictoryScreen = VICTORY_SCREEN_SCENE.instantiate()
	add_child_autofree(screen)

	assert_false(screen._awaiting_choice)
	assert_false(screen._choice_button_1.visible)
	assert_false(screen._choice_button_2.visible)
