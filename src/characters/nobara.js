import { jumpVelForHeight, dist } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

const MAX_NAILS = 8;

export default {
  id: 'nobara',
  name: 'Nailbara Hammergirl',
  series: 'JJK',
  unlockLevel: 4,
  stats: { maxHp: 115, speed: 310, jumpVel: jumpVelForHeight(170, GRAVITY), weight: 'light' },
  palette: { skin: '#f2cfa5', hair: '#d88a4a', top: '#2e3448', bottom: '#242938', accent: '#c0392b' },
  hairStyle: 'choppy',
  ai: { type: 'zoner', band: 300 },
  moves: [
    { name: 'Nail Shot', desc: 'Fires a cursed nail that sticks in the target (up to 8 embedded).' },
    { name: 'Hairpin', desc: 'Her super detonates every embedded nail — the more you land, the bigger the boom.' },
  ],

  basic: {
    name: 'Nail Shot',
    cooldown: 0.38,
    onUse(ctx) {
      ctx.projectile({
        damage: 6, speed: 660, range: 420, w: 14, h: 5,
        kx: 110, ky: 60, hitstun: 0.18,
        color: '#d8dce4', trail: '#c0392b',
        onHitTarget(t) {
          t.mem.nails = Math.min(MAX_NAILS, (t.mem.nails ?? 0) + 1);
          effects.number(t.cx, t.y - 14, t.mem.nails, '#ffb3a0');
        },
      });
      const f = ctx.f;
      effects.slash(f.cx + f.facing * 12, f.cy - 10, f.cx + f.facing * 40, f.cy - 10, '#d8dce4');
    },
  },

  super: {
    name: 'Hairpin',
    cost: 25,
    cooldown: 1.2,
    desc: 'Detonate every nail embedded in enemies: 8 dmg per nail, stun at 4+.',
    onUse(ctx) {
      const f = ctx.f;
      let popped = false;
      for (const e of ctx.enemies()) {
        const nails = e.mem.nails ?? 0;
        if (nails <= 0 || dist(e.cx, e.cy, f.cx, f.cy) > 560) continue;
        popped = true;
        e.mem.nails = 0;
        e.receiveHit(
          { damage: 8 * nails * f.dmgMult, kx: 260, ky: 200, hitstun: 0.45, isMelee: false, tag: 'super' },
          f, ctx.world,
        );
        if (nails >= 4 && e.alive) ctx.applyStatus(e, 'stun', 0.8);
        effects.burst(e.cx, e.cy, ['#c0392b', '#ffb3a0'], 6 + nails * 2, { speed: 240 });
        effects.ring(e.cx, e.cy, '#c0392b', 40 + nails * 8, 0.35);
      }
      if (popped) {
        ctx.world.camera?.shake(6, 0.25);
      } else {
        // no nails planted — fire a quick 3-nail fan instead so the cast isn't wasted
        for (let i = -1; i <= 1; i++) {
          ctx.projectile({
            damage: 7, speed: 620, vy: i * 70, range: 380, w: 14, h: 5,
            kx: 120, ky: 70, hitstun: 0.2, tag: 'super', color: '#d8dce4', trail: '#c0392b',
            onHitTarget(t) { t.mem.nails = Math.min(MAX_NAILS, (t.mem.nails ?? 0) + 1); },
          });
        }
      }
    },
  },

  tech: {
    name: 'Hammer Smack',
    cost: 10,
    cooldown: 4,
    desc: 'Point-blank hammer swing for when they get too close.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 12, w: 70, h: 46, kx: 320, ky: 200, hitstun: 0.4, tag: 'super' });
      effects.slash(f.cx, f.cy - 24, f.cx + f.facing * 70, f.cy + 12, '#caa46a');
    },
  },

  ultra: {
    name: 'Straw Doll: Resonance',
    cost: 30,
    cooldown: 8,
    desc: 'Hammer a nail through the doll — soul damage now, echoing three more times.',
    onUse(ctx) {
      const f = ctx.f;
      const target = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(520);
      if (!target) {
        ctx.toast('NO TARGET IN RANGE');
        return;
      }
      effects.slash(f.cx, f.cy - 20, f.cx + f.facing * 40, f.cy, '#c0392b');
      target.receiveHit(
        { damage: 16 * f.dmgMult, kx: 0, ky: 0, hitstun: 0.35, isMelee: false, soul: true, tag: 'super' },
        f, ctx.world,
      );
      for (let i = 1; i <= 3; i++) {
        ctx.delayedHit(target, 6, i * 0.5, { soul: true, tag: 'super' });
        ctx.schedule(i * 0.5, () => {
          if (target.alive) effects.ring(target.cx, target.cy, '#c0392b', 34, 0.25);
        });
      }
      effects.burst(target.cx, target.cy, ['#c0392b', '#ffb3a0'], 14, { speed: 200 });
      if (f === ctx.world.player) effects.toast('RESONATE.');
    },
  },

  hooks: {},

  drawExtras(ctx2d, f, c) {
    // hammer slung at her hip
    ctx2d.fillStyle = c('#8a6d45');
    ctx2d.fillRect(-14, -22, 3, 12);
    ctx2d.fillStyle = c('#9aa0ac');
    ctx2d.fillRect(-17, -24, 9, 5);
    // a spare nail glinting in the other hand
    ctx2d.fillStyle = c('#d8dce4');
    ctx2d.fillRect(10, -21, 2, 7);
  },
};
