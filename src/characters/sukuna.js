import { jumpVelForHeight, rand } from '../engine/utils.js';
import { GRAVITY, W, H } from '../engine/constants.js';
import { effects } from '../engine/effects.js';
import { Hazard } from '../entities/hazard.js';

export default {
  id: 'sukuna',
  name: 'Sookuna Curse King',
  series: 'JJK',
  unlockLevel: 1, // the King of Curses bows to no unlock gate — starter by request
  stats: { maxHp: 190, speed: 300, jumpVel: jumpVelForHeight(170, GRAVITY), weight: 'heavy' },
  palette: { skin: '#f0cba0', hair: '#e07a7a', top: '#e8e0d0', bottom: '#5a4a3a', accent: '#2a2a2a' },
  hairStyle: 'spiky',
  energyDealtMult: 1.25, // King of Curses
  ai: { type: 'zoner', band: 220 },
  moves: [
    { name: 'Dismantle', desc: 'Instant invisible slash out to 250px.' },
  ],

  basic: {
    name: 'Dismantle',
    cooldown: 0.4,
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 8, w: 250, h: 16, ox: 130, kx: 160, ky: 60, hitstun: 0.22, life: 0.06 });
      effects.slash(f.cx + f.facing * 12, f.cy - 6, f.cx + f.facing * 260, f.cy - 10 + rand(-8, 8), '#fff');
    },
  },

  super: {
    name: 'Open — Fire Arrow (Fuga)',
    cost: 35,
    cooldown: 1.5,
    desc: 'Flaming arrow that detonates: 25 dmg + burns for 5 dmg/s.',
    onUse(ctx) {
      const f = ctx.f;
      const explode = (world, p) => {
        f.ctx.melee({
          damage: 25, w: 180, h: 180, fixedX: p.cx, fixedY: p.cy, life: 0.12, tag: 'super',
          kx: 300, ky: 220, hitstun: 0.5,
          status: { name: 'burn', dur: 5, params: { dps: 5 } },
        });
        effects.burst(p.cx, p.cy, ['#ff6a00', '#ffd166', '#c0392b'], 24, { speed: 340 });
        effects.ring(p.cx, p.cy, '#ff6a00', 90, 0.4);
        world.camera?.shake(7, 0.3);
      };
      ctx.projectile({
        // full payload on the direct hit (arrow + blast + burn); onExpire splashes neighbors
        damage: 35, speed: 600, range: 450, w: 22, h: 8,
        kx: 300, ky: 220, hitstun: 0.5,
        status: { name: 'burn', dur: 5, params: { dps: 5 } },
        color: '#ff6a00', trail: '#ffd166',
        onExpire: explode,
        draw(ctx2d, p) {
          ctx2d.save();
          ctx2d.translate(p.cx, p.cy);
          ctx2d.rotate(Math.atan2(p.vy, p.vx));
          ctx2d.fillStyle = '#1c1c1c';
          ctx2d.fillRect(-11, -1.5, 22, 3);
          ctx2d.fillStyle = '#ff6a00';
          ctx2d.beginPath();
          ctx2d.moveTo(11, 0); ctx2d.lineTo(4, -5); ctx2d.lineTo(4, 5);
          ctx2d.fill();
          ctx2d.restore();
        },
      });
      effects.toast('OPEN.');
    },
  },

  domain: {
    name: 'Malevolent Shrine',
    rank: 3,
    duration: 8,
    color: '#ff2244',
    desc: 'Barrierless slashes rain on everything in the arena — nowhere to hide.',
    onStart(ctx) {
      ctx.mem.acc = 0;
    },
    onTick(ctx, dt, d) {
      ctx.mem.acc += dt;
      if (ctx.mem.acc < 0.5) return;
      ctx.mem.acc -= 0.5;
      if (ctx.asBoss) {
        // boss version: telegraphed slash zones the player can dodge
        const target = ctx.world.player;
        if (!target?.alive) return;
        for (let i = 0; i < 2; i++) {
          const hx = target.cx + rand(-130, 130);
          ctx.world.addHazard(new Hazard({
            x: hx - 30, y: target.y - 60, w: 60, h: 120,
            type: 'slash', damage: 6, telegraph: 0.5, activeTime: 0.15,
            interval: 1, team: ctx.f.team, domainTick: true, kx: 140, ky: 100,
          }));
        }
      } else {
        for (const e of ctx.enemies()) {
          e.receiveHit(
            { damage: 5, kx: 40, ky: 30, hitstun: 0.1, isMelee: false, bypassesBarrier: true, domainTick: true, tag: 'domain' },
            ctx.f, ctx.world,
          );
          effects.slash(e.cx + rand(-20, 20), e.cy - 20, e.cx + rand(-20, 20), e.cy + 20, '#fff');
        }
      }
      // ambient arena slashes
      const camX = ctx.world.camera?.x ?? 0;
      for (let i = 0; i < 3; i++) {
        const x = camX + rand(0, W);
        const y = rand(60, 420);
        effects.slash(x - rand(20, 60), y - rand(10, 40), x + rand(20, 60), y + rand(10, 40), 'rgba(255,255,255,0.5)');
      }
    },
    drawOverlay(ctx2d) {
      ctx2d.fillStyle = 'rgba(80,4,12,0.4)';
      ctx2d.fillRect(0, 0, W, H);
      // shrine silhouette
      ctx2d.fillStyle = 'rgba(12,2,4,0.75)';
      const bx = W / 2;
      ctx2d.beginPath(); // tilted roof
      ctx2d.moveTo(bx - 190, 150);
      ctx2d.lineTo(bx, 70);
      ctx2d.lineTo(bx + 190, 150);
      ctx2d.lineTo(bx + 150, 150);
      ctx2d.lineTo(bx, 100);
      ctx2d.lineTo(bx - 150, 150);
      ctx2d.fill();
      ctx2d.fillRect(bx - 150, 150, 22, 130); // pillars
      ctx2d.fillRect(bx + 128, 150, 22, 130);
      // horns
      ctx2d.beginPath();
      ctx2d.moveTo(bx - 190, 150); ctx2d.lineTo(bx - 215, 96); ctx2d.lineTo(bx - 168, 138);
      ctx2d.moveTo(bx + 190, 150); ctx2d.lineTo(bx + 215, 96); ctx2d.lineTo(bx + 168, 138);
      ctx2d.fill();
      // rippling water line at the floor
      ctx2d.strokeStyle = 'rgba(255,80,90,0.35)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      const t = performance.now() / 400;
      for (let x = 0; x <= W; x += 16) {
        const y = 470 + Math.sin(x / 40 + t) * 4;
        x === 0 ? ctx2d.moveTo(x, y) : ctx2d.lineTo(x, y);
      }
      ctx2d.stroke();
    },
  },

  tech: {
    name: 'Spiderweb',
    cost: 20,
    cooldown: 6,
    desc: 'A cracking web of slashes along the ground that stuns whoever stands on it.',
    onUse(ctx) {
      const f = ctx.f;
      const gy = ctx.world.level.groundY?.(f.cx) ?? 500;
      ctx.melee({
        damage: 10, w: 240, h: 46, fixedX: f.cx + f.facing * 125, fixedY: gy - 20,
        life: 0.14, kx: 140, ky: 160, hitstun: 0.3, tag: 'super',
        status: { name: 'stun', dur: 0.4 },
      });
      for (let i = 0; i < 6; i++) {
        const px = f.cx + f.facing * (30 + i * 38);
        effects.slash(px - 16, gy - 2, px + 16, gy - 26 - (i % 3) * 8, '#fff');
      }
      ctx.world.camera?.shake(4, 0.2);
    },
  },

  ultra: {
    name: 'Cleave',
    cost: 30,
    cooldown: 8,
    desc: 'Adaptive slash storm on the nearest enemy — cuts scale with their remaining health.',
    onUse(ctx) {
      const f = ctx.f;
      const target = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(340);
      if (!target) {
        f.energy = Math.min(100, f.energy + 30); // nothing to cut — refund
        ctx.toast('NO TARGET IN RANGE');
        return;
      }
      const dmg = Math.max(12, Math.round(target.hp * 0.15) + 10);
      for (let i = 0; i < 5; i++) {
        ctx.schedule(i * 0.07, () => {
          if (!target.alive) return;
          effects.slash(target.cx + rand(-34, 34), target.cy - 34, target.cx + rand(-34, 34), target.cy + 34, '#fff');
        });
      }
      ctx.schedule(0.3, () => {
        if (!target.alive) return;
        target.receiveHit(
          { damage: dmg, kx: 260, ky: 160, hitstun: 0.5, isMelee: false, bypassesBarrier: true, tag: 'super' },
          f, ctx.world,
        );
        effects.burst(target.cx, target.cy, '#ff2244', 14, { speed: 240 });
      });
    },
  },

  hooks: {},

  drawExtras(ctx2d, f, c) {
    // face tattoo dashes
    ctx2d.fillStyle = c('#2a2a2a');
    ctx2d.fillRect(1, -44, 4, 1.5);
    ctx2d.fillRect(9, -44, 4, 1.5);
    ctx2d.fillRect(1, -41.5, 4, 1.5);
    ctx2d.fillRect(9, -41.5, 4, 1.5);
    // arm ring markings
    ctx2d.strokeStyle = c('#2a2a2a');
    ctx2d.lineWidth = 1.4;
    ctx2d.beginPath();
    ctx2d.moveTo(-12, -26); ctx2d.lineTo(-8, -26);
    ctx2d.moveTo(9, -26); ctx2d.lineTo(13, -26);
    ctx2d.stroke();
    // rope belt knot
    ctx2d.fillStyle = c('#2a2a2a');
    ctx2d.fillRect(-3, -17, 6, 3);
  },
};
