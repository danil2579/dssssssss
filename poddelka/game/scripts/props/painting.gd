extends Node3D
## Картина на стене музея. Хранит оригинал и умеет показать вместо него подделку.

@export var painting_kind: String = "portrait"
@export var painting_seed: int = 7
@export var title: String = "Дама с загадочной улыбкой"

@onready var canvas_mesh: MeshInstance3D = $Canvas
@onready var plaque: Label3D = $Plaque
@onready var verdict_label: Label3D = $Verdict

var original_image: Image
var original_texture: ImageTexture
var is_fake: bool = false
var _material: StandardMaterial3D


func _ready() -> void:
	original_image = MasterpieceGenerator.generate(painting_kind, painting_seed)
	original_texture = ImageTexture.create_from_image(original_image)
	_material = StandardMaterial3D.new()
	_material.albedo_texture = original_texture
	_material.texture_filter = BaseMaterial3D.TEXTURE_FILTER_LINEAR_WITH_MIPMAPS
	canvas_mesh.material_override = _material
	plaque.text = title
	verdict_label.visible = false


## Повесить подделку вместо оригинала. Вызывается на всех клиентах одинаково.
func hang_fake(fake: Image) -> int:
	var s := ForgeryJudge.score(original_image, fake)
	_material.albedo_texture = ImageTexture.create_from_image(fake)
	is_fake = true
	verdict_label.text = "%d%%\n%s" % [s, ForgeryJudge.verdict(s)]
	verdict_label.modulate = Color.RED.lerp(Color.GREEN, s / 100.0)
	verdict_label.visible = true
	return s


func restore_original() -> void:
	_material.albedo_texture = original_texture
	is_fake = false
	verdict_label.visible = false
