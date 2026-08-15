class_name Projectile
extends Area2D
## A forward-traveling hit-once bolt — Exorcist's Banishing Rite is the
## only ranged attack in the game; every other character's Magic ability
## is still a melee cone (see PlayerController._spawn_attack_slash). Moves
## in a fixed direction at speed, damages the first Enemy or Rock it
## overlaps, then frees itself either way once it either hits something or
## travels max_distance.
##
## Known gap: this is an Area2D (trigger-only), not a physics body, so it
## doesn't stop or collide against Room's walls/doors — it silently passes
## through them rather than being blocked. Bounded max_distance keeps a
## stray shot from crossing the whole room, but it's not wall-aware.

@export var speed: float = 420.0
@export var max_distance: float = 320.0
@export var damage: float = 20.0
## Set by the caster alongside damage (see Exorcist._use_magic) — whether
## the crit roll for this shot already landed, so whatever it hits shows
## the gold crit flash instead of the plain white one.
@export var is_crit: bool = false

var _direction: Vector2 = Vector2.RIGHT
var _traveled: float = 0.0
var _has_hit: bool = false


func _ready() -> void:
	var collision := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 8.0
	collision.shape = shape
	add_child(collision)

	var sprite := Sprite2D.new()
	sprite.texture = CharacterSprites.build_projectile_bolt()
	sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	add_child(sprite)

	rotation = _direction.angle()
	body_entered.connect(_on_body_entered)


func launch(from_position: Vector2, direction: Vector2) -> void:
	global_position = from_position
	_direction = direction.normalized() if direction != Vector2.ZERO else Vector2.RIGHT
	rotation = _direction.angle()


func _physics_process(delta: float) -> void:
	if _has_hit:
		return

	var step := _direction * speed * delta
	global_position += step
	_traveled += step.length()
	if _traveled >= max_distance:
		queue_free()


func _on_body_entered(body: Node2D) -> void:
	if _has_hit:
		return

	if body is Enemy:
		_has_hit = true
		body.take_damage(damage, is_crit)
		queue_free()
	elif body is Rock:
		_has_hit = true
		body.take_damage(damage, is_crit)
		queue_free()
