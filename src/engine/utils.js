export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (lo = 0, hi = 1) => lo + Math.random() * (hi - lo);
export const randInt = (lo, hi) => Math.floor(rand(lo, hi + 1));
export const choice = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
export const sign = (v) => (v < 0 ? -1 : 1);

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Initial jump velocity that reaches `height` pixels under gravity g.
export const jumpVelForHeight = (height, g) => Math.sqrt(2 * g * height);

// Deterministic pseudo-random stream (used for background silhouettes so they
// don't reshuffle every frame).
export function seededRand(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
