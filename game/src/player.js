// Mara Voss on foot: a blocky figure in a teal jacket, moved relative to
// the camera with WASD, Shift to run, and a little walk bob so the motion
// reads on screen.
import * as THREE from 'three';
import { TUNING } from './config.js';
import { moveWithCollision } from './city.js';

export function makePersonMesh(shirtColor, skinColor, withCap) {
  const person = new THREE.Group();
  const skin = new THREE.MeshLambertMaterial({ color: skinColor || 0xc89a72 });
  const shirt = new THREE.MeshLambertMaterial({ color: shirtColor });
  const pants = new THREE.MeshLambertMaterial({ color: 0x22242a });
  const cap = new THREE.MeshLambertMaterial({ color: 0x2a3550 });

  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), pants);
  legL.position.set(-0.14, 0.4, 0);
  person.add(legL);
  const legR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.8, 0.24), pants);
  legR.position.set(0.14, 0.4, 0);
  person.add(legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), shirt);
  torso.position.set(0, 1.16, 0);
  person.add(torso);
  const armL = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), shirt);
  armL.position.set(-0.42, 1.14, 0);
  person.add(armL);
  const armR = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.66, 0.2), shirt);
  armR.position.set(0.42, 1.14, 0);
  person.add(armR);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.38), skin);
  head.position.set(0, 1.72, 0);
  person.add(head);
  if (withCap) {
    const capTop = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.12, 0.42), cap);
    capTop.position.set(0, 1.95, 0);
    person.add(capTop);
    const brim = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.2), cap);
    brim.position.set(0, 1.9, 0.28);
    person.add(brim);
  }
  person.userData.legL = legL;
  person.userData.legR = legR;
  person.userData.armL = armL;
  person.userData.armR = armR;
  return person;
}

export function createPlayer(G) {
  const mesh = makePersonMesh(0x2e7d6b, 0xc89a72, true);
  mesh.position.set(G.player.x, 0, G.player.z);
  G.scene.add(mesh);
  return { mesh, bobPhase: 0 };
}

export function updatePlayer(G, dt) {
  const p = G.player;
  const input = G.input;
  const mv = input.moveVector();
  const running = input.running();
  const speed = running ? TUNING.runSpeed : TUNING.walkSpeed;

  // Camera forward on the ground plane, from camYaw (see main.js).
  const fx = -Math.sin(G.camYaw);
  const fz = -Math.cos(G.camYaw);
  const rx = -fz;
  const rz = fx;
  const mx = fx * mv.z + rx * mv.x;
  const mz = fz * mv.z + rz * mv.x;
  const moving = Math.hypot(mx, mz) > 0.01;

  if (moving) {
    const step = speed * dt;
    moveWithCollision(G.city.colliders, p, mx * step, mz * step);
    const targetHeading = Math.atan2(mx, mz);
    let dh = targetHeading - p.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    p.heading += dh * Math.min(1, dt * 12);
    p.speed = speed;
    p.mesh.userData.legL.rotation.x = Math.sin(G.time * 11) * 0.55;
    p.mesh.userData.legR.rotation.x = -Math.sin(G.time * 11) * 0.55;
    p.mesh.userData.armL.rotation.x = -Math.sin(G.time * 11) * 0.4;
    p.mesh.userData.armR.rotation.x = Math.sin(G.time * 11) * 0.4;
  } else {
    p.speed = 0;
    p.mesh.userData.legL.rotation.x *= 0.8;
    p.mesh.userData.legR.rotation.x *= 0.8;
    p.mesh.userData.armL.rotation.x *= 0.8;
    p.mesh.userData.armR.rotation.x *= 0.8;
  }

  p.mesh.position.set(p.x, 0, p.z);
  p.mesh.rotation.y = p.heading;
}
