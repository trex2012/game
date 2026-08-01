import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY, W } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'choso',
  name: 'Choso',
  series: 'JJK',
  unlockLevel: 5,
  stats: { maxHp: 150, speed: 280, jumpVel: jumpVelForHeight(150, GRAVITY), weight: 'medium' },
  palette: { skin: '#efe3d8', hair: '#1d1d26', top: '#d8cfc4', bottom: '#4a4454', accent: '#8e2438' },
  hairStyle: 'buns',
  ai: { type: 'zoner', band: 300 },
  moves: [
    { name: 'Slicing Exorcism', desc: 'Blood crescent that slows. Stand still 1s to supercharge the next one.' },
  ],

  basic: {
    name: 'Slicing Exorcism',
    cooldown: 0.5,
    onUse(ctx) {
      const f = ctx.f;
      const charged = (f.mem.still ?? 0) >= 1;
      f.mem.still = 0;
      ctx.projectile({
        damage: charged ? 9 : 6,
        speed: 430,
        range: 350,
        w: charged ? 22 : 16,
        h: 12,
        color: '#a41f36',
        trail: '#701225',
        status: { name: 'slow', dur: 1, params: { factor: 0.8 } },
      });
    },
  },

  super: {
    name: 'Piercing Blood',
    cost: 35,
    cooldown: 1.5,
    desc: 'Hitscan blood beam across the whole arena. 35 dmg, pierces everything.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.windup(0.3, () => {
        f.attackT = 0.25;
        const y = f.cy - 4;
        effects.beam(f.cx + f.facing * 10, y, f.facing, W, '#c11f3e', 12);
        effects.burst(f.cx + f.facing * 20, y, '#c11f3e', 10, { speed: 200 });
        ctx.world.camera?.shake(5, 0.2);
        for (const e of ctx.enemies()) {
          const inFront = Math.sign(e.cx - f.cx) === f.facing || Math.abs(e.cx - f.cx) < 20;
          if (!inFront) continue;
          if (Math.abs(e.cy - y) > 34) continue;
          e.receiveHit(
            { damage: 35 * f.dmgMult, kx: 200, ky: 60, hitstun: 0.35, isMelee: false, tag: 'super' },
            f, ctx.world,
          );
        }
      }, { tell: false });
      effects.burst(f.cx + f.facing * 16, f.cy - 6, '#c11f3e', 5, { speed: 60 });
    },
  },

  ultra: {
    name: 'Blood Meteorite',
    cost: 25,
    cooldown: 7,
    desc: 'A fan of five hardened blood shards that pierce everything.',
    onUse(ctx) {
      const f = ctx.f;
      for (let i = -2; i <= 2; i++) {
        ctx.projectile({
          damage: 8, vx: f.facing * 520, vy: i * 90, range: 420, w: 14, h: 8,
          pierce: true, kx: 140, ky: 80, hitstun: 0.2, tag: 'super',
          color: '#7a1228', trail: '#a41f36',
        });
      }
      effects.burst(f.cx + f.facing * 20, f.cy - 6, '#a41f36', 10, { speed: 180 });
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      const f = ctx.f;
      if (f.onGround && Math.abs(f.vx) < 5 && f.canAct()) f.mem.still = (f.mem.still ?? 0) + dt;
      else f.mem.still = 0;
    },
  },

  drawExtras(ctx2d, f, c) {
    // scar band across the nose
    ctx2d.strokeStyle = c('#5c4a5e');
    ctx2d.lineWidth = 1.6;
    ctx2d.beginPath();
    ctx2d.moveTo(-3, -44);
    ctx2d.lineTo(12, -44);
    ctx2d.stroke();
    // convergence glow when charged
    if ((f.mem.still ?? 0) >= 1) {
      ctx2d.fillStyle = c('#c11f3e');
      ctx2d.globalAlpha = 0.7 + Math.sin(f.animT * 10) * 0.3;
      ctx2d.beginPath();
      ctx2d.arc(16, -28, 4, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.globalAlpha = 1;
    }
  },
};
