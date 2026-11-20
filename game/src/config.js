// Solmar Bay — tuning, palette and mission data in one place.
// Every system reads its numbers from here so the game can be balanced
// without hunting through the world, driving or police code.

export const WORLD = {
  // City grid: square blocks separated by streets, beach on the south edge.
  blockSize: 46,
  streetWidth: 14,
  pitch: 60, // blockSize + streetWidth
  blocks: 7, // 7 x 7 blocks, streets at -210 .. 210
  beachStart: 210, // sand begins here (south, +z)
  sandDepth: 52,
  waterStart: 262,
  waterDepth: 160,
  bounds: 250, // playable clamp on x/z (beach included)
};

export const PALETTE = {
  skyTop: 0x3d5c8f,
  skyHorizon: 0xffb36b,
  fog: 0xf7b183,
  sun: 0xffd27a,
  asphalt: 0x4a4e58,
  sidewalk: 0xaaa294,
  sand: 0xf0d09a,
  water: 0x2a86a8,
  building: [0xf2c9a0, 0xa8d8c8, 0xf7e8c8, 0xe8a0a0, 0x9fc8e8, 0xd8c8e8, 0xf0d8b0, 0xb8e0b8],
  car: [0xd8382c, 0x2c8f8f, 0xe8b820, 0xe8e8e8, 0x22242a, 0x7a4a9a, 0xe86a20, 0x3a6ad8],
  police: 0x1a2a4a,
  taxi: 0xe8b820,
};

export const PLAYER_TUNING = {
  walkSpeed: 6.5,
  runSpeed: 11,
  accel: 40,
  radius: 0.55,
  health: 100,
};

export const CAR_TUNING = {
  accel: 22,
  brake: 34,
  reverseAccel: 12,
  maxSpeed: 38,
  maxReverse: 10,
  drag: 0.55,
  steerMax: 0.55, // radians at the wheels, scaled down with speed
  steerSpeed: 2.6,
  radius: 2.1, // collision circle
  enterDistance: 4.0,
};

export const WANTED_TUNING = {
  maxStars: 5,
  decaySeconds: 18, // no crime for this long drops one star
  stealCar: 1,
  hitPedestrian: 1,
  hitPolice: 1,
  punchPolice: 2,
  maxPoliceCars: 4,
  policeTopSpeed: 34,
  policeRamDamage: 8,
  bustDistance: 3.0,
  bustHoldSeconds: 2.0,
  airStars: 4, // at this many stars the air unit joins the chase
};

// The arsenal. Fists never run dry; guns cost ammo, restocked by finishing
// jobs. unlock is how many jobs must be done before the slot opens.
export const WEAPONS = [
  { id: 'fists', name: 'FISTS', ammo: Infinity, range: 2.4, damage: 0, unlock: 0, cooldown: 0.45 },
  { id: 'pistol', name: 'PISTOL', ammo: 24, range: 20, damage: 25, unlock: 0, cooldown: 0.35 },
  { id: 'shotgun', name: 'SHOTGUN', ammo: 8, range: 11, damage: 55, unlock: 1, cooldown: 0.6 },
  { id: 'smg', name: 'VIPER SMG', ammo: 60, range: 24, damage: 15, unlock: 2, cooldown: 0.12 },
];

// Bay radio: the station line under the speedometer when driving.
export const RADIO = [
  'SOL 98.4 — Bay Pop',
  'PALM 101.2 — Sunset Rock',
  'TIDE 88.6 — Night Drive',
  'REEF 104.7 — Island Reggae',
];

// Solmar Bay Police Bureau units: callsign and the role the dispatch panel
// shows for each cruiser. The helicopter answers to AIR-1.
export const POLICE_UNITS = [
  ['REEF-1', 'RAMMING'],
  ['CORAL-7', 'PURSUIT'],
  ['TIDE-3', 'RESPONDING'],
  ['PALM-2', 'ROADBLOCK'],
  ['SURF-9', 'SPOTLIGHT'],
  ['DUNE-5', 'CLOSING IN'],
];

// Original model names for the cars Mara can take.
export const CAR_MODELS = {
  sedan: ['VELA GT', 'CORAL CRUISER', 'PALMA SEDAN', 'DUNE RUNNER'],
  coupe: ['SOLSTICE GT', 'MARINA COUPE', 'BREEZE GT'],
};

export const DAY_TUNING = {
  startDay: 1,
  startClock: 17 * 60 + 40, // 17:40, sunset over the bay
  minutesPerSecond: 0.5, // one game minute every two real seconds
  radioCycleSeconds: 75,
};

// The district name the HUD shows for a position on the map.
export function districtAt(x, z) {
  if (z >= WORLD.beachStart) return 'THE STRAND';
  if (x <= -150) return 'WEST END';
  if (x >= 150) return 'MARINA DISTRICT';
  if (z <= -150) return 'NORTH GATE';
  if (Math.abs(x) < 60 && Math.abs(z) < 60) return 'DOWNTOWN';
  return 'PALM BOULEVARD';
}

// How hot the bay feels at a wanted level, for the location line.
export function heatText(stars) {
  if (stars === 0) return 'CALM';
  if (stars <= 2) return 'HOT';
  if (stars <= 4) return 'MOST WANTED';
  return 'LOCKDOWN';
}

export const MISSIONS = [
  {
    id: 'pickup',
    title: 'The Pickup',
    intro: 'Silas: "Mara, a package is waiting at the pier. Bring it to me. No detours."',
    speaker: 'Silas Crane',
    initials: 'SC',
    objective: 'Pick up the package at the pier',
    stages: ['Reach the pier and grab the package'],
    reward: 600,
  },
  {
    id: 'hotwheels',
    title: 'Hot Wheels',
    intro: 'Silas: "A client wants that gold coupe on Marina Row. Take it, bring it to the garage. Quietly."',
    speaker: 'Silas Crane',
    initials: 'SC',
    objective: 'Steal the gold coupe and deliver it to the garage',
    stages: ['Steal the gold coupe on Marina Row', 'Deliver it to the garage on the west side'],
    reward: 900,
  },
  {
    id: 'getaway',
    title: 'The Long Way Home',
    intro: 'Silas: "The whole bay is looking for you now. Lose them, then come home. Do not get caught."',
    speaker: 'Silas Crane',
    initials: 'SC',
    objective: 'Lose the cops — get your wanted level to zero',
    stages: ['Lose the cops before the clock runs out'],
    timeLimit: 180,
    reward: 1500,
  },
];

export const STORY = {
  title: 'SOLMAR BAY',
  subtitle: 'A sunset hustle',
  intro:
    'Mara Voss came back to Solmar Bay with a busted car, a borrowed name and a debt ' +
    'to Silas Crane. One job at a time, she is buying her way out — if the bay lets her.',
  outro:
    'The sirens fade behind her. The bay is hers again — for tonight, at least. ' +
    'Mara Voss is out of debt. Solmar Bay is not done with her yet.',
};
