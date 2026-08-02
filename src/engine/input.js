import { W, H } from './constants.js';

// Keyboard -> named actions. Game code only ever asks about actions.
const MAP = {
  left: ['ArrowLeft', 'KeyA'],
  right: ['ArrowRight', 'KeyD'],
  up: ['ArrowUp', 'KeyW'],
  down: ['ArrowDown', 'KeyS'],
  jump: ['Space', 'ArrowUp', 'KeyW'],
  basic: ['KeyJ', 'KeyZ'],
  super: ['KeyK', 'KeyX'],
  special: ['KeyL', 'KeyC'],
  domain: ['KeyR'],
  ultra: ['KeyH'],
  tech: ['KeyI'],
  pause: ['Escape', 'KeyP'],
  confirm: ['Enter', 'Space', 'KeyJ', 'KeyZ'],
  back: ['Escape', 'Backspace'],
};

const ALL_CODES = new Set(Object.values(MAP).flat());
const DOUBLE_TAP_WINDOW = 0.25;

class Input {
  constructor() {
    this.held = new Set();
    this.edges = new Set();      // actions pressed since last endStep
    this.doubleTaps = new Set(); // 'left'/'right' double-tap edges
    this.lastTap = { left: -1, right: -1 };
    this.now = 0;
    // Mouse in logical W x H coords. click/moved are edges cleared each step;
    // hot = "hovering something clickable this step" -> pointer cursor.
    this.mouse = { x: -1000, y: -1000, click: false, moved: false, hot: false };
    this._canvas = null;
  }

  attach(target) {
    target.addEventListener('keydown', (e) => {
      if (ALL_CODES.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.simKeyDown(e.code);
    });
    target.addEventListener('keyup', (e) => this.simKeyUp(e.code));
    target.addEventListener('blur', () => this.held.clear());
  }

  attachMouse(canvas) {
    this._canvas = canvas;
    const toLogical = (e) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) * W) / r.width, y: ((e.clientY - r.top) * H) / r.height };
    };
    canvas.addEventListener('pointermove', (e) => {
      const p = toLogical(e);
      if (p.x !== this.mouse.x || p.y !== this.mouse.y) this.mouse.moved = true;
      this.mouse.x = p.x;
      this.mouse.y = p.y;
    });
    canvas.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      const p = toLogical(e);
      this.mouse.x = p.x;
      this.mouse.y = p.y;
      this.mouse.click = true;
    });
  }

  clicked() {
    return this.mouse.click;
  }

  mouseIn(x, y, w, h) {
    const m = this.mouse;
    return m.x >= x && m.x < x + w && m.y >= y && m.y < y + h;
  }

  mouseInCircle(cx, cy, r) {
    const dx = this.mouse.x - cx;
    const dy = this.mouse.y - cy;
    return dx * dx + dy * dy <= r * r;
  }

  // Also used by the touch overlay to synthesize presses.
  simKeyDown(code) {
    if (this.held.has(code)) return;
    this.held.add(code);
    for (const [action, codes] of Object.entries(MAP)) {
      if (codes.includes(code)) this.edges.add(action);
    }
    for (const dir of ['left', 'right']) {
      if (MAP[dir].includes(code)) {
        if (this.now - this.lastTap[dir] < DOUBLE_TAP_WINDOW) this.doubleTaps.add(dir);
        this.lastTap[dir] = this.now;
      }
    }
  }

  simKeyUp(code) {
    this.held.delete(code);
  }

  down(action) {
    return MAP[action].some((c) => this.held.has(c));
  }

  pressed(action) {
    return this.edges.has(action);
  }

  doubleTapped(dir) {
    return this.doubleTaps.has(dir);
  }

  // Called once per fixed step, after the scene consumed edge events.
  endStep(dt) {
    this.now += dt;
    this.edges.clear();
    this.doubleTaps.clear();
    this.mouse.click = false;
    this.mouse.moved = false;
    if (this._canvas) {
      const want = this.mouse.hot ? 'pointer' : '';
      if (this._canvas.style.cursor !== want) this._canvas.style.cursor = want;
    }
    this.mouse.hot = false;
  }
}

export const input = new Input();
