import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeStats, rollCrate } from '../src/rocket.js';
import { rocketPower, threatLevel, enemyScale, pickBoss, availableEnemies, BOSS_ORDER } from '../src/enemies.js';
import { ACHIEVEMENTS, checkAchievements } from '../src/achievements.js';
import { PARTS } from '../src/parts.js';
import { newSave } from '../src/save.js';

const b = (x, y, part) => ({ x, y, part, color: 'auto' });

test('rocket power grows with weapons and hp, threat grows with power and time', () => {
  const basic = computeStats([b(1, 0, 'cockpit'), b(1, 1, 'engine')]);
  const armed = computeStats([b(1, 0, 'cockpit'), b(1, 1, 'engine'), b(0, 0, 'railgun'), b(2, 0, 'tesla')]);
  assert.ok(rocketPower(armed) > rocketPower(basic));
  assert.ok(threatLevel(rocketPower(armed), 0) > threatLevel(rocketPower(basic), 0));
  assert.ok(threatLevel(10, 300) > threatLevel(10, 0));
  assert.ok(threatLevel(1e6, 1e6) <= 15);
  assert.ok(threatLevel(0, 0) >= 1);
});

test('enemy scale makes enemies tougher and more rewarding at higher threat', () => {
  const lo = enemyScale(1), hi = enemyScale(5);
  assert.equal(lo.hp, 1);
  assert.ok(hi.hp > lo.hp && hi.dmg > lo.dmg && hi.coins > lo.coins);
});

test('enemy types unlock as threat rises', () => {
  assert.deepEqual(availableEnemies(1), ['drone']);
  assert.ok(availableEnemies(5).includes('fighter'));
});

test('first boss is the easiest unbeaten one, then bosses cycle onward', () => {
  const s = newSave();
  assert.equal(pickBoss(s, 0), BOSS_ORDER[0]);
  s.stats.bosses.king = 1;
  assert.equal(pickBoss(s, 0), 'mother');
  assert.equal(pickBoss(s, 1), 'kraken');
  for (const id of BOSS_ORDER) s.stats.bosses[id] = 1;
  assert.equal(pickBoss(s, 0), 'king');
});

test('crates never give boss-only parts', () => {
  const s = newSave();
  s.unlocked = Object.keys(PARTS).filter(id => id !== 'star');
  assert.equal(rollCrate(s, () => 0).type, 'coins');
});

test('achievements are awarded once and pay coins', () => {
  const s = newSave();
  assert.deepEqual(checkAchievements(s), []);
  s.stats.ships = 1;
  s.stats.bosses.king = 1;
  const coins = s.coins;
  const got = checkAchievements(s).map(a => a.id);
  assert.deepEqual(got.sort(), ['boss-king', 'first-ship']);
  assert.equal(s.coins, coins + ACHIEVEMENTS.filter(a => got.includes(a.id)).reduce((t, a) => t + a.reward, 0));
  assert.deepEqual(checkAchievements(s), []);
});

test('boss master needs every boss', () => {
  const s = newSave();
  for (const id of BOSS_ORDER) s.stats.bosses[id] = 1;
  assert.ok(checkAchievements(s).some(a => a.id === 'boss-all'));
});
