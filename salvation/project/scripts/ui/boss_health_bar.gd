class_name BossHealthBar
extends Control
## Top-of-screen boss health bar: bar on top, boss name centered under it.
## Hides itself if boss_path doesn't resolve to a boss, and again once that
## boss is defeated. The bar eases toward its target rather than snapping
## instantly, so a hit reads as a drain rather than a stiff jump-cut.

@export var boss_path: NodePath
@export var smooth_speed: float = 7.0

var _bar: ProgressBar
var _name_label: Label
var _boss: Enemy
var _target_ratio: float = 1.0
var _displayed_ratio: float = 1.0


func _ready() -> void:
	_bar = get_node("VBox/HealthBar")
	_name_label = get_node("VBox/NameLabel")
	visible = false

	if not boss_path.is_empty():
		var boss := get_node_or_null(boss_path)
		if boss is Enemy and boss.is_boss:
			bind_boss(boss)


## For procedurally generated levels: wire a boss directly, no NodePath needed.
func bind_boss(boss: Enemy) -> void:
	_boss = boss
	_target_ratio = boss.health_ratio
	_displayed_ratio = _target_ratio
	if _name_label != null:
		_name_label.text = boss.display_name
	if _bar != null:
		_bar.value = _displayed_ratio * _bar.max_value


func _physics_process(delta: float) -> void:
	if _boss == null or _bar == null:
		return

	if not is_instance_valid(_boss):
		visible = false
		_boss = null
		return

	_target_ratio = _boss.health_ratio
	visible = true

	if absf(_displayed_ratio - _target_ratio) <= 0.002:
		return

	var t: float = clampf(smooth_speed * delta, 0.0, 1.0)
	_displayed_ratio = lerpf(_displayed_ratio, _target_ratio, t)
	_bar.value = _displayed_ratio * _bar.max_value
