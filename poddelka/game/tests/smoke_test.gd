extends Node
## Дымовой тест: грузит уровень без сети, проверяет спавн игрока,
## рисование, оценку подделки и подмену картины. Печатает цифры для настройки ForgeryJudge.
## Запуск: godot --headless --path game res://tests/smoke_test.tscn

var _failed := false


func _ready() -> void:
	_check_judge()
	var menu: Node = load(Game.MENU_SCENE).instantiate()
	add_child(menu)
	await get_tree().process_frame
	_expect(menu.get_child_count() > 0, "главное меню собралось")
	menu.queue_free()
	var level: Node = load(Game.LEVEL_SCENE).instantiate()
	add_child(level)
	await get_tree().process_frame
	await get_tree().physics_frame
	_expect(level.get_node("Players").get_child_count() == 1, "игрок появился")
	var easel := level.get_node("Easels/EaselPortrait")
	var painting := level.get_node("Paintings/Portrait")
	easel.local_stroke({"pts": PackedVector2Array([Vector2(0.2, 0.2), Vector2(0.8, 0.8)]), "c": Color.RED, "r": 7.0})
	_expect(easel.canvas.strokes.size() == 1, "мазок записан в журнал")
	easel.canvas.flush()
	_expect(easel.canvas.image.get_pixel(128, 128).is_equal_approx(Color.RED), "мазок нарисован")
	easel.interact(null)
	await get_tree().process_frame
	_expect(easel._ui != null and Game.ui_open, "экран рисования открылся")
	easel._ui.queue_free()
	await get_tree().process_frame
	_expect(not Game.ui_open, "экран рисования закрылся")
	easel.local_hang()
	_expect(painting.is_fake, "подделка повешена")
	print("Вердикт на стене: ", painting.verdict_label.text.replace("\n", " | "))
	print("SMOKE TEST: ", "FAIL" if _failed else "OK")
	get_tree().quit(1 if _failed else 0)


func _check_judge() -> void:
	for kind in ["portrait", "landscape"]:
		var original := MasterpieceGenerator.generate(kind, 7)
		var blank := ForgeryCanvas.new()
		var exact := original.duplicate() as Image
		# «Старательная» копия: крупные цветные пятна (как нарисовал бы человек за минуту)
		var rough := original.duplicate() as Image
		rough.resize(8, 8, Image.INTERPOLATE_NEAREST)
		rough.resize(256, 256, Image.INTERPOLATE_NEAREST)
		var very_rough := original.duplicate() as Image
		very_rough.resize(4, 4, Image.INTERPOLATE_NEAREST)
		very_rough.resize(256, 256, Image.INTERPOLATE_NEAREST)
		# «Каракули»: случайные цветные мазки
		var scribble := ForgeryCanvas.new()
		var rng := RandomNumberGenerator.new()
		rng.seed = 1
		for i in 25:
			scribble.apply_stroke({"pts": PackedVector2Array([Vector2(rng.randf(), rng.randf()), Vector2(rng.randf(), rng.randf())]),
				"c": Color(rng.randf(), rng.randf(), rng.randf()), "r": 10.0})
		print("[%s] пустой=%d%% (sim %.3f) | каракули=%d%% (sim %.3f) | грубая копия=%d%% (sim %.3f) | очень грубая=%d%% | точная=%d%%" % [
			kind,
			ForgeryJudge.score(original, blank.image), ForgeryJudge.similarity(original, blank.image),
			ForgeryJudge.score(original, scribble.image), ForgeryJudge.similarity(original, scribble.image),
			ForgeryJudge.score(original, rough), ForgeryJudge.similarity(original, rough),
			ForgeryJudge.score(original, very_rough),
			ForgeryJudge.score(original, exact)])
		_expect(ForgeryJudge.score(original, blank.image) < 15, "%s: пустой холст почти 0%%" % kind)
		_expect(ForgeryJudge.score(original, exact) == 100, "%s: точная копия 100%%" % kind)
		_expect(ForgeryJudge.score(original, rough) >= 60, "%s: грубая копия >= 60%%" % kind)


func _expect(cond: bool, what: String) -> void:
	print(("  ✔ " if cond else "  ✘ ") + what)
	if not cond:
		_failed = true
