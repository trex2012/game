import { W } from './constants.js';
import { clamp, rand } from './utils.js';

export class Camera {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.minX = 0;
    this.maxX = 0; // max camera x (level.width - W)
    this.lockMin = null; // boss-arena lock
    this.lockMax = null;
    this.shakeT = 0;
    this.shakeMag = 0;
    this.sx = 0;
    this.sy = 0;
    this.zoom = 1;
    this.zoomTarget = 1;
  }

  setLevelBounds(levelWidth) {
    this.minX = 0;
    this.maxX = Math.max(0, levelWidth - W);
  }

  lockTo(minX, maxX) {
    this.lockMin = minX;
    this.lockMax = Math.max(minX, maxX - W);
  }

  unlock() {
    this.lockMin = this.lockMax = null;
  }

  snapTo(target) {
    this.x = this.clampX(target.cx - W / 2);
  }

  clampX(x) {
    const lo = this.lockMin ?? this.minX;
    const hi = this.lockMax ?? this.maxX;
    return clamp(x, lo, hi);
  }

  shake(mag, dur) {
    if (this.shakeEnabled === false) return;
    this.shakeMag = Math.max(this.shakeMag, mag);
    this.shakeT = Math.max(this.shakeT, dur);
  }

  update(dt, target) {
    if (target) {
      const lookahead = target.facing * 60;
      const want = this.clampX(target.cx - W / 2 + lookahead);
      this.x += (want - this.x) * Math.min(1, dt * 8);
    }
    this.zoom += (this.zoomTarget - this.zoom) * Math.min(1, dt * 5);
    if (this.shakeT > 0) {
      this.shakeT -= dt;
      const m = this.shakeMag * Math.min(1, this.shakeT * 4);
      this.sx = rand(-m, m);
      this.sy = rand(-m, m);
      if (this.shakeT <= 0) this.shakeMag = 0;
    } else {
      this.sx = this.sy = 0;
    }
  }

  apply(ctx) {
    ctx.save();
    if (this.zoom !== 1) {
      ctx.translate(W / 2, 270);
      ctx.scale(this.zoom, this.zoom);
      ctx.translate(-W / 2, -270);
    }
    ctx.translate(Math.round(-this.x + this.sx), Math.round(-this.y + this.sy));
  }

  reset(ctx) {
    ctx.restore();
  }
}
