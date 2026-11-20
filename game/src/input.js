// Solmar Bay — keyboard and mouse input.
// Held keys are read every frame; one-shot presses (enter car, punch, pause,
// mute) are queued and taken once by the loop, so a press between two frames
// is never lost and never counted twice. Mouse drag orbits the camera.

export const ACTION_ENTER = 1;
export const ACTION_PUNCH = 2;
export const ACTION_PAUSE = 4;
export const ACTION_MUTE = 8;
export const ACTION_MISSION = 16;
export const ACTION_WEAPON = 32;
export const ACTION_RADIO = 64;

const ENTER_KEYS = new Set(['KeyE']);
const PUNCH_KEYS = new Set(['KeyF', 'MouseLeft']);
const PAUSE_KEYS = new Set(['KeyP', 'Escape']);
const MUTE_KEYS = new Set(['KeyM']);
const MISSION_KEYS = new Set(['KeyM']); // M is mute; missions advance with Tab
const TAB_KEYS = new Set(['Tab']);
const WEAPON_KEYS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4']);
const RADIO_KEYS = new Set(['KeyR']);

export function createInput(canvas) {
  const held = new Set();
  let actions = 0;
  let weaponKey = 0; // last digit key pressed (1-4), taken once
  let radioKey = false;
  let mouseDX = 0;
  let mouseDY = 0;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Tab') event.preventDefault();
    if (event.repeat) return;
    held.add(event.code);
    if (ENTER_KEYS.has(event.code)) actions |= ACTION_ENTER;
    else if (PUNCH_KEYS.has(event.code)) actions |= ACTION_PUNCH;
    else if (PAUSE_KEYS.has(event.code)) actions |= ACTION_PAUSE;
    else if (MUTE_KEYS.has(event.code)) actions |= ACTION_MUTE;
    else if (TAB_KEYS.has(event.code)) actions |= ACTION_MISSION;
    else if (WEAPON_KEYS.has(event.code)) weaponKey = Number(event.code.slice(-1));
    else if (RADIO_KEYS.has(event.code)) radioKey = true;
  });
  window.addEventListener('keyup', (event) => {
    held.delete(event.code);
  });
  window.addEventListener('blur', () => {
    held.clear();
    dragging = false;
  });

  canvas.addEventListener('pointerdown', (event) => {
    if (event.button === 0) {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      canvas.setPointerCapture(event.pointerId);
    }
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!dragging) return;
    mouseDX += event.clientX - lastX;
    mouseDY += event.clientY - lastY;
    lastX = event.clientX;
    lastY = event.clientY;
  });
  canvas.addEventListener('pointerup', () => {
    dragging = false;
  });
  canvas.addEventListener('pointercancel', () => {
    dragging = false;
  });

  return {
    isHeld(code) {
      return held.has(code);
    },
    forward() {
      return (held.has('KeyW') || held.has('ArrowUp') ? 1 : 0) - (held.has('KeyS') || held.has('ArrowDown') ? 1 : 0);
    },
    strafe() {
      return (held.has('KeyD') || held.has('ArrowRight') ? 1 : 0) - (held.has('KeyA') || held.has('ArrowLeft') ? 1 : 0);
    },
    running() {
      return held.has('ShiftLeft') || held.has('ShiftRight');
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    // The last weapon digit pressed (1-4), or 0 when none was pressed.
    takeWeapon() {
      const taken = weaponKey;
      weaponKey = 0;
      return taken;
    },
    // True once when R was pressed: change the radio station.
    takeRadio() {
      const taken = radioKey;
      radioKey = false;
      return taken;
    },
    // Pixels of mouse drag since the last call; the camera consumes these.
    takeMouse() {
      const dx = mouseDX;
      const dy = mouseDY;
      mouseDX = 0;
      mouseDY = 0;
      return { dx, dy };
    },
  };
}
