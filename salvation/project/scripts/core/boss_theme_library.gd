class_name BossThemeLibrary
extends RefCounted
## One hand-composed, looping 8-bit "choir" theme per trial boss, keyed by
## BossRoster's own name strings — build_theme(name) is what
## AudioDirector.play_boss_theme calls, and what makes a level's whole BGM
## the boss's own song (DungeonGenerator triggers it once _boss_info
## resolves, not just during the fight itself).
##
## "Choir" here is the classic 3-channel chiptune trick standing in for
## voices: a melody line and a harmony line (a fixed diatonic interval
## above it, so they move in parallel — the block-chord texture an actual
## chant would have) both on square/triangle waves, over a sustained
## triangle-wave drone an octave below the root. Every theme draws its
## eight-note phrase from PHRYGIAN — a scale with a flattened second degree,
## the classic "dark/sacred" mode (used in a lot of real chant and metal
## alike) — so every boss sounds tonally related without sounding
## identical, and each gets its own root note for variety across the run.
## The phrase repeats PHRASE_REPEATS times to fill a loop of a reasonable
## length, then AudioStreamWAV's native loop_mode (see SoundCanvas.bake)
## handles seamless continuation for as long as the level lasts.

static var _cache: Dictionary = {}

const SAMPLE_RATE := SoundCanvas.DEFAULT_SAMPLE_RATE
const NOTE_DURATION := 0.4
const PHRASE_REPEATS := 8
const HARMONY_INTERVAL := 2 ## steps within PHRYGIAN — a diatonic third above the melody.
const MELODY_VOLUME := 0.16
const HARMONY_VOLUME := 0.12
const DRONE_VOLUME := 0.1

## Semitone offsets from the phrase's root, flattened-second ("Phrygian")
## mode: root, b2, b3, 4, 5, b6, b7, octave.
const PHRYGIAN: Array[int] = [0, 1, 3, 5, 7, 8, 10, 12]

## Each boss's phrase: root (semitones from A4) and an 8-step melody, given
## as indices into PHRYGIAN. Root notes are spread across roughly two
## octaves so no two adjacent trials sound too alike; melodic shape is
## varied per boss's own character (Sloth barely moves, Wrath repeats
## aggressively, the Adversary spans the widest range as the final trial).
const PHRASES := {
	"Pride": {"root": -9, "melody": [0, 2, 4, 2, 0, 3, 1, 0]},
	"Envy": {"root": -4, "melody": [0, 6, 5, 6, 0, 5, 6, 0]},
	"Wrath": {"root": -7, "melody": [0, 3, 0, 3, 4, 3, 1, 0]},
	"Gluttony": {"root": 0, "melody": [0, 1, 0, 1, 3, 1, 0, 0]},
	"Greed": {"root": 3, "melody": [0, 2, 3, 2, 0, 4, 2, 0]},
	"Sloth": {"root": -2, "melody": [0, 0, 1, 0, 0, 3, 1, 0]},
	"Lust": {"root": 5, "melody": [0, 4, 3, 4, 6, 4, 2, 0]},
	"Despair": {"root": -10, "melody": [0, 1, 0, 6, 5, 6, 1, 0]},
	"Doubt": {"root": 2, "melody": [0, 1, 3, 1, 5, 1, 3, 0]},
	"The Adversary": {"root": -12, "melody": [0, 3, 5, 7, 5, 3, 1, 0]},
}

const FALLBACK_PHRASE := {"root": -9, "melody": [0, 2, 3, 2, 0, 4, 2, 0]}


static func _cached(key: String, builder: Callable) -> AudioStreamWAV:
	if not _cache.has(key):
		_cache[key] = builder.call()
	return _cache[key]


static func _freq(semitones_from_a4: int) -> float:
	return 440.0 * pow(2.0, float(semitones_from_a4) / 12.0)


## Builds one voice's full phrase (one PHRASE_REPEATS-times-repeated melody)
## as a single concatenated buffer, offsetting every scale-degree index by
## harmony_steps within PHRYGIAN (wrapping into the next octave once it
## runs past the array, same as real diatonic harmony climbing past the top
## of a scale).
static func _build_voice(root: int, melody: Array, harmony_steps: int, volume: float, waveform: String) -> PackedFloat32Array:
	var voice := PackedFloat32Array()
	for repeat in range(PHRASE_REPEATS):
		for degree_index in melody:
			var shifted_index: int = degree_index + harmony_steps
			var octave_bump: int = (shifted_index / PHRYGIAN.size()) * 12
			var semitone_offset: int = PHRYGIAN[shifted_index % PHRYGIAN.size()] + octave_bump
			var freq := _freq(root + semitone_offset)
			voice.append_array(SoundCanvas.generate_tone(freq, NOTE_DURATION, SAMPLE_RATE, waveform, volume))
	return voice


static func _build_drone(root: int, total_duration: float) -> PackedFloat32Array:
	return SoundCanvas.generate_tone(_freq(root - 12), total_duration, SAMPLE_RATE, "triangle", DRONE_VOLUME)


static func _compose(phrase: Dictionary) -> AudioStreamWAV:
	var root: int = phrase["root"]
	var melody: Array = phrase["melody"]

	var melody_voice := _build_voice(root, melody, 0, MELODY_VOLUME, "square")
	var harmony_voice := _build_voice(root, melody, HARMONY_INTERVAL, HARMONY_VOLUME, "triangle")
	var total_duration: float = NOTE_DURATION * melody.size() * PHRASE_REPEATS
	var drone_voice := _build_drone(root, total_duration)

	var mixed := SoundCanvas.mix([melody_voice, harmony_voice, drone_voice])
	return SoundCanvas.bake(mixed, SAMPLE_RATE, true)


## The stream AudioDirector.play_boss_theme() actually plays — cached by
## boss name, so switching back and forth (shouldn't normally happen mid-
## level, but harmless if it did) never rebuilds the same theme twice.
## Falls back to a generic phrase for a name outside PHRASES rather than
## erroring, since the ten real levels are the only intended callers but
## nothing enforces that at the type level.
static func build_theme(boss_name: String) -> AudioStreamWAV:
	return _cached("theme:%s" % boss_name, func() -> AudioStreamWAV:
		var phrase: Dictionary = PHRASES.get(boss_name, FALLBACK_PHRASE)
		return _compose(phrase)
	)
