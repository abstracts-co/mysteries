import puppeteer from 'puppeteer-core';
const [id, from = 0, dur = 400, w = 1920, h = 1080] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=gl-egl', '--use-gl=angle', '--mute-audio', '--autoplay-policy=no-user-gesture-required', ...(process.env.FLAGS || '').split(' ').filter(Boolean)], protocolTimeout: 1800000 });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.evaluateOnNewDocument(() => {
  const C = window.__C = { compile: 0, link: 0, tex: 0, texPx: 0, paint: 0, glms: 0 }, P = performance;
  const wrap = (proto, k, f) => { const o = proto[k]; proto[k] = function (...a) { const t = P.now(), r = o.apply(this, a); f(P.now() - t, a); return r; }; };
  for (const G of [WebGL2RenderingContext.prototype]) {
    wrap(G, 'compileShader', (ms) => { C.compile++; C.glms += ms; }); wrap(G, 'linkProgram', (ms) => { C.link++; C.glms += ms; }); wrap(G, 'getProgramParameter', (ms) => { C.glms += ms; });
    for (const k of ['texImage2D', 'texSubImage2D', 'texStorage2D', 'generateMipmap', 'texImage3D', 'compressedTexImage2D']) wrap(G, k, (ms, a) => { C.tex++; C.glms += ms; const s = a.find((x) => x && typeof x === 'object' && x.width); if (s) C.texPx += s.width * s.height; });
  }
  for (const k of ['fillText', 'fill', 'stroke', 'drawImage', 'fillRect', 'strokeText']) wrap(CanvasRenderingContext2D.prototype, k, (ms) => { C.paint += ms; });
});
await p.goto(`http://127.0.0.1:8043${process.env.PAGE || '/artifact/index.html'}`);
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 120000 });
const r = await p.evaluate(async (id, from, dur) => {
  const M = window.__mysteries, C = window.__C; const tOpen = performance.now(); await M.open(id, { paused: 1 }); const openMs = performance.now() - tOpen; if (from > 0) { M.seekS(from); M.story(); } M.play();
  const F = [], Z = () => { const o = { ...C }; for (const k in C) C[k] = 0; return o; }; Z(); let last = performance.now(); const t0 = last;
  await new Promise((res) => { const f = (now) => { const st = M.state(), c = Z(), d = now - last; last = now; F.push(d); if (d > 28 && F.length > 3) (F.h ??= []).push(`${st.story.toFixed(1)}s ${st.rig} ${d.toFixed(0)}ms${c.compile ? ` compile×${c.compile}` : ''}${c.link ? ` link×${c.link}` : ''}${c.tex ? ` tex×${c.tex}(${(c.texPx / 1e6).toFixed(1)}MP)` : ''}${c.paint > 1 ? ` paint ${c.paint.toFixed(0)}ms` : ''} gl ${c.glms.toFixed(0)}ms`); if (now - t0 < dur * 1000 && !st.ended) requestAnimationFrame(f); else res(); }; requestAnimationFrame(f); });
  M.pause(); const t = F.slice(3).sort((a, c) => a - c);
  return { openMs: Math.round(openMs), frames: F.length, fps: +(1000 * t.length / t.reduce((a, c) => a + c, 0)).toFixed(1), p99: +t[Math.floor(t.length * .99)].toFixed(1), hitches: (F.h || []).length, list: F.h || [] };
}, id, +from, +dur);
console.log(id, JSON.stringify({ ...r, list: undefined }), errs.length ? errs.slice(0, 3) : ''); console.log(r.list.map((x) => '  ' + x).join('\n')); await b.close();
