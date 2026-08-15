extends GutTest
## TutorialScreen dismisses to whatever dismiss_scene_path currently points
## at (MainMenuScreen sets it before the scene change — New Run points it
## at character select, How to Play points it at the main menu itself) and
## marks the tutorial seen on the real RunProgress autoload the instant
## it's dismissed, regardless of which way it was reached.

const TUTORIAL_SCENE: PackedScene = preload("res://scenes/ui/tutorial_screen.tscn")


func after_each() -> void:
	Input.action_release("attack")
	TutorialScreen.dismiss_scene_path = "res://scenes/ui/character_select_screen.tscn"
	RunProgress.clear_run_progress()


func test_dismissing_marks_the_tutorial_seen() -> void:
	RunProgress.reset_all()
	assert_false(RunProgress.has_seen_tutorial())

	var screen: TutorialScreen = TUTORIAL_SCENE.instantiate()
	add_child_autofree(screen)

	Input.action_press("attack")
	screen._process(0.016)

	assert_true(RunProgress.has_seen_tutorial())

	# Leave the real save clean for any test/session after this one.
	RunProgress.reset_all()


func test_dismissing_routes_to_whatever_dismiss_scene_path_was_set_to() -> void:
	TutorialScreen.dismiss_scene_path = "res://scenes/ui/main_menu_screen.tscn"

	var screen: TutorialScreen = TUTORIAL_SCENE.instantiate()
	add_child_autofree(screen)

	Input.action_press("attack")
	screen._process(0.016)
	await wait_process_frames(1)

	assert_eq(get_tree().current_scene.scene_file_path, "res://scenes/ui/main_menu_screen.tscn")
