// Touch joystick (anywhere on the canvas) + keyboard fallback.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.stick = null; // { id, bx, by, x, y }
    this.keys = new Set();
    this.boost = false;
    this.barrier = false;
    this.maxR = 70;

    const pos = e => {
      const r = canvas.getBoundingClientRect();
      return [e.clientX - r.left, e.clientY - r.top];
    };
    canvas.addEventListener('pointerdown', e => {
      if (this.stick) return;
      const [x, y] = pos(e);
      this.stick = { id: e.pointerId, bx: x, by: y, x, y };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', e => {
      if (!this.stick || e.pointerId !== this.stick.id) return;
      const [x, y] = pos(e);
      this.stick.x = x; this.stick.y = y;
      e.preventDefault();
    });
    const end = e => { if (this.stick && e.pointerId === this.stick.id) this.stick = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    this.onKey = e => {
      const down = e.type === 'keydown';
      const k = e.key.toLowerCase();
      if (down) this.keys.add(k); else this.keys.delete(k);
      if (k === 'shift') this.boost = down;
      if (k === ' ') { this.barrier = down; e.preventDefault(); }
    };
    window.addEventListener('keydown', this.onKey);
    window.addEventListener('keyup', this.onKey);
  }

  bindHold(el, prop) {
    const on = e => { this[prop] = true; e.preventDefault(); };
    const off = () => { this[prop] = false; };
    el.addEventListener('pointerdown', on);
    el.addEventListener('pointerup', off);
    el.addEventListener('pointerleave', off);
    el.addEventListener('pointercancel', off);
  }

  // Returns { dx, dy, mag } with mag in 0..1, or null when idle.
  direction() {
    if (this.stick) {
      let dx = this.stick.x - this.stick.bx, dy = this.stick.y - this.stick.by;
      const d = Math.hypot(dx, dy);
      if (d < 8) return { dx: 0, dy: 0, mag: 0 };
      if (d > this.maxR) {
        // Drag the base along so the stick never feels "stuck" at the edge.
        this.stick.bx = this.stick.x - (dx / d) * this.maxR;
        this.stick.by = this.stick.y - (dy / d) * this.maxR;
        dx = (dx / d) * this.maxR; dy = (dy / d) * this.maxR;
      }
      return { dx: dx / this.maxR, dy: dy / this.maxR, mag: Math.min(1, d / this.maxR) };
    }
    const k = this.keys;
    const dx = (k.has('arrowright') || k.has('d') ? 1 : 0) - (k.has('arrowleft') || k.has('a') ? 1 : 0);
    const dy = (k.has('arrowdown') || k.has('s') ? 1 : 0) - (k.has('arrowup') || k.has('w') ? 1 : 0);
    if (!dx && !dy) return null;
    const d = Math.hypot(dx, dy);
    return { dx: dx / d, dy: dy / d, mag: 1 };
  }

  destroy() {
    window.removeEventListener('keydown', this.onKey);
    window.removeEventListener('keyup', this.onKey);
  }
}
