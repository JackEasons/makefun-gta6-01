// Cars: one box-built mesh factory for every vehicle in Solmar Bay —
// parked cars to steal, traffic, police cruisers and the helicopter.
import * as THREE from 'three';
import { PARKED_CARS } from './config.js';

function box(w, h, d, color, x, y, z) {
  const mesh = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshLambertMaterial({ color }),
  );
  mesh.position.set(x, y, z);
  return mesh;
}

export function makeCarMesh(color) {
  const car = new THREE.Group();
  const body = box(2.0, 0.62, 4.5, color, 0, 0.55, 0);
  car.add(body);
  const cabin = box(1.7, 0.55, 2.2, 0x1c222c, 0, 1.1, -0.2);
  car.add(cabin);
  const tailMat = new THREE.MeshLambertMaterial({ color: 0xff2a1a, emissive: 0x882211 });
  for (const sx of [-0.7, 0.7]) {
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), tailMat);
    tail.position.set(sx, 0.62, -2.26);
    car.add(tail);
  }
  const headMat = new THREE.MeshLambertMaterial({ color: 0xfff2b0, emissive: 0x887722 });
  for (const sx of [-0.7, 0.7]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.16, 0.08), headMat);
    head.position.set(sx, 0.62, 2.26);
    car.add(head);
  }
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.3, 10);
  const wheelMat = new THREE.MeshLambertMaterial({ color: 0x141414 });
  const wheels = [];
  for (const [wx, wz] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(wx, 0.36, wz);
    car.add(wheel);
    wheels.push(wheel);
  }
  car.userData.wheels = wheels;
  return car;
}

export function makePoliceMesh() {
  const car = makeCarMesh(0xe8e8e8);
  const stripe = box(2.02, 0.2, 4.5, 0x1a2a4a, 0, 0.62, 0);
  car.add(stripe);
  const barBase = box(1.2, 0.12, 0.5, 0x222222, 0, 1.44, -0.2);
  car.add(barBase);
  const red = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.16, 0.4),
    new THREE.MeshLambertMaterial({ color: 0xff2020, emissive: 0xaa0000 }),
  );
  red.position.set(-0.32, 1.56, -0.2);
  car.add(red);
  const blue = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.16, 0.4),
    new THREE.MeshLambertMaterial({ color: 0x2040ff, emissive: 0x0000aa }),
  );
  blue.position.set(0.32, 1.56, -0.2);
  car.add(blue);
  car.userData.lightRed = red;
  car.userData.lightBlue = blue;
  return car;
}

export function makeHeliMesh() {
  const heli = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(2.2, 1.6, 4.2),
    new THREE.MeshLambertMaterial({ color: 0x2a3542 }),
  );
  body.position.y = 0;
  heli.add(body);
  const glass = new THREE.Mesh(
    new THREE.BoxGeometry(1.9, 0.9, 1.4),
    new THREE.MeshLambertMaterial({ color: 0x9ac8d8 }),
  );
  glass.position.set(0, 0.2, 1.6);
  heli.add(glass);
  const tail = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 4.5),
    new THREE.MeshLambertMaterial({ color: 0x2a3542 }),
  );
  tail.position.set(0, 0.3, -3.8);
  heli.add(tail);
  const fin = new THREE.Mesh(
    new THREE.BoxGeometry(0.2, 1.6, 1.2),
    new THREE.MeshLambertMaterial({ color: 0x2a3542 }),
  );
  fin.position.set(0, 0.9, -5.8);
  heli.add(fin);
  const rotor = new THREE.Mesh(
    new THREE.BoxGeometry(11, 0.08, 0.5),
    new THREE.MeshLambertMaterial({ color: 0x141414 }),
  );
  rotor.position.y = 1.1;
  heli.add(rotor);
  heli.userData.rotor = rotor;
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 12, 16, 1, true),
    new THREE.MeshLambertMaterial({
      color: 0xfff2b0, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
    }),
  );
  // The beam: narrow at the helicopter, widening down to the street.
  // ConeGeometry's apex is at the top by default, so no flip is needed.
  cone.position.y = -6.4;
  heli.add(cone);
  const spot = new THREE.SpotLight(0xffe9a8, 60, 40, 0.35, 0.5, 1.2);
  spot.position.set(0, -0.8, 0);
  heli.add(spot);
  heli.userData.spot = spot;
  // The light's target lives in the scene, not in the helicopter: the
  // police update aims it at Mara every frame.
  return heli;
}

// Parked cars from the roster. Each car object is the game's shared record
// for that vehicle: position, heading, speed, condition and owner.
export function spawnParkedCars(G) {
  const cars = [];
  for (const spec of PARKED_CARS) {
    const mesh = makeCarMesh(spec.color);
    mesh.position.set(spec.x, 0, spec.z);
    mesh.rotation.y = spec.heading;
    G.scene.add(mesh);
    cars.push({
      name: spec.name,
      color: spec.color,
      mesh,
      x: spec.x,
      z: spec.z,
      heading: spec.heading,
      speed: 0,
      cond: 100,
      kind: 'parked',
      owner: 'civilian',
      disabled: false,
    });
  }
  return cars;
}

export function syncCarMesh(car) {
  car.mesh.position.set(car.x, 0, car.z);
  car.mesh.rotation.y = car.heading;
  const spin = car.speed * 0.016 * 2.4;
  for (const wheel of car.mesh.userData.wheels || []) {
    wheel.rotation.x += spin;
  }
}
