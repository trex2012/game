// Code-drawn chibi fighter renderer. Every character is drawn from a palette
// + hair style + optional drawExtras hook, in a local space where the feet
// are at (0,0) and the fighter faces +x. Chibi proportions: big head, small body.
//
// palette: { skin, hair, top, bottom, accent }
// hairStyle: 'messy' | 'spiky' | 'ponytail' | 'hedgehog' | 'swept' | 'buns'
//          | 'long' | 'choppy' | 'topbun' | 'shaggy' | 'antennae' | 'none'

const HEAD_R = 13;

export function drawFighter(ctx, f) {
  const def = f.def;
  const scale = def.scale ?? 1;
  const flash = f.flash > 0;
  const frozen = !!f.statuses?.frozen;
  const c = (col) => (flash ? '#ffffff' : col);

  // i-frame flicker
  if (f.invuln > 0 && Math.floor(f.invuln * 30) % 2 === 0 && f.alive) return;

  const moving = Math.abs(f.vx) > 30 && f.onGround;
  const run = moving ? Math.sin(f.animT * 14) : 0;
  const attacking = f.attackT > 0;
  const hurt = f.hitstun > 0;
  const airborne = !f.onGround;
  const squash = f.squashT > 0 ? (f.squashDir > 0 ? 0.88 : 1.1) : 1;

  ctx.save();
  ctx.translate(f.cx, f.y + f.h);
  ctx.scale(f.facing * scale, scale * squash);
  if (!f.alive) ctx.rotate(-Math.PI / 2);
  else if (hurt) ctx.rotate(-0.15);

  drawBody(ctx, {
    c,
    palette: def.palette,
    hairStyle: def.hairStyle ?? 'messy',
    run,
    attacking,
    airborne,
    hurt,
    tint: def.tint,
    convertTint: f.converted ? '#7d8ca3' : null,
  });

  def.drawExtras?.(ctx, f, c);

  if (frozen && !flash) {
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#9fd8ff';
    ctx.fillRect(-16, -54, 32, 54);
    // glitch bars
    ctx.fillStyle = '#e0f4ff';
    ctx.fillRect(-16, -40 + Math.sin(f.animT * 40) * 8, 32, 2);
    ctx.globalAlpha = 1;
  }
  ctx.restore();

  // Simple Domain circle
  if (f.simpleDomainT > 0) {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(f.cx, f.cy, 44 + Math.sin(f.animT * 6) * 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(160,220,255,0.4)';
    ctx.beginPath();
    ctx.arc(f.cx, f.cy, 50, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawBody(ctx, o) {
  const { c, palette: p, run, attacking, airborne, hurt } = o;
  const skin = c(p.skin ?? '#f2cfa5');
  const top = c(o.convertTint ?? p.top ?? '#3b4a6b');
  const bottom = c(o.convertTint ?? p.bottom ?? '#2c3550');
  const accent = c(p.accent ?? '#c0392b');
  const hair = c(o.convertTint ? '#5d6b80' : p.hair ?? '#222');

  // legs (feet at y=0)
  ctx.fillStyle = bottom;
  const legSwing = airborne ? 3 : run * 5;
  ctx.fillRect(-8 + legSwing, -14, 7, 14);
  ctx.fillRect(1 - legSwing, -14, 7, 14);
  // shoes
  ctx.fillStyle = accent;
  ctx.fillRect(-9 + legSwing, -4, 9, 4);
  ctx.fillRect(0 - legSwing, -4, 9, 4);

  // torso
  ctx.fillStyle = top;
  ctx.beginPath();
  ctx.roundRect(-10, -34, 20, 21, 5);
  ctx.fill();

  // arms
  ctx.fillStyle = top;
  if (attacking) {
    ctx.fillRect(2, -31, 16, 6); // punching arm forward
    ctx.fillStyle = skin;
    ctx.fillRect(16, -31, 5, 6); // fist
    ctx.fillStyle = top;
    ctx.fillRect(-12, -32, 5, 12);
  } else if (hurt) {
    ctx.fillRect(-13, -36, 5, 10);
    ctx.fillRect(8, -36, 5, 10);
  } else {
    ctx.fillRect(-13, -32, 5, 13 + run * 2);
    ctx.fillRect(8, -32, 5, 13 - run * 2);
  }

  // head
  ctx.fillStyle = skin;
  ctx.beginPath();
  ctx.arc(0, -34 - HEAD_R + 3, HEAD_R, 0, Math.PI * 2);
  ctx.fill();

  drawHair(ctx, o.hairStyle, hair, -34 - HEAD_R + 3);

  // eyes (facing +x)
  ctx.fillStyle = c('#1c2030');
  ctx.fillRect(3, -47, 3, 4);
  ctx.fillRect(9, -47, 3, 4);
}

function drawHair(ctx, style, hair, hy) {
  ctx.fillStyle = hair;
  switch (style) {
    case 'messy':
      for (const [dx, dy, r] of [[-7, -8, 7], [0, -11, 8], [7, -7, 7], [-11, -2, 5], [11, -3, 5]]) {
        ctx.beginPath();
        ctx.arc(dx, hy + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    case 'spiky':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 - 3, hy - 8);
        ctx.lineTo(i * 5, hy - 18);
        ctx.lineTo(i * 5 + 3, hy - 8);
        ctx.fill();
      }
      break;
    case 'ponytail':
      ctx.beginPath();
      ctx.arc(0, hy - 4, 12, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-12, hy - 8, 4, 9, 0.5, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'hedgehog':
      for (let i = -2; i <= 2; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 5 - 4, hy - 5);
        ctx.lineTo(i * 5 - 6, hy - 17 - Math.abs(i));
        ctx.lineTo(i * 5 + 2, hy - 6);
        ctx.fill();
      }
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      break;
    case 'swept':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI * 0.9, -0.1);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-10, hy - 6);
      ctx.quadraticCurveTo(2, hy - 18, 13, hy - 4);
      ctx.quadraticCurveTo(2, hy - 10, -10, hy - 2);
      ctx.fill();
      break;
    case 'buns':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(-5, hy - 16, 4, 8, 0, 0, Math.PI * 2);
      ctx.ellipse(5, hy - 16, 4, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    case 'long':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      ctx.fillRect(-13, hy - 4, 6, 24);
      ctx.fillRect(8, hy - 4, 6, 20);
      break;
    case 'choppy':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      for (let i = -2; i <= 2; i++) ctx.fillRect(i * 5 - 2, hy - 12, 4, 6);
      break;
    case 'topbun':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(0, hy - 16, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-13, hy - 2, 5, 18);
      break;
    case 'shaggy':
      for (const [dx, dy, r] of [[-8, -6, 7], [0, -9, 8], [8, -6, 7]]) {
        ctx.beginPath();
        ctx.arc(dx, hy + dy, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillRect(-13, hy - 4, 4, 14);
      ctx.fillRect(9, hy - 4, 4, 14);
      break;
    case 'antennae':
      ctx.beginPath();
      ctx.arc(0, hy - 3, 12, Math.PI, 0);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-4, hy - 8);
      ctx.lineTo(-9, hy - 24);
      ctx.lineTo(-1, hy - 9);
      ctx.moveTo(4, hy - 8);
      ctx.lineTo(9, hy - 24);
      ctx.lineTo(1, hy - 9);
      ctx.fill();
      break;
    case 'none':
      break;
  }
}

// Static portrait for menus/HUD. Draws the character standing, facing right,
// with feet at (x, y), scaled.
export function drawPortrait(ctx, def, x, y, scale = 1, animT = 0) {
  const fake = {
    def,
    cx: x,
    y: y - 54,
    h: 54,
    facing: 1,
    vx: 0,
    onGround: true,
    animT,
    attackT: 0,
    hitstun: 0,
    invuln: 0,
    flash: 0,
    alive: true,
    squashT: 0,
    statuses: {},
    simpleDomainT: 0,
    mem: {},
    world: null,
  };
  const prev = def.scale;
  def.scale = (def.scale ?? 1) * scale;
  drawFighter(ctx, fake);
  def.scale = prev;
}

// Grey locked silhouette for the character-select grid.
export function drawSilhouette(ctx, def, x, y, scale = 1) {
  ctx.save();
  ctx.filter = 'brightness(0.25) grayscale(1)';
  drawPortrait(ctx, def, x, y, scale);
  ctx.restore();
  ctx.filter = 'none';
}
