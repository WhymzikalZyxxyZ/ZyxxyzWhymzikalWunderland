class_name AttackSlash
extends Sprite2D
## A single pixel-art arc, spawned at the moment an attack lands and briefly
## scaled/faded out — the basic visual read for "a hit just happened" that
## an instant, animation-free hitbox check has no other way of conveying.
## Self-contained, same fade-and-free pattern as DashAfterimage: no
## cross-object references, nothing else needs to know this exists.

@export var duration: float = 0.14

var _age: float = 0.0
var _start_alpha: float = 1.0
var _start_scale: Vector2 = Vector2.ONE


func _ready() -> void:
	_start_alpha = modulate.a
	_start_scale = scale


func _process(delta: float) -> void:
	_age += delta
	if _age >= duration:
		queue_free()
		return

	var t: float = _age / duration
	var c := modulate
	c.a = _start_alpha * (1.0 - t)
	modulate = c
	# Punches out slightly as it fades — reads as an impact rather than a static stamp.
	scale = _start_scale * (1.0 + 0.35 * t)
