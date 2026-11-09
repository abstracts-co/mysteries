import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname, tmp = `${ROOT}build/.stories.mjs`;
await build({ entryPoints: [`${ROOT}src/stories.js`], bundle: true, format: 'esm', platform: 'node', outfile: tmp, nodePaths: [`${ROOT}build/node_modules`], logLevel: 'error' });
const { STORIES } = await import(`${tmp}?${Date.now()}`); rmSync(tmp);
const ids = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(STORIES);

function pauses(mp3, a, b) {
  return spawnSync('ffmpeg', ['-hide_banner', '-ss', String(a), '-to', String(b), '-i', mp3, '-af', 'silencedetect=noise=-35dB:d=0.12', '-f', 'null', '-'], { encoding: 'utf8' }).stderr || '';
}
function silences(mp3, a, b) {
  const txt = pauses(mp3, a, b);
  const S = [], st = [...txt.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), en = [...txt.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]);
  for (let i = 0; i < st.length; i++) S.push({ s: st[i], e: en[i] ?? b - a });
  return S;
}
function anchors(text, sil, len) {
  const T = text.split(/\s+/), C = [0]; for (const w of T) C.push(C[C.length - 1] + w.length + 1.5);
  const W = C[C.length - 1], lead = sil.find((x) => x.s < .05), trail = sil.find((x) => x.e > len - .05 && x.s > .05);
  const S0 = lead ? lead.e : 0, S1 = trail ? trail.s : len;
  const P = sil.filter((x) => x !== lead && x !== trail && x.s > S0 && x.e < S1);
  const bounds = []; T.forEach((w, k) => { if (k < T.length - 1 && /[,.;:?!—–"”)]$/.test(w)) bounds.push({ c: C[k + 1], str: /[.?!]["”]?$/.test(w) ? 2 : 1 }); });
  const exp = (c) => S0 + (S1 - S0) * c / W, nb = bounds.length, np = P.length, INF = 1e9;
  const D = Array.from({ length: nb + 1 }, () => new Array(np + 1).fill(INF)), K = Array.from({ length: nb + 1 }, () => new Array(np + 1).fill(null));
  D[0][0] = 0;
  for (let i = 0; i <= nb; i++) for (let j = 0; j <= np; j++) {
    const d = D[i][j]; if (d >= INF) continue;
    if (i < nb && j < np) { const p = P[j], m = (p.s + p.e) / 2, c = Math.abs(exp(bounds[i].c) - m) - .25 * bounds[i].str * Math.min(p.e - p.s, .6); if (d + c < D[i + 1][j + 1]) { D[i + 1][j + 1] = d + c; K[i + 1][j + 1] = 'm'; } }
    if (i < nb) { const c = bounds[i].str === 2 ? .7 : .25; if (d + c < D[i + 1][j]) { D[i + 1][j] = d + c; K[i + 1][j] = 'b'; } }
    if (j < np) { const c = .15 + (P[j].e - P[j].s); if (d + c < D[i][j + 1]) { D[i][j + 1] = d + c; K[i][j + 1] = 'p'; } }
  }
  const pairs = []; let i = nb, j = np;
  while (i > 0 || j > 0) { const k = K[i][j]; if (k === 'm') { pairs.push([bounds[i - 1], P[j - 1]]); i--; j--; } else if (k === 'b') i--; else j--; }
  pairs.reverse();
  const A = [[0, S0]]; for (const [bd, p] of pairs) { A.push([(bd.c - .01) / W, p.s]); A.push([bd.c / W, p.e]); } A.push([1, S1]);
  for (let k = 1; k < A.length; k++) if (A[k][1] < A[k - 1][1]) A[k][1] = A[k - 1][1];
  return { anchors: A.map(([c, t]) => [+c.toFixed(4), +t.toFixed(3)]), matched: pairs.length, bounds: nb, pauses: np };
}

for (const id of ids) {
  const jf = `${ROOT}artifact/audio/${id}.json`, mp3 = `${ROOT}artifact/audio/${id}.mp3`;
  let J; try { J = JSON.parse(readFileSync(jf, 'utf8')); } catch { continue; }
  const beats = STORIES[id].beats, rep = [];
  J.beats.forEach((seg, i) => { const B = beats[i]; if (!B || !seg) return; const len = seg.end - seg.start, r = anchors(B.text, silences(mp3, seg.start, seg.end), len); seg.anchors = r.anchors; rep.push(`${r.matched}/${r.bounds}`); });
  writeFileSync(jf, JSON.stringify(J));
  console.log(id, rep.join(' '));
}
