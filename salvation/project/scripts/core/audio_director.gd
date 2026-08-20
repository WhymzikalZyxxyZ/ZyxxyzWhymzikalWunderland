extends Node
## Owns actual playback nodes — unlike SoundCanvas/SfxLibrary/
## BossThemeLibrary (all static RefCounted resource *builders*), something
## has to actually hold AudioStreamPlayers and be a real Node in the tree,
## same reason GameSettings/RunProgress are Node autoloads and not
## RefCounted. Registered as an autoload (see project.godot) so every scene
## reaches it as "AudioDirector".
##
## Creates its own "SFX" and "Music" buses at startup rather than requiring
## a hand-authored default_bus_layout.tres, and routes both to send into
## "Master" — GameSettings' existing master-volume slider (see
## GameSettings._apply_master_volume) already attenuates/mutes "Master",
## so it keeps controlling everything here with zero changes needed there.

const SFX_BUS := "SFX"
const MUSIC_BUS := "Music"
const SFX_PLAYER_POOL_SIZE := 4

var _sfx_players: Array[AudioStreamPlayer] = []
var _next_sfx_player: int = 0
var _music_player: AudioStreamPlayer
var _current_boss_theme_name: String = ""


func _ready() -> void:
	_ensure_bus(SFX_BUS)
	_ensure_bus(MUSIC_BUS)

	for i in range(SFX_PLAYER_POOL_SIZE):
		var player := AudioStreamPlayer.new()
		player.bus = SFX_BUS
		add_child(player)
		_sfx_players.append(player)

	_music_player = AudioStreamPlayer.new()
	_music_player.bus = MUSIC_BUS
	add_child(_music_player)


## Idempotent: does nothing if a bus of this name already exists (e.g. a
## second AudioDirector instance in a test, or re-entering a scene that
## doesn't tear the autoload down). New buses default to sending into
## "Master" already, so no explicit AudioServer.set_bus_send call is needed.
static func _ensure_bus(bus_name: String) -> void:
	if AudioServer.get_bus_index(bus_name) >= 0:
		return
	var index := AudioServer.bus_count
	AudioServer.add_bus(index)
	AudioServer.set_bus_name(index, bus_name)


## Round-robins across a small pool of players so two overlapping hits
## don't cut each other off the way a single shared player would.
func play_sfx(stream: AudioStreamWAV) -> void:
	if stream == null or _sfx_players.is_empty():
		return
	var player := _sfx_players[_next_sfx_player]
	_next_sfx_player = (_next_sfx_player + 1) % _sfx_players.size()
	player.stream = stream
	player.play()


## Swaps in and starts the given boss's theme — a no-op if it's already
## playing (DungeonGenerator calls this once per level at _ready(), and
## re-triggering the identical stream would restart it from the top for no
## reason). Called with the boss's own name so BossThemeLibrary can key its
## cache by it directly.
func play_boss_theme(boss_name: String) -> void:
	if _music_player == null or boss_name == _current_boss_theme_name:
		return
	_current_boss_theme_name = boss_name
	_music_player.stream = BossThemeLibrary.build_theme(boss_name)
	_music_player.play()


func stop_music() -> void:
	_current_boss_theme_name = ""
	if _music_player != null:
		_music_player.stop()
