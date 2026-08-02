import { Scene } from './scene.js';
import { W, H } from '../engine/constants.js';
import { drawText } from '../ui/text.js';
import { Menu } from '../ui/menu.js';
import { audio } from '../engine/audio.js';

export class DefeatScene extends Scene {
  enter(params) {
    this.params = params;
    this.t = 0;
    this.menu = new Menu([
      { label: params.fromBoss ? 'RETRY BOSS' : 'RETRY FROM CHECKPOINT' },
      { label: 'CHANGE CHARACTER' },
      { label: 'QUIT TO MAP' },
    ]);
    audio.sfx('defeat');
  }

  update(dt) {
    this.t += dt;
    const r = this.menu.update(dt);
    if (r.action === 'confirm') {
      const p = this.params;
      if (r.index === 0) {
        this.game.changeScene('level', {
          levelN: p.levelN, charId: p.charId, bossRush: p.bossRush, difficulty: p.difficulty,
          fromCheckpoint: p.fromCheckpoint, fromBoss: p.fromBoss,
        });
      } else if (r.index === 1) {
        this.game.changeScene('charSelect', p.bossRush ? { bossRush: true } : { levelN: p.levelN, difficulty: p.difficulty });
      } else {
        this.game.changeScene('levelSelect');
      }
    } else if (r.action === 'back') {
      this.game.changeScene('levelSelect');
    }
  }

  draw(ctx) {
    ctx.fillStyle = '#100608';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(120,10,20,0.15)';
    ctx.fillRect(0, 0, W, H);
    const drop = Math.min(1, this.t * 3);
    drawText(ctx, 'DEFEATED...', W / 2, 100 + drop * 60, { size: 46, color: '#e0443e', align: 'center' });
    this.menu.draw(ctx, W / 2, 280, { align: 'center' });
    drawText(ctx, 'The strongest of today always loses to the sorcerer of tomorrow.', W / 2, H - 30, {
      size: 12, color: 'rgba(255,255,255,0.45)', align: 'center',
    });
  }
}
