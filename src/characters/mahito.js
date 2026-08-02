import { jumpVelForHeight, dist } from '../engine/utils.js';
import { GRAVITY, W, H } from '../engine/constants.js';
import { effects } from '../engine/effects.js';
import { Fighter } from '../entities/fighter.js';

const STACKS_TO_TRANSFIGURE = 3;
const WALL_CAP = 2;

// A wall of fused transfigured bodies. Blocks enemies (it registers a
// passTeam solid), Mahito's team walks straight through. Breakable.
const WALL_DEF = {
  id: 'tf-wall',
  name: 'Transfigured Wall',
  stats: { maxHp: 130, speed: 0, jumpVel: 0, weight: 'colossal' },
  size: { w: 30, h: 100 },
  immunities: ['frozen', 'stun', 'slow'],
  basic: { cooldown: 1, onUse() {} },
  hooks: {
    onUpdate(ctx) {
      const f = ctx.f;
      if (f.solidRect) {
        f.solidRect.x = f.x;
        f.solidRect.y = f.y;
      }
    },
  },
  draw(ctx2d, f) {
    const c = (col) => (f.flash > 0 ? '#fff' : col);
    ctx2d.save();
    ctx2d.translate(f.cx, f.y);
    ctx2d.fillStyle = c('#7d8ca3');
    ctx2d.beginPath();
    ctx2d.roundRect(-15, 0, 30, f.h, 8);
    ctx2d.fill();
    // fused bodies: lumps, stitches, and unblinking eyes
    ctx2d.fillStyle = c('#8f9db3');
    for (let i = 0; i < 4; i++) {
      ctx2d.beginPath();
      ctx2d.arc(((i % 2) * 2 - 1) * 7, 16 + i * 24, 8, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.strokeStyle = c('#4a5468');
    ctx2d.lineWidth = 1;
    for (let i = 0; i < 3; i++) {
      ctx2d.beginPath();
      ctx2d.moveTo(-10, 30 + i * 26);
      ctx2d.lineTo(10, 34 + i * 26);
      ctx2d.stroke();
    }
    ctx2d.fillStyle = c('#2f3444');
    ctx2d.fillRect(-6, 22, 3, 3);
    ctx2d.fillRect(4, 62, 3, 3);
    ctx2d.restore();
  },
};

function convertTarget(ctx, target) {
  const f = ctx.f;
  ctx.world.convert(target, f.team, { dmgMult: 1.25, owner: f }); // permanent
  effects.toast('TRANSFIGURED!');
}

export default {
  id: 'mahito',
  name: 'Patchface Soulsmith',
  series: 'JJK',
  unlockLevel: 6,
  stats: { maxHp: 140, speed: 300, jumpVel: jumpVelForHeight(175, GRAVITY), weight: 'medium' },
  palette: { skin: '#e8e0da', hair: '#7d8ca3', top: '#2f3444', bottom: '#262b38', accent: '#4a5468' },
  hairStyle: 'long',
  ai: { type: 'rushdown', band: 75, preferMinions: true },
  moves: [
    { name: 'Transfiguring Touch', desc: 'Warping palm jab — 3 hits on a lesser curse transfigure it to your side, forever. (Bosses resist.)' },
    { name: 'Soul Storage (L)', desc: 'Store a nearby transfigured ally, or release one. Unlimited — your army carries to the next level.' },
  ],

  basic: {
    name: 'Transfiguring Touch',
    cooldown: 0.3,
    onUse(ctx) {
      ctx.melee({ damage: 7, w: 44, h: 34, kx: 190, ky: 110, hitstun: 0.2, tag: 'basic' });
    },
  },

  special: {
    name: 'Soul Storage',
    cooldown: 0.4,
    onUse(ctx) {
      const f = ctx.f;
      f.mem.stored ??= [];
      // store a nearby transfigured ally...
      const nearby = ctx.allies().find(
        (a) => a.converted && a.minionTier && dist(a.cx, a.cy, f.cx, f.cy) < 110,
      );
      if (nearby) {
        nearby.absorbed = true;
        nearby.alive = false;
        ctx.world.onFighterDeath(nearby, null, { silent: true });
        f.mem.stored.push({ def: nearby.def, name: nearby.def.name });
        effects.burst(nearby.cx, nearby.cy, '#7d8ca3', 10, { speed: 140 });
        effects.toast(`SOUL STORED (${f.mem.stored.length})`);
        return;
      }
      // ...or release the oldest one
      if (f.mem.stored.length > 0) {
        const rec = f.mem.stored.shift();
        const ally = ctx.spawnAlly(rec.def, f.cx + f.facing * 44, f.y, { dmgMult: 1.25 });
        ally.converted = true;
        effects.burst(ally.cx, ally.cy, ['#7d8ca3', '#4aa3df'], 12);
        effects.toast(`RELEASED: ${rec.name.toUpperCase()}`);
      } else if (f === ctx.world.player) {
        effects.toast('NO TRANSFIGURED SOUL NEARBY OR STORED');
      }
    },
  },

  super: {
    name: 'Transfigured Toss',
    cost: 20,
    cooldown: 1,
    desc: 'Hurl a stored transfigured human as a screaming projectile — consumes it.',
    onUse(ctx) {
      const f = ctx.f;
      f.mem.stored ??= [];
      if (f.mem.stored.length === 0) {
        f.energy = Math.min(100, f.energy + 20); // refund — nothing to throw
        if (f === ctx.world.player) effects.toast('NOTHING STORED TO THROW (TRANSFIGURE + STORE FIRST)');
        return;
      }
      const rec = f.mem.stored.shift();
      ctx.projectile({
        damage: 22, speed: 520, range: 420, w: 28, h: 24,
        kx: 280, ky: 180, hitstun: 0.4, tag: 'super',
        color: '#7d8ca3',
        onExpire: (world, p) => {
          f.ctx.melee({
            damage: 8, w: 130, h: 110, fixedX: p.cx, fixedY: p.cy, life: 0.12,
            kx: 160, ky: 120, hitstun: 0.25, soul: true, tag: 'super',
          });
          effects.burst(p.cx, p.cy, ['#7d8ca3', '#4aa3df'], 16, { speed: 260 });
          effects.ring(p.cx, p.cy, '#4aa3df', 65, 0.35);
        },
        draw(ctx2d, p) {
          // writhing transfigured blob
          ctx2d.save();
          ctx2d.translate(p.cx, p.cy);
          ctx2d.rotate(p.life * 20);
          ctx2d.fillStyle = '#7d8ca3';
          ctx2d.beginPath();
          ctx2d.arc(0, 0, 11, 0, Math.PI * 2);
          ctx2d.arc(-6, -7, 6, 0, Math.PI * 2);
          ctx2d.arc(7, 5, 5, 0, Math.PI * 2);
          ctx2d.fill();
          ctx2d.fillStyle = '#2f3444';
          ctx2d.fillRect(-4, -3, 3, 3);
          ctx2d.fillRect(2, -2, 3, 3);
          ctx2d.restore();
        },
      });
      if (f === ctx.world.player) effects.toast(`THREW ${rec.name.toUpperCase()} (${f.mem.stored.length} LEFT)`);
    },
  },

  // I — spikes erupt from his reshaped body in every direction
  tech: {
    name: 'Body Repel',
    cost: 20,
    cooldown: 6,
    desc: 'Blades of his own transfigured flesh burst out in all directions.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 14, w: 160, h: 120, centered: true, life: 0.14, kx: 340, ky: 220, hitstun: 0.4, tag: 'super' });
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        effects.slash(f.cx, f.cy - 8, f.cx + Math.cos(a) * 75, f.cy - 8 + Math.sin(a) * 55, '#9aa8ba');
      }
      effects.ring(f.cx, f.cy - 8, '#7d8ca3', 80, 0.3);
    },
  },

  // H — raise a wall of fused transfigured bodies (consumes a stored soul)
  ultra: {
    name: 'Transfigured Wall',
    cooldown: 1,
    desc: 'Consume a stored soul: a durable flesh wall that blocks enemies — you pass through freely.',
    onUse(ctx) {
      const f = ctx.f;
      f.mem.stored ??= [];
      if (f.mem.stored.length === 0) {
        ctx.toast('NEED A STORED SOUL TO BUILD A WALL');
        return;
      }
      // oldest wall crumbles when over the cap
      const walls = ctx.world.fighters.filter((e) => e.alive && e.def === WALL_DEF && e.team === f.team);
      if (walls.length >= WALL_CAP) walls[0].die(ctx.world, null);
      f.mem.stored.shift();
      const wx = f.cx + f.facing * 64 - WALL_DEF.size.w / 2;
      const wall = new Fighter(WALL_DEF, wx, f.y + f.h - WALL_DEF.size.h, f.team);
      ctx.world.addFighter(wall);
      wall.solidRect = { x: wall.x, y: wall.y, w: wall.w, h: wall.h, passTeam: f.team };
      ctx.world.level.solids.push(wall.solidRect);
      effects.burst(wall.cx, wall.cy, ['#7d8ca3', '#4aa3df'], 16, { speed: 200 });
      effects.ring(wall.cx, wall.cy, '#7d8ca3', 60, 0.35);
    },
  },

  domain: {
    name: 'Self-Embodiment of Perfection',
    rank: 2,
    duration: 8,
    color: '#7d9cb8',
    desc: 'Sure-hit touch on every soul: all lesser curses transfigure instantly, everyone else takes soul damage while Mahito heals.',
    onStart(ctx) {
      ctx.mem.acc = 0;
      for (const e of [...ctx.enemies()]) {
        if (!e.minionTier) {
          ctx.applyStatus(e, 'energyHalf', 8, { domain: true });
          continue;
        }
        if (e.simpleDomainT > 0) continue;
        convertTarget(ctx, e);
      }
      // the sure-hit touch spares no one — bystanders transfigure too
      for (const c of [...ctx.world.fighters]) {
        if (c.alive && c.team === 'neutral' && c.minionTier && c.simpleDomainT <= 0) {
          convertTarget(ctx, c);
        }
      }
    },
    onTick(ctx, dt) {
      ctx.f.hp = Math.min(ctx.f.maxHp, ctx.f.hp + 3 * dt);
      ctx.mem.acc += dt;
      if (ctx.mem.acc >= 1) {
        ctx.mem.acc -= 1;
        for (const e of ctx.enemies()) {
          if (e.minionTier) continue;
          e.receiveHit(
            { damage: 5, kx: 0, ky: 0, hitstun: 0, isMelee: false, soul: true, domainTick: true, bypassesBarrier: true, tag: 'domain' },
            ctx.f, ctx.world,
          );
        }
      }
    },
    drawOverlay(ctx2d) {
      ctx2d.fillStyle = 'rgba(125,156,184,0.22)';
      ctx2d.fillRect(0, 0, W, H);
      // floating disembodied hands
      ctx2d.fillStyle = 'rgba(220,215,225,0.28)';
      const t = performance.now() / 1000;
      for (let i = 0; i < 6; i++) {
        const x = ((i * 173 + t * 18) % (W + 60)) - 30;
        const y = 80 + ((i * 97) % 320) + Math.sin(t + i) * 14;
        ctx2d.beginPath();
        ctx2d.roundRect(x, y, 18, 26, 6);
        ctx2d.fill();
        for (let fgr = 0; fgr < 4; fgr++) ctx2d.fillRect(x + 2 + fgr * 4, y - 8, 2.6, 9);
      }
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      ctx.f.mem.soulCd = Math.max(0, (ctx.f.mem.soulCd ?? 0) - dt);
    },
    onDealHit(ctx, target, hit) {
      const f = ctx.f;
      // Idle Transfiguration: enough touches reshape a lesser curse's soul.
      // Only minion-tier — bosses and players resist entirely. A touch that
      // would kill transfigures instead: Mahito doesn't kill souls, he reshapes them.
      if (hit.tag !== 'basic' || !target.minionTier || target.team === f.team || target.converted) return;
      target.tfStacks = (target.tfStacks ?? 0) + 1;
      effects.ring(target.cx, target.cy, '#4aa3df', 12 + target.tfStacks * 8, 0.25);
      if (target.tfStacks >= STACKS_TO_TRANSFIGURE || target.hp <= 0) convertTarget(ctx, target);
    },
    onIncomingHit(ctx, hit) {
      const f = ctx.f;
      if ((f.mem.soulCd ?? 0) <= 0) {
        hit.damage *= 0.5; // Soul Body reshapes around the first hit
        f.mem.soulCd = 10;
      }
      return true;
    },
    hudExtra(ctx2d, f, x, y) {
      const n = (f.mem.stored ?? []).length;
      ctx2d.fillStyle = '#7d8ca3';
      ctx2d.beginPath();
      ctx2d.arc(x + 4, y, 5.5, 0, Math.PI * 2);
      ctx2d.arc(x + 1, y - 4, 3.5, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = '#fff';
      ctx2d.font = 'bold 11px monospace';
      ctx2d.textAlign = 'left';
      ctx2d.fillText(`× ${n} stored`, x + 14, y + 4);
    },
  },

  drawExtras(ctx2d, f, c) {
    // patchwork stitch marks
    ctx2d.strokeStyle = c('#4a5468');
    ctx2d.lineWidth = 1;
    ctx2d.beginPath();
    ctx2d.moveTo(-2, -50); ctx2d.lineTo(4, -48);
    ctx2d.moveTo(-1, -50); ctx2d.lineTo(0, -47);
    ctx2d.moveTo(6, -38); ctx2d.lineTo(10, -37);
    ctx2d.stroke();
    // heterochromatic eyes: overpaint one
    ctx2d.fillStyle = c('#4aa3df');
    ctx2d.fillRect(9, -47, 3, 4);
  },
};
