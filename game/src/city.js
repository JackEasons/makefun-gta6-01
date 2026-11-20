// Solmar Bay itself: a 7 x 6 block sunset city with a beach and a pier,
// built from three.js boxes with canvas window textures. Every tower is
// inset inside its block so street corners stay open, and the colliders
// list is exactly the tower footprints.
import * as THREE from 'three';
import { WORLD } from './config.js';
import { makeRng, pick, range, rangeInt, chance } from './random.js';

const PASTEL = [0xb8d0bc, 0xe8dcc0, 0xc0d4dc, 0xe8c0b8, 0xd8cce8, 0xc8d8bc, 0xe0c8a8];

function windowTexture(rng) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  // A pale wall: the pastel tint multiplies this, so the towers stay
  // bright at sunset and the windows read as dark glass.
  ctx.fillStyle = '#e8e2d4';
  ctx.fillRect(0, 0, 128, 256);
  for (let row = 0; row < 12; row += 1) {
    for (let col = 0; col < 6; col += 1) {
      const lit = rng() < 0.28;
      ctx.fillStyle = lit ? '#ffd76a' : '#2a3342';
      ctx.fillRect(8 + col * 20, 10 + row * 20, 13, 14);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makePalm(rng) {
  const palm = new THREE.Group();
  const trunkMat = new THREE.MeshLambertMaterial({ color: 0x7a5a38 });
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 6, 6), trunkMat);
  trunk.position.y = 3;
  trunk.rotation.z = range(rng, -0.08, 0.08);
  palm.add(trunk);
  const frondMat = new THREE.MeshLambertMaterial({ color: 0x2e6b34 });
  for (let i = 0; i < 6; i += 1) {
    const frond = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.7), frondMat);
    const a = (i / 6) * Math.PI * 2;
    frond.position.set(Math.cos(a) * 1.4, 6.1, Math.sin(a) * 1.4);
    frond.rotation.y = -a;
    frond.rotation.z = 0.45;
    palm.add(frond);
  }
  return palm;
}

export function buildCity(G) {
  const rng = makeRng(G.seed + 11);
  const group = new THREE.Group();
  const colliders = [];

  const scene = G.scene;
  scene.background = new THREE.Color(0xeda26e);
  scene.fog = new THREE.Fog(0xe8a06a, 190, 720);

  const hemi = new THREE.HemisphereLight(0xffd9a0, 0x6a4a3a, 1.05);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffb060, 1.25);
  sun.position.set(-140, 110, 90);
  scene.add(sun);

  // Ground: one big tan slab for sidewalks and plazas.
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshLambertMaterial({ color: 0xa8885e }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, 0, 0);
  group.add(ground);

  // Roads: dark strips along every street centre, both directions.
  const roadMat = new THREE.MeshLambertMaterial({ color: 0x2b2622 });
  const streets = [];
  for (let i = 0; i <= WORLD.blocks; i += 1) {
    streets.push(-WORLD.half + i * WORLD.pitch);
  }
  for (const c of streets) {
    const alongX = new THREE.Mesh(new THREE.PlaneGeometry(560, 16), roadMat);
    alongX.rotation.x = -Math.PI / 2;
    alongX.position.set(0, 0.02, c);
    group.add(alongX);
    const alongZ = new THREE.Mesh(new THREE.PlaneGeometry(16, 560), roadMat);
    alongZ.rotation.x = -Math.PI / 2;
    alongZ.position.set(c, 0.02, 0);
    group.add(alongZ);
  }

  // Centre dashes, one instanced mesh for the whole city. Short and pale
  // so they read as road paint from the chase cam, not planks.
  const dashGeo = new THREE.BoxGeometry(0.35, 0.06, 3);
  const dashMat = new THREE.MeshLambertMaterial({ color: 0xf0e6c8 });
  const dashSpots = [];
  for (const c of streets) {
    for (let d = -WORLD.half + 20; d <= WORLD.half - 20; d += 14) {
      dashSpots.push([d, c, 1]); // along an x-street: dash long in x
      dashSpots.push([c, d, 0]); // along a z-street: dash long in z
    }
  }
  const dashes = new THREE.InstancedMesh(dashGeo, dashMat, dashSpots.length);
  const m4 = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  dashSpots.forEach(([x, z, rot], i) => {
    q.setFromAxisAngle(up, rot ? Math.PI / 2 : 0);
    m4.compose(new THREE.Vector3(x, 0.06, z), q, new THREE.Vector3(1, 1, 1));
    dashes.setMatrixAt(i, m4);
  });
  dashes.instanceMatrix.needsUpdate = true;
  group.add(dashes);

  // Beach sand and the bay.
  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 76),
    new THREE.MeshLambertMaterial({ color: 0xd8c090 }),
  );
  sand.rotation.x = -Math.PI / 2;
  sand.position.set(0, 0.03, 204);
  group.add(sand);
  const water = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 170),
    new THREE.MeshLambertMaterial({ color: 0x2a6a8a, transparent: true, opacity: 0.92 }),
  );
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, 0.02, 327);
  group.add(water);
  G.water = water;

  // The pier: a wooden deck out to the package point, with posts.
  const woodMat = new THREE.MeshLambertMaterial({ color: 0x8a6a42 });
  const deck = new THREE.Mesh(new THREE.BoxGeometry(13, 0.5, 52), woodMat);
  deck.position.set(30, 0.1, 211);
  group.add(deck);
  const postGeo = new THREE.CylinderGeometry(0.25, 0.25, 2.4, 6);
  const postMat = new THREE.MeshLambertMaterial({ color: 0x6a4a2a });
  for (const px of [24.5, 35.5]) {
    for (const pz of [188, 204, 220, 234]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(px, 1, pz);
      group.add(post);
    }
  }
  const hut = new THREE.Mesh(
    new THREE.BoxGeometry(7, 3.4, 5),
    new THREE.MeshLambertMaterial({ color: 0xb07850 }),
  );
  hut.position.set(30, 1.9, 232);
  group.add(hut);
  const hutRoof = new THREE.Mesh(
    new THREE.ConeGeometry(5.4, 2.2, 4),
    new THREE.MeshLambertMaterial({ color: 0x7a3a2a }),
  );
  hutRoof.position.set(30, 4.6, 232);
  hutRoof.rotation.y = Math.PI / 4;
  group.add(hutRoof);

  // Towers: 7 columns by 6 rows of blocks; the southern row is beach.
  const winTex = windowTexture(rng);
  const winTex2 = windowTexture(rng);
  const sideMats = PASTEL.map(
    (c) => new THREE.MeshLambertMaterial({ color: c, map: winTex }),
  );
  const sideMats2 = PASTEL.map(
    (c) => new THREE.MeshLambertMaterial({ color: c, map: winTex2 }),
  );
  const roofMats = PASTEL.map((c) => new THREE.MeshLambertMaterial({ color: c }));

  const blockCenters = [];
  for (let i = 0; i < WORLD.blocks; i += 1) {
    blockCenters.push(-WORLD.half + WORLD.pitch / 2 + i * WORLD.pitch);
  }
  const rowCenters = blockCenters.slice(0, 6); // southern row stays beach

  for (const bx of blockCenters) {
    for (const bz of rowCenters) {
      // One plaza in six blocks: palms and benches, no tower.
      if (chance(rng, 0.16)) {
        for (let k = 0; k < 4; k += 1) {
          const palm = makePalm(rng);
          palm.position.set(bx + range(rng, -18, 18), 0, bz + range(rng, -18, 18));
          group.add(palm);
        }
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(6, 0.8, 2),
          new THREE.MeshLambertMaterial({ color: 0x5a4632 }),
        );
        bench.position.set(bx, 0.4, bz);
        group.add(bench);
        continue;
      }
      const towers = chance(rng, 0.45) ? 1 : 2;
      for (let t = 0; t < towers; t += 1) {
        const w = range(rng, 26, 38);
        const d = range(rng, 26, 38);
        const h = range(rng, WORLD.towerMin, WORLD.towerMax);
        const ox = towers === 1 ? 0 : (t === 0 ? -11 : 11);
        const oz = towers === 1 ? 0 : (t === 0 ? -11 : 11);
        const x = bx + ox;
        const z = bz + oz;
        const matSet = chance(rng, 0.5) ? sideMats : sideMats2;
        const colorIdx = rangeInt(rng, 0, PASTEL.length - 1);
        const mats = [matSet[colorIdx], matSet[colorIdx], roofMats[colorIdx],
          roofMats[colorIdx], matSet[colorIdx], matSet[colorIdx]];
        const tower = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
        tower.position.set(x, h / 2, z);
        group.add(tower);
        // Rooftop box so the skyline is not flat.
        if (chance(rng, 0.6)) {
          const cap = new THREE.Mesh(
            new THREE.BoxGeometry(w * 0.3, 3, d * 0.3),
            new THREE.MeshLambertMaterial({ color: 0x4a4038 }),
          );
          cap.position.set(x + range(rng, -4, 4), h + 1.5, z + range(rng, -4, 4));
          group.add(cap);
        }
        colliders.push({
          minX: x - w / 2 - 0.5,
          maxX: x + w / 2 + 0.5,
          minZ: z - d / 2 - 0.5,
          maxZ: z + d / 2 + 0.5,
        });
      }
    }
  }

  // Palms along the beach and a few on the boulevards.
  for (let i = 0; i < 22; i += 1) {
    const palm = makePalm(rng);
    palm.position.set(range(rng, -220, 220), 0, range(rng, 172, 200));
    group.add(palm);
  }
  for (let i = 0; i < 10; i += 1) {
    const palm = makePalm(rng);
    palm.position.set(pick(rng, streets), 0, range(rng, -200, 160));
    group.add(palm);
  }

  // Beach umbrellas.
  const umbrellaColors = [0xe05a4a, 0x4a9ab0, 0xe0c040, 0x7ab05a];
  for (let i = 0; i < 9; i += 1) {
    const ux = range(rng, -200, 200);
    const uz = range(rng, 176, 208);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 2.6, 5),
      new THREE.MeshLambertMaterial({ color: 0xd8d0c0 }),
    );
    pole.position.set(ux, 1.3, uz);
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.ConeGeometry(2.6, 1.1, 8),
      new THREE.MeshLambertMaterial({ color: pick(rng, umbrellaColors) }),
    );
    top.position.set(ux, 2.9, uz);
    group.add(top);
  }

  // Street lamps along the avenues.
  const lampPoleMat = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const lampGlowMat = new THREE.MeshLambertMaterial({ color: 0xffe9a8, emissive: 0xffd76a });
  for (const sx of [-170, -34, 102, 238]) {
    for (let z = -204; z <= 204; z += 68) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6, 5), lampPoleMat);
      pole.position.set(sx + 9, 3, z);
      group.add(pole);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), lampGlowMat);
      bulb.position.set(sx + 9, 6.1, z);
      group.add(bulb);
    }
  }

  scene.add(group);
  return { group, colliders, streets };
}

export function blockedByCity(colliders, x, z) {
  if (Math.abs(x) > WORLD.half || z < -WORLD.half || z > WORLD.waterZ) return true;
  for (const c of colliders) {
    if (x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) return true;
  }
  return false;
}

// Slide movement against the colliders: try x, then z, so Mara and cars
// slide along walls instead of sticking to them.
export function moveWithCollision(colliders, pos, dx, dz) {
  const nx = pos.x + dx;
  if (!blockedByCity(colliders, nx, pos.z)) pos.x = nx;
  const nz = pos.z + dz;
  if (!blockedByCity(colliders, pos.x, nz)) pos.z = nz;
}
