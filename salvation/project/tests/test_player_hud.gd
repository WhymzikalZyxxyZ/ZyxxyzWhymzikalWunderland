extends GutTest
## PlayerHud — name/bio are set once via bind_player() from the character's
## own CharacterId/CharacterRoster data; the rooms/bosses labels reflect
## RunProgress live. Touches the real RunProgress autoload for those (same
## as test_stat_item_pickup.gd), so after_each resets it.

const PLAYER_HUD_SCENE: PackedScene = preload("res://scenes/ui/player_hud.tscn")


func after_each() -> void:
	RunProgress.clear_run_progress()


func _build() -> PlayerHud:
	var layer := PLAYER_HUD_SCENE.instantiate()
	add_child_autofree(layer)
	return layer.get_node("PlayerHud")


func test_bind_player_sets_name_and_bio_from_the_characters_own_data() -> void:
	var hud := _build()
	var player := Monk.new()
	add_child_autofree(player)

	hud.bind_player(player)

	assert_eq(hud._name_label.text, CharacterId.name_of(CharacterId.MONK))
	assert_eq(hud._bio_label.text, CharacterRoster.blurb_for(CharacterId.MONK))


func test_run_stat_labels_reflect_run_progress_at_ready() -> void:
	RunProgress.record_room_cleared()
	RunProgress.record_room_cleared()
	RunProgress.record_boss_defeat()

	var hud := _build()

	assert_eq(hud._rooms_label.text, "Rooms Cleared: 2")
	assert_eq(hud._bosses_label.text, "Bosses Defeated: 1/%d" % BossRoster.TRIAL_COUNT)


func test_run_stat_labels_update_on_a_physics_tick() -> void:
	var hud := _build()
	assert_eq(hud._rooms_label.text, "Rooms Cleared: 0")

	RunProgress.record_room_cleared()
	hud._physics_process(0.016)

	assert_eq(hud._rooms_label.text, "Rooms Cleared: 1")
