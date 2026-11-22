class_name ForgeryJudge
extends RefCounted
## Оценка подделки: насколько рисунок игрока похож на оригинал.
##
## Простой и быстрый метод: обе картинки уменьшаются до сетки GRID×GRID
## и сравниваются цвета клеток. Это ловит общую композицию и цветовые пятна,
## а мелкие детали прощает — как охранник, который смотрит издалека с фонариком.
##
## Значения LOW/HIGH подобраны так, чтобы пустой холст давал ~0%,
## а аккуратная копия — 80–100%. Если оценка кажется несправедливой,
## крутить в первую очередь их (запусти tests/smoke_test.tscn — там печатаются цифры).

const GRID := 12
const LOW := 0.56   # сходство, ниже которого оценка = 0%
const HIGH := 0.97  # сходство, выше которого оценка = 100%


## Сырое сходство 0..1.
static func similarity(original: Image, fake: Image) -> float:
	var a := original.duplicate() as Image
	var b := fake.duplicate() as Image
	a.resize(GRID, GRID, Image.INTERPOLATE_BILINEAR)
	b.resize(GRID, GRID, Image.INTERPOLATE_BILINEAR)
	var total := 0.0
	for y in range(GRID):
		for x in range(GRID):
			var ca := a.get_pixel(x, y)
			var cb := b.get_pixel(x, y)
			var d := Vector3(ca.r - cb.r, ca.g - cb.g, ca.b - cb.b).length() / sqrt(3.0)
			total += d
	return 1.0 - total / float(GRID * GRID)


## Итоговая оценка 0..100.
static func score(original: Image, fake: Image) -> int:
	var s := similarity(original, fake)
	return int(round(clampf(inverse_lerp(LOW, HIGH, s), 0.0, 1.0) * 100.0))


## Реплика охранника/искусствоведа по оценке. Здесь живёт юмор — пополняйте список!
static func verdict(score_value: int) -> String:
	var lines: Array[String]
	if score_value < 15:
		lines = ["Это рисовал ваш кот?", "ТРЕВОГА! Даже я вижу, что это подделка!", "Мона Лиза, что с тобой случилось..."]
	elif score_value < 35:
		lines = ["Охранник подозрительно щурится...", "Хм. Раньше у неё был нос.", "Абстракционизм? В зале Ренессанса?"]
	elif score_value < 55:
		lines = ["В темноте сойдёт.", "Охранник пожал плечами и пошёл дальше.", "Смелая интерпретация."]
	elif score_value < 80:
		lines = ["Неплохо! Искусствовед бы засомневался.", "Охранник ничего не заметил.", "Почти как настоящая!"]
	else:
		lines = ["ШЕДЕВР! Лувр хочет купить вашу подделку.", "Это вообще оригинал?..", "Вас наняли реставратором."]
	return lines[score_value % lines.size()]
