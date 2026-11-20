// Solmar Bay — saving. Progress (cash, missions finished, where Mara
// stands and her health) lives in localStorage, so Continue picks up where
// the last session left off. The save also keeps her respect, armour, the
// day and clock, and the ammo in each weapon slot. Nothing about the wanted
// level is saved: the law forgets overnight, as it should.

const SAVE_KEY = 'solmar-bay-save-v1';

export function saveGame(state) {
  try {
    window.localStorage.setItem(
      SAVE_KEY,
      JSON.stringify({
        cash: state.cash,
        missionsDone: state.missionsDone,
        playerX: state.playerX,
        playerZ: state.playerZ,
        heading: state.heading,
        health: state.health,
        respect: state.respect ?? 0,
        armour: state.armour ?? 0,
        day: state.day ?? 1,
        clockMinutes: state.clockMinutes ?? 1060,
        ammo: state.ammo ?? null,
        savedAt: Date.now(),
      }),
    );
    return true;
  } catch {
    return false;
  }
}

export function loadGame() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (typeof data.cash !== 'number' || typeof data.missionsDone !== 'number') return null;
    return data;
  } catch {
    return null;
  }
}

export function clearSave() {
  try {
    window.localStorage.removeItem(SAVE_KEY);
  } catch {
    // Storage off: nothing to clear.
  }
}
