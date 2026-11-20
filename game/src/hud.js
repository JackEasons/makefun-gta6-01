// The HUD: every DOM panel, the waypoint compass, the dispatch rows, the
// dialogue box, toasts, and the circular minimap drawn on a canvas.
import { RADIO, WEAPONS, districtAt, heatWord, formatCash, formatClock, formatTimer } from './config.js';
import { missionPanel } from './missions.js';
import { dispatchRows } from './police.js';

const $ = (id) => document.getElementById(id);

export function createHud(G) {
  const hud = {
    dialogueUntil: 0,
    toastUntil: 0,
    mapTimer: 0,
    slots: [],
  };

  // Weapon slots are built once; their contents are rewritten each frame.
  const weaponsEl = $('weapons');
  for (let i = 0; i < 4; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'weapon-slot';
    slot.innerHTML =
      '<span class="w-key">' + (i + 1) + '</span>' +
      '<span class="w-name">' + WEAPONS[i].name + '</span>' +
      '<span class="w-ammo"></span>';
    weaponsEl.appendChild(slot);
    hud.slots.push(slot);
  }

  hud.showDialogue = function showDialogue(name, initials, line, seconds) {
    $('dialogue-avatar').textContent = initials;
    $('dialogue-name').textContent = name;
    $('dialogue-line').textContent = line;
    $('dialogue').classList.add('show');
    hud.dialogueUntil = G.time + (seconds || 7);
  };

  hud.hideDialogue = function hideDialogue() {
    $('dialogue').classList.remove('show');
  };

  hud.toast = function toast(text) {
    const el = $('toast');
    el.textContent = text;
    el.classList.remove('hidden');
    hud.toastUntil = G.time + 3;
  };

  hud.setStatus = function setStatus(text) {
    $('status').textContent = text;
  };

  function updateStars() {
    const wanted = G.police.wanted;
    let html = '';
    for (let i = 0; i < 5; i += 1) {
      html += i < wanted ? '★' : '<span class="off">☆</span>';
    }
    $('stars').innerHTML = html;
  }

  function updateNav() {
    const nav = $('nav');
    const target = G.missions.target;
    if (!target) {
      nav.classList.add('hidden');
      return;
    }
    const dx = target.x - G.player.x;
    const dz = target.z - G.player.z;
    const dist = Math.hypot(dx, dz);
    const bearing = Math.atan2(dx, dz);
    let rel = bearing - (G.camYaw + Math.PI);
    while (rel > Math.PI) rel -= Math.PI * 2;
    while (rel < -Math.PI) rel += Math.PI * 2;
    const rotation = -rel - Math.PI / 2;
    $('nav-arrow').style.transform = 'rotate(' + rotation + 'rad)';
    $('nav-text').textContent =
      'NEXT ▸ ' + missionPanel(G).next + ' · ' + Math.round(dist) + 'm';
    nav.classList.remove('hidden');
  }

  function updateDispatch() {
    const rows = dispatchRows(G);
    const el = $('dispatch-rows');
    let html = '';
    for (const row of rows) {
      html += '<div class="dispatch-row"><span class="d-name">' + row.name + '</span>' +
        '<span class="d-role">' + row.role + '</span>' +
        '<span class="d-dist">' + row.dist + 'm</span></div>';
    }
    el.innerHTML = html;
  }

  function updateWeapons() {
    for (let i = 0; i < 4; i += 1) {
      const slot = hud.slots[i];
      const w = G.weapons.list[i];
      const unlocked = (i < 2) || (i === 2 && G.missions.index >= 1) || (i === 3 && G.missions.index >= 2);
      slot.classList.toggle('selected', G.weapons.selected === i);
      slot.classList.toggle('locked', !unlocked);
      const ammoEl = slot.querySelector('.w-ammo');
      ammoEl.textContent = !unlocked ? 'LOCKED' : (w.ammo === Infinity ? '∞' : String(w.ammo));
    }
  }

  function drawMinimap() {
    const canvas = $('minimap');
    const ctx = canvas.getContext('2d');
    const S = 200;
    const scale = S / 520; // world ±260 m maps onto the disc
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#16222e';
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2, 0, Math.PI * 2);
    ctx.clip();
    const toX = (x) => S / 2 + x * scale;
    const toY = (z) => S / 2 + z * scale;
    // City blocks.
    ctx.fillStyle = '#2c3e50';
    for (let bx = -204; bx <= 204; bx += 68) {
      for (let bz = -204; bz <= 136; bz += 68) {
        ctx.fillRect(toX(bx - 26), toY(bz - 26), 52 * scale, 52 * scale);
      }
    }
    // Beach and water.
    ctx.fillStyle = '#8a7a5a';
    ctx.fillRect(0, toY(165), S, S);
    ctx.fillStyle = '#1a4a6a';
    ctx.fillRect(0, toY(242), S, S);
    // Pedestrians and traffic as faint dots.
    ctx.fillStyle = 'rgba(220, 220, 200, 0.5)';
    for (const ped of G.peds) {
      ctx.fillRect(toX(ped.x) - 1, toY(ped.z) - 1, 2, 2);
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    for (const car of G.traffic) {
      ctx.fillRect(toX(car.x) - 1.5, toY(car.z) - 1.5, 3, 3);
    }
    // Police cruisers.
    ctx.fillStyle = '#ff4a3a';
    for (const c of G.police.cruisers) {
      if (c.leaving) continue;
      ctx.beginPath();
      ctx.arc(toX(c.x), toY(c.z), 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // Mission target.
    if (G.missions.target) {
      ctx.fillStyle = '#f0c040';
      ctx.beginPath();
      ctx.arc(toX(G.missions.target.x), toY(G.missions.target.z), 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#f0c040';
      ctx.beginPath();
      ctx.arc(toX(G.missions.target.x), toY(G.missions.target.z), 8, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Mara: a green arrow pointing along her heading.
    const px = toX(G.player.x);
    const py = toY(G.player.z);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.PI - G.player.heading);
    ctx.fillStyle = '#2fd67a';
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(-5, 6);
    ctx.lineTo(5, 6);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }

  hud.update = function update(dt) {
    const s = G.stats;
    $('cash').textContent = formatCash(s.cash);
    $('health-fill').style.width = Math.max(0, Math.min(100, s.health)) + '%';
    $('armour-fill').style.width = Math.max(0, Math.min(100, s.armour)) + '%';
    $('respect-fill').style.width = Math.max(0, Math.min(100, s.respect)) + '%';
    updateStars();
    $('air-unit').classList.toggle('hidden', !(G.police.heli && G.police.heli.active));
    $('day-clock').textContent = 'DAY ' + s.day + ' · ' + formatClock(s.clockMinutes);

    const panel = missionPanel(G);
    $('mission-title').textContent = panel.job;
    $('mission-stage').textContent = panel.stage;
    $('mission-next').textContent = panel.next;
    const timerEl = $('mission-timer');
    if (panel.timer === null || panel.timer === undefined) {
      timerEl.classList.add('hidden');
    } else {
      timerEl.classList.remove('hidden');
      timerEl.textContent = formatTimer(panel.timer);
    }

    updateNav();
    updateDispatch();
    updateWeapons();

    if (G.time > hud.dialogueUntil) hud.hideDialogue();
    if (G.time > hud.toastUntil) $('toast').classList.add('hidden');

    $('location-line').textContent =
      districtAt(G.player.x, G.player.z) + ' · ' + heatWord(G.police.wanted);

    const carInfo = $('car-info');
    const speedEl = $('speed');
    if (G.player.inCar && G.player.car) {
      carInfo.classList.remove('hidden');
      speedEl.classList.remove('hidden');
      $('car-name').textContent =
        G.player.car.name + ' · ' + Math.round(G.player.car.cond) + '%';
      $('car-condition-fill').style.width = Math.max(0, G.player.car.cond) + '%';
      speedEl.textContent = Math.round(Math.abs(G.player.car.speed) * 3.6) + ' km/h';
      $('radio-line').textContent = '♪ ' + RADIO[G.radio.station];
    } else {
      carInfo.classList.add('hidden');
      speedEl.classList.add('hidden');
      $('radio-line').textContent = '';
    }

    $('hint').textContent = G.player.inCar
      ? 'W A S D drive · E exit car · 1-4 weapons · R radio · P pause · M mute'
      : 'W A S D move · Shift run · E enter car · F punch / fire · 1-4 weapons · Tab next job · P pause';

    hud.mapTimer -= dt;
    if (hud.mapTimer <= 0) {
      hud.mapTimer = 0.15;
      drawMinimap();
    }
  };

  hud.refreshMenu = function refreshMenu() {
    const save = G.saveData;
    const cont = $('continue-btn');
    const line = $('save-line');
    if (save) {
      cont.classList.remove('hidden');
      line.textContent = 'Saved — Day ' + (save.day || 1) + ' · $' +
        Math.floor(save.cash || 0).toLocaleString('en-US');
    } else {
      cont.classList.add('hidden');
      line.textContent = '';
    }
  };

  return hud;
}
