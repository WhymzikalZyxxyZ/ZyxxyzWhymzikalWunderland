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


func test_total_deaths_and_victories_start_at_zero() -> void:
	var progress := _build()

	assert_eq(progress.total_deaths(), 0)
	assert_eq(progress.total_victories(), 0)


func test_record_death_increments_the_lifetime_total_but_not_victories() -> void:
	var progress := _build()

	progress.record_death()
	progress.record_death()

	assert_eq(progress.total_deaths(), 2)
	assert_eq(progress.total_victories(), 0)


func test_complete_run_increments_total_victories_but_not_deaths() -> void:
	var progress := _build()

	progress.complete_run()

	assert_eq(progress.total_victories(), 1)
	assert_eq(progress.total_deaths(), 0)


func test_clearing_run_progress_does_not_affect_lifetime_totals() -> void:
	var progress := _build()
	progress.record_death()
	progress.save_run_progress("res://scenes/levels/level2.tscn", CharacterId.CLERIC)

	progress.clear_run_progress()

	assert_eq(progress.total_deaths(), 1, "The per-run resume point and lifetime totals are separate; clearing one shouldn't touch the other.")


func test_lifetime_totals_survive_across_instances_pointed_at_the_same_path() -> void:
	var first: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(first)
	first.record_death()
	first.complete_run()

	var second: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(second)

	assert_eq(second.total_deaths(), 1)
	assert_eq(second.total_victories(), 1)


func test_boss_order_starts_empty() -> void:
	var progress := _build()

	assert_true(progress.boss_order().is_empty())


func test_ensure_boss_order_generates_a_full_permutation_once() -> void:
	var progress := _build()
	var rng := RandomNumberGenerator.new()
	rng.seed = 42

	progress.ensure_boss_order(rng)

	assert_eq(progress.boss_order().size(), 9)


func test_ensure_boss_order_is_a_noop_once_a_run_already_has_one() -> void:
	var progress := _build()
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	progress.ensure_boss_order(rng)
	var first_order: Array = progress.boss_order().duplicate()

	# A different seed shouldn't matter — a run's order is locked in the
	# instant it's first generated, exactly what makes Continue resume
	# into the same order the run started with.
	var different_rng := RandomNumberGenerator.new()
	different_rng.seed = 999
	progress.ensure_boss_order(different_rng)

	assert_eq(progress.boss_order(), first_order)


func test_clear_run_progress_resets_the_boss_order_too() -> void:
	var progress := _build()
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	progress.ensure_boss_order(rng)

	progress.clear_run_progress()

	assert_true(progress.boss_order().is_empty(), "A new run should get a fresh shuffle, not the previous run's order.")


func test_boss_order_survives_across_instances_pointed_at_the_same_path() -> void:
	var first: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(first)
	var rng := RandomNumberGenerator.new()
	rng.seed = 42
	first.ensure_boss_order(rng)
	var saved_order = first.boss_order().duplicate()

	var second: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(second)

	assert_eq(second.boss_order(), saved_order)


func test_run_elapsed_seconds_is_zero_before_a_run_starts() -> void:
	var progress := _build()

	assert_eq(progress.run_elapsed_seconds(), 0.0)


func test_save_run_progress_starts_the_timer_ticking() -> void:
	var progress := _build()

	progress.save_run_progress("res://scenes/levels/level1.tscn", CharacterId.PALADIN)
	await wait_seconds(1.1)

	assert_gt(progress.run_elapsed_seconds(), 0.9, "At least ~1 second should have elapsed since the timer started.")


func test_a_second_level_start_does_not_restart_the_timer() -> void:
	var progress := _build()
	progress.save_run_progress("res://scenes/levels/level1.tscn", CharacterId.PALADIN)
	await wait_seconds(1.1)

	progress.save_run_progress("res://scenes/levels/level2.tscn", CharacterId.PALADIN)

	assert_gt(progress.run_elapsed_seconds(), 0.9, "Starting the next level shouldn't reset how long the run has taken so far.")


func test_clear_run_progress_resets_the_timer_to_zero() -> void:
	var progress := _build()
	progress.save_run_progress("res://scenes/levels/level1.tscn", CharacterId.PALADIN)
	await wait_seconds(1.1)

	progress.clear_run_progress()

	assert_eq(progress.run_elapsed_seconds(), 0.0)


func test_elapsed_time_survives_across_instances_pointed_at_the_same_path() -> void:
	var first: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(first)
	first.save_run_progress("res://scenes/levels/level1.tscn", CharacterId.PALADIN)
	await wait_seconds(1.1)
	# _save() only banks the session's elapsed time into the persisted
	# total at the moment it actually runs — level2 starting is what
	# triggers that here, same as it would for real mid-run.
	first.save_run_progress("res://scenes/levels/level2.tscn", CharacterId.PALADIN)

	var second: Node = RunProgressScript.new(_temp_path)
	add_child_autofree(second)

	assert_gt(second.run_elapsed_seconds(), 0.9)


func test_format_duration_pads_seconds_and_omits_hours_under_an_hour() -> void:
	assert_eq(RunProgress.format_duration(7.0), "0:07")
	assert_eq(RunProgress.format_duration(187.0), "3:07")


func test_format_duration_includes_hours_once_past_one() -> void:
	assert_eq(RunProgress.format_duration(3725.0), "1:02:05")


func test_a_corrupted_save_file_is_treated_as_a_fresh_start() -> void:
	var file := FileAccess.open(_temp_path, FileAccess.WRITE)
	file.store_string("not a valid config file")
	file.close()

	var progress := _build()

	assert_true(progress.is_unlocked(CharacterId.PALADIN))
	assert_false(progress.has_run_in_progress())
