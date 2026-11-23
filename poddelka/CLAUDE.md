# CLAUDE.md — контекст проекта «ПОДДЕЛКА»

## Что это
Кооп-игра для Steam на 1–4 игроков: ограбление музея, где игроки рисуют подделки шедевров прямо в игре, пока другие отвлекают охрану. Жанр «friendslop»: дешёвая, смешная, физичная, с голосовым чатом. Цель — полноценный релиз в Steam, а не прототип.

Автор — начинающий разработчик, общается по-русски. **Отвечать по-русски**, объяснять просто, предлагать конкретные следующие шаги.

## Где что лежит
- `docs/01_GDD.md` — дизайн-документ (источник правды по механикам)
- `docs/02_ASSETS.md` — стратегия по арту и ассетам, стиль, лицензии
- `docs/03_TECH.md` — архитектура, сеть, соглашения, тесты
- `docs/04_ROADMAP.md` — план. Отмечать выполненные пункты `[x]`
- `game/` — проект Godot 4.7 (GDScript)

## Ключевые решения (не менять без обсуждения)
- Godot 4.7.x, GDScript со статической типизацией. Unreal не используем: Blueprints бинарные, Claude не может их править.
- Сеть: host-authoritative. Сейчас ENet, на этапе 2 — Steam (GodotSteam, SteamMultiplayerPeer). Код игры использует только стандартный `multiplayer` API.
- RPC объектам уровня отправлять через `Net.send_to_level(obj, "метод", [args])`, а не через `.rpc()` (иначе ошибки у загружающихся клиентов).
- Спавн игроков ручной, через RPC в `scripts/levels/test_museum.gd` (не MultiplayerSpawner).
- Мазок холста = `{"pts": PackedVector2Array(0..1), "c": Color, "r": float}`. Применяется детерминированно у всех.
- Стиль: гладкий мультяшный 3D «как игрушка», как на концепт-арте (пухлые воры, тёплый свет, ночной музей). Пока этап 1 — геймплей в грейбоксе.
- Каждый сторонний ассет записывать в `game/assets/CREDITS.md`.
- Воры выглядят одинаково (полосатая кофта, шапка); **игрока различаем только по цвету маски** и цвету ника (`Game.PLAYER_COLORS`). В 3D-модели маска должна быть отдельным материалом `Mask`.
- Персонажи — AI-генерация в Higgsfield (image-to-3D) + доработка в Blender + анимации Mixamo. Тестовая модель: `game/assets/models/characters/thief/thief_ai_v1.glb` («перед» модели +Z → в игре развернуть на 180°).

## Команды
```bash
# из папки poddelka; GODOT = путь к exe (в Windows — *_console.exe)
$GODOT --headless --path game --import                         # переимпорт после правок вне редактора
$GODOT --headless --path game res://tests/smoke_test.tscn      # ожидаем "SMOKE TEST: OK"
$GODOT --headless --path game res://tests/net_test.tscn -- --net-test-host   # терминал 1
$GODOT --headless --path game res://tests/net_test.tscn -- --net-test-join   # терминал 2, ожидаем "NET TEST: OK" у хоста
$GODOT --path game -- --host            # быстрый старт хоста без меню
$GODOT --path game -- --join 127.0.0.1  # быстрый старт клиента
```
После изменений в коде запускать smoke_test, после изменений в сети — ещё и net_test.

Blender из командной строки (скрипты моделей без открытия интерфейса), Windows:
```bash
"C:/Program Files/Blender Foundation/Blender 4.5/blender.exe" --background --python tools/blender/имя_скрипта.py
```
(версию в пути подставить свою; скрипты Blender храним в `tools/blender/`).

## Нюансы формата .tscn
- `Transform3D(...)` в .tscn записывается **по строкам матрицы** базиса, затем origin. Поворот вокруг X на −15° (камера смотрит вниз) = `Transform3D(1, 0, 0, 0, 0.966, 0.259, 0, -0.259, 0.966, x, y, z)`.
- «Перед» персонажа — это −Z.
- Файлы `*.uid` и `*.import` коммитим, папку `.godot/` — нет.
