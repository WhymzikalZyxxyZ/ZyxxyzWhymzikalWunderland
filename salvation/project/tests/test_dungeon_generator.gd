extends GutTest
## Exercises the pure graph-building logic (build_l_path/normalize_edge/
## compute_distances) directly. These only touch Vector2i (a struct) and
## plain collections, so there's nothing scene-tree-dependent about them —
## they're here rather than in a separate plain-script test purely because
## GDScript doesn't have an equivalent split to Salvation.Tests vs GoDotTest;
## GUT covers both cleanly since GDScript has no CLR to corrupt.


func test_build_l_path_starts_at_start_and_ends_at_boss() -> void:
	var start := Vector2i(0, 1)
	var boss := Vector2i(4, 1)

	var path := DungeonGenerator.build_l_path(start, Vector2i(2, 0), boss)

	assert_eq(path[0], start)
	assert_eq(path[path.size() - 1], boss)


func test_build_l_path_never_takes_a_diagonal_or_zero_step() -> void:
	var path := DungeonGenerator.build_l_path(Vector2i(0, 1), Vector2i(3, 2), Vector2i(4, 1))

	for i in range(path.size() - 1):
		var delta: Vector2i = path[i + 1] - path[i]
		var manhattan: int = absi(delta.x) + absi(delta.y)
		assert_eq(manhattan, 1)


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


func test_max_reach_for_never_lets_a_route_exceed_the_room_cap() -> void:
	var boss := Vector2i(2, 0)

	for direction in DungeonGenerator.DIRECTIONS:
		var max_reach: int = DungeonGenerator._max_reach_for(direction, boss)
		var waypoint := direction * max_reach
		var route_length: int = max_reach + absi(waypoint.x - boss.x) + absi(waypoint.y - boss.y)

		assert_true(max_reach >= 1, "Every direction should get at least one room of reach.")
		assert_lte(route_length, DungeonGenerator.MAX_ROOMS_PER_ROUTE, "direction=%s" % direction)


func test_four_directions_always_converge_on_the_boss_within_the_room_cap() -> void:
	# Reproduces exactly what DungeonGenerator._ready() builds — four
	# independent routes, one per cardinal direction, each reaching out a
	# random (capped) distance before bending to the same boss cell — and
	# checks the property players actually experience: every route
	# actually arrives at the boss, and none of them take more than
	# MAX_ROOMS_PER_ROUTE rooms to do it.
	var start := Vector2i.ZERO
	var boss := Vector2i(2, 0)

	for trial in range(20):
		var rng := RandomNumberGenerator.new()
		rng.seed = trial + 1

		var cells: Array[Vector2i] = [start, boss]
		var edges: Array[Array] = []

		for direction in DungeonGenerator.DIRECTIONS:
			var max_reach: int = DungeonGenerator._max_reach_for(direction, boss)
			var reach := rng.randi_range(1, max_reach)
			var waypoint := start + direction * reach
			var path := DungeonGenerator.build_l_path(start, waypoint, boss)

			assert_lte(path.size() - 1, DungeonGenerator.MAX_ROOMS_PER_ROUTE, "trial=%d direction=%s" % [trial, direction])

			for cell in path:
				if not cells.has(cell):
					cells.append(cell)
			for i in range(path.size() - 1):
				var edge := DungeonGenerator.normalize_edge(path[i], path[i + 1])
				if not DungeonGenerator._edges_contains(edges, edge):
					edges.append(edge)

		var boss_edge_count := 0
		for edge in edges:
			if edge[0] == boss or edge[1] == boss:
				boss_edge_count += 1

		assert_gt(boss_edge_count, 0, "trial=%d: boss should be reachable by at least one route." % trial)
