class_name PixelCanvas
extends RefCounted
## A small pixel grid you draw shapes into (ellipses, rects, triangles),
## then bake to a crisp, blocky ImageTexture — actual per-pixel control
## rather than smooth vector Polygon2D fills. "." is always transparent.

var width: int
var height: int
var _grid: Array


func _init(p_width: int, p_height: int) -> void:
	width = p_width
	height = p_height
	_grid = []
	_grid.resize(width * height)
	_grid.fill(".")


func _index(x: int, y: int) -> int:
	return y * width + x


func set_px(x: int, y: int, key: String) -> void:
	if x < 0 or x >= width or y < 0 or y >= height:
		return
	_grid[_index(x, y)] = key


func get_px(x: int, y: int) -> String:
	if x < 0 or x >= width or y < 0 or y >= height:
		return "."
	return _grid[_index(x, y)]


func fill_ellipse(cx: float, cy: float, rx: float, ry: float, key: String) -> void:
	for y in range(height):
		for x in range(width):
			var nx: float = (x + 0.5 - cx) / rx
			var ny: float = (y + 0.5 - cy) / ry
			if nx * nx + ny * ny <= 1.0:
				set_px(x, y, key)


func fill_rect(x0: int, y0: int, x1: int, y1: int, key: String) -> void:
	for y in range(y0, y1 + 1):
		for x in range(x0, x1 + 1):
			set_px(x, y, key)


func fill_triangle(a: Vector2, b: Vector2, c: Vector2, key: String) -> void:
	var min_x: int = floori(min(a.x, min(b.x, c.x)))
	var max_x: int = ceili(max(a.x, max(b.x, c.x)))
	var min_y: int = floori(min(a.y, min(b.y, c.y)))
	var max_y: int = ceili(max(a.y, max(b.y, c.y)))

	for y in range(min_y, max_y + 1):
		for x in range(min_x, max_x + 1):
			var p := Vector2(x + 0.5, y + 0.5)
			if _point_in_triangle(p, a, b, c):
				set_px(x, y, key)


static func _point_in_triangle(p: Vector2, a: Vector2, b: Vector2, c: Vector2) -> bool:
	var d1: float = _cross(p - a, b - a)
	var d2: float = _cross(p - b, c - b)
	var d3: float = _cross(p - c, a - c)
	var has_neg: bool = d1 < 0 or d2 < 0 or d3 < 0
	var has_pos: bool = d1 > 0 or d2 > 0 or d3 > 0
	return not (has_neg and has_pos)


static func _cross(v1: Vector2, v2: Vector2) -> float:
	return v1.x * v2.y - v1.y * v2.x


## Turns every transparent pixel touching a filled one into the outline color — a clean silhouette border.
func auto_outline(outline_key: String) -> void:
	var to_outline: Array[Vector2i] = []
	for y in range(height):
		for x in range(width):
			if get_px(x, y) != ".":
				continue
			var touches_filled: bool = (
				get_px(x - 1, y) != "." or get_px(x + 1, y) != "."
				or get_px(x, y - 1) != "." or get_px(x, y + 1) != "."
			)
			if touches_filled:
				to_outline.append(Vector2i(x, y))
	for cell in to_outline:
		set_px(cell.x, cell.y, outline_key)


func bake(palette: Dictionary, pixel_scale: int = 2) -> ImageTexture:
	var image := Image.create_empty(width * pixel_scale, height * pixel_scale, false, Image.FORMAT_RGBA8)

	for y in range(height):
		for x in range(width):
			var key: String = _grid[_index(x, y)]
			var color: Color = Color(0, 0, 0, 0) if key == "." else palette.get(key, Color(1, 0, 1, 1))
			for py in range(pixel_scale):
				for px in range(pixel_scale):
					image.set_pixel(x * pixel_scale + px, y * pixel_scale + py, color)

	return ImageTexture.create_from_image(image)
