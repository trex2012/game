import { W, H, KO_SLOWMO } from './constants.js';
import { rand, choice } from './utils.js';

// All screen juice lives here: particles, damage numbers, hit-pause, slow-mo,
// flashes, banners, toasts, beams/slashes, afterimages.
class Effects {
  constructor() {
    this.reset();
    this.settings = { screenShake: true, damageNumbers: true };
  }

  reset() {
    this.particles = [];
    this.numbers = [];
    this.beams = [];
    this.slashes = [];
    this.ghosts = [];
    this.freezeFrames = 0;
    this.timeScale = 1;
    this.slowmoT = 0;
    this.flashT = 0;
    this.flashColor = '#fff';
    this.banner = null; // {text, sub, color, t, dur}
    this.toasts = [];
  }

  hitPause(frames) {
    this.freezeFrames = Math.max(this.freezeFrames, frames);
  }

  slowmo(dur) {
    this.slowmoT = Math.max(this.slowmoT, dur);
    this.timeScale = KO_SLOWMO;
  }

  flash(dur = 0.1, color = '#fff') {
    this.flashT = Math.max(this.flashT, dur);
    this.flashColor = color;
  }

  showBanner(text, color = '#fff', sub = '', dur = 1.6) {
    this.banner = { text, sub, color, t: 0, dur };
  }

  toast(text, dur = 1.4) {
    this.toasts.push({ text, t: dur });
  }

  burst(x, y, color, n = 8, opts = {}) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const sp = rand(40, opts.speed ?? 220);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - (opts.up ?? 60),
        life: rand(0.25, opts.life ?? 0.55),
        maxLife: 0.55,
        size: rand(2, opts.size ?? 5),
        color: Array.isArray(color) ? choice(color) : color,
        gravity: opts.gravity ?? 500,
        ring: false,
      });
    }
  }

  ring(x, y, color, radius = 90, dur = 0.35) {
    this.particles.push({ x, y, ring: true, color, life: dur, maxLife: dur, size: radius });
  }

  ambient(x, y, color, type) {
    // slow drifting petal/ember/ash particle
    this.particles.push({
      x, y,
      vx: rand(-25, 25), vy: type === 'ember' ? rand(-60, -20) : rand(10, 40),
      life: rand(2, 4), maxLife: 4, size: rand(2, 4), color,
      gravity: 0, ring: false, wobble: rand(0, Math.PI * 2),
    });
  }

  number(x, y, amount, color = '#ffe066') {
    if (!this.settings.damageNumbers) return;
    this.numbers.push({ x: x + rand(-8, 8), y, vy: -80, text: String(amount), color, life: 0.7 });
  }

  beam(x, y, dir, length, color = '#ff3355', thickness = 10) {
    this.beams.push({ x, y, dir, length, color, thickness, life: 0.18, maxLife: 0.18 });
  }

  slash(x1, y1, x2, y2, color = '#fff') {
    this.slashes.push({ x1, y1, x2, y2, color, life: 0.15, maxLife: 0.15 });
  }

  ghost(snapshot) {
    this.ghosts.push({ ...snapshot, life: 0.3, maxLife: 0.3 });
  }

  update(dt) {
    if (this.slowmoT > 0) {
      this.slowmoT -= dt;
      if (this.slowmoT <= 0) this.timeScale = 1;
    }
    this.flashT = Math.max(0, this.flashT - dt);
    if (this.banner) {
      this.banner.t += dt;
      if (this.banner.t > this.banner.dur) this.banner = null;
    }
    for (const t of this.toasts) t.t -= dt;
    this.toasts = this.toasts.filter((t) => t.t > 0);

    for (const p of this.particles) {
      p.life -= dt;
      if (p.ring) continue;
      p.vy += (p.gravity ?? 0) * dt;
      if (p.wobble !== undefined) { p.wobble += dt * 3; p.x += Math.sin(p.wobble) * 20 * dt; }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);

    for (const n of this.numbers) { n.y += n.vy * dt; n.vy += 60 * dt; n.life -= dt; }
    this.numbers = this.numbers.filter((n) => n.life > 0);
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter((b) => b.life > 0);
    for (const s of this.slashes) s.life -= dt;
    this.slashes = this.slashes.filter((s) => s.life > 0);
    for (const g of this.ghosts) g.life -= dt;
    this.ghosts = this.ghosts.filter((g) => g.life > 0);
  }

  // Drawn inside the camera transform (world space)
  drawWorld(ctx) {
    for (const g of this.ghosts) {
      const a = (g.life / g.maxLife) * 0.35;
      ctx.globalAlpha = a;
      ctx.fillStyle = g.color ?? '#8be9fd';
      ctx.beginPath();
      ctx.roundRect(g.x, g.y + 14, g.w, g.h - 14, 6);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(g.x + g.w / 2, g.y + 12, 13, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const b of this.beams) {
      const a = b.life / b.maxLife;
      ctx.globalAlpha = a;
      ctx.fillStyle = b.color;
      const len = b.length * b.dir;
      ctx.fillRect(b.dir > 0 ? b.x : b.x + len, b.y - b.thickness / 2, Math.abs(len), b.thickness);
      ctx.fillStyle = '#fff';
      ctx.fillRect(b.dir > 0 ? b.x : b.x + len, b.y - b.thickness / 6, Math.abs(len), b.thickness / 3);
      ctx.globalAlpha = 1;
    }
    for (const s of this.slashes) {
      ctx.globalAlpha = s.life / s.maxLife;
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(s.x1, s.y1);
      ctx.lineTo(s.x2, s.y2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    for (const p of this.particles) {
      const a = Math.max(0, p.life / p.maxLife);
      ctx.globalAlpha = a;
      if (p.ring) {
        const r = p.size * (1 - p.life / p.maxLife) + 10;
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
      ctx.globalAlpha = 1;
    }
    for (const n of this.numbers) {
      ctx.globalAlpha = Math.min(1, n.life * 3);
      ctx.font = 'bold 15px monospace';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.strokeText(n.text, n.x, n.y);
      ctx.fillStyle = n.color;
      ctx.fillText(n.text, n.x, n.y);
      ctx.globalAlpha = 1;
    }
  }

  // Drawn in screen space (after camera reset)
  drawScreen(ctx) {
    if (this.flashT > 0) {
      ctx.globalAlpha = Math.min(1, this.flashT * 6);
      ctx.fillStyle = this.flashColor;
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 1;
    }
    if (this.banner) {
      const b = this.banner;
      const inT = 0.18;
      const slide = b.t < inT ? b.t / inT : b.t > b.dur - 0.3 ? Math.max(0, (b.dur - b.t) / 0.3) : 1;
      ctx.globalAlpha = slide;
      ctx.fillStyle = 'rgba(0,0,0,0.65)';
      ctx.fillRect(0, 190, W, 110);
      ctx.textAlign = 'center';
      ctx.font = 'bold 34px monospace';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 6;
      ctx.strokeText(b.text, W / 2, 240);
      ctx.fillStyle = b.color;
      ctx.fillText(b.text, W / 2, 240);
      if (b.sub) {
        ctx.font = 'bold 16px monospace';
        ctx.fillStyle = '#fff';
        ctx.fillText(b.sub, W / 2, 275);
      }
      ctx.globalAlpha = 1;
    }
    let ty = 120;
    for (const t of this.toasts) {
      ctx.globalAlpha = Math.min(1, t.t * 3);
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 4;
      ctx.strokeText(t.text, W / 2, ty);
      ctx.fillStyle = '#ffe066';
      ctx.fillText(t.text, W / 2, ty);
      ctx.globalAlpha = 1;
      ty += 24;
    }
  }
}

export const effects = new Effects();
