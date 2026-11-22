extends Node
## Сетевой слой: хост/подключение, список игроков.
##
## Сейчас используется ENet (прямое подключение по IP) — удобно для разработки
## и тестов на одном компьютере. На этапе 2 сюда добавляется Steam
## (GodotSteam: лобби + SteamMultiplayerPeer). Остальной код игры
## работает через стандартный multiplayer API Godot и меняться не должен.
##
## Быстрый запуск без меню (удобно при разработке):
##   godot --path game -- --host
##   godot --path game -- --join 127.0.0.1

signal players_changed
signal connection_status(text: String)

const DEFAULT_PORT := 7777
const MAX_PLAYERS := 4

## peer_id -> {"name": String, "color_index": int}
var players: Dictionary = {}

## Кто уже загрузил уровень. Слать RPC объектам уровня можно только им,
## иначе у загружающегося игрока будет ошибка «node not found».
var in_level: Array[int] = []

var _local_name: String = "Вор"


func _ready() -> void:
	multiplayer.peer_connected.connect(_on_peer_connected)
	multiplayer.peer_disconnected.connect(_on_peer_disconnected)
	multiplayer.connected_to_server.connect(_on_connected_to_server)
	multiplayer.connection_failed.connect(_on_connection_failed)
	multiplayer.server_disconnected.connect(_on_server_disconnected)
	_handle_cmdline.call_deferred()


func _handle_cmdline() -> void:
	var args := OS.get_cmdline_user_args()
	var idx := args.find("--host")
	if idx != -1:
		host_game("Хост")
		return
	idx = args.find("--join")
	if idx != -1:
		var ip := "127.0.0.1"
		if idx + 1 < args.size():
			ip = args[idx + 1]
		join_game(ip, "Клиент")


func is_online() -> bool:
	return multiplayer.multiplayer_peer != null \
		and not (multiplayer.multiplayer_peer is OfflineMultiplayerPeer)


func host_game(player_name: String, port: int = DEFAULT_PORT) -> Error:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_server(port, MAX_PLAYERS)
	if err != OK:
		connection_status.emit("Не удалось создать сервер (порт %d занят?)" % port)
		return err
	multiplayer.multiplayer_peer = peer
	_local_name = _clean_name(player_name)
	players.clear()
	players[1] = {"name": _local_name, "color_index": 0}
	players_changed.emit()
	get_tree().change_scene_to_file(Game.LEVEL_SCENE)
	return OK


func join_game(ip: String, player_name: String, port: int = DEFAULT_PORT) -> Error:
	var peer := ENetMultiplayerPeer.new()
	var err := peer.create_client(ip, port)
	if err != OK:
		connection_status.emit("Не удалось подключиться к %s" % ip)
		return err
	multiplayer.multiplayer_peer = peer
	_local_name = _clean_name(player_name)
	connection_status.emit("Подключаемся к %s..." % ip)
	return OK


func leave_game() -> void:
	if multiplayer.multiplayer_peer:
		multiplayer.multiplayer_peer.close()
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()
	players.clear()
	in_level.clear()
	Game.ui_open = false
	Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	get_tree().change_scene_to_file(Game.MENU_SCENE)


## Отправить RPC всем, кто на уровне (кроме себя).
## Пример: Net.send_to_level(self, "_rpc_stroke", [stroke])
func send_to_level(obj: Object, method: StringName, args: Array = []) -> void:
	if not is_online():
		return
	var me := multiplayer.get_unique_id()
	for peer in in_level:
		if peer != me:
			obj.callv("rpc_id", [peer, method] + args)


## Сервер: обновить список «на уровне» и разослать его.
func set_in_level(list: Array[int]) -> void:
	in_level = list
	if is_online():
		_sync_in_level.rpc(in_level)


@rpc("authority", "call_remote", "reliable")
func _sync_in_level(list: Array) -> void:
	in_level.assign(list)


func get_player_name(peer_id: int) -> String:
	if players.has(peer_id):
		return players[peer_id]["name"]
	return "Вор #%d" % peer_id


func get_player_color(peer_id: int) -> Color:
	var i: int = 0
	if players.has(peer_id):
		i = players[peer_id]["color_index"]
	return Game.PLAYER_COLORS[i % Game.PLAYER_COLORS.size()]


# --- Внутреннее ---------------------------------------------------------

func _clean_name(n: String) -> String:
	n = n.strip_edges()
	if n.is_empty():
		n = "Вор"
	return n.substr(0, 16)


func _on_connected_to_server() -> void:
	connection_status.emit("Подключено!")
	_register_player.rpc_id(1, _local_name)
	get_tree().change_scene_to_file(Game.LEVEL_SCENE)


func _on_connection_failed() -> void:
	connection_status.emit("Подключение не удалось")
	multiplayer.multiplayer_peer = OfflineMultiplayerPeer.new()


func _on_server_disconnected() -> void:
	leave_game()


func _on_peer_connected(_id: int) -> void:
	pass # Игрок регистрируется сам через _register_player.


func _on_peer_disconnected(id: int) -> void:
	in_level.erase(id)
	if multiplayer.is_server() and players.has(id):
		players.erase(id)
		_sync_players.rpc(players)
		players_changed.emit()


## Клиент -> сервер: «я такой-то».
@rpc("any_peer", "call_remote", "reliable")
func _register_player(player_name: String) -> void:
	if not multiplayer.is_server():
		return
	var id := multiplayer.get_remote_sender_id()
	players[id] = {"name": _clean_name(player_name), "color_index": _free_color_index()}
	_sync_players.rpc(players)
	players_changed.emit()


## Сервер -> все: актуальный список игроков.
@rpc("authority", "call_remote", "reliable")
func _sync_players(new_players: Dictionary) -> void:
	players = new_players
	players_changed.emit()


func _free_color_index() -> int:
	var used: Array[int] = []
	for p in players.values():
		used.append(p["color_index"])
	for i in Game.PLAYER_COLORS.size():
		if i not in used:
			return i
	return players.size()
