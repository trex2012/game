export class Entity {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = 0;
    this.vy = 0;
    this.team = 'neutral'; // 'player' | 'enemy' | 'neutral'
    this.alive = true;
    this.onGround = false;
    this.dropTimer = 0;
    this.gravityOff = false;
  }

  get rect() {
    return { x: this.x, y: this.y, w: this.w, h: this.h };
  }

  get cx() { return this.x + this.w / 2; }
  get cy() { return this.y + this.h / 2; }

  update(dt, world) {}
  draw(ctx) {}
}
