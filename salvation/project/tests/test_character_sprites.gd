extends GutTest
## CharacterSprites/EnvironmentArt cache every build_*() result rather than
## rebuilding from scratch each call — these confirm the cache actually
## shares a single Texture2D instance rather than just happening to
## produce equal-looking ones, and that distinct arguments still produce
## distinct cached entries rather than colliding.


func test_repeated_calls_with_no_arguments_return_the_same_instance() -> void:
	var first := CharacterSprites.build_paladin()
	var second := CharacterSprites.build_paladin()

	assert_same(first, second, "Two calls with no arguments should share one cached texture, not rebuild.")


func test_repeated_calls_with_the_same_color_return_the_same_instance() -> void:
	var color := Color(0.32, 0.14, 0.42)

	var first := CharacterSprites.build_sin_boss(color)
	var second := CharacterSprites.build_sin_boss(color)

	assert_same(first, second)


func test_different_colors_produce_different_cached_instances() -> void:
	var pride_texture := CharacterSprites.build_sin_boss(Color(0.32, 0.14, 0.42))
	var adversary_texture := CharacterSprites.build_sin_boss(Color(0.18, 0.03, 0.03))

	assert_ne(pride_texture, adversary_texture, "Different colors are a genuinely different bake, not the same cache entry.")


func test_different_boss_shapes_dont_collide_in_the_cache_even_with_the_same_color() -> void:
	# Regression-shaped test: two different build_*_boss() functions called
	# with the identical Color argument must not resolve to the same cache
	# key just because their color happened to match.
	var color := Color(0.5, 0.5, 0.5)

	var envy_texture := CharacterSprites.build_envy_boss(color)
	var wrath_texture := CharacterSprites.build_wrath_boss(color)

	assert_ne(envy_texture, wrath_texture)


func test_environment_art_wall_and_floor_tiles_are_cached_independently() -> void:
	var color := Color(0.09, 0.08, 0.1)

	var wall_a := EnvironmentArt.build_wall_tile(color)
	var wall_b := EnvironmentArt.build_wall_tile(color)
	var floor_tile := EnvironmentArt.build_floor_tile(color)

	assert_same(wall_a, wall_b, "Same color, same tile type — should be the same cached texture.")
	assert_ne(wall_a, floor_tile, "Same color, different tile type — must not collide in the cache.")
