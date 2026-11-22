extends Control
## Экран рисования подделки.
## Слева — оригинал, в центре — холст, справа — палитра и кнопки.
## Интерфейс собирается кодом, чтобы его было легко менять текстом.
## Когда будет готов арт, его можно пересобрать в редакторе с темой (Theme).

const PALETTE: Array[Color] = [
	Color("1a1a1a"), Color("f5f0e1"), Color("8a5a2b"), Color("e2b48a"),
	Color("c0392b"), Color("e67e22"), Color("f1c40f"), Color("27ae60"),
	Color("2e6b4f"), Color("2980b9"), Color("6c8ea6"), Color("8e44ad"),
]
const BRUSH_SIZES: Array[float] = [3.0, 7.0, 14.0]
const CANVAS_PIXELS := 512 # размер холста на экране
const SEND_INTERVAL := 0.05 # как часто отправлять кусок мазка по сети
const TIME_LIMIT := 60.0 # пока только для атмосферы; позже — давление охраны

var easel: Node
var reference: Texture2D

var _color: Color = PALETTE[0]
var _radius: float = BRUSH_SIZES[1]
var _drawing: bool = false
var _pending: PackedVector2Array = PackedVector2Array()
var _send_timer: float = 0.0
var _time_left: float = TIME_LIMIT

var _canvas_rect: TextureRect
var _timer_label: Label
var _color_preview: ColorRect


func setup(p_easel: Node, p_reference: Texture2D) -> void:
	easel = p_easel
	reference = p_reference


func _ready() -> void:
	set_anchors_preset(Control.PRESET_FULL_RECT)
	Game.ui_open = true
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	_build()


func _exit_tree() -> void:
	Game.ui_open = false
	Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = Color(0.05, 0.06, 0.1, 0.85)
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var root := VBoxContainer.new()
	root.add_theme_constant_override("separation", 12)
	center.add_child(root)

	_timer_label = _label("", 30)
	_timer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	root.add_child(_timer_label)

	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 24)
	root.add_child(row)

	# Оригинал
	var left := VBoxContainer.new()
	left.add_child(_label("Оригинал", 22))
	var ref_rect := TextureRect.new()
	ref_rect.texture = reference
	ref_rect.custom_minimum_size = Vector2(220, 220)
	ref_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	ref_rect.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	left.add_child(ref_rect)
	left.add_child(_label("Скопируй как можешь.\nОхранник смотрит издалека —\nважны цвета и пятна.", 16))
	row.add_child(left)

	# Холст
	_canvas_rect = TextureRect.new()
	_canvas_rect.texture = easel.canvas.texture
	_canvas_rect.custom_minimum_size = Vector2(CANVAS_PIXELS, CANVAS_PIXELS)
	_canvas_rect.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	_canvas_rect.stretch_mode = TextureRect.STRETCH_SCALE
	_canvas_rect.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
	_canvas_rect.mouse_filter = Control.MOUSE_FILTER_STOP
	_canvas_rect.gui_input.connect(_on_canvas_input)
	row.add_child(_canvas_rect)

	# Инструменты
	var tools := VBoxContainer.new()
	tools.add_theme_constant_override("separation", 10)
	tools.add_child(_label("Краски", 22))
	var grid := GridContainer.new()
	grid.columns = 4
	for c in PALETTE:
		grid.add_child(_color_button(c))
	tools.add_child(grid)
	_color_preview = ColorRect.new()
	_color_preview.custom_minimum_size = Vector2(0, 16)
	_color_preview.color = _color
	tools.add_child(_color_preview)

	tools.add_child(_label("Кисть", 22))
	var sizes := HBoxContainer.new()
	for i in BRUSH_SIZES.size():
		var b := Button.new()
		b.text = ["S", "M", "L"][i]
		b.custom_minimum_size = Vector2(44, 44)
		var r := BRUSH_SIZES[i]
		b.pressed.connect(func() -> void: _radius = r)
		sizes.add_child(b)
	tools.add_child(sizes)

	tools.add_child(HSeparator.new())
	tools.add_child(_action_button("Очистить", func() -> void: easel.local_clear()))
	tools.add_child(_action_button("Повесить подделку!", _on_hang))
	tools.add_child(_action_button("Закрыть [Esc]", queue_free))
	row.add_child(tools)


func _process(delta: float) -> void:
	_time_left = maxf(0.0, _time_left - delta)
	_timer_label.text = "Охранник вернётся через %d сек" % ceili(_time_left)
	_timer_label.modulate = Color.WHITE if _time_left > 10.0 else Color(1, 0.3, 0.3)

	_send_timer += delta
	if _send_timer >= SEND_INTERVAL:
		_send_timer = 0.0
		_flush_pending(true)


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_close"):
		get_viewport().set_input_as_handled()
		queue_free()


func _on_canvas_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
		_drawing = event.pressed
		if _drawing:
			_pending = PackedVector2Array([_to_uv(event.position)])
		else:
			_flush_pending(false)
	elif event is InputEventMouseMotion and _drawing:
		_pending.append(_to_uv(event.position))
		if _pending.size() >= 64:
			_flush_pending(true)


## Отправляем накопленный кусок линии. keep_tail — оставить последнюю точку,
## чтобы следующий кусок продолжил линию без разрыва.
func _flush_pending(keep_tail: bool) -> void:
	if _pending.is_empty():
		return
	if _pending.size() == 1 and keep_tail and _drawing:
		return
	easel.local_stroke({"pts": _pending, "c": _color, "r": _radius})
	var last := _pending[_pending.size() - 1]
	_pending = PackedVector2Array([last]) if (keep_tail and _drawing) else PackedVector2Array()


func _to_uv(pos: Vector2) -> Vector2:
	return (pos / _canvas_rect.size).clamp(Vector2.ZERO, Vector2.ONE)


func _on_hang() -> void:
	_flush_pending(false)
	easel.local_hang()
	queue_free()


# --- Помощники для сборки UI ------------------------------------------------

func _label(text: String, size: int) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_size_override("font_size", size)
	return l


func _color_button(c: Color) -> Button:
	var b := Button.new()
	b.custom_minimum_size = Vector2(40, 40)
	var sb := StyleBoxFlat.new()
	sb.bg_color = c
	sb.set_corner_radius_all(6)
	b.add_theme_stylebox_override("normal", sb)
	var sb_hover := sb.duplicate() as StyleBoxFlat
	sb_hover.border_color = Color.WHITE
	sb_hover.set_border_width_all(3)
	b.add_theme_stylebox_override("hover", sb_hover)
	b.add_theme_stylebox_override("pressed", sb_hover)
	b.pressed.connect(func() -> void:
		_color = c
		_color_preview.color = c)
	return b


func _action_button(text: String, cb: Callable) -> Button:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(200, 44)
	b.pressed.connect(cb)
	return b
