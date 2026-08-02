import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'allmight',
  name: 'Almighty Grin',
  series: 'MHA',
  unlockLevel: 10,
  stats: { maxHp: 180, speed: 270, jumpVel: jumpVelForHeight(175, GRAVITY), weight: 'heavy' },
  palette: { skin: '#f2cfa5', hair: '#f6d34a', top: '#3b6bd6', bottom: '#c0392b', accent: '#f6d34a' },
  hairStyle: 'antennae',
  armor: 8, // hits under 8 damage cause no flinch
  ai: { type: 'rushdown', band: 85 },
  moves: [
    { name: 'Texas Smash', desc: 'Slow haymaker with double knockback.' },
    { name: 'Symbol of Peace', desc: 'Passive: armored vs chip damage; hits knock further while above half HP.' },
  ],

  basic: {
    name: 'Texas Smash',
    cooldown: 0.45,
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 9, w: 54, h: 40, kx: 340, ky: 160, hitstun: 0.3 });
      // wind cone
      for (let i = 0; i < 5; i++) {
        effects.particles.push({
          x: f.cx + f.facing * (30 + i * 8), y: f.cy - 8 + (Math.random() - 0.5) * 20,
          vx: f.facing * 260, vy: (Math.random() - 0.5) * 60,
          life: 0.2, maxLife: 0.2, size: 3, color: '#fff8dc', gravity: 0,
        });
      }
    },
  },

  super: {
    name: 'United States of Smash',
    cost: 45,
    cooldown: 2,
    desc: 'Leap and slam down on the target: 30 dmg crater + 15 dmg shockwave.',
    onUse(ctx) {
      const f = ctx.f;
      const target = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(600);
      const tx = target ? target.cx : f.cx + f.facing * 250;
      f.vy = -850;
      f.vx = (tx - f.cx) / 0.55;
      f.dashT = 0.55;
      f.lockT = 1.1;
      f.invuln = Math.max(f.invuln, 0.5);
      f.mem.usos = true;
      f.mem.usosGrace = 0.15; // don't detonate on the launch frame
    },
  },

  tech: {
    name: 'Gale Backhand',
    cost: 15,
    cooldown: 5,
    desc: 'A sweeping backhand on both sides — pure crowd control.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 10, w: 200, h: 90, centered: true, life: 0.12, kx: 460, ky: 220, hitstun: 0.35, tag: 'super' });
      effects.slash(f.cx - 90, f.cy - 10, f.cx + 90, f.cy - 10, '#fff8dc');
      effects.ring(f.cx, f.cy, '#f6d34a', 90, 0.3);
    },
  },

  ultra: {
    name: 'Carolina Smash',
    cost: 25,
    cooldown: 6,
    desc: 'Cross-armed X strike — and the Symbol of Peace shrugs off blows for 2s after.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 20, w: 76, h: 56, ox: 44, kx: 300, ky: 200, hitstun: 0.45, tag: 'super' });
      f.mem.carolinaT = 2;
      effects.slash(f.cx, f.cy - 26, f.cx + f.facing * 78, f.cy + 18, '#fff8dc');
      effects.slash(f.cx, f.cy + 18, f.cx + f.facing * 78, f.cy - 26, '#fff8dc');
    },
  },

  hooks: {
    onIncomingHit(ctx, hit) {
      if ((ctx.f.mem.carolinaT ?? 0) > 0) hit.damage *= 0.6; // braced stance
      return true;
    },
    onUpdate(ctx, dt) {
      const f = ctx.f;
      f.mem.carolinaT = Math.max(0, (f.mem.carolinaT ?? 0) - dt);
      const strong = f.hp >= f.maxHp * 0.5;
      f.kbOutMult = strong ? 1.2 : 1;
      if (!strong) ctx.buffSpeed(0.9, 0.15); // deflated form is slower
      if (f.mem.usos) {
        f.mem.usosGrace = Math.max(0, f.mem.usosGrace - dt);
        if (f.mem.usosGrace <= 0 && f.vy >= 0 && f.onGround) {
          f.mem.usos = false;
          f.lockT = 0.3;
          f.dashT = 0;
          f.vx = 0;
          f.attackT = 0.3;
          ctx.melee({ damage: 30, w: 240, h: 150, centered: true, life: 0.12, kx: 380, ky: 340, hitstun: 0.7, tag: 'super' });
          ctx.melee({ damage: 15, w: 460, h: 110, centered: true, life: 0.12, kx: 260, ky: 200, hitstun: 0.4, tag: 'super' });
          effects.ring(f.cx, f.y + f.h, '#f6d34a', 220, 0.5);
          effects.burst(f.cx, f.y + f.h, ['#fff8dc', '#d8cdb8'], 26, { speed: 380 });
          effects.flash(0.1);
          ctx.world.camera?.shake(14, 0.5);
        }
      }
    },
  },

  drawExtras(ctx2d, f, c) {
    const weak = f.hp < f.maxHp * 0.5;
    // permanent grin (or grim line when deflated)
    ctx2d.strokeStyle = c('#fff');
    ctx2d.lineWidth = weak ? 1 : 2.2;
    ctx2d.beginPath();
    if (weak) {
      ctx2d.moveTo(3, -39);
      ctx2d.lineTo(11, -39);
    } else {
      ctx2d.arc(7, -42, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
    }
    ctx2d.stroke();
    // shadowed eye sockets
    ctx2d.fillStyle = c('#26355c');
    ctx2d.fillRect(2, -48, 5, 5);
    ctx2d.fillRect(8, -48, 5, 5);
    ctx2d.fillStyle = c('#7ec8ff');
    ctx2d.fillRect(4, -46, 2, 2);
    ctx2d.fillRect(10, -46, 2, 2);
    // chest V
    ctx2d.strokeStyle = c('#c0392b');
    ctx2d.lineWidth = 2.5;
    ctx2d.beginPath();
    ctx2d.moveTo(-8, -33);
    ctx2d.lineTo(0, -24);
    ctx2d.lineTo(8, -33);
    ctx2d.stroke();
  },
};
