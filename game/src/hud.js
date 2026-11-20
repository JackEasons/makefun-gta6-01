// Solmar Bay — the HUD: wanted stars, cash, health, armour and respect,
// the mission panel (job, stage, next step, clock), the police dispatch
// panel (named units with live distances), weapon slots, a dialogue box
// with a character avatar, the radio line, the car name and condition,
// the district line, day and clock — and a live top-down minimap drawn on
// a round canvas. All of it is DOM and 2D canvas over the 3D view, styled
// by style.css. Every number comes from the live game state, never from a
// static label: dispatch distances track the real cruisers, the mission
// panel reads the active job, the weapon slots read the real arsenal.

import { WORLD, WANTED_TUNING, districtAt, heatText } from './config.js';

export class Hud {
  constructor() {
    this.starsEl = document.getElementById('stars');
    this.airEl = document.getElementById('air-unit');
    this.dayEl = document.getElementById('day-clock');
    this.cashEl = document.getElementById('cash');
    this.healthFill = document.getElementById('health-fill');
    this.armourFill = document.getElementById('armour-fill');
    this.respectFill = document.getElementById('respect-fill');
    this.speedEl = document.getElementById('speed');
    this.radioEl = document.getElementById('radio-line');
    this.carInfoEl = document.getElementById('car-info');
    this.carNameEl = document.getElementById('car-name');
    this.carCondFill = document.getElementById('car-condition-fill');
    this.locationEl = document.getElementById('location-line');
    this.missionTitle = document.getElementById('mission-title');
    this.missionStage = document.getElementById('mission-stage');
    this.missionNext = document.getElementById('mission-next');
    this.missionTimer = document.getElementById('mission-timer');
    this.dispatchRows = document.getElementById('dispatch-rows');
    this.weaponsEl = document.getElementById('weapons');
    this.toastEl = document.getElementById('toast');
    this.dialogueEl = document.getElementById('dialogue');
    this.dialogueAvatar = document.getElementById('dialogue-avatar');
    this.dialogueName = document.getElementById('dialogue-name');
    this.dialogueLine = document.getElementById('dialogue-line');
    this.hintEl = document.getElementById('hint');
    this.map = document.getElementById('minimap');
    this.mapCtx = this.map.getContext('2d');
    this.toastTimer = 0;
    this.dialogueTimer = 0;
    this.lastDispatch = '';
    this.lastWeapons = '';
  }

  showToast(text, seconds = 4) {
    this.toastEl.textContent = text;
    this.toastEl.classList.add('show');
    this.toastTimer = seconds;
  }

  // A line of story dialogue, with the speaker's initials as the avatar.
  showDialogue(speaker, initials, line, seconds = 6) {
    this.dialogueAvatar.textContent = initials;
    this.dialogueName.textContent = speaker;
    this.dialogueLine.textContent = line;
    this.dialogueEl.classList.add('show');
    this.dialogueTimer = seconds;
  }

  update(dt, state) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0) this.toastEl.classList.remove('show');
    }
    if (this.dialogueTimer > 0) {
      this.dialogueTimer -= dt;
      if (this.dialogueTimer <= 0) this.dialogueEl.classList.remove('show');
    }
    // Wanted stars and the air unit flag.
    let stars = '';
    for (let i = 0; i < WANTED_TUNING.maxStars; i += 1) {
      stars += i < state.wanted ? '★' : '☆';
    }
    this.starsEl.textContent = stars;
    this.starsEl.classList.toggle('hot', state.wanted > 0);
    this.airEl.classList.toggle('hidden', !state.heliActive);
    // Day and clock.
    const hh = String(Math.floor(state.clockMinutes / 60)).padStart(2, '0');
    const mm = String(Math.floor(state.clockMinutes % 60)).padStart(2, '0');
    this.dayEl.textContent = `DAY ${state.day} · ${hh}:${mm}`;
    // Cash, health, armour, respect.
    this.cashEl.textContent = `$${state.cash.toLocaleString('en-US')}`;
    this.healthFill.style.width = `${Math.max(0, state.health)}%`;
    this.healthFill.classList.toggle('low', state.health < 30);
    this.armourFill.style.width = `${Math.max(0, state.armour)}%`;
    this.respectFill.style.width = `${Math.max(0, state.respect)}%`;
    // Speed, radio and the car being driven.
    this.speedEl.textContent = state.inCar ? `${Math.round(Math.abs(state.speed) * 3.6)} km/h` : '';
    this.radioEl.textContent = state.inCar ? `♪ ${state.radio}` : '';
    if (state.car) {
      this.carInfoEl.classList.remove('hidden');
      this.carNameEl.textContent = `${state.car.name} · ${Math.round(state.car.condition)}%`;
      this.carCondFill.style.width = `${Math.max(0, state.car.condition)}%`;
    } else {
      this.carInfoEl.classList.add('hidden');
    }
    // Where Mara is, and how hot the bay is there.
    this.locationEl.textContent = `${districtAt(state.playerX, state.playerZ)} · ${heatText(state.wanted)}`;
    // The mission panel: job, stage, next step, and the job clock.
    this.missionTitle.textContent = state.mission.job;
    this.missionStage.textContent = state.mission.stage;
    this.missionNext.textContent = state.mission.next;
    if (state.mission.timer !== null && state.mission.timer !== undefined) {
      const t = Math.max(0, state.mission.timer);
      const tm = Math.floor(t / 60);
      const ts = String(Math.floor(t % 60)).padStart(2, '0');
      this.missionTimer.textContent = `TIME ${tm}:${ts}`;
    } else {
      this.missionTimer.textContent = '';
    }
    this.drawDispatch(state.dispatch);
    this.drawWeapons(state.weapons);
    this.hintEl.textContent = state.inCar
      ? 'W A S D drive · E exit car · 1-4 weapons · R radio · P pause · M mute'
      : 'W A S D move · Shift run · E enter car · F punch / fire · 1-4 weapons · Tab next job · P pause';
    this.drawMinimap(state);
  }

  // Rebuilt only when the units or their distances change, so the DOM is
  // not rewritten sixty times a second.
  drawDispatch(rows) {
    const signature = rows.map((r) => `${r.callsign}:${r.role}:${r.dist}:${r.disabled ? 1 : 0}`).join('|');
    if (signature === this.lastDispatch) return;
    this.lastDispatch = signature;
    if (rows.length === 0) {
      this.dispatchRows.innerHTML = '<div class="dispatch-empty">NO UNITS DEPLOYED — THE BAY IS QUIET</div>';
      return;
    }
    this.dispatchRows.innerHTML = rows
      .map(
        (r) =>
          `<div class="dispatch-row${r.disabled ? ' disabled' : ''}">` +
          `<span class="unit">${r.callsign}</span><span class="role">${r.role}</span>` +
          `<span class="dist">${r.dist}m</span></div>`,
      )
      .join('');
  }

  // Weapon slots 1-4: name, ammo or LOCKED, and which one is selected.
  drawWeapons(slots) {
    const signature = slots.map((s) => `${s.name}:${s.ammo}:${s.locked ? 1 : 0}:${s.selected ? 1 : 0}`).join('|');
    if (signature === this.lastWeapons) return;
    this.lastWeapons = signature;
    this.weaponsEl.innerHTML = slots
      .map(
        (s, i) =>
          `<div class="weapon-slot${s.selected ? ' selected' : ''}${s.locked ? ' locked' : ''}">` +
          `<span class="w-key">${i + 1}</span><span class="w-name">${s.name}</span>` +
          `<span class="w-ammo">${s.locked ? 'LOCKED' : s.ammo === Infinity ? '∞' : s.ammo}</span></div>`,
      )
      .join('');
  }

  drawMinimap(state) {
    const ctx = this.mapCtx;
    const size = this.map.width;
    const half = WORLD.bounds;
    const toMap = (x, z) => [((x + half) / (half * 2)) * size, ((z + half) / (half * 2)) * size];
    ctx.clearRect(0, 0, size, size);
    // Bright bay chart: deep blue land, lighter water and sand.
    ctx.fillStyle = '#1d3247';
    ctx.fillRect(0, 0, size, size);
    // Water and sand on the south edge.
    const [, wy] = toMap(0, WORLD.waterStart);
    ctx.fillStyle = '#2a86a8';
    ctx.fillRect(0, wy, size, size - wy);
    const [, sy] = toMap(0, WORLD.beachStart);
    ctx.fillStyle = '#e8c98f';
    ctx.fillRect(0, sy, size, wy - sy);
    // Streets, wide and pale so the grid reads at a glance.
    ctx.strokeStyle = '#9aa0aa';
    ctx.lineWidth = 5;
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
    ctx.fillStyle = '#7a8390';
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
    // Mission marker, gold with a breathing ring.
    if (state.missionTarget) {
      const [mx, my] = toMap(state.missionTarget.x, state.missionTarget.z);
      const pulse = 8 + Math.sin(state.time * 3) * 3;
      ctx.strokeStyle = 'rgba(255, 200, 32, 0.8)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(mx, my, pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffc820';
      ctx.beginPath();
      ctx.arc(mx, my, 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#101826';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    // Police as flashing red dots, traffic as white dots, the air unit orange.
    for (const p of state.policeDots) {
      const [mx, my] = toMap(p.x, p.z);
      ctx.fillStyle = p.disabled ? '#7a3a3a' : '#ff3030';
      ctx.fillRect(mx - 3, my - 3, 6, 6);
    }
    for (const p of state.trafficDots) {
      const [mx, my] = toMap(p.x, p.z);
      ctx.fillStyle = '#d8dce2';
      ctx.fillRect(mx - 2, my - 2, 4, 4);
    }
    if (state.heliDot) {
      const [mx, my] = toMap(state.heliDot.x, state.heliDot.z);
      ctx.fillStyle = '#ff9a3c';
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Player arrow, pointing along the heading.
    const [px, py] = toMap(state.playerX, state.playerZ);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(Math.sin(state.heading), Math.cos(state.heading)) + Math.PI);
    ctx.fillStyle = '#37e08a';
    ctx.beginPath();
    ctx.moveTo(0, -9);
    ctx.lineTo(7, 8);
    ctx.lineTo(-7, 8);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}
