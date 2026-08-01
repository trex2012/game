import { Entity } from './entity.js';
import { GRAVITY } from '../engine/constants.js';
import { clamp } from '../engine/utils.js';
import { effects } from '../engine/effects.js';

export class Projectile extends Entity {
  constructor(owner, opts) {
    const w = opts.w ?? 16;
    const h = opts.h ?? 12;
    super(opts.x ?? owner.cx + owner.facing * (owner.w / 2 + 6), (opts.y ?? owner.cy) - h / 2, w, h);
    this.owner = owner;
    this.team = owner.team;
    const speed = opts.speed ?? 400;
    this.vx = opts.vx ?? owner.facing * speed;
    this.vy = opts.vy ?? 0;
    this.damage = opts.damage ?? 6;
    this.kx = opts.kx ?? 150;
    this.ky = opts.ky ?? 80;
    this.hitstun = opts.hitstun ?? 0.15;
    this.life = opts.range != null ? opts.range / Math.max(1, Math.hypot(this.vx, this.vy)) : opts.life ?? 1.2;
    this.pierce = opts.pierce ?? false;
    this.gravity = opts.gravity ?? false;
    this.homing = opts.homing ?? 0; // radians/sec max turn
    this.bypassesBarrier = opts.bypass ?? false;
    this.soul = opts.soul ?? false;
    this.tag = opts.tag ?? 'projectile';
    this.status = opts.status ?? null;
    this.onHitTarget = opts.onHitTarget ?? null;
    this.onExpire = opts.onExpire ?? null; // (world, p) — also called on wall/target impact unless pierce
    this.color = opts.color ?? '#fff';
    this.trail = opts.trail ?? null;
    this.drawFn = opts.draw ?? null;
    this.dying = 0; // Limitless: >0 means slowing to a stop and fading
    this.hitSet = new Set();
    this.trailT = 0;
  }

  toHit() {
    return {
      damage: this.damage, kx: this.kx, ky: this.ky, hitstun: this.hitstun,
      isMelee: false, bypassesBarrier: this.bypassesBarrier, soul: this.soul,
      tag: this.tag, status: this.status,
    };
  }

  update(dt, world) {
    if (this.dying > 0) {
      this.dying -= dt;
      this.vx *= 0.82;
      this.vy *= 0.82;
      if (this.dying <= 0) this.alive = false;
    } else {
      if (this.gravity) this.vy += GRAVITY * 0.6 * dt;
      if (this.homing > 0) {
        const target = world.nearestOpposing(this, 500);
        if (target) {
          const want = Math.atan2(target.cy - this.cy, target.cx - this.cx);
          const cur = Math.atan2(this.vy, this.vx);
          let diff = want - cur;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          const turn = clamp(diff, -this.homing * dt, this.homing * dt);
          const speed = Math.hypot(this.vx, this.vy);
          this.vx = Math.cos(cur + turn) * speed;
          this.vy = Math.sin(cur + turn) * speed;
        }
      }
      this.life -= dt;
      if (this.life <= 0) {
        this.alive = false;
        this.onExpire?.(world, this);
      }
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    if (this.trail) {
      this.trailT -= dt;
      if (this.trailT <= 0) {
        this.trailT = 0.03;
        effects.particles.push({
          x: this.cx, y: this.cy, vx: 0, vy: 0,
          life: 0.25, maxLife: 0.25, size: 3, color: this.trail, gravity: 0,
        });
      }
    }
  }

  draw(ctx) {
    if (this.drawFn) {
      ctx.globalAlpha = this.dying > 0 ? Math.max(0.15, this.dying * 3) : 1;
      this.drawFn(ctx, this);
      ctx.globalAlpha = 1;
      return;
    }
    ctx.globalAlpha = this.dying > 0 ? Math.max(0.15, this.dying * 3) : 1;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.ellipse(this.cx, this.cy, this.w / 2, this.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
}
