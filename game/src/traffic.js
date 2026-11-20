// Traffic and pedestrians: eight cars looping the avenues and fourteen
// people walking the sidewalks, all seeded so a ?shot= scene is stable.
import { WORLD, TUNING, TRAFFIC_COLORS, TRAFFIC_NAMES } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';
import { makeCarMesh, syncCarMesh } from './vehicles.js';
import { makePersonMesh } from './player.js';
import { moveWithCollision, blockedByCity } from './city.js';

const PED_SHIRTS = [0x3f7d5a, 0xc05a4a, 0x4a6a9a, 0xd8b040, 0x8a5a9a, 0x5a9a8a, 0xb0703a];

function streetCenters() {
  const list = [];
  for (let i = 0; i <= WORLD.blocks; i += 1) {
    list.push(-WORLD.half + i * WORLD.pitch);
  }
  return list;
}

export function spawnTraffic(G) {
  const rng = makeRng(G.seed + 23);
  const streets = streetCenters();
  const cars = [];
  for (let i = 0; i < 8; i += 1) {
    const alongX = rng() < 0.5;
    const street = pick(rng, streets);
    const lane = (rng() < 0.5 ? -1 : 1) * 4;
    const dir = rng() < 0.5 ? 1 : -1;
    const color = pick(rng, TRAFFIC_COLORS);
    const mesh = makeCarMesh(color);
    G.scene.add(mesh);
    const car = {
      name: pick(rng, TRAFFIC_NAMES),
      color,
      mesh,
      x: alongX ? range(rng, -220, 220) : street + lane,
      z: alongX ? street + lane : range(rng, -220, 220),
      heading: alongX ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: range(rng, 7, 12),
      cond: 100,
      kind: 'traffic',
      owner: 'civilian',
      disabled: false,
      alongX,
      dir,
      street,
      lane,
    };
    syncCarMesh(car);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(G, dt) {
  for (const car of G.traffic) {
    if (car.disabled) continue;
    // Slow down for the car ahead on the same lane.
    let ahead = null;
    for (const other of G.traffic) {
      if (other === car || other.alongX !== car.alongX || other.street !== car.street) continue;
      const gap = car.alongX
        ? (other.x - car.x) * car.dir
        : (other.z - car.z) * car.dir;
      if (gap > 0 && gap < 14 && (ahead === null || gap < ahead)) ahead = gap;
    }
    const target = ahead !== null ? 0 : TUNING.trafficSpeed;
    car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
    const step = car.speed * car.dir * dt;
    if (car.alongX) {
      car.x += step;
      if (car.x > WORLD.half) { car.x = WORLD.half; car.dir = -1; car.heading = -Math.PI / 2; }
      if (car.x < -WORLD.half) { car.x = -WORLD.half; car.dir = 1; car.heading = Math.PI / 2; }
    } else {
      car.z += step;
      if (car.z > WORLD.half) { car.z = WORLD.half; car.dir = -1; car.heading = Math.PI; }
      if (car.z < -WORLD.half) { car.z = -WORLD.half; car.dir = 1; car.heading = 0; }
    }
    syncCarMesh(car);
  }
}

function randomSidewalkPoint(G, rng) {
  // Any point that is not inside a tower and not in the middle of a road:
  // the sidewalk band sits 9-13 m off a street centre line.
  const streets = streetCenters();
  for (let tries = 0; tries < 24; tries += 1) {
    const street = pick(rng, streets);
    const along = range(rng, -220, 220);
    const off = (rng() < 0.5 ? -1 : 1) * range(rng, 9.5, 13);
    const px = rng() < 0.5 ? along : street + off;
    const pz = px === along ? street + off : along;
    if (!blockedByCity(G.collidersCache, px, pz)) return { x: px, z: pz };
  }
  return { x: 0, z: -34 };
}

export function spawnPeds(G) {
  const rng = makeRng(G.seed + 37);
  G.collidersCache = G.city.colliders;
  const peds = [];
  for (let i = 0; i < 14; i += 1) {
    const spot = randomSidewalkPoint(G, rng);
    const mesh = makePersonMesh(pick(rng, PED_SHIRTS), 0xc89a72, rng() < 0.5);
    mesh.position.set(spot.x, 0, spot.z);
    G.scene.add(mesh);
    const target = randomSidewalkPoint(G, rng);
    peds.push({
      mesh,
      x: spot.x,
      z: spot.z,
      heading: range(rng, 0, Math.PI * 2),
      targetX: target.x,
      targetZ: target.z,
      speed: range(rng, 1.0, 1.5),
      down: 0,
      downTimer: 0,
    });
  }
  return peds;
}

export function updatePeds(G, dt) {
  const rng = G.pedRng;
  for (const ped of G.peds) {
    if (ped.down > 0) {
      ped.downTimer -= dt;
      if (ped.downTimer <= 0) {
        ped.down = 0;
        ped.mesh.rotation.x = 0;
        ped.mesh.position.y = 0;
        const spot = randomSidewalkPoint(G, rng);
        ped.x = spot.x;
        ped.z = spot.z;
        const target = randomSidewalkPoint(G, rng);
        ped.targetX = target.x;
        ped.targetZ = target.z;
      }
      continue;
    }
    const dx = ped.targetX - ped.x;
    const dz = ped.targetZ - ped.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.5) {
      const target = randomSidewalkPoint(G, rng);
      ped.targetX = target.x;
      ped.targetZ = target.z;
      continue;
    }
    const step = ped.speed * dt;
    const nx = (dx / dist) * step;
    const nz = (dz / dist) * step;
    const before = { x: ped.x, z: ped.z };
    moveWithCollision(G.city.colliders, ped, nx, nz);
    if (Math.hypot(ped.x - before.x, ped.z - before.z) < step * 0.2) {
      // Stuck against a wall: pick a new destination.
      const target = randomSidewalkPoint(G, rng);
      ped.targetX = target.x;
      ped.targetZ = target.z;
    }
    ped.heading = Math.atan2(dx, dz);
    ped.mesh.position.set(ped.x, 0, ped.z);
    ped.mesh.rotation.y = ped.heading;
    ped.mesh.userData.legL.rotation.x = Math.sin(G.time * 9 + ped.x) * 0.5;
    ped.mesh.userData.legR.rotation.x = -Math.sin(G.time * 9 + ped.x) * 0.5;
  }
}

export function knockPedDown(G, ped) {
  ped.down = 1;
  ped.downTimer = 30;
  ped.mesh.rotation.x = -Math.PI / 2;
  ped.mesh.position.y = 0.25;
}
