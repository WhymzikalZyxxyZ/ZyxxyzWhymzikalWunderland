class_name PlayerHud
extends Control
## Health and Magic bars for the local player. Bar values ease toward their
## target instead of snapping instantly: a hit or a Smite cast reads as a
## fluid drain, not a stiff jump-cut. Attack/Magic buttons are plain
## TouchScreenButton nodes bound to the "attack"/"magic" input actions in
## the scene itself, so they need no script wiring at all: pressing one is
## indistinguishable from the keyboard/mouse binding as far as
## PlayerController is concerned.

@export var player_path: NodePath
@export var smooth_speed: float = 9.0

var _health_bar: ProgressBar
var _magic_bar: ProgressBar
var _player: PlayerController

var _target_health_ratio: float = 1.0
var _target_magic_ratio: float = 1.0
var _displayed_health_ratio: float = 1.0
var _displayed_magic_ratio: float = 1.0

var _attack_button: TouchScreenButton
var _magic_button: TouchScreenButton
var _attack_button_base_scale: Vector2 = Vector2.ONE
var _magic_button_base_scale: Vector2 = Vector2.ONE


func _ready() -> void:
	_health_bar = get_node("Bars/HealthBar")
	_magic_bar = get_node("Bars/MagicBar")

	if not player_path.is_empty():
		var player := get_node_or_null(player_path)
		if player is PlayerController:
			bind_player(player)

	# Tactile press feedback for the on-screen buttons — a button that
	# never visibly reacts to being held reads as dead/unresponsive.
	_attack_button = get_node_or_null("../AttackButton")
	_magic_button = get_node_or_null("../MagicButton")
	if _attack_button != null:
		_attack_button_base_scale = _attack_button.scale
	if _magic_button != null:
		_magic_button_base_scale = _magic_button.scale


## For procedurally generated levels: wire the player directly, no NodePath needed.
func bind_player(player: PlayerController) -> void:
	_player = player
	_target_health_ratio = player.health_ratio
	_displayed_health_ratio = _target_health_ratio
	_target_magic_ratio = player.magic_ratio
	_displayed_magic_ratio = _target_magic_ratio
	_apply_bar_values()


func _physics_process(delta: float) -> void:
	if _player == null or not is_instance_valid(_player):
		_player = null
	else:
		_target_health_ratio = _player.health_ratio
		_target_magic_ratio = _player.magic_ratio

		var t: float = clampf(smooth_speed * delta, 0.0, 1.0)
		var changed := false

		if absf(_displayed_health_ratio - _target_health_ratio) > 0.002:
			_displayed_health_ratio = lerpf(_displayed_health_ratio, _target_health_ratio, t)
			changed = true
		if absf(_displayed_magic_ratio - _target_magic_ratio) > 0.002:
			_displayed_magic_ratio = lerpf(_displayed_magic_ratio, _target_magic_ratio, t)
			changed = true

		if changed:
			_apply_bar_values()

	_update_button_press(_attack_button, _attack_button_base_scale, delta)
	_update_button_press(_magic_button, _magic_button_base_scale, delta)


static func _update_button_press(button: TouchScreenButton, base_scale: Vector2, delta: float) -> void:
	if button == null:
		return

	var target: Vector2 = base_scale * 0.9 if button.is_pressed() else base_scale
	button.scale = button.scale.lerp(target, clampf(16.0 * delta, 0.0, 1.0))


func _apply_bar_values() -> void:
	if _health_bar != null:
		_health_bar.value = _displayed_health_ratio * _health_bar.max_value
	if _magic_bar != null:
		_magic_bar.value = _displayed_magic_ratio * _magic_bar.max_value
