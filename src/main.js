import './style.css';
import { createCanvas } from './engine/canvas.js';
import { Game } from './engine/game.js';
import { input } from './engine/input.js';
import { audio } from './engine/audio.js';
import { TitleScene } from './scenes/titleScene.js';
import { LevelSelectScene } from './scenes/levelSelectScene.js';
import { CharacterSelectScene } from './scenes/characterSelectScene.js';
import { LevelScene } from './scenes/levelScene.js';
import { VictoryScene } from './scenes/victoryScene.js';
import { DefeatScene } from './scenes/defeatScene.js';

const { ctx } = createCanvas();
input.attach(window);
window.addEventListener('keydown', () => audio.ensure(), { passive: true });

const game = new Game(ctx);
game.register('title', new TitleScene());
game.register('levelSelect', new LevelSelectScene());
game.register('charSelect', new CharacterSelectScene());
game.register('level', new LevelScene());
game.register('victory', new VictoryScene());
game.register('defeat', new DefeatScene());

// Debug shortcut: ?scene=level&n=3&char=gojo jumps straight into a level.
const params = new URLSearchParams(location.search);
if (params.get('scene') === 'level') {
  game.changeScene('level', { levelN: +(params.get('n') ?? 1), charId: params.get('char') ?? 'deku' });
} else {
  game.changeScene('title');
}
game.start();
