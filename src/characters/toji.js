import { jumpVelForHeight } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

export default {
  id: 'toji',
  name: 'Toji Fushiguro',
  series: 'JJK',
  unlockLevel: 7,
  stats: { maxHp: 170, speed: 345, jumpVel: jumpVelForHeight(175, GRAVITY), weight: 'medium' },
  palette: { skin: '#e9c39a', hair: '#15181f', top: '#20242e', bottom: '#181c24', accent: '#3a4048' },
  hairStyle: 'choppy',
  noCursedEnergy: true, // summons don't notice him until he attacks
  domainResist: 0.5,    // Heavenly Restriction
  ai: { type: 'rushdown', band: 90 },
  moves: [
    { name: 'Arsenal Combo', desc: '3-hit chain: slash, slash, then a 160px chain-whip that pulls them in.' },
    { name: 'Heavenly Restriction', desc: 'Passive: every attack ignores barriers (yes, even Infinity). Takes 20% less damage, half from domains.' },
  ],

  basic: {
    name: 'Arsenal Combo',
    cooldown: 0.26,
    onUse(ctx) {
      const f = ctx.f;
      if (ctx.world.time - (f.mem.lastBasic ?? -10) > 1) f.mem.chain = 0;
      f.mem.lastBasic = ctx.world.time;
      const stage = f.mem.chain ?? 0;
      f.mem.chain = (stage + 1) % 3;
      if (stage < 2) {
        ctx.melee({ damage: 9, w: 68, h: 50, kx: 180, ky: 100, hitstun: 0.22, bypass: true });
        effects.slash(f.cx, f.cy - 16, f.cx + f.facing * 56, f.cy + 8, '#aab2bd');
      } else {
        ctx.melee({ damage: 11, w: 150, h: 46, ox: 80, kx: 300, ky: 60, hitstun: 0.35, bypass: true, pullTo: true });
        // dotted chain line
        for (let i = 0; i < 6; i++) {
          effects.particles.push({
            x: f.cx + f.facing * (20 + i * 24), y: f.cy - 4, vx: 0, vy: 0,
            life: 0.15, maxLife: 0.15, size: 3, color: '#8a929c', gravity: 0,
          });
        }
      }
    },
  },

  super: {
    name: 'Inverted Spear of Heaven: Executioner',
    cost: 30,
    cooldown: 1.3,
    desc: 'Lunging stab that dispels barriers and buffs — the Limitless killer.',
    onUse(ctx) {
      const f = ctx.f;
      const startX = f.cx; // the stab covers the entire lunge path — no blinking away
      ctx.dash(200, 0.25);
      ctx.schedule(0.16, () => {
        if (!f.alive) return;
        f.attackT = 0.2;
        ctx.melee({
          damage: 45, w: 230, h: 46, fixedX: startX + f.facing * 115, kx: 340, ky: 180, hitstun: 0.55,
          bypass: true, tag: 'super',
          onHitTarget: (t) => {
            t.dispel();
            effects.ring(t.cx, t.cy, '#c58fff', 50, 0.35);
            effects.toast(`${t.name.toUpperCase()}'S TECHNIQUE NULLIFIED`);
          },
        });
        effects.slash(f.cx, f.cy, f.cx + f.facing * 80, f.cy, '#c58fff');
      });
    },
  },

  ultra: {
    name: 'Inverted Spear Throw',
    cost: 25,
    cooldown: 7,
    desc: 'Hurl the Inverted Spear of Heaven — pierces barriers and nullifies techniques at range.',
    onUse(ctx) {
      ctx.projectile({
        damage: 20, speed: 560, range: 520, w: 30, h: 8,
        bypass: true, kx: 260, ky: 120, hitstun: 0.4, tag: 'super',
        color: '#3a4048',
        onHitTarget: (t) => {
          t.dispel();
          effects.ring(t.cx, t.cy, '#c58fff', 44, 0.3);
        },
        draw(ctx2d, p) {
          ctx2d.save();
          ctx2d.translate(p.cx, p.cy);
          ctx2d.rotate(Math.atan2(p.vy, p.vx));
          ctx2d.fillStyle = '#3a4048';
          ctx2d.fillRect(-14, -1.5, 24, 3);
          ctx2d.fillStyle = '#c0392b';
          ctx2d.fillRect(-6, -2.5, 4, 5);
          ctx2d.fillStyle = '#c8ccd4';
          ctx2d.beginPath();
          ctx2d.moveTo(10, 0); ctx2d.lineTo(16, -4); ctx2d.lineTo(16, 4);
          ctx2d.fill();
          ctx2d.restore();
        },
      });
    },
  },

  hooks: {
    // Heavenly Restriction: a body honed past sorcery — 30% less damage taken.
    onIncomingHit(ctx, hit) {
      hit.damage *= 0.7;
      return true;
    },
  },

  drawExtras(ctx2d, f, c) {
    // mouth scar
    ctx2d.strokeStyle = c('#c98f8f');
    ctx2d.lineWidth = 1.2;
    ctx2d.beginPath();
    ctx2d.moveTo(10, -40);
    ctx2d.lineTo(12, -37);
    ctx2d.stroke();
    // cursed-spirit weapon pouch bobbing behind his shoulder
    const bob = Math.sin(f.animT * 3) * 3;
    ctx2d.fillStyle = c('#5f6672');
    ctx2d.beginPath();
    ctx2d.ellipse(-20, -44 + bob, 6, 8, 0.4, 0, Math.PI * 2);
    ctx2d.fill();
    ctx2d.fillStyle = c('#3a4048');
    ctx2d.beginPath();
    ctx2d.ellipse(-20, -44 + bob, 3, 4, 0.4, 0, Math.PI * 2);
    ctx2d.fill();
  },
};
