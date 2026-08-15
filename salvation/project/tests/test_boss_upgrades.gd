extends GutTest
## Every boss defeat grants exactly one of six random upgrades — see
## PlayerController.apply_random_boss_upgrade(). Individual branches
## aren't forced via a specific RNG seed (the roll uses the engine's
## global RNG, not an injectable one); instead these run enough trials
## that every one of the six categories is overwhelmingly likely to be
## hit at least once (with 6 categories, the odds any single one is
## never rolled across 200 trials is (5/6)^200, indistinguishable from
## zero) and assert on the cumulative effect each category should have left behind.


func test_two_hundred_random_upgrades_exercise_every_category_and_stay_within_bounds() -> void:
	var paladin := Paladin.new()
	add_child_autofree(paladin)

	var original_attack_cooldown := paladin.attack_cooldown
	var original_speed := paladin.stats.speed

	for i in range(200):
		var description := paladin.apply_random_boss_upgrade()
		assert_false(description.is_empty(), "Every roll should return a non-empty description.")

	assert_gt(paladin.bonus_damage_multiplier, 1.0, "Damage should have been rolled at least once in 200 tries.")
	assert_lt(paladin.attack_cooldown, original_attack_cooldown, "Attack Speed should have been rolled at least once in 200 tries.")
	assert_gt(paladin.stats.speed, original_speed, "Move Speed should have been rolled at least once in 200 tries.")
	assert_gt(paladin.echo_stacks, 0, "New Magic should have been rolled at least once in 200 tries.")
	assert_gt(paladin.stats.critical_chance, 0.0, "Crit Chance should have been rolled at least once in 200 tries.")
	assert_gt(paladin.stats.critical_damage, 1.5, "Crit Damage should have been rolled at least once in 200 tries.")

	assert_lte(paladin.stats.critical_chance, 1.0, "Crit chance should never exceed 100%.")
	assert_gte(paladin.attack_cooldown, PlayerController.MIN_ATTACK_COOLDOWN, "Attack Speed stacking should never push the cooldown below the floor.")


func test_rolled_damage_with_zero_crit_chance_never_crits() -> void:
	var paladin := Paladin.new()
	add_child_autofree(paladin)
	paladin.stats.critical_chance = 0.0
	paladin.bonus_damage_multiplier = 1.0

	for i in range(20):
		assert_eq(paladin._rolled_damage(10.0), 10.0)


func test_rolled_damage_with_guaranteed_crit_always_multiplies_by_critical_damage() -> void:
	var paladin := Paladin.new()
	add_child_autofree(paladin)
	paladin.stats.critical_chance = 1.0
	paladin.stats.critical_damage = 2.0
	paladin.bonus_damage_multiplier = 1.0

	assert_eq(paladin._rolled_damage(10.0), 20.0)


func test_rolled_damage_applies_the_damage_multiplier_before_any_crit() -> void:
	var paladin := Paladin.new()
	add_child_autofree(paladin)
	paladin.stats.critical_chance = 0.0
	paladin.bonus_damage_multiplier = 1.5

	assert_eq(paladin._rolled_damage(10.0), 15.0)


func test_arcane_echo_does_nothing_with_no_stacks() -> void:
	var root := Node2D.new()
	add_child_autofree(root)
	var paladin := Paladin.new()
	root.add_child(paladin)
	assert_eq(paladin.echo_stacks, 0)

	paladin._trigger_arcane_echo(10.0, Color.WHITE)

	var burst_count := 0
	for child in root.get_children():
		if child is MagicBurst:
			burst_count += 1
	assert_eq(burst_count, 0)


func test_arcane_echo_spawns_one_burst_per_stack() -> void:
	var root := Node2D.new()
	add_child_autofree(root)
	var paladin := Paladin.new()
	root.add_child(paladin)
	paladin.echo_stacks = 3

	paladin._trigger_arcane_echo(10.0, Color.WHITE)

	var burst_count := 0
	for child in root.get_children():
		if child is MagicBurst:
			burst_count += 1
	assert_eq(burst_count, 3)
