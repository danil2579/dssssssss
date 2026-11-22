extends Control
## Главное меню прототипа: имя, «Создать игру», «Подключиться по IP».
## На этапе 2 сюда добавятся Steam-лобби и приглашения друзей.

var _name_edit: LineEdit
var _ip_edit: LineEdit
var _status: Label


func _ready() -> void:
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	Net.connection_status.connect(func(t: String) -> void: _status.text = t)
	_build()


func _build() -> void:
	var bg := ColorRect.new()
	bg.color = Color("1d2440")
	bg.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(bg)

	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(center)

	var box := VBoxContainer.new()
	box.custom_minimum_size = Vector2(380, 0)
	box.add_theme_constant_override("separation", 12)
	center.add_child(box)

	var title := Label.new()
	title.text = "ПОДДЕЛКА"
	title.add_theme_font_size_override("font_size", 72)
	title.add_theme_color_override("font_color", Color("c9a227"))
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title)

	var sub := Label.new()
	sub.text = "прототип v0.1 — кооп-ограбление музея"
	sub.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(sub)

	box.add_child(HSeparator.new())

	_name_edit = LineEdit.new()
	_name_edit.placeholder_text = "Твой ник"
	_name_edit.text = "Вор"
	_name_edit.max_length = 16
	box.add_child(_name_edit)

	var host_btn := Button.new()
	host_btn.text = "Создать игру (хост)"
	host_btn.custom_minimum_size = Vector2(0, 48)
	host_btn.pressed.connect(func() -> void: Net.host_game(_name_edit.text))
	box.add_child(host_btn)

	var join_row := HBoxContainer.new()
	_ip_edit = LineEdit.new()
	_ip_edit.text = "127.0.0.1"
	_ip_edit.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	join_row.add_child(_ip_edit)
	var join_btn := Button.new()
	join_btn.text = "Подключиться"
	join_btn.custom_minimum_size = Vector2(150, 48)
	join_btn.pressed.connect(func() -> void: Net.join_game(_ip_edit.text, _name_edit.text))
	join_row.add_child(join_btn)
	box.add_child(join_row)

	_status = Label.new()
	_status.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(_status)

	var quit_btn := Button.new()
	quit_btn.text = "Выход"
	quit_btn.pressed.connect(func() -> void: get_tree().quit())
	box.add_child(quit_btn)
