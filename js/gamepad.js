// Gamepad Manager — standard Gamepad API, brand-agnostic (Xbox/PlayStation style).
// Exposes normalized state; Input Manager consumes it as abstract actions.
export const GamepadMgr = {
  connected: false, id: '', prevButtons: [],
  _onConnect: null, _onDisconnect: null,
  init(onChange) {
    this._onChange = onChange;
    window.addEventListener('gamepadconnected', (e) => {
      this.connected = true; this.id = e.gamepad.id || 'gamepad';
      this.prevButtons = [];
      if (this._onChange) this._onChange(true, this.id);
    });
    window.addEventListener('gamepaddisconnected', () => {
      this.connected = false; this.id = '';
      if (this._onChange) this._onChange(false, '');
    });
  },
  pad() {
    try {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads) if (p && p.connected) return p;
    } catch {}
    return null;
  },
  // normalized snapshot
  poll() {
    const p = this.pad();
    if (!p) { this.connected = false; return null; }
    if (!this.connected) { this.connected = true; if (this._onChange) this._onChange(true, p.id); }
    const dz = (v) => Math.abs(v) < 0.16 ? 0 : v;
    const b = (i) => !!(p.buttons[i] && p.buttons[i].pressed);
    const edge = (i) => {
      const cur = b(i);
      const was = !!this.prevButtons[i];
      this.prevButtons[i] = cur;
      return cur && !was;
    };
    const s = {
      moveX: dz(p.axes[0] || 0),
      moveY: dz(p.axes[1] || 0),
      lookX: dz(p.axes[2] || 0),
      lookY: dz(p.axes[3] || 0),
      run: b(10) || b(5),                 // L3 click or LB to run
      interactEdge: edge(0),              // A / Cross
      cancelEdge: edge(1),                // B / Circle
      pauseEdge: edge(9),                 // Start / Options
      anyActive: false,
    };
    // D-pad as move fallback
    if (b(14)) s.moveX = -1; if (b(15)) s.moveX = 1;
    if (b(12)) s.moveY = -1; if (b(13)) s.moveY = 1;
    s.anyActive = Math.abs(s.moveX) > 0 || Math.abs(s.moveY) > 0 || Math.abs(s.lookX) > 0 || Math.abs(s.lookY) > 0 || s.run;
    return s;
  },
  consumeEdges() { /* edges consumed inside poll */ }
};
