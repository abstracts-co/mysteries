const LOOPS = ['jet_cabin', 'jet_engine', 'prop_engine', 'wind', 'ocean', 'rumble'];
const SHOTS = ['thunder', 'radio', 'morse', 'alarm', 'blast'];
const AS = (p) => (globalThis.__ASSETS__ || '') + p;
export class Sound {
  constructor() { this.muted = false; this.ctx = null; this.buf = {}; this.loops = {}; this.narr = null; this.timing = null; this.ready = false; }
  unlock() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const C = window.AudioContext || window.webkitAudioContext; if (!C) return;
    this.ctx = new C(); this.master = this.ctx.createGain(); this.master.gain.value = this.muted ? 0 : 1; this.master.connect(this.ctx.destination);
    this.bed = this.ctx.createGain(); this.bed.gain.value = .9; this.bed.connect(this.master);
    this.load();
  }
  async load() {
    await Promise.all([...LOOPS, ...SHOTS].map(async (n) => {
      try { const r = await fetch(AS(`audio/sfx/${n}.mp3`)); if (!r.ok) return; this.buf[n] = await this.ctx.decodeAudioData(await r.arrayBuffer()); } catch { /* missing effect stays silent */ }
    }));
    for (const n of LOOPS) if (this.buf[n]) {
      const s = this.ctx.createBufferSource(); s.buffer = this.buf[n]; s.loop = true; const g = this.ctx.createGain(); g.gain.value = 0; s.connect(g); g.connect(this.bed); s.start(); this.loops[n] = { s, g };
    }
    this.ready = true;
  }
  mix(m) {
    if (!this.ctx) return; const t = this.ctx.currentTime;
    for (const [n, v] of Object.entries(m)) { const l = this.loops[n]; if (l) { l.g.gain.setTargetAtTime(v, t, .35); if (n.endsWith('engine')) l.s.playbackRate.setTargetAtTime(m.rate ?? 1, t, .4); } }
  }
  shot(name, gain = .7) {
    if (!this.ctx || !this.buf[name]) return; const s = this.ctx.createBufferSource(); s.buffer = this.buf[name]; const g = this.ctx.createGain(); g.gain.value = gain; s.connect(g); g.connect(this.bed); s.start();
  }
  setMuted(v) { this.muted = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0 : 1, this.ctx.currentTime, .05); if (this.narr) this.narr.muted = v; }
  async story(id) {
    this.stopNarr(); this.timing = null;
    try { const r = await fetch(AS(`audio/${id}.json`)); if (r.ok) this.timing = await r.json(); } catch { /* no timing means captions only */ }
    if (this.timing) { this.narr = new Audio(AS(`audio/${id}.mp3`)); this.narr.preload = 'auto'; this.narr.muted = this.muted; }
    return this.timing;
  }
  sync(pos, playing, rate) {
    const n = this.narr; if (!n) return;
    n.playbackRate = rate;
    if (pos == null || !playing) { if (!n.paused) n.pause(); return; }
    const now = performance.now();
    if (n.readyState >= 2 && !n.seeking && Math.abs(n.currentTime - pos) > .5 && now - (this.lastSeek || 0) > 1000) { this.lastSeek = now; try { n.currentTime = pos; } catch { /* still loading */ } }
    if (n.paused && !this.starting) { this.starting = true; n.play().catch(() => {}).finally(() => { this.starting = false; }); }
  }
  stopNarr() { if (this.narr) { this.narr.pause(); this.narr.src = ''; this.narr = null; } }
  quiet() { if (!this.ctx) return; const t = this.ctx.currentTime; for (const l of Object.values(this.loops)) l.g.gain.setTargetAtTime(0, t, .5); this.stopNarr(); }
}
