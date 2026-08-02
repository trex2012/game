import { Scene } from './scene.js';
import { W, H, DEBUG } from '../engine/constants.js';
import { input } from '../engine/input.js';
import { drawText, drawBar, panel } from '../ui/text.js';
import { drawPortrait } from '../entities/chibi.js';
import { byId } from '../characters/index.js';
import { LEVELS, EX_LEVELS, FARM_LEVEL, NEST_LEVEL, SHIBUYA_LEVEL } from '../data/levels.js';
import { loadSave, writeSave } from '../engine/save.js';
import { levelForXp, xpIntoLevel, MAX_LEVEL, TRIO_DIFFICULTIES } from '../data/progression.js';
import { effects } from '../engine/effects.js';
import { Menu } from '../ui/menu.js';

const NODES_PER_ROW = 8;
const BACK_RECT = { x: 28, y: H - 38, w: 116, h: 32 };

export class LevelSelectScene extends Scene {
  enter() {
    const save = loadSave();
    this.cursor = Math.min(save.lastLevel, LEVELS.length) - 1;
    this.t = 0;
    this.denyT = 0;
    this.diffMenu = null; // Shibuya Incident difficulty picker overlay
  }

  bossRushUnlocked() {
    return DEBUG || levelForXp(loadSave().xp) >= MAX_LEVEL;
  }

  entries() {
    const list = LEVELS.map((l) => ({ level: l }));
    list.splice(1, 0, { level: FARM_LEVEL, farm: true }, { level: NEST_LEVEL, farm: true }); // bonus stages after level 1
    list.push({ level: SHIBUYA_LEVEL, trio: true }); // the finale, after level 12
    for (const l of EX_LEVELS) list.push({ level: l, ex: true }); // post-finale EX arc
    if (this.bossRushUnlocked()) list.push({ bossRush: true });
    return list;
  }

  isUnlocked(i) {
    if (DEBUG) return true;
    const save = loadSave();
    const e = this.entries()[i];
    if (e.bossRush) return true;
    if (e.farm) return !!save.clearedLevels[1];
    if (e.trio) return !!save.clearedLevels[12];
    return e.level.n === 1 || !!save.clearedLevels[e.level.n - 1];
  }

  openDifficultyPicker() {
    const rec = loadSave().clearedLevels[SHIBUYA_LEVEL.n];
    this.diffMenu = new Menu(TRIO_DIFFICULTIES.map((d) => ({
      label: d.name,
      hint: `${d.blurb}${d.xpBonus ? `   +${d.xpBonus} bonus XP` : ''}${rec?.diffs?.[d.id] ? '   CLEARED ✔' : ''}`,
    })));
  }

  update(dt) {
    this.t += dt;
    this.denyT = Math.max(0, this.denyT - dt);
    effects.update(dt);
    if (this.diffMenu) {
      const r = this.diffMenu.update(dt);
      if (r.action === 'back') this.diffMenu = null;
      else if (r.action === 'confirm') {
        const tier = TRIO_DIFFICULTIES[r.index];
        writeSave((s) => { s.lastLevel = SHIBUYA_LEVEL.n; });
        this.game.changeScene('charSelect', { levelN: SHIBUYA_LEVEL.n, difficulty: tier.id });
      }
      return;
    }
    const entries = this.entries();
    if (input.mouseIn(BACK_RECT.x, BACK_RECT.y, BACK_RECT.w, BACK_RECT.h)) {
      input.mouse.hot = true;
      if (input.clicked()) { this.game.changeScene('title'); return; }
    }
    const hov = entries.findIndex((_, i) => {
      const { x, y } = this.nodePos(i);
      return input.mouseInCircle(x, y, 26);
    });
    if (hov >= 0) {
      input.mouse.hot = true;
      if (input.mouse.moved || input.mouse.click) this.cursor = hov;
      if (input.clicked()) { this.activate(); return; }
    }
    if (input.pressed('right')) this.cursor = Math.min(entries.length - 1, this.cursor + 1);
    if (input.pressed('left')) this.cursor = Math.max(0, this.cursor - 1);
    if (input.pressed('down')) this.cursor = Math.min(entries.length - 1, this.cursor + NODES_PER_ROW);
    if (input.pressed('up')) this.cursor = Math.max(0, this.cursor - NODES_PER_ROW);
    if (input.pressed('back')) { this.game.changeScene('title'); return; }
    if (input.pressed('confirm')) this.activate();
  }

  activate() {
    if (!this.isUnlocked(this.cursor)) {
      this.denyT = 0.3;
      return;
    }
    const e = this.entries()[this.cursor];
    if (e.trio) { this.openDifficultyPicker(); return; }
    writeSave((s) => { s.lastLevel = e.bossRush || e.farm ? 1 : e.level.n; });
    this.game.changeScene('charSelect', e.bossRush ? { bossRush: true } : { levelN: e.level.n });
  }

  nodePos(i) {
    const row = Math.floor(i / NODES_PER_ROW);
    const col = i % NODES_PER_ROW;
    const x = 110 + (row % 2 === 0 ? col : NODES_PER_ROW - 1 - col) * 102;
    return { x, y: 150 + row * 88 };
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
        drawText(ctx, String(e.level.n), x + shake, y + 6, { size: 18, color: e.trio ? '#ff3860' : e.ex ? '#ffd166' : '#fff', align: 'center' });
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
      const lvl = e.level;
      drawText(ctx, `BONUS: ${lvl.name.toUpperCase()}`, 60, 402, { size: 18, color: '#b58fdf' });
      drawText(ctx, lvl.cardLines?.[0] ?? '', 60, 430, { size: 13, color: '#fff' });
      drawText(ctx, lvl.cardLines?.[1] ?? '', 60, 454, { size: 12, color: '#8be9fd' });
      drawText(ctx, this.isUnlocked(this.cursor) ? 'Enter to harvest (replayable)' : 'Clear level 1 to unlock', 60, 480, {
        size: 12, color: this.isUnlocked(this.cursor) ? '#6fe3a0' : 'rgba(255,255,255,0.5)',
      });
    } else if (e.trio) {
      const lvl = e.level;
      drawText(ctx, `FINALE: ${lvl.name.toUpperCase()}`, 60, 402, { size: 18, color: '#ff3860' });
      drawText(ctx, lvl.cardLines?.[0] ?? '', 60, 430, { size: 13, color: '#fff' });
      drawText(ctx, lvl.cardLines?.[1] ?? '', 60, 454, { size: 12, color: '#8be9fd' });
      const rec = save.clearedLevels[lvl.n];
      const ticks = TRIO_DIFFICULTIES.map((d) => `${rec?.diffs?.[d.id] ? '✔' : '·'} ${d.name}`).join('   ');
      drawText(ctx, this.isUnlocked(this.cursor) ? ticks : 'Clear level 12 to unlock', 60, 480, {
        size: 11.5, color: this.isUnlocked(this.cursor) ? '#6fe3a0' : 'rgba(255,255,255,0.5)',
      });
      lvl.bossIds.forEach((id, i) => drawPortrait(ctx, byId[id], 500 + i * 58, 480, 1.1, this.t + i));
    } else {
      const lvl = e.level;
      const boss = byId[lvl.bossId];
      drawText(ctx, `${e.ex ? 'EX LEVEL' : 'LEVEL'} ${lvl.n}: ${lvl.name.toUpperCase()}`, 60, 402, { size: 18, color: '#ffd166' });
      drawText(ctx, `BOSS: ${boss.name.toUpperCase()}`, 60, 430, { size: 14, color: '#ffb3bb' });
      const cleared = !!save.clearedLevels[lvl.n];
      drawText(ctx, `First clear: ${lvl.xpFirst} XP   Replay: ${lvl.xpReplay} XP`, 60, 454, { size: 12, color: '#8be9fd' });
      drawText(ctx, this.isUnlocked(this.cursor) ? (cleared ? 'CLEARED ✔ — Enter to replay' : 'Enter to fight') : `Clear level ${lvl.n - 1} to unlock`, 60, 480, {
        size: 12, color: this.isUnlocked(this.cursor) ? '#6fe3a0' : 'rgba(255,255,255,0.5)',
      });
      drawPortrait(ctx, boss, 590, 480, 1.5, this.t);
    }
    const backHov = input.mouseIn(BACK_RECT.x, BACK_RECT.y, BACK_RECT.w, BACK_RECT.h);
    drawText(ctx, '⬅ TITLE', 40, H - 14, { size: 15, color: backHov ? '#ffd166' : 'rgba(255,255,255,0.75)' });
    drawText(ctx, 'Click a level or [Enter] Choose fighter   [Esc] Title', W - 40, H - 16, { size: 12, color: 'rgba(255,255,255,0.6)', align: 'right' });

    if (this.diffMenu) {
      ctx.fillStyle = 'rgba(0,0,0,0.7)';
      ctx.fillRect(0, 0, W, H);
      panel(ctx, W / 2 - 280, 110, 560, 320);
      drawText(ctx, 'THE SHIBUYA INCIDENT', W / 2, 150, { size: 24, color: '#ff3860', align: 'center' });
      drawText(ctx, 'HOW STRONG ARE THEY TONIGHT?', W / 2, 178, { size: 12, color: 'rgba(255,255,255,0.7)', align: 'center' });
      this.diffMenu.draw(ctx, W / 2, 224, { align: 'center', spacing: 36, size: 19 });
      drawText(ctx, '[Enter] Confirm   [Esc] Back', W / 2, 452, { size: 12, color: 'rgba(255,255,255,0.6)', align: 'center' });
    }
    effects.drawScreen(ctx);
  }
}
