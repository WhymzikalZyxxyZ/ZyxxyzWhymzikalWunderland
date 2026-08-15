extends GutTest
## take_damage's knockback: a minor push away from whatever landed the hit,
## the player-side mirror of Enemy's existing knockback-on-take_damage.


func test_take_damage_with_a_source_pushes_the_player_away_from_it() -> void:
	var player := PlayerController.new()
	player.global_position = Vector2(100, 0)
	add_child_autofree(player)

	player.take_damage(10.0, Vector2.ZERO)

	assert_gt(player._knockback_remaining, 0.0)
	assert_gt(player._knockback_velocity.x, 0.0, "Hit from the left should push the player to the right.")


func test_take_damage_without_a_source_applies_no_knockback() -> void:
	var player := PlayerController.new()
	add_child_autofree(player)

	player.take_damage(10.0)

	assert_eq(player._knockback_remaining, 0.0)


func test_take_damage_while_invulnerable_applies_no_knockback() -> void:
	var player := PlayerController.new()
	player.is_invulnerable = true
	add_child_autofree(player)

	player.take_damage(10.0, Vector2.ZERO)

	assert_eq(player._knockback_remaining, 0.0)
