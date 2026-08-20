extends GutTest
## SfxLibrary — same cache-identity + "every builder returns something
## valid" coverage test_character_sprites.gd already has for the texture
## side.


func test_every_builder_returns_a_nonempty_stream() -> void:
	var builders: Array[AudioStreamWAV] = [
		SfxLibrary.build_attack(),
		SfxLibrary.build_hit(),
		SfxLibrary.build_crit(),
		SfxLibrary.build_pickup(),
		SfxLibrary.build_magic(),
		SfxLibrary.build_dash(),
		SfxLibrary.build_parry(),
		SfxLibrary.build_enemy_death(),
		SfxLibrary.build_player_hurt(),
		SfxLibrary.build_boss_defeat(),
	]

	for stream in builders:
		assert_not_null(stream)
		assert_gt(stream.data.size(), 0)


func test_calling_the_same_builder_twice_returns_the_identical_cached_instance() -> void:
	var first := SfxLibrary.build_attack()
	var second := SfxLibrary.build_attack()

	assert_same(first, second)


func test_different_builders_are_not_the_same_instance() -> void:
	assert_not_same(SfxLibrary.build_hit(), SfxLibrary.build_crit())


func test_crit_is_louder_or_differently_shaped_than_a_plain_hit() -> void:
	var hit := SfxLibrary.build_hit()
	var crit := SfxLibrary.build_crit()

	assert_ne(hit.data, crit.data, "A crit should read as audibly distinct from a plain hit, not just a copy.")
