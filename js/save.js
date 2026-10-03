// Save System — modular, future chapters can extend the shape.
const KEY = 'aparichit_ch1_save_v1';
export const SaveSys = {
  data: null,
  load() {
    try {
      const raw = localStorage.getItem(KEY);
      this.data = raw ? JSON.parse(raw) : null;
    } catch { this.data = null; }
    return this.data;
  },
  write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); this.data = d; } catch {} },
  clear() { try { localStorage.removeItem(KEY); } catch {} this.data = null; },
  has() { return !!this.load(); }
};
