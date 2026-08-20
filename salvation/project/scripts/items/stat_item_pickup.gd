class_name StatItemPickup
extends Area2D
## Grants whichever player walks over it a flat stat bump (see
## ItemRoster.apply_item), once, then removes itself — same shape as
## HealthPickup/MagicPickup, just with a variable effect instead of a fixed
## one, so item_type has to be set (by whoever spawns this, see
## Rock._break) before this enters the tree.

@export var item_type: int = ItemRoster.ItemType.VITALITY

var _sprite: Sprite2D


func _ready() -> void:
	var collision := CollisionShape2D.new()
	var shape := CircleShape2D.new()
	shape.radius = 10.0
	collision.shape = shape
	add_child(collision)

	_sprite = Sprite2D.new()
	_sprite.texture = EnvironmentArt.build_item_gem()
	_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_sprite.scale = Vector2(1.5, 1.5)
	_sprite.modulate = ItemRoster.TINT_COLORS.get(item_type, Color.WHITE)
	add_child(_sprite)

	body_entered.connect(_on_body_entered)


func _on_body_entered(body: Node2D) -> void:
	if body is PlayerController:
		ItemRoster.apply_item(body.stats, item_type)
		RunProgress.record_item_pickup(item_type)
		AudioDirector.play_sfx(SfxLibrary.build_pickup())
		queue_free()
