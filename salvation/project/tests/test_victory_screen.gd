extends GutTest
## VictoryScreen's continuation routing: Enemy._defeat() sets both static
## fields (next_boss_name, next_level_scene_path) before the scene change,
## and VictoryScreen decides at _ready() whether it's mid-run (route to the
## next level) or the final trial (grant the run-completion reward and
## route back to the title screen instead).

const VICTORY_SCREEN_SCENE: PackedScene = preload("res://scenes/ui/victory_screen.tscn")


func after_each() -> void:
	# Static fields persist across scene instances by design (that's how
	# Enemy._defeat() hands them to the next VictoryScreen at all) — but
	# that means tests have to reset them, or one test's state leaks into
	# the next.
	VictoryScreen.next_boss_name = ""
	VictoryScreen.next_level_scene_path = ""


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
