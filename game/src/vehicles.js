// Solmar Bay — cars. Every car is built from boxes and cylinders in code:
// body, cabin, four wheels, headlights and taillights, no model files.
// makeCar builds one; driveCar advances the car the player is driving with
// arcade physics (throttle, brake, steering that fades with speed) and a
// circle-vs-building collision that slides along walls. Each car has an
// original model name and a condition that falls as it is crashed into
// things — the HUD shows both while Mara drives it. The police helicopter
// is built here too: body, tail, spinning rotor and a searchlight cone.

import * as THREE from 'three';
import { CAR_TUNING, PALETTE, CAR_MODELS } from './config.js';
import { pick } from './random.js';

export function makeCar(rng, color, style = 'sedan') {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color });
  const glassMat = new THREE.MeshLambertMaterial({ color: 0x1a2838 });
  const trimMat = new THREE.MeshLambertMaterial({ color: 0x22242a });

  const long = style === 'coupe' ? 4.6 : 4.2;
  const body = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.62, long), bodyMat);
  body.position.y = 0.55;
  group.add(body);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.55, long * 0.45), glassMat);
  cabin.position.set(0, 1.1, style === 'coupe' ? -0.15 : 0.1);
  group.add(cabin);

  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x14161a });
  const wheelPos = [
    [-0.85, 0.36, long / 2 - 0.8],
    [0.85, 0.36, long / 2 - 0.8],
    [-0.85, 0.36, -long / 2 + 0.8],
    [0.85, 0.36, -long / 2 + 0.8],
  ];
  const wheels = [];
  for (const [x, y, z] of wheelPos) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(x, y, z);
    group.add(wheel);
    wheels.push(wheel);
  }

  const lightMat = new THREE.MeshBasicMaterial({ color: 0xfff2b0 });
  for (const x of [-0.6, 0.6]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.08), lightMat);
    head.position.set(x, 0.62, long / 2 + 0.02);
    group.add(head);
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.34, 0.16, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xd82020 }),
    );
    tail.position.set(x, 0.62, -long / 2 - 0.02);
    group.add(tail);
  }

  // A thin chrome bumper line so the car reads at dusk.
  const bumper = new THREE.Mesh(new THREE.BoxGeometry(1.92, 0.1, 0.06), trimMat);
  bumper.position.set(0, 0.32, long / 2 + 0.02);
  group.add(bumper);

  return {
    group,
    wheels,
    color,
    style,
    modelName: pick(rng, CAR_MODELS[style]),
    condition: 100, // percent; crashes and rams wear it down
    heading: 0,
    speed: 0,
    steer: 0,
    parked: true,
    stolen: false,
    isPolice: false,
    length: long,
  };
}

export function makePoliceCar(rng) {
  const car = makeCar(rng, PALETTE.police, 'sedan');
  car.isPolice = true;
  const barMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.14, 0.3), barMat);
  bar.position.set(0, 1.45, 0);
  car.group.add(bar);
  car.lightBar = bar;
  const stripe = new THREE.Mesh(
    new THREE.BoxGeometry(1.92, 0.22, 2.2),
    new THREE.MeshBasicMaterial({ color: 0xffffff }),
  );
  stripe.position.set(0, 0.62, 0);
  car.group.add(stripe);
  return car;
}

// The air unit: a boxy helicopter with a spinning rotor and a searchlight
// cone that hangs under it, apex at the belly, wide end on the street.
export function makeHelicopter() {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshLambertMaterial({ color: 0x2a4a6a });
  const body = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.1, 1.6), bodyMat);
  group.add(body);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.5), new THREE.MeshLambertMaterial({ color: 0x9fc8e8 }));
  glass.position.set(1.2, 0.1, 0);
  group.add(glass);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.5, 0.5), bodyMat);
  tail.position.set(-2.6, 0.2, 0);
  group.add(tail);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.08, 0.5), new THREE.MeshLambertMaterial({ color: 0x22242a }));
  rotor.position.y = 0.8;
  group.add(rotor);
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(4.5, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xfff2b0,
      transparent: true,
      opacity: 0.16,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  cone.position.y = -13;
  group.add(cone);
  return { group, rotor, cone };
}

export function randomCarColor(rng) {
  return pick(rng, PALETTE.car);
}

// A crash or a ram wears a car down; returns the new condition.
export function damageCar(car, amount) {
  car.condition = Math.max(0, car.condition - amount);
  return car.condition;
}

// Arcade driving for the car the player is in. Returns the distance moved
// this frame, for the engine sound and the speedometer.
export function driveCar(car, input, dt, colliders, bounds) {
  const throttle = input.forward();
  const steerInput = input.strafe();
  const targetSteer = steerInput * CAR_TUNING.steerMax * Math.max(0.35, 1 - Math.abs(car.speed) / 55);
  car.steer += (targetSteer - car.steer) * Math.min(1, CAR_TUNING.steerSpeed * dt * 3);

  if (throttle > 0) car.speed += CAR_TUNING.accel * dt;
  else if (throttle < 0) {
    car.speed += car.speed > 0.5 ? -CAR_TUNING.brake * dt : -CAR_TUNING.reverseAccel * dt;
  }
  // Rolling drag, stronger when the player lifts off.
  car.speed -= car.speed * CAR_TUNING.drag * dt;
  car.speed = Math.max(-CAR_TUNING.maxReverse, Math.min(CAR_TUNING.maxSpeed, car.speed));

  car.heading += (car.steer * car.speed * dt) / 2.4;
  const dx = Math.sin(car.heading) * car.speed * dt;
  const dz = Math.cos(car.heading) * car.speed * dt;
  const nextX = car.group.position.x + dx;
  const nextZ = car.group.position.z + dz;

  const hit = collideCircle(nextX, nextZ, CAR_TUNING.radius, colliders);
  if (hit) {
    car.speed *= -0.25; // bounce off the wall, scrubbing speed
    return { moved: 0, crashed: true };
  }
  car.group.position.x = Math.max(-bounds, Math.min(bounds, nextX));
  car.group.position.z = Math.max(-bounds, Math.min(bounds, nextZ));
  car.group.rotation.y = car.heading;
  for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2.2;
  return { moved: Math.abs(car.speed) * dt, crashed: false };
}

// Circle vs building AABB: true when the circle overlaps any collider.
export function collideCircle(x, z, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(z, c.maxZ));
    const ddx = x - cx;
    const ddz = z - cz;
    if (ddx * ddx + ddz * ddz < radius * radius) return c;
  }
  return null;
}

// Push a circle out of a building it overlaps; returns the push distance.
export function resolveCircle(pos, radius, colliders) {
  let pushed = 0;
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    let ddx = pos.x - cx;
    let ddz = pos.z - cz;
    let dist = Math.hypot(ddx, ddz);
    if (dist >= radius) continue;
    if (dist < 0.001) {
      // Dead centre of a wall: push out along the smallest penetration axis.
      const left = pos.x - c.minX;
      const right = c.maxX - pos.x;
      const top = pos.z - c.minZ;
      const bottom = c.maxZ - pos.z;
      const min = Math.min(left, right, top, bottom);
      if (min === left) { pos.x = c.minX - radius; pushed += radius; }
      else if (min === right) { pos.x = c.maxX + radius; pushed += radius; }
      else if (min === top) { pos.z = c.minZ - radius; pushed += radius; }
      else { pos.z = c.maxZ + radius; pushed += radius; }
      continue;
    }
    ddx /= dist;
    ddz /= dist;
    pos.x = cx + ddx * radius;
    pos.z = cz + ddz * radius;
    pushed += radius - dist;
  }
  return pushed;
}
