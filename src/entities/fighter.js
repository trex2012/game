import { Entity } from './entity.js';
import { Hitbox } from './hitbox.js';
import { Projectile } from './projectile.js';
import { stepPhysics, collidesSolid } from '../engine/physics.js';
import { effects } from '../engine/effects.js';
import {
  ENERGY_MAX, DOMAIN_MAX, WEIGHT_KB, IFRAMES,
  GROUND_ACCEL, AIR_ACCEL, GROUND_FRICTION, AIR_FRICTION,
  HITSTOP_LIGHT, HITSTOP_HEAVY, HITSTOP_SUPER,
} from '../engine/constants.js';
import { clamp, sign } from '../engine/utils.js';
import { drawFighter } from './chibi.js';
import { audio } from '../engine/audio.js';

const SIMPLE_DOMAIN_COST = 50;
const SIMPLE_DOMAIN_TIME = 4;

export class Fighter extends Entity {
  constructor(def, x, y, team, opts = {}) {
    super(x, y, def.size?.w ?? 34, def.size?.h ?? 54);
    this.def = def;
    this.team = team;
    this.stats = { ...def.stats };
    this.hpMult = opts.hpMult ?? 1;
    this.dmgMult = opts.dmgMult ?? 1;
    this.hp = this.maxHp;
    this.energy = 0;
    this.domainCharge = 0;
    this.cooldowns = { basic: 0, super: 0, special: 0, ultra: 0, tech: 0 };
    this.statuses = {};
    this.buffs = {};
    this.mem = {};
    this.facing = opts.facing ?? 1;
    this.moveDir = 0;
    this.hitstun = 0;
    this.invuln = 0;
    this.lockT = 0;       // casting lock (no movement/actions)
    this.tellT = 0;       // vulnerable windup (takes double damage)
    this.attackT = 0;
    this.flash = 0;
    this.animT = Math.random() * 10;
    this.squashT = 0;
    this.squashDir = 0;
    this.dashT = 0;
    this.simpleDomainT = 0;
    this.powerStolenT = 0; // AFO stole this fighter's power
    this.kbOutMult = 1;
    this.minionTier = def.minionTier ?? false;
    this.isBoss = opts.isBoss ?? false;
    this.converted = false;
    this.convertT = 0;
    this.despawnT = opts.despawnT ?? 0;
    this.ownerId = opts.ownerId ?? null;
    this.world = null;
    this.abilityCtx = null;
    this.lastHitBy = null;
  }

  get maxHp() {
    return Math.round(this.stats.maxHp * this.hpMult);
  }

  get name() {
    return this.def.name;
  }

  // ---- ability context ------------------------------------------------

  get ctx() {
    if (!this.abilityCtx) this.abilityCtx = this.buildCtx();
    return this.abilityCtx;
  }

  buildCtx() {
    const f = this;
    return {
      f,
      get world() { return f.world; },
      effects,
      melee: (o) => f.world.addHitbox(new Hitbox(f, { ...o, damage: (o.damage ?? 5) * f.dmgMult })),
      projectile: (o) => f.world.spawnProjectile(new Projectile(f, { ...o, damage: (o.damage ?? 6) * f.dmgMult })),
      enemies: () => f.world.opposing(f),
      allies: () => f.world.alliesOf(f),
      nearestEnemy: (maxDist = 1e9) => f.world.nearestOpposing(f, maxDist),
      applyStatus: (target, name, dur, params = {}) => target.applyStatus(name, dur, { ...params, src: f }),
      spawnAlly: (mdef, x, y, opts = {}) => f.world.spawnAlly(f, mdef, x, y, opts),
      schedule: (delay, fn) => f.world.schedule(delay, fn),
      delayedHit: (target, dmg, delay, opts = {}) =>
        f.world.schedule(delay, () => {
          if (!target.alive || !f.alive) return;
          target.receiveHit(
            { damage: dmg * f.dmgMult, kx: 0, ky: 0, hitstun: 0.1, isMelee: false, tag: 'delayed', ...opts },
            f, f.world,
          );
        }),
      windup: (time, fn, opts = {}) => {
        f.lockT = Math.max(f.lockT, time);
        if (opts.tell) f.tellT = Math.max(f.tellT, time);
        f.world.schedule(time, () => { if (f.alive) fn(); });
      },
      dash: (dist, time) => {
        f.vx = (f.facing * dist) / time;
        f.dashT = time;
      },
      blink: (dx) => f.blinkBy(dx),
      heal: (n) => { f.hp = Math.min(f.maxHp, f.hp + n); },
      toast: (txt) => effects.toast(txt),
      buffSpeed: (mult, dur) => { f.buffs.speed = { mult, t: dur }; },
    };
  }

  // ---- meters ----------------------------------------------------------

  gainEnergy(amount, kind = 'dealt') {
    let mult = kind === 'dealt' ? this.def.energyDealtMult ?? 1 : this.def.energyTakenMult ?? 1;
    if (this.statuses.energyHalf) mult *= 0.5;
    this.energy = clamp(this.energy + amount * mult, 0, ENERGY_MAX);
  }

  gainDomain(amount) {
    const levelMult = this.world?.level?.domainChargeMult ?? 1; // Curse Nest: 3x
    this.domainCharge = clamp(this.domainCharge + amount * levelMult, 0, DOMAIN_MAX);
  }

  // ---- statuses --------------------------------------------------------

  applyStatus(name, dur, params = {}) {
    if (!this.alive) return;
    if (this.def.immunities?.includes(name)) return;
    if (params.domain && this.simpleDomainT > 0) return; // Simple Domain blocks domain CC
    const s = this.statuses;
    if (name === 'burn') {
      s.burn = { t: dur, dps: params.dps ?? 5, src: params.src, acc: 0 };
    } else if (name === 'decay') {
      if (s.decay) {
        s.decay.stacks = Math.min(3, s.decay.stacks + 1);
        s.decay.t = dur;
      } else {
        s.decay = { t: dur, stacks: 1, src: params.src, acc: 0 };
      }
    } else if (name === 'slow') {
      s.slow = { t: dur, factor: params.factor ?? 0.8 };
    } else if (name === 'stun') {
      s.stun = { t: dur };
    } else if (name === 'frozen') {
      s.frozen = { t: dur, vulnMult: params.vulnMult ?? 1.5, domain: params.domain ?? false };
      this.vx = 0;
      this.vy = 0;
      this.gravityOff = true;
    } else if (name === 'energyHalf') {
      s.energyHalf = { t: dur };
    }
  }

  updateStatuses(dt) {
    const s = this.statuses;
    for (const name of Object.keys(s)) {
      const st = s[name];
      st.t -= dt;
      if ((name === 'burn' || name === 'decay') && st.t > 0) {
        st.acc += dt;
        if (st.acc >= 1) {
          st.acc -= 1;
          const dmg = name === 'burn' ? st.dps : st.stacks * 2;
          this.applyDot(dmg, st.src, name === 'burn' ? '#ff9944' : '#a89890');
        }
      }
      if (st.t <= 0) {
        if (name === 'frozen') this.gravityOff = false;
        delete s[name];
      }
    }
    if (this.buffs.speed) {
      this.buffs.speed.t -= dt;
      if (this.buffs.speed.t <= 0) delete this.buffs.speed;
    }
  }

  applyDot(dmg, src, color = '#ff9944') {
    if (!this.alive) return;
    dmg = Math.max(1, Math.round(dmg));
    this.hp -= dmg;
    effects.number(this.cx, this.y - 6, dmg, color);
    src?.gainEnergy(dmg / 4, 'dealt');
    this.lastHitBy = src ?? this.lastHitBy;
    if (this.hp <= 0) this.die(this.world, src);
  }

  canAct() {
    return this.alive && this.hitstun <= 0 && this.lockT <= 0 && !this.statuses.stun && !this.statuses.frozen;
  }

  speedMult() {
    let m = 1;
    if (this.statuses.slow) m *= this.statuses.slow.factor;
    if (this.buffs.speed) m *= this.buffs.speed.mult;
    return m;
  }

  // ---- abilities -------------------------------------------------------

  tryBasic() {
    if (!this.canAct() || this.cooldowns.basic > 0) return false;
    this.cooldowns.basic = this.def.basic.cooldown ?? 0.35;
    this.attackT = 0.22;
    this.mem.hasAttacked = true;
    this.def.basic.onUse(this.ctx);
    return true;
  }

  trySuper() {
    if (!this.canAct() || this.cooldowns.super > 0) return false;
    if (this.powerStolenT > 0 && !this.def.stealImmuneSuper) {
      if (this === this.world?.player) effects.toast('YOUR POWER IS STOLEN!');
      return false;
    }
    const cost = (this.def.super.cost ?? 30) * (this.def.superCostMult ?? 1);
    if (this.energy < cost) {
      if (this === this.world?.player) effects.toast('NOT ENOUGH ENERGY');
      return false;
    }
    this.energy -= cost;
    this.cooldowns.super = this.def.super.cooldown ?? 1;
    this.attackT = 0.3;
    audio.sfx('super');
    audio.say(this.def.super.name, this.def.id);
    this.def.super.onUse(this.ctx);
    return true;
  }

  trySpecial() {
    if (!this.def.special || !this.canAct() || this.cooldowns.special > 0) return false;
    if (this.powerStolenT > 0) return false;
    this.cooldowns.special = this.def.special.cooldown ?? 0.3;
    this.def.special.onUse(this.ctx);
    return true;
  }

  // H key — every character's signature tech move.
  tryUltra() {
    if (!this.def.ultra || !this.canAct() || this.cooldowns.ultra > 0) return false;
    if (this.powerStolenT > 0) return false;
    const cost = this.def.ultra.cost ?? 0;
    if (cost > 0 && this.energy < cost) {
      if (this === this.world?.player) effects.toast('NOT ENOUGH ENERGY');
      return false;
    }
    this.energy -= cost;
    this.cooldowns.ultra = this.def.ultra.cooldown ?? 1;
    this.attackT = 0.3;
    audio.say(this.def.ultra.name, this.def.id, { interrupt: false });
    this.def.ultra.onUse(this.ctx);
    return true;
  }

  // I key — a second tech move (Mahito's Body Repel and friends).
  tryTech() {
    if (!this.def.tech || !this.canAct() || this.cooldowns.tech > 0) return false;
    if (this.powerStolenT > 0) return false;
    const cost = this.def.tech.cost ?? 0;
    if (cost > 0 && this.energy < cost) {
      if (this === this.world?.player) effects.toast('NOT ENOUGH ENERGY');
      return false;
    }
    this.energy -= cost;
    this.cooldowns.tech = this.def.tech.cooldown ?? 1;
    this.attackT = 0.25;
    audio.say(this.def.tech.name, this.def.id, { interrupt: false });
    this.def.tech.onUse(this.ctx);
    return true;
  }

  // R key: own domain expansion, or Simple Domain against an enemy domain.
  pressDomain() {
    const world = this.world;
    if (!this.alive) return;
    const enemyDomain = world.activeDomain && world.activeDomain.owner.team !== this.team;

    if (this.def.domain && this.domainCharge >= DOMAIN_MAX && this.powerStolenT <= 0 && this.canAct()) {
      world.castDomain(this);
      return;
    }

    if (enemyDomain) {
      if (this.simpleDomainT > 0) return;
      if (this.domainCharge >= SIMPLE_DOMAIN_COST) {
        this.domainCharge -= SIMPLE_DOMAIN_COST;
        this.simpleDomainT = SIMPLE_DOMAIN_TIME;
        // Breaking out of a domain freeze is the whole point of Simple Domain.
        if (this.statuses.frozen?.domain) {
          delete this.statuses.frozen;
          this.gravityOff = false;
        }
        effects.showBanner('SIMPLE DOMAIN', '#e8f4ff', 'NEW SHADOW STYLE', 1.1);
        effects.ring(this.cx, this.cy, '#ffffff', 60, 0.4);
        audio.sfx('confirm');
        audio.say('New Shadow Style: Simple Domain!', this.def.id);
      } else if (this === world.player) {
        effects.toast(`NEED ${SIMPLE_DOMAIN_COST} DOMAIN GAUGE FOR SIMPLE DOMAIN`);
      }
      return;
    }

    if (this === world.player) {
      if (!this.def.domain) effects.toast('NO DOMAIN — CHARGE GAUGE TO COUNTER ENEMY DOMAINS');
      else if (this.domainCharge < DOMAIN_MAX) effects.toast('DOMAIN NOT CHARGED');
    }
  }

  // ---- damage ----------------------------------------------------------

  receiveHit(hit, source, world) {
    if (!this.alive) return false;
    // super/delayed hits pierce post-hit i-frames so multi-hit barrages connect
    // fully; barrier-bypassing attacks (Toji) cut through dodge i-frames too —
    // you cannot blink away from the Sorcerer Killer.
    if (this.invuln > 0 && !hit.domainTick && !hit.bypassesBarrier && hit.tag !== 'super' && hit.tag !== 'delayed') return false;
    hit = { ...hit };

    // Simple Domain bypasses a domain's guaranteed hits entirely.
    if (hit.domainTick && this.simpleDomainT > 0) {
      effects.ring(this.cx, this.cy, '#ffffff', 40, 0.2);
      return false;
    }

    if (this.def.hooks?.onIncomingHit) {
      if (this.def.hooks.onIncomingHit(this.ctx, hit, source) === false) {
        effects.burst(this.cx + this.facing * -14, this.cy, '#9fd8ff', 5, { speed: 120 });
        return false;
      }
    }

    if (hit.domainTick && this.def.domainResist) hit.damage *= this.def.domainResist;

    let dmg = hit.damage;
    if (this.statuses.frozen) dmg *= this.statuses.frozen.vulnMult;
    if (this.tellT > 0) dmg *= 2;
    dmg = Math.max(1, Math.round(dmg));

    const armored = this.def.armor && !hit.soul && hit.damage < this.def.armor;

    this.hp -= dmg;
    this.flash = 0.08;
    this.lastHitBy = source ?? this.lastHitBy;
    if ((hit.isMelee || hit.tag === 'projectile') && hit.tag !== 'super') this.invuln = IFRAMES;

    if (!armored && !hit.soul) {
      let dir = source ? sign(this.cx - source.cx) : this.facing * -1;
      if (hit.pullTo) dir = -dir;
      const kb = WEIGHT_KB[this.stats.weight ?? 'medium'] * (source?.kbOutMult ?? 1);
      if (hit.kx) this.vx = dir * hit.kx * kb;
      if (hit.ky) this.vy = -hit.ky * kb;
      this.hitstun = Math.max(this.hitstun, hit.hitstun ?? 0);
      if (this.hitstun > 0) this.dashT = 0;
    }

    if (hit.status) this.applyStatus(hit.status.name, hit.status.dur, { ...hit.status.params, src: source });

    this.gainEnergy(dmg / 2, 'taken');
    if (source) {
      source.gainEnergy(dmg / 2, 'dealt');
      // player fills at ~200 damage dealt; AI keeps the slower ~400 rate
      source.gainDomain(source === world.player ? dmg / 2 : dmg / 4);
    }

    // juice
    if (!hit.domainTick && hit.tag !== 'hazard') {
      const stop = hit.tag === 'super' || dmg >= 25 ? HITSTOP_SUPER : dmg >= 12 ? HITSTOP_HEAVY : HITSTOP_LIGHT;
      effects.hitPause(hit.crit ? HITSTOP_HEAVY : stop);
      if (dmg >= 12) world.camera?.shake(dmg >= 25 ? 8 : 4, 0.2);
      audio.sfx(dmg >= 12 || hit.crit ? 'heavy' : 'hit');
    }
    effects.burst(this.cx, this.cy - 8, hit.crit ? ['#111', '#ff2244'] : '#fff', hit.crit ? 14 : 6);
    effects.number(this.cx, this.y - 4, dmg, hit.crit ? '#ff2244' : hit.domainTick ? '#c58fff' : hit.tag === 'super' ? '#ff9944' : '#ffe066');

    if (source?.def?.hooks?.onDealHit) source.def.hooks.onDealHit(source.ctx, this, hit);
    if (source === world.player) world.registerCombo();

    if (this.hp <= 0) this.die(world, source);
    else if (this.hurtHook) this.hurtHook(hit, source);
    if (this.def.hooks?.onHurt && this.alive) this.def.hooks.onHurt(this.ctx, hit, source);
    return true;
  }

  die(world, source) {
    if (!this.alive) return;
    this.alive = false;
    this.hp = 0;
    effects.burst(this.cx, this.cy, this.minionTier ? '#9b59b6' : '#fff', 14, { speed: 260 });
    audio.sfx(this.minionTier ? 'hit' : 'ko');
    source?.def?.hooks?.onKill?.(source.ctx, this);
    world?.onFighterDeath?.(this, source);
  }

  dispel() {
    this.mem.limitless = 0;
    delete this.buffs.speed;
  }

  blinkBy(dx) {
    const world = this.world;
    const level = world.level;
    let nx = clamp(this.x + dx, world.boundsMin, world.boundsMax - this.w);
    const step = 8 * -sign(dx);
    let guard = 0;
    while (collidesSolid(level, nx, this.y, this.w, this.h) && guard++ < 40) nx += step;
    this.x = nx;
  }

  // ---- per-step update -------------------------------------------------

  control(dt) {} // overridden by player / AI subclasses

  update(dt, world) {
    this.animT += dt;
    for (const k of Object.keys(this.cooldowns)) this.cooldowns[k] = Math.max(0, this.cooldowns[k] - dt);
    this.hitstun = Math.max(0, this.hitstun - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.lockT = Math.max(0, this.lockT - dt);
    this.tellT = Math.max(0, this.tellT - dt);
    this.attackT = Math.max(0, this.attackT - dt);
    this.flash = Math.max(0, this.flash - dt);
    this.squashT = Math.max(0, this.squashT - dt);
    this.dashT = Math.max(0, this.dashT - dt);
    this.dropTimer = Math.max(0, this.dropTimer - dt);
    this.simpleDomainT = Math.max(0, this.simpleDomainT - dt);
    this.powerStolenT = Math.max(0, this.powerStolenT - dt);
    this.updateStatuses(dt);

    if (this.despawnT > 0) {
      this.despawnT -= dt;
      if (this.despawnT <= 0) {
        this.alive = false;
        effects.burst(this.cx, this.cy, '#9b59b6', 10);
        world.onFighterDeath?.(this, null, { silent: true });
        return;
      }
    }
    if (this.convertT > 0) {
      this.convertT -= dt;
      if (this.convertT <= 0) this.die(world, null); // transfigured soul collapses
    }

    this.moveDir = 0;
    if (this.alive) this.control(dt, world);
    this.def.hooks?.onUpdate?.(this.ctx, dt);

    // movement: accelerate toward moveDir, friction when idle; scripted
    // dashes and knockback (hitstun) skip steering.
    if (this.statuses.frozen) {
      this.vx = 0;
      this.vy = 0;
    } else if (this.dashT <= 0) {
      const wantsMove = this.canAct() && this.moveDir !== 0;
      if (wantsMove) {
        const accel = this.onGround ? GROUND_ACCEL : AIR_ACCEL;
        const target = this.moveDir * this.stats.speed * this.speedMult();
        this.vx = this.vx < target
          ? Math.min(target, this.vx + accel * dt)
          : Math.max(target, this.vx - accel * dt);
      } else {
        const fr = (this.onGround ? GROUND_FRICTION : AIR_FRICTION) * (this.hitstun > 0 ? 0.35 : 1);
        if (this.vx > 0) this.vx = Math.max(0, this.vx - fr * dt);
        else this.vx = Math.min(0, this.vx + fr * dt);
      }
    }

    if (!this.flying) {
      const wasGrounded = this.onGround;
      stepPhysics(this, world.level, dt, world);
      if (!wasGrounded && this.onGround) {
        this.squashT = 0.08;
        this.squashDir = 1;
        effects.burst(this.cx, this.y + this.h, '#d8cdb8', 3, { speed: 70, up: 20, life: 0.3 });
      }
    } else {
      // flying entities integrate directly (their brain sets velocity)
      this.x += this.vx * dt;
      this.y += this.vy * dt;
    }
  }

  jump() {
    this.vy = -this.stats.jumpVel;
    this.squashT = 0.08;
    this.squashDir = -1;
    if (this === this.world?.player) audio.sfx('jump');
  }

  draw(ctx) {
    // soft shadow
    if (!this.flying) {
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(this.cx, this.y + this.h - 1, this.w * 0.45, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    if (this.def.draw) {
      this.def.draw(ctx, this);
    } else {
      drawFighter(ctx, this);
    }
    // tiny HP bar over damaged non-player fighters
    if (this.alive && this !== this.world?.player && this.hp < this.maxHp) {
      const w = 26;
      ctx.fillStyle = 'rgba(0,0,0,0.6)';
      ctx.fillRect(this.cx - w / 2, this.y - 10, w, 4);
      ctx.fillStyle = this.team === 'player' ? '#6fe3a0' : '#ff5566';
      ctx.fillRect(this.cx - w / 2, this.y - 10, w * Math.max(0, this.hp / this.maxHp), 4);
    }
  }
}
