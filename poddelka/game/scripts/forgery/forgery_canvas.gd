class_name ForgeryCanvas
extends RefCounted
## Холст для подделки: картинка + журнал мазков.
##
## Мазок (stroke) — словарь, который легко отправить по сети:
##   {"pts": PackedVector2Array (координаты 0..1), "c": Color, "r": float (радиус в пикселях холста)}
## Каждый клиент применяет одни и те же мазки → у всех одинаковая картинка.
## Журнал нужен, чтобы отправить состояние игроку, который подключился позже.

signal changed

const SIZE := 256
const PAPER_COLOR := Color(0.96, 0.94, 0.88)

var image: Image
var texture: ImageTexture
var strokes: Array[Dictionary] = []

var _dirty: bool = false


func _init() -> void:
	image = Image.create_empty(SIZE, SIZE, false, Image.FORMAT_RGBA8)
	image.fill(PAPER_COLOR)
	texture = ImageTexture.create_from_image(image)


## Применить мазок. Возвращает true, если мазок корректный.
func apply_stroke(stroke: Dictionary, record: bool = true) -> bool:
	if not (stroke.has("pts") and stroke.has("c") and stroke.has("r")):
		return false
	var pts: PackedVector2Array = stroke["pts"]
	var color: Color = stroke["c"]
	var radius: float = clampf(stroke["r"], 1.0, 24.0)
	if pts.is_empty() or pts.size() > 512:
		return false
	if pts.size() == 1:
		_dab(pts[0] * SIZE, radius, color)
	else:
		for i in range(1, pts.size()):
			_line(pts[i - 1] * SIZE, pts[i] * SIZE, radius, color)
	if record:
		strokes.append(stroke)
	_mark_dirty()
	return true


func clear() -> void:
	strokes.clear()
	image.fill(PAPER_COLOR)
	_mark_dirty()


## Пересобрать картинку из журнала (после загрузки состояния по сети).
func load_strokes(new_strokes: Array) -> void:
	clear()
	for s in new_strokes:
		if s is Dictionary:
			apply_stroke(s)


## Обновить GPU-текстуру. Вызывать раз в кадр, а не после каждого мазка.
func flush() -> void:
	if _dirty:
		texture.update(image)
		_dirty = false
		changed.emit()


func snapshot() -> Image:
	return image.duplicate()


# --- Рисование -----------------------------------------------------------

func _mark_dirty() -> void:
	_dirty = true


func _line(a: Vector2, b: Vector2, radius: float, color: Color) -> void:
	var dist := a.distance_to(b)
	var step := maxf(1.0, radius * 0.5)
	var n := int(ceil(dist / step))
	for i in range(n + 1):
		var t := 0.0 if n == 0 else float(i) / n
		_dab(a.lerp(b, t), radius, color)


func _dab(center: Vector2, radius: float, color: Color) -> void:
	var r := int(ceil(radius))
	var r2 := radius * radius
	var cx := int(center.x)
	var cy := int(center.y)
	for y in range(maxi(cy - r, 0), mini(cy + r + 1, SIZE)):
		var dy := y - cy
		for x in range(maxi(cx - r, 0), mini(cx + r + 1, SIZE)):
			var dx := x - cx
			if dx * dx + dy * dy <= r2:
				image.set_pixel(x, y, color)
