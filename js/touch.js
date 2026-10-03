// Touch Controls — left virtual stick, right swipe look, INTERACT/RUN/PAUSE buttons.
// Auto-hides when physical input is actively used; user can hide/show manually.
export const TouchUI = {
  active: false,       // touch device + touch UI enabled by user
  hiddenByUser: false,
  lastTouchTime: 0,
  stick: { x: 0, y: 0, id: null },
  look: { dx: 0, dy: 0, id: null, lx: 0, ly: 0 },
  runHeld: false,
  interactEdge: false,
  pauseEdge: false,
  els: {},
  init() {
    const $ = (id) => document.getElementById(id);
    this.els = {
      root: $('touch-ui'), base: $('stick-base'), knob: $('stick-knob'),
      zone: $('stick-zone'), look: $('look-zone'),
      btnI: $('btn-interact'), btnR: $('btn-run'), btnP: $('btn-pause-t'),
      hide: $('btn-touch-hide'), show: $('btn-touch-show'),
    };
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.active = isTouch;
    this.hide(true); // Game shows it only while actively playing
    this.els.show.classList.add('hidden');

    // --- stick ---
    const setKnob = (dx, dy) => {
      this.els.knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };
    this.els.zone.addEventListener('touchstart', (e) => {
      e.preventDefault(); this.noteUse();
      const t = e.changedTouches[0];
      this.stick.id = t.identifier; this.moveStick(t);
    }, { passive: false });
    this.els.zone.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === this.stick.id) this.moveStick(t);
    }, { passive: false });
    const endStick = (e) => {
      for (const t of e.changedTouches) if (t.identifier === this.stick.id) {
        this.stick.id = null; this.stick.x = 0; this.stick.y = 0; setKnob(0, 0);
      }
    };
    this.els.zone.addEventListener('touchend', endStick); this.els.zone.addEventListener('touchcancel', endStick);
    this._setKnob = setKnob;

    // --- look swipe ---
    this.els.look.addEventListener('touchstart', (e) => {
      e.preventDefault(); this.noteUse();
      const t = e.changedTouches[0];
      this.look.id = t.identifier; this.look.lx = t.clientX; this.look.ly = t.clientY;
    }, { passive: false });
    this.els.look.addEventListener('touchmove', (e) => {
      e.preventDefault();
      for (const t of e.changedTouches) if (t.identifier === this.look.id) {
        this.look.dx += (t.clientX - this.look.lx) * 0.006;
        this.look.dy += (t.clientY - this.look.ly) * 0.006;
        this.look.lx = t.clientX; this.look.ly = t.clientY;
      }
    }, { passive: false });
    const endLook = (e) => { for (const t of e.changedTouches) if (t.identifier === this.look.id) this.look.id = null; };
    this.els.look.addEventListener('touchend', endLook); this.els.look.addEventListener('touchcancel', endLook);

    // --- buttons ---
    const bind = (el, down, up) => {
      el.addEventListener('touchstart', (e) => { e.preventDefault(); this.noteUse(); el.classList.add('active'); down(); }, { passive: false });
      el.addEventListener('touchend', (e) => { e.preventDefault(); el.classList.remove('active'); if (up) up(); }, { passive: false });
    };
    bind(this.els.btnI, () => { this.interactEdge = true; });
    bind(this.els.btnR, () => { this.runHeld = true; }, () => { this.runHeld = false; });
    bind(this.els.btnP, () => { this.pauseEdge = true; });
    // also allow mouse clicks on buttons (tablets with mice)
    this.els.btnI.addEventListener('click', () => { this.interactEdge = true; });
    this.els.btnR.addEventListener('mousedown', () => { this.runHeld = true; });
    this.els.btnR.addEventListener('mouseup', () => { this.runHeld = false; });
    this.els.btnP.addEventListener('click', () => { this.pauseEdge = true; });

    this.els.hide.addEventListener('click', () => this.hide());
    this.els.show.addEventListener('click', () => { this.hiddenByUser = false; this.show(); });
    this.updateRotateMsg();
    window.addEventListener('resize', () => this.updateRotateMsg());
    window.addEventListener('orientationchange', () => setTimeout(() => this.updateRotateMsg(), 200));
  },
  moveStick(t) {
    const r = this.els.base.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    let dx = t.clientX - cx, dy = t.clientY - cy;
    const max = r.width / 2;
    const len = Math.hypot(dx, dy);
    if (len > max) { dx = dx / len * max; dy = dy / len * max; }
    this._setKnob(dx, dy);
    this.stick.x = dx / max; this.stick.y = dy / max;
  },
  noteUse() { this.lastTouchTime = performance.now(); },
  show() {
    if (this.hiddenByUser) return;
    this.els.root.classList.remove('hidden');
    this.els.show.classList.add('hidden');
  },
  hide(silent) {
    this.els.root.classList.add('hidden');
    if (!silent) { this.hiddenByUser = true; this.els.show.classList.remove('hidden'); }
  },
  // called by Input when keyboard/gamepad is actively used
  autoHideCheck(activePhysical) {
    if (activePhysical && !this.els.root.classList.contains('hidden')) {
      // don't fully hide; keep available but fade? Spec: disappear automatically.
      // We hide after sustained physical use; user can re-show with 🎮 button.
      this._physTime = (this._physTime || 0) + 1;
      if (this._physTime > 240) { this.hide(); this._physTime = 0; }
    } else this._physTime = 0;
  },
  updateRotateMsg() {
    const el = document.getElementById('rotate-msg');
    const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    const portrait = window.innerHeight > window.innerWidth;
    if (isTouch && portrait) el.classList.remove('hidden'); else el.classList.add('hidden');
  },
  consumeLook() { const d = { dx: this.look.dx, dy: this.look.dy }; this.look.dx = 0; this.look.dy = 0; return d; },
};
