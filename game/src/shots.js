// Solmar Bay — the screenshot scenes behind ?shot=cover|onfoot|driving|mission.
// Each one stages the real game (real city, real systems, real HUD) in a
// fixed setup, then lets the loop run about 2.5 seconds so traffic, police
// and the camera settle — the frame is what a short game really looks like,
// and the same seed always gives the same frame.

import * as THREE from 'three';

function placePlayerInCar(ctx, carIndex, heading) {
  const car = ctx.parkedCars[carIndex];
  car.parked = false;
  car.stolen = true;
  car.heading = heading;
  car.group.rotation.y = heading;
  car.speed = 16;
  ctx.state.currentCar = car;
  ctx.mara.group.visible = false;
  ctx.state.camYaw = heading + Math.PI;
  ctx.state.camPitch = 0.3;
  return car;
}

function placeCruisersBehind(ctx, car, count) {
  ctx.police.setStars(count);
  // Spawn them once, then line them up behind the player's car.
  ctx.police.update(0.1, car.group.position, Math.abs(car.speed), false, null);
  const back = new THREE.Vector3(-Math.sin(car.heading), 0, -Math.cos(car.heading));
  const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
  ctx.police.cruisers.forEach((cruiser, i) => {
    const offset = back.clone().multiplyScalar(9 + i * 7);
    offset.addScaledVector(side, (i % 2 === 0 ? -2.5 : 2.5));
    cruiser.group.position.copy(car.group.position).add(offset);
    cruiser.heading = car.heading;
    cruiser.group.rotation.y = car.heading;
  });
}

export function stageShot(name, ctx) {
  const { state, mara, traffic, police, missions } = ctx;
  state.scripted = null;

  if (name === 'cover') {
    // A police chase: Mara in the red sedan, three stars, cruisers on her tail,
    // the first job on the HUD. The camera sits at a three-quarter rear angle
    // so the cruisers behind her read in the frame.
    const car = placePlayerInCar(ctx, 0, Math.PI / 2);
    car.group.position.set(-60, 0, 30);
    state.scripted = { fwd: 1, str: 0 };
    state.camYaw = car.heading + Math.PI + 0.55;
    state.camPitch = 0.3;
    // A short run: the player has not yet outrun the cruisers when the
    // frame is taken, so the head-on cruiser is still right in front of her.
    state.shotFrames = 45;
    missions.start((line) => ctx.toast(line, 6));
    placeCruisersBehind(ctx, car, 3);
    // Cruisers placed for the camera, not just the chase logic: one head-on
    // in the far lane (the law coming at her), one on her left flank, one
    // trailing on the minimap. The chase AI takes over from here.
    const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    const [c0, c1, c2] = ctx.police.cruisers;
    c0.group.position.copy(car.group.position).addScaledVector(fwd, 42).addScaledVector(side, -4.4);
    c0.heading = car.heading + Math.PI;
    c0.group.rotation.y = c0.heading;
    c1.group.position.copy(car.group.position).addScaledVector(fwd, -7).addScaledVector(side, -5);
    c1.heading = car.heading;
    c1.group.rotation.y = c1.heading;
    c2.group.position.copy(car.group.position).addScaledVector(fwd, -16).addScaledVector(side, 2.5);
    c2.heading = car.heading;
    c2.group.rotation.y = c2.heading;
    // Traffic stays out of her lane: two cars in the far lane, further up.
    traffic.cars[0].group.position.set(70, 0, 25.6);
    traffic.cars[0].heading = -Math.PI / 2;
    traffic.cars[1].group.position.set(110, 0, 25.6);
    traffic.cars[1].heading = -Math.PI / 2;
    return;
  }

  if (name === 'driving') {
    // Cruising down a boulevard in the teal sedan. Oncoming traffic in the
    // far lane, and every other car moved east so nothing can wander into
    // her lane and rear-end the shot.
    const car = placePlayerInCar(ctx, 1, 0);
    car.group.position.set(-32.2, 0, -40);
    state.scripted = { fwd: 1, str: 0 };
    traffic.cars[0].group.position.set(-27.8, 0, 60);
    traffic.cars[0].heading = Math.PI;
    traffic.cars[1].group.position.set(-27.8, 0, 120);
    traffic.cars[1].heading = Math.PI;
    for (let i = 2; i < traffic.cars.length; i += 1) {
      const other = traffic.cars[i];
      other.group.position.set(150 + (i % 2) * 4.4, 0, -100 + i * 30);
      other.heading = 0;
    }
    return;
  }

  if (name === 'mission') {
    // Job one: on foot at the pier, the gold beacon over the package.
    // Mara faces south toward the pier; the camera looks south with her,
    // so the beacon, the package, the beach and the sea are all in frame.
    missions.start((line) => ctx.toast(line, 6));
    mara.group.position.set(30, 0, 195);
    mara.group.rotation.y = 0;
    state.camYaw = Math.PI;
    state.camPitch = 0.3;
    state.camDist = 6;
    return;
  }

  // Default (onfoot): Mara on a palm-lined boulevard, city behind her.
  mara.group.position.set(-32.2, 0, 60);
  mara.group.rotation.y = Math.PI * 0.9;
  state.camYaw = Math.PI * 0.15;
  state.camPitch = 0.32;
  state.camDist = 6.5;
  traffic.peds[0].group.position.set(-28, 0, 52);
  traffic.peds[1].group.position.set(-36, 0, 70);
}
