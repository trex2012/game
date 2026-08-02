import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY, W, H } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'yuta',
  name: 'Yoots Okkotsu',
  series: 'JJK',
  unlockLevel: 15,
  stats: { maxHp: 130, speed: 320, jumpVel: jumpVelForHeight(175, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#2a2d3a', top: '#1e2230', bottom: '#2a3040', accent: '#7a9cf0' },
  hairStyle: 'messy',
  ai: { type: 'rushdown', band: 95 },
  moves: [
    { name: 'Cursed Blade', desc: "Katana slash overflowing with Rika's cursed energy." },
    { name: 'Queen of Curses', desc: 'Passive: Rika haunts his side — every 4th hit she claws in for bonus soul damage.' },
  ],

  basic: {
    name: 'Cursed Blade',
    cooldown: 0.34,
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 7, w: 56, h: 40, kx: 210, ky: 130, hitstun: 0.22, tag: 'basic' });
      effects.slash(f.cx, f.cy - 18, f.cx + f.facing * 60, f.cy + 6, '#9ab8ff');
    },
  },

  super: {
    name: 'Rika: Full Manifest',
    cost: 35,
    cooldown: 1.5,
    desc: "Rika's giant arm slams down in a wide arc — 26 dmg and a heavy launch.",
    onUse(ctx) {
      const f = ctx.f;
      ctx.windup(0.28, () => {
        if (!f.alive) return;
        f.attackT = 0.25;
        ctx.melee({ damage: 26, w: 150, h: 110, ox: 85, kx: 340, ky: 260, hitstun: 0.5, tag: 'super' });
        // Rika's clawed arm rakes the arc
        for (let i = 0; i < 3; i++) {
          effects.slash(
            f.cx + f.facing * (30 + i * 40), f.cy - 60 + i * 18,
            f.cx + f.facing * (90 + i * 40), f.cy + 10 + i * 14, '#4a3a6a',
          );
        }
        effects.burst(f.cx + f.facing * 90, f.cy, ['#4a3a6a', '#9ab8ff', '#fff'], 16, { speed: 260 });
        effects.ring(f.cx + f.facing * 90, f.cy, '#9ab8ff', 90, 0.4);
        ctx.world.camera?.shake(8, 0.3);
      }, { tell: true });
    },
  },

  tech: {
    name: 'Reverse Cursed Technique',
    cost: 35,
    cooldown: 10,
    desc: 'Channel reverse cursed energy to heal 25 HP.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.heal(25);
      effects.number(f.cx, f.y - 10, '+25', '#6fe3a0');
      effects.ring(f.cx, f.cy, '#6fe3a0', 46, 0.4);
      effects.burst(f.cx, f.cy - 10, ['#6fe3a0', '#d8ffe8'], 10, { speed: 120 });
    },
  },

  ultra: {
    name: 'Jacked-Up Barrage',
    cost: 30,
    cooldown: 8,
    desc: 'Three lightning-fast blade arcs back to back, each hitting harder than the last.',
    onUse(ctx) {
      const f = ctx.f;
      [0, 0.16, 0.34].forEach((at, i) => {
        ctx.schedule(at, () => {
          if (!f.alive) return;
          f.attackT = 0.16;
          ctx.melee({
            damage: 8 + i * 3, w: 64, h: 46, kx: 150 + i * 90, ky: 100 + i * 60,
            hitstun: 0.3, tag: 'super',
          });
          effects.slash(f.cx, f.cy - 22 + i * 8, f.cx + f.facing * (64 + i * 10), f.cy + 8 - i * 4, i === 2 ? '#9ab8ff' : '#e8ecf8');
        });
      });
    },
  },

  domain: {
    name: 'Authentic Mutual Love',
    rank: 3,
    duration: 8,
    color: '#f06a9a',
    desc: 'Rika is fully unleashed: her sure-hit claws rake every enemy each second.',
    onStart(ctx) {
      ctx.mem.acc = 0;
    },
    onTick(ctx, dt) {
      ctx.mem.acc += dt;
      if (ctx.mem.acc < 1) return;
      ctx.mem.acc -= 1;
      const f = ctx.f;
      for (const e of ctx.enemies()) {
        e.receiveHit(
          { damage: 8 * f.dmgMult, kx: 60, ky: 40, hitstun: 0.2, isMelee: false, soul: true, domainTick: true, tag: 'domain' },
          f, ctx.world,
        );
        effects.slash(e.cx - 20, e.cy - 20, e.cx + 20, e.cy + 16, '#f06a9a');
      }
    },
    drawOverlay(ctx2d, d) {
      ctx2d.fillStyle = 'rgba(40,8,30,0.5)';
      ctx2d.fillRect(0, 0, W, H);
      // Rika's warped love: drifting hearts in the dark
      const t = d.ctx.f.animT;
      ctx2d.fillStyle = 'rgba(240,106,154,0.5)';
      for (let i = 0; i < 8; i++) {
        const x = ((i * 353) % W) + Math.sin(t * 1.2 + i) * 24;
        const y = ((i * 211) % H) + Math.cos(t * 0.9 + i * 2) * 16;
        const s = 6 + (i % 3) * 3;
        ctx2d.beginPath();
        ctx2d.arc(x - s / 2, y, s / 2, 0, Math.PI * 2);
        ctx2d.arc(x + s / 2, y, s / 2, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.beginPath();
        ctx2d.moveTo(x - s, y + 1);
        ctx2d.lineTo(x, y + s * 1.4);
        ctx2d.lineTo(x + s, y + 1);
        ctx2d.closePath();
        ctx2d.fill();
      }
    },
  },

  hooks: {
    onDealHit(ctx, target, hit) {
      if (hit.tag !== 'basic') return;
      const f = ctx.f;
      f.mem.rika = (f.mem.rika ?? 0) + 1;
      if (f.mem.rika % 4 !== 0) return;
      target.receiveHit(
        { damage: 8 * f.dmgMult, kx: 120, ky: 80, hitstun: 0.2, isMelee: false, soul: true, tag: 'super' },
        f, ctx.world,
      );
      effects.slash(target.cx - 22, target.cy - 18, target.cx + 22, target.cy + 14, '#4a3a6a');
      effects.slash(target.cx - 22, target.cy + 14, target.cx + 22, target.cy - 18, '#4a3a6a');
    },
  },

  drawExtras(ctx2d, f, c) {
    // katana on his back
    ctx2d.fillStyle = c('#c8ccd8');
    ctx2d.save();
    ctx2d.rotate(-0.6);
    ctx2d.fillRect(-34, -14, 26, 3.5);
    ctx2d.restore();
    ctx2d.fillStyle = c('#3a4258');
    ctx2d.fillRect(-13, -32, 5, 8);
    // Rika's shadow looming behind him: one pale eye and a jagged grin
    ctx2d.fillStyle = c('rgba(40,32,64,0.55)');
    ctx2d.beginPath();
    ctx2d.arc(-22, -52, 11, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = c('#e8ecf8');
    ctx2d.fillRect(-25, -56, 4, 4);
    ctx2d.strokeStyle = c('#e8ecf8');
    ctx2d.lineWidth = 1.2;
    ctx2d.beginPath();
    ctx2d.moveTo(-29, -47);
    for (let i = 0; i < 4; i++) ctx2d.lineTo(-27 + i * 4, -47 + (i % 2 === 0 ? 3 : 0));
    ctx2d.stroke();
  },
};
