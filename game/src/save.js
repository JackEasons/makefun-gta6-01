// Saves live in localStorage under one key, in the same shape the game
// has always written: cash, jobs done, position, health, respect, armour,
// day, clock and ammo. Old saves load straight into the new build.
import { SAVE_KEY } from './config.js';

function storage() {
  try {
    return window.localStorage;
  } catch (e) {
    return null;
  }
}

export function saveGame(G) {
  const store = storage();
  if (!store) return false;
  const data = {
    cash: Math.floor(G.stats.cash),
    missionsDone: G.missions.index,
    playerX: Math.round(G.player.x * 10) / 10,
    playerZ: Math.round(G.player.z * 10) / 10,
    heading: Math.round(G.player.heading * 100) / 100,
    health: Math.round(G.stats.health),
    respect: Math.round(G.stats.respect),
    armour: Math.round(G.stats.armour),
    day: G.stats.day,
    clockMinutes: Math.round(G.stats.clockMinutes * 100) / 100,
    ammo: [null, G.weapons.list[1].ammo, G.weapons.list[2].ammo, G.weapons.list[3].ammo],
    savedAt: Date.now(),
  };
  try {
    store.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadSave() {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data !== 'object' || data === null) return null;
    if (typeof data.cash !== 'number') return null;
    return data;
  } catch (e) {
    return null;
  }
}

export function hasSave() {
  return loadSave() !== null;
}

export function applySave(G, data) {
  G.stats.cash = data.cash || 0;
  G.missions.index = Math.max(0, Math.min(3, data.missionsDone || 0));
  G.player.x = typeof data.playerX === 'number' ? data.playerX : G.player.x;
  G.player.z = typeof data.playerZ === 'number' ? data.playerZ : G.player.z;
  G.player.heading = typeof data.heading === 'number' ? data.heading : 0;
  G.stats.health = typeof data.health === 'number' ? data.health : 100;
  G.stats.respect = typeof data.respect === 'number' ? data.respect : 0;
  G.stats.armour = typeof data.armour === 'number' ? data.armour : 0;
  G.stats.day = typeof data.day === 'number' ? data.day : 1;
  G.stats.clockMinutes = typeof data.clockMinutes === 'number' ? data.clockMinutes : 1060;
  if (Array.isArray(data.ammo)) {
    for (let i = 1; i <= 3; i += 1) {
      if (typeof data.ammo[i] === 'number') G.weapons.list[i].ammo = data.ammo[i];
    }
  }
  G.player.mesh.position.set(G.player.x, 0, G.player.z);
  G.player.mesh.rotation.y = G.player.heading;
}

export function saveSummary(data) {
  if (!data) return '';
  return 'Saved — Day ' + (data.day || 1) + ' · $' + Math.floor(data.cash || 0).toLocaleString('en-US');
}
