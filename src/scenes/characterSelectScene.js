import { Scene } from './scene.js';
import { W, H } from '../engine/constants.js';
import { input } from '../engine/input.js';
import { drawText, panel } from '../ui/text.js';
import { drawPortrait } from '../entities/chibi.js';
import { ROSTER } from '../characters/index.js';
import { loadSave, writeSave } from '../engine/save.js';
import { levelForXp, isUnlocked } from '../data/progression.js';
import { effects } from '../engine/effects.js';

const COLS = 10; // 20 fighters -> two rows of 10
const BACK_RECT = { x: 28, y: H - 38, w: 116, h: 32 };

export class CharacterSelectScene extends Scene {
  enter(params) {
    this.params = params; // {levelN} or {bossRush:true}
    const save = loadSave();
    const idx = ROSTER.findIndex((d) => d.id === save.lastCharacter);
    this.cursor = idx >= 0 ? idx : 0;
    this.t = 0;
    this.denyT = 0;
  }

  cellRect(i) {
    const cellW = 96;
    const startX = W / 2 - (COLS * cellW) / 2 + cellW / 2;
    const x = startX + (i % COLS) * cellW;
    const y = 90 + Math.floor(i / COLS) * 122;
    return { x: x - 48, y, w: 96, h: 108 };
  }

  update(dt) {
    this.t += dt;
    this.denyT = Math.max(0, this.denyT - dt);
    effects.update(dt);
    if (input.mouseIn(BACK_RECT.x, BACK_RECT.y, BACK_RECT.w, BACK_RECT.h)) {
      input.mouse.hot = true;
      if (input.clicked()) { this.game.changeScene('levelSelect'); return; }
    }
    const hov = ROSTER.findIndex((_, i) => {
      const r = this.cellRect(i);
      return input.mouseIn(r.x, r.y, r.w, r.h);
    });
    if (hov >= 0) {
      input.mouse.hot = true;
      if (input.mouse.moved || input.mouse.click) this.cursor = hov;
      if (input.clicked()) { this.pick(); return; }
    }
    if (input.pressed('right')) this.cursor = (this.cursor + 1) % ROSTER.length;
    if (input.pressed('left')) this.cursor = (this.cursor + ROSTER.length - 1) % ROSTER.length;
    if (input.pressed('down')) this.cursor = Math.min(ROSTER.length - 1, this.cursor + COLS);
    if (input.pressed('up')) this.cursor = Math.max(0, this.cursor - COLS);
    if (input.pressed('back')) { this.game.changeScene('levelSelect'); return; }
    if (input.pressed('confirm')) this.pick();
  }

  pick() {
    const def = ROSTER[this.cursor];
    const acct = levelForXp(loadSave().xp);
    if (!isUnlocked(def, acct)) {
      this.denyT = 0.35;
      return;
    }
    writeSave((s) => {
      s.lastCharacter = def.id;
      if (!s.seenUnlocks.includes(def.id)) s.seenUnlocks.push(def.id);
    });
    this.game.changeScene('level', { ...this.params, charId: def.id });
  }

  draw(ctx) {
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#161226');
    g.addColorStop(1, '#28203a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);

    drawText(ctx, 'CHOOSE YOUR FIGHTER', W / 2, 46, { size: 26, color: '#ffd166', align: 'center' });

    const save = loadSave();
    const acct = levelForXp(save.xp);
    const cellW = 96;
    const startX = W / 2 - (COLS * cellW) / 2 + cellW / 2;

    ROSTER.forEach((def, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const x = startX + col * cellW;
      const y = 90 + row * 122;
      const unlocked = isUnlocked(def, acct);
      const sel = i === this.cursor;
      const shake = sel && this.denyT > 0 ? Math.sin(this.t * 60) * 4 : 0;

      panel(ctx, x - 48 + shake, y, 96, 108, {
        fill: sel ? 'rgba(60,50,20,0.9)' : 'rgba(10,12,24,0.8)',
        strokeColor: sel ? '#ffd166' : 'rgba(255,255,255,0.2)',
      });
      if (unlocked) {
        drawPortrait(ctx, def, x + shake, y + 78, 1.15, sel ? this.t : 0);
        if (!save.seenUnlocks.includes(def.id)) {
          drawText(ctx, 'NEW!', x + 30 + shake, y + 16, { size: 11, color: '#ffd166', align: 'center' });
        }
      } else {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.filter = 'grayscale(1) brightness(0.3)';
        drawPortrait(ctx, def, x + shake, y + 78, 1.15);
        ctx.restore();
        ctx.filter = 'none';
        drawText(ctx, `Lv ${def.unlockLevel}`, x + shake, y + 20, { size: 11, color: '#ffb3bb', align: 'center' });
      }
      drawText(ctx, def.name.split(' ')[0].toUpperCase(), x + shake, y + 100, {
        size: 10.5, color: unlocked ? '#fff' : 'rgba(255,255,255,0.4)', align: 'center',
      });
    });

    // info card
    const def = ROSTER[this.cursor];
    const unlocked = isUnlocked(def, acct);
    panel(ctx, 60, 348, W - 120, 152);
    drawPortrait(ctx, def, 130, 480, 1.9, this.t);
    drawText(ctx, `${def.name.toUpperCase()}  —  ${def.series}`, 210, 380, { size: 18, color: '#ffd166' });
    const INFO_W = W - 120 - 150 - 16; // panel right edge minus text x, minus padding
    const basicDesc = def.moves?.[0]?.desc ?? '';
    drawText(ctx, `BASIC: ${def.basic.name} — ${basicDesc}`, 210, 406, { size: 12, color: '#fff', maxWidth: INFO_W });
    drawText(ctx, `SUPER: ${def.super.name} — ${def.super.desc ?? ''}`, 210, 428, { size: 12, color: '#8be9fd', maxWidth: INFO_W });
    drawText(
      ctx,
      def.domain
        ? `DOMAIN (R): ${def.domain.name} — ${def.domain.desc}`
        : 'DOMAIN: — (R casts Simple Domain to survive enemy domains)',
      210, 450,
      { size: 12, color: def.domain ? '#c58fff' : 'rgba(255,255,255,0.55)', maxWidth: INFO_W },
    );
    if (def.ultra) drawText(ctx, `ULTRA (H): ${def.ultra.name} — ${def.ultra.desc ?? ''}`, 210, 472, { size: 11.5, color: '#ffd166', maxWidth: INFO_W });
    if (def.tech) drawText(ctx, `TECH (I): ${def.tech.name} — ${def.tech.desc ?? ''}`, 210, 492, { size: 11.5, color: '#8be9fd', maxWidth: INFO_W });
    if (!unlocked) {
      drawText(ctx, `🔒 UNLOCKS AT ACCOUNT LEVEL ${def.unlockLevel}`, W - 90, 380, { size: 13, color: '#ffb3bb', align: 'right' });
    }

    const backHov = input.mouseIn(BACK_RECT.x, BACK_RECT.y, BACK_RECT.w, BACK_RECT.h);
    drawText(ctx, '⬅ BACK', 40, H - 14, { size: 15, color: backHov ? '#ffd166' : 'rgba(255,255,255,0.75)' });
    drawText(ctx, 'Click a fighter or [Enter] Select   [Esc] Back', W - 40, H - 12, { size: 12, color: 'rgba(255,255,255,0.6)', align: 'right' });
    effects.drawScreen(ctx);
  }
}
