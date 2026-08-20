class_name SoundCanvas
extends RefCounted
## The audio analog of PixelCanvas (see pixel_canvas.gd): low-level
## primitives for building a raw sample buffer, plus a bake() that wraps
## the result as an engine resource — there it's an Image -> ImageTexture,
## here it's a PackedFloat32Array -> AudioStreamWAV. SfxLibrary and
## BossThemeLibrary are the two-tier callers, same relationship
## CharacterSprites/EnvironmentArt have to PixelCanvas.
##
## A "voice" here is just a plain PackedFloat32Array of samples in [-1, 1]
## — build one by repeatedly calling generate_tone()/generate_silence() and
## appending the results (PackedFloat32Array.append_array), the same way a
## melody is a sequence of notes and rests. Multiple simultaneous voices
## (e.g. a chord, or a melody over a drone) are combined with mix().

const DEFAULT_SAMPLE_RATE := 22050


## One note (or a single SFX blip): duration seconds of waveform at freq,
## with a short linear attack/decay envelope so notes don't click at their
## edges. waveform is one of "square", "pulse", "triangle", "noise" — the
## classic chiptune channel types. duty only matters for "pulse" (the
## fraction of each cycle spent high; "square" is always a fixed 50%).
static func generate_tone(
	freq: float,
	duration: float,
	sample_rate: int = DEFAULT_SAMPLE_RATE,
	waveform: String = "square",
	volume: float = 0.25,
	duty: float = 0.5
) -> PackedFloat32Array:
	var total_samples := maxi(0, roundi(duration * sample_rate))
	var samples := PackedFloat32Array()
	samples.resize(total_samples)
	if total_samples == 0:
		return samples

	var envelope_samples := mini(total_samples / 2, maxi(1, roundi(0.006 * sample_rate)))
	var rng := RandomNumberGenerator.new()
	rng.seed = hash("%f:%f:%s" % [freq, duration, waveform])

	for i in range(total_samples):
		var t: float = float(i) / float(sample_rate)
		var raw: float = 0.0
		match waveform:
			"square":
				raw = 1.0 if sin(TAU * freq * t) >= 0.0 else -1.0
			"pulse":
				var phase: float = fmod(freq * t, 1.0)
				raw = 1.0 if phase < duty else -1.0
			"triangle":
				raw = (2.0 / PI) * asin(sin(TAU * freq * t))
			"noise":
				raw = rng.randf_range(-1.0, 1.0)
			_:
				raw = sin(TAU * freq * t)

		var envelope: float = 1.0
		if i < envelope_samples:
			envelope = float(i) / float(envelope_samples)
		elif i >= total_samples - envelope_samples:
			envelope = float(total_samples - i) / float(envelope_samples)

		samples[i] = clampf(raw * volume * envelope, -1.0, 1.0)

	return samples


static func generate_silence(duration: float, sample_rate: int = DEFAULT_SAMPLE_RATE) -> PackedFloat32Array:
	var samples := PackedFloat32Array()
	samples.resize(maxi(0, roundi(duration * sample_rate)))
	return samples


## Additive layering of simultaneous voices (e.g. two choir voices plus a
## drone) — sums sample-for-sample, clamped to [-1, 1] so several loud
## voices at once can't wrap/distort. Voices of different lengths are
## padded with silence at the end to the longest one, rather than requiring
## every caller to pre-pad its own arrays to match.
static func mix(voices: Array) -> PackedFloat32Array:
	var total_length := 0
	for voice in voices:
		var v: PackedFloat32Array = voice
		total_length = maxi(total_length, v.size())

	var mixed := PackedFloat32Array()
	mixed.resize(total_length)

	for voice in voices:
		var v: PackedFloat32Array = voice
		for i in range(v.size()):
			mixed[i] = clampf(mixed[i] + v[i], -1.0, 1.0)

	return mixed


## Terminal step: float samples in [-1, 1] -> 16-bit PCM -> AudioStreamWAV,
## mirroring PixelCanvas.bake wrapping a drawn Image as an ImageTexture.
## loop enables seamless native looping (AudioDirector relies on this for
## boss themes rather than manually re-triggering playback).
static func bake(samples: PackedFloat32Array, sample_rate: int = DEFAULT_SAMPLE_RATE, loop: bool = false) -> AudioStreamWAV:
	var bytes := PackedByteArray()
	bytes.resize(samples.size() * 2)
	for i in range(samples.size()):
		var clamped: float = clampf(samples[i], -1.0, 1.0)
		var value: int = roundi(clamped * 32767.0)
		bytes.encode_s16(i * 2, value)

	var stream := AudioStreamWAV.new()
	stream.data = bytes
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = sample_rate
	stream.stereo = false
	if loop and samples.size() > 0:
		stream.loop_mode = AudioStreamWAV.LOOP_FORWARD
		stream.loop_begin = 0
		stream.loop_end = samples.size()
	return stream
