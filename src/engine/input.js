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
  }

  attach(target) {
    target.addEventListener('keydown', (e) => {
      if (ALL_CODES.has(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.held.add(e.code);
      for (const [action, codes] of Object.entries(MAP)) {
        if (codes.includes(e.code)) this.edges.add(action);
      }
      for (const dir of ['left', 'right']) {
        if (MAP[dir].includes(e.code)) {
          if (this.now - this.lastTap[dir] < DOUBLE_TAP_WINDOW) this.doubleTaps.add(dir);
          this.lastTap[dir] = this.now;
        }
      }
    });
    target.addEventListener('keyup', (e) => this.held.delete(e.code));
    target.addEventListener('blur', () => this.held.clear());
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
  }
}

export const input = new Input();
