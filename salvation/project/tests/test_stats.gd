extends GutTest


func test_take_damage_mitigates_by_defense_floored_at_one() -> void:
	var stats := Stats.new(100.0, 0.0, 0.0, 0.0, 8.0)

	stats.take_damage(8.0)  # raw 8 - defense 8 = 0, floored to a minimum of 1

	assert_eq(stats.health, 99.0)


func test_take_damage_never_goes_below_zero() -> void:
	var stats := Stats.new(10.0, 0.0, 0.0, 0.0, 0.0)

	stats.take_damage(1000.0)

	assert_eq(stats.health, 0.0)
	assert_false(stats.is_alive())


func test_heal_clamps_to_max_health() -> void:
	var stats := Stats.new(50.0, 0.0, 0.0, 0.0, 0.0)
	stats.take_damage(10.0)

	stats.heal(1000.0)

	assert_eq(stats.health, 50.0)


func test_try_spend_magic_fails_and_leaves_magic_unchanged_when_insufficient() -> void:
	var stats := Stats.new(10.0, 20.0, 0.0, 0.0, 0.0)

	var spent := stats.try_spend_magic(25.0)

	assert_false(spent)
	assert_eq(stats.magic, 20.0)


func test_try_spend_magic_succeeds_and_deducts_when_sufficient() -> void:
	var stats := Stats.new(10.0, 20.0, 0.0, 0.0, 0.0)

	var spent := stats.try_spend_magic(15.0)

	assert_true(spent)
	assert_eq(stats.magic, 5.0)


func test_restore_magic_clamps_to_max_magic() -> void:
	var stats := Stats.new(10.0, 20.0, 0.0, 0.0, 0.0)
	stats.try_spend_magic(15.0)

	stats.restore_magic(1000.0)

	assert_eq(stats.magic, 20.0)
