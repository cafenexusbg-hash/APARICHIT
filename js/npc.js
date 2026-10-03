// NPC System + Traffic System — cheap looping agents, capped for mobile.
// Pedestrians walk waypoints; vehicles drive lanes; signal cycles R/Y/G.
import * as THREE from 'three';
import { makePerson, makeVehicle, MAT, box } from './world.js';

export class NPCSystem {
  constructor(scene, quality) {
    this.scene = scene; this.list = [];
    this.quality = quality;
  }
  addPed(path, speed = 1.1, opts = {}) {
    const p = makePerson(opts);
    this.scene.add(p.group);
    const n = { kind: 'ped', p, path, seg: 0, t: Math.random(), speed: speed * (0.85 + Math.random() * 0.3) };
    this.list.push(n); return n;
  }
  addVehicle(kind, lane) {
    const g = makeVehicle(kind);
    this.scene.add(g);
    const n = { kind: 'veh', g, lane, t: Math.random() };
    this.list.push(n); return n;
  }
  update(dt, time) {
    const cap = this.list.length;
    for (const n of this.list) {
      if (n.kind === 'ped') {
        n.t += dt * n.speed / 20;
        const P = n.path, i = Math.floor(n.t % 1 * P.length), j = (i + 1) % P.length;
        const f = (n.t % 1 * P.length) % 1;
        const ax = P[i][0] + (P[j][0] - P[i][0]) * f;
        const az = P[i][1] + (P[j][1] - P[i][1]) * f;
        n.p.group.position.set(ax, 0, az);
        n.p.group.rotation.y = Math.atan2(P[j][0] - P[i][0], P[j][1] - P[i][1]);
        n.p.walk(time, 0.45);
      } else if (n.kind === 'veh') {
        n.t += dt * (n.lane.speed || 6) / n.lane.len;
        if (n.t > 1) n.t -= 1;
        const x = n.lane.x0 + (n.lane.x1 - n.lane.x0) * n.t;
        const z = n.lane.z0 + (n.lane.z1 - n.lane.z0) * n.t;
        n.g.position.set(x, 0, z);
        n.g.rotation.y = Math.atan2(n.lane.x1 - n.lane.x0, n.lane.z1 - n.lane.z0);
      }
    }
  }
  clear() { for (const n of this.list) this.scene.remove(n.p ? n.p.group : n.g); this.list = []; }
}

export class TrafficLight {
  constructor(scene, x, z) {
    this.state = 'RED'; this.t = 0;
    this.group = new THREE.Group(); this.group.position.set(x, 0, z);
    const pole = box(0.15, 3.4, 0.15, 0x22262c, 0, 1.7, 0); this.group.add(pole);
    const headBox = box(0.4, 1.0, 0.3, 0x111315, 0, 3.4, 0); this.group.add(headBox);
    this.lamps = {};
    [['R', 0xff2a2a, 0.32], ['Y', 0xffb020, 0], ['G', 0x2aff66, -0.32]].forEach(([k, c, dy]) => {
      const m = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: 0x330a0a }));
      m.position.set(0, 3.4 + dy, 0.17); this.group.add(m); this.lamps[k] = m;
    });
    scene.add(this.group);
    this.setState('RED');
  }
  setState(s) {
    this.state = s;
    this.lamps.R.material.color.setHex(s === 'RED' ? 0xff2a2a : 0x3a0d0d);
    this.lamps.Y.material.color.setHex(s === 'YELLOW' ? 0xffb020 : 0x3a2c0d);
    this.lamps.G.material.color.setHex(s === 'GREEN' ? 0x2aff66 : 0x0d3a18);
  }
  update(dt) {
    this.t += dt;
    const cycle = this.t % 18;
    this.setState(cycle < 8 ? 'RED' : cycle < 10 ? 'YELLOW' : 'GREEN');
  }
}
