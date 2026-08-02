import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'maki',
  name: 'Mackie Zenpole',
  series: 'JJK',
  unlockLevel: 2,
  stats: { maxHp: 110, speed: 340, jumpVel: jumpVelForHeight(180, GRAVITY), weight: 'light' },
  palette: { skin: '#f2cfa5', hair: '#3a5f45', top: '#2e3448', bottom: '#242938', accent: '#caa46a' },
  hairStyle: 'ponytail',
  immunities: ['slow', 'stun'],
  domainResist: 0.5, // Heavenly Restriction shrugs off domain ticks
  ai: { type: 'rushdown', band: 95 },
  moves: [
    { name: 'Polearm Sweep', desc: 'Widest, fastest basic in the game.' },
    { name: 'Heavenly Restriction', desc: 'Passive: immune to slow/stun, half damage from domains, +10% speed under 50% HP.' },
  ],

  basic: {
    name: 'Polearm Sweep',
    cooldown: 0.28,
    onUse(ctx) {
      ctx.melee({ damage: 5, w: 84, h: 38, ox: 52, kx: 190, ky: 110, hitstun: 0.18 });
      const f = ctx.f;
      effects.slash(f.cx, f.cy - 18, f.cx + f.facing * 86, f.cy + 6, '#e8e2d4');
    },
  },

  super: {
    name: 'Playful Cloud: Triple Strike',
    cost: 25,
    cooldown: 1.1,
    desc: 'Three heavy staff blows; the third slams down with a shockwave.',
    onUse(ctx) {
      const f = ctx.f;
      f.lockT = Math.max(f.lockT, 0.85);
      const blows = [
        { d: 10, at: 0 },
        { d: 10, at: 0.28 },
        { d: 15, at: 0.56 },
      ];
      for (const b of blows) {
        ctx.schedule(b.at, () => {
          if (!f.alive) return;
          f.attackT = 0.18;
          const last = b.d === 15;
          ctx.melee({
            damage: b.d, w: last ? 110 : 76, h: 46, ox: last ? 62 : 48,
            kx: last ? 340 : 140, ky: last ? 240 : 90, hitstun: last ? 0.5 : 0.3, tag: 'super',
          });
          effects.slash(f.cx, f.cy - 22, f.cx + f.facing * (last ? 110 : 80), f.cy + 10, '#caa46a');
          if (last) {
            effects.ring(f.cx + f.facing * 50, f.y + f.h, '#caa46a', 90, 0.35);
            ctx.world.camera?.shake(6, 0.25);
          }
        });
      }
    },
  },

  tech: {
    name: 'Cursed Tool Volley',
    cost: 15,
    cooldown: 5,
    desc: 'Three fast kunai from her endless arsenal.',
    onUse(ctx) {
      for (let i = 0; i < 3; i++) {
        ctx.schedule(i * 0.09, () => {
          if (!ctx.f.alive) return;
          ctx.projectile({ damage: 5, speed: 620, vy: (i - 1) * 40, range: 340, w: 14, h: 5, kx: 100, ky: 60, hitstun: 0.15, color: '#c8ccd4' });
        });
      }
    },
  },

  ultra: {
    name: 'Split Soul Katana',
    cost: 25,
    cooldown: 7,
    desc: 'A blade that cuts the soul directly — bonus damage to healthy targets.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({
        damage: 12, w: 96, h: 46, ox: 56, kx: 240, ky: 140, hitstun: 0.4, tag: 'super',
        onHitTarget: (t) => {
          const soulCut = Math.max(1, Math.round(t.hp * 0.12));
          t.receiveHit({ damage: soulCut, kx: 0, ky: 0, hitstun: 0, isMelee: false, soul: true, tag: 'super' }, f, ctx.world);
          effects.slash(t.cx - 30, t.cy - 30, t.cx + 30, t.cy + 30, '#c8e8ff');
        },
      });
      effects.slash(f.cx, f.cy - 24, f.cx + f.facing * 100, f.cy + 12, '#c8e8ff');
    },
  },

  hooks: {
    onUpdate(ctx) {
      const f = ctx.f;
      if (f.hp < f.maxHp * 0.5) ctx.buffSpeed(1.1, 0.15); // rolling buff while wounded
    },
  },

  drawExtras(ctx2d, f, c) {
    // round glasses
    ctx2d.strokeStyle = c('#1c2030');
    ctx2d.lineWidth = 1.2;
    ctx2d.beginPath();
    ctx2d.arc(4, -45, 3.4, 0, Math.PI * 2);
    ctx2d.arc(10, -45, 3.4, 0, Math.PI * 2);
    ctx2d.stroke();
    // polearm on her back
    ctx2d.strokeStyle = c('#8a6d45');
    ctx2d.lineWidth = 2.5;
    ctx2d.beginPath();
    ctx2d.moveTo(-14, -52);
    ctx2d.lineTo(6, -12);
    ctx2d.stroke();
  },
};
