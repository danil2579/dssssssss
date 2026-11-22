class_name MasterpieceGenerator
extends RefCounted
## Временные «шедевры» для прототипа, нарисованные кодом.
##
## В полной версии их заменят настоящие картины из общественного достояния
## (Википедия/Wikimedia Commons, открытые коллекции музеев) — см. docs/02_ASSETS.md.
## Генерация детерминирована по seed: у всех игроков получается одна и та же картина.

const SIZE := 256


static func generate(kind: String, seed_value: int = 0) -> Image:
	match kind:
		"portrait":
			return _portrait(seed_value)
		"landscape":
			return _landscape(seed_value)
		_:
			return _portrait(seed_value)


## «Портрет загадочной дамы»: тёмный фон, пейзаж вдали, фигура по центру.
static func _portrait(seed_value: int) -> Image:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var img := Image.create_empty(SIZE, SIZE, false, Image.FORMAT_RGBA8)
	var hue_shift := rng.randf_range(-0.03, 0.03)
	var top := Color.from_hsv(0.22 + hue_shift, 0.35, 0.45)
	var bottom := Color.from_hsv(0.10 + hue_shift, 0.55, 0.25)
	_vertical_gradient(img, top, bottom)
	# Дальний пейзаж: голубоватая полоса гор
	_fill_ellipse(img, Vector2(40, 120), Vector2(70, 30), Color(0.45, 0.55, 0.5))
	_fill_ellipse(img, Vector2(215, 115), Vector2(70, 34), Color(0.42, 0.52, 0.5))
	# Тело (тёмное платье)
	_fill_ellipse(img, Vector2(128, 250), Vector2(95, 85), Color(0.16, 0.12, 0.08))
	# Руки
	_fill_ellipse(img, Vector2(128, 225), Vector2(34, 12), Color(0.86, 0.68, 0.5))
	# Волосы (за головой)
	_fill_ellipse(img, Vector2(128, 100), Vector2(42, 56), Color(0.18, 0.12, 0.07))
	# Лицо
	_fill_ellipse(img, Vector2(128, 98), Vector2(30, 38), Color(0.89, 0.71, 0.53))
	# Шея
	_fill_ellipse(img, Vector2(128, 142), Vector2(13, 14), Color(0.85, 0.66, 0.48))
	# Глаза
	_fill_ellipse(img, Vector2(117, 92), Vector2(3.5, 2.5), Color(0.12, 0.08, 0.05))
	_fill_ellipse(img, Vector2(139, 92), Vector2(3.5, 2.5), Color(0.12, 0.08, 0.05))
	# Та самая загадочная улыбка
	for x in range(118, 139):
		var t := (x - 128.0) / 10.0
		var y := int(114 + 2.0 * (1.0 - t * t))
		img.set_pixel(x, y, Color(0.55, 0.28, 0.2))
	return img


## «Закат над рекой»: небо, солнце, вода, берег.
static func _landscape(seed_value: int) -> Image:
	var rng := RandomNumberGenerator.new()
	rng.seed = seed_value
	var img := Image.create_empty(SIZE, SIZE, false, Image.FORMAT_RGBA8)
	_vertical_gradient(img, Color(0.98, 0.62, 0.3), Color(0.55, 0.25, 0.45))
	_fill_ellipse(img, Vector2(rng.randf_range(80, 176), 120), Vector2(26, 26), Color(1.0, 0.9, 0.55))
	for y in range(150, SIZE):
		for x in range(SIZE):
			img.set_pixel(x, y, Color(0.2, 0.3, 0.55).lerp(Color(0.1, 0.15, 0.3), (y - 150) / 106.0))
	_fill_ellipse(img, Vector2(0, 170), Vector2(110, 30), Color(0.15, 0.25, 0.12))
	_fill_ellipse(img, Vector2(256, 175), Vector2(90, 26), Color(0.12, 0.2, 0.1))
	return img


static func _vertical_gradient(img: Image, top: Color, bottom: Color) -> void:
	for y in range(SIZE):
		var c := top.lerp(bottom, float(y) / (SIZE - 1))
		for x in range(SIZE):
			img.set_pixel(x, y, c)


static func _fill_ellipse(img: Image, center: Vector2, radii: Vector2, color: Color) -> void:
	var x0 := maxi(int(center.x - radii.x), 0)
	var x1 := mini(int(center.x + radii.x) + 1, SIZE)
	var y0 := maxi(int(center.y - radii.y), 0)
	var y1 := mini(int(center.y + radii.y) + 1, SIZE)
	for y in range(y0, y1):
		for x in range(x0, x1):
			var dx := (x - center.x) / radii.x
			var dy := (y - center.y) / radii.y
			if dx * dx + dy * dy <= 1.0:
				img.set_pixel(x, y, color)
