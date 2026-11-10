import puppeteer from 'puppeteer-core';
const [id, from = 0, dur = 40, w = 1920, h = 1080] = process.argv.slice(2);
const extra = (process.env.FLAGS || '').split(' ').filter(Boolean);
const b = await puppeteer.launch({ executablePath: '/usr/bin/google-chrome', headless: 'new', args: ['--no-sandbox', '--ignore-gpu-blocklist', '--enable-webgl', '--use-angle=gl-egl', '--use-gl=angle', '--autoplay-policy=no-user-gesture-required', '--mute-audio', ...extra], protocolTimeout: 900000 });
const p = await b.newPage(); await p.setViewport({ width: +w, height: +h }); const errs = []; p.on('pageerror', (e) => errs.push(e.message));
await p.goto(`http://127.0.0.1:8043${process.env.PAGE || '/artifact/index.html'}`);
await p.waitForFunction(() => !document.querySelector('#load') || document.querySelector('#load').style.opacity === '0', { timeout: 120000 });
await new Promise((r) => setTimeout(r, 2500));
const r = await p.evaluate(async (id, from, dur) => {
  const M = window.__mysteries, w = M.world(), R = w.render.bind(w), F = []; let last = 0; w.render = (dt, st) => { R(dt, st); if (!st.noShow) { const now = performance.now(); F.push([now - last, M.state().story, M.state().rig, window.__q()]); last = now; } };
  const t0 = performance.now(); await M.open(id, from > 0 ? { paused: 1 } : {}); const openMs = performance.now() - t0, pace0 = window.__pace(); if (from > 0) { M.seekS(from); M.story(); M.play(); }
  F.length = 0; await new Promise((res) => { const f = () => { const st = M.state(); performance.now() - t0 - openMs < dur * 1000 && !st.ended ? setTimeout(f, 200) : res(); }; f(); });
  M.pause(); const X = F.slice(3), t = X.map((x) => x[0]).sort((a, c) => a - c), q = (k) => +t[Math.min(t.length - 1, Math.floor(t.length * k))].toFixed(1), med = q(.5);
  const hit = X.filter((x) => x[0] > med * 1.7).map((x) => `${x[1].toFixed(1)}s ${x[2]} ${x[0].toFixed(0)}ms`), gl = w.renderer.getContext(), d = gl.getExtension('WEBGL_debug_renderer_info');
  return { gpu: gl.getParameter(d.UNMASKED_RENDERER_WEBGL).replace(/ANGLE \(|, OpenGL.*/g, '').slice(0, 44), openMs: Math.round(openMs), start: pace0, end: window.__pace(), fps: +(1000 * t.length / t.reduce((a, c) => a + c, 0)).toFixed(1), p50: med, p95: q(.95), p99: q(.99), max: q(1), uneven: +(X.filter((x) => Math.abs(x[0] - med) > med * .35).length / X.length * 100).toFixed(1), qPath: [...new Set(X.map((x) => x[3]))].join('>'), long: hit.length, list: hit.slice(0, 14) };
}, id, +from, +dur);
console.log(id, `${w}x${h}`, JSON.stringify(r), errs.length ? errs.slice(0, 3) : ''); await b.close();
