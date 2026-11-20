// Solmar Bay — boot and the one loop: build the city, the cars, the people
// and the law, then run the game. Modes: menu, playing, paused, busted,
// wasted, finale. The loop reads input, advances every system, moves the
// camera, and paints the HUD. ?shot=cover|onfoot|driving|mission stages a
// fixed mid-game scene for screenshots instead of opening the menu — cash
// earned, a job in progress, the heat on, the air unit up.

import * as THREE from 'three';
import { WORLD, PALETTE, PLAYER_TUNING, CAR_TUNING, WANTED_TUNING, STORY, RADIO, DAY_TUNING } from './config.js';
import { makeRng, hashSeed } from './random.js';
import { createInput, ACTION_ENTER, ACTION_PUNCH, ACTION_PAUSE, ACTION_MUTE, ACTION_MISSION, ACTION_WEAPON, ACTION_RADIO } from './input.js';
import { AudioEngine } from './audio.js';
import { buildCity } from './city.js';
import { makeMara, walkPlayer } from './player.js';
import { makeCar, makePoliceCar, randomCarColor, driveCar, damageCar, collideCircle, resolveCircle } from './vehicles.js';
import { Traffic } from './traffic.js';
import { Police } from './police.js';
import { MissionManager } from './missions.js';
import { Combat } from './combat.js';
import { Hud } from './hud.js';
import { saveGame, loadGame, clearSave } from './save.js';
import { stageShot } from './shots.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 7;
const rng = makeRng(shotName ? hashSeed(shotName) + seed : seed);

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 900);

const city = buildCity(scene, seed);
const hud = new Hud();
const audio = new AudioEngine();
const input = createInput(canvas);
const traffic = new Traffic(scene, rng, city.colliders, city.streetCenters);
const police = new Police(scene, rng, city.colliders, city.streetCenters);
const missions = new MissionManager(scene, city.places);
const combat = new Combat();

// Mara and her starting point: the safehouse corner.
const mara = makeMara();
mara.group.position.set(city.places.safehouse.x, 0, city.places.safehouse.z);
scene.add(mara.group);

// Parked cars on the streets, one of them the gold coupe for Hot Wheels.
const parkedCars = [];
function parkCar(x, z, heading, color, style) {
  const car = makeCar(rng, color, style);
  car.group.position.set(x, 0, z);
  car.heading = heading;
  car.group.rotation.y = heading;
  scene.add(car.group);
  parkedCars.push(car);
  return car;
}
parkCar(30, -30, Math.PI / 2, 0xd8382c, 'sedan');
parkCar(-90, 30, 0, 0x2c8f8f, 'sedan');
parkCar(150, -150, -Math.PI / 2, 0xe8e8e8, 'coupe');
parkCar(-30, 150, Math.PI, 0x22242a, 'sedan');
parkCar(90, 90, Math.PI / 2, 0x7a4a9a, 'sedan');
parkCar(-150, -90, 0, 0xe86a20, 'sedan');
const coupe = parkCar(city.places.marinaRow.x, city.places.marinaRow.z, Math.PI / 2, 0xe8b820, 'coupe');
missions.markCoupe(coupe);

traffic.spawnCars(8);
traffic.spawnPedestrians(14);
traffic.spawnScooter();

// Game state.
const state = {
  mode: 'menu',
  cash: 0,
  health: PLAYER_TUNING.health,
  armour: 0,
  respect: 0,
  day: DAY_TUNING.startDay,
  clockMinutes: DAY_TUNING.startClock,
  radioIndex: 0,
  radioTimer: 0,
  airWarned: false,
  currentCar: null,
  camYaw: Math.PI * 0.75,
  camPitch: 0.34,
  lastRam: 0,
  lastCopRam: -10,
  lastSave: 0,
  time: 0,
  driving: false,
};

function announce(text) {
  statusEl.textContent = text;
}

function toast(text, seconds) {
  hud.showToast(text, seconds);
}

// A story line, shown in the dialogue box with Silas's avatar instead of
// the toast. The "Silas: " prefix and the quotes are the script's, not the
// spoken line, so they are stripped for the box.
function say(line) {
  const clean = line.replace(/^Silas: /, '').replace(/^"|"$/g, '');
  hud.showDialogue('Silas Crane', 'SC', clean, 6);
}

// Damage first eats the armour, then the health.
function applyDamage(amount) {
  let rest = amount;
  if (state.armour > 0) {
    const absorbed = Math.min(state.armour, rest);
    state.armour -= absorbed;
    rest -= absorbed;
  }
  state.health = Math.max(0, state.health - rest);
}

function playerPos() {
  return state.currentCar ? state.currentCar.group.position : mara.group.position;
}

function playerHeading() {
  return state.currentCar ? state.currentCar.heading : mara.group.rotation.y;
}

function enterNearestCar() {
  let best = null;
  let bestDist = CAR_TUNING.enterDistance;
  for (const car of parkedCars) {
    if (!car.parked) continue;
    const d = car.group.position.distanceTo(mara.group.position);
    if (d < bestDist) {
      bestDist = d;
      best = car;
    }
  }
  if (!best) return;
  state.currentCar = best;
  best.parked = false;
  mara.group.visible = false;
  state.camYaw = best.heading + Math.PI;
  // A new ride gets a new station.
  state.radioIndex = (state.radioIndex + 1) % RADIO.length;
  state.radioTimer = 0;
  audio.stationBlip();
  if (!best.stolen) {
    best.stolen = true;
    police.addCrime(WANTED_TUNING.stealCar);
    toast('You took the car — the heat is on. ★', 4);
    audio.honk();
  } else {
    toast('Back behind the wheel.', 2);
  }
}

function exitCar() {
  const car = state.currentCar;
  if (!car) return;
  car.speed = 0;
  const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
  mara.group.position.copy(car.group.position).addScaledVector(side, 2.6);
  mara.group.position.x = Math.max(-WORLD.bounds, Math.min(WORLD.bounds, mara.group.position.x));
  mara.group.position.z = Math.max(-WORLD.bounds, Math.min(WORLD.bounds, mara.group.position.z));
  resolveCircle(mara.group.position, PLAYER_TUNING.radius, city.colliders);
  mara.group.visible = true;
  state.currentCar = null;
}

function respawn(fine) {
  state.health = PLAYER_TUNING.health;
  state.cash = Math.max(0, state.cash - fine);
  police.clear();
  if (state.currentCar) {
    state.currentCar.speed = 0;
    state.currentCar = null;
  }
  mara.group.visible = true;
  mara.group.position.set(city.places.safehouse.x, 0, city.places.safehouse.z);
  mara.group.rotation.y = 0;
  state.camYaw = Math.PI * 0.75;
  state.mode = 'playing';
  document.getElementById('caught').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
  saveProgress();
}

function saveProgress() {
  // Save where Mara actually is — in the car, that is the car's position.
  const pos = playerPos();
  saveGame({
    cash: state.cash,
    missionsDone: missions.index,
    playerX: pos.x,
    playerZ: pos.z,
    heading: playerHeading(),
    health: state.health,
    respect: state.respect,
    armour: state.armour,
    day: state.day,
    clockMinutes: state.clockMinutes,
    ammo: combat.weapons.map((w) => w.ammo),
  });
}

function showScreen(id) {
  for (const el of ['menu', 'pause', 'caught', 'finale']) {
    document.getElementById(el).classList.toggle('hidden', el !== id);
  }
  document.getElementById('hud').classList.toggle('hidden', id !== null);
}

function startPlaying(fromSave) {
  audio.ensure();
  if (fromSave) {
    const saved = loadGame();
    if (saved) {
      state.cash = saved.cash;
      missions.index = Math.min(saved.missionsDone, 3);
      missions.done = missions.index >= 3;
      mara.group.position.set(saved.playerX, 0, saved.playerZ);
      mara.group.rotation.y = saved.heading || 0;
      state.health = saved.health;
      state.respect = saved.respect ?? 0;
      state.armour = saved.armour ?? 0;
      state.day = saved.day ?? DAY_TUNING.startDay;
      state.clockMinutes = saved.clockMinutes ?? DAY_TUNING.startClock;
      if (Array.isArray(saved.ammo) && saved.ammo.length === combat.weapons.length) {
        saved.ammo.forEach((a, i) => {
          if (typeof a === 'number') combat.weapons[i].ammo = a;
        });
      }
      toast(`Welcome back, Mara. $${state.cash} in your pocket.`, 4);
    }
  }
  state.mode = 'playing';
  showScreen(null);
  announce('Playing Solmar Bay.');
}

function handleActions() {
  const actions = input.takeActions();
  if (state.mode === 'playing') {
    if (actions & ACTION_PAUSE) {
      state.mode = 'paused';
      showScreen('pause');
      saveProgress();
      announce('Paused.');
    }
    if (actions & ACTION_ENTER) {
      if (state.currentCar) exitCar();
      else enterNearestCar();
    }
    // F fires the selected weapon — on foot, and from the driver's seat
    // too: a drive-by is the whole point of a gun in a car. Fists stay
    // on-foot only; you cannot throw a punch through a windshield.
    if (actions & ACTION_PUNCH) {
      if (state.currentCar && combat.current().id === 'fists') {
        toast('You cannot throw a punch from the driver seat.', 2);
      } else {
        const pos = state.currentCar ? state.currentCar.group.position : mara.group.position;
        const heading = state.currentCar ? state.currentCar.heading : mara.group.rotation.y;
        const result = combat.fire(pos, heading, traffic, police, audio);
        if (result === 'ped') {
          police.addCrime(WANTED_TUNING.hitPedestrian);
          toast('You knocked them flat. Someone called it in. ★', 3);
        } else if (result === 'police') {
          const crime = combat.current().id === 'fists' ? WANTED_TUNING.punchPolice : WANTED_TUNING.hitPolice;
          police.addCrime(crime);
          toast(combat.current().id === 'fists' ? 'You just punched a cop. Run. ★★' : 'You just shot at a cop. Run. ★★', 3);
        } else if (result === 'empty') {
          toast('Out of ammo — finish a job to restock.', 3);
        }
      }
    }
    if (actions & ACTION_MISSION) {
      if (!missions.active && missions.currentDef()) {
        missions.start(say);
        if (missions.active && missions.active.def.id === 'getaway') police.setStars(3);
      }
    }
    const weaponKey = input.takeWeapon();
    if (weaponKey > 0) {
      const result = combat.select(weaponKey - 1, missions.index);
      if (result === 'locked') toast('That weapon unlocks later in the story.', 2);
      else if (result === true) toast(`${combat.current().name} ready.`, 1);
    }
    if (input.takeRadio()) {
      state.radioIndex = (state.radioIndex + 1) % RADIO.length;
      state.radioTimer = 0;
      audio.stationBlip();
      toast(`♪ ${RADIO[state.radioIndex]}`, 2);
    }
  } else if (state.mode === 'paused' && (actions & (ACTION_PAUSE | ACTION_ENTER))) {
    state.mode = 'playing';
    showScreen(null);
  }
  if (actions & ACTION_MUTE) {
    audio.ensure();
    audio.setMuted(!audio.muted);
    toast(audio.muted ? 'Sound off.' : 'Sound on.', 2);
  }
}

function update(dt) {
  state.time += dt;
  // The bay clock: sunset keeps sliding toward night, day by day.
  state.clockMinutes += dt * DAY_TUNING.minutesPerSecond;
  if (state.clockMinutes >= 1440) {
    state.clockMinutes -= 1440;
    state.day += 1;
  }
  // The radio drifts to the next station on its own.
  state.radioTimer += dt;
  if (state.radioTimer > DAY_TUNING.radioCycleSeconds) {
    state.radioTimer = 0;
    state.radioIndex = (state.radioIndex + 1) % RADIO.length;
  }
  const mouse = input.takeMouse();
  state.camYaw -= mouse.dx * 0.005;
  state.camPitch = Math.max(0.08, Math.min(0.9, state.camPitch + mouse.dy * 0.003));
  combat.update(dt);

  // Traffic and pedestrians keep moving whatever Mara does.
  traffic.update(dt, playerPos());

  // Screenshot scenes drive with a scripted input instead of the keyboard.
  const drive = state.scripted
    ? {
        forward: () => state.scripted.fwd,
        strafe: () => state.scripted.str,
        running: () => false,
      }
    : input;

  let speed = 0;
  let walking = false;
  if (state.currentCar) {
    const car = state.currentCar;
    const result = driveCar(car, drive, dt, city.colliders, WORLD.bounds);
    speed = car.speed;
    if (result.crashed) {
      applyDamage(4);
      damageCar(car, 3);
      audio.thud();
    }
    // Running over pedestrians is a crime; bumping traffic slows you down.
    for (const ped of traffic.peds) {
      if (ped.down > 0) continue;
      if (ped.group.position.distanceTo(car.group.position) < 2.4 && Math.abs(car.speed) > 5) {
        ped.down = 5;
        ped.group.rotation.x = -Math.PI / 2;
        police.addCrime(WANTED_TUNING.hitPedestrian);
        toast('You hit a pedestrian! ★', 3);
        audio.thud();
      }
    }
    for (const other of traffic.cars) {
      const d = other.group.position.distanceTo(car.group.position);
      if (d < 3.6 && d > 0.01) {
        const push = new THREE.Vector3().subVectors(car.group.position, other.group.position).normalize();
        car.group.position.addScaledVector(push, (3.6 - d) * 0.5);
        if (Math.abs(car.speed) > 14) {
          applyDamage(3);
          damageCar(car, 2);
          audio.thud();
        }
        car.speed *= 0.55;
      }
    }
    // Ramming a cruiser is a crime too — but once per hit, not per frame.
    for (const cruiser of police.cruisers) {
      if (cruiser.group.position.distanceTo(car.group.position) < 3.4) {
        if (state.time - state.lastCopRam > 2) {
          state.lastCopRam = state.time;
          police.addCrime(WANTED_TUNING.hitPolice);
          toast('You rammed a cruiser! ★', 3);
        }
        cruiser.group.position.addScaledVector(
          new THREE.Vector3().subVectors(cruiser.group.position, car.group.position).normalize(),
          3,
        );
      }
    }
  } else {
    const moved = walkPlayer(mara, drive, state.camYaw, dt, city.colliders);
    walking = moved > 0;
    // Traffic can clip Mara on the road.
    for (const car of traffic.cars) {
      if (car.group.position.distanceTo(mara.group.position) < 2.2) {
        applyDamage(12);
        mara.group.position.addScaledVector(
          new THREE.Vector3().subVectors(mara.group.position, car.group.position).normalize(),
          2.5,
        );
        audio.thud();
        toast('A car just clipped you!', 3);
      }
    }
    // Mara's punch swing shows on her arm.
    mara.armR.rotation.x = combat.armAngle();
  }

  // The law.
  const busted = police.update(
    dt,
    playerPos(),
    Math.abs(speed),
    !state.currentCar,
    (kind) => {
      if (kind === 'ram' && state.time - state.lastRam > 1.2) {
        state.lastRam = state.time;
        applyDamage(WANTED_TUNING.policeRamDamage);
        audio.thud();
        toast('The cops rammed you!', 2);
      }
    },
  );

  // The air unit announces itself once, the first time it is up.
  if (police.heli && !state.airWarned) {
    state.airWarned = true;
    toast('AIR UNIT DEPLOYED — Air One has you in the light.', 4);
    hud.showDialogue('Capt. Drew', 'CD', 'Air One has you in the light, Voss. Give it up.', 5);
  } else if (!police.heli) {
    state.airWarned = false;
  }

  // Missions.
  if (missions.active) {
    const event = missions.update(dt, playerPos(), !!state.currentCar, state.currentCar, police.stars, say);
    if (event && event.completed) {
      state.cash += event.reward;
      state.respect = Math.min(100, state.respect + 25);
      state.armour = Math.min(100, state.armour + 25);
      combat.refill();
      audio.jingle();
      saveProgress();
      if (missions.done) {
        setTimeout(() => {
          if (state.mode === 'playing') {
            state.mode = 'finale';
            document.getElementById('finale-line').textContent = STORY.outro;
            showScreen('finale');
          }
        }, 1400);
      }
    }
  }

  if (busted && state.mode === 'playing') {
    state.mode = 'busted';
    document.getElementById('caught-title').textContent = 'Busted';
    document.getElementById('caught-line').textContent = 'The Solmar Bay police took you in. Fine: $200. The car is impounded — on foot again.';
    showScreen('caught');
    announce('Busted.');
    return;
  }
  if (state.health <= 0 && state.mode === 'playing') {
    state.mode = 'wasted';
    document.getElementById('caught-title').textContent = 'Wasted';
    document.getElementById('caught-line').textContent = 'Mara wakes up at the Palms Motel clinic, $200 lighter, with the bay still waiting.';
    showScreen('caught');
    announce('Wasted.');
    return;
  }

  // Camera: chase behind the car, orbit behind Mara on foot.
  const target = state.currentCar
    ? state.currentCar.group.position.clone().add(new THREE.Vector3(0, 1.4, 0))
    : mara.group.position.clone().add(new THREE.Vector3(0, 1.7, 0));
  if (state.currentCar && !state.scripted) {
    const wantYaw = state.currentCar.heading + Math.PI;
    let diff = wantYaw - state.camYaw;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    state.camYaw += diff * Math.min(1, dt * 2.2);
  }
  const dist = state.camDist || (state.currentCar ? 10.5 : 7.5);
  const cp = Math.cos(state.camPitch);
  camera.position.set(
    target.x + Math.sin(state.camYaw) * dist * cp,
    target.y + Math.sin(state.camPitch) * dist,
    target.z + Math.cos(state.camYaw) * dist * cp,
  );
  camera.lookAt(target);

  // Audio follows speed and wanted level.
  audio.update(dt, Math.abs(speed), police.stars, walking);

  // Autosave every 30 seconds of play.
  if (state.time - state.lastSave > 30) {
    state.lastSave = state.time;
    saveProgress();
  }

  // HUD.
  hud.update(dt, {
    wanted: police.stars,
    cash: state.cash,
    health: state.health,
    armour: state.armour,
    respect: state.respect,
    speed,
    inCar: !!state.currentCar,
    mission: missions.panel(),
    playerX: playerPos().x,
    playerZ: playerPos().z,
    heading: playerHeading(),
    camYaw: state.camYaw,
    missionTarget: missions.active && missions.active.target ? missions.active.target : null,
    policeDots: police.cruisers.map((c) => ({ x: c.group.position.x, z: c.group.position.z, disabled: c.disabled > 0 })),
    trafficDots: traffic.cars.map((c) => ({ x: c.group.position.x, z: c.group.position.z })),
    heliDot: police.heli ? { x: police.heli.group.position.x, z: police.heli.group.position.z } : null,
    dispatch: police.dispatch(playerPos()),
    heliActive: !!police.heli,
    weapons: combat.weapons.map((w, i) => ({
      name: w.name,
      ammo: w.ammo,
      locked: !combat.unlocked(i, missions.index),
      selected: i === combat.selected,
    })),
    radio: RADIO[state.radioIndex],
    car: state.currentCar ? { name: state.currentCar.modelName, condition: state.currentCar.condition } : null,
    day: state.day,
    clockMinutes: state.clockMinutes,
    time: state.time,
  });

  // Playtest + screenshot hook: the live state, read by the test script.
  window.__solmar = {
    mode: state.mode,
    wanted: police.stars,
    cash: state.cash,
    health: state.health,
    armour: state.armour,
    respect: state.respect,
    day: state.day,
    clockMinutes: state.clockMinutes,
    inCar: !!state.currentCar,
    speed,
    playerX: playerPos().x,
    playerZ: playerPos().z,
    camYaw: state.camYaw,
    navTarget: missions.active && missions.active.target
      ? { x: missions.active.target.x, z: missions.active.target.z }
      : null,
    missionIndex: missions.index,
    missionActive: !!missions.active,
    missionPanel: missions.panel(),
    objective: missions.objectiveText(),
    policeCars: police.cruisers.length,
    policePositions: police.cruisers.map((c) => ({ x: c.group.position.x, z: c.group.position.z })),
    bustTimer: police.bustTimer,
    heliActive: !!police.heli,
    dispatch: police.dispatch(playerPos()).length,
    weapons: combat.weapons.map((w) => ({ name: w.name, ammo: w.ammo })),
    trafficCars: traffic.cars.length,
    pedestrians: traffic.peds.length,
    pedPositions: traffic.peds.map((p) => ({ x: p.group.position.x, z: p.group.position.z, down: p.down })),
  };
}

// Test hook for the automated playtest (and the curious): move Mara or her
// car, start a job, set the wanted level. It changes nothing about the game.
window.__solmarDebug = {
  teleport(x, z) {
    if (state.currentCar) exitCar();
    mara.group.position.set(x, 0, z);
  },
  teleportCar(x, z) {
    if (state.currentCar) {
      state.currentCar.group.position.set(x, 0, z);
      state.currentCar.speed = 0;
    }
  },
  startMission() {
    if (!missions.active && missions.currentDef()) {
      missions.start(say);
      if (missions.active && missions.active.def.id === 'getaway') police.setStars(3);
    }
  },
  setWanted(n) {
    police.setStars(n);
  },
  setCash(n) {
    state.cash = n;
  },
  setDay(n) {
    state.day = n;
  },
  giveAmmo() {
    combat.refill();
  },
};

function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
  lastNow = now;
  if (state.mode === 'playing') {
    handleActions();
    update(dt);
  } else if (state.mode === 'menu') {
    // Idle camera drift over the city behind the menu.
    state.camYaw += dt * 0.02;
    camera.position.set(
      Math.sin(state.camYaw) * 60,
      26,
      Math.cos(state.camYaw) * 60,
    );
    camera.lookAt(0, 6, 0);
    traffic.update(dt, mara.group.position);
  }
  renderer.render(scene, camera);
}

let lastNow = performance.now();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && state.mode === 'playing') {
    state.mode = 'paused';
    showScreen('pause');
    saveProgress();
  }
});

// Menu wiring.
document.getElementById('story').textContent = STORY.intro;
const saved = loadGame();
if (saved && saved.cash > 0) {
  const line = document.getElementById('save-line');
  line.textContent = `Saved game: $${saved.cash} · ${saved.missionsDone} job${saved.missionsDone === 1 ? '' : 's'} done.`;
  line.classList.remove('hidden');
  document.getElementById('continue-btn').classList.remove('hidden');
}
document.getElementById('play-btn').addEventListener('click', () => startPlaying(false));
document.getElementById('continue-btn').addEventListener('click', () => startPlaying(true));
document.getElementById('resume-btn').addEventListener('click', () => {
  state.mode = 'playing';
  showScreen(null);
});
document.getElementById('restart-btn').addEventListener('click', () => {
  clearSave();
  window.location.reload();
});
document.getElementById('menu-btn').addEventListener('click', () => {
  window.location.reload();
});
document.getElementById('caught-btn').addEventListener('click', () => respawn(200));
document.getElementById('finale-btn').addEventListener('click', () => {
  state.mode = 'playing';
  showScreen(null);
});

// Screenshot scenes run the real loop with a staged setup, no menu.
if (shotName) {
  stageShot(shotName, {
    state,
    mara,
    parkedCars,
    coupe,
    traffic,
    police,
    missions,
    combat,
    hud,
    say,
    camera,
    renderer,
    scene,
    toast,
    startPlaying,
  });
  state.mode = 'playing';
  showScreen(null);
  // About 1.5 seconds of live play at 60 fps: enough for traffic, police
  // and the camera to settle, quick enough to stage in a slow headless run.
  // Headless Chromium renders through SwiftShader at well under 60 fps, so
  // a shot's frame budget is measured in frames of game time, not wall
  // seconds: 60 frames is a full second of traffic, police and camera
  // settling, and still finishes in a reasonable wall-clock time.
  const SHOT_FRAMES = state.shotFrames || 60;
  let frames = 0;
  const shotFrame = (now) => {
    requestAnimationFrame(shotFrame);
    const dt = Math.min(0.05, (now - lastNow) / 1000 || 0.016);
    lastNow = now;
    if (frames < SHOT_FRAMES) {
      update(dt);
      frames += 1;
    }
    renderer.render(scene, camera);
    if (frames === SHOT_FRAMES) window.__shotReady = true;
  };
  requestAnimationFrame(shotFrame);
} else {
  requestAnimationFrame(frame);
}
