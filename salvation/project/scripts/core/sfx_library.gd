class_name SfxLibrary
extends RefCounted
## Short procedurally-synthesized 8-bit SFX blips, built via SoundCanvas —
## same _cached(key, builder) static-Dictionary shape CharacterSprites/
## EnvironmentArt already use for textures, just returning AudioStreamWAV
## instead of Texture2D. Every build_*() takes no arguments (unlike the
## sprite libraries, nothing here is parametrized per-caller), so each key
## is just its own function name.

static var _cache: Dictionary = {}

const SAMPLE_RATE := SoundCanvas.DEFAULT_SAMPLE_RATE


static func _cached(key: String, builder: Callable) -> AudioStreamWAV:
	if not _cache.has(key):
		_cache[key] = builder.call()
	return _cache[key]


## A short frequency sweep, approximated as a handful of very short tones
## stepping from freq_start to freq_end — SoundCanvas.generate_tone is
## single-frequency by design (kept simple/directly testable), so a sweep
## is composed here rather than adding sweep support to the primitive
## itself.
static func _sweep(freq_start: float, freq_end: float, duration: float, waveform: String, volume: float, steps: int = 6) -> PackedFloat32Array:
	var result := PackedFloat32Array()
	var step_duration: float = duration / float(steps)
	for i in range(steps):
		var t: float = float(i) / float(maxi(1, steps - 1))
		var freq: float = lerpf(freq_start, freq_end, t)
		result.append_array(SoundCanvas.generate_tone(freq, step_duration, SAMPLE_RATE, waveform, volume))
	return result


## The player's basic-attack swing — a quick downward square sweep, read as
## a "swish" rather than a tone.
static func build_attack() -> AudioStreamWAV:
	return _cached("attack", func() -> AudioStreamWAV:
		var samples := _sweep(700.0, 350.0, 0.12, "square", 0.22)
		return SoundCanvas.bake(samples, SAMPLE_RATE)
	)


## A non-critical hit landing — a low thump under a short noise burst.
static func build_hit() -> AudioStreamWAV:
	return _cached("hit", func() -> AudioStreamWAV:
		var thump := SoundCanvas.generate_tone(150.0, 0.08, SAMPLE_RATE, "square", 0.22)
		var burst := SoundCanvas.generate_tone(0.0, 0.08, SAMPLE_RATE, "noise", 0.12)
		return SoundCanvas.bake(SoundCanvas.mix([thump, burst]), SAMPLE_RATE)
	)


## A critical hit — the same shape as build_hit but sharper, louder, and
## pitched up, plus a short high triangle "sparkle" layered on top so a
## crit reads as distinct at a glance-of-the-ear, not just louder.
static func build_crit() -> AudioStreamWAV:
	return _cached("crit", func() -> AudioStreamWAV:
		var sweep := _sweep(900.0, 300.0, 0.14, "square", 0.3)
		var sparkle := SoundCanvas.generate_tone(1400.0, 0.06, SAMPLE_RATE, "triangle", 0.18)
		return SoundCanvas.bake(SoundCanvas.mix([sweep, sparkle]), SAMPLE_RATE)
	)


## A pickup (health/magic/item) — two quick ascending notes, the classic
## "collected something" chime.
static func build_pickup() -> AudioStreamWAV:
	return _cached("pickup", func() -> AudioStreamWAV:
		var samples := PackedFloat32Array()
		samples.append_array(SoundCanvas.generate_tone(523.25, 0.08, SAMPLE_RATE, "square", 0.2))
		samples.append_array(SoundCanvas.generate_tone(783.99, 0.1, SAMPLE_RATE, "square", 0.2))
		return SoundCanvas.bake(samples, SAMPLE_RATE)
	)


## A Magic cast — a shimmering ascending triangle sweep, distinct in both
## waveform and direction from the plain (square, descending) attack swing.
static func build_magic() -> AudioStreamWAV:
	return _cached("magic", func() -> AudioStreamWAV:
		var samples := _sweep(440.0, 900.0, 0.16, "triangle", 0.2)
		return SoundCanvas.bake(samples, SAMPLE_RATE)
	)


## A dash — a quick upward pulse sweep, narrower duty cycle than the
## square-wave attack so it reads thinner/faster.
static func build_dash() -> AudioStreamWAV:
	return _cached("dash", func() -> AudioStreamWAV:
		var samples := _sweep(300.0, 620.0, 0.1, "pulse", 0.2)
		return SoundCanvas.bake(samples, SAMPLE_RATE)
	)


## A successful parry — two close triangle frequencies beating against each
## other for a bright, metallic "ping" rather than a plain single tone.
static func build_parry() -> AudioStreamWAV:
	return _cached("parry", func() -> AudioStreamWAV:
		var a := SoundCanvas.generate_tone(900.0, 0.16, SAMPLE_RATE, "triangle", 0.22)
		var b := SoundCanvas.generate_tone(905.0, 0.16, SAMPLE_RATE, "triangle", 0.22)
		return SoundCanvas.bake(SoundCanvas.mix([a, b]), SAMPLE_RATE)
	)


## An enemy (or Rock) dying/breaking — a longer, lower descending sweep
## than a plain hit, read as something actually ending rather than just
## being struck.
static func build_enemy_death() -> AudioStreamWAV:
	return _cached("enemy_death", func() -> AudioStreamWAV:
		var samples := _sweep(400.0, 90.0, 0.25, "square", 0.22)
		return SoundCanvas.bake(samples, SAMPLE_RATE)
	)


## The player taking damage — harsher and lower than an enemy's hit sound,
## noise-heavy so it reads as painful rather than a plain blip.
static func build_player_hurt() -> AudioStreamWAV:
	return _cached("player_hurt", func() -> AudioStreamWAV:
		var thump := SoundCanvas.generate_tone(180.0, 0.15, SAMPLE_RATE, "square", 0.26)
		var burst := SoundCanvas.generate_tone(0.0, 0.15, SAMPLE_RATE, "noise", 0.16)
		return SoundCanvas.bake(SoundCanvas.mix([thump, burst]), SAMPLE_RATE)
	)


## A boss falling — a short rising three-note arpeggio, deliberately more
## triumphant/longer than the plain enemy_death sweep.
static func build_boss_defeat() -> AudioStreamWAV:
	return _cached("boss_defeat", func() -> AudioStreamWAV:
		var samples := PackedFloat32Array()
		samples.append_array(SoundCanvas.generate_tone(440.0, 0.14, SAMPLE_RATE, "square", 0.26))
		samples.append_array(SoundCanvas.generate_tone(554.37, 0.14, SAMPLE_RATE, "square", 0.26))
		samples.append_array(SoundCanvas.generate_tone(659.25, 0.22, SAMPLE_RATE, "square", 0.28))
		return SoundCanvas.bake(samples, SAMPLE_RATE)
	)
