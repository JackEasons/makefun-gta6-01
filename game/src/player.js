// Solmar Bay — Mara Voss on foot. The character is built from boxes and
// spheres in code (jacket, jeans, cap, sneakers) and walks with a simple
// bob; movement is camera-relative WASD with a run key, and buildings push
// her out with a circle collision so she can slide along walls.

import * as THREE from 'three';
import { PLAYER_TUNING, WORLD } from './config.js';
import { resolveCircle } from './vehicles.js';

export function makePerson(shirtColor, pantsColor, skinColor = 0xd8a070, hairColor = 0x3a2a1a) {
  const group = new THREE.Group();
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pants = new THREE.MeshLambertMaterial({ color: pantsColor });
  const skin = new THREE.MeshLambertMaterial({ color: skinColor });

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.34), shirt);
  torso.position.y = 1.12;
  group.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
  head.position.y = 1.68;
  group.add(head);

  // Hair: a half-sphere cap under the hat, so the crowd is not bald.
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshLambertMaterial({ color: hairColor }),
  );
  hair.position.y = 1.72;
  group.add(hair);

  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.1, 12),
    new THREE.MeshLambertMaterial({ color: 0x2a4a6a }),
  );
  cap.position.y = 1.86;
  group.add(cap);

  const legGeo = new THREE.BoxGeometry(0.24, 0.72, 0.26);
  const legL = new THREE.Mesh(legGeo, pants);
  legL.position.set(-0.16, 0.36, 0);
  group.add(legL);
  const legR = new THREE.Mesh(legGeo, pants);
  legR.position.set(0.16, 0.36, 0);
  group.add(legR);

  const armGeo = new THREE.BoxGeometry(0.18, 0.62, 0.2);
  const armL = new THREE.Mesh(armGeo, shirt);
  armL.position.set(-0.42, 1.12, 0);
  group.add(armL);
  const armR = new THREE.Mesh(armGeo, shirt);
  armR.position.set(0.42, 1.12, 0);
  group.add(armR);

  return { group, legL, legR, armL, armR, torso };
}

// Mara's own look: teal jacket, dark jeans, her cap pulled low.
export function makeMara() {
  return makePerson(0x2a8f8f, 0x2a2f3a, 0xd8a070);
}

// On-foot update. cameraYaw is the direction the camera looks (radians).
// Returns how far Mara moved this frame, for footsteps and the minimap.
export function walkPlayer(person, input, cameraYaw, dt, colliders) {
  const fwd = input.forward();
  const str = input.strafe();
  if (fwd === 0 && str === 0) {
    person.legL.rotation.x = 0;
    person.legR.rotation.x = 0;
    person.armL.rotation.x = 0;
    person.armR.rotation.x = 0;
    return 0;
  }
  const speed = input.running() ? PLAYER_TUNING.runSpeed : PLAYER_TUNING.walkSpeed;
  const sin = Math.sin(cameraYaw);
  const cos = Math.cos(cameraYaw);
  // Forward is away from the camera; strafe is to the camera's right.
  let mx = -sin * fwd + cos * str;
  let mz = -cos * fwd - sin * str;
  const len = Math.hypot(mx, mz);
  mx /= len;
  mz /= len;
  const pos = person.group.position;
  pos.x += mx * speed * dt;
  pos.z += mz * speed * dt;
  pos.x = Math.max(-WORLD.bounds, Math.min(WORLD.bounds, pos.x));
  pos.z = Math.max(-WORLD.bounds, Math.min(WORLD.bounds, pos.z));
  resolveCircle(pos, PLAYER_TUNING.radius, colliders);

  // Face the way she is moving, and swing the limbs.
  const targetHeading = Math.atan2(mx, mz);
  let diff = targetHeading - person.group.rotation.y;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  person.group.rotation.y += diff * Math.min(1, dt * 12);
  const swing = Math.sin(performance.now() / 90) * 0.55;
  person.legL.rotation.x = swing;
  person.legR.rotation.x = -swing;
  person.armL.rotation.x = -swing * 0.7;
  person.armR.rotation.x = swing * 0.7;
  return speed * dt;
}
