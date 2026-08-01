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
  // movement cluster (bottom-left)
  { code: 'ArrowLeft', label: '◀', css: { left: '20px', bottom: '70px' }, size: 64 },
  { code: 'ArrowRight', label: '▶', css: { left: '104px', bottom: '70px' }, size: 64 },
  { code: 'ArrowDown', label: '▼', css: { left: '62px', bottom: '8px' }, size: 52 },
  // action cluster (bottom-right)
  { code: 'Space', label: '▲', hint: 'JUMP', css: { right: '18px', bottom: '18px' }, size: 72 },
  { code: 'KeyJ', label: '⚔', hint: 'ATK', css: { right: '104px', bottom: '18px' }, size: 64 },
  { code: 'KeyK', label: '✦', hint: 'SUPER', css: { right: '104px', bottom: '100px' }, size: 64 },
  { code: 'KeyL', label: '◈', hint: 'SPCL', css: { right: '18px', bottom: '104px' }, size: 60 },
  { code: 'KeyR', label: 'R', hint: 'DOMAIN', css: { right: '66px', bottom: '178px' }, size: 52 },
  { code: 'KeyH', label: '✺', hint: 'ULTRA', css: { right: '132px', bottom: '184px' }, size: 46 },
  // pause (top-right)
  { code: 'Escape', label: '❚❚', css: { right: '14px', top: '14px' }, size: 40 },
];

export function initTouch() {
  if (!isTouchDevice()) return false;

  const root = document.createElement('div');
  root.className = 'touch-controls';

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
