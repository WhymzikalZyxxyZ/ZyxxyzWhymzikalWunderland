class_name MagicPickup
extends Area2D
## Restores magic to whichever player walks over it, once, then removes itself.

@export var magic_amount: float = 15.0

var _sprite: Sprite2D


func _ready() -> void:
	var collision := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 10.0
	collision.shape = shape
	add_child(collision)

	_sprite = Sprite2D.new()
	_sprite.texture = EnvironmentArt.build_magic_orb()
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_sprite.scale = Vector2(1.5, 1.5)
	add_child(_sprite)

	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body is PlayerController:
		body.stats.restore_magic(magic_amount)
		queue_free()
