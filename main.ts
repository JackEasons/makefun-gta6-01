// Solmar Bay — the entrypoint (Node 22, standard library only). It hands the
// game in: copies game/ and screenshots/ from beside this file to /output and
// writes /output/dossier.json, the summary the judge reads, with the vendored
// make.fun library. The game itself is plain static files a desktop browser
// loads offline (game/index.html, its ES modules and a vendored three.js
// module build under game/vendor/), so there is no build step here — just a
// faithful copy and a byte-exact dossier.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function countEntries(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += 1;
    if (entry.isDirectory()) total += countEntries(join(dir, entry.name));
  }
  return total;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files in game/ or 48 MiB of
// game files, in all, or a path under game/ over 1000 bytes: game/ counts
// beside /output's own 1000-entry cap, its screenshots/ and dossier.json).
const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), dossier);

// Round 3: refuse to hand in a dossier the gate would refuse — a shot
// over the 256 KiB cap fails the whole entry, so catch it here.
for (const n of readdirSync(join(out, 'screenshots')).filter((x) => !x.startsWith('.'))) {
  const bytes = statSync(join(out, 'screenshots', n)).size;
  if (bytes > 262144) throw new Error(`screenshot ${n} is ${bytes} bytes, over the 256 KiB cap`);
}

// A short build summary on stdout, so a human running it sees what went in.
// Screenshot sizes are printed too: the gate caps each one at 256 KiB, and
// a size here that creeps over the cap is the first thing to catch. The
// biggest game file is printed as well: the dossier shows sources up to its
// 160 KiB text cap, so a file that grows past it is worth knowing about.
const shotNames = readdirSync(join(out, 'screenshots')).filter((n) => !n.startsWith('.'));
// The gate wants 3 or 4 screenshots: fewer shows too little of the game,
// more is refused outright.
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
const shotSizes = shotNames
  .map((n) => `${n} ${Math.round(statSync(join(out, 'screenshots', n)).size / 1024)} KiB`)
  .join(', ');
console.log(
  `Solmar Bay: ${countEntries(join(out, 'game'))} game files, ` +
  `${shotNames.length} screenshots (${shotSizes}), ` +
  `dossier ${statSync(join(out, 'dossier.json')).size} bytes -> ${out}`,
);
const gameFiles = readdirSync(join(out, 'game', 'src')).filter((n) => n.endsWith('.js'));
const biggest = gameFiles
  .map((n) => ({ name: n, size: statSync(join(out, 'game', 'src', n)).size }))
  .sort((a, b) => b.size - a.size)[0];
if (biggest) console.log(`Largest game source: game/src/${biggest.name} (${biggest.size} bytes).`);
// The gate caps game/index.html at 1 MiB; it is small, but print it so a
// regression shows up here instead of in a failed check.
console.log(`game/index.html: ${statSync(join(out, 'game', 'index.html')).size} bytes.`);
