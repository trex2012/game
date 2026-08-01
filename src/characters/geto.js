import { jumpVelForHeight, dist } from '../engine/utils.js';
import { GRAVITY, W, H } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

// Domain: vacuum every opposing lesser curse into storage. Strength is
// irrelevant inside his territory — but bosses are beyond curse manipulation.
function devourAll(ctx) {
  const f = ctx.f;
  f.mem.stored ??= [];
  let took = 0;
  for (const e of [...ctx.enemies()]) {
    if (!e.minionTier) continue;          // bosses resist
    if (e.simpleDomainT > 0) continue;    // Simple Domain resists
    e.absorbed = true;
    e.alive = false;
    ctx.world.onFighterDeath(e, null, { silent: true });
    f.mem.stored.push({ def: e.def, name: e.def.name });
    effects.burst(e.cx, e.cy, '#2a2733', 12, { speed: 180 });
    effects.slash(e.cx, e.cy, f.cx, f.cy - 10, '#8e6bb8');
    took++;
  }
  if (took > 0) effects.toast(`DEVOURED ${took} CURSE${took > 1 ? 'S' : ''} (${f.mem.stored.length} STORED)`);
}

export default {
  id: 'geto',
  name: 'Suguru Geto',
  series: 'JJK',
  unlockLevel: 8,
  stats: { maxHp: 185, speed: 280, jumpVel: jumpVelForHeight(160, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#181820', top: '#2a2733', bottom: '#211f2a', accent: '#b08d3f' },
  hairStyle: 'topbun',
  ai: { type: 'summoner', band: 260, useSpecial: true },
  moves: [
    { name: 'Cursed Spirit Bolt', desc: 'Homing curse wisp.' },
    { name: 'Curse Manipulation (L)', desc: 'Absorb a weakened lesser curse — unlimited storage, carried to the next level — or release one to fight for you.' },
  ],

  basic: {
    name: 'Cursed Spirit Bolt',
    cooldown: 0.5,
    onUse(ctx) {
      ctx.projectile({
        damage: 6, speed: 380, range: 320, w: 14, h: 14,
        homing: 1.8, color: '#8e6bb8', trail: '#5b4477',
        draw(ctx2d, p) {
          ctx2d.fillStyle = '#8e6bb8';
          ctx2d.beginPath();
          ctx2d.arc(p.cx, p.cy, 7, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.fillStyle = '#fff';
          ctx2d.beginPath();
          ctx2d.arc(p.cx + 2, p.cy - 1, 2.2, 0, Math.PI * 2);
          ctx2d.fill();
        },
      });
    },
  },

  special: {
    name: 'Curse Manipulation',
    cooldown: 0.4,
    onUse(ctx) {
      const f = ctx.f;
      f.mem.stored ??= [];

      // 1) try to absorb: a weaker minion-tier curse within reach.
      // Boss Geto may also bank wild curses from his own waves (not his releases).
      const pool = f === ctx.world.player
        ? ctx.enemies()
        : [...ctx.enemies(), ...ctx.allies().filter((a) => a.owner !== f)];
      const candidate = pool.find((e) =>
        e.minionTier && !e.converted &&
        dist(e.cx, e.cy, f.cx, f.cy) < 95 &&
        (e.hp < e.maxHp * 0.3 || e.maxHp <= f.maxHp / 2),
      );
      if (candidate) {
        ctx.windup(0.6, () => {
          if (!candidate.alive) return;
          candidate.absorbed = true;
          candidate.alive = false;
          ctx.world.onFighterDeath(candidate, null, { silent: true });
          f.mem.stored.push({ def: candidate.def, name: candidate.def.name });
          effects.burst(candidate.cx, candidate.cy, '#2a2733', 12, { speed: 160 });
          effects.ring(f.cx, f.cy, '#8e6bb8', 40, 0.3);
          effects.toast(`CURSE ABSORBED (${f.mem.stored.length} STORED)`);
        });
        return;
      }

      // 2) otherwise release the oldest stored curse as an ally
      if (f.mem.stored.length > 0) {
        const rec = f.mem.stored.shift();
        ctx.spawnAlly(rec.def, f.cx + f.facing * 44, f.y, { hpMult: 1.1, dmgMult: 1.1, despawnT: 20 });
        effects.burst(f.cx + f.facing * 44, f.cy, '#8e6bb8', 12);
        effects.toast(`RELEASED: ${rec.name.toUpperCase()} (${f.mem.stored.length} LEFT)`);
      } else if (f === ctx.world.player) {
        effects.toast('NO WEAKENED CURSE IN REACH');
      }
    },
  },

  super: {
    name: 'Maximum: Uzumaki',
    cost: 30,
    cooldown: 1.6,
    desc: 'Consumes ALL stored curses: vortex beam, 20 dmg + 10 per curse.',
    onUse(ctx) {
      const f = ctx.f;
      f.mem.stored ??= [];
      const n = f.mem.stored.length;
      f.mem.stored = [];
      const dmg = Math.min(100, 20 + n * 10);
      ctx.windup(0.25, () => {
        f.attackT = 0.3;
        ctx.melee({ damage: dmg, w: 400, h: 64, ox: 205, kx: 420, ky: 200, hitstun: 0.5, life: 0.28, tag: 'super' });
        effects.beam(f.cx + f.facing * 10, f.cy - 6, f.facing, 400, '#6b4aa0', 40);
        for (let i = 0; i < 22; i++) {
          const along = 30 + Math.random() * 360;
          effects.particles.push({
            x: f.cx + f.facing * along, y: f.cy - 6 + Math.sin(along * 0.08) * 22,
            vx: f.facing * 120, vy: (Math.random() - 0.5) * 80,
            life: 0.4, maxLife: 0.4, size: 4, color: Math.random() < 0.5 ? '#6b4aa0' : '#2a2733', gravity: 0,
          });
        }
        ctx.world.camera?.shake(7, 0.3);
      });
      if (n === 0) effects.toast('UZUMAKI (NO CURSES STORED — WEAK)');
    },
  },

  domain: {
    name: 'Sea of Ten Thousand Curses',
    rank: 2,
    duration: 6,
    color: '#8e6bb8',
    desc: 'Every lesser curse in the arena is ripped into his storage, no matter how strong. Bosses resist.',
    onStart(ctx) {
      ctx.mem.acc = 0;
      devourAll(ctx);
    },
    onTick(ctx, dt) {
      // anything that dares spawn inside the sea gets swallowed too
      ctx.mem.acc += dt;
      if (ctx.mem.acc >= 0.5) {
        ctx.mem.acc -= 0.5;
        devourAll(ctx);
      }
    },
    drawOverlay(ctx2d) {
      ctx2d.fillStyle = 'rgba(58,38,88,0.35)';
      ctx2d.fillRect(0, 0, W, H);
      // curse eyes spiraling in toward the center
      const t = performance.now() / 1000;
      for (let i = 0; i < 14; i++) {
        const prog = ((t * 0.22 + i / 14) % 1);
        const r = (1 - prog) * 420 + 30;
        const a = t * 1.5 + i * 2.4;
        const x = W / 2 + Math.cos(a) * r;
        const y = H / 2 + Math.sin(a) * r * 0.55;
        ctx2d.globalAlpha = 0.35 + prog * 0.45;
        ctx2d.fillStyle = '#8e6bb8';
        ctx2d.beginPath();
        ctx2d.arc(x, y, 5 + prog * 4, 0, Math.PI * 2);
        ctx2d.fill();
        ctx2d.fillStyle = '#fff';
        ctx2d.beginPath();
        ctx2d.arc(x + 2, y - 1, 1.8, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;
    },
  },

  hooks: {
    hudExtra(ctx2d, f, x, y) {
      const n = (f.mem.stored ?? []).length;
      ctx2d.fillStyle = '#8e6bb8';
      ctx2d.beginPath();
      ctx2d.arc(x + 4, y, 5.5, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = '#fff';
      ctx2d.fillRect(x + 5, y - 2, 2, 2);
      ctx2d.font = 'bold 11px monospace';
      ctx2d.textAlign = 'left';
      ctx2d.fillText(`× ${n} curses`, x + 14, y + 4);
    },
  },

  drawExtras(ctx2d, f, c) {
    // kasaya sash
    ctx2d.strokeStyle = c('#b08d3f');
    ctx2d.lineWidth = 3;
    ctx2d.beginPath();
    ctx2d.moveTo(-9, -32);
    ctx2d.lineTo(9, -18);
    ctx2d.stroke();
    // orbiting stored-curse orbs (draws up to 8; the HUD shows the true count)
    const shown = Math.min((f.mem.stored ?? []).length, 8);
    for (let i = 0; i < shown; i++) {
      const a = f.animT * 2 + (i * Math.PI * 2) / Math.max(3, shown);
      ctx2d.fillStyle = c('#8e6bb8');
      ctx2d.beginPath();
      ctx2d.arc(Math.cos(a) * 22, -30 + Math.sin(a) * 12, 3.5, 0, Math.PI * 2);
      ctx2d.fill();
    }
  },
};
