import { readFileSync } from 'node:fs';
const [file, top = 12, dump = ''] = process.argv.slice(2), R = JSON.parse(readFileSync(file, 'utf8'));
const mul = (a, b) => [a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1], a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0], a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3], a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]];
const om = (a, b, dt) => { let d = mul([-a[0], -a[1], -a[2], a[3]], b); if (d[3] < 0) d = d.map((x) => -x); const s = Math.hypot(d[0], d[1], d[2]), ang = 2 * Math.atan2(s, d[3]) * 57.2958, k = s > 1e-12 ? ang / s / dt : 0; return [d[0] * k, d[1] * k, d[2] * k]; };
const Q = (r) => r.slice(10, 14), hits = [], cuts = [];
for (let i = 2; i < R.length; i++) {
  const a = R[i - 2], b = R[i - 1], c = R[i]; if ([a, b, c].some((x) => x[4] > .02 || x[5] > .02) || a[2] !== c[2] || c[2] === 'route' || c[2] === 'globe') continue;
  const w1 = om(Q(a), Q(b), b[3]), w2 = om(Q(b), Q(c), c[3]), dw = Math.hypot(w2[0] - w1[0], w2[1] - w1[1], w2[2] - w1[2]), jump = dw * c[3], inside = !/follow|above|below/.test(c[2]);
  let sj = 0; if (!inside && c[18] && b[18] && a[18]) { const vx1 = (b[7] - a[7]) / b[3], vx2 = (c[7] - b[7]) / c[3], vy1 = (b[8] - a[8]) / b[3], vy2 = (c[8] - b[8]) / c[3]; sj = Math.hypot(vx2 - vx1, vy2 - vy1) * c[3] / c[17] * 100; }
  if (jump > 4 || sj > 12 || Math.abs(c[1] - b[1]) > 6 * c[3] + .3 || Math.abs(b[1] - a[1]) > 6 * b[3] + .3) { cuts.push(c[0]); continue; }
  if ((jump > .05 && dw > 12) || sj > .12) hits.push({ s: c[0], rig: c[2], jump, sj, ct: c[6], w: Math.hypot(...w2) });
}
const real = hits.filter((h) => !cuts.some((t) => Math.abs(t - h.s) < .06)), G = [];
for (const h of real) { const g = G[G.length - 1]; if (g && h.s - g.s1 < .4 && g.rig === h.rig) { g.s1 = h.s; g.n++; g.jump = Math.max(g.jump, h.jump); g.sj = Math.max(g.sj, h.sj); g.ct = Math.min(g.ct, h.ct); } else G.push({ s0: h.s, s1: h.s, rig: h.rig, n: 1, jump: h.jump, sj: h.sj, ct: h.ct }); }
console.log(file.split('/').pop(), 'frames', R.length, 'cuts', new Set(cuts.map((t) => t.toFixed(1))).size, 'twitch frames', real.length, 'groups', G.length);
for (const g of G.sort((a, b) => b.n * (b.jump + b.sj) - a.n * (a.jump + a.sj)).slice(0, +top)) console.log(`  ${g.s0.toFixed(1)}–${g.s1.toFixed(1)}s ${g.rig}${g.ct < 1 ? ' (camera move)' : ''} n=${g.n} rot ${g.jump.toFixed(2)}°/frame screen ${g.sj.toFixed(2)}%/frame`);
if (dump) { const [a, b, ev = 4] = dump.split(','); let n = 0, pq = null, pr = null; for (const r of R) { if (r[0] < +a || r[0] > +b) { pq = Q(r); pr = r; continue; } const w = pq ? om(pq, Q(r), r[3]) : [0, 0, 0]; if (n++ % +ev === 0) console.log(r[0].toFixed(3), 'rt', r[1].toFixed(2), r[2], 'fd', r[4].toFixed(2), 'ct', r[6].toFixed(2), 'scr', r[7].toFixed(3), r[8].toFixed(3), 'd', r[9].toFixed(1), 'ω', w.map((x) => x.toFixed(1)).join(' '), '| sim p/r/h', r[14].toFixed(2), r[15].toFixed(2), r[16].toFixed(2)); pq = Q(r); pr = r; } }
