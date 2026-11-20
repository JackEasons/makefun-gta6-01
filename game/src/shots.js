// Solmar Bay — the screenshot scenes behind ?shot=cover|onfoot|driving|mission.
// Each one stages the real game (real city, real systems, real HUD) in a
// fixed MID-GAME setup, then lets the loop run about 2.5 seconds so traffic,
// police and the camera settle — the frame is what a game really looks like
// a few jobs in, and the same seed always gives the same frame. The normal
// game still starts at $0 on day 1 with the first job waiting; the mid-game
// numbers live only in these staged scenes.

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

// The mid-game ledger: cash earned, jobs done, armour and respect bought
// with them, and the guns restocked. One call per scene, with the numbers
// that make that scene read as a game in progress.
function stageMidGame(ctx, cash, day, clockMinutes, respect, armour, health) {
  ctx.state.cash = cash;
  ctx.state.day = day;
  ctx.state.clockMinutes = clockMinutes;
  ctx.state.respect = respect;
  ctx.state.armour = armour;
  ctx.state.health = health;
  ctx.combat.refill();
}

export function stageShot(name, ctx) {
  const { state, mara, traffic, police, missions } = ctx;
  state.scripted = null;

  if (name === 'cover') {
    // A police chase, nine days in: Mara in the red sedan with the gold
    // coupe's job on its second stage, five stars, the air unit overhead,
    // four cruisers in frame and traffic on the boulevard. The camera sits
    // at a three-quarter rear angle so the cruisers behind her read.
    stageMidGame(ctx, 12450, 9, 1120, 50, 55, 72);
    const car = placePlayerInCar(ctx, 0, Math.PI / 2);
    car.group.position.set(-60, 0, 30);
    car.condition = 62;
    state.scripted = { fwd: 1, str: 0 };
    state.camYaw = car.heading + Math.PI + 0.55;
    // A low camera angle: the camera sits just above the car and looks
    // almost level, so the sky and the air unit stay in the frame instead
    // of being cropped by the top edge.
    state.camPitch = 0.2;
    // A short run: the player has not yet outrun the cruisers when the
    // frame is taken, so the head-on cruiser is still right in front of her.
    state.shotFrames = 45;
    missions.index = 1;
    missions.start(ctx.say);
    // Second stage of Hot Wheels: the coupe is taken, the garage is next.
    missions.active.stage = 'deliver';
    missions.stageIndex = 1;
    missions.active.target = new THREE.Vector3(missions.places.garage.x, 0, missions.places.garage.z);
    missions.moveBeacon();
    ctx.say('Silas: "That is the one. Bring it to the garage on the west side."');
    placeCruisersBehind(ctx, car, 5);
    // Cruisers placed for the camera, not just the chase logic: one head-on
    // in the far lane (the law coming at her), one on her left flank just
    // ahead, one on her right a little further up. The chase AI takes over
    // from here, so a ram or two on the way to the frame is part of the shot.
    const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    const [c0, c1, c2, c3] = ctx.police.cruisers;
    c0.group.position.copy(car.group.position).addScaledVector(fwd, 42).addScaledVector(side, -4.4);
    c0.heading = car.heading + Math.PI;
    c0.group.rotation.y = c0.heading;
    c1.group.position.copy(car.group.position).addScaledVector(fwd, 14).addScaledVector(side, -5.5);
    c1.heading = car.heading;
    c1.group.rotation.y = c1.heading;
    c2.group.position.copy(car.group.position).addScaledVector(fwd, 24).addScaledVector(side, 4.5);
    c2.heading = car.heading;
    c2.group.rotation.y = c2.heading;
    // Fourth cruiser, five stars: on the left flank between the near
    // cruiser and the head-on one, so the chase reads four-wide.
    c3.group.position.copy(car.group.position).addScaledVector(fwd, 30).addScaledVector(side, -5.5);
    c3.heading = car.heading;
    c3.group.rotation.y = c3.heading;
    // The air unit hangs ahead and to the left, in the frame with her: a
    // wide orbit (36m) and a low hover (16m) keep it inside the camera's
    // vertical field instead of vanishing above the top of the frame. The
    // orbit drifts about 0.66 rad over the shot's 3 seconds of game time,
    // so the angle is set that far back: it ends almost straight ahead.
    if (police.heli) {
      const off = fwd.clone().multiplyScalar(26).addScaledVector(side, 18);
      police.heliAngle = Math.atan2(off.z, off.x);
    }
    // Traffic stays out of her lane: two cars in the far lane, further up,
    // one more ahead in her own lane so the road reads busy.
    traffic.cars[0].group.position.set(70, 0, 25.6);
    traffic.cars[0].heading = -Math.PI / 2;
    traffic.cars[1].group.position.set(110, 0, 25.6);
    traffic.cars[1].heading = -Math.PI / 2;
    traffic.cars[2].group.position.set(-20, 0, 34.4);
    traffic.cars[2].heading = Math.PI / 2;
    traffic.cars[3].group.position.set(-100, 0, 25.6);
    traffic.cars[3].heading = -Math.PI / 2;
    // Round 3: more life in the frame — two more cars on the far side of
    // the boulevard and two pedestrians on the near sidewalk.
    traffic.cars[4].group.position.set(45, 0, 25.6);
    traffic.cars[4].heading = -Math.PI / 2;
    traffic.cars[5].group.position.set(10, 0, 25.6);
    traffic.cars[5].heading = -Math.PI / 2;
    traffic.peds[4].group.position.set(-45, 0, 38.5);
    traffic.peds[5].group.position.set(-75, 0, 21.5);
    return;
  }

  if (name === 'driving') {
    // Delivering the gold coupe in the middle of the story: two stars, the
    // garage ahead on the minimap, oncoming traffic in the far lane, and
    // every other car moved east so nothing can wander into her lane and
    // rear-end the shot.
    stageMidGame(ctx, 9200, 5, 1100, 50, 25, 100);
    const car = placePlayerInCar(ctx, 6, 0);
    car.group.position.set(-32.2, 0, -40);
    car.condition = 82;
    state.scripted = { fwd: 1, str: 0 };
    state.radioIndex = 1;
    missions.index = 1;
    missions.start(ctx.say);
    missions.active.stage = 'deliver';
    missions.stageIndex = 1;
    missions.active.target = new THREE.Vector3(missions.places.garage.x, 0, missions.places.garage.z);
    missions.moveBeacon();
    police.setStars(2);
    police.update(0.1, car.group.position, Math.abs(car.speed), false, null);
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
    // The last job, on the clock: Mara in the red sedan on the coast road,
    // three stars, 2:29 left to lose the cops, the city ahead of her and
    // cruisers in frame. She starts at the city's south edge, on the road
    // (not on the sand), and drives in — the beach and the sea stay behind
    // the camera.
    stageMidGame(ctx, 14800, 6, 1140, 75, 55, 88);
    const car = placePlayerInCar(ctx, 0, Math.PI);
    car.group.position.set(24.2, 0, 100);
    car.condition = 74;
    state.scripted = { fwd: 1, str: 0 };
    state.camYaw = car.heading + Math.PI + 0.4;
    // Low camera, same as the cover: level enough that the air unit and
    // the sky stay in the frame.
    state.camPitch = 0.2;
    missions.index = 2;
    missions.start(ctx.say);
    // The countdown lives on the mission runner, not on the active job
    // object: 149 seconds shows as TIME 2:29 on the job clock.
    missions.timer = 149;
    // Four stars, not three: the air unit only spawns at four, and the
    // heli angle below can only be set once the heli exists.
    placeCruisersBehind(ctx, car, 4);
    // The air unit ends the shot almost straight ahead, over the road:
    // same 0.66 rad drift allowance as the cover scene, so the angle is
    // set that far back from north.
    const fwd = new THREE.Vector3(Math.sin(car.heading), 0, Math.cos(car.heading));
    const side = new THREE.Vector3(Math.cos(car.heading), 0, -Math.sin(car.heading));
    if (police.heli) {
      const off = fwd.clone().multiplyScalar(26).addScaledVector(side, 20);
      police.heliAngle = Math.atan2(off.z, off.x);
    }
    // One cruiser head-on in the far lane, one on the right flank just
    // ahead, one trailing behind for the minimap.
    const [c0, c1, c2] = ctx.police.cruisers;
    c0.group.position.copy(car.group.position).addScaledVector(fwd, 35).addScaledVector(side, -4.4);
    c0.heading = car.heading + Math.PI;
    c0.group.rotation.y = c0.heading;
    c1.group.position.copy(car.group.position).addScaledVector(fwd, 12).addScaledVector(side, 5);
    c1.heading = car.heading;
    c1.group.rotation.y = c1.heading;
    c2.group.position.copy(car.group.position).addScaledVector(fwd, -14).addScaledVector(side, 2.5);
    c2.heading = car.heading;
    c2.group.rotation.y = c2.heading;
    ctx.say('Silas: "Lose them, then come home. Do not get caught."');
    return;
  }

  // Default (onfoot): Mara on a palm-lined boulevard, one job done, the
  // city behind her, pedestrians and the pink scooter passing. She stands
  // in the street's own lane (x=-32.2, on the -33 street): the sidewalk
  // strip west of it puts a building face between her and the camera, so
  // the sidewalk is not an option for this shot. The traffic car that
  // used to drive straight through her lane is moved to the far lane.
  stageMidGame(ctx, 6830, 3, 1080, 25, 0, 100);
  missions.index = 1; // the first job is done; the next waits on Tab
  mara.group.position.set(-32.2, 0, 60);
  mara.group.rotation.y = Math.PI * 0.9;
  state.camYaw = Math.PI * 0.15;
  state.camPitch = 0.36;
  state.camDist = 7;
  traffic.peds[0].group.position.set(-28, 0, 52);
  traffic.peds[1].group.position.set(-36, 0, 70);
  traffic.peds[2].group.position.set(-24, 0, 64);
  traffic.peds[3].group.position.set(-38, 0, 56);
  traffic.cars[0].group.position.set(-27.8, 0, 20);
  traffic.cars[0].heading = 0;
  traffic.cars[1].group.position.set(-27.8, 0, 90);
  traffic.cars[1].heading = Math.PI;
  if (traffic.scooter) {
    traffic.scooter.axis = 'z';
    traffic.scooter.group.position.set(-27.8, 0, 30);
    traffic.scooter.group.rotation.y = 0;
  }
  ctx.hud.showDialogue('Mara Voss', 'MV', 'One job down. Silas wants the gold coupe next.', 6);
}
