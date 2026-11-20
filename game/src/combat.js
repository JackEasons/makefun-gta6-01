// Weapons and firing. Fists punch at arm's length; guns fire at the
// nearest target in front of the camera (on foot) or the car (drive-by).
// Hitting a pedestrian knocks them down and draws heat.
import * as THREE from 'three';
import { WEAPONS } from './config.js';
import { knockPedDown } from './traffic.js';
import { addWanted } from './police.js';

export function createWeapons() {
  return {
    list: WEAPONS.map((w) => ({ ...w })),
    selected: 0,
    lastFire: 0,
  };
}

export function weaponUnlocked(G, index) {
  if (index === 2) return G.missions.index >= 1;
  if (index === 3) return G.missions.index >= 2;
  return true;
}

export function selectWeapon(G, index) {
  if (index < 0 || index > 3) return;
  if (!weaponUnlocked(G, index)) {
    G.audio.deny();
    return;
  }
  G.weapons.selected = index;
  G.audio.click();
}

function nearestTarget(G, origin, forward, maxRange, maxAngle) {
  let best = null;
  let bestD = Infinity;
  const consider = (x, z, obj) => {
    const dx = x - origin.x;
    const dz = z - origin.z;
    const d = Math.hypot(dx, dz);
    if (d > maxRange || d >= bestD) return;
    const ang = Math.abs(angleDiff(Math.atan2(dx, dz), forward));
    if (ang > maxAngle) return;
    best = obj;
    bestD = d;
  };
  for (const ped of G.peds) {
    if (ped.down > 0) continue;
    consider(ped.x, ped.z, { kind: 'ped', obj: ped });
  }
  for (const c of G.police.cruisers) {
    if (c.disabled || c.leaving) continue;
    consider(c.x, c.z, { kind: 'cruiser', obj: c });
  }
  return best;
}

function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function fireWeapon(G) {
  const w = G.weapons;
  const weapon = w.list[w.selected];
  const now = G.time;
  if (now - w.lastFire < weapon.rate) return false;
  w.lastFire = now;

  const p = G.player;
  if (weapon.name === 'FISTS') {
    G.audio.punch();
    const fwd = p.inCar ? p.car.heading : p.heading;
    const origin = p.inCar ? p.car : p;
    const hit = nearestTarget(G, origin, fwd, weapon.range, 0.9);
    if (hit && hit.kind === 'ped') {
      knockPedDown(G, hit.obj);
      addWanted(G, 1);
      G.hud.toast('You dropped a pedestrian. The bay noticed.');
    }
    return true;
  }

  if (weapon.ammo <= 0) {
    G.audio.deny();
    G.hud.toast(weapon.name + ' is dry — finish a job for more ammo.');
    return false;
  }
  weapon.ammo -= 1;
  G.audio.shot();

  const origin = p.inCar ? p.car : p;
  const forward = p.inCar ? p.car.heading : G.camYaw + Math.PI;
  const pellets = weapon.pellets || 1;
  let hitAny = null;
  for (let i = 0; i < pellets; i += 1) {
    const spread = (i - (pellets - 1) / 2) * 0.06;
    const hit = nearestTarget(G, origin, forward + spread, weapon.range, 0.22);
    if (hit) hitAny = hit;
  }
  if (hitAny) {
    if (hitAny.kind === 'ped') {
      knockPedDown(G, hitAny.obj);
      addWanted(G, 1);
    } else if (hitAny.kind === 'cruiser') {
      const c = hitAny.obj;
      c.cond = Math.max(0, c.cond - weapon.damage * pellets);
      if (c.cond <= 0 && !c.disabled) {
        c.disabled = true;
        c.speed = 0;
        G.hud.toast('Cruiser disabled!');
        addWanted(G, 1);
      }
    }
    showTracer(G, origin, hitAny.obj);
  }
  return true;
}

let tracer = null;
let tracerUntil = 0;

export function showTracer(G, from, target) {
  if (!G.scene) return;
  if (tracer) G.scene.remove(tracer);
  const geo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(from.x, 1.2, from.z),
    new THREE.Vector3(target.x, 1.1, target.z),
  ]);
  tracer = new THREE.Line(
    geo,
    new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0.9 }),
  );
  G.scene.add(tracer);
  tracerUntil = G.time + 0.09;
}

export function updateTracer(G) {
  if (tracer && G.time > tracerUntil) {
    G.scene.remove(tracer);
    tracer.geometry.dispose();
    tracer = null;
  }
}
