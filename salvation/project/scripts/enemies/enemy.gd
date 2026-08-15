class_name Enemy
extends CharacterBody2D
## Base enemy: chases the nearest player, deals contact damage, and dies
## when stats.health hits zero. Tracked via a hand-kept registry.
## Concrete enemies override _create_stats and can override _chase for
## non-chase movement patterns.

static var active_enemies: Array[Enemy] = []

@export var contact_damage: float = 8.0
@export var contact_damage_cooldown: float = 1.0

## Marks this enemy for the boss health bar UI. Rank-and-file enemies leave this false.
@export var is_boss: bool = false
@export var display_name: String = ""

## Only meaningful when is_boss is true — shown on the victory screen as a
## hint of what's coming, not a reward screen that treats the run as over.
@export var next_boss_name: String = ""
@export var victory_screen_path: String = "res://scenes/ui/victory_screen.tscn"

## Only meaningful when is_boss is true. Scene VictoryScreen actually
## continues into once dismissed — empty means this is the final trial, so
## VictoryScreen grants a run-completion reward and returns to the title
## screen instead of trying to load a level that doesn't exist.
@export var next_level_scene_path: String = ""

@export var hit_flash_duration: float = 0.08
@export var knockback_force: float = 260.0
@export var knockback_duration: float = 0.12

var stats: Stats

var health_ratio: float:
	get: return stats.health / stats.max_health if stats.max_health > 0.0 else 0.0

var _contact_damage_cooldown_remaining: float = 0.0

## Not private (underscore-free) so subclasses (e.g. PrideBoss) can drive their own modulate effects like attack telegraphs.
var sprite: Sprite2D

var _hit_flash_remaining: float = 0.0
var _knockback_remaining: float = 0.0
var _knockback_velocity: Vector2 = Vector2.ZERO


## See PlayerController.ACTOR_Z_INDEX — same reasoning, kept as its own
## constant since Enemy and PlayerController don't share a base class.
const ACTOR_Z_INDEX := 10


func _ready() -> void:
	active_enemies.append(self)
	stats = _create_stats()
	z_index = ACTOR_Z_INDEX
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING

	var texture := _build_sprite()
	if texture != null:
		sprite = Sprite2D.new()
		sprite.name = "Sprite2D"
		sprite.texture = texture
		sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(sprite)


## Concrete enemies return their pixel-art texture (see CharacterSprites). Base has none.
func _build_sprite() -> Texture2D:
	return null


func _exit_tree() -> void:
	active_enemies.erase(self)


## Guards against a player dying and being freed between when a caller last checked and now.
static func is_alive_player(player: PlayerController) -> bool:
	return player != null and is_instance_valid(player)


func _create_stats() -> Stats:
	return Stats.new(40.0, 0.0, 90.0, 6.0, 2.0)


func _physics_process(delta: float) -> void:
	_chase()
	move_and_slide()

	if _hit_flash_remaining > 0.0:
		_hit_flash_remaining -= delta
		if sprite != null:
			sprite.modulate = Color(1.8, 1.8, 1.8) if _hit_flash_remaining > 0.0 else Color.WHITE

	if _knockback_remaining > 0.0:
		_knockback_remaining -= delta

	_contact_damage_cooldown_remaining -= delta
	if _contact_damage_cooldown_remaining > 0.0:
		return

	for i in range(get_slide_collision_count()):
		var collider := get_slide_collision(i).get_collider()
		if not (collider is PlayerController) or not is_alive_player(collider):
			continue

		collider.take_damage(contact_damage, global_position)
		_spawn_attack_slash(collider.global_position, 28.0)
		_contact_damage_cooldown_remaining = contact_damage_cooldown
		break


## Basic pixel-level attack feedback for enemies — same sweeping-crescent
## effect the player's own attacks use (see PlayerController._spawn_attack_slash),
## tinted red so an enemy's strike always reads as distinct from the
## player's own white/neutral one at a glance. target_position picks the
## facing angle; concrete attacks (contact damage here, Pride's mirror and
## base attack in pride_boss.gd) each call this at the moment damage lands.
func _spawn_attack_slash(target_position: Vector2, swing_radius: float) -> void:
	if get_parent() == null:
		return

	var facing := global_position.direction_to(target_position).angle()
	var slash := AttackSlash.new()
	slash.texture = CharacterSprites.build_slash()
	slash.pivot = self
	slash.facing_angle = facing
	slash.radius = swing_radius
	slash.global_position = global_position + Vector2.RIGHT.rotated(facing) * swing_radius
	slash.rotation = facing
	slash.modulate = Color(1.0, 0.15, 0.15)
	slash.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	slash.z_index = ACTOR_Z_INDEX
	get_parent().add_child(slash)


func _chase() -> void:
	if _knockback_remaining > 0.0:
		velocity = _knockback_velocity
		return

	var target := find_nearest_player()
	if target == null:
		velocity = Vector2.ZERO
		return

	velocity = global_position.direction_to(target.global_position) * stats.speed


func find_nearest_player() -> PlayerController:
	var nearest: PlayerController = null
	var nearest_distance := INF

	for player: PlayerController in PlayerController.active_players:
		if not is_alive_player(player):
			continue

		var distance := global_position.distance_squared_to(player.global_position)
		if distance < nearest_distance:
			nearest_distance = distance
			nearest = player

	return nearest


func take_damage(amount: float) -> void:
	stats.take_damage(amount)
	_hit_flash_remaining = hit_flash_duration

	var nearest_player := find_nearest_player()
	if nearest_player != null:
		_knockback_velocity = nearest_player.global_position.direction_to(global_position) * knockback_force
		_knockback_remaining = knockback_duration

	if not stats.is_alive():
		_defeat()


## Called on death, before this enemy is removed from the tree. Concrete
## enemies/rooms can override to award drops. The Redeem-vs-Smite choice
## from the design doc hooks in here once the choice UI exists — for now
## every defeat behaves as a Smite (no Faith gained).
func _defeat() -> void:
	active_enemies.erase(self)

	var collision := get_node_or_null("CollisionShape2D")
	if collision != null:
		collision.disabled = true

	if is_boss and is_inside_tree():
		VictoryScreen.next_boss_name = next_boss_name
		VictoryScreen.next_level_scene_path = next_level_scene_path
		get_tree().change_scene_to_file(victory_screen_path)

	queue_free()
