import puppeteer from 'puppeteer-core';
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--use-angle=gl-egl', '--use-gl=angle'] });
const p = await b.newPage();
await p.goto(`http://127.0.0.1:8043${process.env.PAGE || '/artifact/index.html'}?shot=1`);
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 120000 });
for (const id of ['af447', 'mh370', 'twa800', 'egyptair990', 'airnz901', 'jal123', 'stardust', 'earhart', 'ladybegood', 'flight19']) {
  const r = await p.evaluate(async (id) => {
    const M = window.__mysteries; await M.open(id, { paused: 1 }); const S = M.sim(), out = [];
    S.beats.forEach((B, i) => { if (B.t === 'end') return; for (let k = 0; k < 80; k++) { const s = B.s + B.len * (k + .5) / 80, r = (S.realOf(s + .02) - S.realOf(s)) / .02; let v = B.v || 'follow', lapse = B.lapse; for (const x of B.shots || []) if (x.u <= s - B.s) { v = x.v ?? v; lapse = x.lapse ?? lapse; } if (r > 1.7 && v !== 'map' && v !== 'above') out.push(`b${i}@${(s - B.s).toFixed(1)}s ${v} ×${r.toFixed(0)}${lapse ? ' lapse' : ''}`); } });
    return [...new Set(out.map((x) => x.replace(/@[\d.]+s/, '')))].join(' | ');
  }, id);
  console.log(id, r || 'ok');
}
await b.close();
