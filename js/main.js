// Boot entry. Applies saved quality/mute prefs, starts Game.
import { Game } from './game.js';
import { Quality } from './config.js';

const canvas = document.getElementById('game-canvas');
try {
  const q = localStorage.getItem('aparichit_quality');
  if (q) { Quality.level = q; document.getElementById('quality-select').value = q; document.getElementById('quality-select-2').value = q; }
} catch {}
document.getElementById('quality-select').addEventListener('change', (e) => { try { localStorage.setItem('aparichit_quality', e.target.value); } catch {} });
document.getElementById('quality-select-2').addEventListener('change', (e) => { try { localStorage.setItem('aparichit_quality', e.target.value); } catch {} });

const game = new Game(canvas);
game.boot();
window.__game = game; // for automated verification
