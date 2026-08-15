class_name MagicBurst
extends Sprite2D
## A radial pulse — expands and fades out in place over its short
## lifetime. Distinct from AttackSlash on purpose: a sweeping crescent
## reads as a weapon swing, which isn't what every Magic ability actually
## does — Cleric's Sacred Mend doesn't swing anything, it just glows.
## Self-contained, same fade-and-free pattern as AttackSlash/DashAfterimage.
## Tint (which spell this actually is) is set entirely via
## Sprite2D.modulate at the call site — this only ever bakes a neutral
## white glow (see CharacterSprites.build_burst).

@export var duration: float = 0.35
@export var start_scale: float = 0.35
@export var end_scale: float = 1.7

var _age: float = 0.0
var _start_alpha: float = 1.0


func _ready() -> void:
	_start_alpha = modulate.a
	scale = Vector2.ONE * start_scale


func _process(delta: float) -> void:
	_age += delta
	if _age >= duration:
		queue_free()
		return

	var t: float = _age / duration
	scale = Vector2.ONE * lerpf(start_scale, end_scale, t)

	var c := modulate
	c.a = _start_alpha * (1.0 - t)
	modulate = c
