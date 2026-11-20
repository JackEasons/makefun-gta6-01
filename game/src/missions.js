// Solmar Bay — the story in three jobs. Missions run in order; each one
// points a gold beacon at its target, talks through Silas on the radio, and
// pays cash on completion. The mission state is what the save file keeps.
//   1. The Pickup — walk or drive to the pier and grab the package.
//   2. Hot Wheels — steal the gold coupe on Marina Row, deliver it to the garage.
//   3. The Long Way Home — the law is on you; lose them all to finish the story.
// Every job is staged (Hot Wheels has two stages), and the last one runs on
// a three-minute clock: take too long and the job is off, though Tab starts
// it again. panel() is what the HUD's mission panel reads.

import * as THREE from 'three';
import { MISSIONS } from './config.js';

export class MissionManager {
  constructor(scene, places) {
    this.scene = scene;
    this.places = places;
    this.index = 0; // next mission to start
    this.active = null; // { def, stage, target: Vector3 }
    this.stageIndex = 0; // stage inside the active job
    this.timer = null; // seconds left on a timed job, null when untimed
    this.done = false;
    this.beacon = this.makeBeacon();
    this.beacon.visible = false;
    scene.add(this.beacon);
    this.package = this.makePackage();
    this.package.visible = false;
    scene.add(this.package);
  }

  makeBeacon() {
    const group = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.9, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffc820,
        transparent: true,
        opacity: 0.22,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    pole.position.y = 13;
    group.add(pole);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 0.18, 8, 32),
      new THREE.MeshBasicMaterial({ color: 0xffc820 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.3;
    group.add(ring);
    const diamond = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.8),
      new THREE.MeshBasicMaterial({ color: 0xffd94a }),
    );
    diamond.position.y = 6;
    group.add(diamond);
    group.userData.diamond = diamond;
    group.userData.ring = ring;
    return group;
  }

  makePackage() {
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 0.5, 0.7),
      new THREE.MeshLambertMaterial({ color: 0x8a5a2a }),
    );
    box.position.y = 0.6;
    const tape = new THREE.Mesh(
      new THREE.BoxGeometry(0.72, 0.52, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xe8d8a0 }),
    );
    tape.position.y = 0.6;
    const group = new THREE.Group();
    group.add(box);
    group.add(tape);
    return group;
  }

  currentDef() {
    return MISSIONS[this.index] ?? null;
  }

  // The mission panel's four lines: job, stage, next step, and the clock.
  panel() {
    if (this.done) {
      return { job: 'STORY COMPLETE', stage: '', next: 'Free roam — Solmar Bay is yours.', timer: null };
    }
    if (!this.active) {
      const def = this.currentDef();
      if (!def) return { job: 'STORY COMPLETE', stage: '', next: '', timer: null };
      return {
        job: `JOB ${this.index + 1}/${MISSIONS.length} · ${def.title.toUpperCase()}`,
        stage: 'READY',
        next: 'Press Tab to start the next job.',
        timer: null,
      };
    }
    const def = this.active.def;
    return {
      job: `JOB ${this.index + 1}/${MISSIONS.length} · ${def.title.toUpperCase()}`,
      stage: `STAGE ${this.stageIndex + 1}/${def.stages.length}`,
      next: def.stages[this.stageIndex],
      timer: this.timer,
    };
  }

  start(onMessage) {
    const def = this.currentDef();
    if (!def || this.active) return null;
    if (def.id === 'pickup') {
      this.active = { def, stage: 'go', target: new THREE.Vector3(this.places.pier.x, 0, this.places.pier.z) };
      this.package.position.set(this.places.pier.x, 0, this.places.pier.z);
      this.package.visible = true;
    } else if (def.id === 'hotwheels') {
      this.active = { def, stage: 'steal', target: new THREE.Vector3(this.places.marinaRow.x, 0, this.places.marinaRow.z) };
    } else if (def.id === 'getaway') {
      this.active = { def, stage: 'lose', target: null };
    }
    this.stageIndex = 0;
    this.timer = def.timeLimit ?? null;
    this.beacon.visible = true;
    this.moveBeacon();
    onMessage(def.intro);
    return this.active;
  }

  moveBeacon() {
    if (!this.active) return;
    if (this.active.target) {
      this.beacon.position.set(this.active.target.x, 0, this.active.target.z);
      this.beacon.visible = true;
    } else {
      this.beacon.visible = false;
    }
  }

  objectiveText() {
    if (this.done) return 'Story complete — Solmar Bay is yours. Free roam.';
    if (!this.active) return 'Press Tab to start the next job.';
    return this.active.def.objective;
  }

  // Called every frame; returns an event string when something happens.
  update(dt, playerPos, inCar, car, wanted, onMessage) {
    if (!this.active) return null;
    const def = this.active.def;
    this.beacon.userData.diamond.rotation.y += dt * 2;
    this.beacon.userData.diamond.position.y = 6 + Math.sin(performance.now() / 400) * 0.4;
    this.beacon.userData.ring.scale.setScalar(1 + Math.sin(performance.now() / 300) * 0.08);

    // A timed job: the clock runs out and the job is off — Tab retries it.
    if (this.timer !== null) {
      this.timer -= dt;
      if (this.timer <= 0) {
        this.timer = null;
        this.active = null;
        this.beacon.visible = false;
        onMessage('Silas: "Too slow — the job is off. Press Tab to try it again."');
        return 'failed';
      }
    }

    if (def.id === 'pickup') {
      if (playerPos.distanceTo(this.active.target) < 3) {
        this.package.visible = false;
        return this.complete(onMessage, 'Package secured. Silas is pleased — $500.');
      }
    } else if (def.id === 'hotwheels') {
      if (this.active.stage === 'steal' && inCar && car && car.stolen && car.style === 'coupe') {
        this.active.stage = 'deliver';
        this.stageIndex = 1;
        this.active.target = new THREE.Vector3(this.places.garage.x, 0, this.places.garage.z);
        this.moveBeacon();
        onMessage('Silas: "That is the one. Bring it to the garage on the west side."');
        return 'stage';
      }
      if (this.active.stage === 'deliver' && inCar && playerPos.distanceTo(this.active.target) < 5) {
        return this.complete(onMessage, 'Delivered clean. $900, no questions asked.');
      }
    } else if (def.id === 'getaway') {
      if (wanted === 0) {
        return this.complete(onMessage, 'Clean. The bay forgot your name — $1,500.');
      }
    }
    return null;
  }

  complete(onMessage, line) {
    const reward = this.active.def.reward;
    this.active = null;
    this.stageIndex = 0;
    this.timer = null;
    this.beacon.visible = false;
    this.index += 1;
    if (this.index >= MISSIONS.length) this.done = true;
    onMessage(line);
    return { completed: true, reward };
  }

  // The gold coupe for Hot Wheels is placed by main.js; this is its marker.
  markCoupe(car) {
    this.coupe = car;
    car.group.traverse((child) => {
      if (child.isMesh && child.material && child.material.emissive !== undefined) {
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0x664400);
      }
    });
  }
}
