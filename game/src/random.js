// Solmar Bay — a tiny seeded random generator so the city, traffic and
// screenshot scenes are the same every time a seed is given.
// sfc32: four 32-bit words of state, a small counter, good enough for a game
// world and far cheaper than pulling in a library for it.

export function makeRng(seed) {
  let a = seed >>> 0;
  let b = (seed ^ 0x9e3779b9) >>> 0;
  let c = (seed * 2654435761) >>> 0;
  let d = (seed ^ 0x85ebca6b) >>> 0;
  let counter = 0;
  return function next() {
    const t = (a + b + counter) >>> 0;
    counter = (counter + 1) >>> 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) >>> 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) >>> 0;
    const out = (t + d) >>> 0;
    return out / 4294967296;
  };
}

export function range(rng, min, max) {
  return min + rng() * (max - min);
}

export function rangeInt(rng, min, max) {
  return Math.floor(range(rng, min, max + 1));
}

export function pick(rng, list) {
  return list[Math.floor(rng() * list.length)];
}

// A one-in-p chance, for the little dice rolls scattered through the game.
export function chance(rng, p) {
  return rng() < p;
}

export function shuffle(rng, list) {
  const out = list.slice();
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = out[i];
    out[i] = out[j];
    out[j] = tmp;
  }
  return out;
}

// A cheap hash of a string, for turning a scene name into a seed.
export function hashSeed(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
