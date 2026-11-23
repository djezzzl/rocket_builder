import { PARTS, WEAPONS, CELL } from './parts.js';
import { computeStats, coinRate, rollCrate } from './rocket.js';
import { makeRocketSprite } from './draw.js';
import { Input } from './input.js';

const $ = id => document.getElementById(id);
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

const EARTH_R = 1400;
const METERS = 0.5; // altitude meters per world unit

const LANDMARKS = [
  { name: 'the Moon', alt: 2500, x: -500, r: 160, color: '#cfcfcf', ring: false, emoji: '🌕' },
  { name: 'Mars', alt: 6000, x: 700, r: 220, color: '#c1440e', ring: false, emoji: '🔴' },
  { name: 'Jupiter', alt: 12000, x: -900, r: 420, color: '#d8a66b', ring: false, emoji: '🟠' },
  { name: 'Saturn', alt: 20000, x: 900, r: 340, color: '#e3c27a', ring: true, emoji: '🪐' },
  { name: 'Neptune', alt: 32000, x: -600, r: 300, color: '#3f6fd8', ring: false, emoji: '🔵' },
];

export class Flight {
  constructor({ onEnd }) {
    this.onEnd = onEnd;
    this.canvas = $('game');
    this.ctx = this.canvas.getContext('2d');
    this.input = new Input(this.canvas);
    this.input.bindHold($('btn-boost'), 'boost');
    this.input.bindHold($('btn-barrier'), 'barrier');
    $('btn-home').onclick = () => this.finish(false);
    this.stars = [0.15, 0.35, 0.6].map(depth => ({
      depth,
      pts: Array.from({ length: 70 }, () => [Math.random() * 1024, Math.random() * 1024, Math.random() * 1.5 + 0.5]),
    }));
    window.addEventListener('resize', () => this.resize());
  }

  start(save) {
    this.save = save;
    $('flight').classList.remove('hidden');
    this.resize();
    const s = this.stats = computeStats(save.bricks);
    this.sprite = makeRocketSprite(s.cells, 3);
    this.engines = s.cells.filter(c => PARTS[c.part].thrust);
    this.rocket = { x: 0, y: -s.radius, vx: 0, vy: 0, a: 0, hp: s.hp, energy: s.energyMax, inv: 0, cooldowns: s.weapons.map(() => rand(0, 0.3)) };
    this.meteors = []; this.shots = []; this.pickups = []; this.particles = [];
    this.time = 0; this.coins = 0; this.maxAlt = 0; this.unlocks = [];
    this.spawnM = 0; this.spawnP = 0; this.shake = 0; this.over = false; this.crashT = 0;
    this.reached = new Set();
    this.boosting = false; this.shielding = false;
    $('energy-bar').classList.toggle('hidden', !s.hasBoost && !s.hasShield);
    $('btn-boost').classList.toggle('hidden', !s.hasBoost);
    $('btn-barrier').classList.toggle('hidden', !s.hasShield);
    $('toasts').innerHTML = '';
    this.toast('3… 2… 1… Lift off! 🚀');
    this.last = performance.now();
    this.running = true;
    requestAnimationFrame(t => this.frame(t));
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.canvas.width = this.w * dpr; this.canvas.height = this.h * dpr;
    this.dpr = dpr;
  }

  toast(text) {
    const el = document.createElement('div');
    el.className = 'toast'; el.textContent = text;
    $('toasts').appendChild(el);
    setTimeout(() => el.remove(), 2300);
  }

  get altitude() { return Math.max(0, -this.rocket.y * METERS); }

  frame(t) {
    if (!this.running) return;
    const dt = Math.min(0.05, (t - this.last) / 1000);
    this.last = t;
    this.update(dt);
    this.render();
    requestAnimationFrame(n => this.frame(n));
  }

  update(dt) {
    const r = this.rocket, s = this.stats;
    this.time += dt;
    this.shake = Math.max(0, this.shake - dt * 30);
    this.updateParticles(dt);
    if (this.over) {
      this.crashT += dt;
      if (this.crashT > 1.8 && !this.ended) this.finish(true);
      return;
    }

    // Steering: rotate toward joystick direction, thrust proportional to push.
    const dir = this.input.direction();
    let throttle = 0;
    if (dir && dir.mag > 0) {
      const target = Math.atan2(dir.dx, -dir.dy);
      const diff = wrapAngle(target - r.a);
      const step = s.turnRate * dt;
      r.a = wrapAngle(r.a + clamp(diff, -step, step));
      throttle = dir.mag * clamp(Math.cos(diff), 0.25, 1);
    }
    this.boosting = s.hasBoost && this.input.boost && r.energy > 1;
    this.shielding = s.hasShield && this.input.barrier && r.energy > 1;
    if (this.boosting) { r.energy -= 22 * dt; throttle = Math.max(throttle, 1); }
    if (this.shielding) r.energy -= 18 * dt;
    if (!this.boosting && !this.shielding) r.energy = Math.min(s.energyMax, r.energy + s.recharge * dt);
    r.energy = Math.max(0, r.energy);
    this.throttle = throttle;

    const fx = Math.sin(r.a), fy = -Math.cos(r.a);
    const acc = s.accel * throttle * (this.boosting ? 2 : 1);
    r.vx += fx * acc * dt; r.vy += fy * acc * dt;
    // Gentle gravity toward Earth center, fading with distance.
    const ex = 0, ey = EARTH_R;
    const dx = r.x - ex, dy = r.y - ey, dist = Math.hypot(dx, dy);
    const g = 45 * (EARTH_R / dist) ** 2;
    r.vx -= (dx / dist) * g * dt; r.vy -= (dy / dist) * g * dt;
    r.vx *= 1 - 0.35 * dt; r.vy *= 1 - 0.35 * dt;
    const max = s.maxSpeed * (this.boosting ? 1.7 : 1);
    const sp = Math.hypot(r.vx, r.vy);
    if (sp > max) { r.vx *= max / sp; r.vy *= max / sp; }
    r.x += r.vx * dt; r.y += r.vy * dt;
    if (dist < EARTH_R + s.radius) {
      // Sit on the ground; no damage from Earth itself.
      const nx = dx / dist, ny = dy / dist;
      r.x = ex + nx * (EARTH_R + s.radius); r.y = ey + ny * (EARTH_R + s.radius);
      const vn = r.vx * nx + r.vy * ny;
      if (vn < 0) { r.vx -= vn * nx; r.vy -= vn * ny; }
      r.vx *= 0.9; r.vy *= 0.9;
    }
    if (throttle > 0) this.emitFlames(throttle);

    const alt = this.altitude;
    this.maxAlt = Math.max(this.maxAlt, alt);
    if (alt > 20) this.coins += coinRate(alt) * dt;
    if (s.hp && r.hp / s.hp < 0.3 && Math.random() < dt * 20) this.puff(r.x, r.y, '#777', 1, 30);
    for (const lm of LANDMARKS) if (alt >= lm.alt && !this.reached.has(lm.name)) {
      this.reached.add(lm.name);
      const bonus = Math.round(lm.alt / 50);
      this.coins += bonus;
      this.toast(`${lm.emoji} You reached ${lm.name}! +🪙${bonus}`);
    }

    this.spawn(dt, alt);
    this.updateWeapons(dt);
    this.updateShots(dt);
    this.updateMeteors(dt);
    this.updatePickups(dt);
    r.inv = Math.max(0, r.inv - dt);
    this.updateHud();
  }

  viewRadius() { return Math.hypot(this.w, this.h) / 2 / this.zoom(); }

  zoom() { return clamp(Math.min(this.w, this.h) / (this.stats.radius * 2 * 5), 0.5, 1.7); }

  spawn(dt, alt) {
    const r = this.rocket, vr = this.viewRadius();
    const ring = () => {
      // Spawn mostly ahead of the rocket's motion so flying forward meets action.
      const sp = Math.hypot(r.vx, r.vy);
      const base = sp > 40 ? Math.atan2(r.vy, r.vx) : rand(-Math.PI, Math.PI);
      const ang = base + rand(-1.4, 1.4);
      const d = vr + rand(40, 160);
      return [r.x + Math.cos(ang) * d, r.y + Math.sin(ang) * d];
    };
    if (alt > 120) {
      const rate = Math.min(3.5, 0.5 + this.time / 35 + alt / 8000);
      this.spawnM += dt * rate;
      while (this.spawnM > 1 && this.meteors.length < 60) {
        this.spawnM -= 1;
        const [x, y] = ring();
        const size = Math.random() < 0.15 ? rand(34, 55) : rand(10, 28);
        const toR = Math.atan2(r.y - y, r.x - x) + rand(-0.5, 0.5);
        const speed = rand(40, 110) + Math.min(120, this.time * 0.8);
        this.addMeteor(x, y, size, Math.cos(toR) * speed, Math.sin(toR) * speed);
      }
    }
    this.spawnP += dt * 0.9;
    while (this.spawnP > 1 && this.pickups.length < 25) {
      this.spawnP -= 1;
      if (alt < 60) continue;
      const [x, y] = ring();
      const roll = Math.random();
      const type = roll < 0.6 ? 'coin' : roll < 0.75 ? 'repair' : roll < 0.87 ? 'energy' : 'crate';
      this.pickups.push({ x, y, vx: rand(-15, 15), vy: rand(-15, 15), type, t: 0 });
    }
    const far = vr * 2.5;
    const near = e => Math.hypot(e.x - r.x, e.y - r.y) < far;
    this.meteors = this.meteors.filter(near);
    this.pickups = this.pickups.filter(near);
  }

  addMeteor(x, y, size, vx, vy) {
    const n = 9;
    const verts = Array.from({ length: n }, (_, i) => [i / n * Math.PI * 2, size * rand(0.75, 1.15)]);
    this.meteors.push({ x, y, vx, vy, r: size, hp: size * 1.2, verts, rot: 0, spin: rand(-1.5, 1.5), hit: 0,
      color: `hsl(${rand(15, 35)}, ${rand(15, 35)}%, ${rand(28, 42)}%)` });
  }

  toWorld(lx, ly) {
    const r = this.rocket, c = Math.cos(r.a), s = Math.sin(r.a);
    return [r.x + lx * c - ly * s, r.y + lx * s + ly * c];
  }

  updateWeapons(dt) {
    const r = this.rocket;
    this.stats.weapons.forEach((w, i) => {
      r.cooldowns[i] -= dt;
      if (r.cooldowns[i] > 0) return;
      const spec = WEAPONS[w.type];
      const [wx, wy] = this.toWorld(w.lx, w.ly);
      let best = null, bd = spec.range;
      for (const m of this.meteors) {
        const d = Math.hypot(m.x - wx, m.y - wy) - m.r;
        if (d < bd) { bd = d; best = m; }
      }
      if (!best) return;
      r.cooldowns[i] = spec.cooldown;
      const ang = Math.atan2(best.y - wy, best.x - wx);
      const count = spec.count || 1;
      for (let k = 0; k < count; k++) {
        const a = ang + (k - (count - 1) / 2) * (spec.spread || 0);
        this.shots.push({ x: wx, y: wy, vx: Math.cos(a) * spec.speed + r.vx, vy: Math.sin(a) * spec.speed + r.vy,
          type: w.type, life: spec.range / spec.speed * 1.4, target: best, px: wx, py: wy });
      }
    });
  }

  updateShots(dt) {
    for (const s of this.shots) {
      const spec = WEAPONS[s.type];
      s.life -= dt;
      s.px = s.x; s.py = s.y;
      if (spec.homing && s.target && this.meteors.includes(s.target)) {
        const want = Math.atan2(s.target.y - s.y, s.target.x - s.x);
        const cur = Math.atan2(s.vy, s.vx);
        const na = cur + clamp(wrapAngle(want - cur), -spec.homing * dt, spec.homing * dt);
        s.vx = Math.cos(na) * spec.speed; s.vy = Math.sin(na) * spec.speed;
      }
      if (s.type === 'missile' && Math.random() < 0.7) this.puff(s.x, s.y, '#ffb347', 1, 15);
      s.x += s.vx * dt; s.y += s.vy * dt;
      for (const m of this.meteors) {
        if (Math.hypot(m.x - s.x, m.y - s.y) < m.r + spec.radius) {
          m.hp -= spec.damage; m.hit = 0.1; s.life = 0;
          this.puff(s.x, s.y, spec.color, 6, 80);
          if (s.type === 'missile') for (const o of this.meteors) if (o !== m && Math.hypot(o.x - s.x, o.y - s.y) < 70 + o.r) o.hp -= spec.damage / 2;
          break;
        }
      }
    }
    this.shots = this.shots.filter(s => s.life > 0);
    const alive = [];
    for (const m of this.meteors) {
      if (m.hp > 0) { alive.push(m); continue; }
      this.explode(m);
      if (m.r > 30) for (let k = 0; k < 2; k++) {
        const a = rand(0, Math.PI * 2);
        this.addMeteorTo(alive, m.x + Math.cos(a) * m.r / 2, m.y + Math.sin(a) * m.r / 2, m.r * 0.5, m.vx + Math.cos(a) * 60, m.vy + Math.sin(a) * 60);
      }
      if (Math.random() < 0.45) this.pickups.push({ x: m.x, y: m.y, vx: m.vx * 0.3, vy: m.vy * 0.3, type: 'coin', t: 0 });
    }
    this.meteors = alive;
  }

  addMeteorTo(list, x, y, size, vx, vy) {
    const before = this.meteors;
    this.meteors = list;
    this.addMeteor(x, y, size, vx, vy);
    this.meteors = before;
  }

  explode(m) {
    this.puff(m.x, m.y, m.color, Math.min(30, m.r), m.r * 4);
    this.puff(m.x, m.y, '#ffcc33', 8, m.r * 3);
  }

  updateMeteors(dt) {
    const r = this.rocket, s = this.stats;
    for (const m of this.meteors) {
      m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.spin * dt; m.hit = Math.max(0, m.hit - dt);
    }
    const survivors = [];
    for (const m of this.meteors) {
      const d = Math.hypot(m.x - r.x, m.y - r.y);
      if (d > s.radius + m.r + 30) { survivors.push(m); continue; }
      if (this.shielding && d < s.radius + 16 + m.r) {
        r.energy = Math.max(0, r.energy - 6);
        this.explode(m);
        this.pickups.push({ x: m.x, y: m.y, vx: 0, vy: 0, type: 'coin', t: 0 });
        continue;
      }
      let hit = false;
      for (const c of s.cells) {
        const [cx, cy] = this.toWorld(c.lx, c.ly);
        if (Math.hypot(m.x - cx, m.y - cy) < m.r * 0.85 + CELL * 0.5) { hit = true; break; }
      }
      if (!hit) { survivors.push(m); continue; }
      this.explode(m);
      const nx = (r.x - m.x) / (d || 1), ny = (r.y - m.y) / (d || 1);
      r.vx += nx * m.r * 4; r.vy += ny * m.r * 4;
      if (r.inv <= 0) {
        const dmg = Math.round(m.r * 0.7);
        r.hp -= dmg;
        r.inv = 0.6;
        this.shake = 12;
        if (navigator.vibrate) navigator.vibrate(60);
        if (r.hp <= 0) this.crash();
      }
    }
    this.meteors = survivors;
  }

  updatePickups(dt) {
    const r = this.rocket, s = this.stats;
    const keep = [];
    for (const p of this.pickups) {
      p.t += dt;
      const dx = r.x - p.x, dy = r.y - p.y, d = Math.hypot(dx, dy);
      if (d < s.radius + s.magnet) {
        const pull = 400 * (1 - d / (s.radius + s.magnet + 1)) + 120;
        p.vx += (dx / d) * pull * dt * 4; p.vy += (dy / d) * pull * dt * 4;
      }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 1 - dt; p.vy *= 1 - dt;
      if (d < s.radius + 10) { this.collect(p); continue; }
      keep.push(p);
    }
    this.pickups = keep;
  }

  collect(p) {
    const r = this.rocket, s = this.stats;
    if (p.type === 'coin') { const v = 3 + Math.floor(this.altitude / 1500); this.coins += v; this.puff(p.x, p.y, '#ffd700', 6, 60); }
    if (p.type === 'repair') { r.hp = Math.min(s.hp, r.hp + Math.ceil(s.hp * 0.25)); this.toast('🔧 Repaired!'); }
    if (p.type === 'energy') { r.energy = s.energyMax; if (s.hasBoost || s.hasShield) this.toast('⚡ Energy full!'); else this.coins += 3; }
    if (p.type === 'crate') {
      const res = rollCrate(this.save);
      if (res.type === 'unlock') { this.unlocks.push(res.part); this.toast(`🎁 New part: ${PARTS[res.part].icon} ${PARTS[res.part].name}!`); }
      else { this.coins += res.amount; this.toast(`🎁 Treasure! +🪙${res.amount}`); }
    }
  }

  crash() {
    this.over = true;
    this.rocket.hp = 0;
    const r = this.rocket;
    for (const c of this.stats.cells) {
      const [x, y] = this.toWorld(c.lx, c.ly);
      this.puff(x, y, PARTS[c.part].color, 6, 160);
    }
    this.puff(r.x, r.y, '#ff6a00', 40, 250);
    this.puff(r.x, r.y, '#ffe066', 25, 200);
    this.shake = 25;
    this.updateHud();
  }

  finish(crashed) {
    if (this.ended) return;
    this.ended = true;
    this.running = false;
    $('flight').classList.add('hidden');
    this.input.boost = this.input.barrier = false;
    this.input.stick = null;
    this.onEnd({ crashed, coins: Math.floor(this.coins), time: this.time, altitude: this.maxAlt, unlocks: this.unlocks });
    this.ended = false;
  }

  emitFlames(throttle) {
    for (const e of this.engines) {
      const big = PARTS[e.part].thrust > 400;
      const [x, y] = this.toWorld(e.lx, e.ly + CELL * 0.6);
      const back = this.rocket.a + Math.PI / 2;
      for (let k = 0; k < (this.boosting ? 3 : 1); k++) {
        const a = back + rand(-0.25, 0.25);
        const sp = rand(120, 220) * (big ? 1.5 : 1) * throttle;
        this.particles.push({ x, y, vx: Math.cos(a) * sp + this.rocket.vx, vy: Math.sin(a) * sp + this.rocket.vy, life: rand(0.2, 0.4), max: 0.4,
          size: rand(3, 6) * (big ? 1.6 : 1), color: this.boosting ? '#7fd3ff' : (Math.random() < 0.5 ? '#ffcd03' : '#fe8a18') });
      }
    }
  }

  puff(x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(0.2, 1) * speed;
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.3, 0.9), max: 0.9, size: rand(2, 5), color });
    }
    if (this.particles.length > 900) this.particles.splice(0, this.particles.length - 900);
  }

  updateParticles(dt) {
    for (const p of this.particles) { p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt; p.vx *= 1 - 2 * dt; p.vy *= 1 - 2 * dt; }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  updateHud() {
    const r = this.rocket, s = this.stats;
    $('hp-fill').style.width = `${clamp(r.hp / s.hp, 0, 1) * 100}%`;
    $('en-fill').style.width = `${clamp(r.energy / s.energyMax, 0, 1) * 100}%`;
    $('f-coins').textContent = Math.floor(this.coins);
    $('f-alt').textContent = Math.floor(this.altitude);
  }

  render() {
    const { ctx, w, h, dpr } = this;
    const r = this.rocket;
    const alt = this.altitude;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Sky: blue near Earth, fading to deep space.
    const k = clamp(alt / 900, 0, 1);
    const mix = (a, b) => Math.round(a + (b - a) * k);
    ctx.fillStyle = `rgb(${mix(90, 3)},${mix(170, 4)},${mix(255, 20)})`;
    ctx.fillRect(0, 0, w, h);

    ctx.globalAlpha = clamp(alt / 400, 0.1, 1);
    for (const layer of this.stars) {
      ctx.fillStyle = '#fff';
      const ox = -r.x * layer.depth, oy = -r.y * layer.depth;
      for (const [sx, sy, sz] of layer.pts) {
        const x = ((sx + ox) % 1024 + 1024) % 1024, y = ((sy + oy) % 1024 + 1024) % 1024;
        for (let tx = x; tx < w; tx += 1024) for (let ty = y; ty < h; ty += 1024) ctx.fillRect(tx, ty, sz * (layer.depth * 2 + 0.5), sz * (layer.depth * 2 + 0.5));
      }
    }
    ctx.globalAlpha = 1;

    // Far-away planets with parallax.
    for (const lm of LANDMARKS) {
      const px = w / 2 + lm.x - r.x * 0.25, py = h / 2 + (-lm.alt / METERS - r.y) * 0.25;
      if (px < -lm.r * 2 || px > w + lm.r * 2 || py < -lm.r * 2 || py > h + lm.r * 2) continue;
      this.drawPlanet(ctx, px, py, lm);
    }

    const z = this.zoom();
    const sx = rand(-1, 1) * this.shake, sy = rand(-1, 1) * this.shake;
    ctx.save();
    ctx.translate(w / 2 + sx, h / 2 + sy);
    ctx.scale(z, z);
    ctx.translate(-r.x, -r.y);

    this.drawEarth(ctx);

    for (const p of this.pickups) this.drawPickup(ctx, p);
    for (const m of this.meteors) {
      ctx.save();
      ctx.translate(m.x, m.y); ctx.rotate(m.rot);
      ctx.beginPath();
      m.verts.forEach(([a, d], i) => { const x = Math.cos(a) * d, y = Math.sin(a) * d; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.closePath();
      ctx.fillStyle = m.hit > 0 ? '#fff' : m.color; ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.2)';
      ctx.beginPath(); ctx.arc(m.r * 0.3, -m.r * 0.2, m.r * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(-m.r * 0.35, m.r * 0.3, m.r * 0.15, 0, Math.PI * 2); ctx.fill();
      ctx.restore();
    }
    for (const p of this.particles) {
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    for (const s of this.shots) {
      const spec = WEAPONS[s.type];
      ctx.strokeStyle = spec.color; ctx.lineWidth = spec.radius * 1.4; ctx.lineCap = 'round';
      ctx.beginPath();
      if (s.type === 'laser') { const l = 0.03; ctx.moveTo(s.x - s.vx * l, s.y - s.vy * l); ctx.lineTo(s.x, s.y); ctx.stroke(); }
      else { ctx.fillStyle = spec.color; ctx.arc(s.x, s.y, spec.radius, 0, Math.PI * 2); ctx.fill(); }
    }

    if (!this.over) {
      ctx.save();
      ctx.translate(r.x, r.y); ctx.rotate(r.a);
      if (r.inv > 0 && Math.floor(r.inv * 12) % 2) ctx.globalAlpha = 0.4;
      const sp = this.sprite;
      ctx.drawImage(sp.canvas, -sp.ox, -sp.oy, sp.w, sp.h);
      ctx.restore();
      if (this.shielding) {
        ctx.beginPath(); ctx.arc(r.x, r.y, this.stats.radius + 16, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(54,174,191,0.22)'; ctx.fill();
        ctx.lineWidth = 4; ctx.strokeStyle = `rgba(127,211,255,${0.6 + Math.sin(this.time * 20) * 0.3})`; ctx.stroke();
      }
    }
    ctx.restore();

    // Joystick
    const st = this.input.stick;
    if (st) {
      ctx.globalAlpha = 0.18;
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(st.bx, st.by, this.input.maxR, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.45;
      const d = Math.hypot(st.x - st.bx, st.y - st.by), m = Math.min(1, this.input.maxR / (d || 1));
      ctx.beginPath(); ctx.arc(st.bx + (st.x - st.bx) * m, st.by + (st.y - st.by) * m, 32, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    } else if (this.time < 6 && !this.over) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 22px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('👆 Touch & drag anywhere to fly!', w / 2, h * 0.78);
    }
    // Edge arrows toward nearby crates so kids can find them.
    for (const p of this.pickups) {
      if (p.type !== 'crate') continue;
      const dx = (p.x - r.x) * z, dy = (p.y - r.y) * z;
      if (Math.abs(dx) < w / 2 && Math.abs(dy) < h / 2) continue;
      const a = Math.atan2(dy, dx);
      const t = Math.min((w / 2 - 30) / Math.abs(Math.cos(a) || 1e-6), (h / 2 - 30) / Math.abs(Math.sin(a) || 1e-6));
      ctx.save();
      ctx.translate(w / 2 + Math.cos(a) * t, h / 2 + Math.sin(a) * t); ctx.rotate(a);
      ctx.fillStyle = '#ffcd03';
      ctx.beginPath(); ctx.moveTo(14, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }

  drawEarth(ctx) {
    const cy = EARTH_R;
    if (this.rocket.y > -EARTH_R * 3) {
      ctx.beginPath(); ctx.arc(0, cy, EARTH_R + 60, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(120,190,255,0.35)'; ctx.fill();
      ctx.beginPath(); ctx.arc(0, cy, EARTH_R, 0, Math.PI * 2);
      ctx.fillStyle = '#1e6fd9'; ctx.fill();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#3fae49';
      for (const [x, y, rr] of [[-300, 40, 260], [380, 90, 300], [-900, 300, 380], [900, 400, 420], [0, 900, 500], [60, 30, 140]]) {
        ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
      // Launch pad
      ctx.fillStyle = '#6d6e70'; ctx.fillRect(-90, -6, 180, 14);
      ctx.fillStyle = '#ffcd03';
      for (let x = -84; x < 84; x += 24) ctx.fillRect(x, -6, 12, 4);
    }
  }

  drawPlanet(ctx, x, y, lm) {
    ctx.save();
    const r = lm.r * 0.5;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(x - r * 0.4, y - r * 0.4, r * 0.1, x, y, r);
    grad.addColorStop(0, '#fff'); grad.addColorStop(0.15, lm.color); grad.addColorStop(1, '#000');
    ctx.fillStyle = grad; ctx.fill();
    if (lm.ring) {
      ctx.strokeStyle = 'rgba(240,220,170,0.8)'; ctx.lineWidth = r * 0.12;
      ctx.beginPath(); ctx.ellipse(x, y, r * 1.8, r * 0.45, -0.3, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 16px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(lm.name, x, y + r + 22);
    ctx.restore();
  }

  drawPickup(ctx, p) {
    const bob = Math.sin(p.t * 4) * 2;
    ctx.save();
    ctx.translate(p.x, p.y + bob);
    if (p.type === 'coin') {
      ctx.fillStyle = '#b8860b'; ctx.beginPath(); ctx.arc(0, 2, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      const glow = { repair: '#4bd65a', energy: '#36aebf', crate: '#ffcd03' }[p.type];
      ctx.shadowColor = glow; ctx.shadowBlur = 18;
      ctx.fillStyle = p.type === 'crate' ? '#a0522d' : 'rgba(0,0,0,.5)';
      ctx.fillRect(-16, -16, 32, 32);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = glow; ctx.lineWidth = 3; ctx.strokeRect(-16, -16, 32, 32);
      ctx.font = '20px system-ui, "Apple Color Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText({ repair: '🔧', energy: '⚡', crate: '❓' }[p.type], 0, 1);
    }
    ctx.restore();
  }
}
