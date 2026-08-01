import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'deku',
  name: 'Deku',
  series: 'MHA',
  unlockLevel: 1,
  stats: { maxHp: 120, speed: 310, jumpVel: jumpVelForHeight(190, GRAVITY), weight: 'light' },
  palette: { skin: '#f5d5b0', hair: '#2f6f4f', top: '#3fa060', bottom: '#2c6e44', accent: '#d63b3b' },
  hairStyle: 'messy',
  ai: { type: 'rushdown', band: 80 },
  moves: [
    { name: 'Detroit Smash Jr.', desc: 'Quick One For All punch.' },
    { name: 'Full Cowling', desc: 'Passive: 3 clean hits in a row grant +15% speed.' },
  ],

  basic: {
    name: 'Detroit Smash Jr.',
    cooldown: 0.3,
    onUse(ctx) {
      ctx.melee({ damage: 6, w: 48, h: 34, kx: 220, ky: 130, hitstun: 0.2 });
      effects.burst(ctx.f.cx + ctx.f.facing * 24, ctx.f.cy - 6, '#7CFC8a', 3, { speed: 100 });
    },
  },

  super: {
    name: 'Shoot Style: St. Louis Barrage',
    cost: 30,
    cooldown: 1.2,
    desc: 'Dash forward with a 5-kick barrage; the last kick launches.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.dash(150, 0.55);
      f.lockT = Math.max(f.lockT, 0.6);
      f.invuln = Math.max(f.invuln, 0.2);
      for (let i = 0; i < 5; i++) {
        ctx.schedule(i * 0.11, () => {
          if (!f.alive) return;
          f.attackT = 0.15;
          const last = i === 4;
          ctx.melee({
            damage: 7, w: 90, h: 44, centered: true, tag: 'super',
            kx: last ? 260 : 60, ky: last ? 420 : 60, hitstun: last ? 0.5 : 0.25,
          });
          effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#7CFC8a' });
          effects.burst(f.cx + f.facing * 26, f.cy, '#7CFC8a', 4, { speed: 140 });
        });
      }
    },
  },

  hooks: {
    onDealHit(ctx, target, hit) {
      if (hit.tag !== 'basic') return;
      const f = ctx.f;
      f.mem.streak = (f.mem.streak ?? 0) + 1;
      if (f.mem.streak >= 3) {
        f.mem.streak = 0;
        ctx.buffSpeed(1.15, 3);
        effects.burst(f.cx, f.cy, '#7CFC8a', 8, { speed: 160 });
        if (f === ctx.world.player) effects.toast('FULL COWLING!');
      }
    },
    onHurt(ctx) {
      ctx.f.mem.streak = 0;
    },
  },

  drawExtras(ctx2d, f, c) {
    // freckles
    ctx2d.fillStyle = c('#c88d5e');
    ctx2d.fillRect(2, -42, 1.6, 1.6);
    ctx2d.fillRect(5, -41, 1.6, 1.6);
    ctx2d.fillRect(8, -42, 1.6, 1.6);
    // green sparks while Full Cowling is up
    if (f.buffs?.speed && Math.random() < 0.35) {
      effects.particles.push({
        x: f.cx + (Math.random() - 0.5) * 24, y: f.cy + (Math.random() - 0.5) * 30,
        vx: 0, vy: -30, life: 0.2, maxLife: 0.2, size: 2.5, color: '#7CFC8a', gravity: 0,
      });
    }
  },
};
