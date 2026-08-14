class_name PlayerController
extends CharacterBody2D
## Base twin-stick controller shared by all five characters: left stick /
## WASD moves, right stick / mouse aims, and a single attack action fires
## whatever the concrete character's attack() implements. Concrete
## characters (Paladin, Cleric, ...) extend this and supply stats + their
## own ability.

## The damage of the last ability that actually landed, and a counter that
## increments every time a new one does. Exists so bosses like Pride
## ("mirrors your last-used ability back at you") can observe and replay
## the player's own offense.
var last_ability_damage: float = 0.0
var last_ability_use_id: int = 0

## Every currently-active player, maintained by hand as a simple registry.
static var active_players: Array[PlayerController] = []

@export var character_id: int = CharacterId.PALADIN

@export var dash_speed: float = 720.0
@export var dash_duration: float = 0.15
@export var dash_cooldown: float = 0.6

## How fast velocity chases the target each second (not a top speed cap).
## Zero would be instant snap-to-input, which reads as stiff/robotic; this
## is a light Hades-style "fluid but immediate" curve — high enough that
## full speed arrives in under a tenth of a second, not the kind of lag
## that reads as sliding.
@export var acceleration: float = 26.0

@export var hit_flash_duration: float = 0.08

## Furi-style parry: a short, precise window — much narrower than the
## dash's i-frames, and rewards actually landing it rather than just
## surviving. A hit absorbed during the window costs nothing and refunds
## Magic instead.
@export var parry_window: float = 0.18
@export var parry_cooldown: float = 0.9
@export var parry_magic_refund: float = 15.0

var stats: Stats

var health_ratio: float:
	get: return stats.health / stats.max_health if stats.max_health > 0.0 else 0.0
var magic_ratio: float:
	get: return stats.magic / stats.max_magic if stats.max_magic > 0.0 else 0.0

## True only for the duration of an active dash — the "minimal i-frames".
var is_invulnerable: bool = false

var _is_dashing: bool = false
var _dash_time_remaining: float = 0.0
var _dash_cooldown_remaining: float = 0.0
var _dash_direction: Vector2 = Vector2.ZERO
var _dash_afterimage_timer: float = 0.0

var _is_parrying: bool = false
var _parry_time_remaining: float = 0.0
var _parry_cooldown_remaining: float = 0.0
var _parry_flash_remaining: float = 0.0

var _sprite: Sprite2D
var _hit_flash_remaining: float = 0.0


func _ready() -> void:
	active_players.append(self)
	stats = _create_stats()

	# Grounded is the CharacterBody2D default and applies floor/slope/
	# wall-slide physics meant for platformers — with no gravity here,
	# that's what makes movement feel "slidey". Floating is the mode
	# meant for top-down movement: input maps directly to velocity, no
	# residual slide against surfaces.
	motion_mode = CharacterBody2D.MOTION_MODE_FLOATING

	var texture := _build_sprite()
	if texture != null:
		_sprite = Sprite2D.new()
		_sprite.name = "Sprite2D"
		_sprite.texture = texture
		_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
		add_child(_sprite)


## Concrete characters return their pixel-art texture (see CharacterSprites). Base has none.
func _build_sprite() -> Texture2D:
	return null


func _exit_tree() -> void:
	active_players.erase(self)


## Concrete characters return their own baseline stat block.
func _create_stats() -> Stats:
	return Stats.new(100.0, 50.0, 220.0, 12.0, 4.0)


func _physics_process(delta: float) -> void:
	var move_input := Input.get_vector("move_left", "move_right", "move_up", "move_down")

	_dash_cooldown_remaining -= delta
	if Input.is_action_just_pressed("dash") and not _is_dashing and not _is_parrying and _dash_cooldown_remaining <= 0.0:
		_dash_direction = move_input.normalized() if move_input != Vector2.ZERO else Vector2.RIGHT.rotated(rotation)
		_is_dashing = true
		_dash_time_remaining = dash_duration
		_dash_cooldown_remaining = dash_cooldown
		is_invulnerable = true

	if _is_dashing:
		_dash_time_remaining -= delta
		velocity = _dash_direction * dash_speed

		_dash_afterimage_timer -= delta
		if _dash_afterimage_timer <= 0.0:
			_dash_afterimage_timer = 0.03
			_spawn_dash_afterimage()

		if _dash_time_remaining <= 0.0:
			_is_dashing = false
			is_invulnerable = false
	else:
		var target := move_input * stats.speed
		velocity = velocity.lerp(target, clampf(acceleration * delta, 0.0, 1.0))

	move_and_slide()

	_parry_cooldown_remaining -= delta
	if Input.is_action_just_pressed("parry") and not _is_parrying and not _is_dashing and _parry_cooldown_remaining <= 0.0:
		_is_parrying = true
		_parry_time_remaining = parry_window
		_parry_cooldown_remaining = parry_cooldown
	if _is_parrying:
		_parry_time_remaining -= delta
		if _parry_time_remaining <= 0.0:
			_is_parrying = false

	if _hit_flash_remaining > 0.0:
		_hit_flash_remaining -= delta
	if _parry_flash_remaining > 0.0:
		_parry_flash_remaining -= delta

	# Priority: hit flash (red) > perfect-parry flash (gold) > active parry window (blue tint) > normal.
	if _sprite != null:
		if _hit_flash_remaining > 0.0:
			_sprite.modulate = Color(1.0, 0.4, 0.4)
		elif _parry_flash_remaining > 0.0:
			_sprite.modulate = Color(1.0, 0.95, 0.55)
		elif _is_parrying:
			_sprite.modulate = Color(0.6, 0.9, 1.0)
		else:
			_sprite.modulate = Color.WHITE

	var aim_input := Input.get_vector("aim_left", "aim_right", "aim_up", "aim_down")
	if aim_input != Vector2.ZERO:
		look_at(global_position + aim_input)
	elif get_viewport() != null:
		look_at(get_viewport().get_mouse_position())

	if Input.is_action_just_pressed("attack"):
		_attack()
	if Input.is_action_just_pressed("magic"):
		_use_magic()


func _spawn_dash_afterimage() -> void:
	if _sprite == null or _sprite.texture == null or get_parent() == null:
		return

	var ghost := DashAfterimage.new()
	ghost.texture = _sprite.texture
	ghost.global_position = global_position
	ghost.rotation = rotation
	ghost.modulate = Color(1.0, 1.0, 1.0, 0.45)
	ghost.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	get_parent().add_child(ghost)


## Free basic attack, always available. Base is an unarmed placeholder.
func _attack() -> void:
	print("%s attacks (base implementation — override in the concrete character)." % CharacterId.name_of(character_id))


## Each character's signature Magic-costing ability. Base does nothing.
func _use_magic() -> void:
	print("%s has no magic ability (base implementation — override in the concrete character)." % CharacterId.name_of(character_id))


func record_ability_used(damage: float) -> void:
	last_ability_damage = damage
	last_ability_use_id += 1


func take_damage(amount: float) -> void:
	if is_invulnerable:
		return

	if _is_parrying:
		# Perfect parry: no damage taken, and it pays for itself — reward
		# for the precise timing risk, not just a free block.
		_is_parrying = false
		_parry_flash_remaining = 0.18
		stats.restore_magic(parry_magic_refund)
		return

	stats.take_damage(amount)
	_hit_flash_remaining = hit_flash_duration
	if not stats.is_alive():
		_die()


func _die() -> void:
	print("%s has fallen." % CharacterId.name_of(character_id))
	active_players.erase(self)

	# Disable collision before freeing: an enemy is very likely still
	# actively sliding against this body via move_and_slide the instant it
	# dies (that's usually what killed it).
	var collision := get_node_or_null("CollisionShape2D")
	if collision != null:
		collision.disabled = true

	queue_free()
