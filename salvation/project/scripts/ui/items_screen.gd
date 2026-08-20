class_name ItemsScreen
extends Control
## Reachable from the main menu — a collection log for the six stat items
## (see ItemRoster): each row shows what the item does, how many times
## it's ever been picked up across every run, and the deepest trial any
## run that picked it up ever reached (RunProgress.item_lifetime_uses/
## item_best_level). Read-only besides Back — nothing here is interactive.

@export var back_scene_path: String = "res://scenes/ui/main_menu_screen.tscn"

const ROSTER: Array[int] = [
	ItemRoster.ItemType.VITALITY, ItemRoster.ItemType.FOCUS, ItemRoster.ItemType.MIGHT,
	ItemRoster.ItemType.WARD, ItemRoster.ItemType.HASTE, ItemRoster.ItemType.FORTUNE,
]


func _ready() -> void:
	var list := get_node_or_null("VBox/List")
	if list != null:
		for type in ROSTER:
			list.add_child(_build_row(type))

	var back_button := get_node_or_null("VBox/BackButton")
	if back_button != null:
		back_button.pressed.connect(_on_back_pressed)


func _build_row(type: int) -> Control:
	var uses := RunProgress.item_lifetime_uses(type)
	var best_level := RunProgress.item_best_level(type)
	var best_text := "Trial %d" % best_level if best_level > 0 else "—"

	var label := Label.new()
	label.text = "%s — %s — used %d time(s), best: %s" % [
		ItemRoster.name_of(type), ItemRoster.describe_item(type), uses, best_text
	]
	return label


func _on_back_pressed() -> void:
	get_tree().change_scene_to_file(back_scene_path)
