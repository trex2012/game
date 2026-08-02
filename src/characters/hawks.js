import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'hawks',
  name: 'Wingman Hawks',
  series: 'MHA',
  unlockLevel: 16,
  stats: { maxHp: 105, speed: 385, jumpVel: jumpVelForHeight(185, GRAVITY), weight: 'light' },
  palette: { skin: '#f2cfa5', hair: '#e8c860', top: '#5a4632', bottom: '#3a3230', accent: '#c03028' },
  hairStyle: 'messy',
  ai: { type: 'zoner', band: 300 },
  moves: [
    { name: 'Feather Blade', desc: 'Rapid-fire razor feather. Flies low enough to clip crawlers.' },
    { name: 'Tailwind', desc: 'Passive: the No. 2 hero is faster than everyone — and quicker still while airborne.' },
  ],

  basic: {
    name: 'Feather Blade',
    cooldown: 0.24,
    onUse(ctx) {
      const f = ctx.f;
      ctx.projectile({
        damage: 5, speed: 700, range: 400, w: 14, h: 16, y: f.cy + 4,
        kx: 100, ky: 60, hitstun: 0.16,
        color: '#d84838', trail: '#c03028',
      });
      effects.slash(f.cx + f.facing * 10, f.cy - 8, f.cx + f.facing * 34, f.cy - 12, '#d84838');
    },
  },

  super: {
    name: 'Feather Storm',
    cost: 30,
    cooldown: 1.3,
    desc: 'A fan of five razor feathers — 7 dmg each, covering high and low.',
    onUse(ctx) {
      const f = ctx.f;
      for (let i = -2; i <= 2; i++) {
        ctx.projectile({
          damage: 7, speed: 640, vy: i * 85, range: 420, w: 15, h: 12, y: f.cy + 2,
          kx: 140, ky: 90, hitstun: 0.22, tag: 'super',
          color: '#d84838', trail: '#ffb0a0',
        });
      }
      effects.burst(f.cx + f.facing * 26, f.cy - 8, ['#d84838', '#ffb0a0'], 12, { speed: 200 });
    },
  },

  tech: {
    name: 'Wing Dash',
    cost: 10,
    cooldown: 3.5,
    desc: 'A blinding dash on crimson wings — slashes everything along the path.',
    onUse(ctx) {
      const f = ctx.f;
      f.invuln = Math.max(f.invuln, 0.22);
      ctx.dash(220, 0.18);
      ctx.melee({ damage: 8, w: 200, h: 44, ox: 90, life: 0.2, kx: 160, ky: 100, hitstun: 0.25, tag: 'super' });
      effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#c03028' });
      effects.slash(f.cx, f.cy, f.cx + f.facing * 180, f.cy, '#d84838');
    },
  },

  ultra: {
    name: 'Blade Rain',
    cost: 30,
    cooldown: 8,
    desc: 'Hurls his wings skyward — a rain of razor feathers carpets the ground ahead.',
    onUse(ctx) {
      const f = ctx.f;
      for (let i = 0; i < 6; i++) {
        ctx.schedule(0.1 + i * 0.09, () => {
          if (!f.alive) return;
          const fx = f.cx + f.facing * (50 + i * 55);
          ctx.projectile({
            damage: 7, x: fx, y: f.y - 200, vx: 0, vy: 560, life: 0.9,
            w: 12, h: 20, kx: 110, ky: 140, hitstun: 0.25, tag: 'super',
            color: '#d84838', trail: '#ffb0a0',
          });
        });
      }
      effects.burst(f.cx, f.y - 10, ['#d84838', '#ffb0a0'], 14, { speed: 240 });
    },
  },

  hooks: {
    onUpdate(ctx) {
      // tailwind: quicker while airborne
      if (!ctx.f.onGround) ctx.buffSpeed(1.15, 0.1);
    },
  },

  drawExtras(ctx2d, f, c) {
    // crimson wings fanned behind his shoulders
    ctx2d.fillStyle = c('#c03028');
    for (let i = 0; i < 3; i++) {
      ctx2d.save();
      ctx2d.translate(-10, -34);
      ctx2d.rotate(-0.5 - i * 0.35 + Math.sin(f.animT * 3) * 0.06);
      ctx2d.beginPath();
      ctx2d.ellipse(-14, 0, 15, 4, 0, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.restore();
    }
    // yellow tinted visor
    ctx2d.fillStyle = c('rgba(240,208,90,0.55)');
    ctx2d.fillRect(1, -49, 13, 5);
    // headphones
    ctx2d.fillStyle = c('#2a2e38');
    ctx2d.fillRect(-3, -55, 4, 7);
  },
};
