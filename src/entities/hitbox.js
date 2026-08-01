// Transient melee attack box. Follows its owner, damages each opposing
// fighter at most once. Resolved by world.update each step.
export class Hitbox {
  constructor(owner, opts) {
    this.owner = owner;
    this.ox = opts.ox ?? (opts.w ?? 50) / 2 + 12; // offset from owner's center, along facing
    this.oy = opts.oy ?? 0;
    this.w = opts.w ?? 50;
    this.h = opts.h ?? 36;
    this.damage = opts.damage ?? 5;
    this.kx = opts.kx ?? 180;
    this.ky = opts.ky ?? 120;
    this.hitstun = opts.hitstun ?? 0.2;
    this.life = opts.life ?? 0.12;
    this.follow = opts.follow ?? true;
    this.bypassesBarrier = opts.bypass ?? false;
    this.soul = opts.soul ?? false;
    this.tag = opts.tag ?? 'basic';
    this.crit = opts.crit ?? false;
    this.status = opts.status ?? null; // {name, dur, params}
    this.onHitTarget = opts.onHitTarget ?? null;
    this.pullTo = opts.pullTo ?? false; // knock target toward owner instead of away
    this.hitSet = new Set();
    this.fixedX = opts.fixedX; // absolute placement (AoE not tied to facing)
    this.fixedY = opts.fixedY;
    this.centered = opts.centered ?? false; // AoE centered on owner
    this.domainTick = opts.domainTick ?? false;
  }

  get rect() {
    if (this.fixedX !== undefined) {
      return { x: this.fixedX - this.w / 2, y: (this.fixedY ?? this.owner.cy) - this.h / 2, w: this.w, h: this.h };
    }
    if (this.centered) {
      return { x: this.owner.cx - this.w / 2, y: this.owner.cy - this.h / 2 + this.oy, w: this.w, h: this.h };
    }
    // ox is the box-center offset from the owner's center, along facing
    const x = this.owner.cx + this.owner.facing * this.ox - this.w / 2;
    return { x, y: this.owner.cy + this.oy - this.h / 2, w: this.w, h: this.h };
  }

  toHit() {
    return {
      damage: this.damage,
      kx: this.kx,
      ky: this.ky,
      hitstun: this.hitstun,
      isMelee: true,
      bypassesBarrier: this.bypassesBarrier,
      soul: this.soul,
      tag: this.tag,
      crit: this.crit,
      status: this.status,
      pullTo: this.pullTo,
      domainTick: this.domainTick,
    };
  }
}
