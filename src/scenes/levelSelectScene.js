import { Scene } from './scene.js';
import { W, H, DEBUG } from '../engine/constants.js';
import { input } from '../engine/input.js';
import { drawText, drawBar, panel } from '../ui/text.js';
import { drawPortrait } from '../entities/chibi.js';
import { byId } from '../characters/index.js';
import { LEVELS, FARM_LEVEL } from '../data/levels.js';
import { loadSave, writeSave } from '../engine/save.js';
import { levelForXp, xpIntoLevel, MAX_LEVEL } from '../data/progression.js';
import { effects } from '../engine/effects.js';

const NODES_PER_ROW = 6;

export class LevelSelectScene extends Scene {
  enter() {
    const save = loadSave();
    this.cursor = Math.min(save.lastLevel, LEVELS.length) - 1;
    this.t = 0;
    this.denyT = 0;
  }

  bossRushUnlocked() {
    return DEBUG || levelForXp(loadSave().xp) >= MAX_LEVEL;
  }

  entries() {
    const list = LEVELS.map((l) => ({ level: l }));
    list.splice(1, 0, { level: FARM_LEVEL, farm: true }); // harvest stage after level 1
    if (this.bossRushUnlocked()) list.push({ bossRush: true });
    return list;
  }

  isUnlocked(i) {
    if (DEBUG) return true;
    const save = loadSave();
    const e = this.entries()[i];
    if (e.bossRush) return true;
    if (e.farm) return !!save.clearedLevels[1];
    return e.level.n === 1 || !!save.clearedLevels[e.level.n - 1];
  }

  update(dt) {
    this.t += dt;
    this.denyT = Math.max(0, this.denyT - dt);
    effects.update(dt);
    const entries = this.entries();
    if (input.pressed('right')) this.cursor = Math.min(entries.length - 1, this.cursor + 1);
    if (input.pressed('left')) this.cursor = Math.max(0, this.cursor - 1);
    if (input.pressed('down')) this.cursor = Math.min(entries.length - 1, this.cursor + NODES_PER_ROW);
    if (input.pressed('up')) this.cursor = Math.max(0, this.cursor - NODES_PER_ROW);
    if (input.pressed('back')) { this.game.changeScene('title'); return; }
    if (input.pressed('confirm')) {
      if (!this.isUnlocked(this.cursor)) {
        this.denyT = 0.3;
        return;
      }
      const e = entries[this.cursor];
      writeSave((s) => { s.lastLevel = e.bossRush || e.farm ? 1 : e.level.n; });
      this.game.changeScene('charSelect', e.bossRush ? { bossRush: true } : { levelN: e.level.n });
    }
  }

  nodePos(i) {
    const row = Math.floor(i / NODES_PER_ROW);
    const col = i % NODES_PER_ROW;
    const x = 120 + (row % 2 === 0 ? col : NODES_PER_ROW - 1 - col) * 130;
    return { x, y: 150 + row * 110 };
  }

  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#101426');
    g.addColorStop(1, '#242038');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    const save = loadSave();
    const acct = levelForXp(save.xp);
    const { into, needed, next } = xpIntoLevel(save.xp);
    drawText(ctx, 'CAMPAIGN', 40, 50, { size: 28, color: '#ffd166' });
    drawText(ctx, `ACCOUNT LV ${acct}`, W - 240, 40, { size: 15, color: '#fff' });
    drawBar(ctx, W - 240, 48, 200, 9, next ? into / needed : 1, '#8be9fd');
    if (next) drawText(ctx, `${into}/${needed} XP to Lv ${next}`, W - 240, 74, { size: 11, color: 'rgba(255,255,255,0.6)' });
    else drawText(ctx, 'MAX LEVEL', W - 240, 74, { size: 11, color: '#ffd166' });

    const entries = this.entries();
    // path dots
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < entries.length - 1; i++) {
      const a = this.nodePos(i);
      const b = this.nodePos(i + 1);
      for (let d = 1; d < 5; d++) {
        ctx.beginPath();
        ctx.arc(a.x + ((b.x - a.x) * d) / 5, a.y + ((b.y - a.y) * d) / 5, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    entries.forEach((e, i) => {
      const { x, y } = this.nodePos(i);
      const unlocked = this.isUnlocked(i);
      const cleared = !e.bossRush && !!save.clearedLevels[e.level.n];
      const sel = i === this.cursor;
      const shake = sel && this.denyT > 0 ? Math.sin(this.t * 60) * 3 : 0;
      ctx.beginPath();
      ctx.arc(x + shake, y, 26, 0, Math.PI * 2);
      ctx.fillStyle = e.bossRush ? '#4a1a2e' : unlocked ? e.level.theme.near : '#22242e';
      ctx.fill();
      ctx.strokeStyle = sel ? `rgba(255,209,102,${0.6 + Math.sin(this.t * 6) * 0.4})` : 'rgba(255,255,255,0.35)';
      ctx.lineWidth = sel ? 3.5 : 1.5;
      ctx.stroke();
      if (e.bossRush) {
        drawText(ctx, '∞', x + shake, y + 7, { size: 24, color: '#ff5566', align: 'center' });
      } else if (e.farm && unlocked) {
        drawText(ctx, '✚', x + shake, y + 7, { size: 20, color: '#b58fdf', align: 'center' });
      } else if (!unlocked) {
        drawText(ctx, '🔒', x + shake, y + 6, { size: 16, align: 'center', outline: false });
      } else {
        drawText(ctx, String(e.level.n), x + shake, y + 6, { size: 18, color: '#fff', align: 'center' });
        if (cleared) drawText(ctx, '✔', x + 18, y - 14, { size: 14, color: '#6fe3a0', align: 'center' });
      }
    });

    // info card
    const e = entries[this.cursor];
    panel(ctx, 40, 370, 620, 130);
    if (e.bossRush) {
      drawText(ctx, 'BOSS RUSH', 60, 402, { size: 20, color: '#ff5566' });
      drawText(ctx, 'Every boss, back to back. No checkpoints. Good luck.', 60, 430, { size: 13, color: '#fff' });
      drawText(ctx, 'Reward: 300 XP per full clear', 60, 454, { size: 12, color: '#8be9fd' });
    } else if (e.farm) {
      drawText(ctx, 'BONUS: CURSED HARVEST', 60, 402, { size: 18, color: '#b58fdf' });
      drawText(ctx, 'No boss — a street full of people and lesser curses.', 60, 430, { size: 13, color: '#fff' });
      drawText(ctx, 'Stock up Geto & Mahito, then reach the glowing gate to bank it all.', 60, 454, { size: 12, color: '#8be9fd' });
      drawText(ctx, this.isUnlocked(this.cursor) ? 'Enter to harvest (replayable)' : 'Clear level 1 to unlock', 60, 480, {
        size: 12, color: this.isUnlocked(this.cursor) ? '#6fe3a0' : 'rgba(255,255,255,0.5)',
      });
    } else {
      const lvl = e.level;
      const boss = byId[lvl.bossId];
      drawText(ctx, `LEVEL ${lvl.n}: ${lvl.name.toUpperCase()}`, 60, 402, { size: 18, color: '#ffd166' });
      drawText(ctx, `BOSS: ${boss.name.toUpperCase()}`, 60, 430, { size: 14, color: '#ffb3bb' });
      const cleared = !!save.clearedLevels[lvl.n];
      drawText(ctx, `First clear: ${lvl.xpFirst} XP   Replay: ${lvl.xpReplay} XP`, 60, 454, { size: 12, color: '#8be9fd' });
      drawText(ctx, this.isUnlocked(this.cursor) ? (cleared ? 'CLEARED ✔ — Enter to replay' : 'Enter to fight') : `Clear level ${lvl.n - 1} to unlock`, 60, 480, {
        size: 12, color: this.isUnlocked(this.cursor) ? '#6fe3a0' : 'rgba(255,255,255,0.5)',
      });
      drawPortrait(ctx, boss, 590, 480, 1.5, this.t);
    }
    drawText(ctx, '[Enter] Choose fighter   [Esc] Title', W - 40, H - 16, { size: 12, color: 'rgba(255,255,255,0.6)', align: 'right' });
    effects.drawScreen(ctx);
  }
}
