extends Node
## Three kinds of persisted state, all in the same save file, kept
## deliberately separate:
##  - Meta-progression (which characters/relics have been earned, and
##    whether the tutorial's been seen) never resets on its own.
##    complete_run always grants exactly one new unlock, so the game is
##    provably finishable end to end: Paladin -> ... -> Prophet -> every
##    relic.
##  - Lifetime totals (total_deaths, total_victories, and
##    victories_by_character broken out per character) never reset either —
##    a plain running count, not a per-run history. "Victory" here means a
##    full run actually completed (the Adversary fell), not each
##    individual boss cleared along the way.
##  - The current run's resume point (which level, which character, which
##    order this run's Trials I-IX landed in, and how long it's taken so
##    far — see boss_order/run_elapsed_seconds) is transient — it's
##    exactly what MainMenuScreen's "Continue" button reads, and it's
##    cleared the moment that run actually ends, in either direction
##    (DeathScreen on a loss, complete_run() on the final trial's
##    victory), so a stale save never offers to resume a run that's over.
##    There is only ever one resume point — a single save slot, not a
##    history of runs — so starting a New Run while one is saved simply
##    replaces it the moment the next level starts and re-saves.
##
## IMPORTANT ordering for the run timer: complete_run() clears the resume
## point (including the elapsed timer and current_character_id) as its
## first step, so a caller that wants to report how long the run took
## (VictoryScreen does, on the final trial) MUST read run_elapsed_seconds()
## before calling complete_run(), not after. complete_run() itself has the
## same problem internally for crediting victories_by_character — it
## captures _current_character_id into a local before calling
## clear_run_progress(), so this is handled for you there.
##
## Registered as an autoload singleton (see project.godot) so every scene
## can reach it as "RunProgress". save_path is a constructor parameter
## (not hardcoded to SAVE_PATH directly) purely so tests can point a
## throwaway instance at a temp file instead of the real one — the
## autoload itself is always constructed with the default.

const SAVE_PATH := "user://salvation_progress.cfg"

var _save_path: String
var _unlocked_characters: Dictionary = {CharacterId.PALADIN: true}
var _unlocked_relics: Array[String] = []

var _total_deaths: int = 0
var _total_victories: int = 0
## CharacterId -> number of full runs completed with that character.
## Broken out from _total_victories (their sum always equals it) so
## MainMenuScreen can show who's actually finished a run, not just how many times.
var _victories_by_character: Dictionary = {}

var _tutorial_seen: bool = false

var _current_level_path: String = ""
var _current_character_id: int = -1
var _boss_order: Array[int] = []

## _run_elapsed_seconds is the persisted, already-banked total; _session_start_time
## (never persisted — Unix time, -1.0 means "not currently ticking") anchors
## whatever's accumulated since the last time it was banked. Split this way
## so a browser tab closed mid-run doesn't lose that session's elapsed time:
## every _save() banks the running session into _run_elapsed_seconds first
## (see _sync_run_elapsed), so the persisted value is never more than one
## save cycle stale.
var _run_elapsed_seconds: float = 0.0
var _session_start_time: float = -1.0


func _init(save_path: String = SAVE_PATH) -> void:
	_save_path = save_path


func _ready() -> void:
	_load()


func is_unlocked(id: int) -> bool:
	return _unlocked_characters.has(id)


func unlocked_relics() -> Array[String]:
	return _unlocked_relics


func total_deaths() -> int:
	return _total_deaths


func total_victories() -> int:
	return _total_victories


func victories_for_character(id: int) -> int:
	return _victories_by_character.get(id, 0)


func has_seen_tutorial() -> bool:
	return _tutorial_seen


## Called by TutorialScreen the instant it's dismissed, regardless of how
## it was reached — a permanent flag (meta-progression, not per-run state),
## so MainMenuScreen's New Run only shows it again if reset_all() clears it.
func mark_tutorial_seen() -> void:
	if _tutorial_seen:
		return
	_tutorial_seen = true
	_save()


## Called from DeathScreen — a lifetime tally, separate from and
## unaffected by clear_run_progress()'s per-run resume point.
func record_death() -> void:
	_total_deaths += 1
	_save()


## True once a level has actually started and no run-ending event
## (death or the final trial's victory) has cleared it since.
func has_run_in_progress() -> bool:
	return _current_level_path != ""


func current_level_path() -> String:
	return _current_level_path


func current_character_id() -> int:
	return _current_character_id


func boss_order() -> Array[int]:
	return _boss_order


## Live elapsed time for the current run, in seconds — the banked total
## plus whatever's accumulated since the session last started ticking (see
## _session_start_time). Read-only; doesn't bank anything itself.
func run_elapsed_seconds() -> float:
	if _session_start_time < 0.0:
		return _run_elapsed_seconds
	return _run_elapsed_seconds + (Time.get_unix_time_from_system() - _session_start_time)


## "3:07", "42:19", or "1:03:45" once past an hour — always at least
## minutes:seconds, never bare seconds, since a full ten-trial run is
## never going to be a handful of seconds long.
static func format_duration(total_seconds: float) -> String:
	var whole_seconds := int(round(total_seconds))
	var hours := whole_seconds / 3600
	var minutes := (whole_seconds % 3600) / 60
	var seconds := whole_seconds % 60
	if hours > 0:
		return "%d:%02d:%02d" % [hours, minutes, seconds]
	return "%d:%02d" % [minutes, seconds]


## Called by DungeonGenerator on every level — a no-op once this run
## already has an order (levels 2-10 of the same run, or Continue resuming
## mid-run all see the exact same shuffle the run started with). Only a
## fresh run (no order yet) actually rolls one, using that level's own rng
## so it respects seed_value when one's set.
func ensure_boss_order(rng: RandomNumberGenerator) -> void:
	if not _boss_order.is_empty():
		return
	_boss_order = BossRoster.shuffled_order(rng)
	_save()


## Called by DungeonGenerator the moment any level starts — every level
## re-saves itself as the resume point, so quitting mid-level and choosing
## Continue later resumes at that level's own start (a freshly-generated
## dungeon, not mid-dungeon state; the lazy room generation has nothing
## durable to resume into below the level boundary).
func save_run_progress(level_path: String, character_id: int) -> void:
	_current_level_path = level_path
	_current_character_id = character_id
	if _session_start_time < 0.0:
		_session_start_time = Time.get_unix_time_from_system()
	_save()


## Called when a run ends without completing the final trial (see
## DeathScreen) — there's nothing left to Continue into, so the saved
## resume point is cleared rather than left pointing at a level whose
## in-progress dungeon no longer exists.
func clear_run_progress() -> void:
	_current_level_path = ""
	_current_character_id = -1
	_boss_order = []
	_run_elapsed_seconds = 0.0
	_session_start_time = -1.0
	_save()


## Called when a run ends in victory (the current final boss of whatever
## content is unlocked is defeated). Grants the next locked character in
## sequence, or — once all five are unlocked — a relic-tier reward instead,
## so there is always a next thing to play for. Also clears the resume
## point: the run that just ended has nothing left to Continue into,
## exactly like a loss does.
func complete_run() -> String:
	# Captured before clear_run_progress() wipes _current_character_id —
	# same ordering footgun as the elapsed timer (see the class docstring):
	# clear_run_progress() runs first and resets it to -1.
	var completed_character_id := _current_character_id

	clear_run_progress()
	_total_victories += 1
	_victories_by_character[completed_character_id] = _victories_by_character.get(completed_character_id, 0) + 1

	for candidate in [CharacterId.PALADIN, CharacterId.CLERIC, CharacterId.MONK, CharacterId.EXORCIST, CharacterId.PROPHET]:
		if not _unlocked_characters.has(candidate):
			_unlocked_characters[candidate] = true
			_save()
			return "%s has answered the call." % CharacterId.name_of(candidate)

	var relic_name := "Relic of the %d Trial" % (_unlocked_relics.size() + 1)
	_unlocked_relics.append(relic_name)
	_save()
	return "%s is yours." % relic_name


## Wipes every kind of persisted state this class tracks — meta-progression
## (unlocks, tutorial-seen), lifetime totals, and the current run's resume
## point — back to a brand-new save's defaults. Irreversible; callers
## (MainMenuScreen's Reset Progress button) are responsible for confirming
## with the player first, this doesn't ask twice.
func reset_all() -> void:
	_unlocked_characters = {CharacterId.PALADIN: true}
	_unlocked_relics = []
	_total_deaths = 0
	_total_victories = 0
	_victories_by_character = {}
	_tutorial_seen = false
	_current_level_path = ""
	_current_character_id = -1
	_boss_order = []
	_run_elapsed_seconds = 0.0
	_session_start_time = -1.0
	_save()


## Folds whatever's accumulated since the session last started ticking
## into the banked total, then restarts the anchor from now — called at
## the top of every _save() so the persisted value is never more than one
## save cycle behind the live one run_elapsed_seconds() reports.
func _sync_run_elapsed() -> void:
	if _session_start_time < 0.0:
		return
	var now := Time.get_unix_time_from_system()
	_run_elapsed_seconds += now - _session_start_time
	_session_start_time = now


func _save() -> void:
	_sync_run_elapsed()

	var config := ConfigFile.new()
	config.set_value("progress", "characters", _unlocked_characters.keys())
	config.set_value("progress", "relics", _unlocked_relics)
	config.set_value("progress", "total_deaths", _total_deaths)
	config.set_value("progress", "total_victories", _total_victories)
	config.set_value("progress", "victories_by_character", _victories_by_character)
	config.set_value("progress", "tutorial_seen", _tutorial_seen)
	config.set_value("run", "level_path", _current_level_path)
	config.set_value("run", "character_id", _current_character_id)
	config.set_value("run", "boss_order", _boss_order)
	config.set_value("run", "elapsed_seconds", _run_elapsed_seconds)
	config.save(_save_path)


func _load() -> void:
	var config := ConfigFile.new()
	if config.load(_save_path) != OK:
		return

	var characters = config.get_value("progress", "characters", [])
	for id in characters:
		_unlocked_characters[id] = true

	var relics = config.get_value("progress", "relics", [])
	for relic in relics:
		_unlocked_relics.append(relic)

	_total_deaths = config.get_value("progress", "total_deaths", 0)
	_total_victories = config.get_value("progress", "total_victories", 0)
	_victories_by_character = config.get_value("progress", "victories_by_character", {})
	_tutorial_seen = config.get_value("progress", "tutorial_seen", false)

	_current_level_path = config.get_value("run", "level_path", "")
	_current_character_id = config.get_value("run", "character_id", -1)

	var order = config.get_value("run", "boss_order", [])
	_boss_order = []
	for index in order:
		_boss_order.append(index)

	_run_elapsed_seconds = config.get_value("run", "elapsed_seconds", 0.0)
	_session_start_time = -1.0
