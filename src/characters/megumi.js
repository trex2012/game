import { jumpVelForHeight, dist, sign } from '../engine/utils.js';
import { GRAVITY } from '../engine/constants.js';
import { effects } from '../engine/effects.js';
import { Hazard } from '../entities/hazard.js';

// ---- shikigami defs ----------------------------------------------------

const divineDog = {
  id: 'divine-dog',
  name: 'Divine Dog',
  minionTier: true,
  stats: { maxHp: 40, speed: 260, jumpVel: jumpVelForHeight(140, GRAVITY), weight: 'light' },
  size: { w: 34, h: 26 },
  brain: { mode: 'ground', sight: 260, range: 46, windup: 0.2, recover: 0.6, leash: 420 },
  basic: {
    cooldown: 0.8,
    onUse(ctx) {
      ctx.melee({ damage: 4, w: 40, h: 26, kx: 140, ky: 80, hitstun: 0.15, tag: 'pet' });
    },
  },
  draw(ctx2d, f) {
    const c = (col) => (f.flash > 0 ? '#fff' : col);
    ctx2d.save();
    ctx2d.translate(f.cx, f.y + f.h);
    ctx2d.scale(f.facing, 1);
    ctx2d.fillStyle = c('#f0f0f5');
    ctx2d.beginPath();
    ctx2d.roundRect(-16, -18, 28, 14, 6); // body
    ctx2d.fill();
    ctx2d.beginPath();
    ctx2d.arc(14, -16, 7, 0, Math.PI * 2); // head
    ctx2d.fill();
    ctx2d.beginPath(); // ears
    ctx2d.moveTo(10, -21); ctx2d.lineTo(12, -28); ctx2d.lineTo(15, -21);
    ctx2d.moveTo(15, -21); ctx2d.lineTo(18, -28); ctx2d.lineTo(20, -21);
    ctx2d.fill();
    ctx2d.fillStyle = c('#2b2f3f'); // markings + legs
    ctx2d.fillRect(-14, -6, 4, 6);
    ctx2d.fillRect(4, -6, 4, 6);
    ctx2d.fillRect(16, -17, 3, 2);
    ctx2d.restore();
  },
};

const nue = {
  id: 'nue',
  name: 'Nue',
  minionTier: true,
  stats: { maxHp: 30, speed: 240, jumpVel: 0, weight: 'light' },
  size: { w: 36, h: 24 },
  contactDamage: 5,
  brain: { mode: 'fly', sight: 300, windup: 0.3, diveSpeed: 380, diveWindow: 80, leash: 460 },
  basic: { cooldown: 2, onUse() {} },
  hooks: {
    onDealHit(ctx, target, hit) {
      if (hit.tag !== 'contact') return;
      const f = ctx.f;
      f.mem.dives = (f.mem.dives ?? 0) + 1;
      if (f.mem.dives % 3 === 0) ctx.applyStatus(target, 'stun', 0.3);
    },
  },
  draw(ctx2d, f) {
    const c = (col) => (f.flash > 0 ? '#fff' : col);
    ctx2d.save();
    ctx2d.translate(f.cx, f.cy);
    ctx2d.scale(f.facing, 1);
    const flap = Math.sin(f.animT * 12) * 6;
    ctx2d.fillStyle = c('#20232f');
    ctx2d.beginPath(); // diamond body
    ctx2d.moveTo(-14, 0); ctx2d.lineTo(0, -9); ctx2d.lineTo(14, 0); ctx2d.lineTo(0, 9);
    ctx2d.fill();
    ctx2d.beginPath(); // wings
    ctx2d.moveTo(-4, -4); ctx2d.lineTo(-18, -12 - flap); ctx2d.lineTo(-8, 0);
    ctx2d.moveTo(4, -4); ctx2d.lineTo(18, -12 - flap); ctx2d.lineTo(8, 0);
    ctx2d.fill();
    ctx2d.fillStyle = c('#f0ead8'); // white mask
    ctx2d.fillRect(6, -5, 8, 6);
    ctx2d.fillStyle = c('#c0392b');
    ctx2d.fillRect(9, -3, 3, 2);
    ctx2d.restore();
  },
};

const shadowClone = {
  id: 'shadow-clone',
  name: 'Shadow Gumi',
  minionTier: true,
  stats: { maxHp: 50, speed: 280, jumpVel: jumpVelForHeight(160, GRAVITY), weight: 'light' },
  brain: { mode: 'ground', sight: 340, range: 60, windup: 0.2, recover: 0.5, leash: 600 },
  palette: { skin: '#3a3f52', hair: '#171a26', top: '#232838', bottom: '#1a1f2c', accent: '#33405c' },
  hairStyle: 'hedgehog',
  basic: {
    cooldown: 0.6,
    onUse(ctx) {
      ctx.melee({ damage: 4, w: 46, h: 34, kx: 160, ky: 90, hitstun: 0.15, tag: 'pet' });
    },
  },
};

function spawnPet(ctx, type, buffed = false) {
  const f = ctx.f;
  const def = type === 'dog' ? divineDog : nue;
  const opts = buffed ? { hpMult: 2 } : {};
  const pet = ctx.spawnAlly(def, f.cx + f.facing * 30, f.y + (type === 'nue' ? -40 : 20), opts);
  if (buffed) pet.cooldownMult = 0.5;
  effects.burst(pet.cx, pet.cy, '#33405c', 10);
  return pet;
}

export default {
  id: 'megumi',
  name: 'Gumi Shadowhound',
  series: 'JJK',
  unlockLevel: 3,
  stats: { maxHp: 120, speed: 290, jumpVel: jumpVelForHeight(165, GRAVITY), weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#171d2b', top: '#25304a', bottom: '#1c2438', accent: '#33405c' },
  hairStyle: 'hedgehog',
  ai: { type: 'summoner', band: 240, useSpecial: true },
  moves: [
    { name: 'Divine Dog Lunge', desc: 'Commands your shikigami to bite (or a shadow slash if none).' },
    { name: 'Shikigami (L)', desc: 'Toggle between Divine Dog (melee) and Nue (dive bomber).' },
  ],

  basic: {
    name: 'Divine Dog Lunge',
    cooldown: 0.45,
    onUse(ctx) {
      const f = ctx.f;
      const pet = f.mem.pet;
      if (pet?.alive && pet.team === f.team) {
        const target = ctx.world.nearestOpposing(pet, 220);
        if (target) {
          pet.orders.lungeTarget = target;
          pet.orders.lungeDamage = 6;
          return;
        }
      }
      ctx.melee({ damage: 5, w: 46, h: 34, kx: 180, ky: 100, hitstun: 0.18 });
      effects.slash(f.cx, f.cy - 14, f.cx + f.facing * 52, f.cy + 8, '#33405c');
    },
  },

  special: {
    name: 'Shikigami Toggle',
    cooldown: 0.5,
    // Shadow blink — only while Chimera Shadow Garden is open
    onDoubleTap(ctx, dir) {
      const f = ctx.f;
      if (!f.mem.domainBlink) return;
      if ((f.mem.blinkCd ?? 0) > ctx.world.time) return;
      f.mem.blinkCd = ctx.world.time + 0.5;
      effects.ghost({ x: f.x, y: f.y, w: f.w, h: f.h, color: '#33405c' });
      ctx.blink(120 * dir);
    },
    onUse(ctx) {
      const f = ctx.f;
      if ((f.mem.petLock ?? 0) > ctx.world.time) {
        ctx.toast('SHIKIGAMI RECOVERING...');
        return;
      }
      const next = f.mem.petType === 'dog' ? 'nue' : 'dog';
      if (f.mem.pet?.alive) {
        f.mem.pet.alive = false;
        ctx.world.onFighterDeath?.(f.mem.pet, null, { silent: true });
        effects.burst(f.mem.pet.cx, f.mem.pet.cy, '#33405c', 8);
      } else if (f.mem.petDied) {
        if (f.energy < 10) { ctx.toast('NEED 10 ENERGY TO RESUMMON'); return; }
        f.energy -= 10;
        f.mem.petDied = false;
      }
      f.mem.petType = next;
      f.mem.pet = spawnPet(ctx, next);
    },
  },

  super: {
    name: 'Nue: Thunder Dive',
    cost: 30,
    cooldown: 1.4,
    desc: 'Nue crashes down on the target: 25 dmg + shock stun, chain sparks nearby.',
    onUse(ctx) {
      const f = ctx.f;
      const target = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(500);
      const tx = target ? target.cx : f.cx + f.facing * 160;
      const ty = target ? target.cy : f.cy;
      effects.slash(tx - 30, ty - 120, tx, ty, '#ffe066');
      ctx.schedule(0.35, () => {
        ctx.melee({
          damage: 25, w: 150, h: 150, fixedX: tx, fixedY: ty, tag: 'super',
          kx: 200, ky: 260, hitstun: 0.4,
          status: { name: 'stun', dur: 1 },
        });
        effects.burst(tx, ty, ['#ffe066', '#fff8d0'], 16, { speed: 300 });
        effects.ring(tx, ty, '#ffe066', 100, 0.4);
        ctx.world.camera?.shake(7, 0.3);
        for (const e of ctx.enemies()) {
          if (e.cx === tx || dist(e.cx, e.cy, tx, ty) > 200 || dist(e.cx, e.cy, tx, ty) < 80) continue;
          e.receiveHit({ damage: 5 * f.dmgMult, kx: 60, ky: 60, hitstun: 0.15, isMelee: false, tag: 'super' }, f, ctx.world);
          effects.slash(tx, ty, e.cx, e.cy, '#ffe066');
        }
      });
    },
  },

  tech: {
    name: 'Toad: Tongue Lash',
    cost: 15,
    cooldown: 5,
    desc: 'A shadow toad yanks the target straight to you.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 8, w: 190, h: 36, ox: 100, kx: 320, ky: 40, hitstun: 0.35, pullTo: true });
      effects.slash(f.cx + f.facing * 10, f.cy, f.cx + f.facing * 190, f.cy, '#6a9a5c');
      effects.burst(f.cx + f.facing * 24, f.y + f.h - 8, '#6a9a5c', 6, { speed: 100 });
    },
  },

  ultra: {
    name: 'Max Elephant',
    cost: 25,
    cooldown: 8,
    desc: 'Drop a shadow elephant on the target — heavy splash + slowing flood.',
    onUse(ctx) {
      const f = ctx.f;
      const target = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(450);
      const tx = target ? target.cx : f.cx + f.facing * 140;
      const ty = target ? target.y + target.h : f.y + f.h;
      ctx.schedule(0.4, () => {
        ctx.melee({
          damage: 18, w: 200, h: 150, fixedX: tx, fixedY: ty - 70, tag: 'super',
          kx: 220, ky: 180, hitstun: 0.5,
          status: { name: 'slow', dur: 2, params: { factor: 0.6 } },
        });
        ctx.world.addHazard(new Hazard({
          x: tx - 90, y: ty - 10, w: 180, h: 12, type: 'splat',
          damage: 2, interval: 0.6, life: 1.6, color: '#4a6ab8', team: f.team,
        }));
        effects.burst(tx, ty - 40, ['#33405c', '#6a86c8'], 22, { speed: 300 });
        effects.ring(tx, ty - 20, '#6a86c8', 110, 0.45);
        ctx.world.camera?.shake(9, 0.35);
      });
      effects.toast('WITH THIS TREASURE I SUMMON...');
    },
  },

  domain: {
    name: 'Chimera Shadow Garden',
    rank: 1,
    duration: 10,
    color: '#5b6ee1',
    desc: 'Floods the floor with shadow: grounded enemies drain, every shikigami fights at once.',
    onStart(ctx) {
      const f = ctx.f;
      ctx.mem.units = [];
      const dog = spawnPet(ctx, 'dog', true);
      const bird = spawnPet(ctx, 'nue', true);
      const clone = ctx.spawnAlly(shadowClone, f.cx - f.facing * 40, f.y);
      ctx.mem.units.push(dog, bird, clone);
      ctx.mem.acc = 0;
    },
    onTick(ctx, dt) {
      ctx.mem.acc += dt;
      if (ctx.mem.acc >= 0.5) {
        ctx.mem.acc -= 0.5;
        for (const e of ctx.enemies()) {
          if (!e.onGround) continue;
          e.receiveHit(
            { damage: 2, kx: 0, ky: 0, hitstun: 0, isMelee: false, soul: true, domainTick: true, bypassesBarrier: true, tag: 'domain' },
            ctx.f, ctx.world,
          );
        }
      }
    },
    onEnd(ctx) {
      for (const u of ctx.mem.units ?? []) {
        if (u.alive && u !== ctx.f.mem.pet) u.despawnT = 0.1;
      }
    },
    drawOverlay(ctx2d, d) {
      ctx2d.fillStyle = 'rgba(30,34,80,0.35)';
      ctx2d.fillRect(0, 0, 960, 540);
      // liquid shadow floor
      const g = ctx2d.createLinearGradient(0, 380, 0, 540);
      g.addColorStop(0, 'rgba(10,12,30,0)');
      g.addColorStop(1, 'rgba(8,10,24,0.85)');
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 380, 960, 160);
      // crescent moon
      ctx2d.fillStyle = 'rgba(240,240,255,0.7)';
      ctx2d.beginPath();
      ctx2d.arc(820, 90, 34, 0, Math.PI * 2);
      ctx2d.fill();
      ctx2d.fillStyle = 'rgba(30,34,80,0.9)';
      ctx2d.beginPath();
      ctx2d.arc(834, 82, 30, 0, Math.PI * 2);
      ctx2d.fill();
    },
  },

  hooks: {
    onUpdate(ctx) {
      const f = ctx.f;
      if (!f.mem.petType) f.mem.petType = 'dog';
      // a converted (stolen) shikigami is no longer ours — disown it, no lockout
      if (f.mem.pet?.alive && f.mem.pet.team !== f.team) f.mem.pet = null;
      if (f.mem.pet && !f.mem.pet.alive && !f.mem.petDied && !f.mem.pet.absorbed) {
        f.mem.petDied = true;
        f.mem.petLock = ctx.world.time + 5;
        f.mem.pet = null;
      }
      // free shadow blink while own domain is active
      f.mem.domainBlink = ctx.world.activeDomain?.owner === f;
    },
  },

  drawExtras(ctx2d, f, c) {
    // shadow puddle at his feet
    ctx2d.fillStyle = c('rgba(20,24,44,0.6)');
    ctx2d.beginPath();
    ctx2d.ellipse(0, -1, 17, 4, 0, 0, Math.PI * 2);
    ctx2d.fill();
  },
};
