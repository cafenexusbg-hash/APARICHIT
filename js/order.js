// Psychological ORDER system — invisible variable 0..100.
// Disorder events call observe(). Effects stay subtle: audio, heartbeat, camera, vignette.
import { AudioSys } from './audio.js';
export const Order = {
  value: 0,
  reset() { this.value = 0; window.__ORDER = 0; AudioSys.setOrderLevel(0); },
  observe(amount, note) {
    this.value = Math.min(100, this.value + amount);
    window.__ORDER = this.value;
    AudioSys.setOrderLevel(this.value);
    if (note && window.__toast) window.__toast(note);
  },
  norm() { return this.value / 100; }
};
window.__ORDER = 0;
window.__toast = null;
