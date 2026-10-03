// Scene Manager + Event/Dialogue System + objectives + main loop.
// Gameplay uses only abstract Input actions (MOVE/LOOK/INTERACT/RUN/PAUSE).
import * as THREE from 'three';
import { Quality } from './config.js';
import { UI } from './ui.js';
import { Input } from './input.js';
import { TouchUI } from './touch.js';
import { AudioSys } from './audio.js';
import { SaveSys } from './save.js';
import { Order } from './order.js';
import { PlayerController, CameraController } from './player.js';
import { InteractionSystem } from './interact.js';
import { NPCSystem, TrafficLight } from './npc.js';
import { baseScene, buildHome, buildStreet, buildOffice } from './scenes.js';
import { box, MAT } from './world.js';

const HOME_STEPS = [
  'Turn off the alarm', 'Make the bed', 'Open the wardrobe', 'Select your clothes',
  'Look in the mirror', 'Pick up the newspaper', 'Put on your shoes', 'Leave the house',
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: Quality.antialias, powerPreference: 'high-performance' });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.camera = new THREE.PerspectiveCamera(58, innerWidth / innerHeight, 0.1, 220);
    this.camCtl = new CameraController(this.camera);
    this.interact = new InteractionSystem();
    this.state = 'menu';
    this.paused = false;
    this.scene = null; this.player = null; this.npcs = null;
    this.step = 0; this.level = 'home';
    this.events = {};
    this._expectUnlock = false;
    window.addEventListener('resize', () => this.resize());
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight, false);
  }
  applyQuality() {
    Quality.resolve();
    this.renderer.setPixelRatio(Quality.pixelRatio);
    this.renderer.shadowMap.enabled = Quality.shadows;
    this.renderer.setSize(innerWidth, innerHeight, false);
    if (this.scene?.userData.sun) this.scene.userData.sun.castShadow = Quality.shadows;
  }

  /* ---------- boot / menu ---------- */
  boot() {
    UI.init();
    Input.init(this.canvas, {
      onCanvasClick: () => { AudioSys.init(); },
      onGamepad: () => {},
    });
    window.__toast = (t) => UI.toast(t);
    this.applyQuality();
    UI.el['quality-select'].addEventListener('change', (e) => { Quality.level = e.target.value; this.applyQuality(); });
    UI.el['quality-select-2'].addEventListener('change', (e) => { Quality.level = e.target.value; this.applyQuality(); });
    const mute = (v) => { AudioSys.init(); AudioSys.setMuted(v); UI.el['mute-check'].checked = v; UI.el['mute-check-2'].checked = v; };
    UI.el['mute-check'].addEventListener('change', (e) => mute(e.target.checked));
    UI.el['mute-check-2'].addEventListener('change', (e) => mute(e.target.checked));
    UI.el['btn-start'].addEventListener('click', () => { AudioSys.init(); this.startNew(); });
    UI.el['btn-how'].addEventListener('click', () => UI.el.howto.classList.toggle('hidden'));
    UI.el['btn-resume'].addEventListener('click', () => this.togglePause(false));
    UI.el['btn-restart'].addEventListener('click', () => { this.togglePause(false); this.startNew(); });
    UI.el['btn-quit'].addEventListener('click', () => { this.togglePause(false); this.toMenu(); });
    UI.el['btn-back-menu'].addEventListener('click', () => this.toMenu());
    UI.el['btn-skip'].addEventListener('click', () => { this.introSkip = true; });
    document.addEventListener('pointerlockchange', () => {
      if (document.pointerLockElement !== this.canvas && Input.mouseLocked === false) { /* updated in input */ }
      if (!document.pointerLockElement && this._locked && !this._expectUnlock && (this.state === 'home' || this.state === 'street' || this.state === 'office')) {
        this._locked = false; this.togglePause(true);
      }
      if (document.pointerLockElement) this._locked = true; else this._locked = false;
    });
    if (SaveSys.has()) {
      UI.el['btn-continue'].classList.remove('hidden');
      UI.el['btn-continue'].addEventListener('click', () => { AudioSys.init(); this.continueSave(); });
    }
    // idle menu backdrop: slow orbit over street
    this.loadLevel('street', true);
    this.state = 'menu';
    UI.fade('in', 600);
    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  toMenu() {
    SaveSys.clear();
    UI.el.complete.classList.add('hidden');
    UI.el.menu.classList.remove('hidden');
    UI.showHUD(false);
    this.loadLevel('street', true);
    this.state = 'menu';
  }

  /* ---------- new / continue ---------- */
  async startNew() {
    SaveSys.clear(); Order.reset();
    this.step = 0; this.events = {};
    UI.el.menu.classList.add('hidden');
    UI.el.complete.classList.add('hidden');
    await this.playIntro();
  }
  async continueSave() {
    const d = SaveSys.load();
    Order.reset(); if (d?.order) Order.observe(d.order, null);
    this.events = {};
    UI.el.menu.classList.add('hidden');
    if (d?.scene === 'street') { this.loadLevel('street'); this.state = 'street'; }
    else if (d?.scene === 'office') { this.loadLevel('office'); this.state = 'office'; }
    else await this.playIntro(true);
    UI.showHUD(true);
  }

  /* ---------- intro cinematic ---------- */
  async playIntro(skipHome = false) {
    this.state = 'intro';
    this.loadLevel('home');
    UI.showHUD(false);
    UI.el.intro.classList.remove('hidden');
    UI.el['intro-text'].textContent = 'APARICHIT';
    UI.el['intro-text'].style.animation = 'none'; void UI.el['intro-text'].offsetWidth;
    UI.el['intro-text'].style.animation = '';
    UI.el['intro-sub'].classList.add('hidden');
    this.introSkip = false;
    await this.wait(2200, () => this.introSkip);
    if (this.introSkip) { this.endIntro(); return; }
    UI.el['intro-text'].textContent = 'CHAPTER 1 — AMBI';
    UI.el['intro-text'].style.fontSize = 'clamp(22px,5vw,44px)';
    await this.wait(2200, () => this.introSkip);
    UI.el.intro.classList.add('hidden');
    UI.el['intro-text'].style.fontSize = '';
    if (this.introSkip) { this.endIntro(); return; }
    // slow push through the quiet house
    UI.sceneLabel('5:59 AM — Ambi\'s home');
    this.cine = { t: 0, dur: 10, from: new THREE.Vector3(5.5, 2.0, 4.2), to: new THREE.Vector3(-3.4, 1.9, -1.4), lookFrom: new THREE.Vector3(0, 1, 0), lookTo: new THREE.Vector3(-5.6, 0.8, -3.6) };
    this.cineActive = true;
    await this.wait(0, () => this.introSkip || !this.cineActive);
    this.endIntro();
  }
  endIntro() {
    this.cineActive = false;
    UI.el.intro.classList.add('hidden');
    this.state = 'home';
    this.player.place(this.homeCtx.spawn.x, this.homeCtx.spawn.z, this.homeCtx.spawn.yaw);
    this.camCtl.yaw = Math.PI; this.camCtl.pitch = 0.30;
    this.camCtl.snap(this.player.pos, this.player.colliders, 3.0);
    UI.showHUD(true);
    AudioSys.alarm(true);
    UI.subtitle('⏰ 6:00 AM. The alarm rings.', 3200);
    UI.toast('Find the alarm clock');
  }
  wait(ms, cancelFn) {
    return new Promise((res) => {
      if (!ms) { const c = setInterval(() => { if (cancelFn()) { clearInterval(c); res(); } }, 100); return; }
      const t0 = performance.now();
      const c = setInterval(() => {
        if ((cancelFn && cancelFn()) || performance.now() - t0 > ms) { clearInterval(c); res(); }
      }, 100);
    });
  }

  /* ---------- level loading ---------- */
  loadLevel(name, menuBackdrop = false) {
    this.level = name;
    this.interact.clear();
    if (this.npcs) this.npcs.clear();
    const scene = baseScene();
    this.scene = scene;
    if (name === 'home') {
      scene.background.set(0x2a2620); scene.fog = null;
      this.homeCtx = buildHome(scene);
      this.player = new PlayerController(scene, this.homeCtx.colliders);
      this.player.place(this.homeCtx.spawn.x, this.homeCtx.spawn.z, this.homeCtx.spawn.yaw);
      // sleeping pose until intro ends: lay Ambi on bed
      this.setupHomeInteractions();
    this.camCtl.yaw = Math.PI; this.camCtl.pitch = 0.30;
      if (!menuBackdrop) UI.sceneLabel("AMBI'S HOME — 6:00 AM");
    } else if (name === 'street') {
      const ctx = buildStreet(scene, Quality.npcScale);
      this.streetCtx = ctx;
      this.player = new PlayerController(scene, ctx.colliders);
      this.player.setFormal();
      this.player.place(ctx.spawn.x, ctx.spawn.z, ctx.spawn.yaw);
      this.npcs = new NPCSystem(scene, Quality);
      this.setupStreetLife(menuBackdrop);
      this.camCtl.yaw = 0; this.camCtl.pitch = 0.34;
      if (!menuBackdrop) { UI.sceneLabel('THE STREET — 8:10 AM'); UI.setObjective('WALK TO WORK', 'Reach the law office at the end of the street'); }
    } else if (name === 'office') {
      scene.background.set(0x3a3f4a); scene.fog = null;
      const ctx = buildOffice(scene);
      this.officeCtx = ctx;
      this.player = new PlayerController(scene, ctx.colliders);
      this.player.setFormal();
      this.player.place(ctx.spawn.x, ctx.spawn.z, ctx.spawn.yaw);
      this.npcs = new NPCSystem(scene, Quality);
      this.setupOfficeLife();
      this.camCtl.yaw = Math.PI * 0.8; this.camCtl.pitch = 0.34;
      UI.sceneLabel('LAW OFFICE — 9:00 AM');
      UI.setObjective('LAW OFFICE', 'Reach your desk');
    }
    this.applyQuality();
    this.resize();
    this.camCtl.snap(this.player.pos, this.player.colliders, 3.0);
  }

  /* ---------- home interactions ---------- */
  setupHomeInteractions() {
    const I = this.interact, D = this.homeCtx.dyn;
    const stepIs = (n) => this.step === n && this.state === 'home';
    const adv = () => {
      AudioSys.blip(720, 0.15, 0.18);
      this.step++;
      SaveSys.write({ scene: 'home', step: this.step, order: Order.value });
      if (this.step < 8) { UI.setObjective('MORNING ROUTINE', HOME_STEPS[this.step], this.step + 1, 8); this.setupHomeInteractions(); }
    };
    I.clear();
    if (this.step === 0) {
      UI.setObjective('MORNING ROUTINE', HOME_STEPS[0], 1, 8);
      I.add({ id: 'alarm', x: -4.0, z: -4.6, r: 2.0, label: 'Turn off alarm', action: () => {
        AudioSys.alarm(false); D.alarmFace.material.color.setHex(0x223322);
        UI.subtitle('Alarm off. <b>6:00 AM</b> — exactly on time.', 2800); adv();
      }});
    }
    if (this.step === 1) I.add({ id: 'bed', x: -5.0, z: -2.4, r: 2.2, label: 'Make the bed', action: () => {
      D.blanket.rotation.y = 0; D.blanket.position.set(0, 0.62, 0.35);
      UI.subtitle('The bed is made. Corners aligned, creases smoothed.', 3000); adv();
    }});
    if (this.step === 2) I.add({ id: 'ward', x: -2.2, z: -4.4, r: 2.0, label: 'Open wardrobe', action: () => {
      D.wardDoor.position.x = -0.75; D.wardDoor.rotation.y = 0.9;
      UI.subtitle('Shirts sorted by colour. Trousers by shade.', 2800); adv();
    }});
    if (this.step === 3) I.add({ id: 'clothes', x: -2.2, z: -4.4, r: 2.0, label: 'Select clothes', action: () => {
      this.player.setFormal();
      UI.subtitle('White shirt. Brown trousers. As always.', 3000); adv();
    }});
    if (this.step === 4) I.add({ id: 'mirror', x: -1.4, z: -2.2, r: 1.8, label: 'Look in mirror', action: () => {
      UI.subtitle('Hair combed. Appearance correct.', 2800); adv();
    }});
    if (this.step === 5) I.add({ id: 'news', x: -2.5, z: 1.9, r: 2.0, label: 'Pick up newspaper', action: () => {
      this.scene.remove(D.news);
      UI.subtitle('<b>HEADLINES:</b> “City council debates new traffic fines…”', 3600); adv();
    }});
    if (this.step === 6) I.add({ id: 'shoes', x: 4.3, z: 4.4, r: 2.0, label: 'Put on shoes', action: () => {
      UI.subtitle('Shoes polished. Laces double-knotted.', 2800); adv();
    }});
    if (this.step === 7) I.add({ id: 'door', x: 5.6, z: 4.6, r: 2.2, label: 'Leave the house', action: () => this.exitHome() });
    // flavor (always available, never advances routine)
    if (!I.items.find(i => i.id === 'kitchen'))
      I.add({ id: 'kitchen', x: 5.6, z: -4.2, r: 1.8, label: 'Check kitchen', action: () => {
        UI.subtitle('Vessels washed. Lids aligned. Everything in its place.', 2600); AudioSys.blip(520, 0.1, 0.12);
      }});
    if (!I.items.find(i => i.id === 'books'))
      I.add({ id: 'books', x: -6.9, z: -1.5, r: 1.8, label: 'Look at books', action: () => {
        UI.subtitle('Law books, dusted yesterday. Spines perfectly straight.', 2600); AudioSys.blip(520, 0.1, 0.12);
      }});
  }
  async exitHome() {
    this.state = 'leaving';
    UI.prompt(null); UI.subtitle(null);
    D_ref(this.homeCtx).frontDoor.rotation.y = -1.2;
    AudioSys.blip(440, 0.2, 0.15);
    UI.subtitle('Tiffin packed. Keys, wallet, handkerchief — checked twice.', 2600);
    await UI.fade('out', 900);
    SaveSys.write({ scene: 'street', step: 0, order: Order.value });
    this.loadLevel('street');
    this.state = 'street';
    UI.showHUD(true);
    await UI.fade('in', 900);
    UI.toast('Follow the footpath. Reach the office.');
  }

  /* ---------- street life ---------- */
  setupStreetLife(backdrop = false) {
    const N = this.npcs, S = this.scene;
    const count = Quality.resolved === 'low' ? 0.5 : 1;
    // pedestrians on sidewalks
    const mkPath = (x, z0, z1) => [[x, z0], [x, z1]];
    if (count >= 1 || backdrop) {
      N.addPed(mkPath(-5.2, 0, 120), 1.2, { shirt: 0x7a4a8c, pants: 0x333340 });
      N.addPed(mkPath(5.2, 120, 0), 1.0, { shirt: 0x3a6ea5, pants: 0x2b2b33 });
      N.addPed(mkPath(-4.4, 120, 0), 1.3, { shirt: 0xc8c8c8, pants: 0x4a4a55, skin: 0x6b4028 });
      N.addPed(mkPath(4.4, 10, 115), 0.9, { shirt: 0xb05a2e, pants: 0x333340 });
    } else {
      N.addPed(mkPath(-5.2, 0, 120), 1.2, { shirt: 0x7a4a8c, pants: 0x333340 });
      N.addPed(mkPath(5.2, 120, 0), 1.0, { shirt: 0x3a6ea5, pants: 0x2b2b33 });
    }
    // tea vendor (static, serving motion)
    const vendor = N.addPed([[6.0, 26.8], [6.0, 26.2]], 0.25, { shirt: 0xd8d0c0, pants: 0x4a4038 });
    vendor.staticServe = true;
    // traffic lanes
    this.lanes = [
      { x0: -1.6, x1: -1.6, z0: -6, z1: 124, speed: 7, len: 130 },
      { x0: 1.6, x1: 1.6, z0: 124, z1: -6, speed: 6, len: 130 },
    ];
    if (!backdrop) {
      N.addVehicle('car', this.lanes[0]);
      N.addVehicle('auto', this.lanes[1]);
      N.addVehicle('bike', this.lanes[0]);
      if (count >= 1) N.addVehicle('bike', this.lanes[1]);
    }
    this.signal = new TrafficLight(S, 3.8, 45);
    // office door interact
    if (!backdrop) {
      this.interact.clear();
      this.interact.add({ id: 'office', x: 0, z: 123.4, r: 2.6, label: 'Enter office', action: () => this.enterOffice() });
    }
  }
  async enterOffice() {
    this.state = 'leaving';
    UI.prompt(null);
    AudioSys.blip(540, 0.18, 0.15);
    await UI.fade('out', 900);
    SaveSys.write({ scene: 'office', step: 0, order: Order.value });
    this.loadLevel('office');
    this.state = 'office';
    UI.showHUD(true);
    await UI.fade('in', 900);
  }
  streetEvents(dt) {
    const z = this.player.pos.z, x = this.player.pos.x;
    const E = this.events;
    // 1) red-light runner near crossing
    if (!E.bike && z > 34 && z < 60) {
      E.bike = { t: 0 };
      this.signal.t = 2; // force RED
      this._runner = { mesh: makeRunnerBike(), t: 0 };
      this.scene.add(this._runner.mesh);
      UI.subtitle('The light is <b style="color:#ff6a6a">red</b>. The motorcycle doesn\'t stop.', 3600);
      Order.observe(24, 'Something feels wrong…');
    }
    if (this._runner) {
      this._runner.t += dt;
      const k = this._runner.t / 1.6;
      this._runner.mesh.position.set(-9 + 18 * k, 0, 45);
      this._runner.mesh.rotation.y = Math.PI / 2;
      const wob = Math.sin(this._runner.t * 30) * 0.05;
      this._runner.mesh.rotation.z = wob;
      if (k >= 1) { this.scene.remove(this._runner.mesh); this._runner = null; }
    }
    // 2) garbage thrower
    if (!E.garbage && z > 58) {
      E.garbage = true;
      const g = box(0.35, 0.25, 0.3, 0x6a7a5a, 2.2, 1.0, 62);
      this.scene.add(g);
      this._litter = { mesh: g, t: 0, from: new THREE.Vector3(2.2, 1.0, 62), to: new THREE.Vector3(0.6, 0.12, 63.6) };
      UI.subtitle('A man throws garbage onto the street.', 3400);
      Order.observe(16, 'Ambi stares a moment too long…');
    }
    if (this._litter && this._litter.t < 1) {
      this._litter.t += dt * 1.4;
      const k = Math.min(1, this._litter.t);
      this._litter.mesh.position.lerpVectors(this._litter.from, this._litter.to, k);
      this._litter.mesh.position.y += Math.sin(k * Math.PI) * 0.3;
      this._litter.mesh.rotation.x += dt * 6;
    }
    // 3) auto stops illegally + spit
    if (!E.spit && z > 84) {
      E.spit = true;
      const auto = this.npcs.addVehicle('auto', { x0: 1.6, x1: 1.6, z0: 92, z1: 92.1, speed: 0.01, len: 1 });
      auto.g.position.set(1.6, 0, 92);
      UI.subtitle('An auto-rickshaw stops in the middle of the road.', 3400);
      Order.observe(14);
    }
  }

  /* ---------- office life ---------- */
  setupOfficeLife() {
    const N = this.npcs;
    // receptionist + workers (mostly static, subtle motion)
    const r = N.addPed([[-4, 2.6], [-4, 2.4]], 0.2, { shirt: 0x8c2e4a, pants: 0x2b2b33, skin: 0x7a4a30 });
    r.staticServe = true;
    const w1 = N.addPed([[-1.5, -0.2], [-1.5, 0.0]], 0.2, { shirt: 0x3a6ea5, pants: 0x333340 });
    w1.staticServe = true;
    const w2 = N.addPed([[1.5, 2.3], [1.5, 2.5]], 0.2, { shirt: 0x4a7a5a, pants: 0x2b2b33 });
    w2.staticServe = true;
    this.interact.clear();
    this.interact.add({ id: 'desk', x: 4.5, z: -2.6, r: 2.2, label: 'Sit at your desk', action: () => this.finishChapter() });
    this.interact.add({ id: 'files', x: 7.5, z: 0.6, r: 1.8, label: 'Check case files', action: () => {
      UI.subtitle('Case files, sorted by date. As they should be.', 2600); AudioSys.blip(520, 0.1, 0.12);
    }});
  }
  async finishChapter() {
    if (this.state !== 'office') return;
    this.state = 'ending';
    UI.prompt(null);
    // walk Ambi to chair, sit
    const target = this.officeCtx.dyn.chairPos;
    const t0 = performance.now();
    const from = this.player.pos.clone();
    const to = new THREE.Vector3(target.x, 0, target.z);
    while (performance.now() - t0 < 1400) {
      const k = Math.min(1, (performance.now() - t0) / 1400);
      this.player.pos.lerpVectors(from, to, k);
      this.player.yaw += (Math.PI - this.player.yaw) * 0.08;
      this.player.person.walk(performance.now() * 0.004, 0.3);
      this.player.sync();
      await new Promise(r => setTimeout(r, 16));
      if (this.state !== 'ending') return;
    }
    this.player.seated = true;
    // files placed neatly
    const [f1, f2] = this.officeCtx.dyn.fileMeshes;
    f1.rotation.y = 0; f1.position.set(-0.1, 0.02, 0);
    f2.rotation.y = 0; f2.position.set(-0.1, 0.11, 0);
    AudioSys.blip(660, 0.2, 0.15);
    UI.subtitle('Files aligned. Day begins.', 3000);
    await new Promise(r => setTimeout(r, 2600));
    await UI.fade('out', 1400);
    SaveSys.clear();
    this.state = 'complete';
    UI.showHUD(false);
    UI.el.complete.classList.remove('hidden');
    this._expectUnlock = true; Input.exitLock(); this._expectUnlock = false;
    await UI.fade('in', 600);
  }

  /* ---------- pause ---------- */
  togglePause(on) {
    const want = on !== undefined ? on : !this.paused;
    if (this.state === 'menu' || this.state === 'complete' || this.state === 'intro') return;
    if (this.state === 'leaving' || this.state === 'ending') return;
    this.paused = want;
    UI.el['pause-menu'].classList.toggle('hidden', !want);
    if (want) { this._expectUnlock = true; Input.exitLock(); setTimeout(() => this._expectUnlock = false, 300); AudioSys.blip(330, 0.12, 0.12); }
    else { AudioSys.blip(520, 0.1, 0.12); this.clock.getDelta(); }
  }

  /* ---------- per-frame ---------- */
  frame() {
    const dt = Math.min(0.05, this.clock.getDelta());
    const t = this.clock.elapsedTime;
    const act = Input.frame();
    if (act.pause) this.togglePause();
    // touch overlay only while actively playing (never over menus)
    const playing = (this.state === 'home' || this.state === 'street' || this.state === 'office') && !this.paused;
    const touchRoot = document.getElementById('touch-ui');
    if (touchRoot) {
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      const showBtn = document.getElementById('btn-touch-show');
      if (!playing || !isTouch || TouchUI.hiddenByUser) touchRoot.classList.add('hidden');
      else touchRoot.classList.remove('hidden');
      if (showBtn) {
        if (playing && isTouch && TouchUI.hiddenByUser) showBtn.classList.remove('hidden');
        else showBtn.classList.add('hidden');
      }
    }

    if (this.state === 'menu') {
      // slow menu orbit around street
      const a = t * 0.08;
      this.camera.position.set(Math.sin(a) * 14, 6, 60 + Math.cos(a) * 14);
      this.camera.lookAt(0, 2, 55);
      if (this.npcs) this.npcs.update(dt, t);
      if (this.signal) this.signal.update(dt);
      this.renderer.render(this.scene, this.camera);
      return;
    }
    if (this.paused || this.state === 'intro' && this.cineActive) {
      if (this.cineActive && !this.paused) {
        const c = this.cine;
        c.t += dt;
        const k = Math.min(1, c.t / c.dur);
        const e = k * k * (3 - 2 * k);
        this.camera.position.lerpVectors(c.from, c.to, e);
        const look = new THREE.Vector3().lerpVectors(c.lookFrom, c.lookTo, e);
        this.camera.lookAt(look);
        if (k >= 1) { this.cineActive = false; }
        this.renderer.render(this.scene, this.camera);
      }
      return;
    }
    if (this.state === 'home' || this.state === 'street' || this.state === 'office') {
      // alarm flash
      if (this.level === 'home' && this.homeCtx?.dyn.alarmFace && this.step === 0) {
        const on = Math.sin(t * 10) > 0;
        this.homeCtx.dyn.alarmFace.material.color.setHex(on ? 0xff4444 : 0x551111);
      }
      this.player.update(dt, { x: act.moveX, z: act.moveZ }, this.camCtl.yaw, act.run);
      this.camCtl.addLook(act.lookDX, act.lookDY);
      this.camCtl.update(dt, this.player.pos, Order.norm(), this.player.colliders);
      const near = this.interact.update(this.player.pos, (label) => {
        if (this.state === 'home' || this.state === 'street' || this.state === 'office') {
          if (label) {
            const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
            UI.prompt(label, isTouch ? 'TAP' : 'E');
          } else UI.prompt(null);
        }
      });
      if (act.interact && near) this.interact.tryInteract();
      if (this.npcs) this.npcs.update(dt, t);
      if (this.signal) this.signal.update(dt);
      if (this.state === 'street') this.streetEvents(dt);
      // reached office door hint handled by interact prompt
      this.renderer.render(this.scene, this.camera);
      return;
    }
    // leaving/ending/complete: keep rendering frozen-ish scene
    if (this.scene) this.renderer.render(this.scene, this.camera);
  }
}

function D_ref(ctx) { return ctx.dyn; }

// runner bike mesh (built lazily to avoid circular import cost at top)
import { makeVehicle } from './world.js';
function makeRunnerBike() {
  const g = makeVehicle('bike');
  const rider = new THREE.Group();
  return g;
}
