import { jumpVelForHeight, dist } from '../engine/utils.js';
import { GRAVITY, W, H } from '../engine/constants.js';
import { effects } from '../engine/effects.js';

const CONVICT_WINDOW = 8; // seconds the guilty mark lingers for Executioner's Sword

export default {
  id: 'higuruma',
  name: 'Higloomy Lawman',
  series: 'JJK',
  unlockLevel: 13,
  stats: { maxHp: 125, speed: 295, jumpVel: jumpVelForHeight(165, GRAVITY), weight: 'medium' },
  palette: { skin: '#e8d0b0', hair: '#1c1f2a', top: '#20242e', bottom: '#1a1e28', accent: '#c8a84a' },
  hairStyle: 'shaggy',
  ai: { type: 'rushdown', band: 100 },
  moves: [
    { name: 'Gavel Smack', desc: 'Court is in session. Each hit files evidence against the target (up to 5).' },
    { name: 'Judgeman', desc: 'His super tries the target: more evidence = a harsher sentence, and their super is confiscated.' },
  ],

  basic: {
    name: 'Gavel Smack',
    cooldown: 0.36,
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({ damage: 6, w: 52, h: 38, kx: 200, ky: 120, hitstun: 0.22, tag: 'basic' });
      effects.slash(f.cx, f.cy - 18, f.cx + f.facing * 56, f.cy + 4, '#c8a84a');
    },
  },

  super: {
    name: 'Judgeman: Guilty Verdict',
    cost: 30,
    cooldown: 1.3,
    desc: 'Puts the target on trial: 10 dmg +4 per evidence filed, and their super is confiscated for a few seconds.',
    onUse(ctx) {
      const f = ctx.f;
      const target = f.mem.aimTarget?.alive ? f.mem.aimTarget : ctx.nearestEnemy(500);
      if (!target) {
        ctx.toast('NO ONE TO JUDGE');
        return;
      }
      const evidence = Math.min(5, target.mem.evidence ?? 0);
      target.mem.evidence = 0;
      target.mem.convicted = ctx.world.time + CONVICT_WINDOW;
      target.receiveHit(
        { damage: (10 + evidence * 4) * f.dmgMult, kx: 180, ky: 140, hitstun: 0.45, isMelee: false, soul: true, tag: 'super' },
        f, ctx.world,
      );
      if (target.alive) target.powerStolenT = Math.max(target.powerStolenT ?? 0, 3 + evidence * 0.5); // Confiscation
      effects.showBanner('GUILTY', '#c8a84a', evidence > 0 ? `${evidence} COUNTS` : '', 1.1);
      effects.ring(target.cx, target.cy, '#c8a84a', 70, 0.4);
      effects.burst(target.cx, target.cy - 10, ['#c8a84a', '#fff2c8'], 12, { speed: 200 });
      ctx.world.camera?.shake(5, 0.2);
    },
  },

  tech: {
    name: 'Objection!',
    cost: 15,
    cooldown: 6,
    desc: 'A 1.2s legal stance: the next hit is overruled — negated, and the attacker is stunned.',
    onUse(ctx) {
      const f = ctx.f;
      f.mem.objectionT = 1.2;
      effects.ring(f.cx, f.cy, '#e8e2d4', 46, 0.35);
      if (f === ctx.world.player) effects.toast('OBJECTION!');
    },
  },

  ultra: {
    name: "Executioner's Sword",
    cost: 30,
    cooldown: 8,
    desc: 'The sentence is carried out — 18 dmg, doubled against anyone convicted by Judgeman.',
    onUse(ctx) {
      const f = ctx.f;
      ctx.melee({
        damage: 18, w: 90, h: 56, ox: 52, kx: 320, ky: 200, hitstun: 0.5, crit: true, tag: 'super',
        onHitTarget: (t) => {
          if ((t.mem.convicted ?? 0) <= ctx.world.time) return;
          t.mem.convicted = 0;
          t.receiveHit(
            { damage: 18 * f.dmgMult, kx: 0, ky: 0, hitstun: 0.2, isMelee: false, soul: true, crit: true, tag: 'super' },
            f, ctx.world,
          );
          effects.showBanner('SENTENCE CARRIED OUT', '#c8a84a', '', 1.2);
          effects.slash(t.cx - 34, t.cy - 34, t.cx + 34, t.cy + 30, '#fff2c8');
        },
      });
      effects.slash(f.cx, f.cy - 28, f.cx + f.facing * 96, f.cy + 16, '#c8ccd4');
    },
  },

  domain: {
    name: 'Deadly Sentencing',
    rank: 2,
    duration: 8,
    color: '#c8a84a',
    desc: 'The courtroom convenes: every 2s all enemies are tried — sure-hit soul damage, drained energy, and a standing conviction.',
    onStart(ctx) {
      ctx.mem.acc = 0;
      for (const e of ctx.enemies()) e.mem.convicted = ctx.world.time + CONVICT_WINDOW;
    },
    onTick(ctx, dt) {
      ctx.mem.acc += dt;
      if (ctx.mem.acc < 2) return;
      ctx.mem.acc -= 2;
      const f = ctx.f;
      for (const e of ctx.enemies()) {
        e.receiveHit(
          { damage: 5 * f.dmgMult, kx: 0, ky: 0, hitstun: 0.15, isMelee: false, soul: true, domainTick: true, tag: 'domain' },
          f, ctx.world,
        );
        if (!e.alive) continue;
        e.energy = Math.max(0, e.energy - 10);
        e.mem.convicted = ctx.world.time + CONVICT_WINDOW;
        effects.slash(e.cx - 16, e.cy - 24, e.cx + 10, e.cy - 4, '#c8a84a');
      }
    },
    drawOverlay(ctx2d) {
      // dark courtroom wood
      const g = ctx2d.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, 'rgba(24,16,8,0.75)');
      g.addColorStop(1, 'rgba(46,30,14,0.6)');
      ctx2d.fillStyle = g;
      ctx2d.fillRect(0, 0, W, H);
      // scales of justice hanging over the court
      ctx2d.strokeStyle = 'rgba(200,168,74,0.8)';
      ctx2d.lineWidth = 2;
      ctx2d.beginPath();
      ctx2d.moveTo(W / 2, 40);
      ctx2d.lineTo(W / 2, 80);
      ctx2d.moveTo(W / 2 - 60, 60);
      ctx2d.lineTo(W / 2 + 60, 60);
      ctx2d.moveTo(W / 2 - 60, 60);
      ctx2d.lineTo(W / 2 - 60, 84);
      ctx2d.moveTo(W / 2 + 60, 60);
      ctx2d.lineTo(W / 2 + 60, 84);
      ctx2d.stroke();
      ctx2d.beginPath();
      ctx2d.arc(W / 2 - 60, 90, 14, Math.PI, 0, true);
      ctx2d.arc(W / 2 + 60, 90, 14, Math.PI, 0, true);
      ctx2d.stroke();
    },
  },

  hooks: {
    onUpdate(ctx, dt) {
      const f = ctx.f;
      f.mem.objectionT = Math.max(0, (f.mem.objectionT ?? 0) - dt);
    },
    onDealHit(ctx, target, hit) {
      if (hit.tag !== 'basic') return;
      target.mem.evidence = Math.min(5, (target.mem.evidence ?? 0) + 1);
      effects.number(target.cx, target.y - 14, target.mem.evidence, '#c8a84a');
    },
    onIncomingHit(ctx, hit, source) {
      const f = ctx.f;
      if ((f.mem.objectionT ?? 0) <= 0) return true;
      if (hit.bypassesBarrier || hit.domainTick || hit.tag === 'hazard' || hit.tag === 'clash') return true;
      f.mem.objectionT = 0; // one hit overruled per stance
      effects.showBanner('OVERRULED', '#e8e2d4', '', 0.9);
      effects.ring(f.cx, f.cy, '#c8a84a', 56, 0.35);
      if (source?.alive && source.receiveHit && dist(source.cx, source.cy, f.cx, f.cy) < 170) {
        ctx.applyStatus(source, 'stun', 0.9);
        source.receiveHit(
          { damage: 8 * f.dmgMult, kx: 160, ky: 100, hitstun: 0.3, isMelee: false, tag: 'super' },
          f, ctx.world,
        );
      }
      return false;
    },
  },

  drawExtras(ctx2d, f, c) {
    // the eye bags of a man who has not slept since passing the bar
    ctx2d.strokeStyle = c('#4a4258');
    ctx2d.lineWidth = 1.4;
    ctx2d.beginPath();
    ctx2d.moveTo(3, -42.5);
    ctx2d.lineTo(6, -41.5);
    ctx2d.moveTo(9, -42.5);
    ctx2d.lineTo(12, -41.5);
    ctx2d.stroke();
    // loosened tie
    ctx2d.fillStyle = c('#5a2e34');
    ctx2d.fillRect(0, -33, 3, 11);
    // gavel at his hip
    ctx2d.fillStyle = c('#8a6d45');
    ctx2d.fillRect(-13, -20, 2.5, 9);
    ctx2d.fillStyle = c('#c8a84a');
    ctx2d.fillRect(-16, -22, 8.5, 4);
  },
};
