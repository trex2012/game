import { firstClearXp, replayXp } from './progression.js';

// Level geometry helpers. Base ground top sits at y=500 in a 540px-tall view.
const G = 500;
const ground = (x, w, y = G) => ({ x, y, w, h: 600 - y });
const block = (x, y, w, h) => ({ x, y, w, h });
const plat = (x, y, w, crumble = false) => ({ x, y, w, h: 12, crumble });
const spikes = (x, w) => ({ type: 'spikes', x, y: G - 14, w, h: 14, damage: 10 });
const wave = (triggerX, spawns, lock = false) => ({ triggerX, spawns, lock });
const s = (kind, x, y) => ({ kind, x, y });

function makeLevel(def) {
  const arenaW = def.arenaW ?? 1000;
  const arena = { x: def.width - arenaW, w: arenaW };
  return {
    ...def,
    arena,
    bossX: arena.x + arenaW - 160,
    xpFirst: firstClearXp(def.n),
    xpReplay: replayXp(def.n),
    playerStart: def.playerStart ?? { x: 80, y: G - 80 },
    checkpointX: def.checkpointX ?? Math.floor(def.width * 0.55),
    hazards: def.hazards ?? [],
    oneWays: def.oneWays ?? [],
    height: 540,
  };
}

export const LEVELS = [
  makeLevel({
    n: 1,
    name: 'Jujutsu High Courtyard',
    bossId: 'maki',
    width: 3400,
    theme: { skyTop: '#f5b48a', skyBottom: '#c9a0c8', far: '#7a5a78', near: '#4a3a55', ground: '#5c4a42', accent: '#e8a0b8', particle: 'petal' },
    solids: [ground(0, 1500), ground(1560, 700), ground(2320, 1080), block(700, 440, 120, 60), block(1200, 420, 140, 80)],
    oneWays: [plat(950, 400, 150), plat(1700, 390, 160), plat(2000, 330, 140)],
    waves: [
      wave(350, [s('wisp', 600, 380), s('wisp', 700, 350)]),
      wave(900, [s('wisp', 1200, 380), s('wisp', 1300, 340), s('crawler', 1350, 470)]),
      wave(1600, [s('wisp', 1900, 360), s('wisp', 2050, 330), s('crawler', 2100, 470)]),
      wave(2100, [s('crawler', 2500, 470), s('wisp', 2600, 350)]),
    ],
  }),
  makeLevel({
    n: 2,
    name: 'Abandoned Detention Center',
    bossId: 'megumi',
    width: 3600,
    theme: { skyTop: '#131a2e', skyBottom: '#28324e', far: '#1c2438', near: '#101624', ground: '#2e3444', accent: '#4a5a8a', particle: null },
    solids: [ground(0, 1100), ground(1160, 500, 420), ground(1720, 700), ground(2480, 1120), block(500, 430, 90, 70), block(2100, 430, 100, 70)],
    oneWays: [plat(1180, 300, 140), plat(1420, 300, 140), plat(2250, 380, 140), plat(2450, 320, 100)],
    hazards: [spikes(1120, 40), spikes(2440, 40)],
    waves: [
      wave(300, [s('wisp', 620, 380), s('crawler', 700, 470)]),
      wave(1000, [s('wisp', 1300, 260), s('crawler', 1350, 390), s('wisp', 1500, 260)]),
      wave(1800, [s('crawler', 2100, 470), s('crawler', 2250, 470), s('wisp', 2300, 340)]),
    ],
  }),
  makeLevel({
    n: 3,
    name: 'Zenin Estate',
    bossId: 'naoya',
    width: 3800,
    theme: { skyTop: '#c88a5a', skyBottom: '#e8c898', far: '#8a5a3a', near: '#5e3c28', ground: '#7a5c40', accent: '#c0392b', particle: 'petal' },
    solids: [ground(0, 1700), ground(1820, 800), ground(2700, 1100), block(600, 430, 300, 70), block(1400, 430, 200, 70)],
    oneWays: [plat(650, 350, 180), plat(1420, 350, 160), plat(1900, 400, 200), plat(2200, 340, 180), plat(2900, 400, 200)],
    hazards: [{ type: 'splat', x: 1700, y: G - 8, w: 120, h: 10, damage: 2, interval: 0.8, color: '#3a6a8a' }],
    waves: [
      wave(300, [s('crawler', 650, 400), s('wisp', 800, 350)]),
      wave(1100, [s('spitter', 1500, 404), s('crawler', 1450, 470)]),
      wave(1900, [s('crawler', 2250, 470), s('spitter', 2300, 314), s('wisp', 2400, 340)]),
      wave(2700, [s('crawler', 3000, 470), s('wisp', 3100, 350)]),
    ],
  }),
  makeLevel({
    n: 4,
    name: 'Shibuya Underpass',
    bossId: 'choso',
    width: 3600,
    theme: { skyTop: '#101018', skyBottom: '#1e1e2c', far: '#28283c', near: '#141420', ground: '#3a3a48', accent: '#e838a8', particle: null },
    solids: [ground(0, 3600), block(500, 380, 60, 120), block(1500, 380, 60, 120), block(2500, 380, 60, 120), block(0, 0, 3600, 40)],
    oneWays: [plat(800, 400, 160), plat(1800, 400, 160), plat(2800, 400, 160)],
    waves: [
      wave(400, [s('wisp', 750, 380), s('wisp', 850, 350), s('crawler', 900, 470)], true),
      wave(1400, [s('wisp', 1750, 380), s('crawler', 1800, 470), s('crawler', 1900, 470), s('secbot', 1950, 468)], true),
      wave(2400, [s('brute', 2800, 448), s('wisp', 2750, 360), s('wisp', 2900, 340)], true),
    ],
  }),
  makeLevel({
    n: 5,
    name: 'Abandoned Hospital',
    bossId: 'mahito',
    width: 4000,
    theme: { skyTop: '#1e2c22', skyBottom: '#31443a', far: '#26362c', near: '#18241c', ground: '#3c4c40', accent: '#9fb8a0', particle: null },
    solids: [ground(0, 900), ground(960, 640, 460), ground(1660, 900), ground(2620, 1380), block(1200, 340, 120, 120), block(2900, 420, 140, 80)],
    oneWays: [
      plat(950, 380, 120), plat(1150, 300, 120, true), plat(1350, 240, 120), plat(1550, 300, 120, true),
      plat(1900, 400, 140), plat(2150, 330, 140, true), plat(2400, 260, 140),
      plat(3100, 380, 140), plat(3350, 320, 120),
    ],
    hazards: [spikes(920, 40), spikes(2580, 40)],
    waves: [
      wave(300, [s('wisp', 650, 360), s('diver', 700, 200)]),
      wave(1100, [s('diver', 1400, 160), s('wisp', 1350, 300), s('spitter', 1450, 214)]),
      wave(1900, [s('wisp', 2200, 300), s('diver', 2300, 180), s('spitter', 2350, 234)]),
      wave(2800, [s('wisp', 3100, 320), s('diver', 3200, 170)]),
    ],
  }),
  makeLevel({
    n: 6,
    name: 'Night City Rooftops',
    bossId: 'toji',
    width: 4200,
    theme: { skyTop: '#0c1026', skyBottom: '#232a4e', far: '#181e38', near: '#0e1226', ground: '#2c3048', accent: '#ffd23e', particle: null },
    solids: [
      ground(0, 600, 480), ground(700, 500, 440), ground(1320, 420, 470), ground(1860, 520, 430),
      ground(2500, 460, 460), ground(3080, 320, 430), ground(3400, 800, 470),
    ],
    oneWays: [plat(640, 400, 60), plat(1240, 400, 80), plat(1790, 380, 70), plat(2440, 400, 60), plat(2980, 380, 100, true), plat(3420, 400, 60)],
    waves: [
      wave(300, [s('secbot', 850, 408), s('diver', 900, 200)]),
      wave(1300, [s('secbot', 1500, 438), s('diver', 1600, 180), s('secbot', 2000, 398)]),
      wave(2400, [s('diver', 2700, 190), s('secbot', 2800, 428), s('diver', 3150, 170)]),
    ],
  }),
  makeLevel({
    n: 7,
    name: 'Cursed Shrine',
    bossId: 'geto',
    width: 3800,
    theme: { skyTop: '#2c1a3e', skyBottom: '#4e2a5e', far: '#3a2048', near: '#241230', ground: '#42304e', accent: '#ff6a00', particle: 'ember' },
    solids: [
      ground(0, 1000), ground(1000, 700, 460), ground(1700, 700, 420), ground(2400, 1400, 380),
      block(950, 460, 50, 40), block(1650, 420, 50, 80), block(2350, 380, 50, 120),
    ],
    oneWays: [plat(1200, 380, 140), plat(1900, 340, 140), plat(2600, 300, 140)],
    waves: [
      wave(300, [s('wisp', 600, 360), s('wisp', 700, 330), s('spitter', 800, 474)]),
      wave(1100, [s('wisp', 1400, 320), s('wisp', 1500, 300), s('brute', 1500, 408)]),
      wave(1900, [s('wisp', 2100, 300), s('spitter', 2200, 394), s('wisp', 2250, 280)]),
      wave(2600, [s('brute', 2900, 328), s('wisp', 3000, 260), s('wisp', 3100, 240)]),
    ],
  }),
  makeLevel({
    n: 8,
    name: 'Ruined City Block',
    bossId: 'shigaraki',
    width: 4000,
    theme: { skyTop: '#4a4038', skyBottom: '#6e6054', far: '#55483e', near: '#38302a', ground: '#4e443c', accent: '#8a8578', particle: 'ash' },
    solids: [ground(0, 1300), ground(1400, 600), ground(2060, 500, 440), ground(2660, 1340), block(700, 420, 160, 80), block(1700, 430, 120, 70), block(3000, 420, 140, 80)],
    oneWays: [plat(900, 360, 140, true), plat(1450, 380, 120, true), plat(2150, 360, 140, true), plat(2800, 380, 140)],
    hazards: [spikes(1300, 100), spikes(2560, 100)],
    waves: [
      wave(300, [s('secbot', 700, 338), s('crawler', 800, 470)]),
      wave(1200, [s('brute', 1600, 448), s('crawler', 1700, 470), s('secbot', 1750, 468)]),
      wave(2200, [s('crawler', 2500, 410), s('secbot', 2550, 408), s('crawler', 2900, 470)]),
      wave(2900, [s('brute', 3200, 448), s('secbot', 3300, 468)]),
    ],
  }),
  makeLevel({
    n: 9,
    name: 'Kamino Ward',
    bossId: 'allmight',
    width: 3200,
    arenaW: 1400,
    theme: { skyTop: '#e86a3a', skyBottom: '#f5b06a', far: '#a04828', near: '#6e3018', ground: '#5c4038', accent: '#f6d34a', particle: 'ember' },
    solids: [ground(0, 3200), block(600, 430, 120, 70), block(1200, 400, 100, 100)],
    oneWays: [plat(900, 380, 160), plat(1500, 380, 160)],
    waves: [
      wave(300, [s('secbot', 700, 358), s('secbot', 800, 468)]),
      wave(1000, [s('brute', 1400, 448), s('secbot', 1500, 468)]),
    ],
  }),
  makeLevel({
    n: 10,
    name: 'Shibuya Station',
    bossId: 'gojo',
    width: 4000,
    theme: { skyTop: '#0e0e1a', skyBottom: '#22182e', far: '#2e1e3e', near: '#160f20', ground: '#2e2838', accent: '#3aa0ff', particle: null },
    solids: [ground(0, 4000), block(0, 0, 4000, 30), block(800, 390, 700, 20), block(2000, 390, 700, 20), block(600, 250, 500, 20), block(1700, 250, 500, 20)],
    oneWays: [plat(1550, 440, 100), plat(1200, 320, 120), plat(2750, 440, 100), plat(2300, 320, 120)],
    trainScript: { y: 396, h: 90, every: 9, telegraph: 1.4, damage: 18 },
    waves: [
      wave(300, [s('diver', 700, 150), s('spitter', 900, 364)]),
      wave(1300, [s('diver', 1700, 150), s('brute', 1800, 448), s('spitter', 2100, 364)]),
      wave(2400, [s('diver', 2800, 150), s('diver', 2900, 180), s('brute', 3000, 448), s('spitter', 3100, 364)]),
    ],
  }),
  makeLevel({
    n: 11,
    name: 'Malevolent Wasteland',
    bossId: 'sukuna',
    width: 4200,
    theme: { skyTop: '#3e0a12', skyBottom: '#6e1420', far: '#4e0e18', near: '#2c060c', ground: '#3e2028', accent: '#ff2244', particle: 'ember' },
    solids: [
      ground(0, 900), ground(1000, 500, 460), ground(1600, 500), ground(2200, 600, 440), ground(2900, 1300),
      block(500, 430, 100, 70), block(2400, 360, 80, 80), block(3300, 420, 120, 80),
    ],
    oneWays: [plat(920, 380, 80, true), plat(1520, 400, 80, true), plat(2110, 360, 90, true), plat(2820, 380, 80, true)],
    hazards: [spikes(900, 100), spikes(2100, 100), spikes(2800, 100)],
    waves: [
      wave(300, [s('crawler', 600, 470), s('diver', 700, 180), s('spitter', 800, 474)]),
      wave(1200, [s('crawler', 1400, 430), s('crawler', 1450, 430), s('diver', 1500, 160), s('spitter', 1700, 474)]),
      wave(2000, [s('brute', 2400, 388), s('diver', 2500, 160), s('crawler', 2600, 410)]),
      wave(3000, [s('brute', 3300, 448), s('diver', 3400, 170), s('spitter', 3500, 474), s('crawler', 3450, 470)]),
    ],
  }),
  makeLevel({
    n: 12,
    name: 'Villain Fortress',
    bossId: 'allforone',
    width: 4200,
    arenaW: 1300,
    theme: { skyTop: '#0c0a14', skyBottom: '#1e1428', far: '#2a1a38', near: '#120c1c', ground: '#28202e', accent: '#37e85e', particle: null },
    solids: [ground(0, 1800), ground(1900, 800), ground(2760, 1440), block(600, 420, 140, 80), block(1300, 400, 120, 100), block(2200, 420, 140, 80)],
    oneWays: [plat(900, 380, 140), plat(1550, 340, 140), plat(2400, 360, 140)],
    hazards: [spikes(1800, 100)],
    waves: [
      wave(300, [s('secbot', 700, 338), s('brute', 800, 448)], true),
      wave(1300, [s('boss:shigaraki', 1600, 446), s('secbot', 1500, 468)], true),
      wave(2200, [s('brute', 2500, 448), s('brute', 2600, 448), s('secbot', 2450, 468)], true),
    ],
  }),
];

export const levelByN = Object.fromEntries(LEVELS.map((l) => [l.n, l]));
