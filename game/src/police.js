// The SBPB: wanted stars, cruiser chases, the helicopter, the bust, and
// the dispatch rows the HUD shows. Wanted decays after 18 quiet seconds,
// faster when no cruiser is close enough to see Mara.
import { WORLD, TUNING, DISPATCH_UNITS, DISPATCH_ROLES } from './config.js';
import { makeRng, pick, range } from './random.js';
import { makePoliceMesh, makeHeliMesh, syncCarMesh } from './vehicles.js';
import { moveWithCollision } from './city.js';

export function createPolice(G) {
  return {
    wanted: 0,
    decayT: 0,
    cruisers: [],
    heli: null,
    heliAngle: 0,
    heliAnnounced: false,
    bustTimer: 0,
    ramCooldown: 0,
    rng: makeRng(G.seed + 53),
  };
}

export function addWanted(G, n) {
  const pol = G.police;
  pol.wanted = Math.max(0, Math.min(5, pol.wanted + n));
  pol.decayT = 0;
}

export function setWanted(G, n) {
  G.police.wanted = Math.max(0, Math.min(5, n));
  G.police.decayT = 0;
  G.police.bustTimer = 0;
}

function spawnCruiser(G) {
  const pol = G.police;
  const rng = pol.rng;
  // Drop the cruiser onto a road 60-100 m from Mara.
  const angle = rng() * Math.PI * 2;
  const dist = range(rng, 60, 100);
  let x = G.player.x + Math.cos(angle) * dist;
  let z = G.player.z + Math.sin(angle) * dist;
  x = Math.max(-WORLD.half + 10, Math.min(WORLD.half - 10, x));
  z = Math.max(-WORLD.half + 10, Math.min(WORLD.half - 10, z));
  const mesh = makePoliceMesh();
  G.scene.add(mesh);
  const cruiser = {
    name: pick(rng, DISPATCH_UNITS),
    role: pick(rng, DISPATCH_ROLES),
    mesh,
    x,
    z,
    heading: Math.atan2(G.player.x - x, G.player.z - z),
    speed: 0,
    cond: 100,
    kind: 'police',
    owner: 'sbpb',
    disabled: false,
    leaving: false,
  };
  syncCarMesh(cruiser);
  pol.cruisers.push(cruiser);
  return cruiser;
}

function removeCruiser(G, cruiser) {
  G.scene.remove(cruiser.mesh);
  const i = G.police.cruisers.indexOf(cruiser);
  if (i >= 0) G.police.cruisers.splice(i, 1);
}

export function nearestCruiserDist(G) {
  let best = Infinity;
  for (const c of G.police.cruisers) {
    if (c.leaving || c.disabled) continue;
    const d = Math.hypot(c.x - G.player.x, c.z - G.player.z);
    if (d < best) best = d;
  }
  return best;
}

export function dispatchRows(G) {
  const rows = [];
  const pol = G.police;
  if (pol.heli && pol.heli.active) {
    const d = Math.round(Math.hypot(pol.heli.x - G.player.x, pol.heli.z - G.player.z));
    rows.push({ name: 'AIR-1', role: 'SPOTLIGHT', dist: d });
  }
  for (const c of pol.cruisers) {
    if (c.leaving) continue;
    rows.push({
      name: c.name,
      role: c.role,
      dist: Math.round(Math.hypot(c.x - G.player.x, c.z - G.player.z)),
    });
  }
  return rows.slice(0, 6);
}

export function updatePolice(G, dt, rawDt) {
  const pol = G.police;
  const p = G.player;

  if (pol.ramCooldown > 0) pol.ramCooldown -= rawDt;

  // Wanted decay runs on wall time so a slow machine still sees the heat
  // fade; the chase itself moves on game time below.
  if (pol.wanted > 0) {
    const near = nearestCruiserDist(G);
    const rate = near > TUNING.wantedLosRange ? TUNING.wantedLosBonus : 1;
    pol.decayT += rawDt * rate;
    if (pol.decayT >= TUNING.wantedDecaySeconds) {
      pol.wanted -= 1;
      pol.decayT = 0;
      if (pol.wanted === 0) {
        for (const c of pol.cruisers) c.leaving = true;
      }
    }
  }

  // Cruiser count tracks the heat: one plus the stars, at most six.
  const wantCount = pol.wanted > 0 ? Math.min(1 + pol.wanted, 6) : 0;
  const active = pol.cruisers.filter((c) => !c.leaving).length;
  if (active < wantCount) spawnCruiser(G);

  for (const c of [...pol.cruisers]) {
    if (c.disabled) continue;
    if (c.leaving) {
      // Drive away from Mara and vanish past 150 m.
      const away = Math.atan2(c.x - p.x, c.z - p.z);
      c.heading = away;
      c.speed = 14;
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      syncCarMesh(c);
      if (Math.hypot(c.x - p.x, c.z - p.z) > 160) removeCruiser(G, c);
      continue;
    }
    // Chase: steer toward Mara, faster the hotter it is.
    const targetHeading = Math.atan2(p.x - c.x, p.z - c.z);
    let dh = targetHeading - c.heading;
    while (dh > Math.PI) dh -= Math.PI * 2;
    while (dh < -Math.PI) dh += Math.PI * 2;
    c.heading += dh * Math.min(1, dt * 1.6);
    const topSpeed = 15 + pol.wanted * 2.2;
    c.speed += (topSpeed - c.speed) * Math.min(1, dt * 0.8);
    const step = c.speed * dt;
    moveWithCollision(G.city.colliders, c, Math.sin(c.heading) * step, Math.cos(c.heading) * step);
    syncCarMesh(c);

    // Ram the player's car: damage, shove, a toast, and no extra heat
    // beyond the chase itself.
    const dist = Math.hypot(c.x - p.x, c.z - p.z);
    if (p.inCar && dist < 4.2) {
      const car = p.car;
      if (car && car.cond > 0) {
        car.cond = Math.max(0, car.cond - 6);
        car.speed *= 0.55;
        c.speed *= 0.4;
        if (pol.ramCooldown <= 0) {
          pol.ramCooldown = TUNING.ramToastCooldown;
          G.hud.toast('You rammed a cruiser! ★');
          G.audio.punch();
        }
      }
    }
    // On foot at five stars, a cruiser on top of Mara starts the bust.
    // The bust clock runs on wall time: a slow machine still gets caught.
    if (!p.inCar && pol.wanted >= 5 && dist < TUNING.bustRange) {
      pol.bustTimer += rawDt;
      if (pol.bustTimer >= TUNING.bustSeconds) {
        pol.bustTimer = 0;
        G.onBusted();
      }
    }
  }
  if (p.inCar || pol.wanted < 5 || nearestCruiserDist(G) > TUNING.bustRange) {
    pol.bustTimer = Math.max(0, pol.bustTimer - rawDt * 2);
  }

  // Helicopter: joins at four stars, circles low with its light on Mara.
  if (pol.wanted >= 4) {
    if (!pol.heli) {
      const mesh = makeHeliMesh();
      mesh.userData.spot.target = G.spotTarget;
      G.scene.add(mesh);
      pol.heli = { mesh, active: true, x: p.x, z: p.z, y: 13 };
      pol.heliAnnounced = false;
    }
    pol.heli.active = true;
    if (!pol.heliAnnounced) {
      pol.heliAnnounced = true;
      G.hud.showDialogue('Capt. Drew', 'CD', 'Air One has you in the light, Voss. Give it up.');
    }
    pol.heliAngle += dt * 0.45;
    const hx = p.x + Math.cos(pol.heliAngle) * 12;
    const hz = p.z + Math.sin(pol.heliAngle) * 12;
    pol.heli.x = hx;
    pol.heli.z = hz;
    pol.heli.mesh.position.set(hx, 13, hz);
    pol.heli.mesh.rotation.y = -pol.heliAngle;
    pol.heli.mesh.userData.rotor.rotation.y += dt * 22;
    G.spotTarget.position.set(p.x, 1, p.z);
  } else if (pol.heli && pol.heli.active) {
    pol.heli.active = false;
    G.scene.remove(pol.heli.mesh);
    pol.heli = null;
  }

  G.audio.setSiren(pol.wanted >= 2);
}
