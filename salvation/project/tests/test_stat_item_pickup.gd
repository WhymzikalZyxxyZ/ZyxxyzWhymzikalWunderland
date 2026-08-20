extends GutTest
## StatItemPickup mirrors HealthPickup/MagicPickup's shape exactly (see
## their own lack of dedicated tests — this is new coverage those never
## had either, added here since a new stat-effecting pickup is worth
## verifying end to end). Touches the real RunProgress autoload the same
## way test_victory_screen.gd's upgrade-choice tests do, so after_each
## resets it rather than leaving the real save file polluted.

func after_each() -> void:
	RunProgress.clear_run_progress()


func test_walking_into_it_applies_its_stat_effect_and_self_frees() -> void:
	var pickup := StatItemPickup.new()
	pickup.item_type = ItemRoster.ItemType.MIGHT
	add_child_autofree(pickup)

	var player := Paladin.new()
	add_child_autofree(player)
	var power_before := player.stats.power

	pickup._on_body_entered(player)

	assert_eq(player.stats.power, power_before + ItemRoster.MIGHT_POWER_AMOUNT)
	assert_true(pickup.is_queued_for_deletion())


func test_walking_into_it_records_the_pickup_on_run_progress() -> void:
	var pickup := StatItemPickup.new()
	pickup.item_type = ItemRoster.ItemType.HASTE
	add_child_autofree(pickup)

	var player := Paladin.new()
	add_child_autofree(player)

	pickup._on_body_entered(player)

	assert_eq(RunProgress.item_lifetime_uses(ItemRoster.ItemType.HASTE), 1)


func test_a_non_player_body_is_ignored() -> void:
	var pickup := StatItemPickup.new()
	pickup.item_type = ItemRoster.ItemType.WARD
	add_child_autofree(pickup)

	var not_a_player := Node2D.new()
	add_child_autofree(not_a_player)

	pickup._on_body_entered(not_a_player)

	assert_false(pickup.is_queued_for_deletion(), "A non-PlayerController body shouldn't trigger the pickup.")
