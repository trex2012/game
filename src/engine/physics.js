import { GRAVITY, MAX_FALL } from './constants.js';
import { rectsOverlap } from './utils.js';

// Axis-separated AABB physics against a level's solids and one-way platforms.
// Entities need: x, y, w, h, vx, vy, onGround, dropTimer, gravityOff (optional).
export function stepPhysics(ent, level, dt, world) {
  if (!ent.gravityOff) {
    ent.vy = Math.min(ent.vy + GRAVITY * dt, MAX_FALL);
  }

  const solids = level.solids;

  // Horizontal
  ent.x += ent.vx * dt;
  let r = ent.rect;
  for (const s of solids) {
    if (s.passTeam && s.passTeam === ent.team) continue; // Mahito walks through his own wall
    if (!rectsOverlap(r, s)) continue;
    if (ent.vx > 0) ent.x = s.x - ent.w;
    else if (ent.vx < 0) ent.x = s.x + s.w;
    ent.vx = 0;
    r = ent.rect;
  }

  // Arena / level bounds
  const minX = world?.boundsMin ?? 0;
  const maxX = (world?.boundsMax ?? level.width) - ent.w;
  if (ent.x < minX) { ent.x = minX; if (ent.vx < 0) ent.vx = 0; }
  if (ent.x > maxX) { ent.x = maxX; if (ent.vx > 0) ent.vx = 0; }

  // Vertical
  const prevBottom = ent.y + ent.h;
  ent.y += ent.vy * dt;
  ent.onGround = false;
  r = ent.rect;
  for (const s of solids) {
    if (s.passTeam && s.passTeam === ent.team) continue;
    if (!rectsOverlap(r, s)) continue;
    if (ent.vy > 0) {
      ent.y = s.y - ent.h;
      ent.onGround = true;
    } else if (ent.vy < 0) {
      ent.y = s.y + s.h;
    }
    ent.vy = 0;
    r = ent.rect;
  }

  if (ent.vy >= 0 && (ent.dropTimer ?? 0) <= 0) {
    for (const p of level.oneWays) {
      if (p.gone) continue;
      if (prevBottom > p.y + 4) continue; // was not above the platform
      if (!rectsOverlap(ent.rect, p)) continue;
      ent.y = p.y - ent.h;
      ent.vy = 0;
      ent.onGround = true;
      ent.onPlatform = p;
    }
  }
  if (!ent.onGround) ent.onPlatform = null;
}

// True if a rect placed at (x, y) would intersect any solid.
export function collidesSolid(level, x, y, w, h) {
  const r = { x, y, w, h };
  return level.solids.some((s) => rectsOverlap(r, s));
}
