import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'bakugo',
  name: 'Blasty McSplode',
  series: 'MHA',
  unlockLevel: 2,
  stats: { maxHp: 115, speed: 330, jumpVel: jumpVelForHeight(175, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#d8b45a', top: '#252a34', bottom: '#2e333e', accent: '#e8762a' },
  hairStyle: 'spiky',
  ai: { type: 'rushdown', band: 80 },
  moves: [
    { name: 'Blast Palm', desc: 'A reaching explosion blast. Landing it keeps his blast rush going (+speed).' },
    { name: 'Blast Rush', desc: 'Passive: every hit he lands fuels a short burst of extra move speed.' },
  ],

  basic: {
    name: 'Blast Palm',
    cooldown: 0.35,
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 7, w: 72, h: 38, kx: 240, ky: 140, hitstun: 0.22, tag: 'basic' });
      effects.burst(f.cx + f.facing * 48, f.cy - 6, ['#ffb347', '#e8762a'], 8, { speed: 160 });
    },
  },

  super: {
    name: 'Howitzer Impact',
    cost: 35,
    cooldown: 1.4,
    desc: 'Spinning blast-tornado dash that detonates on arrival: 26 dmg + burn.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.windup(0.3, () => {
        if (!f.alive) return;
        ctx.dash(230, 0.22);
        f.invuln = Math.max(f.invuln, 0.2);
        effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#e8762a' });
        ctx.schedule(0.24, () => {
          if (!f.alive) return;
          f.attackT = 0.25;
          ctx.melee({
            damage: 26, w: 150, h: 110, centered: true, life: 0.12, kx: 380, ky: 240, hitstun: 0.5, tag: 'super',
            status: { name: 'burn', dur: 2, params: { dps: 4 } },
          });
          effects.burst(f.cx, f.cy, ['#ffb347', '#e8762a', '#fff2c8'], 22, { speed: 320 });
          effects.ring(f.cx, f.cy, '#ffb347', 110, 0.4);
          ctx.world.camera?.shake(9, 0.35);
        });
      }, { tell: true });
      effects.burst(f.cx - f.facing * 20, f.cy, '#ffb347', 8, { speed: 120 });
    },
  },

  tech: {
    name: 'AP Shot',
    cost: 15,
    cooldown: 5,
    desc: 'A drilled-down explosion beam that pierces through everything in line.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.projectile({
        damage: 9, speed: 760, range: 460, w: 12, h: 8, pierce: true,
        kx: 120, ky: 60, hitstun: 0.2, color: '#ffd98a', trail: '#e8762a',
      });
      effects.beam(f.cx + f.facing * 20, f.cy - 6, f.facing, 60, '#ffb347', 4);
    },
  },

  ultra: {
    name: 'Cluster Carpet',
    cost: 25,
    cooldown: 7,
    desc: 'A stream of mini-grenades carpets the ground ahead in explosions.',
    onUse(ctx) {
      const f = ctx.f;
      for (let i = 0; i < 4; i++) {
        ctx.schedule(0.1 + i * 0.13, () => {
          if (!f.alive) return;
          const bx = f.cx + f.facing * (70 + i * 75);
          const by = f.y + f.h - 34;
          ctx.melee({
            damage: 8, w: 95, h: 85, fixedX: bx, fixedY: by, life: 0.1,
            kx: 180, ky: 220, hitstun: 0.3, tag: 'super',
          });
          effects.burst(bx, by, ['#ffb347', '#e8762a'], 12, { speed: 220 });
          effects.ring(bx, by + 20, '#ffb347', 55, 0.3);
          ctx.world.camera?.shake(4, 0.15);
        });
      }
    },
  },

  hooks: {
    onDealHit(ctx) {
      ctx.buffSpeed(1.15, 1.2); // blast rush: riding his own explosions
    },
  },

  drawExtras(ctx2d, f, c) {
    // grenadier gauntlet on the lead arm
    ctx2d.fillStyle = c('#8a8f9a');
    ctx2d.beginPath();
    ctx2d.roundRect(9, -33, 10, 9, 3);
    ctx2d.fill();
    ctx2d.fillStyle = c('#e8762a');
    ctx2d.fillRect(16, -31, 3, 5);
    // cross strap on chest
    ctx2d.strokeStyle = c('#e8762a');
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(-8, -33);
    ctx2d.lineTo(8, -22);
    ctx2d.moveTo(8, -33);
    ctx2d.lineTo(-8, -22);
    ctx2d.stroke();
  },
};
