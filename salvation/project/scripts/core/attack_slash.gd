class_name AttackSlash
extends Sprite2D
## A pixel-art crescent that actually sweeps through an arc around the
## attacker over its short lifetime, instead of popping statically in
## place — the "sword swing" read comes from the motion, not just the
## shape. Self-contained, same fade-and-free pattern as DashAfterimage:
## no cross-object references, nothing else needs to know this exists.
## Tracks pivot_global_position every frame rather than snapshotting it
## once, so the swing stays centered on the attacker even if they're
## still moving mid-swing.

@export var duration: float = 0.16
@export var sweep_degrees: float = 110.0
@export var radius: float = 34.0

var pivot: Node2D
var facing_angle: float = 0.0

var _age: float = 0.0
var _start_alpha: float = 1.0


func _ready() -> void:
	_start_alpha = modulate.a


func _process(delta: float) -> void:
	_age += delta
	if _age >= duration or pivot == null or not is_instance_valid(pivot):
		queue_free()
		return

	var t: float = _age / duration
	var sweep_rad: float = deg_to_rad(sweep_degrees)
	# Sweeps from -half to +half of the arc across the attack's facing
	# direction — a real swing arriving at and passing through the target,
	# not a shape that just appears already centered on it.
	var current_angle: float = facing_angle - sweep_rad / 2.0 + sweep_rad * t

	global_position = pivot.global_position + Vector2.RIGHT.rotated(current_angle) * radius
	rotation = current_angle

	var c := modulate
	c.a = _start_alpha * (1.0 - t)
	modulate = c
