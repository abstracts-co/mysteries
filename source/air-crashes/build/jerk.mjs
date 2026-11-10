import puppeteer from 'puppeteer-core';
import { writeFileSync, mkdirSync } from 'node:fs';
const [id, hz = 120, jit = 0] = process.argv.slice(2), OUT = process.env.OUT || new URL('../.scratch/jerk', import.meta.url).pathname; mkdirSync(OUT, { recursive: true });
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=gl-egl', '--use-gl=angle'], protocolTimeout: 1800000 });
const p = await b.newPage(); await p.setViewport({ width: 640, height: 360 }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:8043${process.env.PAGE || '/artifact/index.html'}`);
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 120000 });
const len = await p.evaluate(async (id) => { const M = window.__mysteries; await M.open(id, { paused: 1 }); M.step(5, 1 / 30); M.play(); return M.sim().flightEndS; }, id);
const rows = []; let done = false;
while (!done) {
  const r = await p.evaluate((hz, jit, len) => {
    const M = window.__mysteries, w = M.world(), out = [], T = window.THREE_V ??= { a: w.camEcef.clone(), b: w.camEcef.clone(), c: w.camEcef.clone() }; let k = window.__jk ?? 1;
    for (let i = 0; i < 600; i++) {
      k = (k * 16807) % 2147483647; const u = k / 2147483647, dt = (1 / hz) * (jit ? (u < .03 ? 3 : .6 + u * .8) : 1);
      M.step(1, dt); const c = M.crash(), s = M.state(), pr = M.probe(); if (s.story >= len - .05) { window.__jk = k; return { out, done: true }; }
      const inv = w.cam.matrixWorldInverse, f = T.a.copy(c.bodyF).transformDirection(inv), u2 = T.b.copy(c.bodyU).transformDirection(inv), rel = T.c.copy(c.posVis).sub(w.camEcef), d = rel.length(); rel.transformDirection(inv);
      const qc = w.cam.quaternion, qp = c.ac.group.quaternion, q = [-qc.x, -qc.y, -qc.z, qc.w], r = [q[3] * qp.x + q[0] * qp.w + q[1] * qp.z - q[2] * qp.y, q[3] * qp.y - q[0] * qp.z + q[1] * qp.w + q[2] * qp.x, q[3] * qp.z + q[0] * qp.y - q[1] * qp.x + q[2] * qp.w, q[3] * qp.w - q[0] * qp.x - q[1] * qp.y - q[2] * qp.z];
      out.push([s.story, s.rt, s.rig, dt, pr.fade, pr.dip, pr.ct, Math.atan2(rel.x, -rel.z) * 57.3, Math.atan2(rel.y, -rel.z) * 57.3, d, ...r, c.s.pitch, c.s.roll, c.s.hdg, w.cam.fov, rel.z < 0 ? 1 : 0]);
    }
    window.__jk = k; return { out, done: false };
  }, +hz, +jit, len);
  rows.push(...r.out); done = r.done || rows.length > 400000;
}
writeFileSync(`${OUT}/${id}-${hz}-${jit}.json`, JSON.stringify(rows));
console.log(id, 'frames', rows.length, 'errors', errs.length ? errs.slice(0, 3) : 'none'); await b.close();
