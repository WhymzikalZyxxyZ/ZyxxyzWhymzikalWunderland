class_name GluttonyBoss
extends SinBoss
## Trial IV. Devours the nearest broken rock in the room to heal itself
## instead of striking the player — Gluttony would rather consume the
## room than fight for its meal. Only attacks directly when there's
## nothing left nearby to eat.

@export var devour_radius: float = 260.0
@export var devour_heal_amount: float = 40.0
@export var no_meal_damage: float = 16.0


func _create_stats() -> Stats:
	return Stats.new(340.0, 0.0, 0.0, 13.0, 8.0)


func _build_sprite() -> Texture2D:
	return CharacterSprites.build_gluttony_boss(Color(0.45, 0.28, 0.08))


func _signature_ready(range_now: float) -> bool:
	return is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now


func _nearest_rock() -> Rock:
	var nearest: Rock = null
	var nearest_distance := INF
	for rock: Rock in Rock.active_rocks:
		if not is_instance_valid(rock):
			continue
		var distance := global_position.distance_to(rock.global_position)
		if distance <= devour_radius and distance < nearest_distance:
			nearest_distance = distance
			nearest = rock
	return nearest


func _resolve_signature(range_now: float) -> void:
	var meal := _nearest_rock()
	if meal != null:
		# Rock.take_damage ignores its amount argument and always removes
		# exactly one hit (see Rock.MAX_HITS) — same convention Paladin's
		# own attacks already follow, so a stubborn rock takes a few
		# devours to fully break, same as it takes a few sword swings.
		meal.take_damage()
		stats.heal(devour_heal_amount)
		print("Gluttony devours a rock and mends itself with it!")
		return

	if is_instance_valid(_tracked_player) and global_position.distance_to(_tracked_player.global_position) <= range_now:
		print("Gluttony finds nothing left to eat — and turns on the player instead.")
		_tracked_player.take_damage(no_meal_damage, global_position)
		_spawn_attack_slash(_tracked_player.global_position, 40.0)
