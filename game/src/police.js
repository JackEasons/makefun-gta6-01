// Solmar Bay — the wanted level and the police who answer it.
// Stars rise when Mara steals a car, hits a pedestrian or rams a cruiser,
// and fall one at a time when she lays low. Police cruisers spawn at the
// city edge, chase her car or her on foot, and ram. On foot, a cruiser that
// stays close too long busts her; in a crash that empties her health, she
// is wasted. Either way she wakes at the safehouse, lighter by a fine.
// At four stars the air unit joins: a helicopter circles overhead with a
// searchlight cone. Every cruiser carries a callsign and a role, so the
// dispatch panel can name the units closing in on her.

import * as THREE from 'three';
import { WANTED_TUNING, WORLD, POLICE_UNITS } from './config.js';
import { makePoliceCar, makeHelicopter } from './vehicles.js';
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
    this.nextUnit = 0; // round-robin through the callsign roster
    this.heli = null;
    this.heliAngle = 0;
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

  // What the dispatch panel shows: every live unit, nearest first, with a
  // live distance in metres. A disabled cruiser is crossed out, and the
  // helicopter leads the list while it is up.
  dispatch(playerPos) {
    const rows = this.cruisers.map((c) => ({
      callsign: c.callsign,
      role: c.role,
      dist: Math.round(c.group.position.distanceTo(playerPos)),
      disabled: c.disabled > 0,
    }));
    rows.sort((a, b) => a.dist - b.dist);
    if (this.heli) {
      rows.unshift({
        callsign: 'AIR-1',
        role: 'SPOTLIGHT',
        dist: Math.round(this.heli.group.position.distanceTo(playerPos)),
        disabled: false,
      });
    }
    return rows;
  }

  // A gunshot on a cruiser: it takes damage, stalls when its health is
  // gone, and gets towed away a few seconds later.
  damageCruiser(cruiser, damage) {
    cruiser.health -= damage;
    if (cruiser.health <= 0 && cruiser.disabled <= 0) cruiser.disabled = 4;
  }

  nearestCruiser(pos, range) {
    let best = null;
    let bestDist = range;
    for (const cruiser of this.cruisers) {
      if (cruiser.disabled > 0) continue;
      const d = cruiser.group.position.distanceTo(pos);
      if (d < bestDist) {
        bestDist = d;
        best = cruiser;
      }
    }
    return best;
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

    // The air unit: up at four stars, gone when the heat drops.
    if (this.stars >= WANTED_TUNING.airStars && !this.heli) {
      this.heli = makeHelicopter();
      this.heliAngle = 0;
      this.scene.add(this.heli.group);
    } else if (this.stars < WANTED_TUNING.airStars && this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
    if (this.heli) {
      this.heliAngle += dt * 0.22;
      // A wide, low orbit: 36m out and 13m up keeps the air unit inside the
      // camera's vertical field while driving. The camera sits above the
      // car and looks down about 12 degrees, so the top of the frame is
      // only ~18 degrees above the horizon: any higher and the heli
      // vanishes above the top edge.
      const hx = target.x + Math.cos(this.heliAngle) * 36;
      const hz = target.z + Math.sin(this.heliAngle) * 36;
      this.heli.group.position.set(hx, 13, hz);
      this.heli.group.rotation.y = -this.heliAngle;
      this.heli.rotor.rotation.y += dt * 18;
    }

    let busted = false;
    for (let i = this.cruisers.length - 1; i >= 0; i -= 1) {
      const cruiser = this.cruisers[i];
      // A shot-up cruiser stalls with its lights out, then gets towed.
      if (cruiser.disabled > 0) {
        cruiser.disabled -= dt;
        cruiser.lightBar.material.color.setHex(0x303030);
        if (cruiser.disabled <= 0 && cruiser.health <= 0) {
          this.scene.remove(cruiser.group);
          this.cruisers.splice(i, 1);
        }
        continue;
      }
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
    const unit = POLICE_UNITS[this.nextUnit % POLICE_UNITS.length];
    this.nextUnit += 1;
    cruiser.callsign = unit[0];
    cruiser.role = unit[1];
    cruiser.health = 100;
    cruiser.disabled = 0;
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
    if (this.heli) {
      this.scene.remove(this.heli.group);
      this.heli = null;
    }
    this.stars = 0;
    this.bustTimer = 0;
    this.sinceCrime = 99;
  }
}
