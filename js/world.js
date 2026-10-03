// Shared world helpers: materials, boxes, text sprites. Keeps poly counts low for mobile.
import * as THREE from 'three';
const matCache = new Map();
export function MAT(color, opts = {}) {
  const key = color + JSON.stringify(opts);
  if (!matCache.has(key)) {
    matCache.set(key, new THREE.MeshLambertMaterial({ color, ...opts }));
  }
  return matCache.get(key);
}
const geoCache = new Map();
export function BOX(w, h, d) {
  const key = `b${w},${h},${d}`;
  if (!geoCache.has(key)) geoCache.set(key, new THREE.BoxGeometry(w, h, d));
  return geoCache.get(key);
}
export function box(w, h, d, color, x = 0, y = 0, z = 0, opts) {
  const m = new THREE.Mesh(BOX(w, h, d), MAT(color, opts));
  m.position.set(x, y, z);
  return m;
}
// Canvas-based label sprite (nameplates, shop signs, newspaper headline)
export function makeLabel(text, { size = 48, fg = '#fff', bg = 'rgba(0,0,0,0)', w = 512, h = 128 } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = fg; g.font = `600 ${size}px system-ui, sans-serif`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  const words = text.split(' ');
  if (g.measureText(text).width > w - 20 && words.length > 1) {
    const mid = Math.ceil(words.length / 2);
    g.fillText(words.slice(0, mid).join(' '), w / 2, h / 2 - size * 0.6);
    g.fillText(words.slice(mid).join(' '), w / 2, h / 2 + size * 0.6);
  } else g.fillText(text, w / 2, h / 2);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(2.4, 0.6, 1);
  return sp;
}
// Build a simple low-poly humanoid. Returns {group, parts} with walk-cycle animation.
export function makePerson({ shirt = 0x3a6ea5, pants = 0x2b2b33, skin = 0x8a5a3b, hair = 0x14100c } = {}) {
  const g = new THREE.Group();
  const hips = new THREE.Group(); hips.position.y = 0.92; g.add(hips);
  const torso = box(0.42, 0.58, 0.24, shirt, 0, 0.32, 0); hips.add(torso);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), MAT(skin));
  head.position.y = 0.82; hips.add(head);
  const hairM = box(0.3, 0.12, 0.28, hair, 0, 0.93, -0.02); hips.add(hairM);
  const mkLimb = (w, l, c, x, y) => {
    const pivot = new THREE.Group(); pivot.position.set(x, y, 0); hips.add(pivot);
    const m = box(w, l, w, c, 0, -l / 2, 0); pivot.add(m);
    return pivot;
  };
  const armL = mkLimb(0.11, 0.55, shirt, -0.28, 0.55);
  const armR = mkLimb(0.11, 0.55, shirt, 0.28, 0.55);
  const legL = mkLimb(0.14, 0.9, pants, -0.11, 0.02);
  const legR = mkLimb(0.14, 0.9, pants, 0.11, 0.02);
  g.traverse(o => { if (o.isMesh) { o.castShadow = true; } });
  return {
    group: g, armL, armR, legL, legR, head, torso,
    setShirt(c) { torso.material = MAT(c); },
    walk(t, speed) {
      const s = Math.sin(t * (4 + speed * 2)) * Math.min(1, speed * 1.4) * 0.55;
      legL.rotation.x = s; legR.rotation.x = -s;
      armL.rotation.x = -s * 0.8; armR.rotation.x = s * 0.8;
      hips.position.y = 0.92 + Math.abs(Math.sin(t * (4 + speed * 2))) * 0.03 * Math.min(1, speed);
    },
    idle(t) {
      legL.rotation.x *= 0.8; legR.rotation.x *= 0.8;
      armL.rotation.x = Math.sin(t * 1.5) * 0.05; armR.rotation.x = -Math.sin(t * 1.5) * 0.05;
    }
  };
}
// Simple vehicle: auto-rickshaw / bike / car from boxes. Low poly.
export function makeVehicle(kind) {
  const g = new THREE.Group();
  if (kind === 'auto') {
    g.add(box(1.2, 0.5, 1.9, 0x1f8a4c, 0, 0.55, 0));
    g.add(box(1.1, 0.55, 1.1, 0xf2c230, 0, 1.05, 0.2));
    g.add(box(1.14, 0.4, 0.1, 0x111111, 0, 1.0, -0.75));
    const wg = new THREE.CylinderGeometry(0.28, 0.28, 0.2, 8);
    const wm = MAT(0x141414);
    [[-0.55, 0.6], [0.55, 0.6], [0, -0.75]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wg, wm); w.rotation.z = Math.PI / 2; w.position.set(x, 0.28, z); g.add(w);
    });
  } else if (kind === 'bike') {
    g.add(box(0.18, 0.18, 1.7, 0xb03030, 0, 0.6, 0));
    g.add(box(0.3, 0.35, 0.5, 0x222222, 0, 0.85, -0.2));
    const wg = new THREE.TorusGeometry(0.3, 0.08, 6, 10);
    const wm = MAT(0x141414);
    [[0, 0.75], [0, -0.75]].forEach(([x, z]) => { const w = new THREE.Mesh(wg, wm); w.position.set(x, 0.3, z); g.add(w); });
  } else { // car
    g.add(box(1.7, 0.55, 4.0, 0xcfd6dd, 0, 0.6, 0));
    g.add(box(1.5, 0.5, 2.0, 0x9fb3c8, 0, 1.1, -0.2));
    const wg = new THREE.CylinderGeometry(0.32, 0.32, 0.24, 8);
    const wm = MAT(0x141414);
    [[-0.8, 1.3], [0.8, 1.3], [-0.8, -1.3], [0.8, -1.3]].forEach(([x, z]) => {
      const w = new THREE.Mesh(wg, wm); w.rotation.z = Math.PI / 2; w.position.set(x, 0.32, z); g.add(w);
    });
  }
  g.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return g;
}
