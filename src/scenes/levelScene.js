import { Scene } from './scene.js';
import { W, H, DEBUG } from '../engine/constants.js';
import { input } from '../engine/input.js';
import { World } from '../engine/world.js';
import { Camera } from '../engine/camera.js';
import { effects } from '../engine/effects.js';
import { seededRand, rand } from '../engine/utils.js';
import { PlayerFighter } from '../entities/playerFighter.js';
import { AIFighter } from '../entities/aiFighter.js';
import { Hazard } from '../entities/hazard.js';
import { byId } from '../characters/index.js';
import { MINIONS } from '../data/minions.js';
import { levelByN, LEVELS } from '../data/levels.js';
import { difficultyFor } from '../data/progression.js';
import { loadSave, writeSave } from '../engine/save.js';
import { audio } from '../engine/audio.js';
import { drawHud } from '../ui/hud.js';
import { drawText, panel } from '../ui/text.js';
import { Menu } from '../ui/menu.js';

const PARTICLE_COLORS = { petal: '#e8a0b8', ember: '#ff9a44', ash: '#9a9a9a' };

const BOSS_RUSH_LEVEL = {
  n: 13,
  name: 'Boss Rush',
  bossId: null,
  width: 1600,
  arena: { x: 0, w: 1600 },
  bossX: 1350,
  playerStart: { x: 120, y: 400 },
  checkpointX: 99999,
  theme: { skyTop: '#180a1e', skyBottom: '#301430', far: '#241028', near: '#160a1a', ground: '#302038', accent: '#ff5566', particle: 'ember' },
  solids: [{ x: 0, y: 500, w: 1600, h: 100 }],
  oneWays: [
    { x: 300, y: 390, w: 160, h: 12 }, { x: 1140, y: 390, w: 160, h: 12 },
    { x: 700, y: 330, w: 200, h: 12 },
  ],
  hazards: [],
  waves: [],
  height: 540,
  xpFirst: 300,
  xpReplay: 300,
};

export class LevelScene extends Scene {
  enter(params) {
    this.params = params;
    this.bossRush = !!params.bossRush;
    const def = this.bossRush ? BOSS_RUSH_LEVEL : levelByN[params.levelN];
    // runtime copy: one-way platforms are stateful (crumble)
    this.def = def;
    this.level = {
      ...def,
      oneWays: def.oneWays.map((p) => ({ ...p, gone: false, crumbleT: 0, respawnT: 0 })),
    };
    this.rng = seededRand(def.n * 1337 + 7);
    this.buildings = this.makeBuildings();

    effects.reset();
    const save = loadSave();
    effects.settings = { ...save.settings };
    audio.sfxOn = save.settings.sound !== false;
    audio.voiceOn = save.settings.voice !== false;

    this.camera = new Camera();
    this.camera.setLevelBounds(def.width);
    this.camera.shakeEnabled = save.settings.screenShake !== false;
    this.world = new World(this.level, this.camera);

    const charDef = byId[params.charId] ?? byId.deku;
    const fromBoss = params.fromBoss && !this.bossRush;
    const startX = fromBoss ? def.arena.x + 60 : params.fromCheckpoint ? def.checkpointX : def.playerStart.x;
    this.player = new PlayerFighter(charDef, startX, 200);
    this.world.addFighter(this.player);
    this.camera.snapTo(this.player);

    // Geto's curses / Mahito's transfigured souls carry over between levels
    const stash = save.curseStash?.[charDef.id];
    if (stash?.length) {
      this.player.mem.stored = stash
        .map((id) => MINIONS[id])
        .filter(Boolean)
        .map((d) => ({ def: d, name: d.name }));
    }

    for (const hz of def.hazards) this.world.addHazard(new Hazard({ ...hz }));

    this.waves = def.waves.map((w) => ({ ...w, done: fromBoss || params.fromCheckpoint && w.triggerX < startX - 200, spawned: [] }));
    this.lockedWave = null;
    this.bossStarted = false;
    this.bossIntroT = 0;
    this.noHitBoss = true;
    this.bossFightHp = undefined; // scene object is reused across runs
    this.checkpointHit = params.fromCheckpoint ?? false;
    this.state = 'play';
    this.stateT = 0;
    this.paused = false;
    this.showMoves = false;
    this.pauseMenu = this.buildPauseMenu();
    this.trainMem = { t: 0 };
    this.ambientT = 0;

    // boss rush queue
    this.rushQueue = this.bossRush ? LEVELS.map((l) => l.bossId) : null;
    this.rushIndex = 0;

    if (fromBoss || this.bossRush) this.startBossFight();
  }

  makeBuildings() {
    const out = [];
    for (let layer = 0; layer < 2; layer++) {
      const row = [];
      let x = -100;
      while (x < this.def.width * (layer === 0 ? 0.4 : 0.7) + W) {
        const bw = 60 + this.rng() * 90;
        row.push({ x, w: bw, h: 60 + this.rng() * (layer === 0 ? 200 : 130), windows: this.rng() < 0.6 });
        x += bw + 10 + this.rng() * 40;
      }
      out.push(row);
    }
    return out;
  }

  spawnKind(kind, x, y) {
    if (kind.startsWith('boss:')) {
      const cdef = byId[kind.slice(5)];
      const diff = difficultyFor(8);
      const mini = new AIFighter(cdef, x, y ?? 300, 'enemy', {
        brain: 'boss', difficulty: diff, hpMult: 0.6 * diff.hpMult, isBoss: false, aggroed: true,
      });
      this.world.addFighter(mini);
      effects.toast(`${cdef.name.toUpperCase()} BLOCKS THE WAY!`);
      return mini;
    }
    const mdef = MINIONS[kind];
    const m = new AIFighter(mdef, x, y ?? 300, 'enemy', { brain: 'minion' });
    this.world.addFighter(m);
    return m;
  }

  startBossFight() {
    const def = this.def;
    this.bossStarted = true;
    const arenaEnd = def.arena.x + def.arena.w;
    this.camera.lockTo(def.arena.x, arenaEnd);
    this.world.boundsMin = def.arena.x;
    this.world.boundsMax = arenaEnd;
    this.spawnBoss(this.bossRush ? this.rushQueue[0] : def.bossId);
  }

  spawnBoss(bossId) {
    const cdef = byId[bossId];
    const n = this.bossRush ? Math.min(12, 3 + this.rushIndex) : this.def.n;
    const diff = difficultyFor(n);
    const boss = new AIFighter(cdef, this.def.bossX, 300, 'enemy', {
      brain: 'boss', difficulty: diff, hpMult: diff.hpMult, isBoss: true, aggroed: true, facing: -1,
    });
    this.world.addFighter(boss);
    this.world.boss = boss;
    // Boss Geto arrives with curses already banked so his summoner kit works
    if (bossId === 'geto') {
      boss.mem.stored = [
        { def: MINIONS.wisp, name: MINIONS.wisp.name },
        { def: MINIONS.wisp, name: MINIONS.wisp.name },
      ];
    }
    this.bossIntroT = 2.2;
    effects.showBanner(cdef.name.toUpperCase(), '#ff5566', this.bossRush ? `BOSS ${this.rushIndex + 1} / ${this.rushQueue.length}` : 'BOSS BATTLE', 2);
    return boss;
  }

  update(dt) {
    if (this.paused) {
      this.updatePause(dt);
      return;
    }
    if (input.pressed('pause')) {
      this.paused = true;
      this.showMoves = false;
      return;
    }

    this.stateT += dt;
    effects.update(dt);
    this.world.update(dt);
    this.camera.update(dt, this.player);

    if (DEBUG && input.pressed('down') && input.down('special')) {
      this.player.energy = 100;
      this.player.domainCharge = 100;
    }

    this.updateWaves();
    this.updateCrumble(dt);
    this.updateTrain(dt);
    this.updateAmbient(dt);

    // checkpoint
    if (!this.checkpointHit && this.player.x > this.def.checkpointX) {
      this.checkpointHit = true;
      effects.toast('CHECKPOINT');
    }

    // fell out of the world
    if (this.world.playerFellOut) {
      this.world.playerFellOut = false;
      this.player.hp -= Math.round(this.player.maxHp * 0.15);
      if (this.player.hp > 0) {
        this.player.x = this.checkpointHit ? this.def.checkpointX : this.def.playerStart.x;
        if (this.bossStarted) this.player.x = this.def.arena.x + 80;
        this.player.y = 100;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.invuln = 1;
      }
    }

    // boss trigger
    if (!this.bossStarted && this.player.x > this.def.arena.x - 180) {
      this.startBossFight();
    }
    this.bossIntroT = Math.max(0, this.bossIntroT - dt);
    // no-hit tracking: any HP lost while the boss lives voids the bonus
    if (this.bossStarted && this.world.boss?.alive) {
      if (this.bossFightHp === undefined) this.bossFightHp = this.player.hp;
      if (this.player.hp < this.bossFightHp) this.noHitBoss = false;
      this.bossFightHp = this.player.hp;
    }

    // outcomes
    if (this.state === 'play') {
      if (!this.player.alive || this.player.hp <= 0) {
        this.player.alive = false;
        this.state = 'lost';
        this.stateT = 0;
        effects.slowmo(0.9);
        this.camera.zoomTarget = 1.15;
      } else if (this.bossStarted && this.world.boss && !this.world.boss.alive) {
        if (this.bossRush && this.rushIndex < this.rushQueue.length - 1) {
          this.rushIndex++;
          this.world.boss = null;
          this.player.hp = Math.min(this.player.maxHp, this.player.hp + 50);
          effects.toast('+50 HP');
          this.world.schedule(1.6, () => this.spawnBoss(this.rushQueue[this.rushIndex]));
        } else {
          this.state = 'won';
          this.stateT = 0;
          effects.slowmo(0.9);
          this.camera.zoomTarget = 1.12;
        }
      }
    } else if (this.stateT > 1.8) {
      if (this.state === 'won') {
        // bank whatever curses/souls the player is still holding for next level
        writeSave((s) => {
          s.curseStash ??= {};
          s.curseStash[this.params.charId] = (this.player.mem.stored ?? [])
            .map((r) => r.def?.id)
            .filter(Boolean);
        });
        this.game.changeScene('victory', {
          levelN: this.def.n,
          charId: this.params.charId,
          bossRush: this.bossRush,
          minionXp: this.world.xpEarned,
          noHit: this.noHitBoss,
        });
      } else {
        this.game.changeScene('defeat', {
          levelN: this.def.n,
          charId: this.params.charId,
          bossRush: this.bossRush,
          fromCheckpoint: this.checkpointHit,
          fromBoss: this.bossStarted,
        });
      }
    }
  }

  updateWaves() {
    // locked wave gate
    if (this.lockedWave) {
      if (this.lockedWave.spawned.every((m) => !m.alive)) {
        this.lockedWave = null;
        if (!this.bossStarted) {
          this.camera.unlock();
          this.world.boundsMin = 0;
          this.world.boundsMax = this.def.width;
        }
        effects.toast('GO!');
      }
      return;
    }
    for (const w of this.waves) {
      if (w.done || this.camera.x + W < w.triggerX) continue;
      // locked ambushes wait until their authored spawn positions fit on-screen
      if (w.lock && this.camera.x + W < Math.max(...w.spawns.map((sp) => sp.x)) + 60) continue;
      w.done = true;
      if (w.lock) {
        this.lockedWave = w;
        const lockX = this.camera.clampX(this.camera.x);
        this.camera.lockTo(lockX, lockX + W);
        this.world.boundsMin = Math.max(0, lockX - 20);
        this.world.boundsMax = Math.min(this.def.width, lockX + W + 20);
      }
      w.spawned = w.spawns.map((sp) => {
        const sx = w.lock
          ? Math.min(Math.max(sp.x, this.world.boundsMin + 20), this.world.boundsMax - 60)
          : sp.x;
        return this.spawnKind(sp.kind, sx, sp.y);
      });
    }
  }

  updateCrumble(dt) {
    for (const p of this.level.oneWays) {
      if (!p.crumble) continue;
      if (p.gone) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) { p.gone = false; p.crumbleT = 0; }
        continue;
      }
      if (this.player.onPlatform === p) {
        p.crumbleT += dt;
        if (p.crumbleT > 1.1) {
          p.gone = true;
          p.respawnT = 3;
          effects.burst(p.x + p.w / 2, p.y, '#8a8578', 10, { speed: 120 });
        }
      } else {
        p.crumbleT = Math.max(0, p.crumbleT - dt * 2);
      }
    }
  }

  updateTrain(dt) {
    const ts = this.def.trainScript;
    if (!ts || this.bossStarted) return;
    this.trainMem.t += dt;
    if (this.trainMem.t >= ts.every) {
      this.trainMem.t = 0;
      effects.toast('⚠ TRAIN INCOMING ⚠');
      this.world.addHazard(new Hazard({
        x: this.camera.x - 200, y: ts.y - ts.h, w: W + 400, h: ts.h,
        type: 'splat', color: '#d8d8e8', damage: ts.damage, interval: 1,
        telegraph: ts.telegraph, activeTime: 0.7, kx: 420, ky: 260,
      }));
      this.camera.shake(3, 0.4);
    }
  }

  updateAmbient(dt) {
    const pt = this.def.theme.particle;
    if (!pt) return;
    this.ambientT += dt;
    if (this.ambientT > 0.25) {
      this.ambientT = 0;
      effects.ambient(this.camera.x + rand(0, W), pt === 'ember' ? H - 60 : -10, PARTICLE_COLORS[pt], pt);
    }
  }

  buildPauseMenu() {
    const s = loadSave().settings;
    const menu = new Menu([
      { label: 'RESUME' },
      { label: 'RESTART LEVEL' },
      { label: 'MOVE LIST' },
      { label: `SOUND: ${s.sound !== false ? 'ON' : 'OFF'}` },
      { label: `VOICE: ${s.voice !== false ? 'ON' : 'OFF'}` },
      { label: 'QUIT TO MAP' },
    ]);
    menu.index = this.pauseMenu?.index ?? 0;
    return menu;
  }

  updatePause(dt) {
    if (this.showMoves) {
      if (input.pressed('back') || input.pressed('confirm') || input.pressed('pause')) this.showMoves = false;
      return;
    }
    if (input.pressed('pause')) { this.paused = false; return; }
    const r = this.pauseMenu.update(dt);
    if (r.action === 'back') { this.paused = false; return; }
    if (r.action !== 'confirm') return;
    if (r.index === 0) this.paused = false;
    else if (r.index === 1) this.game.changeScene('level', { levelN: this.def.n, charId: this.params.charId, bossRush: this.bossRush });
    else if (r.index === 2) this.showMoves = true;
    else if (r.index === 3 || r.index === 4) {
      const key = r.index === 3 ? 'sound' : 'voice';
      const save = writeSave((s) => { s.settings[key] = s.settings[key] === false; });
      audio.sfxOn = save.settings.sound !== false;
      audio.voiceOn = save.settings.voice !== false;
      this.pauseMenu = this.buildPauseMenu();
    } else this.game.changeScene('levelSelect');
  }

  // ---- drawing ---------------------------------------------------------

  drawBackground(ctx) {
    const t = this.def.theme;
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, t.skyTop);
    g.addColorStop(1, t.skyBottom);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    for (let layer = 0; layer < 2; layer++) {
      const par = layer === 0 ? 0.25 : 0.55;
      const ox = -this.camera.x * par;
      ctx.fillStyle = layer === 0 ? t.far : t.near;
      for (const b of this.buildings[layer]) {
        const x = b.x + ox;
        if (x + b.w < -20 || x > W + 20) continue;
        ctx.fillRect(x, H - 40 - b.h, b.w, b.h + 40);
        if (b.windows && layer === 1) {
          ctx.fillStyle = 'rgba(255,210,100,0.18)';
          for (let wy = H - 30 - b.h; wy < H - 60; wy += 22) {
            for (let wx = x + 8; wx < x + b.w - 10; wx += 18) ctx.fillRect(wx, wy, 7, 9);
          }
          ctx.fillStyle = t.near;
        }
      }
    }
  }

  drawGeometry(ctx) {
    const t = this.def.theme;
    for (const s of this.level.solids) {
      ctx.fillStyle = t.ground;
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(s.x, s.y, s.w, 4);
    }
    for (const p of this.level.oneWays) {
      if (p.gone) continue;
      const shake = p.crumbleT > 0 ? Math.sin(p.crumbleT * 40) * Math.min(2, p.crumbleT * 3) : 0;
      ctx.fillStyle = p.crumble ? '#7a6a58' : t.accent;
      ctx.globalAlpha = p.crumble ? 0.9 : 0.75;
      ctx.fillRect(p.x, p.y + shake, p.w, p.h);
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(p.x, p.y + shake, p.w, 3);
    }
    // checkpoint banner pole
    if (!this.bossRush && this.def.checkpointX < this.def.width) {
      const cx = this.def.checkpointX;
      const gy = this.level.groundY?.(cx) ?? 500;
      ctx.strokeStyle = '#c8c2b2';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(cx, gy);
      ctx.lineTo(cx, gy - 70);
      ctx.stroke();
      ctx.fillStyle = this.checkpointHit ? '#6fe3a0' : '#888';
      ctx.beginPath();
      ctx.moveTo(cx, gy - 70);
      ctx.lineTo(cx + 26, gy - 60);
      ctx.lineTo(cx, gy - 50);
      ctx.fill();
    }
  }

  draw(ctx) {
    this.drawBackground(ctx);
    this.camera.apply(ctx);
    this.drawGeometry(ctx);
    this.world.draw(ctx);
    this.camera.reset(ctx);

    this.world.drawDomainOverlay(ctx);
    drawHud(ctx, this.world);
    effects.drawScreen(ctx);

    if (this.state === 'lost') {
      ctx.fillStyle = `rgba(20,0,8,${Math.min(0.6, this.stateT * 0.5)})`;
      ctx.fillRect(0, 0, W, H);
    } else if (this.state === 'won') {
      ctx.fillStyle = `rgba(255,240,200,${Math.min(0.35, this.stateT * 0.3)})`;
      ctx.fillRect(0, 0, W, H);
    }

    if (this.paused) this.drawPause(ctx);
  }

  drawPause(ctx) {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, W, H);
    if (this.showMoves) {
      const def = this.player.def;
      panel(ctx, 160, 100, W - 320, 320);
      drawText(ctx, `${def.name.toUpperCase()} — MOVE LIST`, W / 2, 140, { size: 20, color: '#ffd166', align: 'center' });
      let y = 180;
      drawText(ctx, `BASIC (J/Z): ${def.basic.name}`, 200, y, { size: 14, color: '#fff' }); y += 26;
      for (const m of def.moves ?? []) {
        drawText(ctx, `• ${m.name}: ${m.desc}`, 210, y, { size: 12, color: 'rgba(255,255,255,0.8)' });
        y += 22;
      }
      drawText(ctx, `SUPER (K/X): ${def.super.name} — ${def.super.desc ?? ''}`, 200, y + 6, { size: 13, color: '#8be9fd' }); y += 32;
      if (def.special?.name) { drawText(ctx, `SPECIAL (L/C): ${def.special.name}`, 200, y, { size: 13, color: '#6fe3a0' }); y += 26; }
      drawText(
        ctx,
        def.domain ? `DOMAIN (R): ${def.domain.name} — ${def.domain.desc}` : 'DOMAIN (R): Simple Domain (needs 50 gauge, only inside an enemy domain)',
        200, y, { size: 13, color: '#c58fff' },
      );
      drawText(ctx, '[Esc] Back', W / 2, 400, { size: 12, color: 'rgba(255,255,255,0.6)', align: 'center' });
      return;
    }
    drawText(ctx, '— PAUSED —', W / 2, 180, { size: 30, color: '#fff', align: 'center' });
    this.pauseMenu.draw(ctx, W / 2, 240, { align: 'center' });
  }
}
