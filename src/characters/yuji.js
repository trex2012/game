import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'yuji',
  name: 'Yuji Itadori',
  series: 'JJK',
  unlockLevel: 1,
  stats: { maxHp: 130, speed: 320, jumpVel: jumpVelForHeight(170, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#e8836f', top: '#2b3350', bottom: '#242b42', accent: '#d63b3b' },
  hairStyle: 'spiky',
  ai: { type: 'rushdown', band: 78 },
  moves: [
    { name: 'Divergent Fist', desc: 'Punch that hits again 0.4s later.' },
    { name: 'Black Flash', desc: 'Passive: 10% crit for 2.5x. Landing one raises the odds to 25% for 3s.' },
  ],

  basic: {
    name: 'Divergent Fist',
    cooldown: 0.35,
    onUse(ctx) {
      const f = ctx.f;
      const inZone = (f.mem.bfT ?? 0) > 0;
      const crit = Math.random() < (inZone ? 0.25 : 0.1);
      ctx.melee({ damage: crit ? 15 : 6, w: 46, h: 34, kx: 220, ky: 120, hitstun: 0.22, crit, tag: 'basic' });
      if (crit) f.mem.bfT = 3;
    },
  },

  super: {
    name: 'Guaranteed Black Flash',
    cost: 30,
    cooldown: 1.2,
    desc: 'Lunge punch with a true Black Flash. 40 damage, huge knockback.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.dash(120, 0.2);
      ctx.schedule(0.12, () => {
        if (!f.alive) return;
        f.attackT = 0.2;
        ctx.melee({ damage: 40, w: 56, h: 44, kx: 420, ky: 260, hitstun: 0.55, crit: true, tag: 'super' });
        effects.flash(0.08, '#200008');
      });
      f.mem.bfT = 3;
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      ctx.f.mem.bfT = Math.max(0, (ctx.f.mem.bfT ?? 0) - dt);
    },
    onDealHit(ctx, target, hit) {
      if (hit.tag === 'basic') {
        ctx.delayedHit(target, 4, 0.4); // phantom cursed-energy impact
        ctx.schedule(0.4, () => {
          if (target.alive) effects.ring(target.cx, target.cy, '#d63b3b', 26, 0.2);
        });
      }
    },
  },

  drawExtras(ctx2d, f, c) {
    // hood behind neck
    ctx2d.fillStyle = c('#39415e');
    ctx2d.beginPath();
    ctx2d.roundRect(-11, -37, 22, 7, 3);
    ctx2d.fill();
    // cheek marks glow while in the Black Flash zone
    if ((f.mem.bfT ?? 0) > 0) {
      ctx2d.fillStyle = c('#ff2244');
      ctx2d.fillRect(1, -43, 3, 1.6);
      ctx2d.fillRect(8, -43, 3, 1.6);
    }
  },
};
