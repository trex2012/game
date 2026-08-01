import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'naoya',
  name: 'Naoya Zenin',
  series: 'JJK',
  unlockLevel: 4,
  stats: { maxHp: 120, speed: 360, jumpVel: jumpVelForHeight(160, GRAVITY), weight: 'light' },
  palette: { skin: '#f2cfa5', hair: '#d8bd7f', top: '#e8e4da', bottom: '#3a4a66', accent: '#3a4a66' },
  hairStyle: 'swept',
  ai: { type: 'rushdown', band: 120 },
  moves: [
    { name: 'Frame Dash Strike', desc: 'Blink through enemies, damaging everything on the path.' },
    { name: 'Projection Blink', desc: 'Double-tap a direction: free 100px blink (locked 2s if you get hit).' },
  ],

  basic: {
    name: 'Frame Dash Strike',
    cooldown: 0.4,
    onUse(ctx) {
      const f = ctx.f;
      effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#d8bd7f' });
      // anchored to the pre-blink position so it covers the path he blinks through
      ctx.melee({ damage: 7, w: 150, h: 40, fixedX: f.cx + f.facing * 70, kx: 140, ky: 90, hitstun: 0.2 });
      ctx.blink(140 * f.facing);
      effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#d8bd7f' });
      effects.slash(f.cx - f.facing * 140, f.cy, f.cx, f.cy, '#fff');
      f.invuln = Math.max(f.invuln, 0.08);
    },
  },

  special: {
    name: 'Projection Sorcery',
    onDoubleTap(ctx, dir) {
      const f = ctx.f;
      if ((f.mem.blinkCd ?? 0) > ctx.world.time) return;
      f.mem.blinkCd = ctx.world.time + 0.8;
      effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#d8bd7f' });
      ctx.blink(100 * dir);
      f.facing = dir;
    },
    onUse(ctx) {
      // L key also blinks forward
      this.onDoubleTap(ctx, ctx.f.facing);
    },
  },

  super: {
    name: 'Frame Rush (24 FPS)',
    cost: 35,
    cooldown: 1.4,
    desc: 'Up to 6 chained blink-strikes on everything within 400px.',
    onUse(ctx) {
      const f = ctx.f;
      f.invuln = Math.max(f.invuln, 0.85);
      f.lockT = Math.max(f.lockT, 0.8);
      for (let i = 0; i < 6; i++) {
        ctx.schedule(i * 0.12, () => {
          if (!f.alive) return;
          const target = ctx.nearestEnemy(400);
          if (!target) return;
          effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#d8bd7f' });
          const side = Math.random() < 0.5 ? -1 : 1;
          f.blinkBy(target.cx + side * 34 - f.cx);
          f.y = Math.max(0, target.y - 4);
          f.facing = side * -1;
          f.attackT = 0.1;
          ctx.melee({ damage: 8, w: 50, h: 44, kx: 120, ky: 80, hitstun: 0.25, tag: 'super' });
        });
      }
    },
  },

  hooks: {
    onHurt(ctx) {
      // getting clipped locks Projection Sorcery briefly (frame rule broken)
      const f = ctx.f;
      f.mem.blinkCd = Math.max(f.mem.blinkCd ?? 0, ctx.world.time + 2);
    },
  },

  drawExtras(ctx2d, f, c) {
    // smug closed-eye smile: overpaint the default eyes
    ctx2d.fillStyle = c(f.def.palette.skin);
    ctx2d.fillRect(2, -48, 11, 6);
    ctx2d.strokeStyle = c('#1c2030');
    ctx2d.lineWidth = 1.4;
    ctx2d.beginPath();
    ctx2d.arc(4.5, -45, 2.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx2d.arc(10.5, -45, 2.4, Math.PI * 1.1, Math.PI * 1.9);
    ctx2d.stroke();
    // kimono collar
    ctx2d.strokeStyle = c('#3a4a66');
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(-8, -33);
    ctx2d.lineTo(0, -26);
    ctx2d.lineTo(8, -33);
    ctx2d.stroke();
  },
};
