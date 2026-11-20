// Solmar Bay — the wanted level and the police who answer it.
// Stars rise when Mara steals a car, hits a pedestrian or rams a cruiser,
// and fall one at a time when she lays low. Police cruisers spawn at the
// city edge, chase her car or her on foot, and ram. On foot, a cruiser that
// stays close too long busts her; in a crash that empties her health, she
// is wasted. Either way she wakes at the safehouse, lighter by a fine.

import * as THREE from 'three';
import { WANTED_TUNING, WORLD } from './config.js';
import { makePoliceCar } from './vehicles.js';
import { pick } from './random.js';

export class Police {
  constructor(scene, rng, colliders, streetCenters) {
    this.scene = scene;
    this.rng = rng;
    this.colliders = colliders;
    this.streetCenters = streetCenters;
    this.cruisers = [];
    this.stars = 0;
    this.sinceCrime = 99;
    this.bustTimer = 0;
    this.half = (WORLD.blocks * WORLD.pitch) / 2;
  }

  addCrime(stars) {
    this.stars = Math.min(WANTED_TUNING.maxStars, this.stars + stars);
    this.sinceCrime = 0;
    return this.stars;
  }

  setStars(stars) {
    this.stars = Math.max(0, Math.min(WANTED_TUNING.maxStars, stars));
    this.sinceCrime = 0;
  }

  update(dt, target, targetSpeed, onFoot, onCrime) {
    this.sinceCrime += dt;
    // Laying low: one star fades every decay window.
    if (this.stars > 0 && this.sinceCrime > WANTED_TUNING.decaySeconds) {
      this.stars -= 1;
      this.sinceCrime = 0;
    }
    const wanted = Math.min(this.stars, WANTED_TUNING.maxPoliceCars);
    while (this.cruisers.length < wanted) this.spawnCruiser(target);
    while (this.cruisers.length > wanted) {
      const old = this.cruisers.pop();
      this.scene.remove(old.group);
    }

    let busted = false;
    for (const cruiser of this.cruisers) {
      // Chase: steer toward the target, faster than traffic, ramming speed.
      // Up close the cruiser slows right down and turns hard, so it can
      // actually close in on a player on foot instead of orbiting her.
      const to = new THREE.Vector3().subVectors(target, cruiser.group.position);
      to.y = 0;
      const dist = to.length();
      const wantHeading = Math.atan2(to.x, to.z);
      let diff = wantHeading - cruiser.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      const close = dist < 12;
      const turnRate = close ? 3.4 : 1.6;
      cruiser.heading += THREE.MathUtils.clamp(diff, -turnRate * dt, turnRate * dt);
      const speed = Math.min(
        WANTED_TUNING.policeTopSpeed,
        close ? 4 + dist * 0.6 : 12 + dist * 0.6,
      );
      cruiser.group.position.x += Math.sin(cruiser.heading) * speed * dt;
      cruiser.group.position.z += Math.cos(cruiser.heading) * speed * dt;
      cruiser.group.position.x = Math.max(-WORLD.bounds, Math.min(WORLD.bounds, cruiser.group.position.x));
      cruiser.group.position.z = Math.max(-WORLD.bounds, Math.min(WORLD.bounds, cruiser.group.position.z));
      cruiser.group.rotation.y = cruiser.heading;
      for (const wheel of cruiser.wheels) wheel.rotation.x += speed * dt * 2.2;
      // Flashing light bar.
      cruiser.lightBar.material.color.setHex(Math.floor(performance.now() / 220) % 2 === 0 ? 0xff2020 : 0x2040ff);

      // Ram: contact hurts, and on foot it starts the bust clock.
      if (dist < 3.2) {
        if (onFoot) {
          this.bustTimer += dt;
          if (this.bustTimer > WANTED_TUNING.bustHoldSeconds) busted = true;
        } else if (onCrime) {
          onCrime('ram');
        }
      }
    }
    if (this.cruisers.length === 0) this.bustTimer = 0;
    else if (!onFoot) this.bustTimer = 0;
    return busted;
  }

  nearestStreet(v) {
    let best = this.streetCenters[0];
    for (const s of this.streetCenters) {
      if (Math.abs(s - v) < Math.abs(best - v)) best = s;
    }
    return best;
  }

  spawnCruiser(target) {
    const cruiser = makePoliceCar(this.rng);
    cruiser.parked = false;
    // Appear on a road a short block from the player — close enough to be
    // a threat at once, far enough not to spawn on top of her.
    const angle = this.rng() * Math.PI * 2;
    const dist = 35 + this.rng() * 20;
    let x = target.x + Math.cos(angle) * dist;
    let z = target.z + Math.sin(angle) * dist;
    if (this.rng() < 0.5) x = this.nearestStreet(x);
    else z = this.nearestStreet(z);
    x = THREE.MathUtils.clamp(x, -this.half, this.half);
    z = THREE.MathUtils.clamp(z, -this.half, this.half);
    cruiser.group.position.set(x, 0, z);
    cruiser.heading = Math.atan2(target.x - x, target.z - z);
    cruiser.group.rotation.y = cruiser.heading;
    this.scene.add(cruiser.group);
    this.cruisers.push(cruiser);
  }

  clear() {
    for (const cruiser of this.cruisers) this.scene.remove(cruiser.group);
    this.cruisers.length = 0;
    this.stars = 0;
    this.bustTimer = 0;
    this.sinceCrime = 99;
  }
}
