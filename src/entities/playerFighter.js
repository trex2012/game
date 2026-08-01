import { Fighter } from './fighter.js';
import { input } from '../engine/input.js';
import { COYOTE_TIME, JUMP_BUFFER, DROP_THROUGH_TIME } from '../engine/constants.js';

export class PlayerFighter extends Fighter {
  constructor(def, x, y) {
    super(def, x, y, 'player');
    this.coyoteT = 0;
    this.jumpBufT = 0;
  }

  control(dt, world) {
    // Domain key works even while domain-frozen (Simple Domain counterplay).
    if (input.pressed('domain')) this.pressDomain();
    if (this.statuses.frozen) return;

    this.coyoteT = this.onGround ? COYOTE_TIME : Math.max(0, this.coyoteT - dt);
    this.jumpBufT = Math.max(0, this.jumpBufT - dt);
    if (input.pressed('jump')) this.jumpBufT = JUMP_BUFFER;

    if (this.canAct()) {
      if (input.down('left')) this.moveDir = -1;
      else if (input.down('right')) this.moveDir = 1;
      if (this.moveDir !== 0 && this.attackT <= 0) this.facing = this.moveDir;

      if (this.jumpBufT > 0 && this.coyoteT > 0) {
        if (input.down('down') && this.onPlatform) {
          this.dropTimer = DROP_THROUGH_TIME;
        } else {
          this.jump();
        }
        this.jumpBufT = 0;
        this.coyoteT = 0;
      }

      for (const dir of ['left', 'right']) {
        if (input.doubleTapped(dir) && this.def.special?.onDoubleTap) {
          this.def.special.onDoubleTap(this.ctx, dir === 'left' ? -1 : 1);
        }
      }

      if (input.pressed('basic')) this.tryBasic();
      if (input.pressed('super')) this.trySuper();
      if (input.pressed('special')) this.trySpecial();
      if (input.pressed('ultra')) this.tryUltra();
    }
  }
}
