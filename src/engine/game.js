import { STEP } from './constants.js';
import { input } from './input.js';
import { effects } from './effects.js';

// Scene contract: enter(params), exit(), update(dt), draw(ctx).
export class Game {
  constructor(ctx) {
    this.ctx = ctx;
    this.scenes = {};
    this.scene = null;
  }

  register(name, scene) {
    this.scenes[name] = scene;
    scene.game = this;
  }

  changeScene(name, params = {}) {
    if (this.scene?.exit) this.scene.exit();
    this.scene = this.scenes[name];
    if (this.scene.enter) this.scene.enter(params);
  }

  start() {
    let last = performance.now();
    let acc = 0;
    const frame = (now) => {
      acc += Math.min((now - last) / 1000, 0.25) * effects.timeScale;
      last = now;
      let steps = 0;
      while (acc >= STEP && steps < 5) {
        if (effects.freezeFrames > 0) {
          effects.freezeFrames--; // keep buffered input edges alive through hitstop
        } else {
          this.scene.update(STEP);
          input.endStep(STEP);
        }
        acc -= STEP;
        steps++;
      }
      this.scene.draw(this.ctx);
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
  }
}
