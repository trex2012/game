import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';
import { Hazard } from '../entities/hazard.js';

// Six minion enemy types. Same Fighter pipeline as the roster so every kit
// interaction (absorb, convert, knockback, statuses) works on them.

const flashC = (f, col) => (f.flash > 0 ? '#fff' : col);

export const wisp = {
  id: 'wisp',
  name: 'Wisp',
  minionTier: true,
  xp: 3,
  stats: { maxHp: 10, speed: 60, jumpVel: 0, weight: 'light' },
  size: { w: 22, h: 20 },
  contactDamage: 5,
  brain: { mode: 'fly', sight: 300, contactAlways: true, driftSpeed: 60 },
  basic: { cooldown: 1, onUse() {} },
  draw(ctx2d, f) {
    ctx2d.save();
    ctx2d.translate(f.cx, f.cy + Math.sin(f.animT * 5) * 3);
    ctx2d.fillStyle = flashC(f, '#4a2a5e');
    ctx2d.beginPath();
    ctx2d.arc(0, 0, 10, 0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      ctx2d.arc(-6 + i * 6, -7 + (i % 2) * 3, 5, 0, Math.PI * 2);
    }
    ctx2d.fill();
    ctx2d.fillStyle = flashC(f, '#fff');
    ctx2d.beginPath();
    ctx2d.arc(3 * f.facing, -1, 3.4, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = flashC(f, '#1a0e22');
    ctx2d.beginPath();
    ctx2d.arc(3 * f.facing + 1, -1, 1.6, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  },
};

export const crawler = {
  id: 'crawler',
  name: 'Crawler',
  minionTier: true,
  xp: 5,
  stats: { maxHp: 25, speed: 90, jumpVel: jumpVelForHeight(80, GRAVITY), weight: 'light' },
  size: { w: 30, h: 22 },
  brain: { mode: 'ground', sight: 180, range: 70, windup: 0.4, recover: 0.8 },
  basic: {
    cooldown: 0.5,
    onUse(ctx) {
      ctx.dash(120, 0.25);
      ctx.melee({ damage: 8, w: 40, h: 24, ox: 20, kx: 200, ky: 100, hitstun: 0.25, life: 0.25 });
    },
  },
  draw(ctx2d, f) {
    ctx2d.save();
    ctx2d.translate(f.cx, f.y + f.h);
    ctx2d.scale(f.facing, 1);
    const open = f.state === 'windup' || f.dashT > 0;
    ctx2d.fillStyle = flashC(f, '#1e3326');
    ctx2d.beginPath();
    ctx2d.ellipse(0, -10, 15, 9, 0, 0, Math.PI * 2);
    ctx2d.fill();
    // stubby legs
    ctx2d.fillStyle = flashC(f, '#152419');
    for (let i = 0; i < 4; i++) ctx2d.fillRect(-12 + i * 7, -4 + Math.sin(f.animT * 10 + i) * 1.5, 4, 5);
    // mouth crescent
    ctx2d.fillStyle = flashC(f, '#e8e6da');
    ctx2d.beginPath();
    if (open) ctx2d.arc(10, -10, 6, -0.9, 0.9);
    else ctx2d.arc(10, -10, 5, -0.4, 0.4);
    ctx2d.fill();
    ctx2d.restore();
  },
};

export const secbot = {
  id: 'secbot',
  name: 'Sec-Bot',
  minionTier: true,
  xp: 6,
  stats: { maxHp: 30, speed: 50, jumpVel: 0, weight: 'medium' },
  size: { w: 30, h: 32 },
  brain: { mode: 'ground', sight: 350, range: 340, windup: 0.5, recover: 1.5 },
  minionNoJump: true,
  basic: {
    cooldown: 0.5,
    onUse(ctx) {
      const f = ctx.f;
      const t = f.mem.aimTarget;
      const vy = t ? (t.cy - f.cy) * 0.4 : 0;
      ctx.projectile({ damage: 6, speed: 150, vx: f.facing * 150, vy, range: 400, w: 10, h: 10, color: '#ffd23e' });
    },
  },
  draw(ctx2d, f) {
    ctx2d.save();
    ctx2d.translate(f.cx, f.y + f.h);
    ctx2d.scale(f.facing, 1);
    ctx2d.fillStyle = flashC(f, '#5b6068');
    ctx2d.beginPath();
    ctx2d.roundRect(-14, -30, 28, 24, 6);
    ctx2d.fill();
    // treads
    ctx2d.fillStyle = flashC(f, '#33363c');
    ctx2d.fillRect(-15, -7, 13, 7);
    ctx2d.fillRect(2, -7, 13, 7);
    // eye bar (yellow while aiming)
    ctx2d.fillStyle = flashC(f, f.state === 'windup' ? '#ffd23e' : '#e0443e');
    ctx2d.fillRect(0, -25, 12, 4);
    // antenna
    ctx2d.strokeStyle = flashC(f, '#33363c');
    ctx2d.lineWidth = 1.5;
    ctx2d.beginPath();
    ctx2d.moveTo(-8, -30);
    ctx2d.lineTo(-11, -38);
    ctx2d.stroke();
    ctx2d.restore();
  },
};

export const spitter = {
  id: 'spitter',
  name: 'Spitter',
  minionTier: true,
  xp: 8,
  stats: { maxHp: 20, speed: 0, jumpVel: 0, weight: 'heavy' },
  size: { w: 26, h: 26 },
  brain: { mode: 'turret', sight: 420, windup: 0.6, recover: 1.6 },
  basic: {
    cooldown: 0.5,
    onUse(ctx) {
      const f = ctx.f;
      const t = f.mem.aimTarget;
      if (!t) return;
      const dx = t.cx - f.cx;
      const vx = dx * 1.1;
      const vy = -420;
      ctx.projectile({
        damage: 10, vx, vy, gravity: true, life: 2.4, w: 12, h: 12,
        color: '#9b59b6', trail: '#6c3483',
        onExpire: (world, p) => {
          world.addHazard(new Hazard({
            x: p.cx - 22, y: p.cy - 6, w: 44, h: 10, type: 'splat',
            damage: 4, interval: 0.5, life: 0.9, color: '#9b59b6', team: f.team,
          }));
        },
      });
    },
  },
  draw(ctx2d, f) {
    ctx2d.save();
    ctx2d.translate(f.cx, f.y + f.h);
    const inflate = f.state === 'aim' ? 1 + f.stateT * 0.25 : 1;
    // cone base
    ctx2d.fillStyle = flashC(f, '#3a2f3f');
    ctx2d.beginPath();
    ctx2d.moveTo(-13, 0);
    ctx2d.lineTo(0, -16);
    ctx2d.lineTo(13, 0);
    ctx2d.fill();
    // fleshy bulb
    ctx2d.fillStyle = flashC(f, '#d98abf');
    ctx2d.beginPath();
    ctx2d.ellipse(0, -19, 8 * inflate, 9 * inflate, 0, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.restore();
  },
};

export const diver = {
  id: 'diver',
  name: 'Diver',
  minionTier: true,
  xp: 8,
  stats: { maxHp: 15, speed: 80, jumpVel: 0, weight: 'light' },
  size: { w: 30, h: 22 },
  contactDamage: 9,
  brain: { mode: 'fly', sight: 320, windup: 0.5, diveSpeed: 400, diveWindow: 70 },
  basic: { cooldown: 1, onUse() {} },
  draw(ctx2d, f) {
    ctx2d.save();
    ctx2d.translate(f.cx, f.cy);
    ctx2d.scale(f.facing, 1);
    const flare = f.state === 'telegraph' ? 1.6 : 1;
    const flap = Math.sin(f.animT * 10) * 7 * flare;
    ctx2d.fillStyle = flashC(f, '#14161e');
    ctx2d.beginPath();
    ctx2d.moveTo(-13, 0); ctx2d.lineTo(0, -8); ctx2d.lineTo(13, 0); ctx2d.lineTo(0, 8);
    ctx2d.fill();
    ctx2d.beginPath();
    ctx2d.moveTo(-3, -3); ctx2d.lineTo(-16, -10 - flap); ctx2d.lineTo(-7, 1);
    ctx2d.moveTo(3, -3); ctx2d.lineTo(16, -10 - flap); ctx2d.lineTo(7, 1);
    ctx2d.fill();
    ctx2d.fillStyle = flashC(f, '#e0443e');
    ctx2d.fillRect(5, -3, 2.4, 2.4);
    ctx2d.fillRect(9, -3, 2.4, 2.4);
    ctx2d.restore();
  },
};

export const brute = {
  id: 'brute',
  name: 'Nomu Brute',
  minionTier: true,
  xp: 15,
  stats: { maxHp: 90, speed: 40, jumpVel: jumpVelForHeight(60, GRAVITY), weight: 'colossal' },
  size: { w: 46, h: 52 },
  brain: { mode: 'ground', sight: 340, range: 110, windup: 0.7, recover: 1.2 },
  basic: {
    cooldown: 0.5,
    onUse(ctx) {
      const f = ctx.f;
      // overhead slam + shockwaves sliding outward on both sides
      ctx.melee({ damage: 15, w: 80, h: 60, centered: true, kx: 300, ky: 240, hitstun: 0.5, life: 0.15 });
      for (const dir of [-1, 1]) {
        for (let i = 0; i < 2; i++) {
          ctx.schedule(0.1 + i * 0.12, () => {
            if (!f.alive) return;
            ctx.melee({
              damage: 8, w: 40, h: 26, fixedX: f.cx + dir * (60 + i * 55), fixedY: f.y + f.h - 16,
              kx: 220, ky: 160, hitstun: 0.3, life: 0.12,
            });
            effects.burst(f.cx + dir * (60 + i * 55), f.y + f.h, '#8a8578', 5, { speed: 120 });
          });
        }
      }
      effects.ring(f.cx, f.y + f.h, '#8a8578', 90, 0.35);
      ctx.world.camera?.shake(6, 0.25);
    },
  },
  draw(ctx2d, f) {
    ctx2d.save();
    ctx2d.translate(f.cx, f.y + f.h);
    ctx2d.scale(f.facing, 1);
    const raise = f.state === 'windup' ? -14 : 0;
    // hunched black mass
    ctx2d.fillStyle = flashC(f, '#17131a');
    ctx2d.beginPath();
    ctx2d.ellipse(0, -26, 22, 26, 0, 0, Math.PI * 2);
    ctx2d.fill();
    // long asymmetric arms
    ctx2d.fillStyle = flashC(f, '#100d13');
    ctx2d.fillRect(14, -40 + raise, 9, 40 - raise);
    ctx2d.fillRect(-22, -34 + raise * 0.6, 8, 34);
    // exposed brain dome
    ctx2d.fillStyle = flashC(f, '#d98abf');
    ctx2d.beginPath();
    ctx2d.arc(4, -48, 8, Math.PI, 0);
    ctx2d.fill();
    // beak + eye
    ctx2d.fillStyle = flashC(f, '#e8d8a8');
    ctx2d.fillRect(10, -46, 8, 4);
    ctx2d.fillStyle = flashC(f, '#fff');
    ctx2d.fillRect(6, -50, 4, 3);
    ctx2d.restore();
  },
};

export const MINIONS = { wisp, crawler, secbot, spitter, diver, brute };
