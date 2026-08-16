extends GutTest
## Each trial boss's signature ability is distinct — this exercises the
## resolve/start logic directly (bypassing the real telegraph timer, the
## same way test_door.gd drives Door._physics_process directly) rather
## than waiting out telegraph_duration in real time for every case.

const SINNER_SCENE: PackedScene = preload("res://scenes/enemies/sinner.tscn")


func test_envy_drains_magic_and_heals_when_player_has_magic() -> void:
	var boss := EnvyBoss.new()
	add_child_autofree(boss)
	boss.stats.health = 100.0
	boss.stats.max_health = 300.0

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	player.stats.magic = 50.0
	boss._tracked_player = player

	boss._resolve_signature(boss.signature_range)

	assert_lt(player.stats.magic, 50.0, "Envy should have drained some Magic.")
	assert_gt(boss.stats.health, 100.0, "Envy should heal itself by whatever it drained.")


func test_envy_punishes_with_damage_when_player_has_no_magic() -> void:
	var boss := EnvyBoss.new()
	add_child_autofree(boss)

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	player.stats.magic = 0.0
	var health_before := player.stats.health
	boss._tracked_player = player

	boss._resolve_signature(boss.signature_range)

	assert_eq(player.stats.magic, 0.0)
	assert_lt(player.stats.health, health_before, "With nothing to covet, Envy should hit instead.")


func test_wrath_strikes_without_any_player_ability_use() -> void:
	var boss := WrathBoss.new()
	add_child_autofree(boss)

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	boss._tracked_player = player
	var health_before := player.stats.health

	# Unlike Pride/Envy/Greed, Wrath's readiness doesn't depend on anything
	# the player has done — only range.
	assert_true(boss._signature_ready(boss.signature_range))
	boss._resolve_signature(boss.signature_range)

	assert_lt(player.stats.health, health_before)


func test_gluttony_devours_a_nearby_rock_instead_of_striking_the_player() -> void:
	var boss := GluttonyBoss.new()
	add_child_autofree(boss)
	boss.stats.health = 100.0
	boss.stats.max_health = 400.0

	var rock := Rock.new()
	add_child_autofree(rock)
	rock.global_position = boss.global_position + Vector2(20, 0)
	var rock_hits_before := rock.hits_remaining

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	boss._tracked_player = player
	var health_before := player.stats.health

	boss._resolve_signature(boss.signature_range)

	assert_lt(rock.hits_remaining, rock_hits_before, "Gluttony should have taken a bite out of the rock.")
	assert_gt(boss.stats.health, 100.0, "Devouring should heal Gluttony.")
	assert_eq(player.stats.health, health_before, "With a meal available, the player shouldn't be hit.")


func test_gluttony_strikes_the_player_when_nothing_is_nearby_to_devour() -> void:
	var boss := GluttonyBoss.new()
	add_child_autofree(boss)

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	boss._tracked_player = player
	var health_before := player.stats.health

	boss._resolve_signature(boss.signature_range)

	assert_lt(player.stats.health, health_before, "With no meal available, Gluttony should attack instead.")


func test_sloth_slows_the_player_and_restores_speed_when_defeated() -> void:
	var boss := SlothBoss.new()
	add_child_autofree(boss)

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	boss._tracked_player = player
	var original_speed := player.stats.speed

	boss._resolve_signature(boss.signature_range)
	assert_lt(player.stats.speed, original_speed, "Sloth's signature should slow the player.")

	boss._defeat()
	assert_eq(player.stats.speed, original_speed, "Defeating Sloth mid-debuff should restore the player's speed immediately.")


func test_lust_closes_the_distance_before_striking_regardless_of_range() -> void:
	var boss := LustBoss.new()
	add_child_autofree(boss)
	boss.global_position = Vector2(2000, 2000)  # far outside signature_range

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = Vector2.ZERO
	boss._tracked_player = player
	var health_before := player.stats.health

	assert_true(boss._signature_ready(boss.signature_range), "Lust's readiness ignores range entirely.")
	boss._resolve_signature(boss.signature_range)

	assert_lt(boss.global_position.distance_to(player.global_position), 100.0, "Lust should have closed the distance.")
	assert_lt(player.stats.health, health_before)


func test_doubt_feint_deals_no_damage() -> void:
	var boss := DoubtBoss.new()
	add_child_autofree(boss)

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	boss._tracked_player = player
	var health_before := player.stats.health

	boss._is_feint = true
	boss._resolve_signature(boss.signature_range)

	assert_eq(player.stats.health, health_before, "A feint should never actually land.")


func test_doubt_real_strike_deals_damage() -> void:
	var boss := DoubtBoss.new()
	add_child_autofree(boss)

	var player := Paladin.new()
	add_child_autofree(player)
	player.global_position = boss.global_position
	boss._tracked_player = player
	var health_before := player.stats.health

	boss._is_feint = false
	boss._resolve_signature(boss.signature_range)

	assert_lt(player.stats.health, health_before)


func test_every_trial_boss_has_a_distinct_sprite_builder() -> void:
	# Every sin except Pride/Adversary (which deliberately share the classic
	# silhouette — see AdversaryBoss's own docstring) gets its own shape,
	# not just a recolor. This just confirms each one actually builds a
	# texture without erroring, not that its pixel content differs.
	var color := Color(0.4, 0.4, 0.4)
	var builders := [
		CharacterSprites.build_envy_boss(color),
		CharacterSprites.build_wrath_boss(color),
		CharacterSprites.build_gluttony_boss(color),
		CharacterSprites.build_greed_boss(color),
		CharacterSprites.build_sloth_boss(color),
		CharacterSprites.build_lust_boss(color),
		CharacterSprites.build_despair_boss(color),
		CharacterSprites.build_doubt_boss(color),
	]
	for texture in builders:
		assert_not_null(texture)
		assert_true(texture.get_size().x > 0 and texture.get_size().y > 0)
