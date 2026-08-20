extends GutTest
## BossThemeLibrary — every real boss name (BossRoster's own list, plus The
## Adversary) needs a valid, distinct, loop-enabled theme; an unrecognized
## name needs to fall back gracefully rather than error.

const ALL_BOSS_NAMES := [
	"Pride", "Envy", "Wrath", "Gluttony", "Greed",
	"Sloth", "Lust", "Despair", "Doubt", "The Adversary",
]


func test_boss_roster_names_match_what_this_test_expects() -> void:
	# Sanity check that this test's own name list hasn't drifted from
	# BossRoster's — if this fails, PHRASES in boss_theme_library.gd is
	# missing (or misspells) an entry the real game will actually ask for.
	for entry in BossRoster.NON_FINAL_BOSSES:
		assert_true(ALL_BOSS_NAMES.has(entry["name"]))
	assert_true(ALL_BOSS_NAMES.has(BossRoster.ADVERSARY["name"]))


func test_every_real_boss_name_produces_a_valid_looping_stream() -> void:
	for boss_name in ALL_BOSS_NAMES:
		var stream := BossThemeLibrary.build_theme(boss_name)
		assert_not_null(stream, "Missing theme for %s" % boss_name)
		assert_gt(stream.data.size(), 0, "Empty theme for %s" % boss_name)
		assert_eq(stream.loop_mode, AudioStreamWAV.LOOP_FORWARD, "%s's theme should loop." % boss_name)


func test_every_boss_gets_a_distinct_theme() -> void:
	var hashes := {}
	for boss_name in ALL_BOSS_NAMES:
		hashes[BossThemeLibrary.build_theme(boss_name).data.hash()] = true

	assert_eq(hashes.size(), ALL_BOSS_NAMES.size(), "Every boss should sound different from every other boss.")


func test_calling_build_theme_twice_returns_the_identical_cached_instance() -> void:
	var first := BossThemeLibrary.build_theme("Pride")
	var second := BossThemeLibrary.build_theme("Pride")

	assert_same(first, second)


func test_an_unrecognized_name_falls_back_gracefully_instead_of_erroring() -> void:
	var stream := BossThemeLibrary.build_theme("Not A Real Boss")

	assert_not_null(stream)
	assert_gt(stream.data.size(), 0)


func test_theme_length_is_a_reasonable_loop_duration() -> void:
	var stream := BossThemeLibrary.build_theme("Sloth")
	var duration_seconds: float = float(stream.data.size() / 2) / float(stream.mix_rate)

	assert_gt(duration_seconds, 15.0, "Too short and it'd loop distractingly often.")
	assert_lt(duration_seconds, 60.0, "Too long and build_theme would be doing far more synthesis work than it needs to.")
