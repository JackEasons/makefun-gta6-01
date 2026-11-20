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
  skyTop: 0x2e4a7a,
  skyHorizon: 0xff9a5c,
  fog: 0xf2a06b,
  sun: 0xffd27a,
  asphalt: 0x3a3e46,
  sidewalk: 0x9a938a,
  sand: 0xe8c98f,
  water: 0x1d6f8f,
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
  decaySeconds: 25, // no crime for this long drops one star
  stealCar: 1,
  hitPedestrian: 1,
  hitPolice: 1,
  punchPolice: 2,
  maxPoliceCars: 4,
  policeTopSpeed: 34,
  policeRamDamage: 8,
  bustDistance: 3.0,
  bustHoldSeconds: 2.0,
};

export const MISSIONS = [
  {
    id: 'pickup',
    title: 'The Pickup',
    intro: 'Silas: "Mara, a package is waiting at the pier. Bring it to me. No detours."',
    objective: 'Pick up the package at the pier',
    reward: 500,
  },
  {
    id: 'hotwheels',
    title: 'Hot Wheels',
    intro: 'Silas: "A client wants that gold coupe on Marina Row. Take it, bring it to the garage. Quietly."',
    objective: 'Steal the gold coupe and deliver it to the garage',
    reward: 900,
  },
  {
    id: 'getaway',
    title: 'The Long Way Home',
    intro: 'Silas: "The whole bay is looking for you now. Lose them, then come home. Do not get caught."',
    objective: 'Lose the cops — get your wanted level to zero',
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
