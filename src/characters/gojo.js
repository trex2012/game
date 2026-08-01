import { jumpVelForHeight, dist, sign } from '../engine/utils.js';
import { GRAVITY, W, H } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

const REPEL_R = 120;
const PROJECTILE_R = 100;

export default {
  id: 'gojo',
  name: 'Satoru Gojo',
  series: 'JJK',
  unlockLevel: 11,
  stats: { maxHp: 160, speed: 330, jumpVel: jumpVelForHeight(185, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#eef2f5', top: '#1c2233', bottom: '#151a28', accent: '#3aa0ff' },
  hairStyle: 'spiky',
  energyDealtMult: 1.25, // Six Eyes
  superCostMult: 0.75,
  ai: { type: 'zoner', band: 380 },
  moves: [
    { name: 'Reversal: Red', desc: 'Long-range repulsion orb that blasts enemies away.' },
    { name: 'Six Eyes', desc: 'Passive: supers cost 25% less, +25% energy from damage dealt.' },
  ],

  basic: {
    name: 'Reversal: Red',
    cooldown: 0.5,
    onUse(ctx) {
      ctx.projectile({
        damage: 9, speed: 700, range: 500, w: 18, h: 18,
        kx: 320, ky: 120, hitstun: 0.3,
        color: '#ff5566', trail: '#ff8899',
        draw(ctx2d, p) {
          ctx2d.fillStyle = '#fff';
          ctx2d.beginPath();
          ctx2d.arc(p.cx, p.cy, 5, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.strokeStyle = '#ff5566';
          ctx2d.lineWidth = 2;
          ctx2d.beginPath();
          ctx2d.arc(p.cx, p.cy, 8, 0, Math.PI * 2);
          ctx2d.stroke();
        },
      });
    },
  },

  super: {
    name: 'Limitless: Infinity',
    cost: 40, // 30 after Six Eyes
    cooldown: 1,
    desc: '6s of Infinity: melee slides off before it reaches you, projectiles stall and die.',
    onUse(ctx) {
      ctx.f.mem.limitless = 6;
      effects.ring(ctx.f.cx, ctx.f.cy, '#9fd8ff', REPEL_R, 0.5);
      if (ctx.f === ctx.world.player) effects.toast('INFINITY — NOTHING REACHES YOU');
    },
  },

  domain: {
    name: 'Unlimited Void',
    rank: 4,
    duration: 8,
    color: '#7ec8ff',
    desc: 'Floods every enemy mind with infinity: frozen solid for the duration, +50% damage taken.',
    onStart(ctx) {
      const dur = ctx.asBoss ? 2.5 : 8; // boss Void is a burst, not a lockout
      for (const e of ctx.enemies()) {
        ctx.applyStatus(e, 'frozen', dur, { vulnMult: 1.5, domain: true });
      }
    },
    onEnd(ctx) {
      for (const e of ctx.enemies()) {
        if (e.statuses.frozen?.domain) {
          delete e.statuses.frozen;
          e.gravityOff = false;
        }
      }
    },
    drawOverlay(ctx2d, d) {
      const g = ctx2d.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(8,10,40,0.8)');
      g.addColorStop(0.6, 'rgba(30,18,70,0.72)');
      g.addColorStop(1, 'rgba(60,30,110,0.65)');
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 0, W, H);
      // starfield
      ctx2d.fillStyle = 'rgba(255,255,255,0.8)';
      for (let i = 0; i < 60; i++) {
        const x = (i * 379) % W;
        const y = (i * 173 + ((i * i) % 7) * 40) % H;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(i + performance.now() / 700));
        ctx2d.globalAlpha = tw * 0.8;
        ctx2d.fillRect(x, y, i % 5 === 0 ? 2.5 : 1.5, i % 5 === 0 ? 2.5 : 1.5);
      }
      ctx2d.globalAlpha = 1;
    },
  },

  ultra: {
    name: 'Hollow Technique: Purple',
    cost: 45, // ~34 after Six Eyes
    cooldown: 12,
    desc: 'Red and Blue collide — a mass of imaginary matter that erases everything it touches.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.windup(0.5, () => {
        if (!f.alive) return;
        f.attackT = 0.3;
        effects.flash(0.12, '#b06ae8');
        ctx.world.camera?.shake(10, 0.4);
        ctx.projectile({
          damage: 40, speed: 520, range: 720, w: 46, h: 46,
          pierce: true, bypass: true, kx: 420, ky: 240, hitstun: 0.6, tag: 'super',
          color: '#b06ae8', trail: '#7a3ab8',
          draw(ctx2d, p) {
            const t = p.life * 30;
            ctx2d.fillStyle = '#b06ae8';
            ctx2d.beginPath();
            ctx2d.arc(p.cx, p.cy, 22 + Math.sin(t) * 3, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.fillStyle = '#e8d0ff';
            ctx2d.beginPath();
            ctx2d.arc(p.cx, p.cy, 12, 0, Math.PI * 2);
            ctx2d.fill();
            ctx2d.strokeStyle = 'rgba(176,106,232,0.5)';
            ctx2d.lineWidth = 2;
            ctx2d.beginPath();
            ctx2d.arc(p.cx, p.cy, 30 + Math.sin(t * 1.3) * 4, 0, Math.PI * 2);
            ctx2d.stroke();
          },
        });
      }, { tell: false });
      effects.burst(f.cx + f.facing * 30, f.cy - 10, ['#ff5566', '#3aa0ff'], 12, { speed: 120 });
      if (f === ctx.world.player) effects.toast('RED... BLUE... COMBINED.');
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      const f = ctx.f;
      if ((f.mem.limitless ?? 0) <= 0) return;
      f.mem.limitless -= dt;
      // repel melee attackers — they slide off Infinity
      for (const e of ctx.enemies()) {
        const d = dist(e.cx, e.cy, f.cx, f.cy);
        if (d < REPEL_R && d > 1) {
          const dir = sign(e.cx - f.cx) || 1;
          e.x += dir * (REPEL_R - d) * 3.2 * dt;
          if (sign(e.vx) === -dir) e.vx *= 0.8;
        }
      }
      // stall incoming projectiles
      for (const p of ctx.world.projectiles) {
        if (p.team === f.team || p.bypassesBarrier || p.dying > 0) continue;
        if (dist(p.cx, p.cy, f.cx, f.cy) < PROJECTILE_R) p.dying = 0.3;
      }
    },
    onIncomingHit(ctx, hit) {
      // Infinity stops everything that isn't barrier-bypassing (Toji, domain
      // ticks) — including hitscan supers like Piercing Blood. Environmental
      // hazards and domain-clash backlash still land.
      if ((ctx.f.mem.limitless ?? 0) > 0 && !hit.bypassesBarrier && hit.tag !== 'hazard' && hit.tag !== 'clash') return false;
      return true;
    },
  },

  drawExtras(ctx2d, f, c) {
    const voidOpen = f.world?.activeDomain?.owner === f;
    if (voidOpen) {
      // blindfold off: glowing six eyes
      ctx2d.fillStyle = c('#7ec8ff');
      ctx2d.fillRect(2, -48, 4, 5);
      ctx2d.fillRect(8, -48, 4, 5);
      ctx2d.globalAlpha = 0.5;
      ctx2d.fillRect(1, -49, 6, 7);
      ctx2d.fillRect(7, -49, 6, 7);
      ctx2d.globalAlpha = 1;
    } else {
      // black blindfold band
      ctx2d.fillStyle = c('#14161c');
      ctx2d.fillRect(-12, -49, 26, 7);
    }
    // Infinity shimmer ring
    if ((f.mem.limitless ?? 0) > 0) {
      ctx2d.save();
      ctx2d.strokeStyle = c('rgba(159,216,255,0.5)');
      ctx2d.lineWidth = 1.5;
      const r = REPEL_R * 0.55; // drawn in half-scale local space, approx
      ctx2d.setLineDash([6, 8]);
      ctx2d.beginPath();
      ctx2d.arc(0, -27, r, 0, Math.PI * 2);
      ctx2d.stroke();
      ctx2d.restore();
    }
  },
};
