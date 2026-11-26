import { PARTS, GARAGE_SIZES, CELL } from './parts.js';

const key = (x, y) => `${x},${y}`;

export function validateBuild(bricks) {
  const errors = [];
  const cockpits = bricks.filter(b => b.part === 'cockpit');
  if (cockpits.length === 0) errors.push('Add a cockpit for your pilot!');
  if (cockpits.length > 1) errors.push('Only one cockpit allowed.');
  if (!bricks.some(b => PARTS[b.part].thrust)) errors.push('Add an engine to fly!');
  if (cockpits.length >= 1) {
    const map = new Map(bricks.map(b => [key(b.x, b.y), b]));
    const seen = new Set([key(cockpits[0].x, cockpits[0].y)]);
    const stack = [cockpits[0]];
    while (stack.length) {
      const c = stack.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const k = key(c.x + dx, c.y + dy);
        if (map.has(k) && !seen.has(k)) { seen.add(k); stack.push(map.get(k)); }
      }
    }
    if (seen.size !== bricks.length) errors.push('All bricks must be connected to the cockpit.');
  }
  return { ok: errors.length === 0, errors };
}

export function computeStats(bricks) {
  let hp = 0, mass = 0, thrust = 0, turn = 0, energyMax = 30, recharge = 4, magnet = 40;
  let hasBoost = false, hasShield = false;
  const weapons = [];
  const n = bricks.length || 1;
  const cx = bricks.reduce((a, b) => a + b.x, 0) / n;
  const cy = bricks.reduce((a, b) => a + b.y, 0) / n;
  const cells = [];
  let radius = 0;
  for (const b of bricks) {
    const p = PARTS[b.part];
    hp += p.hp; mass += p.mass;
    thrust += p.thrust || 0;
    turn += p.turn || 0;
    energyMax += p.energy || 0;
    recharge += p.recharge || 0;
    magnet += p.magnet || 0;
    if (p.boost) hasBoost = true;
    if (p.shield) hasShield = true;
    const lx = (b.x - cx) * CELL, ly = (b.y - cy) * CELL;
    cells.push({ lx, ly, part: b.part, color: b.color });
    if (p.weapon) weapons.push({ type: p.weapon, lx, ly });
    radius = Math.max(radius, Math.hypot(lx, ly) + CELL * 0.75);
  }
  const accel = thrust ? 50 + thrust / mass : 0;
  const turnRate = 2.2 + turn / Math.sqrt(Math.max(1, mass / 4));
  const maxSpeed = 220 + Math.min(500, accel * 1.2);
  return { hp, mass, thrust, accel, turnRate, maxSpeed, energyMax, recharge, magnet, hasBoost, hasShield, weapons, cells, radius };
}

export function coinRate(altitude) {
  return 1 + Math.max(0, altitude) / 2500;
}

export function buildValue(bricks) {
  return bricks.reduce((a, b) => a + PARTS[b.part].price, 0);
}

export function tryPlace(save, x, y, part, color) {
  const g = GARAGE_SIZES[save.garage];
  const p = PARTS[part];
  if (!p) return { ok: false, reason: 'Unknown part' };
  if (x < 0 || y < 0 || x >= g.w || y >= g.h) return { ok: false, reason: 'Outside the garage' };
  if (save.bricks.some(b => b.x === x && b.y === y)) return { ok: false, reason: 'Spot is taken' };
  if (!save.unlocked.includes(part)) return { ok: false, reason: 'Find this part in space first!' };
  if (part === 'cockpit' && save.bricks.some(b => b.part === 'cockpit')) return { ok: false, reason: 'Only one cockpit' };
  if (save.coins < p.price) return { ok: false, reason: 'Not enough coins' };
  save.coins -= p.price;
  save.bricks.push({ x, y, part, color });
  return { ok: true };
}

export function tryRemove(save, x, y) {
  const i = save.bricks.findIndex(b => b.x === x && b.y === y);
  if (i < 0) return { ok: false, reason: 'Nothing here' };
  if (save.bricks[i].part === 'cockpit') return { ok: false, reason: 'The pilot must stay!' };
  save.coins += PARTS[save.bricks[i].part].price;
  save.bricks.splice(i, 1);
  return { ok: true };
}

export function tryUpgradeGarage(save) {
  const next = GARAGE_SIZES[save.garage + 1];
  if (!next) return { ok: false, reason: 'Biggest garage already!' };
  if (save.coins < next.price) return { ok: false, reason: 'Not enough coins' };
  const cur = GARAGE_SIZES[save.garage];
  const dx = Math.floor((next.w - cur.w) / 2), dy = Math.floor((next.h - cur.h) / 2);
  save.coins -= next.price;
  save.garage += 1;
  for (const b of save.bricks) { b.x += dx; b.y += dy; }
  return { ok: true };
}

export function rollCrate(save, rand = Math.random) {
  const locked = Object.keys(PARTS).filter(id => !save.unlocked.includes(id) && !PARTS[id].bossOnly);
  if (locked.length && rand() < 0.7) {
    const part = locked[Math.floor(rand() * locked.length)];
    save.unlocked.push(part);
    return { type: 'unlock', part };
  }
  return { type: 'coins', amount: 20 + Math.floor(rand() * 30) };
}
