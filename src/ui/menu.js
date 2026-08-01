import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { drawText } from './text.js';

// Simple keyboard-driven vertical menu.
export class Menu {
  constructor(items) {
    this.items = items; // [{label, disabled?, hint?}]
    this.index = 0;
    this.t = 0;
  }

  update(dt) {
    this.t += dt;
    const n = this.items.length;
    if (input.pressed('down')) { this.index = (this.index + 1) % n; audio.sfx('blip'); }
    if (input.pressed('up')) { this.index = (this.index + n - 1) % n; audio.sfx('blip'); }
    if (input.pressed('confirm')) {
      if (this.items[this.index].disabled) { audio.sfx('deny'); return { action: 'denied', index: this.index }; }
      audio.sfx('confirm');
      return { action: 'confirm', index: this.index };
    }
    if (input.pressed('back')) return { action: 'back', index: this.index };
    return { action: null, index: this.index };
  }

  draw(ctx, x, y, opts = {}) {
    const spacing = opts.spacing ?? 34;
    const size = opts.size ?? 20;
    this.items.forEach((item, i) => {
      const sel = i === this.index;
      const color = item.disabled ? 'rgba(255,255,255,0.3)' : sel ? '#ffd166' : '#fff';
      const prefix = sel ? '▶ ' : '  ';
      drawText(ctx, prefix + item.label, x, y + i * spacing, { size, color, align: opts.align ?? 'center' });
      if (sel && item.hint) {
        drawText(ctx, item.hint, x, y + this.items.length * spacing + 16, {
          size: 12, color: 'rgba(255,255,255,0.6)', align: opts.align ?? 'center',
        });
      }
    });
  }
}
