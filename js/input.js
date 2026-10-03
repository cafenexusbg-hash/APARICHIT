// Input Manager — unified abstract actions: MOVE, LOOK, INTERACT, RUN, PAUSE.
// Gameplay code never touches keyboard/gamepad/touch directly.
import { GamepadMgr } from './gamepad.js';
import { TouchUI } from './touch.js';

export const Input = {
  keys: {},
  lookDX: 0, lookDY: 0,
  interactEdge: false, pauseEdge: false, cancelEdge: false,
  mouseLocked: false,
  lastPhysicalTime: 0,
  usingPhysical: false,
  init(canvas, callbacks) {
    this.cb = callbacks || {};
    window.__input = this; // debug/automation handle
    TouchUI.init();
    GamepadMgr.init((connected, id) => {
      const hint = document.getElementById('gamepad-hint');
      if (connected) {
        hint.textContent = '🎮 Gamepad connected — Left stick move · Right stick camera · A interact · Start pause';
        hint.classList.remove('hidden');
        setTimeout(() => hint.classList.add('hidden'), 6000);
      }
      if (this.cb.onGamepad) this.cb.onGamepad(connected, id);
    });

    window.addEventListener('keydown', (e) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code)) e.preventDefault();
      if (!this.keys[e.code]) {
        if (e.code === 'KeyE' || e.code === 'Enter' || e.code === 'Space') this.interactEdge = true;
        if (e.code === 'Escape' || e.code === 'KeyP') this.pauseEdge = true;
      }
      this.keys[e.code] = true;
      this.notePhysical();
      TouchUI.autoHideCheck(true);
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    window.addEventListener('blur', () => { this.keys = {}; TouchUI.runHeld = false; });

    // Mouse look: pointer lock on click + drag fallback
    canvas.addEventListener('click', () => {
      if (!this.mouseLocked && !TouchUI || true) {
        try { if (document.pointerLockElement !== canvas && window.matchMedia('(pointer:fine)').matches) canvas.requestPointerLock(); } catch {}
      }
      if (this.cb.onCanvasClick) this.cb.onCanvasClick();
    });
    document.addEventListener('pointerlockchange', () => {
      this.mouseLocked = document.pointerLockElement === canvas;
    });
    document.addEventListener('mousemove', (e) => {
      if (this.mouseLocked) {
        this.lookDX += (e.movementX || 0) * 0.0026;
        this.lookDY += (e.movementY || 0) * 0.0026;
        this.notePhysical();
      }
    });
    // drag-look fallback (no pointer lock, e.g. iframe / trackpads)
    let dragging = false, lx = 0, ly = 0;
    canvas.addEventListener('mousedown', (e) => { if (!this.mouseLocked && e.button === 0) { dragging = true; lx = e.clientX; ly = e.clientY; } });
    window.addEventListener('mouseup', () => { dragging = false; });
    window.addEventListener('mousemove', (e) => {
      if (dragging && !this.mouseLocked) {
        this.lookDX += (e.clientX - lx) * 0.004; this.lookDY += (e.clientY - ly) * 0.004;
        lx = e.clientX; ly = e.clientY; this.notePhysical();
      }
    });
  },
  notePhysical() { this.lastPhysicalTime = performance.now(); this.usingPhysical = true; },
  // polled once per frame by Game
  frame() {
    const gp = GamepadMgr.poll();
    let mx = 0, mz = 0;
    const k = this.keys;
    if (k['KeyW'] || k['ArrowUp']) mz -= 1;
    if (k['KeyS'] || k['ArrowDown']) mz += 1;
    if (k['KeyA'] || k['ArrowLeft']) mx -= 1;
    if (k['KeyD'] || k['ArrowRight']) mx += 1;
    if (mx || mz) this.notePhysical();
    if (gp && (Math.abs(gp.moveX) > 0 || Math.abs(gp.moveY) > 0)) { mx = gp.moveX; mz = gp.moveY; this.notePhysical(); }
    if (Math.abs(TouchUI.stick.x) > 0.05 || Math.abs(TouchUI.stick.y) > 0.05) { mx = TouchUI.stick.x; mz = TouchUI.stick.y; }
    const l = Math.hypot(mx, mz);
    if (l > 1) { mx /= l; mz /= l; }

    let ldx = this.lookDX, ldy = this.lookDY;
    this.lookDX = 0; this.lookDY = 0;
    if (gp && (gp.lookX || gp.lookY)) { ldx += gp.lookX * 0.055; ldy += gp.lookY * 0.055; this.notePhysical(); }
    const tl = TouchUI.consumeLook(); ldx += tl.dx; ldy += tl.dy;

    const run = !!(k['ShiftLeft'] || k['ShiftRight'] || (gp && gp.run) || TouchUI.runHeld);
    if (run && (mx || mz)) this.notePhysical();

    const interact = this.interactEdge || (gp && gp.interactEdge) || TouchUI.interactEdge;
    const pause = this.pauseEdge || (gp && gp.pauseEdge) || TouchUI.pauseEdge;
    const cancel = this.cancelEdge || (gp && gp.cancelEdge);
    this.interactEdge = false; this.pauseEdge = false; this.cancelEdge = false;
    TouchUI.interactEdge = false; TouchUI.pauseEdge = false;
    if (interact || pause) this.notePhysical();
    TouchUI.autoHideCheck(this.usingPhysical && performance.now() - TouchUI.lastTouchTime > 8000);
    if (performance.now() - this.lastPhysicalTime > 9000) this.usingPhysical = false;

    return { moveX: mx, moveZ: mz, lookDX: ldx, lookDY: ldy, run, interact, pause, cancel };
  },
  exitLock() { try { if (document.pointerLockElement) document.exitPointerLock(); } catch {} }
};
