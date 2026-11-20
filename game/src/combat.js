// Solmar Bay — fists and firearms. On foot, Mara can throw a punch (F or
// click) or fire the selected weapon (keys 1-4 pick a slot). A pedestrian in
// reach goes down for a few seconds and the heat notices; a cop in reach
// notices a lot more, and a cruiser takes real damage — shoot one up and it
// stalls, then gets towed. Guns cost ammo and restock when a job pays out;
// slots unlock as the story advances, so a locked slot is a promise, not a
// decoration. The punch is a quick arm swing with a thud, and it briefly
// staggers whatever it lands on.

import * as THREE from 'three';
import { WANTED_TUNING, WEAPONS } from './config.js';

export class Combat {
  constructor() {
    this.cooldown = 0;
    this.swing = 0; // 0..1, the arm swing animation
    this.weapons = WEAPONS.map((w) => ({ ...w, ammo: w.ammo }));
    this.selected = 0;
  }

  unlocked(n, missionsDone) {
    return n >= 0 && n < this.weapons.length && missionsDone >= this.weapons[n].unlock;
  }

  current() {
    return this.weapons[this.selected];
  }

  // Returns true, or 'locked' when the story has not opened the slot yet.
  select(n, missionsDone) {
    if (n < 0 || n >= this.weapons.length) return false;
    if (!this.unlocked(n, missionsDone)) return 'locked';
    this.selected = n;
    return true;
  }

  // A finished job restocks the guns.
  refill() {
    this.weapons[1].ammo += 12;
    this.weapons[2].ammo += 4;
    this.weapons[3].ammo += 30;
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swing = Math.max(0, this.swing - dt * 3.2);
  }

  // Fires the selected weapon. Returns 'ped' | 'police' | 'miss' |
  // 'empty' | 'cooldown'.
  fire(playerPos, playerHeading, traffic, police, audio) {
    const w = this.current();
    if (w.id === 'fists') return this.punch(playerPos, playerHeading, traffic, police, audio);
    if (this.cooldown > 0) return 'cooldown';
    if (w.ammo <= 0) return 'empty';
    this.cooldown = w.cooldown;
    w.ammo -= 1;
    if (audio) audio.shot(w.id);
    const target = this.pickTarget(playerPos, playerHeading, w.range, traffic, police);
    if (!target) return 'miss';
    if (target.kind === 'ped') {
      target.ped.down = 4;
      target.ped.group.rotation.x = -Math.PI / 2;
      return 'ped';
    }
    police.damageCruiser(target.cruiser, w.damage);
    return 'police';
  }

  // The nearest living thing in front of the barrel, inside the range.
  pickTarget(playerPos, heading, range, traffic, police) {
    const fx = Math.sin(heading);
    const fz = Math.cos(heading);
    let best = null;
    let bestD = range;
    for (const ped of traffic.peds) {
      if (ped.down > 0) continue;
      const dx = ped.group.position.x - playerPos.x;
      const dz = ped.group.position.z - playerPos.z;
      const fwd = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      const d = Math.hypot(dx, dz);
      if (fwd > 0 && d < bestD && side < 2.5) {
        bestD = d;
        best = { kind: 'ped', ped };
      }
    }
    for (const cruiser of police.cruisers) {
      if (cruiser.disabled > 0) continue;
      const dx = cruiser.group.position.x - playerPos.x;
      const dz = cruiser.group.position.z - playerPos.z;
      const fwd = dx * fx + dz * fz;
      const side = Math.abs(dx * fz - dz * fx);
      const d = Math.hypot(dx, dz);
      if (fwd > 0 && d < bestD && side < 3) {
        bestD = d;
        best = { kind: 'police', cruiser };
      }
    }
    return best;
  }

  // Returns 'ped' | 'police' | 'miss' | 'cooldown'.
  punch(playerPos, playerHeading, traffic, police, audio) {
    if (this.cooldown > 0) return 'cooldown';
    this.cooldown = 0.45;
    this.swing = 1;
    if (audio) audio.thud();
    const reach = new THREE.Vector3(
      playerPos.x + Math.sin(playerHeading) * 1.8,
      0,
      playerPos.z + Math.cos(playerHeading) * 1.8,
    );
    const ped = traffic.nearestPedestrian(reach, 2.2);
    if (ped) {
      ped.down = 4;
      ped.group.rotation.x = -Math.PI / 2;
      return 'ped';
    }
    for (const cruiser of police.cruisers) {
      if (cruiser.group.position.distanceTo(reach) < 2.4) return 'police';
    }
    return 'miss';
  }

  // The swing angle for Mara's right arm this frame.
  armAngle() {
    return -this.swing * 1.6;
  }
}
