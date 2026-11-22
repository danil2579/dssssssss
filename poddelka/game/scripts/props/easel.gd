extends Node3D
## Мольберт: здесь рисуют подделку. Холст общий для всех игроков —
## пока один рисует, остальные видят мазки в реальном времени прямо на мольберте.
##
## Сеть: каждый мазок рассылается всем, кто на уровне (Net.send_to_level),
## а опоздавшим сервер отправляет весь журнал мазков (send_state_to).

const DrawingUIScene := preload("res://scenes/ui/drawing_ui.tscn")

## Картина, которую подделываем.
@export var target_painting: NodePath

@onready var canvas_mesh: MeshInstance3D = $Canvas

var canvas := ForgeryCanvas.new()
var _ui: Control = null


func _ready() -> void:
	add_to_group("interactable")
	add_to_group("net_state")
	var mat := StandardMaterial3D.new()
	mat.albedo_texture = canvas.texture
	mat.texture_filter = BaseMaterial3D.TEXTURE_FILTER_NEAREST
	canvas_mesh.material_override = mat


func _process(_delta: float) -> void:
	canvas.flush()


func get_prompt() -> String:
	return "Рисовать подделку"


func get_painting() -> Node:
	return get_node_or_null(target_painting)


func interact(_player: Node) -> void:
	if _ui:
		return
	var painting := get_painting()
	_ui = DrawingUIScene.instantiate()
	_ui.setup(self, painting.original_texture if painting else null)
	_ui.tree_exited.connect(func() -> void: _ui = null)
	get_tree().root.add_child(_ui)


# --- Вызывается из DrawingUI ----------------------------------------------

func local_stroke(stroke: Dictionary) -> void:
	canvas.apply_stroke(stroke)
	Net.send_to_level(self, "_rpc_stroke", [stroke])


func local_clear() -> void:
	canvas.clear()
	Net.send_to_level(self, "_rpc_clear")


func local_hang() -> void:
	_rpc_hang()
	Net.send_to_level(self, "_rpc_hang")


# --- Сеть -------------------------------------------------------------------

@rpc("any_peer", "call_remote", "reliable")
func _rpc_stroke(stroke: Dictionary) -> void:
	canvas.apply_stroke(stroke)


@rpc("any_peer", "call_remote", "reliable")
func _rpc_clear() -> void:
	canvas.clear()


@rpc("any_peer", "call_remote", "reliable")
func _rpc_hang() -> void:
	var painting := get_painting()
	if painting:
		painting.hang_fake(canvas.snapshot())


## Сервер отправляет новому игроку текущее состояние холста.
func send_state_to(peer_id: int) -> void:
	_rpc_load.rpc_id(peer_id, canvas.strokes)


@rpc("authority", "call_remote", "reliable")
func _rpc_load(strokes: Array) -> void:
	canvas.load_strokes(strokes)
