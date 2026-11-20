// Solmar Bay — the city itself: a grid of streets and pastel blocks, a beach
// and sea on the south edge, palm trees and streetlights, a low sunset sun
// and warm haze. Buildings are boxes dressed with canvas-drawn facades so
// the skyline reads as a real place without any image files.
// Returns the colliders (building footprints), the road graph the traffic
// drives on, and the named places missions point at.

import * as THREE from 'three';
import { WORLD, PALETTE } from './config.js';
import { makeRng, pick, range, rangeInt } from './random.js';

const STREET_CENTERS = [];
for (let i = 0; i <= WORLD.blocks; i += 1) {
  STREET_CENTERS.push(-WORLD.blocks * WORLD.pitch * 0.5 + i * WORLD.pitch);
}

function facadeTexture(rng, baseColor) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = baseColor;
  ctx.fillRect(0, 0, 128, 256);
  // Slight vertical shading so the block has a top and a base.
  const shade = ctx.createLinearGradient(0, 0, 0, 256);
  shade.addColorStop(0, 'rgba(255,255,255,0.18)');
  shade.addColorStop(1, 'rgba(0,0,0,0.22)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, 128, 256);
  // Window grid: some lit warm, most dark glass.
  const cols = 4;
  const rows = 8;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const lit = rng() < 0.28;
      ctx.fillStyle = lit ? '#ffd98a' : '#2a3547';
      ctx.fillRect(12 + c * 28, 14 + r * 29, 18, 18);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(rng) {
  const group = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x8a6a4a });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, 4.6, 6), trunkMat);
  trunk.position.y = 2.3;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  group.add(trunk);
  const leafMat = new THREE.MeshLambertMaterial({ color: 0x3f8f4a });
  for (let i = 0; i < 6; i += 1) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.55, 2.6, 4), leafMat);
    const angle = (i / 6) * Math.PI * 2;
    leaf.position.set(Math.cos(angle) * 0.9, 4.9, Math.sin(angle) * 0.9);
    leaf.rotation.z = Math.cos(angle) * 1.15;
    leaf.rotation.x = -Math.sin(angle) * 1.15;
    leaf.scale.set(1, 1, 0.35);
    group.add(leaf);
  }
  return group;
}

function makeStreetlight() {
  const group = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0x3a3f46 });
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.2, 6), mat);
  pole.position.y = 2.6;
  group.add(pole);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.1, 0.1), mat);
  arm.position.set(0.6, 5.1, 0);
  group.add(arm);
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffd98a }),
  );
  lamp.position.set(1.25, 5.0, 0);
  group.add(lamp);
  return group;
}

export function buildCity(scene, seed) {
  const rng = makeRng(seed);
  const colliders = [];
  const places = {};

  // Sky, haze and the low sun.
  scene.background = new THREE.Color(PALETTE.skyHorizon);
  scene.fog = new THREE.Fog(PALETTE.fog, 90, 420);
  const hemi = new THREE.HemisphereLight(0xffd9b0, 0x4a3a5a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(PALETTE.sun, 1.9);
  sun.position.set(-120, 55, 160);
  scene.add(sun);
  const sunDisc = new THREE.Mesh(
    new THREE.CircleGeometry(26, 32),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8, fog: false }),
  );
  sunDisc.position.set(-160, 34, 330);
  sunDisc.lookAt(0, 20, 0);
  scene.add(sunDisc);

  const half = (WORLD.blocks * WORLD.pitch) / 2;

  // Ground: one big slab, then the beach and the sea on the south edge.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 60, half * 2 + WORLD.sandDepth + WORLD.waterDepth + 60),
    new THREE.MeshLambertMaterial({ color: 0x7d8f66 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.05, (WORLD.sandDepth + WORLD.waterDepth) / 2 - 30);
  scene.add(ground);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 60, WORLD.sandDepth),
    new THREE.MeshLambertMaterial({ color: PALETTE.sand }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0, WORLD.beachStart + WORLD.sandDepth / 2);
  scene.add(sand);

  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(half * 2 + 60, WORLD.waterDepth),
    new THREE.MeshLambertMaterial({ color: PALETTE.water }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.05, WORLD.waterStart + WORLD.waterDepth / 2);
  scene.add(water);
  water.userData.isWater = true;

  // Streets: dark asphalt strips with pale sidewalks on each side.
  const asphaltMat = new THREE.MeshLambertMaterial({ color: PALETTE.asphalt });
  const walkMat = new THREE.MeshLambertMaterial({ color: PALETTE.sidewalk });
  const dashMat = new THREE.MeshBasicMaterial({ color: 0xd8d0a0 });
  for (const c of STREET_CENTERS) {
    const ns = new THREE.Mesh(new THREE.PlaneGeometry(WORLD.streetWidth, half * 2), asphaltMat);
    ns.rotation.x = -Math.PI / 2;
    ns.position.set(c, 0.01, 0);
    scene.add(ns);
    const ew = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, WORLD.streetWidth), asphaltMat);
    ew.rotation.x = -Math.PI / 2;
    ew.position.set(0, 0.01, c);
    scene.add(ew);
    // Sidewalk ribbons along each street.
    for (const off of [-1, 1]) {
      const swN = new THREE.Mesh(new THREE.PlaneGeometry(3, half * 2), walkMat);
      swN.rotation.x = -Math.PI / 2;
      swN.position.set(c + off * (WORLD.streetWidth / 2 + 1.5), 0.02, 0);
      scene.add(swN);
      const swE = new THREE.Mesh(new THREE.PlaneGeometry(half * 2, 3), walkMat);
      swE.rotation.x = -Math.PI / 2;
      swE.position.set(0, 0.02, c + off * (WORLD.streetWidth / 2 + 1.5));
      scene.add(swE);
    }
    // Dashed centre lines, skipping the intersections.
    for (let t = -half + 12; t < half - 12; t += 12) {
      if (STREET_CENTERS.some((s) => Math.abs(t - s) < 9)) continue;
      const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 5), dashMat);
      d1.rotation.x = -Math.PI / 2;
      d1.position.set(c, 0.03, t);
      scene.add(d1);
      const d2 = new THREE.Mesh(new THREE.PlaneGeometry(5, 0.4), dashMat);
      d2.rotation.x = -Math.PI / 2;
      d2.position.set(t, 0.03, c);
      scene.add(d2);
    }
  }

  // Buildings: one or four per block, pastel facades, taller toward the middle.
  const facadeCache = new Map();
  function facadeFor(color) {
    const key = color.toString(16);
    if (!facadeCache.has(key)) {
      facadeCache.set(key, facadeTexture(makeRng(hashOf(key)), '#' + key.padStart(6, '0')));
    }
    return facadeCache.get(key);
  }
  function hashOf(s) {
    let h = 0;
    for (let i = 0; i < s.length; i += 1) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h;
  }

  for (let bx = 0; bx < WORLD.blocks; bx += 1) {
    for (let bz = 0; bz < WORLD.blocks; bz += 1) {
      const cx = -half + WORLD.pitch / 2 + bx * WORLD.pitch;
      const cz = -half + WORLD.pitch / 2 + bz * WORLD.pitch;
      const distCentre = Math.hypot(cx, cz) / half;
      const tall = rng() < 0.3 + (1 - distCentre) * 0.35;
      const slots = tall ? 1 : 4;
      for (let s = 0; s < slots; s += 1) {
        const w = tall ? WORLD.blockSize * 0.8 : WORLD.blockSize * 0.38;
        const d = tall ? WORLD.blockSize * 0.8 : WORLD.blockSize * 0.38;
        const h = tall ? range(rng, 30, 68) : range(rng, 9, 20);
        const ox = slots === 1 ? 0 : (s % 2 === 0 ? -1 : 1) * WORLD.blockSize * 0.24;
        const oz = slots === 1 ? 0 : (s < 2 ? -1 : 1) * WORLD.blockSize * 0.24;
        const color = pick(rng, PALETTE.building);
        const mat = new THREE.MeshLambertMaterial({
          map: facadeFor(color),
          emissive: 0xffffff,
          emissiveMap: facadeFor(color),
          emissiveIntensity: 0.32,
        });
        const box = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        box.position.set(cx + ox, h / 2, cz + oz);
        scene.add(box);
        // Flat roof cap, slightly darker.
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6),
          new THREE.MeshLambertMaterial({ color: 0x5a4a3a }),
        );
        roof.position.set(cx + ox, h + 0.25, cz + oz);
        scene.add(roof);
        colliders.push({
          minX: cx + ox - w / 2,
          maxX: cx + ox + w / 2,
          minZ: cz + oz - d / 2,
          maxZ: cz + oz + d / 2,
        });
      }
    }
  }

  // Palms and streetlights along the sidewalks.
  for (const c of STREET_CENTERS) {
    for (let t = -half + 20; t < half - 10; t += 34) {
      if (STREET_CENTERS.some((s) => Math.abs(t - s) < 12)) continue;
      const palm = makePalm(rng);
      palm.position.set(c + (WORLD.streetWidth / 2 + 1.5), 0, t + range(rng, -4, 4));
      scene.add(palm);
      const lamp = makeStreetlight();
      lamp.position.set(c - (WORLD.streetWidth / 2 + 1.5), 0, t + 17);
      lamp.rotation.y = Math.PI;
      scene.add(lamp);
    }
  }
  // A palm row on the beach, plus bright umbrellas on the sand.
  for (let x = -half + 20; x < half - 10; x += 22) {
    const palm = makePalm(rng);
    palm.position.set(x, 0, WORLD.beachStart + 8);
    scene.add(palm);
  }
  const umbrellaColors = [0xff6a8a, 0xffd23a, 0x37e08a, 0x6aa8e8, 0xff9a3c];
  for (let i = 0; i < 7; i += 1) {
    const ux = -half + 40 + i * 62 + range(rng, -8, 8);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.4, 6),
      new THREE.MeshLambertMaterial({ color: 0xe8e2d4 }),
    );
    pole.position.set(ux, 1.2, WORLD.beachStart + 26);
    scene.add(pole);
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(2.2, 0.9, 8),
      new THREE.MeshLambertMaterial({ color: umbrellaColors[i % umbrellaColors.length] }),
    );
    canopy.position.set(ux, 2.8, WORLD.beachStart + 26);
    scene.add(canopy);
  }

  // Named places the missions point at.
  places.pier = { x: 30, z: WORLD.beachStart + 26 };
  places.garage = { x: -150, z: 30 };
  places.safehouse = { x: -30, z: -30 };
  places.marinaRow = { x: 90, z: -90 };

  // The pier: a wooden walkway out over the sand toward the water.
  const pierMat = new THREE.MeshLambertMaterial({ color: 0x7a5a3a });
  for (let i = 0; i < 8; i += 1) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(3, 0.3, 4), pierMat);
    plank.position.set(places.pier.x, 0.4, WORLD.beachStart + 6 + i * 4);
    scene.add(plank);
  }

  return { colliders, places, streetCenters: STREET_CENTERS, water };
}
