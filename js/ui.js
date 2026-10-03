// UI System — objectives, prompts, subtitles, toasts, fades, menus.
export const UI = {
  el: {},
  init() {
    const $ = (id) => document.getElementById(id);
    ['hud','objective-panel','objective-title','objective-text','objective-count','prompt','prompt-key','prompt-text','subtitle','toast','gamepad-hint','scene-label','menu','pause-menu','intro','intro-text','intro-sub','complete','fade','vignette','btn-start','btn-continue','btn-how','howto','quality-select','quality-select-2','mute-check','mute-check-2','btn-resume','btn-restart','btn-quit','btn-back-menu','btn-skip','loading'].forEach(id => this.el[id] = $(id));
    this.isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
    this.el['prompt-key'].textContent = this.isTouch ? 'TAP' : 'E';
  },
  showHUD(v) { this.el.hud.classList.toggle('hidden', !v); },
  setObjective(title, text, idx, total) {
    this.el['objective-title'].textContent = title;
    this.el['objective-text'].textContent = text;
    this.el['objective-count'].textContent = total ? `${idx} / ${total}` : '';
  },
  prompt(text, key) {
    if (!text) { this.el.prompt.classList.add('hidden'); return; }
    this.el.prompt.classList.remove('hidden');
    this.el['prompt-text'].textContent = text;
    if (key) this.el['prompt-key'].textContent = key;
  },
  subtitle(text, ms = 0) {
    if (!text) { this.el.subtitle.classList.add('hidden'); return; }
    this.el.subtitle.innerHTML = text;
    this.el.subtitle.classList.remove('hidden');
    clearTimeout(this._subT);
    if (ms) this._subT = setTimeout(() => this.el.subtitle.classList.add('hidden'), ms);
  },
  toast(text, ms = 2600) {
    if (!text) { this.el.toast.classList.add('hidden'); return; }
    this.el.toast.textContent = text;
    this.el.toast.classList.remove('hidden');
    clearTimeout(this._toastT);
    this._toastT = setTimeout(() => this.el.toast.classList.add('hidden'), ms);
  },
  sceneLabel(text, ms = 2400) {
    const el = this.el['scene-label'];
    el.textContent = text; el.style.opacity = 1; el.classList.remove('hidden');
    clearTimeout(this._slT);
    this._slT = setTimeout(() => { el.style.opacity = 0; }, ms);
  },
  fade(inOut, ms = 800) {
    const f = this.el.fade;
    f.style.transitionDuration = ms + 'ms';
    f.style.opacity = inOut === 'in' ? 0 : 1;
    return new Promise(r => setTimeout(r, ms + 30));
  },
};
