import { ROSTER } from '../characters/index.js';
import { DEBUG } from '../engine/constants.js';

// Cumulative XP needed for each account level. Level N -> N+1 costs 50+50*N
// (capped at 650, then 700 to max) — matched 1:1 to campaign first-clear XP so
// clearing level N always levels you up on the victory screen.
export const THRESHOLDS = [0, 0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700, 3250, 3850, 4500, 5200];
export const MAX_LEVEL = 14;

export function levelForXp(xp) {
  let lvl = 1;
  for (let i = 2; i <= MAX_LEVEL; i++) {
    if (xp >= THRESHOLDS[i]) lvl = i;
  }
  return lvl;
}

export function xpIntoLevel(xp) {
  const lvl = levelForXp(xp);
  if (lvl >= MAX_LEVEL) return { into: 1, needed: 1, next: null };
  return { into: xp - THRESHOLDS[lvl], needed: THRESHOLDS[lvl + 1] - THRESHOLDS[lvl], next: lvl + 1 };
}

export function isUnlocked(charDef, accountLevel) {
  if (DEBUG) return true;
  return charDef.unlockLevel <= accountLevel;
}

export function unlockedCharacters(accountLevel) {
  return ROSTER.filter((d) => isUnlocked(d, accountLevel));
}

export function unlocksAtLevel(level) {
  return ROSTER.filter((d) => d.unlockLevel === level);
}

export function firstClearXp(levelNumber) {
  return Math.min(650, 50 + 50 * levelNumber);
}

export function replayXp(levelNumber) {
  return Math.round((firstClearXp(levelNumber) * 0.3) / 5) * 5;
}

// Boss difficulty scaling, indexed by campaign level 1..12.
const ANCHORS = [
  [1, { hpMult: 1.0, dmgMult: 0.8, aggression: 0.25, reactionDelay: 32, cooldown: 55, superChance: 0.10, comboLength: 1 }],
  [3, { hpMult: 1.2, dmgMult: 0.9, aggression: 0.40, reactionDelay: 24, cooldown: 45, superChance: 0.25, comboLength: 1 }],
  [5, { hpMult: 1.4, dmgMult: 1.0, aggression: 0.55, reactionDelay: 18, cooldown: 35, superChance: 0.40, comboLength: 2 }],
  [7, { hpMult: 1.6, dmgMult: 1.1, aggression: 0.65, reactionDelay: 14, cooldown: 28, superChance: 0.55, comboLength: 2 }],
  [9, { hpMult: 1.9, dmgMult: 1.2, aggression: 0.75, reactionDelay: 10, cooldown: 20, superChance: 0.70, comboLength: 3 }],
  [12, { hpMult: 2.4, dmgMult: 1.35, aggression: 0.90, reactionDelay: 6, cooldown: 12, superChance: 0.85, comboLength: 3 }],
];

export function difficultyFor(levelNumber) {
  let lo = ANCHORS[0];
  let hi = ANCHORS[ANCHORS.length - 1];
  for (let i = 0; i < ANCHORS.length - 1; i++) {
    if (levelNumber >= ANCHORS[i][0] && levelNumber <= ANCHORS[i + 1][0]) {
      lo = ANCHORS[i];
      hi = ANCHORS[i + 1];
      break;
    }
  }
  const t = hi[0] === lo[0] ? 0 : (levelNumber - lo[0]) / (hi[0] - lo[0]);
  const out = {};
  for (const k of Object.keys(lo[1])) {
    const v = lo[1][k] + (hi[1][k] - lo[1][k]) * Math.min(1, Math.max(0, t));
    out[k] = k === 'comboLength' ? Math.round(v) : v;
  }
  return out;
}
