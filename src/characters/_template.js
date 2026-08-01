// CHARACTER DEFINITION CONTRACT
// Every character is one file exporting an object like this. The engine owns
// all timers/meters/physics; these callbacks only declare what abilities do.
//
// The `ctx` passed to every callback (see fighter.js buildCtx):
//   ctx.f                        the Fighter using the ability
//   ctx.world                    the World (fighters, projectiles, spawn, schedule)
//   ctx.effects                  juice: burst/ring/number/banner/toast/slash/beam/ghost
//   ctx.melee(opts)              spawn a melee Hitbox (damage auto-scaled by dmgMult)
//   ctx.projectile(opts)         spawn a Projectile
//   ctx.enemies() / allies()     living opposing / friendly fighters
//   ctx.nearestEnemy(maxDist)
//   ctx.applyStatus(target, name, dur, params)   burn|decay|slow|stun|frozen|energyHalf
//   ctx.spawnAlly(minionDef, x, y, opts)         summon a fighter on your team
//   ctx.schedule(delay, fn)      run fn after delay seconds
//   ctx.delayedHit(target, dmg, delay, opts)     Yuji-style phantom impact
//   ctx.windup(time, fn, {tell}) lock the fighter, then fn; tell = takes 2x dmg
//   ctx.dash(dist, time) / ctx.blink(dx)
//   ctx.heal(n) / ctx.toast(text) / ctx.buffSpeed(mult, dur)
//
// AI support: bosses set ctx.f.mem.aimTarget before attacking — use it for
// aimed abilities, falling back to ctx.nearestEnemy() then facing direction.

export default {
  id: 'template',
  name: 'Template',
  series: 'JJK',            // 'MHA' | 'JJK'
  unlockLevel: 1,
  stats: { maxHp: 120, speed: 300, jumpVel: 780, weight: 'medium' },
  palette: { skin: '#f2cfa5', hair: '#222', top: '#3b4a6b', bottom: '#2c3550', accent: '#c0392b' },
  hairStyle: 'messy',
  ai: { type: 'rushdown', band: 85 }, // zoner|summoner: band = preferred distance
  moves: [{ name: 'Punch', desc: 'A basic punch.' }],

  basic: {
    name: 'Punch',
    cooldown: 0.35,
    onUse(ctx) {
      ctx.melee({ damage: 6, w: 46, h: 34, kx: 200, ky: 120, hitstun: 0.2 });
    },
  },

  super: {
    name: 'Big Punch',
    cost: 30,
    cooldown: 1,
    desc: 'A much bigger punch.',
    onUse(ctx) {
      ctx.melee({ damage: 25, w: 60, h: 44, kx: 380, ky: 220, hitstun: 0.4, tag: 'super' });
    },
  },

  // Optional: L key. May also define onDoubleTap(ctx, dir) for dash tech.
  special: null,

  // Optional: R key. rank decides domain clashes (higher wins).
  domain: null,
  // domain: {
  //   name: 'Example Domain', rank: 1, duration: 8, color: '#c58fff',
  //   desc: 'What it does.',
  //   onStart(ctx) {}, onTick(ctx, dt, d) {}, onEnd(ctx) {},
  //   drawOverlay(ctx2d, d) {},   // screen-space arena transform
  // },

  hooks: {
    // onUpdate(ctx, dt) {}
    // onDealHit(ctx, target, hit) {}
    // onKill(ctx, target) {}
    // onHurt(ctx, hit, source) {}
    // onIncomingHit(ctx, hit, source) { return true; } // false blocks the hit
    // hudExtra(ctx2d, f, x, y) {}  // custom HUD pips (Geto storage etc.)
  },

  // Optional extra drawn features in chibi-local space (feet at 0,0, facing +x).
  // c(color) returns white during hit-flash.
  drawExtras(ctx2d, f, c) {},
};
