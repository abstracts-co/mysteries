import puppeteer from 'puppeteer-core';
import { mkdirSync as mkd0, rmSync as rm0, statSync as st0 } from 'node:fs';
const SLOTLOCK = new URL('../.scratch/locks/', import.meta.url).pathname; mkd0(SLOTLOCK, { recursive: true });
let slot = null;
while (slot == null) { for (let i = 0; i < (+process.env.CAPTURE_SLOTS || 3); i++) { const d = `${SLOTLOCK}slot-${i}`; try { if (Date.now() - st0(d).mtimeMs > 20 * 60000) rm0(d, { recursive: true, force: true }); } catch {} try { mkd0(d); slot = d; break; } catch {} } if (slot == null) await new Promise((r) => setTimeout(r, 3000)); }
const freeSlot = () => { try { rm0(slot, { recursive: true, force: true }); } catch {} };
process.on('exit', freeSlot); process.on('SIGINT', () => process.exit(130)); process.on('SIGTERM', () => process.exit(143));

const args = process.argv.slice(2), spec = JSON.parse(args[0]);
const gl = process.env.GL || 'swiftshader';
const flags = ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--hide-scrollbars', ...(gl === 'gpu' ? ['--use-angle=gl-egl', '--use-gl=angle', '--enable-gpu-rasterization'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'])];
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: flags, protocolTimeout: 900000 });
const p = await b.newPage(); const errs = [];
p.on('pageerror', (e) => errs.push('page: ' + e.message)); p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warn') errs.push(m.text().slice(0, 500)); });
await p.setViewport({ width: spec.w || 580, height: spec.h || 650, deviceScaleFactor: spec.dpr || 1 });
await p.goto(`http://127.0.0.1:8043/${spec.page || 'artifact/index.html'}${spec.query || ''}`);
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 300000 });
const dir = process.env.SHOTS_DIR ? process.env.SHOTS_DIR.replace(/\/?$/, '/') : new URL('../shots/', import.meta.url).pathname;
import('node:fs').then((fs) => fs.mkdirSync(dir, { recursive: true }));
const info = await p.evaluate(() => { const c = document.createElement('canvas').getContext('webgl2'); const d = c.getExtension('WEBGL_debug_renderer_info'); return d ? c.getParameter(d.UNMASKED_RENDERER_WEBGL) : 'n/a'; });
console.log('gl', info);
for (const s of spec.steps) {
  const t0 = Date.now();
  const res = await p.evaluate(async (s) => {
    const M = window.__mysteries;
    if (s.open) { await M.open(s.open, { paused: 1 }); }
    if (s.seek != null) { const sim = M.sim(); const rt = typeof s.seek === 'string' ? Date.parse(s.seek) / 1000 - sim.t0 : s.seek; M.seek(rt); }
    if (s.beat != null) { const B = M.beats()[s.beat]; M.seekS(B.s + (s.into ?? 1.2)); M.story(); }
    if (s.storyS != null) { M.seekS(s.storyS); M.story(); }
    if (s.rig) M.rig(s.rig, s.opts || {});
    if (s.G) Object.assign(M.G, s.G);
    if (s.noclouds) M.world().setEnv({ layers: [] });
    if (s.nofog) M.world().setEnv({ fogVis: 0 });
    M.step(s.frames ?? 3, s.dt ?? 1 / 30);
    const st = M.state(); const B = M.beats?.(); return { ...st, beat: B ? B.findIndex((b, i) => b.s <= st.story && (!B[i + 1] || B[i + 1].s > st.story)) : null };
  }, s);
  await new Promise((r) => setTimeout(r, 60));
  if (s.name) await p.screenshot({ path: `${dir}${s.name}.png` });
  console.log(s.name, JSON.stringify(res), `${Date.now() - t0}ms`);
}
console.log('errors', errs.length ? [...new Set(errs)].slice(0, 12) : 'none');
await b.close();
