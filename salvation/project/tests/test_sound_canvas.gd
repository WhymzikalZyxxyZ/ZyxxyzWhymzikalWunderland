extends GutTest
## SoundCanvas is pure/static (see PixelCanvas for the analogous texture-
## side tests) — sample counts, waveform sanity, and bake() producing a
## correctly-shaped AudioStreamWAV, all checkable without any node in the
## tree.

const SAMPLE_RATE := 22050


func test_generate_tone_produces_the_expected_sample_count() -> void:
	var samples := SoundCanvas.generate_tone(440.0, 0.5, SAMPLE_RATE, "square", 0.2)

	assert_eq(samples.size(), roundi(0.5 * SAMPLE_RATE))


func test_generate_tone_with_zero_duration_is_empty() -> void:
	var samples := SoundCanvas.generate_tone(440.0, 0.0, SAMPLE_RATE, "square", 0.2)

	assert_true(samples.is_empty())


func test_generate_tone_never_exceeds_the_requested_volume() -> void:
	var samples := SoundCanvas.generate_tone(440.0, 0.3, SAMPLE_RATE, "square", 0.4)

	for sample in samples:
		assert_lte(absf(sample), 0.4 + 0.001, "No sample should exceed the requested volume (envelope only ever attenuates).")


func test_generate_tone_fades_in_from_silence_at_the_very_first_sample() -> void:
	var samples := SoundCanvas.generate_tone(440.0, 0.3, SAMPLE_RATE, "square", 0.4)

	assert_almost_eq(samples[0], 0.0, 0.05, "The attack envelope should start at (or very near) silence, not a full-volume click.")


func test_generate_tone_is_deterministic_for_identical_arguments() -> void:
	var a := SoundCanvas.generate_tone(300.0, 0.2, SAMPLE_RATE, "noise", 0.3)
	var b := SoundCanvas.generate_tone(300.0, 0.2, SAMPLE_RATE, "noise", 0.3)

	assert_eq(a, b, "Even the noise waveform should be reproducible — SfxLibrary/BossThemeLibrary caching depends on determinism.")


func test_generate_silence_is_all_zero() -> void:
	var samples := SoundCanvas.generate_silence(0.1, SAMPLE_RATE)

	assert_eq(samples.size(), roundi(0.1 * SAMPLE_RATE))
	for sample in samples:
		assert_eq(sample, 0.0)


func test_mix_sums_overlapping_voices() -> void:
	var a := PackedFloat32Array([0.1, 0.1, 0.1])
	var b := PackedFloat32Array([0.2, 0.2, 0.2])

	var mixed := SoundCanvas.mix([a, b])

	assert_eq(mixed.size(), 3)
	for sample in mixed:
		assert_almost_eq(sample, 0.3, 0.001)


func test_mix_clamps_to_avoid_exceeding_full_scale() -> void:
	var a := PackedFloat32Array([0.9])
	var b := PackedFloat32Array([0.9])

	var mixed := SoundCanvas.mix([a, b])

	assert_eq(mixed[0], 1.0)


func test_mix_pads_shorter_voices_with_silence() -> void:
	var short := PackedFloat32Array([0.5])
	var long := PackedFloat32Array([0.1, 0.1, 0.1])

	var mixed := SoundCanvas.mix([short, long])

	assert_eq(mixed.size(), 3)
	assert_almost_eq(mixed[0], 0.6, 0.001)
	assert_almost_eq(mixed[1], 0.1, 0.001)


func test_bake_produces_a_correctly_shaped_stream() -> void:
	var samples := SoundCanvas.generate_tone(440.0, 0.1, SAMPLE_RATE, "square", 0.2)

	var stream := SoundCanvas.bake(samples, SAMPLE_RATE)

	assert_not_null(stream)
	assert_eq(stream.mix_rate, SAMPLE_RATE)
	assert_eq(stream.format, AudioStreamWAV.FORMAT_16_BITS)
	assert_eq(stream.data.size(), samples.size() * 2, "16-bit PCM should be exactly 2 bytes per sample.")
	assert_eq(stream.loop_mode, AudioStreamWAV.LOOP_DISABLED)


func test_bake_with_loop_true_enables_forward_looping_across_the_whole_buffer() -> void:
	var samples := SoundCanvas.generate_tone(440.0, 0.1, SAMPLE_RATE, "square", 0.2)

	var stream := SoundCanvas.bake(samples, SAMPLE_RATE, true)

	assert_eq(stream.loop_mode, AudioStreamWAV.LOOP_FORWARD)
	assert_eq(stream.loop_begin, 0)
	assert_eq(stream.loop_end, samples.size())
