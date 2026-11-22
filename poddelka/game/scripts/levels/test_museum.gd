extends Node3D
## Тестовый зал музея (грейбокс). Отвечает за появление/исчезновение игроков.
##
## Схема спавна (сервер решает, клиенты слушаются):
##   1. Клиент загрузил уровень → шлёт серверу _client_ready.
##   2. Сервер создаёт его игрока у себя, рассылает «создай игрока X» всем готовым,
##      а новичку — всех, кто уже есть, плюс состояние объектов (холсты и т.п.).
## Если открыть эту сцену напрямую (F6) без сети, вы будете игроком №1 в одиночку.

const PlayerScene := preload("res://scenes/player/player.tscn")

@onready var players_root: Node3D = $Players
@onready var spawn_points: Node3D = $SpawnPoints

var _ready_peers: Array[int] = []


func _ready() -> void:
	if multiplayer.is_server():
		multiplayer.peer_disconnected.connect(_on_peer_disconnected)
		_spawn_local(1, _spawn_position(0))
		Net.set_in_level([1])
	else:
		_client_ready.rpc_id(1)


@rpc("any_peer", "call_remote", "reliable")
func _client_ready() -> void:
	if not multiplayer.is_server():
		return
	var id := multiplayer.get_remote_sender_id()
	if id in _ready_peers:
		return
	var pos := _spawn_position(players_root.get_child_count())
	# Новичку — все уже существующие игроки
	for p in players_root.get_children():
		_rpc_spawn.rpc_id(id, p.name.to_int(), (p as Node3D).global_position)
	# Всем — новичок
	_spawn_local(id, pos)
	_ready_peers.append(id)
	for peer in _ready_peers:
		_rpc_spawn.rpc_id(peer, id, pos)
	# Состояние интерактивных объектов
	for n in get_tree().get_nodes_in_group("net_state"):
		n.send_state_to(id)
	# Теперь новичку можно слать всё подряд
	var list := Net.in_level.duplicate()
	list.append(id)
	Net.set_in_level(list)


@rpc("authority", "call_remote", "reliable")
func _rpc_spawn(id: int, pos: Vector3) -> void:
	_spawn_local(id, pos)


@rpc("authority", "call_remote", "reliable")
func _rpc_despawn(id: int) -> void:
	_despawn_local(id)


func _on_peer_disconnected(id: int) -> void:
	_ready_peers.erase(id)
	var list := Net.in_level.duplicate()
	list.erase(id)
	Net.set_in_level(list)
	_despawn_local(id)
	for peer in _ready_peers:
		_rpc_despawn.rpc_id(peer, id)


func _spawn_local(id: int, pos: Vector3) -> void:
	if players_root.has_node(str(id)):
		return
	print("[peer %d] появился игрок %d" % [multiplayer.get_unique_id(), id])
	var p := PlayerScene.instantiate()
	p.name = str(id)
	players_root.add_child(p)
	p.global_position = pos


func _despawn_local(id: int) -> void:
	var p := players_root.get_node_or_null(str(id))
	if p:
		p.queue_free()


func _spawn_position(index: int) -> Vector3:
	var points := spawn_points.get_children()
	if points.is_empty():
		return Vector3.ZERO
	return (points[index % points.size()] as Node3D).global_position
