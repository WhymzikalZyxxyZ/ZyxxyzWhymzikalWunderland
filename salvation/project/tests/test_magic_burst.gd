extends GutTest
## MagicBurst: expands from start_scale to end_scale and fades to
## transparent over duration, then frees itself — the shared visual for
## Magic abilities that don't read as a weapon swing (see PlayerController._spawn_magic_burst).


func test_starts_at_start_scale_and_full_alpha() -> void:
	var burst := MagicBurst.new()
	burst.start_scale = 0.4
	burst.modulate = Color(1, 1, 1, 0.9)
	add_child_autofree(burst)

	assert_eq(burst.scale, Vector2.ONE * 0.4)
	assert_almost_eq(burst.modulate.a, 0.9, 0.001)


func test_expands_and_fades_partway_through_its_duration() -> void:
	var burst := MagicBurst.new()
	burst.duration = 1.0
	burst.start_scale = 0.5
	burst.end_scale = 1.5
	burst.modulate = Color(1, 1, 1, 1.0)
	add_child_autofree(burst)

	burst._process(0.5)  # halfway through

	assert_almost_eq(burst.scale.x, 1.0, 0.01, "Halfway through, scale should be halfway between start and end.")
	assert_almost_eq(burst.modulate.a, 0.5, 0.01, "Halfway through, alpha should be halfway faded.")


func test_frees_itself_once_duration_elapses() -> void:
	var burst := MagicBurst.new()
	burst.duration = 0.2
	add_child_autofree(burst)

	burst._process(0.25)

	assert_true(burst.is_queued_for_deletion())
