extends Node

var is_host := false


func _ready() -> void:
	if is_host:
		Net.host_game("ТестХост")
		await get_tree().create_timer(7.0).timeout
		var lvl := get_tree().current_scene
		var easel := lvl.get_node("Easels/EaselPortrait")
		var painting := lvl.get_node("Paintings/Portrait")
		var players := lvl.get_node("Players").get_child_count()
		print("HOST: игроков=%d, мазков=%d, подделка=%s, in_level=%s" % [players, easel.canvas.strokes.size(), painting.is_fake, Net.in_level])
		print("NET TEST: ", "OK" if players == 2 and easel.canvas.strokes.size() == 1 and painting.is_fake else "FAIL")
		get_tree().quit()
	else:
		Net.join_game("127.0.0.1", "ТестКлиент")
		await get_tree().create_timer(3.0).timeout
		var lvl := get_tree().current_scene
		var easel := lvl.get_node("Easels/EaselPortrait")
		easel.local_stroke({"pts": PackedVector2Array([Vector2(0.1, 0.5), Vector2(0.9, 0.5)]), "c": Color.BLUE, "r": 5.0})
		easel.local_hang()
		print("CLIENT: нарисовал и повесил. Игроков у меня: ", lvl.get_node("Players").get_child_count())
		await get_tree().create_timer(3.0).timeout
		get_tree().quit()
