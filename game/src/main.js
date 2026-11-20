// Solmar Bay — A Sunset Hustle. Boot, game loop, camera, driving, mode
// machine (menu / playing / paused / caught / finale), the debug hooks the
// tests drive, and the staged screenshot mode.
import * as THREE from 'three';
import { WORLD, SPAWN, TUNING, RADIO, JOBS, PARKED_CARS } from './config.js';
import { makeRng } from './random.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { buildCity, moveWithCollision } from './city.js';
import { spawnParkedCars, syncCarMesh } from './vehicles.js';
import { createPlayer, updatePlayer } from './player.js';
import { spawnTraffic, updateTraffic, spawnPeds, updatePeds } from './traffic.js';
import { createPolice, updatePolice, addWanted, setWanted, nearestCruiserDist } from './police.js';
import { createWeapons, selectWeapon, fireWeapon, updateTracer } from './combat.js';
import { createMissions, startNextJob, updateMissions, missionPanel, missionObjective } from './missions.js';
import { saveGame, loadSave, applySave, hasSave } from './save.js';
import { createHud } from './hud.js';
import { stageShot, SHOT_NAMES } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = parseInt(params.get('seed') || '7', 10);
const seed = shotName ? (Number.isFinite(seedParam) ? seedParam : 7) : (Math.random() * 1e9) | 0;

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1200);
const clock = new THREE.Clock();
// The helicopter spotlight aims at this scene-level target, which the
// police update parks on Mara every frame.
const spotTarget = new THREE.Object3D();
scene.add(spotTarget);

const G = {
  scene,
  camera,
  renderer,
  seed,
  time: 0,
  mode: 'menu',
  frozen: false,
  shotPending: false,
  shotFrames: 0,
  camYaw: SPAWN.camYaw,
  spotTarget,
  pedRng: makeRng(seed + 71),
  radio: { station: 0 },
  saveData: loadSave(),
  stats: { cash: 0, health: 100, armour: 0, respect: 0, day: 1, clockMinutes: 1060 },
  player: {
    x: SPAWN.x, z: SPAWN.z, heading: 0, speed: 0,
    inCar: false, car: null, mesh: null,
  },
};

G.audio = createAudio();
G.input = createInput();
G.city = buildCity(G);
G.parkedCars = spawnParkedCars(G);
G.cars = [...G.parkedCars];
G.traffic = spawnTraffic(G);
G.peds = spawnPeds(G);
G.player.mesh = createPlayer(G).mesh;
G.police = createPolice(G);
G.weapons = createWeapons();
G.missions = createMissions();
G.hud = createHud(G);

G.onBusted = function onBusted() {
  if (G.mode !== 'playing') return;
  G.mode = 'caught';
  G.audio.deny();
  document.getElementById('caught').classList.remove('hidden');
  G.hud.setStatus('Busted.');
};

G.onStoryComplete = function onStoryComplete() {
  G.mode = 'finale';
  document.getElementById('finale').classList.remove('hidden');
  G.hud.setStatus('Story complete — Solmar Bay is yours.');
};

function resetGame() {
  G.stats = { cash: 0, health: 100, armour: 0, respect: 0, day: 1, clockMinutes: 1060 };
  G.missions.index = 0;
  G.missions.active = false;
  G.missions.stage = 0;
  G.missions.timer = null;
  G.missions.target = null;
  G.weapons.list[1].ammo = 24;
  G.weapons.list[2].ammo = 8;
  G.weapons.list[3].ammo = 60;
  G.weapons.selected = 0;
  G.player.x = SPAWN.x;
  G.player.z = SPAWN.z;
  G.player.heading = 0;
  G.player.speed = 0;
  G.player.inCar = false;
  G.player.car = null;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(SPAWN.x, 0, SPAWN.z);
  G.camYaw = SPAWN.camYaw;
  G.radio.station = 0;
  setWanted(G, 0);
  for (const c of [...G.police.cruisers]) {
    G.scene.remove(c.mesh);
  }
  G.police.cruisers = [];
  if (G.police.heli) {
    G.scene.remove(G.police.heli.mesh);
    G.police.heli = null;
  }
  // Parked cars return to their roster spots, showroom fresh.
  G.parkedCars.forEach((car, i) => {
    const spec = PARKED_CARS[i];
    car.x = spec.x;
    car.z = spec.z;
    car.heading = spec.heading;
    car.cond = 100;
    car.speed = 0;
    car.owner = 'civilian';
    car.disabled = false;
    syncCarMesh(car);
  });
  G.hud.hideDialogue();
  document.getElementById('toast').classList.add('hidden');
}

function startGame(fromSave) {
  resetGame();
  if (fromSave && G.saveData) {
    applySave(G, G.saveData);
  }
  G.mode = 'playing';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  document.getElementById('pause').classList.add('hidden');
  G.hud.setStatus('Playing Solmar Bay.');
  G.audio.unlock();
  G.audio.click();
  G.input.clearPressed();
}

function quitToMenu() {
  G.mode = 'menu';
  G.saveData = loadSave();
  G.hud.refreshMenu();
  document.getElementById('pause').classList.add('hidden');
  document.getElementById('hud').classList.add('hidden');
  document.getElementById('menu').classList.remove('hidden');
  G.hud.setStatus('Solmar Bay — A Sunset Hustle.');
}

function togglePause() {
  if (G.mode === 'playing') {
    G.mode = 'paused';
    saveGame(G);
    G.saveData = loadSave();
    document.getElementById('pause').classList.remove('hidden');
    G.hud.setStatus('Paused.');
    G.audio.setEngine(0, false);
  } else if (G.mode === 'paused') {
    G.mode = 'playing';
    document.getElementById('pause').classList.add('hidden');
    G.hud.setStatus('Playing Solmar Bay.');
  }
}

function respawnAfterBust() {
  G.stats.cash = Math.max(0, G.stats.cash - TUNING.bustFine);
  G.stats.health = 100;
  setWanted(G, 0);
  G.player.inCar = false;
  G.player.car = null;
  G.player.mesh.visible = true;
  G.player.x = SPAWN.x;
  G.player.z = SPAWN.z;
  G.player.heading = 0;
  G.player.mesh.position.set(SPAWN.x, 0, SPAWN.z);
  G.mode = 'playing';
  document.getElementById('caught').classList.add('hidden');
  saveGame(G);
  G.saveData = loadSave();
  G.hud.setStatus('Playing Solmar Bay.');
  G.hud.toast('You paid $200 and walked. The bay forgets — for now.');
}

document.getElementById('play-btn').addEventListener('click', () => startGame(false));
document.getElementById('continue-btn').addEventListener('click', () => startGame(true));
document.getElementById('resume-btn').addEventListener('click', togglePause);
document.getElementById('restart-btn').addEventListener('click', () => {
  document.getElementById('pause').classList.add('hidden');
  startGame(false);
});
document.getElementById('menu-btn').addEventListener('click', quitToMenu);
document.getElementById('caught-btn').addEventListener('click', respawnAfterBust);
document.getElementById('finale-btn').addEventListener('click', () => {
  document.getElementById('finale').classList.add('hidden');
  G.mode = 'playing';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ---- driving ----

function nearestCar(maxDist) {
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.kind === 'police' || car.disabled) continue;
    const d = Math.hypot(car.x - G.player.x, car.z - G.player.z);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

function enterCar(car) {
  if (car.owner === 'civilian') {
    addWanted(G, 1);
    car.owner = 'player';
    G.hud.toast('You stole the ' + car.name + '.');
  }
  G.player.inCar = true;
  G.player.car = car;
  G.player.mesh.visible = false;
  G.audio.click();
}

function exitCar() {
  const car = G.player.car;
  if (!car) return;
  car.speed = 0;
  const side = car.heading + Math.PI / 2;
  G.player.x = car.x + Math.sin(side) * 2.4;
  G.player.z = car.z + Math.cos(side) * 2.4;
  G.player.heading = car.heading;
  G.player.inCar = false;
  G.player.car = null;
  G.player.mesh.visible = true;
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.audio.click();
}

function updateDriving(dt) {
  const car = G.player.car;
  if (!car) return;
  const mv = G.input.moveVector();
  const p = G.player;
  if (mv.z > 0) car.speed += TUNING.carAccel * dt;
  else if (mv.z < 0) car.speed -= TUNING.carBrake * dt;
  else car.speed -= car.speed * TUNING.carDrag * dt;
  car.speed = Math.max(-TUNING.carReverseMax, Math.min(TUNING.carMaxSpeed, car.speed));
  if (Math.abs(car.speed) < 0.05 && mv.z === 0) car.speed = 0;
  const steer = -mv.x;
  car.heading += steer * Math.abs(car.speed) * TUNING.carTurn * dt * (car.speed >= 0 ? 1 : -1);
  if (car.cond <= 0) car.speed *= Math.max(0, 1 - dt * 2);
  const step = car.speed * dt;
  const before = { x: car.x, z: car.z };
  moveWithCollision(G.city.colliders, car, Math.sin(car.heading) * step, Math.cos(car.heading) * step);
  const moved = Math.hypot(car.x - before.x, car.z - before.z);
  if (Math.abs(step) > 0.01 && moved < Math.abs(step) * 0.25) {
    // Hard hit on a wall: slow down and scuff the paint.
    if (Math.abs(car.speed) > 9) car.cond = Math.max(0, car.cond - 5);
    car.speed *= 0.35;
  }
  // Nudge traffic cars out of the way instead of passing through them.
  for (const other of G.traffic) {
    if (other.disabled) continue;
    const d = Math.hypot(other.x - car.x, other.z - car.z);
    if (d < 4 && d > 0.01) {
      const push = (4 - d) * 0.5;
      const nx = (other.x - car.x) / d;
      const nz = (other.z - car.z) / d;
      other.x += nx * push;
      other.z += nz * push;
      if (Math.abs(car.speed) > 8) {
        car.cond = Math.max(0, car.cond - 3);
        other.speed *= 0.5;
      }
      syncCarMesh(other);
    }
  }
  p.x = car.x;
  p.z = car.z;
  p.heading = car.heading;
  p.speed = Math.abs(car.speed);
  syncCarMesh(car);
  G.audio.setEngine(Math.abs(car.speed) / TUNING.carMaxSpeed, true);
}

// ---- camera ----

function updateCamera(dt) {
  G.camYaw -= G.input.takeDragYaw();
  const p = G.player;
  // Close and low enough that the car reads large in the frame, the way
  // the staged shots show it: the car sits low-centre, the street runs
  // away ahead of it.
  const dist = p.inCar ? 7.5 : 6.5;
  const height = p.inCar ? 3.4 : 3.0;
  const cx = p.x + Math.sin(G.camYaw) * dist;
  const cz = p.z + Math.cos(G.camYaw) * dist;
  camera.position.set(cx, height, cz);
  // Look past the car toward the street ahead, not down at the roof: the
  // frame keeps the car low-centre and leaves sky at the top, where the
  // helicopter flies.
  const lookX = p.x - Math.sin(G.camYaw) * 8;
  const lookZ = p.z - Math.cos(G.camYaw) * 8;
  camera.lookAt(lookX, 2.2, lookZ);
}

function orbitCamera() {
  const a = G.time * 0.045;
  camera.position.set(Math.cos(a) * 190, 95, 40 + Math.sin(a) * 190);
  camera.lookAt(0, 8, 40);
}

// ---- per-frame update ----

function update(dt, rawDt) {
  const input = G.input;
  const p = G.player;

  if (input.pressed('KeyP')) togglePause();
  if (G.mode !== 'playing') return;
  if (input.pressed('KeyM')) G.audio.toggleMute();
  if (input.pressed('Tab')) startNextJob(G);
  if (input.pressed('KeyR') && p.inCar) {
    G.radio.station = (G.radio.station + 1) % RADIO.length;
    G.audio.radioBlip();
  }
  if (input.pressed('Digit1')) selectWeapon(G, 0);
  if (input.pressed('Digit2')) selectWeapon(G, 1);
  if (input.pressed('Digit3')) selectWeapon(G, 2);
  if (input.pressed('Digit4')) selectWeapon(G, 3);
  if (input.pressed('KeyF')) fireWeapon(G);
  if (input.pressed('KeyE')) {
    if (p.inCar) exitCar();
    else {
      const car = nearestCar(4.5);
      if (car) enterCar(car);
    }
  }

  if (p.inCar) updateDriving(dt);
  else updatePlayer(G, dt);

  updateTraffic(G, dt);
  updatePeds(G, dt);
  updatePolice(G, dt, rawDt);
  updateMissions(G, rawDt);
  updateTracer(G);

  // The clock and slow health regen run on wall time so a slow machine
  // still feels the day pass.
  G.stats.clockMinutes += rawDt * 0.25;
  if (G.stats.clockMinutes >= 1440) {
    G.stats.clockMinutes -= 1440;
    G.stats.day += 1;
  }
  if (G.police.wanted === 0 && G.stats.health < 100) {
    G.stats.health = Math.min(100, G.stats.health + TUNING.healthRegen * rawDt);
  }
  if (!p.inCar) G.audio.setEngine(0, false);

  updateCamera(dt);
  G.hud.update(dt);
}

// ---- state the tests read ----

function publishState() {
  const p = G.player;
  window.__solmar = {
    mode: G.mode,
    wanted: G.police.wanted,
    cash: Math.floor(G.stats.cash),
    health: Math.round(G.stats.health),
    armour: Math.round(G.stats.armour),
    respect: Math.round(G.stats.respect),
    day: G.stats.day,
    clockMinutes: G.stats.clockMinutes,
    inCar: p.inCar,
    speed: p.inCar && p.car ? Math.abs(p.car.speed) : p.speed,
    playerX: p.x,
    playerZ: p.z,
    camYaw: G.camYaw,
    navTarget: G.missions.target,
    missionIndex: G.missions.index,
    missionActive: G.missions.active,
    missionPanel: missionPanel(G),
    objective: missionObjective(G),
    policeCars: G.police.cruisers.filter((c) => !c.leaving).length,
    policePositions: G.police.cruisers.filter((c) => !c.leaving).map((c) => ({ x: c.x, z: c.z })),
    bustTimer: G.police.bustTimer,
    heliActive: !!(G.police.heli && G.police.heli.active),
    dispatch: G.police.cruisers.filter((c) => !c.leaving).length +
      (G.police.heli && G.police.heli.active ? 1 : 0),
    weapons: G.weapons.list.map((w) => ({ name: w.name, ammo: w.ammo })),
    trafficCars: G.traffic.length,
    pedestrians: G.peds.length,
    pedPositions: G.peds.map((ped) => ({ x: ped.x, z: ped.z, down: ped.down })),
  };
}

window.__solmarDebug = {
  teleport(x, z) {
    G.player.x = x;
    G.player.z = z;
    if (G.player.inCar && G.player.car) {
      G.player.car.x = x;
      G.player.car.z = z;
      syncCarMesh(G.player.car);
    }
    G.player.mesh.position.set(x, 0, z);
  },
  teleportCar(x, z) {
    if (G.player.inCar && G.player.car) {
      G.player.car.x = x;
      G.player.car.z = z;
      G.player.x = x;
      G.player.z = z;
      syncCarMesh(G.player.car);
      G.player.mesh.position.set(x, 0, z);
    }
  },
  startMission() {
    startNextJob(G);
  },
  setWanted(n) {
    setWanted(G, n);
  },
  setCash(n) {
    G.stats.cash = n;
  },
  setDay(n) {
    G.stats.day = n;
  },
  giveAmmo() {
    G.weapons.list[1].ammo = 120;
    G.weapons.list[2].ammo = 40;
    G.weapons.list[3].ammo = 240;
  },
};

// ---- boot ----

G.hud.refreshMenu();
publishState();

if (shotName && SHOT_NAMES.includes(shotName)) {
  // Staged screenshot: freeze the world in a mid-story moment, then point
  // the chase camera at it — the loop never runs update() while frozen.
  G.frozen = true;
  stageShot(G, shotName);
  updateCamera(0);
  G.shotPending = true;
  G.hud.setStatus('Playing Solmar Bay.');
} else if (shotName) {
  // Unknown shot name: still raise the flag so the tool does not hang.
  G.frozen = true;
  G.mode = 'playing';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  updateCamera(0);
  G.shotPending = true;
}

function frame() {
  requestAnimationFrame(frame);
  const rawDt = Math.min(clock.getDelta(), 1);
  const dt = Math.min(rawDt, 0.05);
  if (G.mode === 'playing' && !G.frozen) {
    G.time += dt;
    update(dt, rawDt);
  } else if (G.mode === 'menu') {
    G.time += dt;
    orbitCamera();
  } else if (G.mode === 'finale') {
    G.time += dt;
    updateCamera(dt);
  }
  renderer.render(scene, camera);
  publishState();
  if (G.shotPending) {
    G.shotFrames += 1;
    if (G.shotFrames >= 3) {
      window.__shotReady = true;
      G.shotPending = false;
    }
  }
}
frame();
