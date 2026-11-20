// Solmar Bay — A Sunset Hustle. Hands the game in: copies game/ and
// screenshots/ beside this file into /output (or MAKEFUN_OUTPUT_DIR) and
// writes /output/dossier.json with the vendored make.fun library.
//
// The guards run first: the scorer refuses more than four screenshots or
// any one over 256 KiB, so this program refuses to hand in a broken set
// instead of letting the entry die quietly at the gate.
import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const shotDir = join(here, 'screenshots');

const shots = existsSync(shotDir)
  ? readdirSync(shotDir).filter((name) => !name.startsWith('.')).sort()
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error('Solmar Bay needs 3 or 4 screenshots, found ' + shots.length);
}
for (const name of shots) {
  const size = statSync(join(shotDir, name)).size;
  if (size > 262144) {
    throw new Error('screenshot ' + name + ' is ' + size + ' bytes, over the 256 KiB cap');
  }
}

mkdirSync(outDir, { recursive: true });
cpSync(join(here, 'game'), join(outDir, 'game'), { recursive: true });
mkdirSync(join(outDir, 'screenshots'), { recursive: true });
if (existsSync(shotDir)) {
  cpSync(shotDir, join(outDir, 'screenshots'), { recursive: true });
}

writeFileSync(
  join(outDir, 'dossier.json'),
  buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
