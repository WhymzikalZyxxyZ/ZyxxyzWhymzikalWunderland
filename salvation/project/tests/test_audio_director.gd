extends GutTest
## AudioDirector doesn't persist anything (see GameSettings/RunProgress for
## that pattern) — it just owns playback nodes and creates its own buses —
## so tests build fresh instances of the script directly, same instantiate-
## and-add_child_autofree shape those two use, rather than touching the
## real "AudioDirector" autoload singleton.

const AudioDirectorScript := preload("res://scripts/core/audio_director.gd")


func _build() -> Node:
	var director: Node = AudioDirectorScript.new()
	add_child_autofree(director)
	return director


func test_ready_creates_the_sfx_and_music_buses() -> void:
	_build()

	assert_gte(AudioServer.get_bus_index("SFX"), 0)
	assert_gte(AudioServer.get_bus_index("Music"), 0)


func test_a_second_instance_does_not_duplicate_the_buses() -> void:
	_build()
	var count_before := AudioServer.bus_count

	_build()

	assert_eq(AudioServer.bus_count, count_before, "_ensure_bus should be a no-op once a bus of that name already exists.")


func test_play_sfx_assigns_the_stream_to_a_pooled_player() -> void:
	var director := _build()
	var stream := SfxLibrary.build_attack()

	director.play_sfx(stream)

	assert_eq(director._sfx_players[0].stream, stream)


func test_play_sfx_with_a_null_stream_touches_nothing() -> void:
	var director := _build()

	director.play_sfx(null)

	assert_null(director._sfx_players[0].stream, "A null stream shouldn't get assigned to any pooled player.")


func test_play_boss_theme_assigns_the_correct_stream() -> void:
	var director := _build()

	director.play_boss_theme("Pride")

	assert_eq(director._music_player.stream, BossThemeLibrary.build_theme("Pride"))


func test_play_boss_theme_with_the_same_name_twice_does_not_restart_it() -> void:
	var director := _build()
	director.play_boss_theme("Wrath")
	director._music_player.stream = null # if play_boss_theme re-triggered, this would get reassigned back

	director.play_boss_theme("Wrath")

	assert_null(director._music_player.stream, "Re-calling with the already-playing boss's name should be a no-op.")


func test_stop_music_clears_the_current_theme_tracking() -> void:
	var director := _build()
	director.play_boss_theme("Envy")

	director.stop_music()
	director._music_player.stream = null
	director.play_boss_theme("Envy")

	assert_not_null(director._music_player.stream, "After stop_music(), the same boss name should be playable again, not treated as already-playing.")
