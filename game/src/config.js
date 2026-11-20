// Every number and name that shapes Solmar Bay lives here, so the rest of
// the game reads one table instead of scattering magic values through the
// code. Nothing in this file touches the DOM or three.js.

export const SAVE_KEY = 'solmar-bay-save-v1';

export const WORLD = {
  pitch: 68, // one city block plus one street
  blocks: 7, // 7 x 7 blocks
  half: 238, // playable edge, metres from the centre
  beachZ: 186, // sand starts here
  waterZ: 242, // the bay starts here
  streetHalf: 8, // half the width of a road
  towerMin: 30, // shortest tower, metres
  towerMax: 68, // tallest tower, metres
};

export const SPAWN = { x: -30, z: -30, camYaw: 2.379 };

export const TUNING = {
  walkSpeed: 6,
  runSpeed: 10.5,
  carAccel: 13,
  carBrake: 22,
  carMaxSpeed: 34, // m/s, about 122 km/h
  carReverseMax: 9,
  carTurn: 0.021,
  carDrag: 0.35,
  trafficSpeed: 9,
  pedSpeed: 1.25,
  wantedDecaySeconds: 18, // one star fades after this long quiet
  wantedLosBonus: 1.5, // decay runs this much faster with no cruiser near
  wantedLosRange: 45, // metres: nearer than this, no bonus
  bustSeconds: 2, // seconds pinned by a cruiser at 5 stars before the bust
  bustRange: 5, // metres: a cruiser this close can pin Mara
  bustFine: 200, // dollars the bust costs
  healthRegen: 2, // health per second while the heat is off
  jobCompleteRadius: 6, // metres: close enough to finish a stage
  ramToastCooldown: 4, // seconds between "rammed a cruiser" toasts
};

// The three jobs. Each stage names its objective, its target on the map and
// the line Silas says when the stage starts. Rewards and the armour /
// respect bonus land when the job completes.
export const JOBS = [
  {
    name: 'THE PICKUP',
    reward: 600,
    intro: {
      name: 'Silas Crane',
      initials: 'SC',
      line: 'Mara, a package is waiting at the pier. Bring it to me. No detours.',
    },
    done: {
      name: 'Silas Crane',
      initials: 'SC',
      line: 'Package secured. Silas is pleased — $600.',
    },
    stages: [
      {
        text: 'Reach the pier and grab the package',
        objective: 'Pick up the package at the pier',
        target: { x: 30, z: 224 },
      },
    ],
  },
  {
    name: 'HOT WHEELS',
    reward: 900,
    intro: {
      name: 'Silas Crane',
      initials: 'SC',
      line: 'A client wants that gold coupe on Marina Row. Take it, bring it to the garage. Quietly.',
    },
    done: {
      name: 'Silas Crane',
      initials: 'SC',
      line: 'Delivered clean. $900, no questions asked.',
    },
    stages: [
      {
        text: 'Steal the gold coupe on Marina Row',
        objective: 'Steal the gold coupe on Marina Row',
        target: { x: 90, z: -90 },
      },
      {
        text: 'Deliver it to the garage on the west side',
        objective: 'Deliver the coupe to the garage on the west side',
        target: { x: -150, z: 30 },
      },
    ],
  },
  {
    name: 'THE LONG WAY HOME',
    reward: 1500,
    timerSeconds: 180,
    intro: {
      name: 'Silas Crane',
      initials: 'SC',
      line: 'The whole bay is looking for you now. Lose them, then come home. Do not get caught.',
    },
    done: {
      name: 'Mara Voss',
      initials: 'MV',
      line: 'That is the last of it. The debt is paid — Solmar Bay is mine now.',
    },
    stages: [
      {
        text: 'Lose the cops before the clock runs out',
        objective: 'Lose the cops before the clock runs out',
        target: null, // no waypoint while running: the nav strip hides
      },
    ],
  },
];

export const JOB_BONUS = {
  armour: 25,
  respect: 25,
  ammo: [0, 12, 4, 30], // pistol, shotgun, smg per finished job
};

// Four weapons. Fists never run out; the shotgun unlocks after one job and
// the Viper SMG after two.
export const WEAPONS = [
  { name: 'FISTS', ammo: Infinity, damage: 15, range: 2.4, rate: 0.35 },
  { name: 'PISTOL', ammo: 24, damage: 34, range: 42, rate: 0.3 },
  { name: 'SHOTGUN', ammo: 8, damage: 20, pellets: 3, range: 20, rate: 0.7 },
  { name: 'VIPER SMG', ammo: 60, damage: 20, range: 48, rate: 0.12 },
];

export const RADIO = [
  'TIDE 88.6 — Night Drive',
  'REEF 104.7 — Island Reggae',
  'SOL 98.4 — Bay Pop',
  'PALM 101.2 — Sunset Rock',
];

// SBPB dispatch units and the roles their rows can carry.
export const DISPATCH_UNITS = ['TIDE-3', 'PALM-2', 'REEF-1', 'CORAL-7', 'SURF-5', 'DUNE-9', 'BAY-4'];
export const DISPATCH_ROLES = ['RESPONDING', 'PURSUIT', 'RAMMING', 'ROADBLOCK'];

// Car roster: parked cars the player can steal, and the colours traffic
// cars wear. The red sedan by the spawn and the gold coupe on Marina Row
// are the two cars the jobs name.
export const PARKED_CARS = [
  { name: 'VELA GT', color: 0xc22e24, x: 30, z: -30, heading: 0.4 },
  { name: 'BREEZE GT', color: 0xd8a520, x: 90, z: -90, heading: -1.2 },
  { name: 'PALMA SEDAN', color: 0x9c2b26, x: -102, z: 68, heading: 1.6 },
  { name: 'CORAL HATCH', color: 0x4a7d8c, x: 136, z: -34, heading: -0.6 },
  { name: 'SAND VAN', color: 0xc8b070, x: -68, z: 170, heading: 2.8 },
  { name: 'REEF COUPE', color: 0x3f6d8e, x: 170, z: 102, heading: 0.9 },
];

export const TRAFFIC_COLORS = [0xd8d0c0, 0x4a6a8a, 0x8a4a3a, 0x5a7a4a, 0xc0a040, 0x707880, 0xa05a78, 0x3a5a6a];
export const TRAFFIC_NAMES = ['CITY SEDAN', 'TOUR TAXI', 'DELIVERY VAN', 'BEACH BUGGY', 'COMMUTER', 'SURF WAGON'];

export const DISTRICTS = [
  { name: 'THE STRAND', test: (x, z) => z >= 205 },
  { name: 'PALM BOULEVARD', test: (x, z) => z >= 165 || (x >= 60 && x <= 120 && z >= -120 && z <= -60) },
  { name: 'NORTH GATE', test: (x, z) => z <= -165 },
  { name: 'MARINA DISTRICT', test: (x, z) => x >= 135 },
  { name: 'WEST END', test: (x, z) => x <= -155 },
  { name: 'DOWNTOWN', test: () => true },
];

export function districtAt(x, z) {
  for (const d of DISTRICTS) {
    if (d.test(x, z)) return d.name;
  }
  return 'DOWNTOWN';
}

// The word the location line carries next to the district, by heat.
export function heatWord(wanted) {
  if (wanted <= 0) return 'CALM';
  if (wanted <= 2) return 'WARM';
  if (wanted <= 4) return 'MOST WANTED';
  return 'LOCKDOWN';
}

export function formatCash(cash) {
  return '$' + Math.floor(cash).toLocaleString('en-US');
}

export function formatClock(minutes) {
  const total = Math.floor(minutes);
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function formatTimer(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  return 'TIME ' + Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
}
