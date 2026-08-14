class_name Door
extends StaticBody2D
## A locked, one-way gate between rooms. Blocks movement while gated_room
## (the room being left) is uncleared; unlocks once it clears. Once the
## player actually arrives in destination_room (the room being entered),
## this door permanently collapses — sealing the way back — which is what
## turns a branching room graph into a forward-only dungeon: every branch
## stays open until taken, and taking one seals it behind you.
##
## Polls is_cleared/is_revealed in _physics_process. A Door with no
## gated_room_path set starts open (e.g. a doorway back into an
## already-cleared room).

@export var gated_room_path: NodePath
@export var destination_room_path: NodePath

var _collision: CollisionShape2D
var _sprite: Sprite2D
var _gated_room: Room
var _destination_room: Room
var _unlocked: bool = false
var _collapsed: bool = false


func _ready() -> void:
	_collision = get_node_or_null("CollisionShape2D")
	_sprite = get_node_or_null("Sprite2D")
	if not destination_room_path.is_empty():
		_destination_room = get_node_or_null(destination_room_path)

	if not gated_room_path.is_empty() and get_node_or_null(gated_room_path) is Room:
		_gated_room = get_node_or_null(gated_room_path)
		if _gated_room.is_cleared:
			_unlock()
		else:
			_lock()
	else:
		_unlock()


func _physics_process(_delta: float) -> void:
	if _collapsed:
		return

	if _unlocked and _destination_room != null and is_instance_valid(_destination_room) and _destination_room.is_revealed:
		_collapse()
		return

	if _unlocked or _gated_room == null or not is_instance_valid(_gated_room):
		return
	if _gated_room.is_cleared:
		_unlock()


func _lock() -> void:
	if _collision != null:
		_collision.disabled = false
	if _sprite != null:
		_sprite.modulate = Color(0.55, 0.08, 0.08, 1.0)


func _unlock() -> void:
	_unlocked = true
	if _collision != null:
		_collision.disabled = true
	if _sprite != null:
		_sprite.modulate = Color(0.35, 0.32, 0.28, 1.0)


## Permanently sealed — the pathway back. Re-enables collision and never unlocks again.
func _collapse() -> void:
	_collapsed = true
	if _collision != null:
		_collision.disabled = false
	if _sprite != null:
		_sprite.modulate = Color(0.15, 0.12, 0.12, 1.0)
