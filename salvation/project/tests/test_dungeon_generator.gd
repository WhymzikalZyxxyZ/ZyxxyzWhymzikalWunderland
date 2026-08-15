extends GutTest
## Exercises the pure graph-building logic (build_corridor/normalize_edge/
## compute_distances) directly. These only touch Vector2i (a struct) and
## plain collections, so there's nothing scene-tree-dependent about them —
## they're here rather than in a separate plain-script test purely because
## GDScript doesn't have an equivalent split to Salvation.Tests vs GoDotTest;
## GUT covers both cleanly since GDScript has no CLR to corrupt.


func test_build_corridor_starts_at_start() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 1

	var path := DungeonGenerator.build_corridor(Vector2i.ZERO, rng)

	assert_eq(path[0], Vector2i.ZERO)


func test_build_corridor_never_takes_a_diagonal_or_zero_step() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 2

	var path := DungeonGenerator.build_corridor(Vector2i.ZERO, rng)

	for i in range(path.size() - 1):
		var delta: Vector2i = path[i + 1] - path[i]
		var manhattan: int = absi(delta.x) + absi(delta.y)
		assert_eq(manhattan, 1)


func test_build_corridor_never_revisits_a_cell() -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = 3

	var path := DungeonGenerator.build_corridor(Vector2i.ZERO, rng)

	var seen := {}
	for cell in path:
		assert_false(seen.has(cell), "Corridor revisited %s" % cell)
		seen[cell] = true


func test_build_corridor_is_never_longer_than_the_guaranteed_boss_room() -> void:
	# BOSS_CHANCE_DENOMINATOR-th room after the start is a guaranteed boss
	# roll (chance == 1.0), so the corridor — start plus however many rooms
	# got placed — can never exceed that across any seed.
	for seed in range(1, 60):
		var rng := RandomNumberGenerator.new()
		rng.seed = seed

		var path := DungeonGenerator.build_corridor(Vector2i.ZERO, rng)

		assert_lte(path.size() - 1, DungeonGenerator.BOSS_CHANCE_DENOMINATOR, "seed=%d" % seed)


func test_build_corridor_boss_chance_is_guaranteed_by_the_sixth_room() -> void:
	# A dishonest RNG that always reports "miss" up until the roll where
	# chance hits 1.0 proves the guarantee holds structurally, not just
	# statistically across enough seeds.
	var rng := RandomNumberGenerator.new()
	rng.seed = 42

	var path := DungeonGenerator.build_corridor(Vector2i.ZERO, rng)

	assert_lte(path.size() - 1, DungeonGenerator.BOSS_CHANCE_DENOMINATOR)
	assert_gte(path.size(), 2, "The corridor should place at least one room past the start.")


func test_normalize_edge_is_order_independent() -> void:
	var a := Vector2i(1, 2)
	var b := Vector2i(3, 4)

	var edge_ab := DungeonGenerator.normalize_edge(a, b)
	var edge_ba := DungeonGenerator.normalize_edge(b, a)

	assert_eq(edge_ab[0], edge_ba[0])
	assert_eq(edge_ab[1], edge_ba[1])


func test_compute_distances_start_is_zero_and_grows_by_one_per_hop() -> void:
	var cells: Array[Vector2i] = [Vector2i(0, 0), Vector2i(1, 0), Vector2i(2, 0)]
	var edges: Array[Array] = [
		[Vector2i(0, 0), Vector2i(1, 0)],
		[Vector2i(1, 0), Vector2i(2, 0)],
	]

	var distances := DungeonGenerator.compute_distances(Vector2i(0, 0), cells, edges)

	assert_eq(distances[Vector2i(0, 0)], 0)
	assert_eq(distances[Vector2i(1, 0)], 1)
	assert_eq(distances[Vector2i(2, 0)], 2)
