// Headless engine smoke test — runs the real game modules in Node.
const base = new URL('../src', import.meta.url).pathname;
const { World } = await import(`${base}/engine/world.js`);
const { PlayerFighter } = await import(`${base}/entities/playerFighter.js`);
const { AIFighter } = await import(`${base}/entities/aiFighter.js`);
const { ROSTER, byId } = await import(`${base}/characters/index.js`);
const { MINIONS } = await import(`${base}/data/minions.js`);
const { LEVELS } = await import(`${base}/data/levels.js`);
const { difficultyFor, levelForXp, THRESHOLDS } = await import(`${base}/data/progression.js`);
const { effects } = await import(`${base}/engine/effects.js`);

let failures = 0;
const ok = (cond, msg) => {
  if (cond) console.log(`  ✓ ${msg}`);
  else { failures++; console.log(`  ✗ FAIL: ${msg}`); }
};

const STEP = 1 / 60;
// clear transient CC so tests exercise the ability itself, not hitstun timing
function prep(f) {
  f.hitstun = 0; f.lockT = 0; f.invuln = 0;
  delete f.statuses.stun; delete f.statuses.frozen;
  f.gravityOff = f.flying ?? false;
}
function makeWorld() {
  const def = LEVELS[0];
  const level = {
    ...def,
    solids: def.solids.map((s) => ({ ...s })),
    oneWays: def.oneWays.map((p) => ({ ...p })),
    groundY: null,
  };
  return new World(level, null);
}
function step(world, seconds) {
  for (let i = 0; i < Math.ceil(seconds / STEP); i++) world.update(STEP);
}

console.log('— physics & combat basics —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.deku, 100, 300);
  w.addFighter(p);
  step(w, 1);
  ok(p.onGround, 'player lands on the ground');
  const wisp = new AIFighter(MINIONS.wisp, p.cx + 40, p.y + 10, 'enemy', { brain: 'minion' });
  w.addFighter(wisp);
  p.facing = 1;
  for (let i = 0; i < 20 && wisp.alive; i++) { p.cooldowns.basic = 0; p.tryBasic(); step(w, 0.4); }
  ok(!wisp.alive, 'melee basic kills a wisp');
  ok(w.xpEarned >= 3, `kill grants XP (got ${w.xpEarned})`);
  ok(p.energy > 0, `energy gained from dealing damage (${p.energy.toFixed(1)})`);
  ok(p.domainCharge > 0, 'domain gauge charges from damage');
}

console.log('— every character: basic + super + domain fire without crashing —');
for (const def of ROSTER) {
  try {
    const w = makeWorld();
    const p = new PlayerFighter(def, 200, 300);
    w.addFighter(p);
    const dummy = new AIFighter(MINIONS.crawler, 260, 300, 'enemy', { brain: 'minion' });
    const dummy2 = new AIFighter(MINIONS.brute, 320, 250, 'enemy', { brain: 'minion' });
    w.addFighter(dummy); w.addFighter(dummy2);
    step(w, 0.5);
    prep(p);
    p.cooldowns.basic = 0; p.tryBasic();
    step(w, 0.6);
    p.energy = 100;
    prep(p);
    const usedSuper = p.trySuper();
    step(w, 1.5);
    // every character now has an H ultra — fire it too
    p.energy = 100;
    prep(p);
    p.tryUltra();
    step(w, 1.5);
    let domainOk = true;
    if (def.domain) {
      p.domainCharge = 100;
      prep(p);
      p.pressDomain();
      domainOk = w.activeDomain?.owner === p;
      step(w, def.domain.duration + 1.5); // run to expiry
      domainOk = domainOk && !w.activeDomain;
    }
    step(w, 2);
    ok(usedSuper && domainOk, `${def.id}: basic/super/ultra${def.domain ? '/domain' : ''} ran clean`);
  } catch (e) {
    failures++;
    console.log(`  ✗ FAIL: ${def.id} threw: ${e.message}\n${e.stack.split('\n')[1]}`);
  }
}

console.log('— Geto: absorb weakened curse, then release it as an ally —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.geto, 200, 300);
  w.addFighter(p);
  const wisp = new AIFighter(MINIONS.wisp, 240, 320, 'enemy', { brain: 'minion' });
  w.addFighter(wisp);
  step(w, 0.3);
  prep(p);
  p.invuln = 10; // wisp contact damage must not interrupt the channel test
  p.trySpecial(); // absorb (wisp maxHp 10 <= geto 75)
  step(w, 1);
  ok((p.mem.stored ?? []).length === 1 && !wisp.alive, 'wisp absorbed into storage');
  p.cooldowns.special = 0;
  prep(p);
  p.trySpecial(); // release
  step(w, 0.3);
  ok(w.alliesOf(p).length === 1, 'stored curse released as ally');
  ok(w.alliesOf(p)[0]?.team === 'player', 'released curse fights for Geto');
}

console.log('— Mahito: 3 basic hits transfigure a curse; store, carry, and throw it —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.mahito, 200, 300);
  w.addFighter(p);
  const crawler = new AIFighter(MINIONS.crawler, 240, 300, 'enemy', { brain: 'minion' });
  crawler.control = () => {};
  w.addFighter(crawler);
  step(w, 0.3);
  p.facing = 1;
  for (let i = 0; i < 12 && crawler.team === 'enemy'; i++) {
    crawler.x = p.x + 40; crawler.vx = 0; // stay in reach despite knockback
    prep(p); p.cooldowns.basic = 0; p.tryBasic(); step(w, 0.35);
  }
  ok(crawler.team === 'player' && crawler.converted, 'crawler transfigured after enough basic hits');
  step(w, 13);
  ok(crawler.alive, 'transfigured soul is permanent (no expiry timer)');
  // bosses resist: stacks never accrue on non-minions
  const boss = new AIFighter(byId.allmight, 260, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(5) });
  boss.control = () => {};
  w.addFighter(boss);
  for (let i = 0; i < 5; i++) { prep(p); p.cooldowns.basic = 0; p.tryBasic(); step(w, 0.35); }
  ok(!boss.converted && boss.team === 'enemy', 'bosses cannot be transfigured');
  // store the transfigured ally, then throw it as a ranged attack
  prep(p);
  crawler.x = p.x + 40; crawler.y = p.y;
  p.cooldowns.special = 0;
  p.trySpecial();
  ok((p.mem.stored ?? []).length === 1 && !crawler.alive, 'transfigured soul stored via Soul Storage');
  prep(p);
  p.energy = 100;
  const hpBefore = boss.hp;
  p.facing = 1;
  p.trySuper(); // Transfigured Toss
  step(w, 1.2);
  ok(p.mem.stored.length === 0, 'toss consumes the stored soul');
  ok(boss.hp < hpBefore, `toss projectile damages the boss (${hpBefore - boss.hp} dmg)`);
}

console.log('— Geto domain: devours every curse regardless of strength, not bosses —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.geto, 200, 300);
  w.addFighter(p);
  const brute = new AIFighter(MINIONS.brute, 500, 250, 'enemy', { brain: 'minion' }); // 90 HP — normal absorb can't take it
  const wisp2 = new AIFighter(MINIONS.wisp, 600, 300, 'enemy', { brain: 'minion' });
  const boss = new AIFighter(byId.allmight, 700, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(5) });
  boss.control = () => {};
  w.addFighter(brute); w.addFighter(wisp2); w.addFighter(boss);
  step(w, 0.3);
  p.domainCharge = 100;
  prep(p);
  p.pressDomain();
  ok(w.activeDomain?.owner === p, 'Sea of Ten Thousand Curses opens');
  step(w, 0.2);
  ok(!brute.alive && !wisp2.alive, 'full-strength brute and wisp both devoured');
  ok((p.mem.stored ?? []).length === 2, `both curses in storage (${(p.mem.stored ?? []).length})`);
  ok(boss.alive && boss.hp === boss.maxHp, 'boss is completely unaffected');
  step(w, 7);
  ok(!w.activeDomain, 'domain expires cleanly');
}

console.log('— Mahito ultra: Transfigured Wall blocks enemies, not Mahito —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.mahito, 200, 300);
  w.addFighter(p);
  step(w, 0.5);
  p.mem.stored = [{ def: MINIONS.wisp, name: 'Wisp' }];
  prep(p); p.facing = 1;
  const solidsBefore = w.level.solids.length;
  p.tryUltra();
  step(w, 0.5);
  const wall = w.fighters.find((e) => e.def.id === 'tf-wall');
  ok(!!wall?.alive, 'wall of transfigured souls raised');
  ok(p.mem.stored.length === 0, 'wall consumed the stored soul');
  ok(w.level.solids.length === solidsBefore + 1, 'wall registers as solid terrain');
  // enemy walks into it and is blocked; Mahito passes through
  const enemy = new AIFighter(MINIONS.crawler, wall.x + 60, wall.y + 40, 'enemy', { brain: 'minion' });
  w.addFighter(enemy);
  enemy.control = function () { this.moveDir = -1; };
  p.x = wall.x + 50; p.vx = 0;
  p.control = function () { this.moveDir = -1; };
  step(w, 1.2);
  ok(enemy.x >= wall.x + wall.w - 6, 'enemy is blocked by the wall');
  ok(p.x < wall.x - 4, 'Mahito walks straight through his own wall');
  // breaking it removes the solid
  wall.receiveHit({ damage: 500, kx: 0, ky: 0, hitstun: 0, isMelee: true, tag: 'super' }, enemy, w);
  step(w, 0.2);
  ok(!wall.alive && w.level.solids.length === solidsBefore, 'broken wall stops blocking');
}

console.log('— Geto ultra: absorb a slain boss, unleash it with H —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.geto, 200, 300);
  w.addFighter(p);
  const boss1 = new AIFighter(byId.maki, 250, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(3), isBoss: true });
  boss1.control = () => {};
  w.addFighter(boss1);
  step(w, 0.3);
  boss1.hp = 3;
  boss1.invuln = 0;
  prep(p); p.facing = 1;
  boss1.receiveHit({ damage: 10, kx: 0, ky: 0, hitstun: 0, isMelee: false, tag: 'super' }, p, w);
  ok(!boss1.alive, 'boss slain');
  ok(p.mem.bossStored?.def === byId.maki, "boss curse absorbed into Geto's keeping");
  // second boss + minion + platform in the beam path
  const boss2 = new AIFighter(byId.allmight, 500, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(9), isBoss: true });
  boss2.control = () => {};
  const fodder = new AIFighter(MINIONS.brute, 400, 250, 'enemy', { brain: 'minion' });
  w.addFighter(boss2); w.addFighter(fodder);
  const platCount = w.level.oneWays.filter((pl) => !pl.gone).length;
  step(w, 0.3);
  prep(p); p.facing = 1;
  const used = p.tryUltra();
  step(w, 1);
  ok(used, 'H unleashes Maximum Uzumaki');
  ok(p.mem.bossStored == null, 'boss curse is consumed');
  ok(!fodder.alive, 'minions in the path are annihilated');
  ok(Math.abs(boss2.maxHp - boss2.hp - Math.round(boss2.maxHp / 2)) <= 2, `boss loses half its max HP (${boss2.maxHp - boss2.hp}/${boss2.maxHp})`);
  const platAfter = w.level.oneWays.filter((pl) => !pl.gone).length;
  ok(platAfter < platCount, `terrain in the path is destroyed (${platCount} -> ${platAfter} platforms)`);
  prep(p);
  p.cooldowns.ultra = 0;
  const again = p.tryUltra();
  step(w, 0.1);
  ok(again !== false && p.mem.bossStored == null, 'H without a trophy just warns (no crash)');
}

console.log('— Mahito: civilians wander, panic, and transfigure —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.mahito, 200, 300);
  w.addFighter(p);
  const civ = new AIFighter(MINIONS.civilian, 250, 300, 'neutral', { brain: 'minion' });
  w.addFighter(civ);
  step(w, 0.5);
  ok(civ.alive && civ.team === 'neutral', 'civilian exists peacefully');
  ok(civ.mem.fleeing === true, 'civilian panics near a fighter');
  p.facing = 1;
  for (let i = 0; i < 12 && !civ.converted; i++) {
    civ.x = p.x + 36; civ.vx = 0;
    prep(p); p.cooldowns.basic = 0; p.tryBasic(); step(w, 0.35);
  }
  ok(civ.converted && civ.team === 'player', 'civilian transfigured into an ally');
}

console.log('— Gojo: Limitless blocks melee, Void freezes, Toji bypasses —');
{
  const w = makeWorld();
  const gojo = new PlayerFighter(byId.gojo, 200, 300);
  w.addFighter(gojo);
  const boss = new AIFighter(byId.toji, 420, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(5) });
  w.addFighter(boss);
  step(w, 0.3);
  gojo.energy = 100;
  gojo.trySuper();
  ok(gojo.mem.limitless > 0, 'Limitless active');
  const hpBefore = gojo.hp;
  const blocked = !gojo.receiveHit({ damage: 10, kx: 100, ky: 100, hitstun: 0.2, isMelee: true }, boss, w);
  const pierced = gojo.receiveHit({ damage: 10, kx: 100, ky: 100, hitstun: 0.2, isMelee: true, bypassesBarrier: true }, boss, w);
  ok(blocked, 'normal melee cannot touch Infinity');
  ok(pierced && gojo.hp < hpBefore, 'Toji-style bypass attack lands anyway');
  gojo.domainCharge = 100;
  gojo.hitstun = 0; gojo.invuln = 0; gojo.lockT = 0;
  gojo.pressDomain();
  ok(!!boss.statuses.frozen, 'Unlimited Void freezes the enemy');
  step(w, 9);
  ok(!boss.statuses.frozen, 'freeze ends when the domain closes');
}

console.log('— Domain clash: Unlimited Void beats Malevolent Shrine —');
{
  const w = makeWorld();
  const gojo = new PlayerFighter(byId.gojo, 200, 300);
  w.addFighter(gojo);
  const sukuna = new AIFighter(byId.sukuna, 500, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(11), isBoss: true });
  w.addFighter(sukuna);
  step(w, 0.3);
  w.castDomain(sukuna);
  ok(w.activeDomain?.owner === sukuna, "Sukuna's domain opens");
  gojo.domainCharge = 100;
  gojo.hitstun = 0; gojo.lockT = 0; delete gojo.statuses.stun;
  const hpBefore = sukuna.hp;
  gojo.pressDomain();
  ok(w.activeDomain?.owner === gojo, 'clash: Void overrides Shrine (higher rank)');
  ok(sukuna.hp < hpBefore && sukuna.statuses.stun, 'clash loser takes damage + stun');
}

console.log('— Simple Domain: breaks Void freeze, blocks domain ticks —');
{
  const w = makeWorld();
  const deku = new PlayerFighter(byId.deku, 200, 300);
  w.addFighter(deku);
  const gojoBoss = new AIFighter(byId.gojo, 500, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(10), isBoss: true });
  w.addFighter(gojoBoss);
  step(w, 0.3);
  w.castDomain(gojoBoss); // boss Void: freezes deku briefly
  ok(!!deku.statuses.frozen, 'boss Void freezes the player');
  deku.domainCharge = 60;
  deku.pressDomain();
  ok(deku.simpleDomainT > 0 && !deku.statuses.frozen, 'Simple Domain cleanses the freeze');
  const landed = deku.receiveHit({ damage: 5, kx: 0, ky: 0, hitstun: 0, isMelee: false, domainTick: true }, gojoBoss, w);
  ok(!landed, 'domain guaranteed-hit tick bypassed by Simple Domain');
}

console.log('— All For One: Power Steal locks the victim out and grants their super —');
{
  const w = makeWorld();
  const afo = new PlayerFighter(byId.allforone, 200, 300);
  w.addFighter(afo);
  const gojoBoss = new AIFighter(byId.gojo, 320, 300, 'enemy', { brain: 'boss', difficulty: difficultyFor(10), isBoss: true });
  w.addFighter(gojoBoss);
  step(w, 0.3);
  afo.energy = 100;
  prep(afo);
  afo.trySuper();
  ok(afo.mem.steal?.def === byId.gojo, "AFO stole Gojo's power");
  ok(gojoBoss.powerStolenT > 0, 'victim is locked out');
  gojoBoss.energy = 100;
  prep(gojoBoss);
  const denied = gojoBoss.trySuper();
  ok(!denied, "victim can't use their stolen super");
  afo.energy = 100;
  afo.cooldowns.super = 0;
  prep(afo);
  afo.trySuper(); // casts stolen Limitless through AFO
  ok(afo.mem.limitless > 0, 'AFO casts stolen Limitless on himself');
  step(w, 13);
  ok(!afo.mem.steal, 'steal expires');
}

console.log('— Yuji: phantom Divergent Fist impact lands 0.4s later —');
{
  const w = makeWorld();
  const p = new PlayerFighter(byId.yuji, 200, 300);
  w.addFighter(p);
  const brute = new AIFighter(MINIONS.brute, 250, 260, 'enemy', { brain: 'minion' });
  w.addFighter(brute);
  step(w, 0.3);
  let hpAfterFirst = null;
  for (let i = 0; i < 8 && hpAfterFirst === null; i++) {
    p.cooldowns.basic = 0; p.hitstun = 0; p.tryBasic(); w.update(STEP);
    if (brute.hp < brute.maxHp) hpAfterFirst = brute.hp;
  }
  ok(hpAfterFirst !== null, 'immediate hit lands');
  step(w, 0.6);
  ok(brute.hp < hpAfterFirst, `phantom impact landed later (${hpAfterFirst} -> ${brute.hp})`);
}

console.log('— regression: review-workflow fixes —');
{
  // multi-hit supers must land (nearly) full damage
  const w = makeWorld();
  const p = new PlayerFighter(byId.deku, 200, 300);
  w.addFighter(p);
  const dummy = new AIFighter(MINIONS.brute, 280, 250, 'enemy', { brain: 'minion' });
  dummy.setState = () => {}; dummy.control = () => {}; // stationary punching bag
  w.addFighter(dummy);
  step(w, 0.5);
  prep(p); p.energy = 100;
  p.trySuper();
  step(w, 1.5);
  const dealt = dummy.maxHp - dummy.hp;
  ok(dealt >= 21, `Deku Shoot Style lands most kicks (${dealt} dmg, was 7 before fix)`);
}
{
  // Sukuna Fire Arrow direct hit: burn + heavy damage
  const w = makeWorld();
  const p = new PlayerFighter(byId.sukuna, 200, 300);
  w.addFighter(p);
  const dummy = new AIFighter(MINIONS.brute, 420, 250, 'enemy', { brain: 'minion' });
  dummy.control = () => {};
  w.addFighter(dummy);
  step(w, 0.5);
  prep(p); p.energy = 100; p.facing = 1;
  p.trySuper();
  step(w, 1);
  ok(!!dummy.statuses.burn || !dummy.alive, 'Fire Arrow direct hit applies Burn');
  ok(dummy.maxHp - dummy.hp >= 30 || !dummy.alive, `direct hit deals full payload (${dummy.maxHp - dummy.hp})`);
}
{
  // point-blank melee (hitbox formula fix): Maki touching a crawler hits it
  const w = makeWorld();
  const p = new PlayerFighter(byId.maki, 200, 300);
  w.addFighter(p);
  const c = new AIFighter(MINIONS.crawler, 226, 300, 'enemy', { brain: 'minion' });
  c.control = () => {};
  w.addFighter(c);
  step(w, 0.3);
  prep(p); p.facing = 1;
  p.cooldowns.basic = 0; p.tryBasic();
  step(w, 0.2);
  ok(c.hp < c.maxHp, 'point-blank Polearm Sweep connects');
}
{
  // Limitless now stops ranged direct hits (Piercing Blood)
  const w = makeWorld();
  const gojo = new PlayerFighter(byId.gojo, 200, 300);
  w.addFighter(gojo);
  step(w, 0.3);
  gojo.energy = 100; prep(gojo);
  gojo.trySuper();
  const blocked = !gojo.receiveHit({ damage: 35, kx: 200, ky: 60, hitstun: 0.35, isMelee: false, tag: 'super' }, null, w);
  ok(blocked, 'Limitless stops non-bypass ranged hits');
}
{
  // Naoya blink-through damages the enemy on the path
  const w = makeWorld();
  const p = new PlayerFighter(byId.naoya, 200, 300);
  w.addFighter(p);
  const c = new AIFighter(MINIONS.crawler, 290, 300, 'enemy', { brain: 'minion' });
  c.control = () => {};
  w.addFighter(c);
  step(w, 0.3);
  prep(p); p.facing = 1;
  p.cooldowns.basic = 0; p.tryBasic();
  step(w, 0.2);
  ok(c.hp < c.maxHp, 'Frame Dash Strike hits the enemy he blinked through');
}

console.log('— Curse Nest: 3x domain charge —');
{
  const { levelByN } = await import(`${base}/data/levels.js`);
  const nest = levelByN[98];
  ok(!!nest && nest.farm && (nest.civilians ?? 7) === 0, 'Curse Nest exists with zero civilians');
  const level = { ...nest, solids: nest.solids.map((sd) => ({ ...sd })), oneWays: nest.oneWays.map((pl) => ({ ...pl })), groundY: null };
  const w = new World(level, null);
  const p = new PlayerFighter(byId.geto, 200, 300);
  w.addFighter(p);
  const dummy = new AIFighter(MINIONS.brute, 260, 250, 'enemy', { brain: 'minion' });
  dummy.control = () => {};
  w.addFighter(dummy);
  step(w, 0.3);
  dummy.receiveHit({ damage: 20, kx: 0, ky: 0, hitstun: 0, isMelee: false, tag: 'super' }, p, w);
  ok(Math.abs(p.domainCharge - 30) < 1, `domain gauge charges 3x in the Nest (${p.domainCharge.toFixed(1)} from 20 dmg, normally 10)`);
}

console.log('— progression math —');
{
  ok(levelForXp(0) === 1 && levelForXp(100) === 2 && levelForXp(5200) === 14, 'XP thresholds map to levels');
  ok(THRESHOLDS[2] - THRESHOLDS[1] === 100, 'level 1->2 costs exactly level-1 first-clear XP');
  const d1 = difficultyFor(1), d12 = difficultyFor(12);
  ok(d1.hpMult === 1 && d12.hpMult === 2.4 && d12.reactionDelay < d1.reactionDelay, 'difficulty ramps 1 -> 12');
  ok(LEVELS.length === 12, '12 campaign levels defined');
  for (const l of LEVELS) ok(!!byId[l.bossId], `level ${l.n} boss '${l.bossId}' exists`);
}

console.log(failures === 0 ? '\nALL SMOKE TESTS PASSED' : `\n${failures} FAILURES`);
process.exit(failures === 0 ? 0 : 1);
