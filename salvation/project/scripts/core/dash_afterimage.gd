class_name DashAfterimage
extends Sprite2D
## A single fading ghost sprite left behind during a dash. Fully
## self-contained — fades and frees itself in _process, no cross-object
## references of any kind.

@export var fade_duration: float = 0.22

var _age: float = 0.0
var _start_alpha: float = 1.0


func _ready() -> void:
	_start_alpha = modulate.a


func _process(delta: float) -> void:
	_age += delta
	if _age >= fade_duration:
		queue_free()
		return

	var c := modulate
	c.a = _start_alpha * (1.0 - (_age / fade_duration))
	modulate = c
