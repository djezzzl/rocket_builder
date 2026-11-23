import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateBuild, computeStats, coinRate, tryPlace, tryRemove, tryUpgradeGarage, rollCrate } from '../src/rocket.js';
import { PARTS } from '../src/parts.js';

const b = (x, y, part) => ({ x, y, part, color: 'auto' });

test('valid build needs one cockpit and an engine, all connected', () => {
  assert.equal(validateBuild([b(1, 0, 'cockpit'), b(1, 1, 'engine')]).ok, true);
  assert.match(validateBuild([b(1, 1, 'engine')]).errors.join(), /cockpit/i);
  assert.match(validateBuild([b(0, 0, 'cockpit'), b(1, 0, 'cockpit'), b(0, 1, 'engine')]).errors.join(), /one cockpit/i);
  assert.match(validateBuild([b(0, 0, 'cockpit'), b(0, 1, 'hull')]).errors.join(), /engine/i);
  assert.match(validateBuild([b(0, 0, 'cockpit'), b(0, 1, 'engine'), b(2, 3, 'hull')]).errors.join(), /connected/i);
});

test('stats sum hp, mass and thrust; heavier rockets accelerate slower', () => {
  const light = computeStats([b(1, 0, 'cockpit'), b(1, 1, 'engine')]);
  assert.equal(light.hp, PARTS.cockpit.hp + PARTS.engine.hp);
  assert.equal(light.thrust, PARTS.engine.thrust);
  const heavy = computeStats([b(1, 0, 'cockpit'), b(1, 1, 'engine'), b(0, 1, 'armor'), b(2, 1, 'armor')]);
  assert.ok(heavy.accel < light.accel);
  assert.ok(heavy.hp > light.hp);
});

test('stats collect weapons, boost and shield and center cells around centroid', () => {
  const s = computeStats([b(1, 0, 'cockpit'), b(1, 1, 'engine'), b(0, 0, 'laser'), b(2, 0, 'shield'), b(0, 1, 'booster')]);
  assert.deepEqual(s.weapons.map(w => w.type), ['laser']);
  assert.equal(s.hasShield, true);
  assert.equal(s.hasBoost, true);
  const cx = s.cells.reduce((a, c) => a + c.lx, 0) / s.cells.length;
  assert.ok(Math.abs(cx) < 1e-9);
});

test('coin rate grows with altitude', () => {
  assert.ok(coinRate(10000) > coinRate(0));
  assert.ok(coinRate(0) >= 1);
});

function save() {
  return { coins: 50, garage: 0, unlocked: ['cockpit', 'hull', 'engine', 'wing'], bricks: [b(1, 0, 'cockpit')] };
}

test('placing a brick costs coins, removing refunds', () => {
  const s = save();
  assert.equal(tryPlace(s, 1, 1, 'engine', 'auto').ok, true);
  assert.equal(s.coins, 50 - PARTS.engine.price);
  assert.equal(tryPlace(s, 1, 1, 'hull', 'auto').ok, false, 'occupied');
  assert.equal(tryPlace(s, 9, 9, 'hull', 'auto').ok, false, 'out of grid');
  assert.equal(tryPlace(s, 0, 0, 'armor', 'auto').ok, false, 'locked');
  assert.equal(tryRemove(s, 1, 1).ok, true);
  assert.equal(s.coins, 50);
});

test('cannot afford, second cockpit and removing cockpit are rejected', () => {
  const s = save();
  s.coins = 2;
  assert.equal(tryPlace(s, 1, 1, 'engine', 'auto').ok, false);
  assert.equal(tryPlace(s, 0, 0, 'cockpit', 'auto').ok, false);
  assert.equal(tryRemove(s, 1, 0).ok, false);
});

test('garage upgrade costs coins and recenters bricks', () => {
  const s = save();
  s.coins = 1000;
  assert.equal(tryUpgradeGarage(s).ok, true);
  assert.equal(s.garage, 1);
  assert.equal(s.coins, 850);
  assert.deepEqual([s.bricks[0].x, s.bricks[0].y], [2, 1]);
});

test('crate unlocks a locked part, or gives coins when everything is unlocked', () => {
  const s = save();
  const r = rollCrate(s, () => 0);
  assert.equal(r.type, 'unlock');
  assert.ok(s.unlocked.includes(r.part));
  s.unlocked = Object.keys(PARTS);
  assert.equal(rollCrate(s, () => 0).type, 'coins');
});
