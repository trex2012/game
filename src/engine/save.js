const KEY = 'mha-jjk-brawler.save.v1';

const DEFAULTS = () => ({
  version: 1,
  xp: 0,
  clearedLevels: {},          // { "1": { clears: 2, bestNoHit: true } }
  seenUnlocks: ['deku', 'yuji'],
  lastCharacter: 'deku',
  lastLevel: 1,
  curseStash: {}, // per-character stored curses/transfigured that carry between levels
  bossStash: {},  // Geto's absorbed boss curse (character id), carried between levels
  settings: { screenShake: true, damageNumbers: true, sound: true, voice: true },
});

let cache = null;

export function loadSave() {
  if (cache) return cache;
  cache = DEFAULTS();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        cache = { ...cache, ...parsed, settings: { ...cache.settings, ...parsed.settings } };
      }
    }
  } catch {
    // corrupt or unavailable storage -> defaults
  }
  return cache;
}

export function writeSave(mutator) {
  const save = loadSave();
  mutator(save);
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    // storage unavailable (private mode etc.) -> keep in-memory progress
  }
  return save;
}

export function resetSave() {
  cache = DEFAULTS();
  try {
    localStorage.removeItem(KEY);
  } catch { /* ignore */ }
  return cache;
}
