import { weaponDps } from './parts.js';

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const TAU = Math.PI * 2;

// ---------- Pure scaling helpers ----------

export function rocketPower(stats) {
  return stats.hp / 5 + stats.weapons.reduce((t, w) => t + weaponDps(w.type), 0);
}

export function threatLevel(power, time) {
  return clamp(1 + time / 90 + power / 60, 1, 15);
}

export function enemyScale(threat) {
  const t = threat - 1;
  return { hp: 1 + t * 0.45, dmg: 1 + t * 0.2, coins: 1 + t * 0.3 };
}

export function availableEnemies(threat) {
  return Object.keys(ENEMIES).filter(id => threat >= ENEMIES[id].minThreat);
}

export const BOSS_ORDER = ['king', 'mother', 'kraken', 'dragon'];

// The nth boss of a flight: start at the easiest unbeaten boss, then go round in order.
export function pickBoss(save, n) {
  const first = Math.max(0, BOSS_ORDER.findIndex(id => !save.stats.bosses[id]));
  return BOSS_ORDER[(first + n) % BOSS_ORDER.length];
}

// ---------- Movement helpers ----------

function steer(e, tx, ty, speed, dt, grip = 2.5) {
  const dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy) || 1;
  e.vx += ((dx / d) * speed - e.vx) * clamp(grip * dt, 0, 1);
  e.vy += ((dy / d) * speed - e.vy) * clamp(grip * dt, 0, 1);
}

const toRocket = (e, w) => Math.atan2(w.rocket.y - e.y, w.rocket.x - e.x);
const distRocket = (e, w) => Math.hypot(w.rocket.x - e.x, w.rocket.y - e.y);

// ---------- Drawing helpers ----------

function disc(ctx, x, y, r, fill, stroke) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = Math.max(2, r * 0.12); ctx.strokeStyle = stroke; ctx.stroke(); }
}

function eyes(ctx, x, y, r, angry) {
  for (const s of [-1, 1]) {
    disc(ctx, x + s * r * 0.35, y, r * 0.22, '#fff');
    disc(ctx, x + s * r * 0.35, y + r * 0.04, r * 0.11, '#111');
    if (angry) {
      ctx.strokeStyle = '#111'; ctx.lineWidth = r * 0.08;
      ctx.beginPath(); ctx.moveTo(x + s * r * 0.15, y - r * 0.2); ctx.lineTo(x + s * r * 0.58, y - r * 0.34); ctx.stroke();
    }
  }
}

// ---------- Regular enemies ----------

export const ENEMIES = {
  drone: {
    name: 'Drone', r: 14, hp: 16, speed: 135, contact: 8, coins: 4, minThreat: 1, weight: 4,
    update(e, w, dt) { steer(e, w.rocket.x, w.rocket.y, this.speed, dt, 1.6); e.rot += dt * 4; },
    draw(ctx, e) {
      ctx.save(); ctx.rotate(e.rot);
      for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.fillStyle = '#555'; ctx.fillRect(-2, -e.r * 1.35, 4, e.r * 0.6); }
      ctx.restore();
      disc(ctx, 0, 0, e.r, '#9aa0a6', '#3c4043');
      disc(ctx, 0, 0, e.r * 0.45, '#ff3030');
      disc(ctx, -e.r * 0.12, -e.r * 0.12, e.r * 0.14, '#ffd0d0');
    },
  },
  mine: {
    name: 'Space Mine', r: 16, hp: 28, speed: 175, contact: 18, coins: 5, minThreat: 1.5, weight: 2,
    update(e, w, dt) {
      if (distRocket(e, w) < 300) { e.armed = true; steer(e, w.rocket.x, w.rocket.y, this.speed, dt, 1.2); }
      else { e.vx *= 1 - dt * 0.3; e.vy *= 1 - dt * 0.3; }
      e.rot += dt;
    },
    draw(ctx, e, time) {
      ctx.save(); ctx.rotate(e.rot);
      ctx.fillStyle = '#37474f';
      for (let i = 0; i < 8; i++) { ctx.rotate(TAU / 8); ctx.fillRect(-3, -e.r * 1.45, 6, e.r * 0.6); }
      ctx.restore();
      disc(ctx, 0, 0, e.r, '#263238', '#000');
      const blink = e.armed ? Math.sin(time * 18) > 0 : Math.sin(time * 3) > 0.6;
      disc(ctx, 0, 0, e.r * 0.35, blink ? '#ff1744' : '#5d1010');
    },
  },
  ufo: {
    name: 'UFO', r: 20, hp: 40, speed: 170, contact: 10, coins: 8, minThreat: 2, weight: 2,
    update(e, w, dt) {
      e.orbit = (e.orbit ?? rand(0, TAU)) + dt * 0.6;
      steer(e, w.rocket.x + Math.cos(e.orbit) * 290, w.rocket.y + Math.sin(e.orbit) * 290, this.speed, dt, 1.5);
      e.cd = (e.cd ?? rand(1, 2)) - dt;
      if (e.cd <= 0 && distRocket(e, w) < 550) {
        e.cd = 2.2;
        w.enemyShoot(e.x, e.y, toRocket(e, w), 260, 6 * e.dmgMult, '#7CFF4F');
      }
    },
    draw(ctx, e, time) {
      disc(ctx, 0, -e.r * 0.25, e.r * 0.55, 'rgba(140,255,170,0.85)', '#2e7d32');
      ctx.beginPath(); ctx.ellipse(0, 0, e.r * 1.25, e.r * 0.45, 0, 0, TAU);
      ctx.fillStyle = '#b0bec5'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#455a64'; ctx.stroke();
      for (let i = 0; i < 5; i++) {
        const on = Math.floor(time * 6 + i) % 2;
        disc(ctx, (i - 2) * e.r * 0.45, e.r * 0.1, e.r * 0.1, on ? '#ffeb3b' : '#f57f17');
      }
    },
  },
  fighter: {
    name: 'Fighter', r: 16, hp: 34, speed: 480, contact: 14, coins: 10, minThreat: 3, weight: 2,
    update(e, w, dt) {
      e.state ??= 'approach'; e.st = (e.st ?? 0) + dt;
      if (e.state === 'approach') {
        steer(e, w.rocket.x, w.rocket.y, 180, dt);
        e.face = Math.atan2(e.vy, e.vx);
        if (distRocket(e, w) < 380) { e.state = 'aim'; e.st = 0; }
      } else if (e.state === 'aim') {
        e.vx *= 1 - dt * 3; e.vy *= 1 - dt * 3;
        e.face = toRocket(e, w);
        if (e.st > 0.9) {
          e.state = 'dash'; e.st = 0;
          e.vx = Math.cos(e.face) * this.speed; e.vy = Math.sin(e.face) * this.speed;
          for (const s of [-0.25, 0, 0.25]) w.enemyShoot(e.x, e.y, e.face + s, 330, 5 * e.dmgMult, '#ff5252');
        }
      } else if (e.st > 0.8) { e.state = 'approach'; e.st = 0; }
    },
    draw(ctx, e) {
      ctx.rotate(e.face || 0);
      ctx.beginPath(); ctx.moveTo(e.r * 1.4, 0); ctx.lineTo(-e.r, -e.r); ctx.lineTo(-e.r * 0.5, 0); ctx.lineTo(-e.r, e.r); ctx.closePath();
      ctx.fillStyle = e.state === 'aim' ? '#ff8a80' : '#d32f2f'; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = '#4a0000'; ctx.stroke();
      disc(ctx, e.r * 0.2, 0, e.r * 0.28, '#ffeb3b');
    },
  },
};

export function makeEnemy(type, x, y, threat) {
  const d = ENEMIES[type], sc = enemyScale(threat);
  const hp = d.hp * sc.hp;
  return { kind: 'enemy', type, x, y, vx: 0, vy: 0, r: d.r, hp, maxHp: hp, dmgMult: sc.dmg,
    contact: d.contact * sc.dmg, coins: Math.round(d.coins * sc.coins), rot: 0, hit: 0 };
}

export function pickEnemyType(threat) {
  const ids = availableEnemies(threat);
  let roll = Math.random() * ids.reduce((t, id) => t + ENEMIES[id].weight, 0);
  for (const id of ids) { roll -= ENEMIES[id].weight; if (roll <= 0) return id; }
  return ids[0];
}

// ---------- Bosses ----------

export const BOSSES = {
  king: {
    name: 'Meteor King', emoji: '👑', hp: 300, contact: 25, coins: 150, unlock: 'plasma',
    init(b) { b.parts = [{ r: 85 }]; b.verts = Array.from({ length: 12 }, (_, i) => [i / 12 * TAU, rand(0.85, 1.1)]); },
    update(b, w, dt) {
      steer(b, w.rocket.x, w.rocket.y, 60, dt, 0.8);
      b.rot += dt * 0.3;
      b.cd = (b.cd ?? 2) - dt;
      if (b.cd <= 0) {
        const rage = b.hp < b.maxHp / 2;
        b.cd = rage ? 1.3 : 1.9;
        const base = toRocket(b, w);
        for (const s of rage ? [-0.3, 0, 0.3] : [0]) {
          const a = base + s, x = b.x + Math.cos(a) * 95, y = b.y + Math.sin(a) * 95;
          w.addMeteor(x, y, rand(13, 24), Math.cos(a) * 220, Math.sin(a) * 220);
        }
      }
      b.parts[0].x = b.x; b.parts[0].y = b.y;
    },
    draw(ctx, b) {
      const r = b.parts[0].r;
      ctx.save(); ctx.rotate(Math.sin(b.rot) * 0.2);
      ctx.beginPath();
      b.verts.forEach(([a, k], i) => { const x = Math.cos(a) * r * k, y = Math.sin(a) * r * k; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath(); ctx.fillStyle = b.flash ? '#fff' : '#6d4c41'; ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#3e2723'; ctx.stroke();
      disc(ctx, r * 0.45, r * 0.4, r * 0.15, 'rgba(0,0,0,.25)');
      disc(ctx, -r * 0.5, r * 0.3, r * 0.1, 'rgba(0,0,0,.25)');
      eyes(ctx, 0, -r * 0.1, r * 0.7, true);
      ctx.strokeStyle = '#111'; ctx.lineWidth = 6;
      ctx.beginPath(); ctx.arc(0, r * 0.45, r * 0.25, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
      // Crown
      ctx.fillStyle = '#ffd600'; ctx.strokeStyle = '#b28704'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.75);
      for (let i = 0; i <= 4; i++) { ctx.lineTo(-r * 0.5 + i * r * 0.25, -r * (i % 2 ? 1.05 : 1.35)); }
      ctx.lineTo(r * 0.5, -r * 0.75); ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.restore();
    },
  },
  mother: {
    name: 'Alien Mothership', emoji: '🛸', hp: 550, contact: 30, coins: 250, unlock: 'tesla',
    init(b) { b.parts = [{ r: 95 }]; },
    update(b, w, dt) {
      b.orbit = (b.orbit ?? 0) + dt * 0.35;
      steer(b, w.rocket.x + Math.cos(b.orbit) * 420, w.rocket.y + Math.sin(b.orbit) * 420, 150, dt, 1);
      b.spawnCd = (b.spawnCd ?? 3) - dt;
      if (b.spawnCd <= 0) { b.spawnCd = 4.5; for (let i = 0; i < 2; i++) w.spawnEnemy('drone', b.x + rand(-60, 60), b.y + rand(-60, 60)); }
      b.ringCd = (b.ringCd ?? 2) - dt;
      if (b.ringCd <= 0) {
        b.ringCd = b.hp < b.maxHp / 2 ? 2.2 : 3.2;
        const off = rand(0, TAU);
        for (let i = 0; i < 14; i++) w.enemyShoot(b.x, b.y, off + i / 14 * TAU, 200, 7 * b.dmgMult, '#e040fb', 7);
      }
      b.parts[0].x = b.x; b.parts[0].y = b.y;
    },
    draw(ctx, b, time) {
      const r = b.parts[0].r;
      ctx.save(); ctx.rotate(Math.sin(time) * 0.08);
      disc(ctx, 0, -r * 0.3, r * 0.5, 'rgba(200,150,255,0.9)', '#6a1b9a');
      eyes(ctx, 0, -r * 0.35, r * 0.4, true);
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.35, r * 0.45, 0, 0, TAU);
      ctx.fillStyle = b.flash ? '#fff' : '#7e57c2'; ctx.fill(); ctx.lineWidth = 6; ctx.strokeStyle = '#311b92'; ctx.stroke();
      for (let i = 0; i < 9; i++) {
        const on = Math.floor(time * 5 + i) % 3 === 0;
        disc(ctx, (i - 4) * r * 0.27, r * 0.08, r * 0.08, on ? '#fff176' : '#ff6f00');
      }
      ctx.fillStyle = 'rgba(180,255,180,0.25)';
      ctx.beginPath(); ctx.moveTo(-r * 0.3, r * 0.4); ctx.lineTo(r * 0.3, r * 0.4); ctx.lineTo(r * 0.6, r * 1.1); ctx.lineTo(-r * 0.6, r * 1.1); ctx.fill();
      ctx.restore();
    },
  },
  kraken: {
    name: 'Space Kraken', emoji: '🐙', hp: 850, contact: 35, coins: 400, unlock: 'railgun',
    init(b) { b.parts = [{ r: 75 }]; b.state = 'swim'; b.st = 0; },
    update(b, w, dt) {
      b.st += dt;
      if (b.state === 'swim') {
        steer(b, w.rocket.x, w.rocket.y, 120, dt, 1);
        b.inkCd = (b.inkCd ?? 1) - dt;
        if (b.inkCd <= 0) {
          b.inkCd = 1.4;
          const base = toRocket(b, w);
          for (let i = -2; i <= 2; i++) w.enemyShoot(b.x, b.y, base + i * 0.2, 240, 8 * b.dmgMult, '#212121', 9);
        }
        if (b.st > (b.hp < b.maxHp / 2 ? 2.2 : 3.2)) { b.state = 'windup'; b.st = 0; }
      } else if (b.state === 'windup') {
        b.vx *= 1 - dt * 4; b.vy *= 1 - dt * 4;
        b.aim = toRocket(b, w);
        if (b.st > 0.8) { b.state = 'charge'; b.st = 0; b.vx = Math.cos(b.aim) * 560; b.vy = Math.sin(b.aim) * 560; }
      } else if (b.st > 0.9) { b.state = 'swim'; b.st = 0; }
      b.parts[0].x = b.x; b.parts[0].y = b.y;
    },
    draw(ctx, b, time) {
      const r = b.parts[0].r;
      const face = Math.atan2(b.vy, b.vx) + Math.PI / 2;
      ctx.save(); ctx.rotate(b.state === 'swim' ? Math.sin(time) * 0.2 : face);
      ctx.lineCap = 'round';
      for (let i = 0; i < 8; i++) {
        const x0 = (i - 3.5) * r * 0.22;
        ctx.strokeStyle = b.flash ? '#fff' : '#c2185b'; ctx.lineWidth = r * 0.16;
        ctx.beginPath(); ctx.moveTo(x0, r * 0.5);
        for (let k = 1; k <= 6; k++) ctx.lineTo(x0 + Math.sin(time * 5 + i + k * 0.8) * r * 0.18, r * 0.5 + k * r * 0.2);
        ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(0, -r * 0.1, r * 0.85, r, 0, 0, TAU);
      ctx.fillStyle = b.flash ? '#fff' : b.state === 'windup' ? '#ff4081' : '#e91e63'; ctx.fill();
      ctx.lineWidth = 6; ctx.strokeStyle = '#880e4f'; ctx.stroke();
      for (const [x, y, s] of [[-0.4, -0.6, 0.12], [0.35, -0.7, 0.09], [0.1, -0.35, 0.07]]) disc(ctx, x * r, y * r, s * r, '#f48fb1');
      eyes(ctx, 0, r * 0.15, r * 0.75, b.state !== 'swim');
      ctx.restore();
    },
  },
  dragon: {
    name: 'Star Dragon', emoji: '🐉', hp: 1300, contact: 40, coins: 600, unlock: 'star', worldSpace: true,
    init(b) {
      b.parts = [{ r: 42, head: true }, ...Array.from({ length: 12 }, (_, i) => ({ r: 32 - i * 1.4 }))];
      b.trail = [];
      for (const p of b.parts) { p.x = b.x; p.y = b.y; }
    },
    update(b, w, dt) {
      b.wiggle = (b.wiggle ?? 0) + dt * 2.5;
      const a = toRocket(b, w) + Math.sin(b.wiggle) * 0.9;
      const speed = b.hp < b.maxHp / 2 ? 260 : 210;
      steer(b, b.x + Math.cos(a) * 100, b.y + Math.sin(a) * 100, speed, dt, 1.8);
      b.face = Math.atan2(b.vy, b.vx);
      b.fireCd = (b.fireCd ?? 3) - dt;
      if (b.fireCd <= 0) {
        b.breath = (b.breath ?? 0) + dt;
        b.puffCd = (b.puffCd ?? 0) - dt;
        if (b.puffCd <= 0) {
          b.puffCd = 0.11;
          w.enemyShoot(b.x, b.y, toRocket(b, w) + rand(-0.25, 0.25), 300, 6 * b.dmgMult, Math.random() < 0.5 ? '#ff6d00' : '#ffd600', 8);
        }
        if (b.breath > 1.6) { b.breath = 0; b.fireCd = 3.5; }
      }
      // Body segments follow the head's trail.
      b.trail.unshift([b.x, b.y]);
      if (b.trail.length > 200) b.trail.pop();
      b.parts[0].x = b.x; b.parts[0].y = b.y;
      let idx = 0;
      for (let i = 1; i < b.parts.length; i++) {
        idx = Math.min(b.trail.length - 1, idx + 7);
        [b.parts[i].x, b.parts[i].y] = b.trail[idx];
      }
    },
    draw(ctx, b, time) {
      for (let i = b.parts.length - 1; i >= 1; i--) {
        const p = b.parts[i];
        disc(ctx, p.x, p.y, p.r, b.flash ? '#fff' : i % 2 ? '#1565c0' : '#1e88e5', '#0d47a1');
        disc(ctx, p.x, p.y, p.r * 0.35, '#ffd600');
      }
      const h = b.parts[0];
      ctx.translate(h.x, h.y); ctx.rotate(b.face || 0);
      ctx.fillStyle = '#ffd600';
      for (const s of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-h.r * 0.5, s * h.r * 0.6); ctx.lineTo(-h.r * 1.4, s * h.r * 1.1); ctx.lineTo(-h.r * 0.1, s * h.r * 0.3); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse(0, 0, h.r * 1.3, h.r, 0, 0, TAU);
      ctx.fillStyle = b.flash ? '#fff' : '#0d47a1'; ctx.fill(); ctx.lineWidth = 5; ctx.strokeStyle = '#002171'; ctx.stroke();
      ctx.save(); ctx.rotate(Math.PI / 2); eyes(ctx, 0, -h.r * 0.2, h.r * 0.9, true); ctx.restore();
      if (b.breath > 0) disc(ctx, h.r * 1.3, 0, h.r * (0.3 + Math.sin(time * 30) * 0.08), '#ff9100');
    },
  },
};

export function makeBoss(id, x, y, threat, tier) {
  const d = BOSSES[id], sc = enemyScale(threat + tier);
  const hp = d.hp * sc.hp;
  const b = { kind: 'boss', id, name: d.name, emoji: d.emoji, x, y, vx: 0, vy: 0, hp, maxHp: hp, dmgMult: sc.dmg,
    contact: d.contact * sc.dmg, coins: Math.round(d.coins * sc.coins), rot: 0, hit: 0 };
  d.init(b);
  for (const p of b.parts) { p.owner = b; p.x ??= x; p.y ??= y; }
  return b;
}
