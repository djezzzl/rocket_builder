import { PARTS, CELL } from './parts.js';

export const brickColor = (part, color) => (color && color !== 'auto' ? color : PARTS[part].color);

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const c = v => Math.max(0, Math.min(255, v + amt));
  const r = c(n >> 16), g = c((n >> 8) & 255), b = c(n & 255);
  return `rgb(${r},${g},${b})`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function stud(ctx, x, y, r, base) {
  ctx.fillStyle = shade(base, -40);
  ctx.beginPath(); ctx.arc(x, y + r * 0.25, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = shade(base, 25);
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.35, 0, Math.PI * 2); ctx.fill();
}

// Draws one LEGO-style brick with its top-left corner at (x, y).
export function drawBrick(ctx, x, y, s, part, color) {
  const base = brickColor(part, color);
  const p = PARTS[part];
  ctx.save();
  roundRect(ctx, x + s * 0.03, y + s * 0.03, s * 0.94, s * 0.94, s * 0.12);
  ctx.fillStyle = base; ctx.fill();
  ctx.lineWidth = Math.max(1, s * 0.05);
  ctx.strokeStyle = shade(base, -60); ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(x + s * 0.1, y + s * 0.08, s * 0.8, s * 0.1);
  const cx = x + s / 2, cy = y + s / 2;
  if (part === 'hull') stud(ctx, cx, cy, s * 0.22, base);
  else if (part === 'armor') {
    for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) stud(ctx, cx + dx * s * 0.2, cy + dy * s * 0.2, s * 0.13, base);
  } else if (part === 'cockpit') {
    ctx.fillStyle = '#7fd3ff';
    ctx.beginPath(); ctx.arc(cx, cy, s * 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#1b2a34'; ctx.lineWidth = s * 0.06; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath(); ctx.arc(cx - s * 0.1, cy - s * 0.1, s * 0.08, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.font = `${Math.floor(s * 0.6)}px system-ui, "Apple Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(p.icon, cx, cy + s * 0.04);
  }
  ctx.restore();
}

// Pre-renders the whole rocket once so flight can draw it rotated each frame cheaply.
export function makeRocketSprite(cells, scale = 2) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) {
    minX = Math.min(minX, c.lx); minY = Math.min(minY, c.ly);
    maxX = Math.max(maxX, c.lx); maxY = Math.max(maxY, c.ly);
  }
  const pad = CELL;
  const w = (maxX - minX) + pad * 2, h = (maxY - minY) + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(w * scale); canvas.height = Math.ceil(h * scale);
  const ctx = canvas.getContext('2d');
  ctx.scale(scale, scale);
  const ox = -minX + pad, oy = -minY + pad;
  for (const c of cells) drawBrick(ctx, c.lx + ox - CELL / 2, c.ly + oy - CELL / 2, CELL, c.part, c.color);
  return { canvas, ox, oy, w, h };
}
