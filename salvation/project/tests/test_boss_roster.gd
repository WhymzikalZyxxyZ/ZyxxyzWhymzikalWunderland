extends GutTest
## BossRoster is what makes the run's boss order vary — shuffled_order()
## produces this run's Trials I-IX ordering, boss_at() resolves what any
## given level actually gets from it.


func test_shuffled_order_is_a_permutation_of_all_nine_bosses() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 1

	var order := BossRoster.shuffled_order(rng)

	assert_eq(order.size(), BossRoster.NON_FINAL_BOSSES.size())
	var seen := {}
	for index in order:
		assert_false(seen.has(index), "shuffled_order repeated index %d" % index)
		seen[index] = true
		assert_true(index >= 0 and index < BossRoster.NON_FINAL_BOSSES.size())


func test_different_seeds_can_produce_different_orders() -> void:
	var rng_a := RandomNumberGenerator.new()
	rng_a.seed = 10
	var rng_b := RandomNumberGenerator.new()
	rng_b.seed = 99

	var order_a := BossRoster.shuffled_order(rng_a)
	var order_b := BossRoster.shuffled_order(rng_b)

	assert_ne(order_a, order_b, "Different seeds landing on the exact same permutation is possible but astronomically unlikely for these two.")


func test_boss_at_level_ten_is_always_the_adversary_regardless_of_order() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 5
	var order := BossRoster.shuffled_order(rng)

	var boss := BossRoster.boss_at(order, 10)

	assert_eq(boss["name"], "The Adversary")


func test_boss_at_levels_one_through_nine_covers_every_non_final_boss_exactly_once() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 7
	var order := BossRoster.shuffled_order(rng)

	var names := {}
	for level_index in range(1, 10):
		var boss := BossRoster.boss_at(order, level_index)
		names[boss["name"]] = true

	assert_eq(names.size(), BossRoster.NON_FINAL_BOSSES.size(), "All nine non-final bosses should appear exactly once across Trials I-IX.")


func test_boss_at_with_an_empty_order_falls_back_to_the_adversary() -> void:
	# Defensive default for a state that shouldn't occur in practice
	# (DungeonGenerator always calls RunProgress.ensure_boss_order first) —
	# documented here so the fallback is a deliberate choice, not silently relied on.
	var boss := BossRoster.boss_at([], 1)

	assert_eq(boss["name"], "The Adversary")
