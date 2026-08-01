import { Scene } from './scene.js';
import { W, H } from '../engine/constants.js';
import { drawText } from '../ui/text.js';
import { Menu } from '../ui/menu.js';
import { drawPortrait } from '../entities/chibi.js';
import { byId } from '../characters/index.js';
import { loadSave, resetSave } from '../engine/save.js';
import { levelForXp } from '../data/progression.js';
import { effects } from '../engine/effects.js';
import { rand } from '../engine/utils.js';

export class TitleScene extends Scene {
  enter() {
    this.menu = new Menu([
      { label: 'START' },
      { label: 'RESET SAVE', hint: 'press twice to confirm' },
    ]);
    this.t = 0;
    this.confirmReset = 0;
  }

  update(dt) {
    this.t += dt;
    this.confirmReset = Math.max(0, this.confirmReset - dt);
    effects.update(dt);
    if (Math.random() < 0.1) effects.ambient(rand(0, W), -10, '#e8a0b8', 'petal');

    const r = this.menu.update(dt);
    if (r.action === 'confirm') {
      if (r.index === 0) this.game.changeScene('levelSelect');
      else if (this.confirmReset > 0) {
        resetSave();
        effects.toast('SAVE RESET');
        this.confirmReset = 0;
      } else {
        this.confirmReset = 2;
      }
    }
  }

  draw(ctx) {
    // night sky gradient + skyline
    const g = ctx.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#141830');
    g.addColorStop(1, '#3a2a50');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#0e0f20';
    for (let i = 0; i < 12; i++) {
      const bw = 60 + ((i * 37) % 60);
      const bh = 90 + ((i * 71) % 160);
      ctx.fillRect(i * 84, H - bh - 40, bw, bh + 40);
    }
    ctx.fillStyle = '#1c1430';
    ctx.fillRect(0, H - 50, W, 50);

    effects.drawWorld(ctx);

    const bob = Math.sin(this.t * 2) * 4;
    drawText(ctx, 'HEROES × CURSES', W / 2, 150 + bob, { size: 52, color: '#ffd166', align: 'center' });
    drawText(ctx, 'MY HERO ACADEMIA × JUJUTSU KAISEN — PLATFORM BRAWLER', W / 2, 185 + bob, {
      size: 13, color: '#9fd8ff', align: 'center',
    });

    const save = loadSave();
    drawText(ctx, `ACCOUNT LEVEL ${levelForXp(save.xp)}`, W / 2, 220, { size: 14, color: '#fff', align: 'center' });

    this.menu.draw(ctx, W / 2, 300, { align: 'center' });
    if (this.confirmReset > 0) {
      drawText(ctx, 'PRESS AGAIN TO WIPE ALL PROGRESS!', W / 2, 380, { size: 14, color: '#ff5566', align: 'center' });
    }

    // idle starters at the corners
    drawPortrait(ctx, byId.deku, 110, 470, 1.6, this.t);
    ctx.save();
    ctx.translate(W - 110, 0);
    ctx.scale(-1, 1);
    drawPortrait(ctx, byId.yuji, 0, 470, 1.6, this.t + 2);
    ctx.restore();

    drawText(ctx, 'MOVE: WASD/ARROWS   JUMP: SPACE   BASIC: J/Z   SUPER: K/X   SPECIAL: L/C   DOMAIN: R', W / 2, H - 16, {
      size: 11, color: 'rgba(255,255,255,0.6)', align: 'center',
    });
    effects.drawScreen(ctx);
  }
}
