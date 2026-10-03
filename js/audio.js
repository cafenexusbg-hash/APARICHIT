// Audio System — all procedural WebAudio, no assets. Calm morning -> subtle unease via ORDER.
export const AudioSys = {
  ctx: null, master: null, musicGain: null, ambientGain: null, heartGain: null,
  muted: false, alarmTimer: null, heartTimer: null, started: false, droneOsc: [],
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 0.9;
    this.master.connect(this.ctx.destination);
    this.musicGain = this.ctx.createGain(); this.musicGain.gain.value = 0.0; this.musicGain.connect(this.master);
    this.ambientGain = this.ctx.createGain(); this.ambientGain.gain.value = 0.0; this.ambientGain.connect(this.master);
    this.heartGain = this.ctx.createGain(); this.heartGain.gain.value = 0.0; this.heartGain.connect(this.master);
    this.started = true;
    this.startAmbient(); this.startDrone(); this.startHeartbeat();
  },
  setMuted(m) { this.muted = m; if (this.master && this.ctx) this.master.gain.setTargetAtTime(m ? 0 : 0.9, this.ctx.currentTime, 0.05); },
  now() { return this.ctx ? this.ctx.currentTime : 0; },
  // --- alarm clock: harsh square beeps ---
  alarm(on) {
    if (!this.ctx) return;
    if (on) {
      if (this.alarmTimer) return;
      const beep = () => {
        if (!this.ctx) return;
        const o = this.ctx.createOscillator(), g = this.ctx.createGain();
        o.type = 'square'; o.frequency.value = 1560;
        g.gain.setValueAtTime(0.0001, this.now());
        g.gain.exponentialRampToValueAtTime(0.25, this.now() + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, this.now() + 0.28);
        o.connect(g); g.connect(this.master); o.start(); o.stop(this.now() + 0.3);
      };
      beep(); this.alarmTimer = setInterval(beep, 450);
    } else { clearInterval(this.alarmTimer); this.alarmTimer = null; }
  },
  blip(freq = 660, dur = 0.12, vol = 0.15) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, this.now()); g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dur);
    o.connect(g); g.connect(this.master); o.start(); o.stop(this.now() + dur + 0.02);
  },
  thud() { // heartbeat
    if (!this.ctx) return;
    for (const dt of [0, 0.18]) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(72, this.now() + dt);
      o.frequency.exponentialRampToValueAtTime(38, this.now() + dt + 0.14);
      g.gain.setValueAtTime(0.0001, this.now() + dt);
      g.gain.exponentialRampToValueAtTime(0.5, this.now() + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, this.now() + dt + 0.16);
      o.connect(g); g.connect(this.heartGain); o.start(this.now() + dt); o.stop(this.now() + dt + 0.2);
    }
  },
  startHeartbeat() {
    const loop = () => {
      const order = window.__ORDER || 0; // 0..100
      if (order > 8) { this.thud(); }
      const interval = order > 60 ? 750 : order > 30 ? 1000 : 1400;
      this.heartTimer = setTimeout(loop, interval);
    }; loop();
  },
  setOrderLevel(v) { // v 0..100 — subtle, never horror
    if (!this.ctx) return;
    const t = this.now(), n = Math.min(100, Math.max(0, v)) / 100;
    this.heartGain.gain.setTargetAtTime(0.05 + n * 0.5, t, 0.8);
    this.musicGain.gain.setTargetAtTime(0.05 + n * 0.10, t, 1.2);
    // drone detune rises slightly with disorder
    this.droneOsc.forEach((o, i) => { try { o.detune.setTargetAtTime(i === 1 ? n * 28 : 0, t, 1.0); } catch {} });
    const vg = document.getElementById('vignette');
    if (vg) vg.style.opacity = (n * 0.55).toFixed(2);
  },
  startAmbient() { // soft morning birds + room tone (filtered noise + chirps)
    if (!this.ctx) return;
    const len = 2 * this.ctx.sampleRate;
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.4;
    const src = this.ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.05;
    src.connect(f); f.connect(g); g.connect(this.ambientGain); src.start();
    this.ambientGain.gain.setTargetAtTime(0.5, this.now(), 2);
    const chirp = () => {
      if (!this.muted && Math.random() < 0.7) {
        const o = this.ctx.createOscillator(), gg = this.ctx.createGain();
        o.type = 'sine';
        const f0 = 2400 + Math.random() * 1600;
        o.frequency.setValueAtTime(f0, this.now());
        o.frequency.exponentialRampToValueAtTime(f0 * (0.7 + Math.random() * 0.6), this.now() + 0.12);
        gg.gain.setValueAtTime(0.03, this.now());
        gg.gain.exponentialRampToValueAtTime(0.0001, this.now() + 0.18);
        o.connect(gg); gg.connect(this.master); o.start(); o.stop(this.now() + 0.2);
      }
      setTimeout(chirp, 1800 + Math.random() * 4200);
    }; setTimeout(chirp, 2500);
  },
  startDrone() { // warm tanpura-like pad: Sa + Pa, calm
    if (!this.ctx) return;
    const freqs = [110, 165];
    freqs.forEach((fr, i) => {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = fr;
      f.type = 'lowpass'; f.frequency.value = 500;
      g.gain.value = i === 0 ? 0.035 : 0.022;
      o.connect(f); f.connect(g); g.connect(this.musicGain); o.start();
      this.droneOsc.push(o);
    });
    this.musicGain.gain.setTargetAtTime(0.06, this.now(), 3);
  }
};
