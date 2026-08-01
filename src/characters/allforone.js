import { jumpVelForHeight, dist, choice } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';
import gojo from './gojo.js';
import sukuna from './sukuna.js';
import shigaraki from './shigaraki.js';
import allmight from './allmight.js';

const STEAL_TIME = 12;

export default {
  id: 'allforone',
  name: 'All For One',
  series: 'MHA',
  unlockLevel: 13,
  stats: { maxHp: 200, speed: 250, jumpVel: jumpVelForHeight(150, GRAVITY), weight: 'colossal' },
  palette: { skin: '#ded2c8', hair: '#111', top: '#141418', bottom: '#0e0e12', accent: '#c0392b' },
  hairStyle: 'none',
  ai: { type: 'zoner', band: 260 },
  moves: [
    { name: 'Air Cannon', desc: 'Energy blast with heavy knockback.' },
    { name: 'Stolen Quirks', desc: 'Passive: every 4th blast is enhanced (longer range, burning, or reflecting).' },
  ],

  basic: {
    name: 'Air Cannon',
    cooldown: 0.55,
    onUse(ctx) {
      const f = ctx.f;
      f.mem.shots = ((f.mem.shots ?? 0) + 1) % 4;
      const enhanced = f.mem.shots === 0 ? choice(['range', 'heat', 'reflect']) : null;
      ctx.projectile({
        damage: 8,
        speed: 480,
        range: enhanced === 'range' ? 420 : 300,
        w: 34, h: 26,
        kx: 340, ky: 140, hitstun: 0.3,
        status: enhanced === 'heat' ? { name: 'burn', dur: 3, params: { dps: 3 } } : null,
        color: enhanced === 'heat' ? '#ff7744' : 'rgba(240,240,255,0.8)',
        draw(ctx2d, p) {
          ctx2d.strokeStyle = enhanced === 'heat' ? '#ff7744' : 'rgba(240,240,255,0.85)';
          ctx2d.lineWidth = 2;
          for (let i = 0; i < 3; i++) {
            ctx2d.globalAlpha = 0.9 - i * 0.25;
            ctx2d.beginPath();
            ctx2d.arc(p.cx - p.vx * 0.01 * i, p.cy, 7 + i * 5, -0.9, 0.9);
            ctx2d.stroke();
          }
          ctx2d.globalAlpha = 1;
        },
      });
      if (enhanced === 'reflect') {
        f.mem.reflectT = 0.35;
        effects.ring(f.cx, f.cy, '#c0392b', 50, 0.3);
      }
    },
  },

  super: {
    name: 'All For One: Power Steal',
    cost: 40,
    cooldown: 1.5,
    desc: "Steal the nearest fighter's power for 12s — you cast their super, they can't.",
    onUse(ctx) {
      const f = ctx.f;
      // already holding a stolen power? cast it through AFO
      if (f.mem.steal && f.mem.steal.t > 0) {
        const sdef = f.mem.steal.def;
        effects.toast(`STOLEN POWER: ${sdef.super.name.toUpperCase()}`);
        f.mem.aimTarget = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(700);
        sdef.super.onUse(ctx);
        return;
      }
      // otherwise: rip the power out of the nearest roster fighter
      const target = ctx.enemies()
        .filter((e) => !e.minionTier && e.def.super)
        .sort((a, b) => dist(a.cx, a.cy, f.cx, f.cy) - dist(b.cx, b.cy, f.cx, f.cy))[0];
      if (!target) {
        // nobody worth robbing — fire a wide triple blast instead
        for (const dy of [-40, 0, 40]) {
          ctx.projectile({ damage: 10, speed: 420, range: 320, w: 30, h: 22, y: f.cy + dy, kx: 300, ky: 120, tag: 'super', color: 'rgba(240,240,255,0.8)' });
        }
        return;
      }
      f.mem.steal = { def: target.def, t: STEAL_TIME, victim: target };
      target.powerStolenT = STEAL_TIME;
      effects.showBanner('ALL FOR ONE', '#c0392b', `${target.name.toUpperCase()}'S POWER STOLEN`, 1.6);
      effects.flash(0.12, '#1a0508');
      // red siphon beam
      for (let i = 0; i < 14; i++) {
        const t = i / 14;
        effects.particles.push({
          x: target.cx + (f.cx - target.cx) * t, y: target.cy + (f.cy - target.cy) * t - Math.sin(t * Math.PI) * 30,
          vx: (f.cx - target.cx) * 0.8, vy: 0,
          life: 0.4, maxLife: 0.4, size: 4, color: i % 2 ? '#c0392b' : '#4a0a12', gravity: 0,
        });
      }
      if (f === ctx.world.player) effects.toast('PRESS SUPER AGAIN TO USE IT');
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      const f = ctx.f;
      f.mem.reflectT = Math.max(0, (f.mem.reflectT ?? 0) - dt);
      // Impact Recoil: bounce nearby enemy projectiles back
      if (f.mem.reflectT > 0) {
        for (const p of ctx.world.projectiles) {
          if (p.team === f.team || p.dying > 0) continue;
          if (dist(p.cx, p.cy, f.cx, f.cy) < 90) {
            p.vx *= -1;
            p.vy *= -0.5;
            p.team = f.team;
            p.owner = f;
            p.hitSet.clear();
            // strip the original caster's side effects — they'd detonate against our team
            p.onExpire = null;
            p.onHitTarget = null;
            effects.ring(p.cx, p.cy, '#c0392b', 24, 0.2);
          }
        }
      }
      // stolen power timer + delegated passive hooks
      if (f.mem.steal) {
        f.mem.steal.t -= dt;
        if (f.mem.steal.t <= 0) {
          f.mem.steal = null;
          if (f === ctx.world.player) effects.toast('STOLEN POWER FADED');
        } else {
          f.mem.steal.def.hooks?.onUpdate?.(ctx, dt);
        }
      }
      // Boss finale: at 66% / 33% HP All For One channels a legendary quirk he
      // stole long ago — mirroring an earlier boss's power.
      if (f.isBoss) {
        const frac = f.hp / f.maxHp;
        if (frac < 0.66 && !f.mem.phase2) {
          f.mem.phase2 = true;
          f.mem.steal = { def: choice([allmight, shigaraki]), t: 15, victim: null };
          effects.showBanner('ALL FOR ONE', '#c0392b', `CHANNELS ${f.mem.steal.def.name.toUpperCase()}`, 1.6);
        }
        if (frac < 0.33 && !f.mem.phase3) {
          f.mem.phase3 = true;
          f.mem.steal = { def: choice([gojo, sukuna]), t: 20, victim: null };
          effects.showBanner('ALL FOR ONE', '#c0392b', `CHANNELS ${f.mem.steal.def.name.toUpperCase()}`, 1.6);
        }
      }
    },
    onDealHit(ctx, target, hit) {
      if (ctx.f.mem.steal?.t > 0) ctx.f.mem.steal.def.hooks?.onDealHit?.(ctx, target, hit);
    },
    onKill(ctx, target) {
      if (ctx.f.mem.steal?.t > 0) ctx.f.mem.steal.def.hooks?.onKill?.(ctx, target);
    },
    onIncomingHit(ctx, hit, source) {
      if (ctx.f.mem.steal?.t > 0 && ctx.f.mem.steal.def.hooks?.onIncomingHit) {
        return ctx.f.mem.steal.def.hooks.onIncomingHit(ctx, hit, source);
      }
      return true;
    },
    hudExtra(ctx2d, f, x, y) {
      if (!(f.mem.steal?.t > 0)) return;
      ctx2d.fillStyle = '#c0392b';
      ctx2d.font = 'bold 11px monospace';
      ctx2d.textAlign = 'left';
      ctx2d.fillText(`STOLEN: ${f.mem.steal.def.name} (${Math.ceil(f.mem.steal.t)}s)`, x - 6, y + 4);
    },
  },

  drawExtras(ctx2d, f, c) {
    // featureless black mask over the whole upper face
    ctx2d.fillStyle = c('#141418');
    ctx2d.beginPath();
    ctx2d.roundRect(-12, -55, 26, 13, 5);
    ctx2d.fill();
    // breathing tubes at the jaw
    ctx2d.strokeStyle = c('#4a4a52');
    ctx2d.lineWidth = 2;
    ctx2d.beginPath();
    ctx2d.moveTo(-8, -39); ctx2d.lineTo(-14, -33);
    ctx2d.moveTo(-4, -38); ctx2d.lineTo(-9, -31);
    ctx2d.stroke();
    // high collar
    ctx2d.fillStyle = c('#1e1e26');
    ctx2d.fillRect(-12, -38, 24, 5);
    // red aura wisps at the fists while holding a stolen power
    if (f.mem.steal?.t > 0 && Math.random() < 0.4) {
      effects.particles.push({
        x: f.cx + f.facing * 14, y: f.cy - 2,
        vx: 0, vy: -40, life: 0.25, maxLife: 0.25, size: 3, color: '#c0392b', gravity: 0,
      });
    }
  },
};
