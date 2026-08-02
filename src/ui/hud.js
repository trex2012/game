import { W } from '../engine/constants.js';
import { drawText, drawBar } from './text.js';
import { drawPortrait } from '../entities/chibi.js';
import { DOMAIN_MAX, ENERGY_MAX } from '../engine/constants.js';

export function drawHud(ctx, world) {
  const p = world.player;
  if (!p) return;

  // portrait chip
  ctx.save();
  ctx.beginPath();
  ctx.arc(34, 34, 22, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.fill();
  ctx.clip();
  drawPortrait(ctx, p.def, 34, 56, 0.72, p.animT);
  ctx.restore();
  ctx.strokeStyle = p.hp / p.maxHp < 0.25 ? '#ff5566' : 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(34, 34, 22, 0, Math.PI * 2);
  ctx.stroke();

  // HP
  const hpFrac = Math.max(0, p.hp / p.maxHp);
  const hpColor = hpFrac > 0.5 ? '#6fe3a0' : hpFrac > 0.25 ? '#ffd166' : '#ff5566';
  drawBar(ctx, 66, 18, 200, 14, hpFrac, hpColor);
  drawText(ctx, `${Math.ceil(Math.max(0, p.hp))}`, 270, 30, { size: 12, color: '#fff' });

  // energy (super) with cost tick
  drawBar(ctx, 66, 38, 150, 9, p.energy / ENERGY_MAX, '#4aa3df');
  const cost = Math.min(ENERGY_MAX, (p.def.super.cost ?? 30) * (p.def.superCostMult ?? 1));
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(66 + 150 * (cost / ENERGY_MAX) - 1, 37, 2, 11);

  // domain diamond
  const dFrac = p.domainCharge / DOMAIN_MAX;
  const ready = dFrac >= 1;
  const half = dFrac >= 0.5;
  ctx.save();
  ctx.translate(232, 42);
  ctx.rotate(Math.PI / 4);
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(-8, -8, 16, 16);
  ctx.fillStyle = ready
    ? `rgba(255,209,102,${0.7 + Math.sin(performance.now() / 120) * 0.3})`
    : half ? '#b58fdf' : '#5a4a7a';
  ctx.fillRect(-8, 8 - 16 * dFrac, 16, 16 * dFrac);
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-8, -8, 16, 16);
  ctx.restore();
  if (ready) drawText(ctx, 'R', 226, 47, { size: 11, color: '#1a1208' });
  else if (half && !p.def.domain) drawText(ctx, 'SD', 224, 47, { size: 8, color: '#fff' });

  // character-specific pips (Geto storage, AFO stolen power...)
  p.def.hooks?.hudExtra?.(ctx, p, 66, 58);

  // boss bar (trio finale stacks one compact bar per boss, top-right)
  if (world.bosses) {
    world.bosses.forEach((b, i) => {
      const y = 16 + i * 26;
      drawText(ctx, b.def.name.toUpperCase(), W - 208, y + 8, {
        size: 10, color: b.alive ? '#ffb3bb' : 'rgba(255,255,255,0.35)', align: 'right',
      });
      drawBar(ctx, W - 200, y, 170, 8, Math.max(0, b.hp / b.maxHp), '#e0443e');
      if (b.alive) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.fillRect(W - 200 + 170 * 0.5 - 1, y - 1, 2, 10); // phase-2 tick
      } else {
        drawText(ctx, '✖', W - 22, y + 8, { size: 10, color: '#6fe3a0' });
      }
    });
  } else if (world.boss && world.boss.alive) {
    const boss = world.boss;
    drawText(ctx, boss.def.name.toUpperCase(), W / 2, 26, { size: 15, color: '#ffb3bb', align: 'center' });
    drawBar(ctx, W / 2 - 180, 32, 360, 11, Math.max(0, boss.hp / boss.maxHp), '#e0443e');
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(W / 2 - 180 + 360 * 0.5 - 1, 31, 2, 13); // phase-2 tick
  }

  // combo counter
  if (world.combo >= 3) {
    drawText(ctx, `x${world.combo} COMBO`, W - 30, 460, {
      size: 20 + Math.min(8, world.combo), color: '#ffd166', align: 'right',
    });
  }

  // low HP vignette
  if (hpFrac < 0.25 && p.alive) {
    const g = ctx.createRadialGradient(W / 2, 270, 200, W / 2, 270, 560);
    g.addColorStop(0, 'rgba(120,0,10,0)');
    g.addColorStop(1, `rgba(120,0,10,${0.25 + Math.sin(performance.now() / 300) * 0.08})`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, 540);
  }
}
