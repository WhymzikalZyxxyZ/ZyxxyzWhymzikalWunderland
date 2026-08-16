extends GutTest
## Covers what's actually new/distinct about the four non-Paladin
## characters: Cleric's heal-instead-of-damage Magic ability (the only one
## in the roster), Exorcist's ranged Projectile (the only ranged attack in
## the game), and CharacterRoster's lookup table both screens/generators
## read from. Monk and Prophet reuse the same _strike_in_facing_cone path
## Paladin already exercises, just with different numbers, so they don't
## need their own dedicated mechanic tests here.


func test_cleric_sacred_mend_heals_self_instead_of_damaging_anything() -> void:
	var cleric := Cleric.new()
	add_child_autofree(cleric)
	cleric.stats.health = 50.0
	cleric.stats.magic = 50.0

	cleric._use_magic()

	assert_gt(cleric.stats.health, 50.0, "Sacred Mend should heal the Cleric.")
	assert_lt(cleric.stats.magic, 50.0, "Sacred Mend should still cost Magic.")


func test_cleric_sacred_mend_records_the_heal_amount_as_the_last_ability_used() -> void:
	var cleric := Cleric.new()
	add_child_autofree(cleric)
	cleric.stats.magic = 50.0
	var use_id_before := cleric.last_ability_use_id

	cleric._use_magic()

	assert_gt(cleric.last_ability_use_id, use_id_before)
	assert_eq(cleric.last_ability_damage, cleric.mend_heal_amount)


func test_cleric_sacred_mend_does_nothing_without_enough_magic() -> void:
	var cleric := Cleric.new()
	add_child_autofree(cleric)
	cleric.stats.health = 50.0
	cleric.stats.magic = 0.0

	cleric._use_magic()

	assert_eq(cleric.stats.health, 50.0)


func test_exorcist_banishing_rite_spawns_a_projectile_that_damages_an_enemy_in_its_path() -> void:
	var root := Node2D.new()
	add_child_autofree(root)

	var exorcist := Exorcist.new()
	root.add_child(exorcist)  # _ready() sets stats via _create_stats(), default Magic already covers rite_magic_cost

	var target := Enemy.new()
	var target_collision := CollisionShape2D.new()
	var target_shape := RectangleShape2D.new()
	target_shape.size = Vector2(28, 28)
	target_collision.shape = target_shape
	target.add_child(target_collision)
	root.add_child(target)
	target.global_position = exorcist.global_position + Vector2(100, 0)
	var health_before := target.stats.health

	exorcist._use_magic()  # rotation defaults to 0 → fires along +X, straight at the target

	await wait_physics_frames(20)

	assert_lt(target.stats.health, health_before, "The bolt should have traveled far enough to hit the enemy.")


func test_cleric_sacred_mend_spawns_a_magic_burst_not_a_combat_slash() -> void:
	# Sacred Mend doesn't attack anyone — it shouldn't visually look like it
	# does. Regression coverage for a real mismatch: this used to reuse
	# _spawn_attack_slash, the same "weapon swing" effect every actual
	# attack uses.
	var cleric := Cleric.new()
	add_child_autofree(cleric)
	cleric.stats.magic = 50.0

	cleric._use_magic()

	var parent := cleric.get_parent()
	var has_burst := false
	var has_slash := false
	for child in parent.get_children():
		if child is MagicBurst:
			has_burst = true
		if child is AttackSlash:
			has_slash = true

	assert_true(has_burst, "Sacred Mend should spawn a MagicBurst.")
	assert_false(has_slash, "Sacred Mend shouldn't spawn a combat slash — it doesn't attack anything.")


func test_monk_flurry_strike_spawns_three_overlapping_slashes() -> void:
	var monk := Monk.new()
	add_child_autofree(monk)
	monk.stats.magic = 50.0

	monk._use_magic()

	var slash_count := 0
	for child in monk.get_parent().get_children():
		if child is AttackSlash:
			slash_count += 1

	assert_eq(slash_count, 3, "Flurry Strike should read as multiple hits landing, not one bigger swing.")


func test_prophet_final_verse_burst_is_bigger_than_the_shared_default() -> void:
	var prophet := Prophet.new()
	add_child_autofree(prophet)
	prophet.stats.magic = 50.0

	prophet._use_magic()

	var burst: MagicBurst = null
	for child in prophet.get_parent().get_children():
		if child is MagicBurst:
			burst = child
	assert_not_null(burst, "Final Verse should spawn a MagicBurst.")
	assert_gt(burst.end_scale, 1.7, "The Verse should be visibly bigger than the game-wide default burst.")


func test_character_roster_resolves_a_distinct_scene_per_character() -> void:
	var seen_paths := {}
	for id in [CharacterId.PALADIN, CharacterId.CLERIC, CharacterId.MONK, CharacterId.EXORCIST, CharacterId.PROPHET]:
		var scene := CharacterRoster.scene_for(id)
		assert_not_null(scene)
		var path := scene.resource_path
		assert_false(seen_paths.has(path), "Two characters resolved to the same scene: %s" % path)
		seen_paths[path] = true


func test_character_roster_falls_back_to_paladin_for_an_unknown_id() -> void:
	var scene := CharacterRoster.scene_for(-1)
	assert_eq(scene.resource_path, CharacterRoster.scene_for(CharacterId.PALADIN).resource_path)
