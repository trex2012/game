// Logical resolution — everything in the game is drawn in this coordinate space.
export const W = 960;
export const H = 540;

export const STEP = 1 / 60;

// Physics
export const GRAVITY = 1800;
export const MAX_FALL = 950;
export const GROUND_ACCEL = 2800;
export const AIR_ACCEL = 1700;
export const GROUND_FRICTION = 2400;
export const AIR_FRICTION = 250;
export const COYOTE_TIME = 0.08;
export const JUMP_BUFFER = 0.12;
export const DROP_THROUGH_TIME = 0.22;

// Combat
export const IFRAMES = 0.3;
export const HITSTOP_LIGHT = 3;   // frames
export const HITSTOP_HEAVY = 8;
export const HITSTOP_SUPER = 14;
export const KO_SLOWMO = 0.4;

// Meters
export const ENERGY_MAX = 100;
export const DOMAIN_MAX = 100;

// Weight class -> knockback taken multiplier
export const WEIGHT_KB = { light: 1.25, medium: 1.0, heavy: 0.75, colossal: 0.5 };

// ?debug=1 unlocks everything (guarded so this also works outside a browser)
export const DEBUG =
  typeof location !== 'undefined' && new URLSearchParams(location.search).has('debug');
