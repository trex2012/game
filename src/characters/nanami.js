import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'nanami',
  name: 'Salaryman Seven-Three',
  series: 'JJK',
  unlockLevel: 14,
  stats: { maxHp: 135, speed: 300, jumpVel: jumpVelForHeight(160, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#e8d49a', top: '#8a7d5a', bottom: '#3a4152', accent: '#4a90c8' },
  hairStyle: 'swept',
  ai: { type: 'rushdown', band: 90 },
  moves: [
    { name: 'Ratio Chop', desc: 'Blunt-blade chop. Every 3rd hit finds the 7:3 weak point for bonus soul damage.' },
    { name: 'Clock Out', desc: 'Passive: at low HP the workday is over — his weak-point bonus doubles.' },
  ],

  basic: {
    name: 'Ratio Chop',
    cooldown: 0.36,
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 6, w: 52, h: 38, kx: 210, ky: 120, hitstun: 0.22, tag: 'basic' });
      effects.slash(f.cx, f.cy - 16, f.cx + f.facing * 56, f.cy + 4, '#e8e2d4');
    },
  },

  super: {
    name: 'Ratio Technique: Collapse',
    cost: 30,
    cooldown: 1.3,
    desc: 'A dashing overhead chop straight into the weak point — 24 dmg, always crits.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.dash(140, 0.18);
      ctx.schedule(0.14, () => {
        if (!f.alive) return;
        f.attackT = 0.22;
        ctx.melee({ damage: 24, w: 66, h: 50, kx: 340, ky: 220, hitstun: 0.5, crit: true, tag: 'super' });
        effects.slash(f.cx + f.facing * 10, f.cy - 30, f.cx + f.facing * 66, f.cy + 16, '#4a90c8');
        effects.ring(f.cx + f.facing * 40, f.y + f.h, '#4a90c8', 70, 0.3);
        ctx.world.camera?.shake(6, 0.25);
      });
    },
  },

  tech: {
    name: 'Wrapped Blade Flurry',
    cost: 15,
    cooldown: 5,
    desc: 'Two lightning-fast chops back to back.',
    onUse(ctx) {
      const f = ctx.f;
      for (const at of [0, 0.16]) {
        ctx.schedule(at, () => {
          if (!f.alive) return;
          f.attackT = 0.15;
          ctx.melee({ damage: 8, w: 56, h: 40, kx: 160, ky: 100, hitstun: 0.25, tag: 'super' });
          effects.slash(f.cx, f.cy - 18, f.cx + f.facing * 60, f.cy + 6, '#e8e2d4');
        });
      }
    },
  },

  ultra: {
    name: 'Overtime',
    cost: 30,
    cooldown: 12,
    desc: "Past regular hours now — 6s of +40% damage and +25% speed. He hates it here.",
    onUse(ctx) {
      const f = ctx.f;
      if (f.mem.otBase == null) {
        f.mem.otBase = f.dmgMult;
        f.dmgMult = f.mem.otBase * 1.4;
      }
      f.mem.overtime = 6;
      effects.showBanner('OVERTIME', '#ffd166', 'AND FOR THAT... I ACCEPT NO RESPONSIBILITY', 1.6);
      effects.ring(f.cx, f.cy, '#ffd166', 70, 0.5);
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      const f = ctx.f;
      if ((f.mem.overtime ?? 0) > 0) {
        f.mem.overtime -= dt;
        ctx.buffSpeed(1.25, 0.15);
        if (f.mem.overtime <= 0 && f.mem.otBase != null) {
          f.dmgMult = f.mem.otBase;
          f.mem.otBase = null;
        }
      }
    },
    onDealHit(ctx, target, hit) {
      if (hit.tag !== 'basic') return;
      const f = ctx.f;
      f.mem.ratio = (f.mem.ratio ?? 0) + 1;
      if (f.mem.ratio % 3 !== 0) return;
      const bonus = f.hp < f.maxHp * 0.35 ? 16 : 8; // clocked out: it doubles
      target.receiveHit(
        { damage: bonus * f.dmgMult, kx: 0, ky: 0, hitstun: 0.15, isMelee: false, soul: true, crit: true, tag: 'super' },
        f, ctx.world,
      );
      // the 7:3 line flashes across the target
      effects.slash(target.cx - 24, target.cy - 8, target.cx + 24, target.cy - 8, '#4a90c8');
    },
  },

  drawExtras(ctx2d, f, c) {
    // rectangular work glasses
    ctx2d.strokeStyle = c('#1c2030');
    ctx2d.lineWidth = 1.2;
    ctx2d.strokeRect(1.5, -48, 5.5, 4.5);
    ctx2d.strokeRect(8.5, -48, 5.5, 4.5);
    // tie
    ctx2d.fillStyle = c('#3a5a8a');
    ctx2d.fillRect(-1, -33, 3, 12);
    // wrapped blade on his back
    ctx2d.fillStyle = c('#d8d2c0');
    ctx2d.save();
    ctx2d.rotate(-0.5);
    ctx2d.fillRect(-30, -24, 22, 5);
    ctx2d.restore();
  },
};
