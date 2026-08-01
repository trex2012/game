export function drawText(ctx, text, x, y, opts = {}) {
  const { size = 16, color = '#fff', align = 'left', outline = true, alpha = 1, bold = true } = opts;
  ctx.globalAlpha = alpha;
  ctx.font = `${bold ? 'bold ' : ''}${size}px monospace`;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (outline) {
    ctx.strokeStyle = 'rgba(0,0,0,0.85)';
    ctx.lineWidth = Math.max(3, size / 5);
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.globalAlpha = 1;
}

export function drawBar(ctx, x, y, w, h, frac, fg, bg = 'rgba(0,0,0,0.6)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

export function panel(ctx, x, y, w, h, opts = {}) {
  ctx.fillStyle = opts.fill ?? 'rgba(10,12,24,0.85)';
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, opts.r ?? 10);
  ctx.fill();
  if (opts.stroke !== false) {
    ctx.strokeStyle = opts.strokeColor ?? 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}
