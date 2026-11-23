import { PARTS } from './parts.js';

const KEY = 'brick-rocket-save-v1';

export function newSave() {
  return {
    coins: 40,
    garage: 0,
    best: 0,
    flights: 0,
    unlocked: Object.keys(PARTS).filter(id => PARTS[id].unlocked),
    bricks: [
      { x: 1, y: 1, part: 'cockpit', color: 'auto' },
      { x: 1, y: 2, part: 'engine', color: 'auto' },
    ],
  };
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...newSave(), ...JSON.parse(raw) };
  } catch { /* corrupted save: start fresh */ }
  return newSave();
}

export function writeSave(save) {
  try { localStorage.setItem(KEY, JSON.stringify(save)); } catch { /* storage full or disabled */ }
}

export function resetSave() {
  localStorage.removeItem(KEY);
  return newSave();
}
