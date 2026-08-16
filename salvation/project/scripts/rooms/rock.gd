class_name Rock
extends StaticBody2D
## A breakable obstacle: three hits to shatter, then a 21% chance to leave
## behind a HealthPickup and a separate, mutually exclusive 21% chance to
## leave behind a MagicPickup instead. Tracked via a hand-kept registry the
## same way Enemy is, so player attacks can find rocks in range without
## every attack needing its own room reference.

const MAX_HITS := 3
const HEALTH_DROP_CHANCE := 0.21
const MAGIC_DROP_CHANCE := 0.21

static var active_rocks: Array[Rock] = []

@export var hit_flash_duration: float = 0.08
@export var crit_flash_duration: float = 0.16

var hits_remaining: int = MAX_HITS

var _sprite: Sprite2D
var _collision: CollisionShape2D
var _hit_flash_remaining: float = 0.0
var _crit_flash_remaining: float = 0.0


func _ready() -> void:
	active_rocks.append(self)


func _exit_tree() -> void:
	active_rocks.erase(self)


func _process(delta: float) -> void:
	if _crit_flash_remaining > 0.0:
		_crit_flash_remaining -= delta
		if _sprite != null:
			_sprite.modulate = Color(2.2, 1.9, 0.3) if _crit_flash_remaining > 0.0 else Color.WHITE
		return

	if _hit_flash_remaining <= 0.0:
		return
	_hit_flash_remaining -= delta
	if _sprite != null:
		_sprite.modulate = Color(1.8, 1.8, 1.8) if _hit_flash_remaining > 0.0 else Color.WHITE


func take_damage(_amount: float = 1.0, is_crit: bool = false) -> void:
	if hits_remaining <= 0:
		return

	hits_remaining -= 1
	if is_crit:
		_crit_flash_remaining = crit_flash_duration
	else:
		_hit_flash_remaining = hit_flash_duration
	if hits_remaining <= 0:
		_break()


func _break() -> void:
	var roll := randf()
	if roll < HEALTH_DROP_CHANCE:
		var pickup := HealthPickup.new()
		pickup.global_position = global_position
		get_parent().add_child(pickup)
	elif roll < HEALTH_DROP_CHANCE + MAGIC_DROP_CHANCE:
		var pickup := MagicPickup.new()
		pickup.global_position = global_position
		get_parent().add_child(pickup)

	active_rocks.erase(self)
	if _collision != null:
		_collision.disabled = true
	queue_free()
