// Solmar Bay — the city alive: AI cars driving the street grid and
// pedestrians strolling the sidewalks. Traffic cars follow street centrelines
// and turn at random intersections; pedestrians wander between sidewalk
// corners. Both are cheap on purpose: the city should feel busy, not heavy.

import * as THREE from 'three';
import { WORLD } from './config.js';
import { makeCar, randomCarColor } from './vehicles.js';
import { makePerson } from './player.js';
import { pick, range, rangeInt } from './random.js';

const PEDESTRIAN_SHIRTS = [0xe86a6a, 0x6aa8e8, 0xe8d86a, 0x9a6ae8, 0x6ae88a, 0xe8e8e8, 0x3a3f4a];

export class Traffic {
  constructor(scene, rng, colliders, streetCenters) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.streetCenters = streetCenters;
    this.cars = [];
    this.peds = [];
    this.half = (WORLD.blocks * WORLD.pitch) / 2;
  }

  spawnCars(count) {
    for (let i = 0; i < count; i += 1) {
      const car = makeCar(this.rng, randomCarColor(this.rng), this.rng() < 0.3 ? 'coupe' : 'sedan');
      car.parked = false;
      const axis = this.rng() < 0.5 ? 'x' : 'z';
      const street = pick(this.rng, this.streetCenters);
      const lane = range(this.rng, -this.half, this.half);
      if (axis === 'x') {
        car.group.position.set(lane, 0, street + (this.rng() < 0.5 ? 2.2 : -2.2));
        car.heading = this.rng() < 0.5 ? Math.PI / 2 : -Math.PI / 2;
      } else {
        car.group.position.set(street + (this.rng() < 0.5 ? 2.2 : -2.2), 0, lane);
        car.heading = this.rng() < 0.5 ? 0 : Math.PI;
      }
      car.speed = range(this.rng, 7, 11);
      car.group.rotation.y = car.heading;
      this.scene.add(car.group);
      this.cars.push(car);
    }
  }

  spawnPedestrians(count) {
    for (let i = 0; i < count; i += 1) {
      const person = makePerson(pick(this.rng, PEDESTRIAN_SHIRTS), pick(this.rng, [0x2a2f3a, 0x5a4a3a, 0x3a4a5a]));
      const street = pick(this.rng, this.streetCenters);
      const along = range(this.rng, -this.half, this.half);
      const side = this.rng() < 0.5;
      person.group.position.set(
        side ? street + 8.5 : along,
        0,
        side ? along : street + 8.5,
      );
      person.speed = range(this.rng, 1.1, 1.9);
      person.target = this.nextCorner(person.group.position);
      person.down = 0; // seconds left lying down after a punch
      this.scene.add(person.group);
      this.peds.push(person);
    }
  }

  nextCorner(from) {
    const street = pick(this.rng, this.streetCenters);
    const along = range(this.rng, -this.half, this.half);
    return new THREE.Vector3(street + 8.5, 0, along);
  }

  update(dt, playerPos) {
    // Traffic cars: cruise along their street; at an intersection, sometimes turn.
    for (const car of this.cars) {
      const ahead = this.carAhead(car);
      const target = ahead ? Math.max(0, ahead - 8) : 11;
      car.speed += (target - car.speed) * Math.min(1, dt * 1.5);
      const dx = Math.sin(car.heading) * car.speed * dt;
      const dz = Math.cos(car.heading) * car.speed * dt;
      car.group.position.x += dx;
      car.group.position.z += dz;
      car.group.rotation.y = car.heading;
      for (const wheel of car.wheels) wheel.rotation.x += car.speed * dt * 2.2;
      // Wrap around the city edge so the streets never run dry.
      if (car.group.position.x > this.half + 20) car.group.position.x = -this.half - 20;
      if (car.group.position.x < -this.half - 20) car.group.position.x = this.half + 20;
      if (car.group.position.z > this.half + 20) car.group.position.z = -this.half - 20;
      if (car.group.position.z < -this.half - 20) car.group.position.z = this.half + 20;
      // At a street crossing, roll the dice on a turn.
      const nearX = this.streetCenters.find((s) => Math.abs(car.group.position.x - s) < 1.2);
      const nearZ = this.streetCenters.find((s) => Math.abs(car.group.position.z - s) < 1.2);
      if (nearX !== undefined && nearZ !== undefined && this.rng() < dt * 0.5) {
        car.heading = pick(this.rng, [0, Math.PI / 2, Math.PI, -Math.PI / 2]);
      }
    }

    // Pedestrians: stroll to their corner, then pick another.
    for (const ped of this.peds) {
      if (ped.down > 0) {
        ped.down -= dt;
        ped.group.rotation.x = ped.down > 0 ? -Math.PI / 2 : 0;
        continue;
      }
      const pos = ped.group.position;
      const to = new THREE.Vector3().subVectors(ped.target, pos);
      to.y = 0;
      if (to.length() < 1.5) {
        ped.target = this.nextCorner(pos);
        continue;
      }
      to.normalize();
      pos.addScaledVector(to, ped.speed * dt);
      ped.group.rotation.y = Math.atan2(to.x, to.z);
      const swing = Math.sin(performance.now() / 140 + pos.x) * 0.4;
      ped.legL.rotation.x = swing;
      ped.legR.rotation.x = -swing;
    }
  }

  // Distance to the nearest car ahead in this car's lane, or null.
  carAhead(car) {
    let nearest = null;
    for (const other of this.cars) {
      if (other === car) continue;
      const dx = other.group.position.x - car.group.position.x;
      const dz = other.group.position.z - car.group.position.z;
      const forward = dx * Math.sin(car.heading) + dz * Math.cos(car.heading);
      const side = Math.abs(dx * Math.cos(car.heading) - dz * Math.sin(car.heading));
      if (forward > 0 && forward < 22 && side < 3) {
        if (nearest === null || forward < nearest) nearest = forward;
      }
    }
    return nearest;
  }

  // The pedestrian nearest to a point, within a radius — for punching.
  nearestPedestrian(pos, radius) {
    let best = null;
    let bestDist = radius;
    for (const ped of this.peds) {
      if (ped.down > 0) continue;
      const d = ped.group.position.distanceTo(pos);
      if (d < bestDist) {
        bestDist = d;
        best = ped;
      }
    }
    return best;
  }
}
