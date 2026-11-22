extends Node
## Сетевой тест: два экземпляра игры, клиент рисует и вешает подделку,
## хост проверяет, что всё дошло. Запуск (в двух терминалах или фоном):
##   godot --headless --path game res://tests/net_test.tscn -- --net-test-host
##   godot --headless --path game res://tests/net_test.tscn -- --net-test-join

func _ready() -> void:
	var args := OS.get_cmdline_user_args()
	var runner := Node.new()
	runner.set_script(load("res://tests/net_test_runner.gd"))
	runner.is_host = "--net-test-host" in args
	get_tree().root.add_child.call_deferred(runner)
