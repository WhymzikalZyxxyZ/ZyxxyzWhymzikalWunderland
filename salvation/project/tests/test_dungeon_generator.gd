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


func test_three_row_fan_always_converges_on_the_boss_with_exactly_three_edges() -> void:
	# Reproduces exactly what DungeonGenerator._ready() builds (three paths,
	# one per row, sharing an early trunk before forking) and checks the
	# property players actually experience: the boss room ends up with one
	# door per route, for every possible branch column.
	var start := Vector2i(0, 1)
	var boss := Vector2i(4, 1)

	for branch_column in range(1, 4):
		var edges: Array[Array] = []

		for row in range(3):
			var path := DungeonGenerator.build_l_path(start, Vector2i(branch_column, row), boss)
			for i in range(path.size() - 1):
				var edge := DungeonGenerator.normalize_edge(path[i], path[i + 1])
				var already_present := false
				for e in edges:
					if e[0] == edge[0] and e[1] == edge[1]:
						already_present = true
						break
				if not already_present:
					edges.append(edge)

		var boss_edge_count := 0
		for edge in edges:
			if edge[0] == boss or edge[1] == boss:
				boss_edge_count += 1

		assert_eq(boss_edge_count, 3, "branch_column=%d" % branch_column)
