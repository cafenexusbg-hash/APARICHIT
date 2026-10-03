// Quality + platform config. Part of cross-platform architecture.
export const Quality = {
  level: 'auto', // auto|low|medium|high
  resolved: 'medium',
  pixelRatio: 1,
  shadows: true,
  npcScale: 1,
  antialias: true,
  resolve() {
    let l = this.level;
    if (l === 'auto') {
      const mobile = /Android|iPhone|iPad|Mobile/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && Math.min(screen.width, screen.height) < 820);
      const cores = navigator.hardwareConcurrency || 4;
      l = (mobile && cores <= 4) ? 'low' : (mobile ? 'medium' : 'high');
      // small screens default down one notch
      if (Math.min(screen.width, screen.height) < 500 && l === 'high') l = 'medium';
    }
    this.resolved = l;
    const pr = Math.min(window.devicePixelRatio || 1, 2);
    if (l === 'low') { this.pixelRatio = Math.min(pr, 0.85); this.shadows = false; this.npcScale = 0.55; this.antialias = false; }
    else if (l === 'medium') { this.pixelRatio = Math.min(pr, 1.25); this.shadows = true; this.npcScale = 0.8; this.antialias = true; }
    else { this.pixelRatio = pr; this.shadows = true; this.npcScale = 1; this.antialias = true; }
    return l;
  }
};
export const IS_TOUCH = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
