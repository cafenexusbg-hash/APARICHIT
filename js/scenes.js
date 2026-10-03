// Scene builders: modest Indian urban home, street, law office.
// Low-poly, shared materials, mobile-friendly. Each returns a context object.
import * as THREE from 'three';
import { box, MAT, makeLabel } from './world.js';

/* ---------------- shared ---------------- */
export function baseScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e1420);
  scene.fog = new THREE.Fog(0x0e1420, 30, 90);
  const hemi = new THREE.HemisphereLight(0xfff2dd, 0x3a4a5a, 0.95);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe7bd, 1.6);
  sun.position.set(8, 14, 6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -20; sun.shadow.camera.right = 20;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  scene.add(sun);
  scene.userData.sun = sun;
  return scene;
}
function floor(scene, w, d, color, x = 0, z = 0) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT(color));
  f.rotation.x = -Math.PI / 2; f.position.set(x, 0, z); f.receiveShadow = true;
  scene.add(f); return f;
}
function rug(scene, w, d, color, x, z) {
  const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), MAT(color));
  f.rotation.x = -Math.PI / 2; f.position.set(x, 0.012, z); f.receiveShadow = true;
  scene.add(f);
}
function wallSeg(scene, colliders, x1, z1, x2, z2, h = 2.8, color = 0xe8ddc8, thick = 0.25) {
  const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
  const horiz = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const w = horiz ? Math.abs(x2 - x1) + thick : thick;
  const d = horiz ? thick : Math.abs(z2 - z1) + thick;
  const m = box(w, h, d, color, cx, h / 2, cz);
  m.receiveShadow = true; scene.add(m);
  colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
  return m;
}
// wall with a door gap between (g1,g2) along its length
function wallWithDoor(scene, colliders, x1, z1, x2, z2, g1, g2, opts = {}) {
  const horiz = Math.abs(x2 - x1) > Math.abs(z2 - z1);
  const segs = horiz
    ? [[x1, g1], [g2, x2]]
    : [[z1, g1], [g2, z2]];
  for (const [a, b] of segs) {
    if (b - a < 0.05) continue;
    if (horiz) wallSeg(scene, colliders, a, z1, b, z2, opts.h, opts.color, opts.thick);
    else wallSeg(scene, colliders, x1, a, x2, b, opts.h, opts.color, opts.thick);
  }
  // lintel above door
  const h = opts.h || 2.8;
  if (horiz) { const m = box(Math.abs(g2 - g1), h - 2.1, 0.25, opts.color || 0xe8ddc8, (g1 + g2) / 2, 2.1 + (h - 2.1) / 2, z1); scene.add(m); }
  else { const m = box(0.25, h - 2.1, Math.abs(g2 - g1), opts.color || 0xe8ddc8, x1, 2.1 + (h - 2.1) / 2, (g1 + g2) / 2); scene.add(m); }
}

/* ---------------- HOME ---------------- */
export function buildHome(scene) {
  const colliders = [];
  const dyn = {}; // dynamic prop refs
  floor(scene, 15, 11, 0x9a8a72);
  rug(scene, 3.4, 2.4, 0x7a2e2e, -4, -2.4);
  rug(scene, 4.5, 2.6, 0x2e5a7a, 2.5, 2.6);
  const W = 0xe9dfc9, WT = 0xdcd0b8;
  // outer walls (front door gap on south wall x in [5,6.2])
  wallSeg(scene, colliders, -7.5, -5.5, 7.5, -5.5, 2.8, W);            // north
  wallWithDoor(scene, colliders, -7.5, 5.5, 7.5, 5.5, 5, 6.2, { color: W }); // south + front door
  wallSeg(scene, colliders, -7.5, -5.5, -7.5, 5.5, 2.8, W);
  wallSeg(scene, colliders, 7.5, -5.5, 7.5, 5.5, 2.8, W);
  // partition: bedroom | kitchen wall (x=-1, gap z -1..0.2 bedroom door)
  wallWithDoor(scene, colliders, -1, -5.5, -1, 0.5, -1.0, 0.2, { color: WT });
  // partition: bedroom/living (z=0.5, x -7.5..-1, gap x -4..-2.8)
  wallWithDoor(scene, colliders, -7.5, 0.5, -1, 0.5, -4.0, -2.8, { color: WT });
  // kitchen/living (z=-1, x -1..7.5, gap x 2.5..3.7)
  wallWithDoor(scene, colliders, -1, -1, 7.5, -1, 2.5, 3.7, { color: WT });
  // bathroom (x 1..3.4? keep simple: small room corner) — walls with gap
  wallWithDoor(scene, colliders, 1, -5.5, 1, -1, -4.0, -2.8, { color: 0xcfe0e4 });
  wallWithDoor(scene, colliders, 1, -1, 4.2, -1, 1.6, 2.5, { color: 0xcfe0e4, h: 2.8 });

  // ceiling (warm, lit by hemisphere light)
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(15.6, 11.6), MAT(0xf2e8d4));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 2.8, 0); scene.add(ceil);
  const lampM = new THREE.MeshBasicMaterial({ color: 0xffe9b8 });
  [[-4, -2.5], [3, 2.5], [4.5, -3.5]].forEach(([x, z]) => {
    const l = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), lampM);
    l.position.set(x, 2.55, z); scene.add(l);
  });

  // --- BEDROOM ---
  // bed: frame + mattress + blanket (blanket changes when made) + pillow
  const bed = new THREE.Group(); bed.position.set(-5.6, 0, -3.6); scene.add(bed);
  bed.add(box(2.0, 0.35, 3.0, 0x6b4a2f, 0, 0.18, 0));
  bed.add(box(1.9, 0.25, 2.9, 0xf2ede0, 0, 0.48, 0));
  const blanketMessy = box(1.9, 0.12, 1.6, 0x4a7a8c, 0.15, 0.62, 0.5);
  blanketMessy.rotation.y = 0.25; bed.add(blanketMessy);
  dyn.blanket = blanketMessy;
  bed.add(box(1.4, 0.18, 0.6, 0xffffff, 0, 0.62, -1.05));
  bed.add(box(2.0, 1.0, 0.15, 0x6b4a2f, 0, 0.8, -1.55));
  colliders.push({ minX: -6.7, maxX: -4.5, minZ: -5.2, maxZ: -2.0 });

  // side table + alarm clock (alarm flashes)
  const table = box(0.6, 0.55, 0.6, 0x7a5a38, -4.0, 0.28, -4.9); scene.add(table);
  colliders.push({ minX: -4.35, maxX: -3.65, minZ: -5.2, maxZ: -4.6 });
  const alarm = new THREE.Group(); alarm.position.set(-4.0, 0.68, -4.9); scene.add(alarm);
  alarm.add(box(0.34, 0.24, 0.12, 0x222222, 0, 0, 0));
  const alarmFace = new THREE.Mesh(new THREE.PlaneGeometry(0.28, 0.16),
    new THREE.MeshBasicMaterial({ color: 0xff4444 }));
  alarmFace.position.set(0, 0, 0.07); alarm.add(alarmFace);
  dyn.alarmFace = alarmFace;
  dyn.alarm = alarm;

  // wardrobe with openable door
  const ward = new THREE.Group(); ward.position.set(-2.2, 0, -5.0); scene.add(ward);
  ward.add(box(1.6, 2.1, 0.6, 0x8a5f36, 0, 1.05, 0));
  const wdoor = box(0.75, 1.9, 0.06, 0x9a6f42, -0.4, 1.0, 0.33);
  ward.add(wdoor); dyn.wardDoor = wdoor;
  ward.add(box(0.75, 1.9, 0.06, 0x7a5530, 0.4, 1.0, 0.31));
  colliders.push({ minX: -3.1, maxX: -1.3, minZ: -5.4, maxZ: -4.6 });

  // mirror (reflective-ish plane)
  const mir = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6),
    new THREE.MeshLambertMaterial({ color: 0xbfe3ea, emissive: 0x3a5a62 }));
  mir.position.set(-1.15, 1.3, -2.2); mir.rotation.y = Math.PI / 2; scene.add(mir);
  scene.add(box(0.08, 1.8, 1.0, 0x5a4028, -1.2, 1.3, -2.2));

  // books shelf (orderly row of colored books)
  const shelf = new THREE.Group(); shelf.position.set(-7.1, 1.4, -1.5); scene.add(shelf);
  shelf.add(box(0.35, 0.06, 2.2, 0x6b4a2f, 0, -0.4, 0));
  shelf.add(box(0.35, 0.06, 2.2, 0x6b4a2f, 0, 0.4, 0));
  const bookCols = [0xa33b3b, 0x2e5a8c, 0x2e8c5a, 0xc8a02e, 0x6a3b8c, 0x8c5a2e, 0x3b8c8c];
  bookCols.forEach((c, i) => {
    shelf.add(box(0.24, 0.5, 0.22, c, 0, -0.1, -0.85 + i * 0.28));
    shelf.add(box(0.24, 0.44, 0.2, c, 0, 0.65, -0.7 + i * 0.26));
  });

  // --- LIVING ROOM ---
  const sofa = new THREE.Group(); sofa.position.set(-2.5, 0, 3.4); sofa.rotation.y = Math.PI; scene.add(sofa);
  sofa.add(box(2.4, 0.5, 0.9, 0x4a6a4f, 0, 0.35, 0));
  sofa.add(box(2.4, 0.7, 0.25, 0x4a6a4f, 0, 0.8, 0.35));
  colliders.push({ minX: -3.8, maxX: -1.2, minZ: 2.9, maxZ: 3.9 });
  const ctable = box(1.3, 0.4, 0.7, 0x7a5a38, -2.5, 0.2, 1.9); scene.add(ctable);
  colliders.push({ minX: -3.2, maxX: -1.8, minZ: 1.55, maxZ: 2.25 });
  // newspaper on coffee table
  const news = box(0.5, 0.04, 0.35, 0xf5f0e0, -2.5, 0.44, 1.9); scene.add(news);
  dyn.news = news;
  // TV / shelf
  scene.add(box(1.8, 0.5, 0.5, 0x5a4028, 2.5, 0.25, 5.0));
  const tv = box(1.4, 0.8, 0.1, 0x0a0a0c, 2.5, 1.2, 5.2); scene.add(tv);
  colliders.push({ minX: 1.5, maxX: 3.5, minZ: 4.7, maxZ: 5.5 });

  // shoes near door (pair, perfectly aligned)
  const shoes = new THREE.Group(); shoes.position.set(4.3, 0, 4.6); scene.add(shoes);
  shoes.add(box(0.14, 0.1, 0.32, 0x3a2a1a, -0.1, 0.05, 0));
  shoes.add(box(0.14, 0.1, 0.32, 0x3a2a1a, 0.1, 0.05, 0));
  dyn.shoes = shoes;

  // front door (opens visually on exit)
  const fdoor = box(1.1, 2.1, 0.12, 0x7a4a26, 5.6, 1.05, 5.5); scene.add(fdoor);
  dyn.frontDoor = fdoor;

  // --- KITCHEN ---
  scene.add(box(2.8, 0.9, 0.7, 0x9aa2a8, 5.8, 0.45, -4.9));
  scene.add(box(2.8, 0.08, 0.75, 0xdadde0, 5.8, 0.94, -4.9));
  colliders.push({ minX: 4.3, maxX: 7.3, minZ: -5.3, maxZ: -4.5 });
  // vessels in a neat row
  for (let i = 0; i < 4; i++) {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.22, 10), MAT(0xb9c2c9));
    v.position.set(4.9 + i * 0.55, 1.09, -4.9); scene.add(v);
  }
  // stove + kettle
  scene.add(box(0.7, 0.9, 0.7, 0x33383e, 3.2, 0.45, -4.9));

  // --- BATHROOM (small, clean) ---
  const bath = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.4, 0.5, 12), MAT(0xeef4f6));
  bath.position.set(2.6, 0.9, -4.2); scene.add(bath);
  scene.add(box(0.7, 0.15, 0.6, 0xeef4f6, 3.4, 0.8, -3.2));
  colliders.push({ minX: 2.0, maxX: 3.9, minZ: -4.7, maxZ: -2.9 });

  // room labels (subtle, help navigation)
  return { colliders, dyn, spawn: { x: -3.8, z: -3.0, yaw: Math.PI } };
}

/* ---------------- STREET ---------------- */
export function buildStreet(scene, npcScale = 1) {
  const colliders = [];
  const dyn = {};
  scene.background = new THREE.Color(0x9fc3e0);
  scene.fog = new THREE.Fog(0x9fc3e0, 35, 110);
  floor(scene, 60, 140, 0x8a8f7a, 0, 55);
  // road
  const road = new THREE.Mesh(new THREE.PlaneGeometry(7, 140), MAT(0x3c3f45));
  road.rotation.x = -Math.PI / 2; road.position.set(0, 0.01, 55); road.receiveShadow = true; scene.add(road);
  // lane dashes
  for (let z = -5; z < 120; z += 4) scene.add(box(0.18, 0.012, 1.6, 0xf2e9c8, 0, 0.02, z));
  // sidewalks
  [[-5.2], [5.2]].forEach(([x]) => {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 140), MAT(0xb9b2a2));
    s.rotation.x = -Math.PI / 2; s.position.set(x, 0.015, 55); s.receiveShadow = true; scene.add(s);
  });
  // zebra crossing at z=45
  for (let i = -3; i <= 3; i += 1) scene.add(box(0.7, 0.012, 2.2, 0xf5f2e8, i, 0.025, 45));
  // keep player in corridor
  colliders.push({ minX: -50, maxX: -7.4, minZ: -50, maxZ: 150 });
  colliders.push({ minX: 7.4, maxX: 50, minZ: -50, maxZ: 150 });
  colliders.push({ minX: -50, maxX: 50, minZ: 128, maxZ: 150 }); // beyond office
  colliders.push({ minX: -50, maxX: -2, minZ: -50, maxZ: -4 });   // behind house

  // Ambi's house facade (behind spawn)
  const house = new THREE.Group(); house.position.set(0, 0, -6); scene.add(house);
  house.add(box(12, 5, 1.2, 0xe6d3ac, 0, 2.5, 0));
  house.add(box(13, 0.5, 2.4, 0x8c3b2e, 0, 5.2, 0));
  const hdoor = box(1.3, 2.3, 0.2, 0x6b3a22, 0, 1.15, 0.7); house.add(hdoor);
  const lbl = makeLabel("AMBI'S HOUSE", { fg: '#5a4028' }); lbl.position.set(0, 4.2, 0.8); lbl.scale.set(3.4, 0.85, 1); house.add(lbl);
  // windows with warm light
  [[-3.5], [3.5]].forEach(([x]) => house.add(box(1.6, 1.4, 0.15, 0xffe9a8, x, 2.6, 0.65)));

  // shops row (both sides)
  const shopDefs = [
    [-9.5, 12, 'KIRANA STORE', 0xc86a3b], [-9.5, 24, 'TAILOR', 0x3b7a8c],
    [-9.5, 60, 'BARBER', 0x8c3b5a], [-9.5, 84, 'PHARMA', 0x3b8c5a],
    [9.5, 10, 'BAKERY', 0xb08c3b], [9.5, 58, 'MOBILE POINT', 0x3b5a8c], [9.5, 82, 'BOOKS', 0x6a3b8c],
  ];
  for (const [x, z, name, c] of shopDefs) {
    const s = new THREE.Group(); s.position.set(x, 0, z); scene.add(s);
    s.add(box(5, 3.6, 4, c, 0, 1.8, 0));
    s.add(box(5.4, 0.4, 4.6, 0x33302a, 0, 3.8, 0));
    s.add(box(3.2, 2.2, 0.2, 0x2a2118, 0, 1.1, x < 0 ? 2.0 : -2.0));
    const sign = makeLabel(name, { fg: '#ffe9a8', bg: 'rgba(20,12,4,0.85)' });
    sign.position.set(0, 3.1, x < 0 ? 2.15 : -2.15); sign.scale.set(4, 1, 1); s.add(sign);
    colliders.push({ minX: x - 2.8, maxX: x + 2.8, minZ: z - 2.3, maxZ: z + 2.3 });
  }

  // tea stall with vendor + steam + bench
  const stall = new THREE.Group(); stall.position.set(6.4, 0, 26); scene.add(stall);
  stall.add(box(2.6, 0.12, 1.6, 0x8c5a2e, 0, 1.0, 0));
  [[-1.1], [1.1]].forEach(([x]) => stall.add(box(0.12, 1.0, 0.12, 0x5a4028, x, 0.5, 0.6)));
  [[-1.1], [1.1]].forEach(([x]) => stall.add(box(0.12, 1.0, 0.12, 0x5a4028, x, 0.5, -0.6)));
  stall.add(box(2.8, 0.15, 1.9, 0xc25a2e, 0, 1.9, 0));
  const signT = makeLabel('☕ CHAI STALL', { fg: '#ffe9a8', bg: 'rgba(60,20,4,0.9)' });
  signT.position.set(0, 2.5, 0); stall.add(signT);
  // kettle + cups
  stall.add(box(0.4, 0.35, 0.4, 0x888e94, -0.6, 1.2, 0));
  for (let i = 0; i < 3; i++) stall.add(box(0.09, 0.09, 0.09, 0xffffff, 0.2 + i * 0.25, 1.1, 0.2));
  colliders.push({ minX: 5.0, maxX: 7.8, minZ: 25.0, maxZ: 27.0 });
  dyn.stall = stall;

  // bus stop shelter
  const bus = new THREE.Group(); bus.position.set(-6.2, 0, 70); scene.add(bus);
  bus.add(box(0.15, 2.4, 3.6, 0x2e5a8c, -1.2, 1.2, 0));
  bus.add(box(2.4, 0.12, 3.8, 0x2e5a8c, 0, 2.5, 0));
  bus.add(box(2.2, 0.45, 0.1, 0x2e5a8c, 0, 0.65, -1.7));
  const signB = makeLabel('BUS STOP', { fg: '#fff', bg: 'rgba(20,40,80,0.9)' });
  signB.position.set(0, 2.9, 0); bus.add(signB);
  colliders.push({ minX: -7.6, maxX: -5.2, minZ: 68.0, maxZ: 72.0 });

  // office building facade at end
  const off = new THREE.Group(); off.position.set(0, 0, 126); scene.add(off);
  off.add(box(16, 9, 2, 0xd8d2c2, 0, 4.5, 0));
  off.add(box(17, 0.8, 3, 0x4a5560, 0, 9.2, 0));
  const signO = makeLabel('⚖ SHANKAR & ASSOCIATES — ADVOCATES', { fg: '#1a2a3a', bg: 'rgba(232,220,190,0.95)', size: 34 });
  signO.position.set(0, 7.2, 1.1); signO.scale.set(9, 1.4, 1); off.add(signO);
  off.add(box(1.6, 2.6, 0.3, 0x3a2a1a, 0, 1.3, 1.0));
  // glass windows
  for (let i = -2; i <= 2; i++) off.add(box(1.8, 1.6, 0.15, 0x9fc8dd, i * 2.6, 5.2, 1.05));
  colliders.push({ minX: -8.5, maxX: 8.5, minZ: 125.4, maxZ: 128 });
  dyn.officeDoor = { x: 0, z: 124.4 };

  // trees (cheap cones) + lamp posts
  for (let z = 4; z < 120; z += 14) {
    for (const x of [-7.2, 7.2]) {
      const tr = new THREE.Group(); tr.position.set(x, 0, z + (x > 0 ? 7 : 0)); scene.add(tr);
      tr.add(box(0.25, 1.6, 0.25, 0x5a4028, 0, 0.8, 0));
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.2, 7), MAT(0x2e7a3b));
      cone.position.y = 2.6; cone.castShadow = true; tr.add(cone);
    }
  }
  return { colliders, dyn, spawn: { x: 0, z: 0.5, yaw: 0 } };
}

/* ---------------- OFFICE ---------------- */
export function buildOffice(scene) {
  const colliders = [];
  const dyn = {};
  floor(scene, 18, 12, 0x8f8578);
  rug(scene, 5, 3, 0x5a3a3a, 0, 2);
  const W = 0xded3bd;
  wallSeg(scene, colliders, -9, -6, 9, -6, 3, W);
  wallWithDoor(scene, colliders, -9, 6, 9, 6, -0.7, 0.7, { color: W });
  wallSeg(scene, colliders, -9, -6, -9, 6, 3, W);
  wallSeg(scene, colliders, 9, -6, 9, 6, 3, W);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(18.6, 12.6), MAT(0xf2e8d4));
  ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 3.0, 0); scene.add(ceil);

  // reception desk + receptionist spot
  scene.add(box(3.0, 1.0, 0.9, 0x6b4a2f, -4, 0.5, 3.6));
  colliders.push({ minX: -5.6, maxX: -2.4, minZ: 3.1, maxZ: 4.1 });
  const rsign = makeLabel('RECEPTION', { fg: '#3a2a1a', bg: 'rgba(240,230,200,0.9)' });
  rsign.position.set(-4, 1.8, 3.6); scene.add(rsign);
  // waiting chairs row
  for (let i = 0; i < 4; i++) {
    scene.add(box(0.6, 0.45, 0.6, 0x4a5a6a, -6 + i * 1.1, 0.22, 1.2));
    colliders.push({ minX: -6.35 + i * 1.1, maxX: -5.65 + i * 1.1, minZ: 0.9, maxZ: 1.5 });
  }
  // bookshelves along north wall with legal books
  const shelfCols = [0x7a2e2e, 0x2e4a7a, 0x2e6a4a, 0x8c6a2e, 0x5a2e7a];
  for (let s = 0; s < 4; s++) {
    const sx = -6 + s * 3.4;
    scene.add(box(2.8, 2.4, 0.5, 0x5a4028, sx, 1.2, -5.6));
    colliders.push({ minX: sx - 1.5, maxX: sx + 1.5, minZ: -5.9, maxZ: -5.3 });
    for (let r = 0; r < 3; r++) for (let b = 0; b < 10; b++) {
      scene.add(box(0.2, 0.5, 0.3, shelfCols[(b + r + s) % 5], sx - 1.2 + b * 0.26, 0.55 + r * 0.7, -5.55));
    }
  }
  // Ambi's desk (back right) with nameplate, files, computer
  const desk = new THREE.Group(); desk.position.set(4.5, 0, -3.2); scene.add(desk);
  desk.add(box(2.0, 0.08, 1.0, 0x7a5a38, 0, 0.74, 0));
  [[-0.9], [0.9]].forEach(([x]) => desk.add(box(0.08, 0.74, 1.0, 0x6b4a2f, x, 0.37, 0)));
  const screen = box(0.6, 0.4, 0.06, 0x0c1418, 0.5, 1.1, -0.2);
  desk.add(screen);
  const glow = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.35), new THREE.MeshBasicMaterial({ color: 0x9fd8e8 }));
  glow.position.set(0.5, 1.1, -0.16); glow.rotation.y = Math.PI; desk.add(glow);
  desk.add(box(0.5, 0.05, 0.2, 0x22262c, 0.5, 0.8, 0.15));
  // files stack (messy -> neatly placed at ending)
  const files = new THREE.Group(); files.position.set(-0.4, 0.82, 0.1); desk.add(files);
  const f1 = box(0.5, 0.1, 0.35, 0xc8a02e, 0, 0, 0); f1.rotation.y = 0.4; files.add(f1);
  const f2 = box(0.5, 0.08, 0.35, 0x8c2e2e, 0.1, 0.1, 0.05); f2.rotation.y = -0.3; files.add(f2);
  dyn.files = files; dyn.fileMeshes = [f1, f2];
  const plate = makeLabel('AMBI — ADVOCATE', { fg: '#f5ead0', bg: 'rgba(40,26,10,0.92)', size: 40 });
  plate.position.set(4.5, 1.35, -2.55); plate.scale.set(1.8, 0.45, 1); scene.add(plate);
  // chair
  const chair = new THREE.Group(); chair.position.set(4.5, 0, -1.9); scene.add(chair);
  chair.add(box(0.55, 0.08, 0.55, 0x2a2a30, 0, 0.5, 0));
  chair.add(box(0.55, 0.7, 0.08, 0x2a2a30, 0, 0.9, -0.26));
  colliders.push({ minX: 3.4, maxX: 5.6, minZ: -3.8, maxZ: -2.6 });
  dyn.chairPos = { x: 4.5, z: -1.9 };
  // colleague desks
  [[-1.5, -1], [1.5, 1.5]].forEach(([x, z]) => {
    scene.add(box(1.6, 0.75, 0.9, 0x7a6a55, x, 0.37, z));
    colliders.push({ minX: x - 0.9, maxX: x + 0.9, minZ: z - 0.55, maxZ: z + 0.55 });
  });
  // case files pile + newspaper on side table
  scene.add(box(0.9, 0.7, 0.5, 0x8a6a3a, 7.5, 0.35, 0));
  colliders.push({ minX: 7.0, maxX: 8.0, minZ: -0.3, maxZ: 0.3 });
  return { colliders, dyn, spawn: { x: 0, z: 3.0, yaw: Math.PI } };
}
