import { effects } from './effects.js';
import { audio } from './audio.js';
import { rectsOverlap, dist } from './utils.js';
import { HITSTOP_SUPER } from './constants.js';
import { AIFighter } from '../entities/aiFighter.js';

// Holds and updates everything inside one level run: fighters (player, enemies,
// allies), projectiles, melee hitboxes, hazards, scheduled events, and the
// single active domain (with clash resolution).
export class World {
  constructor(level, camera) {
    this.level = level;
    if (!level.groundY) {
      // First solid top at or below belowY — the default skips ceiling blocks.
      level.groundY = (x, belowY = 100) => {
        let best = level.height ?? 540;
        for (const s of level.solids) {
          if (x >= s.x && x <= s.x + s.w && s.y >= belowY) best = Math.min(best, s.y);
        }
        return best;
      };
    }
    this.camera = camera;
    this.player = null;
    this.fighters = [];
    this.projectiles = [];
    this.hitboxes = [];
    this.hazards = [];
    this.timers = [];
    this.activeDomain = null;
    this.boundsMin = 0;
    this.boundsMax = level.width;
    this.boss = null;
    this.xpEarned = 0;
    this.combo = 0;
    this.comboT = 0;
    this.time = 0;
  }

  // ---- spawning --------------------------------------------------------

  addFighter(f) {
    f.world = this;
    this.fighters.push(f);
    if (f.team === 'player' && !f.minionTier && !this.player) this.player = f;
    return f;
  }

  spawnAlly(owner, mdef, x, y, opts = {}) {
    const ally = new AIFighter(mdef, x, y, owner.team, { brain: 'minion', owner, ...opts });
    ally.mem.slot = (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 30);
    return this.addFighter(ally);
  }

  spawnProjectile(p) {
    this.projectiles.push(p);
    return p;
  }

  addHitbox(hb) {
    this.hitboxes.push(hb);
    return hb;
  }

  addHazard(h) {
    this.hazards.push(h);
    return h;
  }

  schedule(delay, fn) {
    this.timers.push({ t: delay, fn });
  }

  // ---- queries ---------------------------------------------------------

  opposing(f) {
    const other = f.team === 'player' ? 'enemy' : 'player';
    return this.fighters.filter((e) => e.alive && e.team === other);
  }

  alliesOf(f) {
    return this.fighters.filter((e) => e.alive && e.team === f.team && e !== f);
  }

  nearestOpposing(f, maxDist = Infinity) {
    let best = null;
    let bestD = maxDist;
    for (const e of this.opposing(f)) {
      const d = dist(f.cx, f.cy, e.cx, e.cy);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  activeDomainOwnedBy(f) {
    return this.activeDomain?.owner === f;
  }

  registerCombo() {
    this.combo++;
    this.comboT = 1.5;
  }

  // ---- faction conversion (Mahito) ------------------------------------

  convert(target, newTeam, { duration = Infinity, dmgMult = 1.25, owner = null } = {}) {
    if (!target.alive || !target.minionTier) return false;
    target.team = newTeam;
    target.converted = true;
    if (Number.isFinite(duration)) target.convertT = duration;
    target.dmgMult *= dmgMult;
    target.owner = owner;
    target.orders = {};
    if (target.setState) target.setState(target.flying ? 'hover' : 'patrol');
    effects.burst(target.cx, target.cy, ['#7d8ca3', '#4aa3df'], 12);
    effects.ring(target.cx, target.cy, '#4aa3df', 40, 0.3);
    return true;
  }

  // ---- domains ---------------------------------------------------------

  castDomain(caster) {
    const domainDef = caster.def.domain;
    if (!domainDef) return;
    caster.domainCharge = 0;

    const current = this.activeDomain;
    if (current && current.owner.team !== caster.team) {
      // DOMAIN CLASH — refined domain wins; ties go to the healthier caster.
      const a = current;
      const challenger = { def: domainDef, owner: caster };
      effects.showBanner('DOMAIN CLASH!', '#ffd166', `${a.def.name}  vs  ${domainDef.name}`, 1.8);
      effects.flash(0.25);
      effects.hitPause(20);
      this.camera?.shake(12, 0.5);
      audio.sfx('clash');
      audio.say(`Domain clash! ${domainDef.name}!`, caster.def.id);
      const rankA = a.def.rank ?? 1;
      const rankB = domainDef.rank ?? 1;
      const hpA = a.owner.hp / a.owner.maxHp;
      const hpB = caster.hp / caster.maxHp;
      const winner = rankB > rankA || (rankB === rankA && hpB >= hpA) ? challenger : a;
      const loser = winner === challenger ? a.owner : caster;
      this.endDomain();
      loser.receiveHit(
        { damage: 20, kx: 220, ky: 200, hitstun: 0.4, isMelee: false, soul: true, tag: 'clash' },
        winner.owner === loser ? null : winner.owner, this,
      );
      loser.applyStatus('stun', 1);
      loser.domainCharge = 0;
      if (winner.owner === loser) return; // loser was the challenger: nothing new opens
      this.openDomain(winner.owner, winner.def);
      return;
    }

    if (current) this.endDomain(); // recast on same team replaces
    this.openDomain(caster, domainDef);
  }

  openDomain(caster, domainDef) {
    audio.sfx('domain');
    audio.say(`Domain Expansion: ${domainDef.name}!`, caster.def.id);
    effects.showBanner('DOMAIN EXPANSION', domainDef.color ?? '#c58fff', domainDef.name.toUpperCase(), 1.8);
    effects.flash(0.18);
    effects.hitPause(24);
    effects.ring(caster.cx, caster.cy, domainDef.color ?? '#c58fff', 240, 0.6);
    this.camera?.shake(8, 0.4);
    const dctx = Object.create(caster.ctx);
    dctx.asBoss = caster !== this.player;
    dctx.mem = {};
    this.activeDomain = { def: domainDef, owner: caster, t: domainDef.duration ?? 8, ctx: dctx };
    domainDef.onStart?.(dctx);
  }

  endDomain() {
    if (!this.activeDomain) return;
    this.activeDomain.def.onEnd?.(this.activeDomain.ctx);
    this.activeDomain = null;
  }

  // ---- deaths / xp -----------------------------------------------------

  onFighterDeath(f, source, opts = {}) {
    if (f.minionTier && !opts.silent) {
      const killerTeam = source?.team ?? 'neutral';
      if (killerTeam === 'player' && f.team === 'enemy' && f.def.xp) {
        this.xpEarned += f.def.xp;
        effects.number(f.cx, f.y - 14, `+${f.def.xp} XP`, '#8be9fd');
      }
    }
    if (this.activeDomain?.owner === f) this.endDomain();
  }

  // ---- update ----------------------------------------------------------

  update(dt) {
    this.time += dt;
    this.comboT -= dt;
    if (this.comboT <= 0) this.combo = 0;

    // scheduled events
    for (const timer of this.timers) timer.t -= dt;
    const due = this.timers.filter((t) => t.t <= 0);
    this.timers = this.timers.filter((t) => t.t > 0);
    for (const t of due) t.fn();

    for (const f of this.fighters) if (f.alive) f.update(dt, this);

    // fall-out
    for (const f of this.fighters) {
      if (!f.alive) continue;
      if (f.y > (this.level.height ?? 540) + 120) {
        if (f === this.player) {
          this.playerFellOut = true; // level scene respawns at checkpoint
        } else {
          f.die(this, null);
        }
      }
    }

    for (const p of this.projectiles) if (p.alive) p.update(dt, this);
    for (const h of this.hazards) if (h.alive) h.update(dt, this);

    // melee hitboxes
    for (const hb of this.hitboxes) {
      hb.life -= dt;
      if (!hb.owner.alive) { hb.life = 0; continue; }
      const r = hb.rect;
      for (const f of this.fighters) {
        if (!f.alive || f.team === hb.owner.team || hb.hitSet.has(f)) continue;
        if (!rectsOverlap(r, f.rect)) continue;
        const landed = f.receiveHit(hb.toHit(), hb.owner, this);
        if (landed) hb.hitSet.add(f); // blocked hits may retry while the box lives
        if (landed && hb.onHitTarget) hb.onHitTarget(f, this);
      }
    }
    this.hitboxes = this.hitboxes.filter((hb) => hb.life > 0);

    // projectiles vs fighters and walls
    for (const p of this.projectiles) {
      if (!p.alive) continue;
      // solid collision
      if (this.level.solids.some((s) => rectsOverlap(p.rect, s))) {
        p.alive = false;
        p.onExpire?.(this, p);
        effects.burst(p.cx, p.cy, p.color, 4, { speed: 90 });
        continue;
      }
      if (p.dying > 0) continue;
      for (const f of this.fighters) {
        if (!f.alive || f.team === p.team || p.hitSet.has(f)) continue;
        if (!rectsOverlap(p.rect, f.rect)) continue;
        const landed = f.receiveHit(p.toHit(), p.owner?.alive ? p.owner : null, this);
        if (landed) p.hitSet.add(f);
        if (landed && p.onHitTarget) p.onHitTarget(f, this);
        if (!p.pierce) {
          p.alive = false;
          p.onExpire?.(this, p);
          break;
        }
      }
      if (p.x < -100 || p.x > this.level.width + 100 || p.y > (this.level.height ?? 540) + 100 || p.y < -300) {
        p.alive = false;
      }
    }

    // active domain
    if (this.activeDomain) {
      const d = this.activeDomain;
      d.t -= dt;
      d.def.onTick?.(d.ctx, dt, d);
      if (d.t <= 0 || !d.owner.alive) this.endDomain();
    }

    this.fighters = this.fighters.filter((f) => f.alive || f === this.player || f === this.boss);
    this.projectiles = this.projectiles.filter((p) => p.alive);
    this.hazards = this.hazards.filter((h) => h.alive);
  }

  draw(ctx) {
    for (const h of this.hazards) h.draw(ctx);
    effects.drawWorld(ctx);
    // draw non-player fighters first so the player reads on top
    for (const f of this.fighters) if (f.alive && f !== this.player) f.draw(ctx);
    if (this.player?.alive) this.player.draw(ctx);
    for (const p of this.projectiles) p.draw(ctx);
  }

  // Domain overlay drawn in screen space by the level scene.
  drawDomainOverlay(ctx) {
    const d = this.activeDomain;
    if (!d) return;
    d.def.drawOverlay?.(ctx, d);
  }
}
