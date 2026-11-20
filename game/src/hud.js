// Solmar Bay — the HUD: wanted stars, cash, health, speed, the mission
// objective, toasts, and a live top-down minimap drawn on a small canvas.
// All of it is DOM and 2D canvas over the 3D view, styled by style.css.

import { WORLD, WANTED_TUNING } from './config.js';

export class Hud {
  constructor() {
    this.starsEl = document.getElementById('stars');
    this.cashEl = document.getElementById('cash');
    this.healthFill = document.getElementById('health-fill');
    this.speedEl = document.getElementById('speed');
    this.objectiveEl = document.getElementById('objective');
    this.toastEl = document.getElementById('toast');
    this.hintEl = document.getElementById('hint');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
  }

  showToast(text, seconds = 4) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  update(dt, state) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
    // Wanted stars.
    let stars = '';
    for (let i = 0; i < WANTED_TUNING.maxStars; i += 1) {
      stars += i < state.wanted ? '★' : '☆';
    }
    this.starsEl.textContent = stars;
    this.starsEl.classList.toggle('hot', state.wanted > 0);
    this.cashEl.textContent = `$${state.cash.toLocaleString('en-US')}`;
    this.healthFill.style.width = `${Math.max(0, state.health)}%`;
    this.healthFill.classList.toggle('low', state.health < 30);
    this.speedEl.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
    this.objectiveEl.textContent = state.objective;
    this.hintEl.textContent = state.inCar
      ? 'W A S D drive · E exit car · P pause · M mute'
      : 'W A S D move · Shift run · E enter car · F punch · Tab next job · P pause';
    this.drawMinimap(state);
  }

  drawMinimap(state) {
    const ctx = this.mapCtx;
    const size = this.map.width;
    const half = WORLD.bounds;
    const toMap = (x, z) => [((x + half) / (half * 2)) * size, ((z + half) / (half * 2)) * size];
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#101826';
    ctx.fillRect(0, 0, size, size);
    // Water and sand on the south edge.
    const [, wy] = toMap(0, WORLD.waterStart);
    ctx.fillStyle = '#1d6f8f';
    ctx.fillRect(0, wy, size, size - wy);
    const [, sy] = toMap(0, WORLD.beachStart);
    ctx.fillStyle = '#c8a86a';
    ctx.fillRect(0, sy, size, wy - sy);
    // Streets.
    ctx.strokeStyle = '#4a5058';
    ctx.lineWidth = 3;
    const street = (c) => {
      const [x] = toMap(c, 0);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, size);
      ctx.stroke();
      const [, y] = toMap(0, c);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(size, y);
      ctx.stroke();
    };
    for (let i = 0; i <= WORLD.blocks; i += 1) {
      street(-WORLD.blocks * WORLD.pitch * 0.5 + i * WORLD.pitch);
    }
    // Buildings as pale blocks.
    ctx.fillStyle = '#5a6270';
    const block = WORLD.blockSize;
    for (let bx = 0; bx < WORLD.blocks; bx += 1) {
      for (let bz = 0; bz < WORLD.blocks; bz += 1) {
        const cx = -half + 20 + bx * WORLD.pitch + 7;
        const cz = -half + 20 + bz * WORLD.pitch + 7;
        const [mx, my] = toMap(cx, cz);
        const w = (block / (half * 2)) * size;
        ctx.fillRect(mx, my, w, w);
      }
    }
    // Mission marker.
    if (state.missionTarget) {
      const [mx, my] = toMap(state.missionTarget.x, state.missionTarget.z);
      ctx.fillStyle = '#ffc820';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#101826';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Police as red dots, traffic as white dots.
    for (const p of state.policeDots) {
      const [mx, my] = toMap(p.x, p.z);
      ctx.fillStyle = '#ff3030';
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }
    for (const p of state.trafficDots) {
      const [mx, my] = toMap(p.x, p.z);
      ctx.fillStyle = '#d8dce2';
      ctx.fillRect(mx - 1.5, my - 1.5, 3, 3);
    }
    // Player arrow, pointing along the heading.
    const [px, py] = toMap(state.playerX, state.playerZ);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)) + Math.PI);
    ctx.fillStyle = '#37e08a';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 6);
    ctx.lineTo(-5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
