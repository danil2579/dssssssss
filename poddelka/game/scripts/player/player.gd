extends CharacterBody3D
## Игрок-вор: движение от третьего лица, камера, взаимодействие, синхронизация по сети.
##
## Узел называется peer_id игрока (например "1", "1849302"). Управляет им только
## владелец (multiplayer authority). Остальные получают позицию через _net_state
## и плавно подтягивают модель к ней.

const WALK_SPEED := 4.0
const SPRINT_SPEED := 6.5
const JUMP_VELOCITY := 5.0
const ACCEL := 12.0
const INTERACT_DISTANCE := 2.2
const NET_SEND_RATE := 20.0 # пакетов в секунду

const StripesShader := preload("res://scenes/player/thief_stripes.gdshader")

@onready var body_mesh: MeshInstance3D = $Visual/Body
@onready var mask_mesh: MeshInstance3D = $Visual/Mask
@onready var visual: Node3D = $Visual
@onready var name_tag: Label3D = $NameTag
@onready var camera_pivot: Node3D = $CameraPivot
@onready var spring_arm: SpringArm3D = $CameraPivot/SpringArm3D
@onready var camera: Camera3D = $CameraPivot/SpringArm3D/Camera3D
@onready var prompt_label: Label = $HUD/Prompt

var _gravity: float = ProjectSettings.get_setting("physics/3d/default_gravity")
var _net_timer: float = 0.0
var _target_pos: Vector3
var _target_yaw: float = 0.0
var _focused: Node = null


func _enter_tree() -> void:
	set_multiplayer_authority(name.to_int())


func _ready() -> void:
	_target_pos = global_position
	_apply_identity()
	Net.players_changed.connect(_apply_identity)
	var mine := is_multiplayer_authority()
	camera.current = mine
	$HUD.visible = mine
	name_tag.visible = not mine
	spring_arm.add_excluded_object(get_rid())
	if mine:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED


## Все воры в одинаковых полосатых кофтах, игрока выдаёт только цвет маски.
func _apply_identity() -> void:
	var id := name.to_int()
	var color := Net.get_player_color(id)
	name_tag.text = Net.get_player_name(id)
	name_tag.modulate = color
	if body_mesh.material_override == null:
		var stripes := ShaderMaterial.new()
		stripes.shader = StripesShader
		body_mesh.material_override = stripes
	var mask_mat := StandardMaterial3D.new()
	mask_mat.albedo_color = color
	mask_mat.roughness = 0.6
	mask_mesh.material_override = mask_mat


func _unhandled_input(event: InputEvent) -> void:
	if not is_multiplayer_authority() or Game.ui_open:
		return
	if event is InputEventMouseMotion and Input.mouse_mode == Input.MOUSE_MODE_CAPTURED:
		camera_pivot.rotation.y -= event.relative.x * Game.mouse_sensitivity
		camera_pivot.rotation.x = clampf(
			camera_pivot.rotation.x - event.relative.y * Game.mouse_sensitivity, -1.2, 0.5)
	elif event is InputEventMouseButton and event.pressed:
		Input.mouse_mode = Input.MOUSE_MODE_CAPTURED
	elif event.is_action_pressed("ui_close"):
		Input.mouse_mode = Input.MOUSE_MODE_VISIBLE
	elif event.is_action_pressed("interact") and _focused:
		_focused.interact(self)


func _physics_process(delta: float) -> void:
	if not is_multiplayer_authority():
		_remote_follow(delta)
		return

	if not is_on_floor():
		velocity.y -= _gravity * delta

	var input := Vector2.ZERO
	if not Game.ui_open:
		input = Input.get_vector("move_left", "move_right", "move_forward", "move_back")
		if Input.is_action_just_pressed("jump") and is_on_floor():
			velocity.y = JUMP_VELOCITY

	var basis_yaw := Basis(Vector3.UP, camera_pivot.global_rotation.y)
	var dir := basis_yaw * Vector3(input.x, 0, input.y)
	var speed := SPRINT_SPEED if Input.is_action_pressed("sprint") else WALK_SPEED
	var target_v := dir * speed
	velocity.x = lerpf(velocity.x, target_v.x, ACCEL * delta)
	velocity.z = lerpf(velocity.z, target_v.z, ACCEL * delta)
	move_and_slide()

	if dir.length() > 0.1:
		var want_yaw := atan2(-dir.x, -dir.z) # «перед» персонажа смотрит в -Z
		visual.rotation.y = lerp_angle(visual.rotation.y, want_yaw, 10.0 * delta)

	_update_focus()
	# Камера уткнулась в стену — прячем свою модель, чтобы не загораживала обзор
	visual.visible = spring_arm.get_hit_length() > 1.2

	_net_timer += delta
	if _net_timer >= 1.0 / NET_SEND_RATE:
		_net_timer = 0.0
		Net.send_to_level(self, "_net_state", [global_position, visual.rotation.y])


func _remote_follow(delta: float) -> void:
	global_position = global_position.lerp(_target_pos, minf(1.0, 15.0 * delta))
	visual.rotation.y = lerp_angle(visual.rotation.y, _target_yaw, minf(1.0, 15.0 * delta))


@rpc("authority", "call_remote", "unreliable_ordered")
func _net_state(pos: Vector3, yaw: float) -> void:
	_target_pos = pos
	_target_yaw = yaw


## Ищем ближайший объект из группы "interactable" и показываем подсказку.
func _update_focus() -> void:
	var best: Node = null
	var best_d := INTERACT_DISTANCE
	for n in get_tree().get_nodes_in_group("interactable"):
		if n is Node3D:
			var d := global_position.distance_to((n as Node3D).global_position)
			if d < best_d:
				best_d = d
				best = n
	_focused = best
	if best and not Game.ui_open:
		prompt_label.text = "[E] " + best.get_prompt()
		prompt_label.visible = true
	else:
		prompt_label.visible = false
