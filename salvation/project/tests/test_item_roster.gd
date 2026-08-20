extends GutTest
## ItemRoster is pure and static (no character/RunProgress needed) — same
## shape PlayerController.BossUpgradeType/describe_upgrade/apply_boss_upgrade
## already has, tested the same way.


func test_describe_item_returns_a_nonempty_label_for_every_type() -> void:
	var values: Array = ItemRoster.ItemType.values()
	for type in values:
		assert_false(ItemRoster.describe_item(type).is_empty(), "Every ItemType should have a description.")


func test_name_of_returns_a_nonempty_name_for_every_type() -> void:
	var values: Array = ItemRoster.ItemType.values()
	for type in values:
		assert_false(ItemRoster.name_of(type).is_empty())


func test_apply_item_vitality_raises_both_max_and_current_health() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.VITALITY)

	assert_eq(stats.max_health, 100.0 + ItemRoster.VITALITY_HEALTH_AMOUNT)
	assert_eq(stats.health, 100.0 + ItemRoster.VITALITY_HEALTH_AMOUNT)


func test_apply_item_focus_raises_both_max_and_current_magic() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.FOCUS)

	assert_eq(stats.max_magic, 50.0 + ItemRoster.FOCUS_MAGIC_AMOUNT)
	assert_eq(stats.magic, 50.0 + ItemRoster.FOCUS_MAGIC_AMOUNT)


func test_apply_item_might_raises_power_only() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.MIGHT)

	assert_eq(stats.power, 10.0 + ItemRoster.MIGHT_POWER_AMOUNT)
	assert_eq(stats.defense, 5.0, "Might shouldn't touch defense.")


func test_apply_item_ward_raises_defense_only() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.WARD)

	assert_eq(stats.defense, 5.0 + ItemRoster.WARD_DEFENSE_AMOUNT)
	assert_eq(stats.power, 10.0, "Ward shouldn't touch power.")


func test_apply_item_haste_raises_speed_only() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.HASTE)

	assert_eq(stats.speed, 200.0 + ItemRoster.HASTE_SPEED_AMOUNT)


func test_apply_item_fortune_raises_luck_only() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.FORTUNE)

	assert_eq(stats.luck, ItemRoster.FORTUNE_LUCK_AMOUNT)


func test_repeated_pickups_of_the_same_item_stack() -> void:
	var stats := Stats.new(100.0, 50.0, 200.0, 10.0, 5.0)

	ItemRoster.apply_item(stats, ItemRoster.ItemType.MIGHT)
	ItemRoster.apply_item(stats, ItemRoster.ItemType.MIGHT)

	assert_eq(stats.power, 10.0 + ItemRoster.MIGHT_POWER_AMOUNT * 2.0)


func test_random_item_type_always_returns_a_defined_type() -> void:
	var values: Array = ItemRoster.ItemType.values()
	for i in range(30):
		var type := ItemRoster.random_item_type()
		assert_true(values.has(type))


func test_random_item_type_actually_varies() -> void:
	var seen := {}
	for i in range(60):
		seen[ItemRoster.random_item_type()] = true

	assert_gt(seen.size(), 1, "60 rolls should not all land on the exact same item.")
