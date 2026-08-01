import { Fighter } from './fighter.js';
import { collidesSolid } from '../engine/physics.js';
import { effects } from '../engine/effects.js';
import { rand, dist, sign, rectsOverlap } from '../engine/utils.js';
import { DOMAIN_MAX } from '../engine/constants.js';

// AI-driven fighter. Two brains:
//  - 'minion': small FSM parameterized by def.brain (patrol/chase/windup/attack,
//    plus fly/turret/contact variants). Used by level minions AND allied
//    summons/pets/converts (they simply have team 'player').
//  - 'boss': the roster-character boss FSM, driven by a difficulty row.
export class AIFighter extends Fighter {
  constructor(def, x, y, team, opts = {}) {
    super(def, x, y, team, opts);
    this.brainType = opts.brain ?? (def.minionTier ? 'minion' : 'boss');
    this.difficulty = opts.difficulty ?? null;
    if (this.difficulty) {
      this.dmgMult *= this.difficulty.dmgMult;
    }
    this.owner = opts.owner ?? null; // allied pets/summons follow this fighter
    this.state = this.def.brain?.mode === 'fly' ? 'hover' : this.def.brain?.mode === 'turret' ? 'aim' : 'patrol';
    this.stateT = 0;
    this.patrolDir = Math.random() < 0.5 ? -1 : 1;
    this.anchorX = x;
    this.anchorY = y;
    this.flying = def.brain?.mode === 'fly';
    this.gravityOff = this.flying;
    this.contactCooldown = new Map();
    // boss state
    this.decideT = 0;
    this.bossState = 'idle';
    this.bossStateT = 0;
    this.recentHits = [];
    this.orders = {};
    this.aggroed = opts.aggroed ?? false;
    this.hurtHook = (hit, source) => {
      this.aggroed = true;
      this.recentHits.push(this.animT);
      this.recentHits = this.recentHits.filter((t) => this.animT - t < 2);
    };
  }

  pickTarget(world, maxDist = Infinity) {
    let best = null;
    let bestD = maxDist;
    for (const e of world.opposing(this)) {
      // Toji's Heavenly Restriction: summons don't notice him until he attacks
      if (this.minionTier && e.def.noCursedEnergy && !e.mem.hasAttacked) continue;
      const d = dist(this.cx, this.cy, e.cx, e.cy);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }

  control(dt, world) {
    if (this.statuses.frozen) return;
    if (this.brainType === 'minion') this.minionBrain(dt, world);
    else this.bossBrain(dt, world);
  }

  // ---- minion brain ----------------------------------------------------

  minionBrain(dt, world) {
    const brain = this.def.brain ?? {};
    const sight = brain.sight ?? 300;
    const range = brain.range ?? 60;
    this.stateT += dt;

    // allied units stay near their owner when idle
    const home = this.owner?.alive ? this.owner : null;
    let target = this.pickTarget(world, this.state === 'patrol' || this.state === 'hover' ? sight : sight * 1.6);
    if (home && target && dist(home.cx, home.cy, target.cx, target.cy) > (brain.leash ?? 420)) target = null;

    // contact damage (Wisp, Diver while diving)
    if (this.def.contactDamage && (brain.mode !== 'fly' || this.state === 'dive' || brain.contactAlways)) {
      for (const [f, t] of this.contactCooldown) this.contactCooldown.set(f, t - dt);
      for (const e of world.opposing(this)) {
        if ((this.contactCooldown.get(e) ?? 0) > 0) continue;
        if (!rectsOverlap(this.rect, e.rect)) continue;
        e.receiveHit(
          { damage: this.def.contactDamage * this.dmgMult, kx: 160, ky: 120, hitstun: 0.2, isMelee: true, tag: 'contact' },
          this, world,
        );
        this.contactCooldown.set(e, 0.8);
      }
    }

    // Megumi's commanded lunge overrides everything
    if (this.orders.lungeTarget?.alive) {
      const t = this.orders.lungeTarget;
      this.facing = sign(t.cx - this.cx);
      this.ctx.dash(120, 0.2);
      this.ctx.melee({ damage: this.orders.lungeDamage ?? 6, w: 46, h: 34, life: 0.2, tag: 'pet' });
      this.orders.lungeTarget = null;
      return;
    }

    const mode = brain.mode ?? 'ground';
    if (mode === 'turret') {
      if (!target) return;
      this.facing = sign(target.cx - this.cx);
      if (this.state === 'aim' && this.stateT > (brain.windup ?? 0.5)) {
        if (this.canAct()) { this.mem.aimTarget = target; this.tryBasic(); }
        this.setState('recover');
      } else if (this.state === 'recover' && this.stateT > (brain.recover ?? 1.6)) {
        this.setState('aim');
      }
      return;
    }

    if (mode === 'fly') {
      if (this.state === 'hover') {
        // figure-8 around anchor, drift home
        const t = this.animT * (brain.hoverSpeed ?? 1.6);
        const hx = (home ? home.cx + (this.mem.slot ?? 40) : this.anchorX) + Math.sin(t) * 50;
        const hy = (home ? home.y - 40 : this.anchorY) + Math.sin(t * 2) * 18;
        this.vx = (hx - this.cx) * 3;
        this.vy = (hy - this.cy) * 3;
        this.facing = this.vx > 0 ? 1 : -1;
        if (target && Math.abs(target.cx - this.cx) < (brain.diveWindow ?? 70) && target.cy > this.cy) {
          this.setState('telegraph');
        }
      } else if (this.state === 'telegraph') {
        this.vx = 0;
        this.vy = 0;
        if (this.stateT > (brain.windup ?? 0.5)) {
          const t2 = target ?? this.pickTarget(world, sight * 2);
          if (t2) {
            const a = Math.atan2(t2.cy - this.cy, t2.cx - this.cx);
            this.vx = Math.cos(a) * (brain.diveSpeed ?? 340);
            this.vy = Math.sin(a) * (brain.diveSpeed ?? 340);
            this.facing = sign(this.vx || 1);
          }
          this.setState('dive');
        }
      } else if (this.state === 'dive') {
        if (this.stateT > 0.6 || this.y + this.h > world.level.groundY(this.cx, this.y) - 4) this.setState('climb');
      } else if (this.state === 'climb') {
        this.vx = (this.anchorX - this.cx) * 1.5;
        this.vy = (this.anchorY - this.cy) * 2;
        if (this.stateT > 1.2) this.setState('hover');
      }
      // wisps just drift into you
      if (brain.contactAlways && target) {
        this.vx = sign(target.cx - this.cx) * (brain.driftSpeed ?? 60);
        this.vy = (target.cy - this.cy) * 0.8 + Math.sin(this.animT * 5) * 30;
        this.facing = sign(this.vx || 1);
      }
      return;
    }

    // ground modes
    if (this.state === 'patrol') {
      if (target) { this.setState('chase'); return; }
      if (brain.patrol !== false) {
        this.moveDir = this.patrolDir * 0.4;
        this.facing = this.patrolDir;
        const aheadX = this.patrolDir > 0 ? this.x + this.w + 6 : this.x - 10;
        const ledge = this.onGround && !collidesSolid(world.level, aheadX, this.y + this.h + 6, 4, 8);
        if ((Math.abs(this.vx) < 5 && this.stateT > 0.4) || ledge) {
          this.patrolDir *= -1;
          this.stateT = 0;
        }
      }
    } else if (this.state === 'chase') {
      if (!target) { this.setState('patrol'); return; }
      this.facing = sign(target.cx - this.cx);
      const d = Math.abs(target.cx - this.cx);
      if (d < range && Math.abs(target.cy - this.cy) < 70) {
        this.setState('windup');
      } else {
        this.moveDir = this.facing;
        if (this.onGround && (target.y + target.h < this.y - 40 || Math.abs(this.vx) < 5) && this.stateT > 0.5 && !this.minionNoJump) {
          if (Math.random() < 0.04) this.jump();
        }
      }
    } else if (this.state === 'windup') {
      this.squashT = 0.1;
      this.squashDir = 1;
      if (this.stateT === this.stateT && this.stateT < 0.05) effects.number(this.cx, this.y - 14, '!', '#ffe066');
      if (this.stateT > (brain.windup ?? 0.4)) {
        if (this.canAct()) {
          this.mem.aimTarget = target;
          this.tryBasic();
        }
        this.setState('recover');
      }
    } else if (this.state === 'recover') {
      if (this.stateT > (brain.recover ?? 0.8)) this.setState(target ? 'chase' : 'patrol');
    }
  }

  setState(s) {
    this.state = s;
    this.stateT = 0;
  }

  // ---- boss brain ------------------------------------------------------

  bossBrain(dt, world) {
    const D = this.difficulty ?? { aggression: 0.5, reactionDelay: 18, cooldown: 35, superChance: 0.4, comboLength: 2 };
    const target = world.player?.alive ? world.player : this.pickTarget(world);
    if (!target) return;
    this.bossStateT += dt;

    // forced one-time domain below 50% HP, with a vulnerable 2s tell.
    // A stolen power (AFO) locks the domain out, and a steal landed during
    // the tell cancels the cast so the boss can retry after it expires.
    if (
      this.def.domain && !this.mem.domainUsed && this.hp < this.maxHp * 0.5 &&
      this.powerStolenT <= 0 && this.canAct() && !world.activeDomainOwnedBy?.(this)
    ) {
      this.mem.domainUsed = true;
      this.domainCharge = DOMAIN_MAX;
      this.tellT = 2;
      this.lockT = 2;
      effects.toast(`${this.def.name.toUpperCase()} IS WEAVING HAND SIGNS...`);
      world.schedule(2, () => {
        if (!this.alive) return;
        if (this.powerStolenT > 0) { this.mem.domainUsed = false; return; }
        world.castDomain(this);
      });
      return;
    }

    // steer every frame toward current intent; decide intent on a slow tick
    this.decideT -= dt;
    const preferMinionTarget =
      this.def.ai?.preferMinions && this.mem.itTimer > 0 ? this.pickMinionTarget(world) : null;
    const tgt = preferMinionTarget ?? target;
    const dx = tgt.cx - this.cx;
    const band = this.def.ai?.band ?? 85;

    if (this.decideT <= 0) {
      this.decideT = D.reactionDelay / 60;
      const phase2 = this.hp < this.maxHp * 0.5;
      const aggression = Math.min(1, D.aggression + (phase2 ? 0.1 : 0));

      if (this.bossState === 'cooldown') {
        if (this.bossStateT > (D.cooldown / 60) * (phase2 ? 0.8 : 1)) this.bossState = 'approach';
      } else if (this.bossState === 'retreat') {
        if (this.bossStateT > rand(0.5, 1.2)) this.bossState = 'approach';
      } else if (this.recentHits.length >= 3 && Math.random() > aggression) {
        this.bossState = 'retreat';
        this.bossStateT = 0;
        this.recentHits = [];
      } else if (Math.abs(dx) <= band + 20) {
        this.bossState = 'attack';
      } else {
        this.bossState = Math.random() < 1 - aggression ? 'feint' : 'approach';
        if (this.bossState === 'feint') this.bossStateT = 0;
      }

      // super usage on its own roll
      if (this.canAct() && this.bossState !== 'retreat' && Math.random() < D.superChance) {
        const cost = (this.def.super.cost ?? 30) * (this.def.superCostMult ?? 1);
        if (this.energy >= cost) {
          this.facing = sign(dx || 1);
          this.mem.aimTarget = tgt;
          this.trySuper();
          this.bossState = 'cooldown';
          this.bossStateT = 0;
          return;
        }
      }
      // summoners keep their special running
      if (this.def.ai?.useSpecial && this.canAct() && Math.random() < 0.5) {
        this.mem.aimTarget = tgt;
        this.trySpecial();
      }
    }

    if (!this.canAct()) return;
    this.facing = sign(dx || 1);

    if (this.bossState === 'attack') {
      if (Math.abs(dx) > band + 40) { this.bossState = 'approach'; }
      else {
        this.mem.aimTarget = tgt;
        const attacked = this.tryBasic();
        if (attacked) {
          this.mem.comboCount = (this.mem.comboCount ?? 0) + 1;
          if (this.mem.comboCount >= D.comboLength) {
            this.mem.comboCount = 0;
            this.bossState = 'cooldown';
            this.bossStateT = 0;
          }
        }
      }
    } else if (this.bossState === 'approach') {
      const zoner = this.def.ai?.type === 'zoner' || this.def.ai?.type === 'summoner';
      if (zoner && Math.abs(dx) < band * 0.6) {
        this.moveDir = -this.facing; // back to preferred range
      } else if (Math.abs(dx) > band) {
        this.moveDir = this.facing;
      }
      if (this.onGround && this.bossStateT > 0.4) {
        if (tgt.y + tgt.h < this.y - 50 || Math.abs(this.vx) < 8) {
          if (Math.random() < 0.06) this.jump();
        }
      }
      this.bossStateT += dt;
    } else if (this.bossState === 'retreat') {
      this.moveDir = -sign(dx || 1);
    }
    // feint/cooldown: stand still (small strafe)
    else if (this.bossState === 'feint' && this.bossStateT > 0.4) {
      this.bossState = 'approach';
    }
  }

  pickMinionTarget(world) {
    let best = null;
    let bestD = 500;
    for (const e of world.opposing(this)) {
      if (!e.minionTier) continue;
      const d = dist(this.cx, this.cy, e.cx, e.cy);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best;
  }
}
