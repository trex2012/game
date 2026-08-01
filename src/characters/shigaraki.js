import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'shigaraki',
  name: 'Tomura Shigaraki',
  series: 'MHA',
  unlockLevel: 9,
  stats: { maxHp: 140, speed: 285, jumpVel: jumpVelForHeight(155, GRAVITY), weight: 'medium' },
  palette: { skin: '#e8ddd8', hair: '#9fc4d8', top: '#17171c', bottom: '#111116', accent: '#2a2a33' },
  hairStyle: 'shaggy',
  energyTakenMult: 1.25, // Rage of the League
  ai: { type: 'rushdown', band: 72 },
  moves: [
    { name: 'Five-Finger Grasp', desc: 'Fast palm jabs — every hit stacks Decay (up to 3, 2 dmg/s each).' },
  ],

  basic: {
    name: 'Five-Finger Grasp',
    cooldown: 0.32,
    onUse(ctx) {
      ctx.melee({
        damage: 6, w: 44, h: 34, kx: 170, ky: 100, hitstun: 0.2,
        status: { name: 'decay', dur: 4 },
        onHitTarget: (t) => {
          effects.burst(t.cx, t.cy, '#8a8578', 5, { speed: 90 });
        },
      });
    },
  },

  super: {
    name: 'Decay Wave',
    cost: 40,
    cooldown: 1.6,
    desc: 'Crouch, then disintegrate everything within 200px: 25 dmg + 3 Decay stacks.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.windup(0.5, () => {
        f.attackT = 0.25;
        ctx.melee({
          damage: 25, w: 400, h: 170, centered: true, life: 0.15, tag: 'super',
          kx: 280, ky: 200, hitstun: 0.5,
          onHitTarget: (t) => {
            // three full stacks of decay
            for (let i = 0; i < 3; i++) t.applyStatus('decay', 4, { src: f });
          },
        });
        effects.ring(f.cx, f.cy, '#8a8578', 200, 0.5);
        effects.ring(f.cx, f.cy, '#c8c2b2', 130, 0.4);
        effects.burst(f.cx, f.y + f.h, ['#8a8578', '#5e5a50'], 22, { speed: 320 });
        effects.flash(0.07, '#4a1010');
        ctx.world.camera?.shake(9, 0.35);
      });
      effects.burst(f.cx, f.y + f.h, '#8a8578', 6, { speed: 60 });
    },
  },

  ultra: {
    name: 'Decay Rush',
    cost: 25,
    cooldown: 8,
    desc: 'Dash through enemies with outstretched hands — everything touched starts rotting.',
    onUse(ctx) {
      const f = ctx.f;
      const startX = f.cx;
      ctx.dash(220, 0.3);
      f.invuln = Math.max(f.invuln, 0.2);
      ctx.melee({
        damage: 10, w: 250, h: 46, fixedX: startX + f.facing * 125, tag: 'super',
        kx: 160, ky: 100, hitstun: 0.3,
        onHitTarget: (t) => {
          t.applyStatus('decay', 4, { src: f });
          t.applyStatus('decay', 4, { src: f });
          effects.burst(t.cx, t.cy, '#8a8578', 8, { speed: 140 });
        },
      });
      effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#9fc4d8' });
    },
  },

  hooks: {},

  drawExtras(ctx2d, f, c) {
    // "Father" — the severed hand over his face
    ctx2d.fillStyle = c('#cfc3bb');
    ctx2d.beginPath();
    ctx2d.roundRect(0, -52, 13, 14, 4);
    ctx2d.fill();
    for (let i = 0; i < 4; i++) ctx2d.fillRect(1 + i * 3, -57, 2.2, 7);
    ctx2d.fillRect(-2, -46, 4, 5); // thumb
    // red eyes glinting between the fingers
    ctx2d.fillStyle = c('#d43b3b');
    ctx2d.fillRect(3, -46, 2, 2);
    ctx2d.fillRect(8, -46, 2, 2);
    // neck scratches
    ctx2d.strokeStyle = c('#b06a5e');
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(-4, -35); ctx2d.lineTo(-1, -33);
    ctx2d.moveTo(-2, -36); ctx2d.lineTo(1, -34);
    ctx2d.stroke();
  },
};
