import { jumpVelForHeight, rectsOverlap } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';
import { Fighter } from '../entities/fighter.js';

// Jagged wall of ice spikes raised by his I tech. Blocks enemies (passTeam
// solid — Shoto's team walks through), and touching the spikes hurts + freezes.
const ICE_WALL_DEF = {
  id: 'ice-wall',
  name: 'Ice Wall',
  stats: { maxHp: 80, speed: 0, jumpVel: 0, weight: 'colossal' },
  size: { w: 34, h: 96 },
  immunities: ['frozen', 'stun', 'slow'],
  basic: { cooldown: 1, onUse() {} },
  hooks: {
    onUpdate(ctx, dt) {
      const f = ctx.f;
      if (f.solidRect) {
        f.solidRect.x = f.x;
        f.solidRect.y = f.y;
      }
      // the spikes bite anyone who touches the wall (per-enemy re-hit cooldown)
      f.mem.spikeCd ??= new Map();
      for (const [e, t] of f.mem.spikeCd) f.mem.spikeCd.set(e, t - dt);
      const r = f.rect;
      const reach = { x: r.x - 6, y: r.y - 6, w: r.w + 12, h: r.h + 12 };
      for (const e of ctx.enemies()) {
        if ((f.mem.spikeCd.get(e) ?? 0) > 0 || !rectsOverlap(reach, e.rect)) continue;
        e.receiveHit(
          {
            damage: 11 * f.dmgMult, kx: 140, ky: 80, hitstun: 0.3, isMelee: true, tag: 'super',
            status: { name: 'frozen', dur: 1.2 },
          },
          f, ctx.world,
        );
        f.mem.spikeCd.set(e, 2.6);
        effects.burst(e.cx, e.cy, ['#bfe8ff', '#ffffff'], 8, { speed: 160 });
      }
    },
  },
  draw(ctx2d, f) {
    const c = (col) => (f.flash > 0 ? '#fff' : col);
    ctx2d.save();
    ctx2d.translate(f.cx, f.y);
    ctx2d.globalAlpha = 0.92;
    // jagged main slab
    ctx2d.fillStyle = c('#a8dcf8');
    ctx2d.beginPath();
    ctx2d.moveTo(-17, f.h);
    ctx2d.lineTo(-15, 22);
    ctx2d.lineTo(-8, 8);
    ctx2d.lineTo(-3, 18);
    ctx2d.lineTo(3, 0);
    ctx2d.lineTo(8, 16);
    ctx2d.lineTo(14, 6);
    ctx2d.lineTo(17, f.h);
    ctx2d.closePath();
    ctx2d.fill();
    // inner shine
    ctx2d.fillStyle = c('#e0f4ff');
    ctx2d.beginPath();
    ctx2d.moveTo(-8, f.h);
    ctx2d.lineTo(-6, 26);
    ctx2d.lineTo(-1, 14);
    ctx2d.lineTo(4, 30);
    ctx2d.lineTo(7, f.h);
    ctx2d.closePath();
    ctx2d.fill();
    // spiky barbs jutting from the sides
    ctx2d.fillStyle = c('#bfe8ff');
    for (const [sy, dir] of [[30, -1], [44, 1], [62, -1], [78, 1]]) {
      ctx2d.beginPath();
      ctx2d.moveTo(dir * 15, sy - 5);
      ctx2d.lineTo(dir * 27, sy);
      ctx2d.lineTo(dir * 15, sy + 5);
      ctx2d.closePath();
      ctx2d.fill();
    }
    // cracks as it takes damage
    if (f.hp < f.maxHp * 0.6) {
      ctx2d.strokeStyle = c('rgba(40,80,110,0.7)');
      ctx2d.lineWidth = 1.5;
      ctx2d.beginPath();
      ctx2d.moveTo(-6, 30);
      ctx2d.lineTo(2, 46);
      ctx2d.lineTo(-4, 62);
      ctx2d.stroke();
    }
    ctx2d.restore();
  },
};

export default {
  id: 'todoroki',
  name: 'Icyhot Prince',
  series: 'MHA',
  unlockLevel: 12,
  stats: { maxHp: 130, speed: 300, jumpVel: jumpVelForHeight(170, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#e8e4e0', top: '#3a4a6e', bottom: '#2c3850', accent: '#b03a3a' },
  hairStyle: 'messy',
  ai: { type: 'zoner', band: 320 },
  moves: [
    { name: 'Ice Shard', desc: 'Chilling projectile that slows whatever it tags.' },
    { name: 'Two Sides', desc: 'Passive: spamming ice frosts him over (slower). Any fire move thaws him and grants a speed burst.' },
  ],

  basic: {
    name: 'Ice Shard',
    cooldown: 0.4,
    onUse(ctx) {
      const f = ctx.f;
      f.mem.frost = Math.min(5, (f.mem.frost ?? 0) + 1);
      // tall shard flying at knee height so it clips crawlers instead of sailing over
      ctx.projectile({
        damage: 6, speed: 620, range: 430, w: 16, h: 26, y: f.cy + 6,
        kx: 140, ky: 80, hitstun: 0.2,
        status: { name: 'slow', dur: 0.9, params: { factor: 0.75 } },
        color: '#bfe8ff', trail: '#e8f8ff',
      });
    },
  },

  super: {
    name: 'Glacier Wave',
    cost: 35,
    cooldown: 1.4,
    desc: 'A wall of ice erupts forward — 18 dmg and everything caught is frozen solid.',
    onUse(ctx) {
      const f = ctx.f;
      f.mem.frost = Math.min(5, (f.mem.frost ?? 0) + 2);
      ctx.windup(0.3, () => {
        if (!f.alive) return;
        f.attackT = 0.25;
        ctx.melee({
          damage: 18, w: 240, h: 70, ox: 130, kx: 160, ky: 120, hitstun: 0.4, tag: 'super',
          status: { name: 'frozen', dur: 1.1 },
        });
        for (let i = 0; i < 4; i++) {
          effects.burst(f.cx + f.facing * (60 + i * 55), f.y + f.h - 20, ['#bfe8ff', '#ffffff'], 8, { speed: 180 });
        }
        effects.ring(f.cx + f.facing * 120, f.cy, '#bfe8ff', 100, 0.4);
        ctx.world.camera?.shake(6, 0.25);
      }, { tell: true });
    },
  },

  tech: {
    name: 'Ice Wall',
    cost: 15,
    cooldown: 6,
    desc: 'A jagged wall of ice spikes erupts ahead — 11 dmg, freezes on touch, blocks enemies.',
    onUse(ctx) {
      const f = ctx.f;
      f.mem.frost = Math.min(5, (f.mem.frost ?? 0) + 1);
      // one wall at a time — recasting shatters the old one
      const old = ctx.world.fighters.find((e) => e.alive && e.def === ICE_WALL_DEF && e.team === f.team);
      if (old) old.die(ctx.world, null);
      const wallX = f.cx + f.facing * 70;
      const wy = ctx.world.level.groundY(wallX, f.y) - ICE_WALL_DEF.size.h;
      const wall = new Fighter(ICE_WALL_DEF, wallX - ICE_WALL_DEF.size.w / 2, wy, f.team, {
        dmgMult: f.dmgMult, despawnT: 7,
      });
      ctx.world.addFighter(wall);
      wall.solidRect = { x: wall.x, y: wall.y, w: wall.w, h: wall.h, passTeam: f.team };
      ctx.world.level.solids.push(wall.solidRect);
      // the eruption itself spikes everything in the wall's footprint
      ctx.melee({
        damage: 11, w: 80, h: ICE_WALL_DEF.size.h, ox: 70, kx: 80, ky: 100, hitstun: 0.3, tag: 'super',
        status: { name: 'frozen', dur: 1.2 },
      });
      effects.burst(wall.cx, wall.cy, ['#bfe8ff', '#ffffff', '#8fd0f8'], 16, { speed: 220 });
      effects.ring(wall.cx, wall.y + wall.h, '#bfe8ff', 60, 0.35);
      ctx.world.camera?.shake(5, 0.2);
    },
  },

  ultra: {
    name: 'Flashfire Fist: Jet Burn',
    cost: 30,
    cooldown: 8,
    desc: 'Full-power flame blast — a roaring cone of fire with a long burn.',
    onUse(ctx) {
      const f = ctx.f;
      thaw(ctx);
      ctx.windup(0.35, () => {
        if (!f.alive) return;
        f.attackT = 0.3;
        ctx.melee({
          damage: 24, w: 270, h: 95, ox: 145, kx: 320, ky: 180, hitstun: 0.5, tag: 'super',
          status: { name: 'burn', dur: 4, params: { dps: 5 } },
        });
        effects.beam(f.cx + f.facing * 16, f.cy - 8, f.facing, 270, '#ff8a4a', 22);
        effects.burst(f.cx + f.facing * 140, f.cy - 8, ['#ff8a4a', '#ffb347', '#fff2c8'], 24, { speed: 300 });
        effects.flash(0.08, '#3a1608');
        ctx.world.camera?.shake(8, 0.3);
      }, { tell: true });
    },
  },

  hooks: {
    onUpdate(ctx) {
      // frosted over: too much ice without thawing slows him down
      if ((ctx.f.mem.frost ?? 0) >= 4) ctx.buffSpeed(0.9, 0.15);
    },
  },

  drawExtras(ctx2d, f, c) {
    // back half of his hair is flame-red
    ctx2d.save();
    ctx2d.beginPath();
    ctx2d.rect(-19, -62, 19, 24);
    ctx2d.clip();
    ctx2d.fillStyle = c('#c04848');
    for (const [dx, dy, r] of [[-7, -52, 7], [0, -55, 8], [-11, -46, 5]]) {
      ctx2d.beginPath();
      ctx2d.arc(dx, dy, r, 0, Math.PI * 2);
      ctx2d.fill();
    }
    ctx2d.restore();
    // burn scar over the front eye
    ctx2d.fillStyle = c('rgba(176,74,90,0.55)');
    ctx2d.fillRect(2, -49, 6, 7);
    // frost shimmer when frosted over
    if ((f.mem.frost ?? 0) >= 4) {
      ctx2d.fillStyle = c('rgba(191,232,255,0.35)');
      ctx2d.fillRect(-12, -34, 24, 21);
    }
  },
};

function thaw(ctx) {
  const f = ctx.f;
  if ((f.mem.frost ?? 0) >= 4) ctx.buffSpeed(1.15, 2); // thawing out feels great
  f.mem.frost = 0;
}
