import { input } from '../engine/input.js';
import { audio } from '../engine/audio.js';
import { drawText } from './text.js';

// Vertical menu driven by keyboard or mouse (hover selects, click confirms).
export class Menu {
  constructor(items) {
    this.items = items; // [{label, disabled?, hint?}]
    this.index = 0;
    this.t = 0;
    this.rects = null; // item hitboxes, recorded on draw
  }

  update(dt) {
    this.t += dt;
    const n = this.items.length;
    if (this.rects) {
      const hov = this.rects.findIndex((r) => input.mouseIn(r.x, r.y, r.w, r.h));
      if (hov >= 0) {
        input.mouse.hot = true;
        if (hov !== this.index && (input.mouse.moved || input.mouse.click)) { this.index = hov; audio.sfx('blip'); }
        if (input.clicked()) {
          if (this.items[hov].disabled) { audio.sfx('deny'); return { action: 'denied', index: hov }; }
          audio.sfx('confirm');
          return { action: 'confirm', index: hov };
        }
      }
    }
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
    const align = opts.align ?? 'center';
    this.rects = [];
    this.items.forEach((item, i) => {
      const sel = i === this.index;
      const color = item.disabled ? 'rgba(255,255,255,0.3)' : sel ? '#ffd166' : '#fff';
      const prefix = sel ? '▶ ' : '  ';
      drawText(ctx, prefix + item.label, x, y + i * spacing, { size, color, align });
      const w = ctx.measureText('▶ ' + item.label).width + 16;
      this.rects.push({
        x: align === 'center' ? x - w / 2 : align === 'right' ? x - w : x - 8,
        y: y + i * spacing - size,
        w,
        h: spacing,
      });
      if (sel && item.hint) {
        drawText(ctx, item.hint, x, y + this.items.length * spacing + 16, {
          size: 12, color: 'rgba(255,255,255,0.6)', align: opts.align ?? 'center',
        });
      }
    });
  }
}
