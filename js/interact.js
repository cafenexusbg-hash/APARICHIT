// Interaction System — nearest interactable within radius + facing; prompt via callback.
export class InteractionSystem {
  constructor() { this.items = []; this.current = null; }
  clear() { this.items = []; this.current = null; }
  add(item) { // {id, x, z, r, label, action, when?}
    item.r = item.r || 1.6;
    this.items.push(item);
  }
  remove(id) { this.items = this.items.filter(i => i.id !== id); if (this.current?.id === id) this.current = null; }
  update(playerPos, onPrompt) {
    let best = null, bd = 1e9;
    for (const it of this.items) {
      if (it.when && !it.when()) continue;
      const d = Math.hypot(playerPos.x - it.x, playerPos.z - it.z);
      if (d < it.r && d < bd) { bd = d; best = it; }
    }
    this.current = best;
    if (onPrompt) onPrompt(best ? best.label : null);
    return best;
  }
  tryInteract() {
    if (this.current) { const a = this.current.action; const id = this.current.id; if (a) a(); return id; }
    return null;
  }
}
