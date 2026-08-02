import { input } from './input.js';
import { audio } from './audio.js';

// On-screen touch controller for phones/tablets. Buttons synthesize the same
// key codes the keyboard produces, so the rest of the game needs no changes.
// Force on/off with ?touch=1 / ?touch=0.

export function isTouchDevice() {
  const p = new URLSearchParams(location.search).get('touch');
  if (p === '1') return true;
  if (p === '0') return false;
  return (
    matchMedia('(pointer: coarse)').matches ||
    'ontouchstart' in window ||
    (navigator.maxTouchPoints ?? 0) > 0
  );
}

const BUTTONS = [
  // movement is the drag joystick (left half of the screen) — see initStick
  // action cluster (bottom-right)
  { code: 'Space', label: '▲', hint: 'JUMP', css: { right: '18px', bottom: '18px' }, size: 72 },
  { code: 'KeyJ', label: '⚔', hint: 'ATK', css: { right: '104px', bottom: '18px' }, size: 64 },
  { code: 'KeyK', label: '✦', hint: 'SUPER', css: { right: '104px', bottom: '100px' }, size: 64 },
  { code: 'KeyL', label: '◈', hint: 'SPCL', css: { right: '18px', bottom: '104px' }, size: 60 },
  { code: 'KeyR', label: 'R', hint: 'DOMAIN', css: { right: '66px', bottom: '178px' }, size: 52 },
  { code: 'KeyH', label: '✺', hint: 'ULTRA', css: { right: '132px', bottom: '184px' }, size: 46 },
  { code: 'KeyI', label: '❖', hint: 'TECH', css: { right: '196px', bottom: '160px' }, size: 44 },
  // pause (top-right)
  { code: 'Escape', label: '❚❚', css: { right: '14px', top: '14px' }, size: 40 },
];

// Floating joystick: touch anywhere on the left half plants the stick there,
// dragging synthesizes held arrow keys / Space. Thresholds are in CSS pixels.
const STICK = { radius: 60, dead: 14, jumpUp: -32, dropDown: 36, baseSize: 124, knobSize: 56 };

function initStick(root) {
  const zone = document.createElement('div');
  zone.className = 'touch-stick-zone';
  const base = document.createElement('div');
  base.className = 'touch-stick-base';
  const knob = document.createElement('div');
  knob.className = 'touch-stick-knob';
  const hint = document.createElement('div');
  hint.className = 'stick-hint';
  hint.textContent = 'DRAG TO MOVE · UP = JUMP';
  root.append(zone, base, knob, hint);

  let active = null; // { id, x0, y0, t0, moved }
  const held = new Set();
  const set = (code, on) => {
    if (on && !held.has(code)) { held.add(code); input.simKeyDown(code); }
    else if (!on && held.has(code)) { held.delete(code); input.simKeyUp(code); }
  };
  const place = (el, size, x, y) => { el.style.transform = `translate(${x - size / 2}px, ${y - size / 2}px)`; };

  zone.addEventListener('pointerdown', (e) => {
    if (active) return; // one finger drives the stick; extras are ignored
    e.preventDefault();
    audio.ensure();
    zone.setPointerCapture?.(e.pointerId);
    active = { id: e.pointerId, x0: e.clientX, y0: e.clientY, t0: performance.now(), moved: false };
    base.classList.add('on');
    knob.classList.add('on');
    place(base, STICK.baseSize, e.clientX, e.clientY);
    place(knob, STICK.knobSize, e.clientX, e.clientY);
  });
  zone.addEventListener('pointermove', (e) => {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    const dx = e.clientX - active.x0;
    const dy = e.clientY - active.y0;
    const len = Math.hypot(dx, dy);
    if (len > STICK.dead) active.moved = true;
    set('ArrowLeft', dx < -STICK.dead);
    set('ArrowRight', dx > STICK.dead);
    set('Space', dy < STICK.jumpUp);
    set('ArrowDown', dy > STICK.dropDown);
    const c = len > 0 ? Math.min(len, STICK.radius) / len : 0;
    place(knob, STICK.knobSize, active.x0 + dx * c, active.y0 + dy * c);
  });
  const end = (e) => {
    if (!active || e.pointerId !== active.id) return;
    e.preventDefault();
    // a short touch that never left the dead zone is a tap — pass it to menus
    if (!active.moved && performance.now() - active.t0 < 300) input.tapAt(e.clientX, e.clientY);
    active = null;
    for (const code of [...held]) set(code, false);
    base.classList.remove('on');
    knob.classList.remove('on');
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('contextmenu', (e) => e.preventDefault());
}

export function initTouch() {
  if (!isTouchDevice()) return false;

  const root = document.createElement('div');
  root.className = 'touch-controls';

  initStick(root);

  for (const b of BUTTONS) {
    const el = document.createElement('div');
    el.className = 'touch-btn';
    el.style.width = el.style.height = `${b.size}px`;
    el.style.fontSize = `${Math.round(b.size * 0.4)}px`;
    Object.assign(el.style, b.css);
    el.textContent = b.label;
    if (b.hint) {
      const h = document.createElement('span');
      h.className = 'touch-hint';
      h.textContent = b.hint;
      el.appendChild(h);
    }

    const press = (e) => {
      e.preventDefault();
      el.setPointerCapture?.(e.pointerId);
      el.classList.add('pressed');
      audio.ensure();
      input.simKeyDown(b.code);
    };
    const release = (e) => {
      e.preventDefault();
      el.classList.remove('pressed');
      input.simKeyUp(b.code);
    };
    el.addEventListener('pointerdown', press);
    el.addEventListener('pointerup', release);
    el.addEventListener('pointercancel', release);
    el.addEventListener('contextmenu', (e) => e.preventDefault());
    root.appendChild(el);
  }

  const hint = document.createElement('div');
  hint.className = 'rotate-hint';
  hint.textContent = '↻ ROTATE YOUR DEVICE — LANDSCAPE PLAYS BEST';
  root.appendChild(hint);

  document.body.appendChild(root);
  return true;
}
