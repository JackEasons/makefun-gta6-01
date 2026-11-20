// Staged screenshots: ?shot=cover|onfoot|driving|mission&seed=7 freezes
// the game in a mid-story moment with the HUD at its fullest, then raises
// window.__shotReady so the screenshot tool knows the frame is set.
import { JOBS } from './config.js';
import { makeCarMesh, makePoliceMesh, makeHeliMesh, syncCarMesh } from './vehicles.js';
import { setWanted } from './police.js';

const CRUISER_NAMES = ['REEF-1', 'CORAL-7', 'PALM-2', 'TIDE-3', 'SURF-5', 'DUNE-9'];

// Where the camera looks: forward is where the car points, right is 90 deg
// clockwise from above. Staged props are placed in that frame so they land
// inside the picture instead of behind the camera.
function framePoint(G, fwd, right) {
  const fx = -Math.sin(G.camYaw);
  const fz = -Math.cos(G.camYaw);
  const rx = -fz;
  const rz = fx;
  return {
    x: G.player.x + fx * fwd + rx * right,
    z: G.player.z + fz * fwd + rz * right,
  };
}

function stageCar(G, name, color, x, z, heading, speed, cond) {
  const mesh = makeCarMesh(color);
  G.scene.add(mesh);
  const car = {
    name,
    color,
    mesh,
    x,
    z,
    heading,
    speed,
    cond,
    kind: 'shot',
    owner: 'player',
    disabled: false,
  };
  syncCarMesh(car);
  return car;
}

function placeCruisers(G, spots) {
  const pol = G.police;
  pol.cruisers = [];
  spots.forEach(([fwd, right, heading], i) => {
    const pos = framePoint(G, fwd, right);
    const mesh = makePoliceMesh();
    G.scene.add(mesh);
    const cruiser = {
      name: CRUISER_NAMES[i % CRUISER_NAMES.length],
      role: ['RAMMING', 'PURSUIT', 'ROADBLOCK', 'RESPONDING'][i % 4],
      mesh,
      x: pos.x,
      z: pos.z,
      heading: heading ?? Math.atan2(G.player.x - pos.x, G.player.z - pos.z),
      speed: 0,
      cond: 100,
      kind: 'police',
      owner: 'sbpb',
      disabled: false,
      leaving: false,
    };
    syncCarMesh(cruiser);
    pol.cruisers.push(cruiser);
  });
}

function stageBase(G, opts) {
  G.stats.cash = opts.cash;
  G.stats.day = opts.day;
  G.stats.clockMinutes = opts.clock;
  G.stats.health = opts.health ?? 100;
  G.stats.armour = opts.armour ?? 50;
  G.stats.respect = opts.respect ?? 50;
  G.missions.index = opts.missionIndex;
  G.missions.active = !!opts.active;
  G.missions.stage = opts.stage || 0;
  G.missions.timer = opts.timer ?? null;
  G.missions.target = opts.target || null;
  G.player.x = opts.playerX;
  G.player.z = opts.playerZ;
  G.player.heading = opts.heading ?? 0;
  G.camYaw = opts.camYaw ?? 2.379;
  G.radio.station = opts.radio ?? 0;
  G.weapons.list[1].ammo = opts.pistol ?? 36;
  G.weapons.list[2].ammo = opts.shotgun ?? 12;
  G.weapons.list[3].ammo = opts.smg ?? 90;
  setWanted(G, opts.wanted || 0);
  if (opts.car) {
    const car = stageCar(G, opts.car.name, opts.car.color, opts.playerX, opts.playerZ,
      opts.heading ?? 0, opts.speed || 0, opts.car.cond);
    G.player.inCar = true;
    G.player.car = car;
    G.player.mesh.visible = false;
  } else {
    G.player.inCar = false;
    G.player.car = null;
    G.player.mesh.visible = true;
    G.player.mesh.position.set(opts.playerX, 0, opts.playerZ);
    G.player.mesh.rotation.y = opts.heading ?? 0;
  }
  if (opts.cruisers) placeCruisers(G, opts.cruisers);
  if (opts.heli) {
    // A real helicopter mesh in the sky, left of the chase camera's view
    // so it lands in the clear patch between the dispatch panel and the
    // mission panel, spotlight on Mara. Kept over open street, clear of
    // the towers.
    const heliPos = framePoint(G, 15, 9);
    const heliMesh = makeHeliMesh();
    heliMesh.userData.spot.target = G.spotTarget;
    heliMesh.position.set(heliPos.x, 10, heliPos.z);
    heliMesh.userData.rotor.rotation.y = 0.7;
    G.scene.add(heliMesh);
    G.spotTarget.position.set(opts.playerX, 1, opts.playerZ);
    G.police.heli = { mesh: heliMesh, active: true, x: heliPos.x, z: heliPos.z, y: 10 };
  }
  if (opts.dialogue) {
    G.hud.showDialogue(opts.dialogue.name, opts.dialogue.initials, opts.dialogue.line, 60);
  }
  if (opts.toast) G.hud.toast(opts.toast);
  G.hud.update(0);
  G.mode = 'playing';
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').classList.remove('hidden');
}

export const SHOT_NAMES = ['cover', 'onfoot', 'driving', 'mission'];

export function stageShot(G, name) {
  if (name === 'cover') {
    stageBase(G, {
      cash: 12450, day: 9, clock: 1121, wanted: 5,
      missionIndex: 1, active: true, stage: 1,
      target: { x: -150, z: 30 },
      playerX: -1, playerZ: 30, heading: 0.15, camYaw: 2.6,
      car: { name: 'VELA GT', color: 0xc22e24, cond: 62 },
      speed: 32.5, radio: 2, pistol: 36, shotgun: 12, smg: 90,
      cruisers: [
        [18, -10], [22, 9], [13, -16], [-12, 7],
      ],
      heli: true,
      dialogue: { name: 'Capt. Drew', initials: 'CD', line: 'Air One has you in the light, Voss. Give it up.' },
      toast: 'You rammed a cruiser! ★',
    });
  } else if (name === 'onfoot') {
    stageBase(G, {
      cash: 6830, day: 3, clock: 1081, wanted: 0,
      missionIndex: 1, active: false,
      playerX: -32, playerZ: 60, heading: -0.77, camYaw: 2.379,
      pistol: 36, shotgun: 12, smg: 90,
      dialogue: { name: 'Mara Voss', initials: 'MV', line: 'One job down. Silas wants the gold coupe next.' },
    });
  } else if (name === 'driving') {
    stageBase(G, {
      cash: 9200, day: 5, clock: 1101, wanted: 3,
      missionIndex: 1, active: true, stage: 1,
      target: { x: -150, z: 30 },
      playerX: -32, playerZ: 39, heading: 0.1, camYaw: 2.6,
      car: { name: 'MARINA COUPE', color: 0xd8a520, cond: 82 },
      speed: 34.2, radio: 3, pistol: 36, shotgun: 12, smg: 90,
      cruisers: [
        [16, -9], [20, 8], [11, -14],
      ],
      dialogue: { name: 'Silas Crane', initials: 'SC', line: JOBS[1].intro.line },
    });
  } else if (name === 'mission') {
    stageBase(G, {
      cash: 14800, day: 6, clock: 1141, wanted: 5,
      missionIndex: 2, active: true, stage: 0, timer: 146,
      playerX: 24, playerZ: 20, heading: 0.2, camYaw: 2.6,
      car: { name: 'PALMA SEDAN', color: 0x9c2b26, cond: 74 },
      speed: 34.4, radio: 2, pistol: 36, shotgun: 12, smg: 90,
      cruisers: [
        [18, -11], [23, 8], [14, -17], [-10, 6], [26, -4],
      ],
      heli: true,
      dialogue: { name: 'Capt. Drew', initials: 'CD', line: 'Air One has you in the light, Voss. Give it up.' },
      toast: 'You rammed a cruiser! ★',
    });
  } else {
    return false;
  }
  return true;
}
