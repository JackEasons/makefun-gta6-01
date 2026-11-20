// Keyboard and mouse-drag input for Solmar Bay. Keys are held in a set;
// edge-triggered actions (fire, enter car, next job) are consumed once per
// press through `pressed()`, so holding a key never repeats the action.
export function createInput() {
  const keys = new Set();
  const justPressed = new Set();
  let dragYaw = 0;
  let dragging = false;
  let lastX = 0;

  window.addEventListener('keydown', (e) => {
    if (e.code === 'Tab') e.preventDefault();
    if (e.code === 'Space') e.preventDefault();
    if (!e.repeat) {
      keys.add(e.code);
      justPressed.add(e.code);
    }
  });

  window.addEventListener('keyup', (e) => {
    keys.delete(e.code);
  });

  window.addEventListener('blur', () => {
    keys.clear();
  });

  const canvasHost = document.getElementById('game');
  canvasHost.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragYaw += (e.clientX - lastX) * 0.005;
    lastX = e.clientX;
  });

  return {
    down(code) {
      return keys.has(code);
    },
    // True once per physical press; the flag clears when read.
    pressed(code) {
      if (justPressed.has(code)) {
        justPressed.delete(code);
        return true;
      }
      return false;
    },
    // Mouse-drag yaw accumulated since the last read, in radians.
    takeDragYaw() {
      const d = dragYaw;
      dragYaw = 0;
      return d;
    },
    // Movement intent on the camera plane: x is strafe, z is forward.
    moveVector() {
      let x = 0;
      let z = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      const len = Math.hypot(x, z);
      if (len > 0) {
        x /= len;
        z /= len;
      }
      return { x, z };
    },
    running() {
      return keys.has('ShiftLeft') || keys.has('ShiftRight');
    },
    clearPressed() {
      justPressed.clear();
    },
  };
}
