import { Scene } from './scene.js';
import { W, H } from '../engine/constants.js';
import { input } from '../engine/input.js';
import { drawText, drawBar, panel } from '../ui/text.js';
import { drawPortrait } from '../entities/chibi.js';
import { byId } from '../characters/index.js';
import { levelByN } from '../data/levels.js';
import { loadSave, writeSave } from '../engine/save.js';
import { levelForXp, xpIntoLevel, unlocksAtLevel } from '../data/progression.js';
import { effects } from '../engine/effects.js';
import { audio } from '../engine/audio.js';
import { rand } from '../engine/utils.js';

// Staged: XP count-up -> bar fill -> LEVEL UP -> unlock reveals. Enter skips.
export class VictoryScene extends Scene {
  enter(params) {
    this.params = params;
    const save = loadSave();
    this.oldLevel = levelForXp(save.xp);

    if (params.bossRush) {
      this.gained = 300 + (params.minionXp ?? 0);
      this.firstClear = false;
      this.levelDef = null;
    } else {
      this.levelDef = levelByN[params.levelN];
      this.firstClear = !save.clearedLevels[params.levelN];
      this.gained =
        (this.firstClear ? this.levelDef.xpFirst : this.levelDef.xpReplay) +
        (params.minionXp ?? 0) +
        (params.noHit ? 25 : 0);
    }

    // commit progress BEFORE the fanfare — closing the tab keeps it
    const newSave = writeSave((s) => {
      s.xp += this.gained;
      if (this.levelDef) {
        const rec = s.clearedLevels[this.levelDef.n] ?? { clears: 0, bestNoHit: false };
        rec.clears++;
        rec.bestNoHit = rec.bestNoHit || !!params.noHit;
        s.clearedLevels[this.levelDef.n] = rec;
      }
    });
    this.newLevel = levelForXp(newSave.xp);
    this.unlocks = [];
    for (let lv = this.oldLevel + 1; lv <= this.newLevel; lv++) this.unlocks.push(...unlocksAtLevel(lv));

    this.t = 0;
    this.stage = 0; // 0 count-up, 1 level-up banner, 2 unlock reveal, 3 done
    this.shownXp = 0;
    this.playedLevelUp = false;
    audio.sfx('victory');
    effects.reset();
  }

  update(dt) {
    this.t += dt;
    effects.update(dt);
    if (Math.random() < 0.3) {
      effects.ambient(rand(0, W), -10, ['#ffd166', '#8be9fd', '#ff5566', '#6fe3a0'][Math.floor(rand(0, 4))], 'petal');
    }

    if (this.stage === 0) {
      this.shownXp = Math.min(this.gained, this.shownXp + dt * Math.max(120, this.gained));
      if (this.shownXp >= this.gained && this.t > 1.2) {
        this.stage = this.newLevel > this.oldLevel ? 1 : this.unlocks.length ? 2 : 3;
        this.t = 0;
      }
    } else if (this.stage === 1) {
      if (!this.playedLevelUp) { this.playedLevelUp = true; audio.sfx('levelup'); }
      if (this.t > 1.4) { this.stage = this.unlocks.length ? 2 : 3; this.t = 0; }
    } else if (this.stage === 2) {
      if (this.t > 2.2) { this.stage = 3; this.t = 0; }
    }

    if (input.pressed('confirm')) {
      if (this.stage === 0) { this.shownXp = this.gained; }
      else if (this.stage < 3) { this.stage++; this.t = 0; }
      else this.game.changeScene('levelSelect');
    }
    if (this.stage === 3 && input.pressed('special')) {
      this.game.changeScene('level', {
        levelN: this.params.levelN, charId: this.params.charId, bossRush: this.params.bossRush,
      });
    }
  }

  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#1a2438');
    g.addColorStop(1, '#3a3050');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    effects.drawWorld(ctx);

    drawText(ctx, '★ VICTORY ★', W / 2, 110, { size: 44, color: '#ffd166', align: 'center' });
    if (this.levelDef?.bossId) {
      drawText(ctx, `${byId[this.levelDef.bossId].name.toUpperCase()} HAS BEEN DEFEATED!`, W / 2, 150, {
        size: 16, color: '#fff', align: 'center',
      });
    } else if (this.levelDef?.farm) {
      drawText(ctx, 'CURSED HARVEST COMPLETE — STOCKPILE BANKED!', W / 2, 150, { size: 16, color: '#fff', align: 'center' });
    } else {
      drawText(ctx, 'BOSS RUSH COMPLETE!', W / 2, 150, { size: 16, color: '#fff', align: 'center' });
    }

    drawText(ctx, `XP  +${Math.floor(this.shownXp)}`, W / 2, 210, { size: 26, color: '#8be9fd', align: 'center' });
    const parts = [];
    if (this.levelDef) parts.push(this.firstClear ? `first clear +${this.levelDef.xpFirst}` : `replay +${this.levelDef.xpReplay}`);
    if (this.params.minionXp) parts.push(`minions +${this.params.minionXp}`);
    if (this.params.noHit) parts.push('no-hit boss +25');
    drawText(ctx, parts.join('   '), W / 2, 236, { size: 12, color: 'rgba(255,255,255,0.6)', align: 'center' });

    const save = loadSave();
    const { into, needed, next } = xpIntoLevel(save.xp);
    drawBar(ctx, W / 2 - 180, 256, 360, 14, next ? into / needed : 1, '#8be9fd');
    drawText(ctx, `ACCOUNT LV ${this.oldLevel}${this.newLevel > this.oldLevel ? ` → ${this.newLevel}` : ''}`, W / 2, 292, {
      size: 15, color: '#fff', align: 'center',
    });

    if (this.stage >= 1 && this.newLevel > this.oldLevel) {
      const pop = this.stage === 1 ? Math.min(1, this.t * 4) : 1;
      drawText(ctx, '⬆ ACCOUNT LEVEL UP! ⬆', W / 2, 330, {
        size: 22 * pop + 2, color: '#ffd166', align: 'center',
      });
    }

    if (this.stage >= 2 && this.unlocks.length) {
      panel(ctx, W / 2 - 240, 350, 480, 120);
      const def = this.unlocks[0];
      const reveal = this.stage === 2 ? Math.min(1, this.t * 1.6) : 1;
      drawText(ctx, 'NEW CHARACTER UNLOCKED!', W / 2, 382, { size: 16, color: '#ffd166', align: 'center' });
      ctx.save();
      if (reveal < 1) {
        ctx.filter = `grayscale(${1 - reveal}) brightness(${0.3 + reveal * 0.7})`;
      }
      drawPortrait(ctx, def, W / 2 - 120, 460, 1.5, this.t);
      ctx.restore();
      ctx.filter = 'none';
      drawText(ctx, def.name.toUpperCase(), W / 2 + 40, 425, { size: 20, color: '#fff', align: 'center' });
      drawText(ctx, def.domain ? `Domain user: ${def.domain.name}` : def.super.name, W / 2 + 40, 450, {
        size: 12, color: '#c58fff', align: 'center',
      });
      if (this.unlocks.length > 1) {
        drawText(ctx, `+${this.unlocks.length - 1} more unlocked!`, W / 2 + 40, 470, { size: 11, color: '#8be9fd', align: 'center' });
      }
    }

    if (this.stage === 3) {
      drawText(ctx, '[Enter] Continue      [L] Replay Level', W / 2, H - 24, {
        size: 14, color: 'rgba(255,255,255,0.8)', align: 'center',
      });
    } else {
      drawText(ctx, '[Enter] Skip', W / 2, H - 24, { size: 11, color: 'rgba(255,255,255,0.4)', align: 'center' });
    }
    effects.drawScreen(ctx);
  }
}
