// Solmar Bay — fists. On foot, Mara can throw a punch (F or click). A
// pedestrian in reach goes down for a few seconds and the heat notices;
// a cop in reach notices a lot more. The punch is a quick arm swing with
// a thud, and it briefly staggers whatever it lands on.

import * as THREE from 'three';
import { WANTED_TUNING } from './config.js';

export class Combat {
  constructor() {
    this.cooldown = 0;
    this.swing = 0; // 0..1, the arm swing animation
  }

  update(dt) {
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swing = Math.max(0, this.swing - dt * 3.2);
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
