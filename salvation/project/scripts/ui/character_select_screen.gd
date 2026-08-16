class_name CharacterSelectScreen
extends Control
## Shown after the tutorial screen, before any level loads. Lists all five
## characters; RunProgress.is_unlocked() gates which are actually
## selectable — a locked character shows as a plain, dimmed label instead
## of a clickable Button, so there's no rejection path to build for
## picking something locked (it was never clickable to begin with).
## Selecting an unlocked character sets CharacterId.chosen_character_id
## and moves straight into the run — no separate confirm step.

const ROSTER: Array[int] = [
	CharacterId.PALADIN, CharacterId.CLERIC, CharacterId.MONK,
	CharacterId.EXORCIST, CharacterId.PROPHET,
]

@export var next_scene_path: String = "res://scenes/levels/level1.tscn"


func _ready() -> void:
	var list := get_node_or_null("VBox/List")
	if list == null:
		return

	for id in ROSTER:
		list.add_child(_build_row(id))


func _build_row(id: int) -> Control:
	var name_text := CharacterId.name_of(id)
	var blurb := CharacterRoster.blurb_for(id)

	if RunProgress.is_unlocked(id):
		var button := Button.new()
		button.text = name_text
		button.tooltip_text = blurb
		button.pressed.connect(_on_character_chosen.bind(id))
		return button

	var label := Label.new()
	label.text = "%s — locked" % name_text
	label.modulate = Color(0.45, 0.4, 0.4)
	return label


func _on_character_chosen(id: int) -> void:
	CharacterId.chosen_character_id = id
	get_tree().change_scene_to_file(next_scene_path)
