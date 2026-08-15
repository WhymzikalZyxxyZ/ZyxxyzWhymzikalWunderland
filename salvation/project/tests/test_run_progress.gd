extends GutTest
## RunProgress had no test coverage at all before this — it's an autoload
## singleton, so every instance normally shares the same real save file.
## Tests here construct their own instances against a temp save_path
## (the constructor parameter added alongside save/load) instead of ever
## touching the real RunProgress autoload or its actual save file.

const RunProgressScript := preload("res://scripts/core/run_progress.gd")

var _temp_path: String


func before_each() -> void:
	_temp_path = "user://test_run_progress_%d.cfg" % Time.get_ticks_usec()


func after_each() -> void:
	if FileAccess.file_exists(_temp_path):
		DirAccess.remove_absolute(_temp_path)


func _build() -> Node:
	var progress: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(progress)
	return progress


func test_paladin_starts_unlocked_and_nothing_else_does() -> void:
	var progress := _build()

	assert_true(progress.is_unlocked(CharacterId.PALADIN))
	assert_false(progress.is_unlocked(CharacterId.CLERIC))


func test_has_run_in_progress_is_false_for_a_fresh_save() -> void:
	var progress := _build()

	assert_false(progress.has_run_in_progress())


func test_save_run_progress_makes_has_run_in_progress_true() -> void:
	var progress := _build()

	progress.save_run_progress("res://scenes/levels/level3.tscn", CharacterId.MONK)

	assert_true(progress.has_run_in_progress())
	assert_eq(progress.current_level_path(), "res://scenes/levels/level3.tscn")
	assert_eq(progress.current_character_id(), CharacterId.MONK)


func test_clear_run_progress_resets_the_resume_point() -> void:
	var progress := _build()
	progress.save_run_progress("res://scenes/levels/level3.tscn", CharacterId.MONK)

	progress.clear_run_progress()

	assert_false(progress.has_run_in_progress())
	assert_eq(progress.current_level_path(), "")
	assert_eq(progress.current_character_id(), -1)


func test_complete_run_also_clears_the_resume_point() -> void:
	var progress := _build()
	progress.save_run_progress("res://scenes/levels/level10.tscn", CharacterId.PROPHET)

	progress.complete_run()

	assert_false(progress.has_run_in_progress(), "The run that just ended in victory shouldn't still be resumable.")


func test_complete_run_unlocks_the_next_character_in_sequence() -> void:
	var progress := _build()

	assert_false(progress.is_unlocked(CharacterId.CLERIC))
	progress.complete_run()
	assert_true(progress.is_unlocked(CharacterId.CLERIC))
	assert_false(progress.is_unlocked(CharacterId.MONK))


func test_run_progress_survives_across_instances_pointed_at_the_same_path() -> void:
	var first: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(first)
	first.save_run_progress("res://scenes/levels/level5.tscn", CharacterId.EXORCIST)
	first.complete_run()  # clears the resume point again — reload should reflect that, not the earlier save

	var second: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(second)

	assert_true(second.is_unlocked(CharacterId.CLERIC), "The unlock from complete_run() should have persisted.")
	assert_false(second.has_run_in_progress(), "complete_run()'s clear should have persisted too.")


func test_a_corrupted_save_file_is_treated_as_a_fresh_start() -> void:
	var file := FileAccess.open(_temp_path, FileAccess.WRITE)
	file.store_string("not a valid config file")
	file.close()

	var progress := _build()

	assert_true(progress.is_unlocked(CharacterId.PALADIN))
	assert_false(progress.has_run_in_progress())
