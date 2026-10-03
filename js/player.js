// Player Controller + Camera Controller (third-person follow).
import * as THREE from 'three';
import { makePerson } from './world.js';

export class PlayerController {
  constructor(scene, colliders) {
    this.person = makePerson({ shirt: 0xcfc4ae, pants: 0x5a5148 }); // night kurta tone
    this.group = this.person.group;
    scene.add(this.group);
    this.pos = new THREE.Vector3(0, 0, 0);
    this.yaw = Math.PI;       // facing
    this.vel = new THREE.Vector3();
    this.speed = 0;
    this.walkSpeed = 2.4; this.runSpeed = 4.6;
    this.radius = 0.35;
    this.colliders = colliders; // array of {minX,maxX,minZ,maxZ}
    this.animT = 0;
    this.formal = false;
    this.seated = false;
  }
  setFormal() { this.formal = true; this.person.setShirt(0xf5f2ea); }
  place(x, z, yaw) { this.pos.set(x, 0, z); this.yaw = yaw; this.sync(); }
  sync() { this.group.position.copy(this.pos); this.group.rotation.y = this.yaw; }
  update(dt, move, camYaw, run) {
    if (this.seated) { this.person.idle(this.animT += dt); return; }
    let ix = move.x, iz = move.z;
    const has = Math.hypot(ix, iz) > 0.01;
    const target = run ? this.runSpeed : this.walkSpeed;
    if (has) {
      // camera-relative
      const ang = Math.atan2(ix, iz) + camYaw + Math.PI;
      const tx = Math.sin(ang), tz = Math.cos(ang);
      this.vel.x += (tx * target - this.vel.x) * Math.min(1, dt * 10);
      this.vel.z += (tz * target - this.vel.z) * Math.min(1, dt * 10);
      // face movement
      const want = Math.atan2(this.vel.x, this.vel.z);
      let d = want - this.yaw;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      this.yaw += d * Math.min(1, dt * 12);
    } else {
      this.vel.x *= Math.max(0, 1 - dt * 10); this.vel.z *= Math.max(0, 1 - dt * 10);
    }
    this.speed = Math.hypot(this.vel.x, this.vel.z);
    // integrate + collide (circle vs AABB, axis separated)
    this.tryMove(dt);
    this.animT += dt;
    if (this.speed > 0.2) this.person.walk(this.animT, this.speed / this.runSpeed);
    else this.person.idle(this.animT);
    this.sync();
  }
  tryMove(dt) {
    const nx = this.pos.x + this.vel.x * dt;
    if (!this.hits(nx, this.pos.z)) this.pos.x = nx; else this.vel.x = 0;
    const nz = this.pos.z + this.vel.z * dt;
    if (!this.hits(this.pos.x, nz)) this.pos.z = nz; else this.vel.z = 0;
  }
  hits(x, z) {
    const r = this.radius;
    for (const c of this.colliders) {
      if (x + r > c.minX && x - r < c.maxX && z + r > c.minZ && z - r < c.maxZ) return true;
    }
    return false;
  }
}

export class CameraController {
  constructor(camera, dom) {
    this.cam = camera;
    this.yaw = Math.PI; this.pitch = 0.32;
    this.dist = 3.4;
    this.shake = 0; // ORDER-driven micro shake
    this.target = new THREE.Vector3();
  }
  addLook(dx, dy) {
    this.yaw -= dx;
    this.pitch += dy;
    this.pitch = Math.max(-0.15, Math.min(1.05, this.pitch));
  }
  clampDist(focus, want, colliders) {
    let d = want;
    if (colliders) {
      const dx = -Math.sin(this.yaw) * Math.cos(this.pitch);
      const dz = -Math.cos(this.yaw) * Math.cos(this.pitch);
      for (; d > 0.8; d -= 0.15) {
        const px = focus.x + dx * d, pz = focus.z + dz * d;
        let hit = false;
        for (const c of colliders) {
          if (px > c.minX - 0.3 && px < c.maxX + 0.3 && pz > c.minZ - 0.3 && pz < c.maxZ + 0.3) { hit = true; break; }
        }
        if (!hit) break;
      }
    }
    return d;
  }
  update(dt, focus, orderN, colliders) {
    // gentle drift: disorder makes camera breathe slightly closer
    const wantDist = 3.4 - orderN * 0.5;
    // pull camera in when a wall stands between player and camera (2D AABB test)
    const d = this.clampDist(focus, wantDist, colliders);
    this.dist += (d - this.dist) * Math.min(1, dt * 10);
    this.shake = orderN; // 0..1
    const t = performance.now() * 0.001;
    const shx = this.shake > 0.02 ? Math.sin(t * 9.3) * 0.03 * this.shake : 0;
    const shy = this.shake > 0.02 ? Math.cos(t * 7.7) * 0.03 * this.shake : 0;
    const cx = focus.x - Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist;
    const cz = focus.z - Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist;
    const cy = 1.55 + Math.sin(this.pitch) * this.dist;
    this.target.set(cx + shx, cy + shy, cz);
    this.cam.position.lerp(this.target, Math.min(1, dt * 8));
    this.cam.lookAt(focus.x + shx, 1.35 + shy, focus.z);
  }
  snap(focus, colliders, want) {
    this.dist = this.clampDist(focus, want || this.dist, colliders);
    const cx = focus.x - Math.sin(this.yaw) * Math.cos(this.pitch) * this.dist;
    const cz = focus.z - Math.cos(this.yaw) * Math.cos(this.pitch) * this.dist;
    this.cam.position.set(cx, 1.55 + Math.sin(this.pitch) * this.dist, cz);
    this.cam.lookAt(focus.x, 1.35, focus.z);
  }
}
