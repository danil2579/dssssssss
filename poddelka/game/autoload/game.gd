extends Node
## Глобальные настройки игры и раскладка управления.
## Действия регистрируются кодом, чтобы project.godot оставался коротким и читаемым.
## Позже раскладку можно перенести в Project Settings → Input Map или в меню настроек.

const LEVEL_SCENE := "res://scenes/levels/test_museum.tscn"
const MENU_SCENE := "res://scenes/ui/main_menu.tscn"

## Цвета игроков: выдаются по порядку подключения (см. Net.get_player_color).
const PLAYER_COLORS: Array[Color] = [
	Color("e8463c"), # красный
	Color("3c8de8"), # синий
	Color("f2c230"), # жёлтый
	Color("4cc76a"), # зелёный
	Color("b05ce0"), # фиолетовый
	Color("f08a3c"), # оранжевый
]

## true, пока открыт какой-нибудь UI (рисование, пауза) — игрок не двигается.
var ui_open: bool = false

var mouse_sensitivity: float = 0.0025


func _ready() -> void:
	_setup_input()


func _setup_input() -> void:
	_add_key("move_forward", KEY_W)
	_add_key("move_back", KEY_S)
	_add_key("move_left", KEY_A)
	_add_key("move_right", KEY_D)
	_add_key("jump", KEY_SPACE)
	_add_key("sprint", KEY_SHIFT)
	_add_key("interact", KEY_E)
	_add_key("ui_close", KEY_ESCAPE)


func _add_key(action: StringName, keycode: Key) -> void:
	if not InputMap.has_action(action):
		InputMap.add_action(action)
	var ev := InputEventKey.new()
	ev.physical_keycode = keycode
	InputMap.action_add_event(action, ev)
