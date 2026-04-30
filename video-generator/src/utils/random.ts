/**
 * Deterministic pseudo-random utilities.
 *
 * The whole template needs to be reproducible — same input, same output.
 * We use mulberry32 keyed by a 32-bit seed so every particle / grain cell /
 * scratch can be derived from a known integer.
 */

export const mulberry32 = (seed: number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Smooth deterministic value noise in [-1, 1] over a 1-D continuous time t. */
export const valueNoise1D = (t: number, seed: number) => {
  const i = Math.floor(t);
  const f = t - i;
  const rand = (n: number) => {
    const r = mulberry32(seed + n * 374761393);
    return r() * 2 - 1;
  };
  const a = rand(i);
  const b = rand(i + 1);
  // smoothstep
  const u = f * f * (3 - 2 * f);
  return a + (b - a) * u;
};
