shader_type spatial;
// Временная «полосатая кофта» для капсулы-прототипа: одинаковая у всех воров.
// Игроков различаем по цвету маски (см. player.gd → _apply_identity).

uniform vec4 stripe_dark : source_color = vec4(0.06, 0.06, 0.07, 1.0);
uniform vec4 stripe_light : source_color = vec4(0.95, 0.94, 0.92, 1.0);
uniform float stripes_per_meter = 7.0;
uniform float pants_below = -0.15; // ниже этой высоты (локально) — чёрные штаны

varying float local_y;

void vertex() {
	local_y = VERTEX.y;
}

void fragment() {
	float band = step(0.5, fract(local_y * stripes_per_meter));
	vec3 col = mix(stripe_dark.rgb, stripe_light.rgb, band);
	col = local_y < pants_below ? stripe_dark.rgb : col;
	ALBEDO = col;
	ROUGHNESS = 0.85;
}
