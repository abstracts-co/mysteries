import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
const out = process.env.OUT; mkdirSync(out, { recursive: true });
const ids = (process.env.IDS || 'af447,mh370,twa800,egyptair990,airnz901,jal123,stardust,earhart,ladybegood,flight19').split(',');
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox','--ignore-gpu-blocklist','--enable-webgl','--hide-scrollbars','--use-angle=gl-egl','--use-gl=angle'], protocolTimeout: 1800000 });
const p = await b.newPage(); await p.setViewport({ width: 960, height: 600 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto('http://127.0.0.1:8043/artifact/index.html?shot=1');
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 300000 });
const meta = {};
for (const id of ids) {
  const beats = await p.evaluate(async (id) => { const M = window.__mysteries; await M.open(id, { paused: 1 }); M.step(10, 1 / 30); return M.beats().map((B) => ({ s: B.s, len: B.len, v: B.v || 'follow', text: B.text, t: B.t, e: B.e, sfx: B.sfx, rate: B.rate, w0: B.w0 })); }, id);
  meta[id] = beats;
  for (const [i, B] of beats.entries()) for (const [k, f] of (process.env.FR || 'a:.18,b:.82').split(',').map((x) => x.split(':')).map(([k, v]) => [k, +v])) {
    const st = await p.evaluate((s) => { const M = window.__mysteries; M.seekS(s); M.story(); M.step(70, 1 / 30); const S = M.state(), c = M.crash(), q = c.s; return { rig: S.rig, rt: S.rt, alt: q && Math.round(q.altFt), pitch: q && +q.pitch.toFixed(1), roll: q && +q.roll.toFixed(1), vs: q && Math.round(q.vs ?? 0), gs: q && Math.round(q.gs ?? 0) }; }, B.s + B.len * f);
    B[k] = st;
    await p.screenshot({ path: `${out}/${id}-${String(i).padStart(2, '0')}${k}.jpg`, type: 'jpeg', quality: 80 });
  }
  console.log(id, beats.length);
}
writeFileSync(`${out}/meta.json`, JSON.stringify(meta));
console.log('errors', errs.length ? errs.slice(0, 5) : 'none'); await b.close();
