import { Entity } from './entity.js';
import { rectsOverlap } from '../engine/utils.js';

// Damage zones: level spikes, Spitter floor splats, Shigaraki decay patches,
// telegraphed domain slashes. Damages any fighter standing in it, with a
// per-target re-hit interval. `telegraph` shows a warning before it arms.
export class Hazard extends Entity {
  constructor(opts) {
    super(opts.x, opts.y, opts.w, opts.h);
    this.type = opts.type ?? 'spikes';
    this.damage = opts.damage ?? 8;
    this.interval = opts.interval ?? 0.7;
    this.life = opts.life ?? Infinity;
    this.telegraph = opts.telegraph ?? 0; // seconds of warning before active
    this.activeTime = opts.activeTime ?? Infinity; // after telegraph
    this.team = opts.team ?? 'neutral';
    this.status = opts.status ?? null;
    this.kx = opts.kx ?? 120;
    this.ky = opts.ky ?? 200;
    this.domainTick = opts.domainTick ?? false;
    this.bypassesBarrier = opts.bypass ?? this.domainTick;
    this.color = opts.color ?? '#c0392b';
    this.lastHit = new Map(); // fighter -> time until re-hit allowed
    this.t = 0;
  }

  get armed() {
    return this.t >= this.telegraph;
  }

  update(dt, world) {
    this.t += dt;
    if (this.t > this.telegraph + this.activeTime || this.t > this.life) {
      this.alive = false;
      return;
    }
    if (!this.armed) return;
    for (const [f, t] of this.lastHit) this.lastHit.set(f, t - dt);
    for (const f of world.fighters) {
      if (!f.alive) continue;
      if (this.team !== 'neutral' && f.team === this.team) continue;
      if ((this.lastHit.get(f) ?? 0) > 0) continue;
      if (!rectsOverlap(this.rect, f.rect)) continue;
      const hit = {
        damage: this.damage, kx: this.kx, ky: this.ky, hitstun: 0.2,
        isMelee: false, bypassesBarrier: this.bypassesBarrier,
        soul: false, tag: 'hazard', status: this.status, domainTick: this.domainTick,
      };
      f.receiveHit(hit, null, world);
      this.lastHit.set(f, this.interval);
    }
  }

  draw(ctx) {
    const { x, y, w, h } = this;
    if (!this.armed) {
      // warning flash
      ctx.globalAlpha = 0.25 + 0.2 * Math.sin(this.t * 25);
      ctx.fillStyle = '#ff5555';
      ctx.fillRect(x, y, w, h);
      ctx.globalAlpha = 1;
      return;
    }
    if (this.type === 'spikes') {
      ctx.fillStyle = this.color;
      const n = Math.max(2, Math.floor(w / 12));
      for (let i = 0; i < n; i++) {
        ctx.beginPath();
        ctx.moveTo(x + (i * w) / n, y + h);
        ctx.lineTo(x + ((i + 0.5) * w) / n, y);
        ctx.lineTo(x + ((i + 1) * w) / n, y + h);
        ctx.fill();
      }
    } else if (this.type === 'slash') {
      ctx.globalAlpha = 0.85;
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.moveTo(x + w, y);
      ctx.lineTo(x, y + h);
      ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      // splat / decay / water — translucent pool with wobble
      ctx.globalAlpha = 0.55;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}
