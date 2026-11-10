import puppeteer from 'puppeteer-core';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
const [id, from = 0, to = 1e9, every = 2, name = id, w = 640, h = 400] = process.argv.slice(2);
const dir = `${process.env.OUT}/${name}/`; rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=gl-egl', '--use-gl=angle', '--hide-scrollbars'], protocolTimeout: 1800000 });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:8043${process.env.PAGE || '/artifact/index.html'}`);
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 120000 });
const len = await p.evaluate(async (id, from) => { const M = window.__mysteries; await M.open(id, { paused: 1 }); M.step(5, 1 / 30); if (+from > 0) { M.seekS(+from); M.story(); } M.play(); M.step(2, 1 / 30); return M.sim().storyLen; }, id, from);
const end = Math.min(+to, len + 1.5), n = Math.ceil((end - +from) / +every), per = Math.round(+every * 30), log = [];
for (let i = 0; i < n; i++) {
  const r = await p.evaluate((per) => { const M = window.__mysteries; M.step(per, 1 / 30); const s = M.state(); return { story: +s.story.toFixed(2), rig: s.rig, ended: s.ended }; }, per);
  log.push(r);
  await p.screenshot({ path: `${dir}${String(i).padStart(4, '0')}.jpg`, type: 'jpeg', quality: 78 });
}
writeFileSync(`${dir}log.json`, JSON.stringify(log));
console.log(id, 'frames', n, 'errors', errs.length ? errs.slice(0, 3) : 'none'); await b.close();
