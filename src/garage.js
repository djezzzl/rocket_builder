import { PARTS, PART_IDS, GARAGE_SIZES, PAINTS } from './parts.js';
import { validateBuild, computeStats, tryPlace, tryRemove, tryUpgradeGarage } from './rocket.js';
import { drawBrick } from './draw.js';

const $ = id => document.getElementById(id);

export class Garage {
  constructor(save, { onSave, onLaunch, onReset }) {
    this.save = save;
    this.onSave = onSave;
    this.selected = 'hull';
    this.paint = 'auto';
    this.plate = $('plate');

    this.plate.addEventListener('pointerdown', e => this.tap(e));
    $('btn-launch').onclick = () => { if (validateBuild(this.save.bricks).ok) onLaunch(); };
    $('btn-upgrade').onclick = () => {
      const r = tryUpgradeGarage(this.save);
      this.say(r.ok ? 'Bigger garage! More room for bricks! 🎉' : r.reason);
      this.changed();
    };
    $('btn-reset').onclick = () => { if (confirm('Erase all progress and start over?')) onReset(); };
    window.addEventListener('resize', () => this.visible && this.render());
    this.renderPaints();
  }

  show(save) {
    this.save = save;
    this.visible = true;
    $('garage').classList.remove('hidden');
    this.renderPalette();
    this.render();
  }

  hide() { this.visible = false; $('garage').classList.add('hidden'); }

  say(text) { $('g-hint').textContent = text; }

  changed() { this.onSave(); this.renderPalette(); this.render(); }

  renderPaints() {
    const box = $('paints');
    box.innerHTML = '';
    for (const c of PAINTS) {
      const b = document.createElement('button');
      b.className = 'paint' + (c === this.paint ? ' selected' : '');
      b.style.background = c === 'auto' ? 'conic-gradient(#d01012, #ffcd03, #4b9f4a, #0055bf, #d01012)' : c;
      b.title = c === 'auto' ? 'Default colors' : 'Paint';
      b.onclick = () => { this.paint = c; this.renderPaints(); };
      box.appendChild(b);
    }
  }

  renderPalette() {
    const box = $('palette');
    const scroll = [box.scrollLeft, box.scrollTop];
    box.innerHTML = '';
    for (const id of PART_IDS) {
      const p = PARTS[id];
      const locked = !this.save.unlocked.includes(id);
      const btn = document.createElement('button');
      btn.className = 'part' + (id === this.selected ? ' selected' : '') + (locked ? ' locked' : '') + (this.save.coins < p.price ? ' poor' : '');
      const icon = document.createElement('canvas');
      icon.width = icon.height = 80;
      drawBrick(icon.getContext('2d'), 0, 0, 80, id, this.paint);
      const label = document.createElement('div');
      label.innerHTML = `<div class="name">${locked ? '🔒 ' : ''}${p.name}</div><div class="price">${locked ? 'Find in space!' : `🪙 ${p.price}`}</div>`;
      btn.append(icon, label);
      btn.onclick = () => {
        this.selected = id;
        this.say(locked ? `${p.name}: ${p.desc}. Collect ❓ crates in space to unlock it!` : `${p.name} (🪙 ${p.price}): ${p.desc}`);
        this.renderPalette();
      };
      box.appendChild(btn);
    }
    [box.scrollLeft, box.scrollTop] = scroll;
  }

  layout() {
    const g = GARAGE_SIZES[this.save.garage];
    const wrap = $('plate-wrap');
    const cell = Math.floor(Math.min(wrap.clientWidth / g.w, (wrap.clientHeight - 30) / g.h, 90));
    return { g, cell: Math.max(cell, 16) };
  }

  tap(e) {
    const { g, cell } = this.layout();
    const r = this.plate.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left) / cell), y = Math.floor((e.clientY - r.top) / cell);
    if (x < 0 || y < 0 || x >= g.w || y >= g.h) return;
    const existing = this.save.bricks.find(b => b.x === x && b.y === y);
    const res = existing ? tryRemove(this.save, x, y) : tryPlace(this.save, x, y, this.selected, this.paint);
    if (res.ok) this.say(existing ? `Took back ${PARTS[existing.part].name} (+🪙 ${PARTS[existing.part].price})` : `Placed ${PARTS[this.selected].name}!`);
    else this.say(res.reason);
    this.changed();
  }

  render() {
    const { g, cell } = this.layout();
    const dpr = window.devicePixelRatio || 1;
    const c = this.plate;
    c.width = g.w * cell * dpr; c.height = g.h * cell * dpr;
    c.style.width = `${g.w * cell}px`; c.style.height = `${g.h * cell}px`;
    const ctx = c.getContext('2d');
    ctx.scale(dpr, dpr);
    // Baseplate
    ctx.fillStyle = '#237841';
    ctx.fillRect(0, 0, g.w * cell, g.h * cell);
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath(); ctx.arc(x * cell + cell / 2, y * cell + cell / 2 + 2, cell * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2e9150';
      ctx.beginPath(); ctx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.22, 0, Math.PI * 2); ctx.fill();
    }
    for (const b of this.save.bricks) drawBrick(ctx, b.x * cell, b.y * cell, cell, b.part, b.color);

    const v = validateBuild(this.save.bricks);
    $('errors').textContent = v.errors.join(' ');
    $('btn-launch').disabled = !v.ok;
    $('g-coins').textContent = Math.floor(this.save.coins);
    $('g-best').textContent = Math.floor(this.save.best);
    const next = GARAGE_SIZES[this.save.garage + 1];
    $('btn-upgrade').textContent = next ? `Bigger garage ${next.w}×${next.h} (🪙 ${next.price})` : 'Max garage size!';
    $('btn-upgrade').disabled = !next || this.save.coins < next.price;

    const s = computeStats(this.save.bricks);
    const count = t => s.weapons.filter(w => w.type === t).length;
    const weapons = ['laser', 'blaster', 'missile'].filter(count).map(t => `${PARTS[t].icon}×${count(t)}`).join(' ') || 'none';
    $('stats').innerHTML = `
      <div>❤️ Health: <b>${s.hp}</b></div>
      <div>⚖️ Weight: <b>${s.mass.toFixed(1)}</b></div>
      <div>🔥 Speed: <b>${Math.round(s.accel)}</b></div>
      <div>🔄 Turning: <b>${s.turnRate.toFixed(1)}</b></div>
      <div>⚡ Energy: <b>${s.energyMax}</b></div>
      <div>🔫 Weapons: <b>${weapons}</b></div>
      <div>${s.hasBoost ? '🚀 Boost ✓' : ''} ${s.hasShield ? '🔵 Barrier ✓' : ''}</div>`;
  }
}
