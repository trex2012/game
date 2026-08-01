import { W, H } from './constants.js';

// Creates the game canvas inside #app and keeps it letterbox-scaled to the
// window. All game code draws in W x H logical pixels forever.
export function createCanvas() {
  const app = document.querySelector('#app');
  app.innerHTML = '';
  const canvas = document.createElement('canvas');
  app.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  function resize() {
    const scale = Math.min(window.innerWidth / W, window.innerHeight / H);
    canvas.width = Math.floor(W * scale);
    canvas.height = Math.floor(H * scale);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();

  return { canvas, ctx };
}
