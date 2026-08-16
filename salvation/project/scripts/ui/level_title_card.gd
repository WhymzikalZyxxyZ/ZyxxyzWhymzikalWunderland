class_name LevelTitleCard
extends Control
## Dark Souls-style boss/area title card: the trial's name fades in, holds,
## then fades out entirely on its own — no dismissal input, matching the
## reference (the player is already free to move while the card is still
## on screen). mouse_filter is IGNORE on both this and VBox in the .tscn so
## it never intercepts input either. Sits in its own CanvasLayer parent
## (see level_title_card.tscn) so it draws above gameplay regardless of
## which Room camera is currently active.

@export var title_text: String = "":
	set(value):
		title_text = value
		if _title_label != null:
			_title_label.text = value

@export var subtitle_text: String = "":
	set(value):
		subtitle_text = value
		if _subtitle_label != null:
			_subtitle_label.text = value

@export var fade_in_duration: float = 1.2
@export var hold_duration: float = 1.8
@export var fade_out_duration: float = 1.5

var _title_label: Label
var _subtitle_label: Label


func _ready() -> void:
	_title_label = get_node_or_null("VBox/Title")
	_subtitle_label = get_node_or_null("VBox/Subtitle")
	if _title_label != null:
		_title_label.text = title_text
	if _subtitle_label != null:
		_subtitle_label.text = subtitle_text

	modulate.a = 0.0
	var tween := create_tween()
	tween.tween_property(self, "modulate:a", 1.0, fade_in_duration)
	tween.tween_interval(hold_duration)
	tween.tween_property(self, "modulate:a", 0.0, fade_out_duration)
	tween.tween_callback(queue_free)
