extends GutTest
## Sinner's speed is randomized per-instance (see Sinner.speed_min/max)
## rather than a flat constant. Robe color is randomized per-instance too,
## from a small fixed set (ROBE_COLORS) rather than a flat constant.


func test_speed_stays_within_the_configured_range() -> void:
	for i in range(20):
		var sinner := Sinner.new()
		add_child_autofree(sinner)

		assert_gte(sinner.stats.speed, sinner.speed_min)
		assert_lte(sinner.stats.speed, sinner.speed_max)


func test_speed_actually_varies_across_instances() -> void:
	var seen := {}
	for i in range(20):
		var sinner := Sinner.new()
		add_child_autofree(sinner)
		seen[sinner.stats.speed] = true

	assert_gt(seen.size(), 1, "20 Sinners should not all roll the exact same speed.")


func test_narrowing_the_range_still_stays_within_it() -> void:
	for i in range(10):
		var sinner := Sinner.new()
		sinner.speed_min = 200.0
		sinner.speed_max = 200.0
		add_child_autofree(sinner)

		assert_eq(sinner.stats.speed, 200.0)


func test_robe_color_varies_across_instances() -> void:
	var seen_textures := {}
	for i in range(20):
		var sinner := Sinner.new()
		add_child_autofree(sinner)
		seen_textures[sinner.sprite.texture] = true

	assert_gt(seen_textures.size(), 1, "20 Sinners should not all roll the exact same robe color.")
	assert_lte(seen_textures.size(), Sinner.ROBE_COLORS.size(), "Should never see more distinct textures than there are colors defined.")
