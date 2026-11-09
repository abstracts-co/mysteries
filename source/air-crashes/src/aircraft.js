import * as THREE from 'three';

const V3 = THREE.Vector3, D = Math.PI / 180;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v), lerp = (a, b, t) => a + (b - a) * t;
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const PHONE = typeof navigator !== 'undefined' && (/iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900));
const TS = PHONE ? .5 : 1;
function rng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const hashS = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
const pl = (xs, ys) => (x) => { if (x <= xs[0]) return ys[0]; for (let i = 1; i < xs.length; i++) if (x <= xs[i]) return lerp(ys[i - 1], ys[i], (x - xs[i - 1]) / (xs[i] - xs[i - 1] || 1)); return ys[ys.length - 1]; };
const tab = (rows, c = 1) => pl(rows.map((r) => r[0]), rows.map((r) => r[c]));
function spline(xs, ys) {
  const n = xs.length, m = new Float64Array(n), d = [];
  for (let i = 0; i < n - 1; i++) d.push((ys[i + 1] - ys[i]) / (xs[i + 1] - xs[i] || 1e-9));
  m[0] = d[0] ?? 0; m[n - 1] = d[n - 2] ?? 0;
  for (let i = 1; i < n - 1; i++) { const h0 = xs[i] - xs[i - 1], h1 = xs[i + 1] - xs[i]; m[i] = d[i - 1] * d[i] <= 0 ? 0 : 3 * (h0 + h1) / ((2 * h1 + h0) / d[i - 1] + (h1 + 2 * h0) / d[i]); }
  return (x) => {
    if (x <= xs[0]) return ys[0]; if (x >= xs[n - 1]) return ys[n - 1];
    let i = 0, j = n - 1; while (j - i > 1) { const k = (i + j) >> 1; if (xs[k] > x) j = k; else i = k; }
    const h = xs[j] - xs[i], t = (x - xs[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * h * m[i] + (3 * t2 - 2 * t3) * ys[j] + (t3 - t2) * h * m[j];
  };
}
function catmull(P, n = 6) {
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const p0 = P[Math.max(0, i - 1)], p1 = P[i], p2 = P[i + 1], p3 = P[Math.min(P.length - 1, i + 2)];
    for (let k = 0; k < n; k++) { const t = k / n, t2 = t * t, t3 = t2 * t; out.push(p1.map((_, c) => .5 * (2 * p1[c] + (p2[c] - p0[c]) * t + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * t2 + (3 * p1[c] - p0[c] - 3 * p2[c] + p3[c]) * t3))); }
  }
  out.push(P[P.length - 1].slice()); return out;
}

const cv = (w, h) => { const c = document.createElement('canvas'); c.width = Math.max(1, w | 0); c.height = Math.max(1, h | 0); return c; };
const layer = (W, H, fill) => { const c = cv(W, H), g = c.getContext('2d'); g.fillStyle = fill; g.fillRect(0, 0, W, H); return { c, g, W: c.width, H: c.height }; };
const ORM = (r, m) => `rgb(255,${clamp(r * 255, 0, 255) | 0},${clamp(m * 255, 0, 255) | 0})`;
const NRM = (x, y) => `rgb(${clamp(128 + x * 127, 0, 255) | 0},${clamp(128 + y * 127, 0, 255) | 0},255)`;
const N0 = 'rgb(128,128,255)', TCOL = (t) => (t > 0 ? `rgba(255,255,255,${t.toFixed(4)})` : `rgba(0,0,0,${(-t).toFixed(4)})`);
function tex(c, srgb, wrap) { const t = new THREE.CanvasTexture(c); t.premultiplyAlpha = true; t.flipY = false; t.anisotropy = 8; if (wrap) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }

const ENV = {};
function envTex(kind = 'p') {
  if (ENV[kind]) return ENV[kind];
  const metal = kind === 'm', sea = kind === 's', W = PHONE ? 1024 : 2048, H = W / 2, hz = H / 2, c = cv(W, H), g = c.getContext('2d', { willReadFrequently: true }), r = rng(31), k = W / 1536;
  let gr = g.createLinearGradient(0, 0, 0, hz);
  (metal ? [[0, '#7f97b8'], [.35, '#97adc9'], [.7, '#b6c6da'], [.92, '#d9e2ec'], [1, '#f2f6fa']] : sea ? [[0, '#34598c'], [.35, '#5679a8'], [.7, '#7f9cbf'], [.92, '#9fb5cf'], [1, '#bccbdc']] : [[0, '#3f6496'], [.35, '#6a8fbf'], [.7, '#a6bed9'], [.92, '#d7e2ee'], [1, '#f2f6fa']]).forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, 0, W, hz);
  const wrap = (x, f) => { for (const dx of [-W, 0, W]) if (x + dx > -W * .2 && x + dx < W * 1.2) f(x + dx); }, SP = {};
  const spr = (col, mid) => (SP[col + mid] ||= (() => { const s = cv(64, 64), q2 = s.getContext('2d'), q = q2.createRadialGradient(32, 32, 0, 32, 32, 32); q.addColorStop(0, `rgba(${col},1)`); if (mid) q.addColorStop(.7, `rgba(${col},${mid})`); q.addColorStop(1, `rgba(${col},0)`); q2.fillStyle = q; q2.fillRect(0, 0, 64, 64); return s; })());
  const blit = (s, x, y, rx, ry, a) => { g.globalAlpha = a; g.drawImage(s, x - rx, y - ry, rx * 2, ry * 2); g.globalAlpha = 1; };
  if (metal) for (let i = 0; i < 16; i++) { const y = hz * .4 * r() ** 1.5, w = W * (.15 + .35 * r()), sy = hz * (.015 + .03 * r()), a = .2 + .2 * r(); wrap(r() * W, (xx) => blit(spr('240,244,248'), xx, y, w, sy, a)); }
  const puff = (x, y, rad, a, col = '255,255,255') => wrap(x, (xx) => blit(spr(col, .85), xx, y, rad, rad, a));
  for (let i = 0; i < 60; i++) { const el = 1 + 10 * r() ** 2, y = hz - el / 90 * hz, w = (60 + 220 * r()) * k; wrap(r() * W, (xx) => blit(spr('255,255,255'), xx, y, w, w * .05, sea ? .28 : .55)); }
  for (let i = 0; i < 46; i++) {
    const el = 4 + 52 * r() ** 1.3, y0 = hz - el / 90 * hz, x0 = r() * W, sz = (14 + 40 * r()) * k * (1.2 - el / 90), n = 6 + (r() * 10 | 0);
    for (let j = 0; j < n; j++) { const dx = (r() - .5) * sz * 3.2, dy = -r() * sz * 1.1, rad = sz * (.45 + .6 * r()); puff(x0 + dx, y0 + dy, rad, .5 + .4 * r()); }
    for (let j = 0; j < n / 2; j++) puff(x0 + (r() - .5) * sz * 2.6, y0 + sz * .15, sz * .5, .25, '150,162,182');
  }
  g.fillStyle = `rgba(255,255,255,${sea ? .5 : .95})`; g.fillRect(0, hz - 2 * k, W, 2.5 * k);
  gr = g.createLinearGradient(0, hz, 0, H);
  (metal ? [[0, '#aab4be'], [.012, '#7e8891'], [.05, '#59626a'], [.3, '#40474e'], [1, '#30353b']] : sea ? [[0, '#a9b4be'], [.012, '#66737f'], [.05, '#3e4a56'], [.3, '#2b3540'], [1, '#222a33']] : [[0, '#cdd4da'], [.015, '#b8c0c7'], [.06, '#a9b1b8'], [.3, '#9ba3aa'], [1, '#8f979e']]).forEach(([o, col]) => gr.addColorStop(o, col));
  g.fillStyle = gr; g.fillRect(0, hz, W, hz);
  for (let i = 0; i < 260; i++) { const d = r() ** 1.5, y = hz + 3 * k + d * hz * .9, w = (20 + 120 * r()) * k * (.3 + d); wrap(r() * W, (xx) => { const dark = r() < .55; blit(spr(dark ? '20,26,30' : '150,156,148'), xx, y, w, w * (.12 + d * .5), dark ? .25 + .25 * r() : .2 + .2 * r()); }); }
  puff(W * .62, hz - hz * 40 / 90, 24 * k, 1, '255,250,238');
  const t = new THREE.CanvasTexture(c); t.mapping = THREE.EquirectangularReflectionMapping; t.colorSpace = THREE.SRGBColorSpace; return (ENV[kind] = t);
}

let GLOW = null;
const NIGHT = {};
const SEC = { nav: [.019, .036], tail: [.016, .032], strobe: [.022, .06], beacon: [.022, .048], land: [.016, .05] };
function glowOBR(r, sc, cam) {
  const u = this.userData, n = NIGHT[u.key] ?? 0, e = this.matrixWorld.elements, m = this.material;
  BV.setFromMatrixPosition(this.matrixWorld); BN.setFromMatrixPosition(cam.matrixWorld).sub(BV);
  const dist = BN.length() || 1, k0 = Math.hypot(e[0], e[1], e[2]) || 1; BN.multiplyScalar(1 / (dist * k0));
  const f = BN.x * e[0] + BN.y * e[1] + BN.z * e[2], up = Math.abs(BN.x * e[4] + BN.y * e[5] + BN.z * e[6]), sd = BN.x * e[8] + BN.y * e[9] + BN.z * e[10], az = Math.atan2(sd, f) / D;
  let k = u.sec == null ? 1 : u.sec ? sm(-12, -1, az * u.sec) * (1 - sm(104, 124, az * u.sec)) : sm(102, 122, Math.abs(az));
  if (u.sec != null) k = lerp(k, .75, sm(.55, .92, up));
  if (u.kind === 'land') k = sm(.1, .75, f) ** 1.5;
  const day = u.vin ? lerp(.22, .9, n) : u.kind === 'strobe' ? 1 : u.kind === 'beacon' ? lerp(.55, 1, n) : lerp(.38, 1, n), a = k * day * (u.e ?? 1);
  const w = u.sz * lerp(.55, 1, Math.sqrt(a)), hv = 2 * dist * Math.tan(cam.fov * D / 2) / cam.zoom, [lo, hi] = SEC[u.kind];
  const s = a < .004 ? 1e-4 : cam.isPerspectiveCamera ? clamp(w, hv * lo, hv * hi) : w;
  m.opacity = Math.min(a, .999);
  if (Math.abs(this.scale.x - s) > 1e-6) { this.scale.setScalar(s); this.updateMatrixWorld(); }
}
const BLUR = {};
function glowTex() {
  if (GLOW) return GLOW;
  const S = 128, d = new Uint8Array(S * S * 4);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const r = Math.hypot(x + .5 - S / 2, y + .5 - S / 2) / (S / 2), i = (y * S + x) * 4, v = r >= 1 ? 0 : (.9 * Math.exp(-((r / .09) ** 2)) + .16 * Math.exp(-((r / .21) ** 2)) + .035 * Math.exp(-((r / .46) ** 2))) * (1 - sm(.7, 1, r)); d[i] = d[i + 1] = d[i + 2] = 255; d[i + 3] = Math.min(255, v * 255 + .5); }
  const t = new THREE.DataTexture(d, S, S); t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return (GLOW = t);
}
const GR = (v) => [v, v * .96, v * .9];
const chordOf = (P) => (t) => { const C = P.chord, c = C[0] + (C[1] - C[0]) * Math.sin(Math.min(1, t / C[2]) * Math.PI / 2) - (t > C[2] ? (C[1] - C[3]) * ((t - C[2]) / (1 - C[2])) ** 2 : 0); return Math.max(.015, c * (t > .9 ? Math.sqrt(Math.max(0, 1 - ((t - .9) / .1) ** 2)) : 1)); };
function blurTex(P) {
  const k = JSON.stringify([P.n, P.d, P.hub, P.chord, P.col, P.tip, P.tipC, P.blurC]); if (BLUR[k]) return BLUR[k];
  const S = 128, h = S / 2, R = P.d / 2, n = P.n, ch = chordOf(P), d = new Uint8Array(S * S * 4), c0 = new THREE.Color(P.blurC || P.col).getHexString(), tipOn = P.tip && P.tipC && P.tipC !== P.col, c1 = new THREE.Color(P.tipC || P.col).getHexString(), t1 = (R * (1 - (P.tip || 0)) - P.hub) / (R - P.hub);
  const hx = (x) => [0, 2, 4].map((o) => parseInt(x.slice(o, o + 2), 16)), A = hx(c0), Bc = hx(c1);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const dx = (x + .5 - h) / h, dy = (y + .5 - h) / h, r = Math.hypot(dx, dy), t = (r * R - P.hub) / (R - P.hub), i = (y * S + x) * 4, col = tipOn && t > t1 - .01 ? Bc : A; d[i] = col[0]; d[i + 1] = col[1]; d[i + 2] = col[2]; if (r >= 1 || t < -.04) continue;
    const cov = Math.min(1, n * ch(clamp(t, 0, 1)) / (2 * Math.PI * Math.max(r * R, .05))), lobe = (.5 + .5 * Math.cos(n * (Math.atan2(dy, dx) - .4 * t))) ** 4;
    d[i + 3] = clamp(cov * (.5 + 1.3 * lobe) * 1.8 * sm(-.04, .1, t) * (1 - sm(.975, 1, r)) * (tipOn && t > t1 ? 1.25 : 1), 0, 1) * 255;
  }
  const tx = new THREE.DataTexture(d, S, S); tx.magFilter = THREE.LinearFilter; tx.minFilter = THREE.LinearMipmapLinearFilter; tx.generateMipmaps = true; tx.needsUpdate = true; return (BLUR[k] = tx);
}

let CACHE = { key: null, kit: null, tpl: new Map() };
function disposeAll() {
  const k = CACHE.kit, free = (t) => { t.dispose(); if (t.image?.getContext) t.image.width = t.image.height = 0; };
  if (k) { for (const g of k.geos) g.dispose(); k.texs.forEach(free); }
  for (const t of CACHE.tpl.values()) { for (const m of t.mats) m.dispose(); t.texs.forEach(free); }
  CACHE = { key: null, kit: null, tpl: new Map() };
}
function kitOf(key) {
  if (CACHE.key !== key) { disposeAll(); CACHE.key = key; }
  if (!CACHE.kit) { const memo = new Map(), geos = [], texs = []; CACHE.kit = { geos, texs, memo, g(n, f) { if (!memo.has(n)) { const v = f(); memo.set(n, v); (v?.isBufferGeometry ? geos : v?.isTexture ? texs : []).push(v); } return memo.get(n); }, v(n, f) { if (!memo.has(n)) memo.set(n, f()); return memo.get(n); }, t(x) { texs.push(x); return x; } }; }
  return CACHE.kit;
}

function lowAt(F, x, z, n = 40) {
  const R = F.ring(x, n), Z = Math.abs(z); let km = n;
  for (let k = n; k > 0; k--) { const a = R.zs[k], b = R.zs[k - 1]; if (b >= Z) { const f = (Z - a) / (b - a || 1); return { y: lerp(R.ys[k], R.ys[k - 1], f), s: (k - f) / n }; } if (b < a) break; km = k - 1; }
  return R.s.hw > .05 ? { y: R.ys[km], s: km / n, z: R.zs[km], out: true } : null;
}
function geoOf(pos, uv, idx, nor) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  if (uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (idx) g.setIndex(idx);
  if (nor) g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); else g.computeVertexNormals();
  return g;
}
function sheet(rows, uvs, flip, close) {
  const R = rows.length, C = rows[0].length, pos = [], uv = [], idx = [];
  for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) { pos.push(...rows[i][j]); uv.push(...(uvs ? uvs[i][j] : [j / (C - 1), i / (R - 1)])); }
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < C - 1; j++) { const a = i * C + j, b = a + 1, c = a + C, d = c + 1; if (flip) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
  const g = geoOf(pos, uv, idx);
  if (close) weldPairs(g, Array.from({ length: R }, (_, i) => [i * C, i * C + C - 1]));
  return g;
}
function decalGeo(geos, u0, u1, v0, v1, off) {
  const P = geos[0].attributes.position.array, N = geos[0].attributes.normal.array, U = geos[0].attributes.uv.array, map = new Int32Array(P.length / 3).fill(-1), pos = [], nor = [], uv = [], idx = [];
  for (const g of geos) {
    const I = g.index.array;
    for (let t = 0; t < I.length; t += 3) {
      const a = I[t], b = I[t + 1], c = I[t + 2], ua = U[a * 2], ub = U[b * 2], uc = U[c * 2], va = U[a * 2 + 1], vb = U[b * 2 + 1], vc = U[c * 2 + 1];
      if ((ua < u0 && ub < u0 && uc < u0) || (ua > u1 && ub > u1 && uc > u1) || (va < v0 && vb < v0 && vc < v0) || (va > v1 && vb > v1 && vc > v1)) continue;
      for (const i of [a, b, c]) { if (map[i] < 0) { map[i] = pos.length / 3; const k = i * 3; pos.push(P[k] + N[k] * off, P[k + 1] + N[k + 1] * off, P[k + 2] + N[k + 2] * off); nor.push(N[k], N[k + 1], N[k + 2]); uv.push((U[i * 2] - u0) / (u1 - u0), (U[i * 2 + 1] - v0) / (v1 - v0)); } idx.push(map[i]); }
    }
  }
  return geoOf(pos, uv, idx, nor);
}
function weldPairs(g, pairs) {
  const n = g.attributes.normal, v = new V3(), w = new V3();
  for (const [a, b] of pairs) { v.fromBufferAttribute(n, a); w.fromBufferAttribute(n, b); v.add(w).normalize(); n.setXYZ(a, v.x, v.y, v.z); n.setXYZ(b, v.x, v.y, v.z); }
  n.needsUpdate = true;
}
function lathe(prof, S = 32, vs, flip) {
  const rows = [], uvs = [];
  let L = 0; const acc = prof.map((p, i) => (i ? (L += Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1])) : 0));
  prof.forEach(([x, r], i) => { const row = [], ur = []; for (let j = 0; j <= S; j++) { const a = j / S * Math.PI * 2; row.push([x, r * Math.cos(a), r * Math.sin(a)]); ur.push([j / S, vs ? lerp(vs[0], vs[1], acc[i] / (L || 1)) : acc[i] / (L || 1)]); } rows.push(row); uvs.push(ur); });
  return sheet(rows, uvs, flip, true);
}
function merge(list) {
  let nv = 0, ni = 0; const parts = list.map(([g0, m]) => { const g = m ? g0.clone().applyMatrix4(m) : g0; nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; return [g, !!m]; });
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), col = list.some(([g]) => g.attributes.color) ? new Float32Array(nv * 3) : null, idx = new (nv > 65535 ? Uint32Array : Uint16Array)(ni);
  let o = 0, oi = 0;
  for (const [g, tmp] of parts) {
    const n = g.attributes.position.count; pos.set(g.attributes.position.array, o * 3); nor.set(g.attributes.normal.array, o * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, o * 2);
    if (col) { if (g.attributes.color) col.set(g.attributes.color.array, o * 3); else col.fill(1, o * 3, (o + n) * 3); }
    if (g.index) for (let i = 0; i < g.index.count; i++) idx[oi++] = g.index.array[i] + o; else for (let i = 0; i < n; i++) idx[oi++] = i + o;
    o += n; if (tmp) g.dispose();
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); if (col) g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setIndex(new THREE.BufferAttribute(idx, 1));
  return g;
}
const M4 = (p = [0, 0, 0], q = null, s = [1, 1, 1]) => new THREE.Matrix4().compose(new V3(...p), q || new THREE.Quaternion(), new V3(...s));
const QE = (x, y, z, o) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z, o));
const QA = (ax, a) => new THREE.Quaternion().setFromAxisAngle(ax, a);
const cyl = (r0, r1, h, s = 12, open) => new THREE.CylinderGeometry(r1, r0, h, s, 1, !!open).translate(0, h / 2, 0);

function loftFn(tbl, o = {}) {
  const T = tbl.map((r) => [r[0], r[1], r[2], r[3], r[4], r[5] ?? o.nU ?? 2, r[6] ?? o.nL ?? 2]);
  const rnd = (a, b) => [.012, .05, .13, .27, .48].map((f) => { const k = Math.sqrt(f); return [a[0] + (b[0] - a[0]) * f, ...[1, 2, 3, 4].map((c) => a[c] + (b[c] - a[c]) * k), b[5], b[6]]; });
  if (T[0][3] < 1e-3) T.splice(1, 0, ...rnd(T[0], T[1]));
  const n = T.length; if (T[n - 1][3] < 1e-3) T.splice(n - 1, 0, ...rnd(T[n - 1], T[n - 2]).reverse());
  const xs = T.map((r) => r[0]), S = [1, 2, 3, 4, 5, 6].map((c) => spline(xs, T.map((r) => r[c])));
  const sec = (x) => ({ cr: S[0](x), kl: S[1](x), hw: Math.max(0, S[2](x)), zw: S[3](x), nu: S[4](x), nl: S[5](x) });
  const M = 96, buf = new Float64Array((M + 1) * 3);
  function ring(x, n) {
    const s = sec(x), ys = new Float32Array(n + 1), zs = new Float32Array(n + 1); let len = 0;
    for (let i = 0; i <= M; i++) {
      const th = i / M * Math.PI, c = Math.cos(th), sn = Math.sin(th); let y, z;
      if (c >= 0) { const zz = s.hw * Math.pow(sn, 2 / s.nu); let cr = s.cr, nu = s.nu; if (o.vee) { const v = o.vee, xe = x - v[0] * zz * sm(v[1], v[2], x) * (1 - sm(v[3], v[4], x)); cr = S[0](xe); nu = S[4](xe); } y = s.zw + (cr - s.zw) * Math.pow(c, 2 / nu); z = zz; }
      else { z = s.hw * Math.pow(sn, 2 / s.nl); y = s.zw - (s.zw - s.kl) * Math.pow(-c, 2 / s.nl); }
      buf[i * 3] = y; buf[i * 3 + 1] = z; if (i) len += Math.hypot(y - buf[i * 3 - 3], z - buf[i * 3 - 2]); buf[i * 3 + 2] = len;
    }
    for (let k = 0, i = 0; k <= n; k++) { const t = len * k / n; while (i < M - 1 && buf[(i + 1) * 3 + 2] < t) i++; const a = buf[i * 3 + 2], b = buf[i * 3 + 5], f = b > a ? clamp((t - a) / (b - a), 0, 1) : 0; ys[k] = lerp(buf[i * 3], buf[i * 3 + 3], f); zs[k] = lerp(buf[i * 3 + 1], buf[i * 3 + 4], f); }
    return { ys, zs, len, s };
  }
  return { sec, ring, T };
}
function loftGeo(F, o) {
  const n = o.n, x0 = o.x0 ?? F.T[0][0], x1 = o.x1 ?? F.T[F.T.length - 1][0], step = o.step;
  const ks = [...new Set([x0, x1, ...F.T.map((r) => r[0]), ...(o.splits || []), ...(o.knots || [])].filter((x) => x >= x0 && x <= x1))].sort((a, b) => a - b);
  const xs = [x0]; for (let i = 1; i < ks.length; i++) { const a = ks[i - 1], b = ks[i]; if (b - a < 1e-4) continue; const st = typeof step === 'function' ? step((a + b) / 2) : step, m = Math.max(1, Math.ceil((b - a) / st)); for (let j = 1; j <= m; j++) xs.push(a + (b - a) * j / m); }
  const RW = 2 * n + 1, rows = [], uvs = [], rowX = [], kind = [];
  const push = (x, R, k) => { const row = [], ur = []; for (let j = 0; j < RW; j++) { const kk = j <= n ? j : 2 * n - j, side = j <= n ? 1 : -1, s = kk / n; row.push(o.conv(x, R.ys[kk], side * R.zs[kk])); ur.push(o.uv(x, j <= n ? s : 2 - s, R.len, k)); } rows.push(row); uvs.push(ur); rowX.push(x); kind.push(k); };
  const R0 = F.ring(x0, n), R1 = F.ring(x1, n);
  const capS = o.capStart && R0.s.hw > 1e-3, capE = o.capEnd !== false && R1.s.hw > 1e-3;
  if (capS) { const c = { ys: new Float32Array(n + 1).fill(R0.s.zw), zs: new Float32Array(n + 1), len: 0 }; push(x0, c, 2); push(x0, R0, 2); }
  for (const x of xs) push(x, F.ring(x, n), 0);
  if (capE) { const c = { ys: new Float32Array(n + 1).fill(R1.s.zw), zs: new Float32Array(n + 1), len: 0 }; push(x1, R1, 3); push(x1, c, 3); }
  const pos = new Float32Array(rows.length * RW * 3), uv = new Float32Array(rows.length * RW * 2);
  rows.forEach((r, i) => r.forEach((p, j) => { pos.set(p, (i * RW + j) * 3); uv.set(uvs[i][j], (i * RW + j) * 2); }));
  const quads = (r0, r1) => { const idx = []; for (let i = r0; i < r1; i++) for (let j = 0; j < RW - 1; j++) { const a = i * RW + j, b = a + 1, c = a + RW, d = c + 1; idx.push(a, c, b, b, c, d); } return idx; };
  const all = new THREE.BufferGeometry(); all.setAttribute('position', new THREE.BufferAttribute(pos, 3)); all.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); all.setIndex(quads(0, rows.length - 1)); all.computeVertexNormals();
  const nr = all.attributes.normal, dir = Math.sign(o.conv(1, 0, 0)[0] - o.conv(0, 0, 0)[0]) || -1;
  for (let i = 0; i < rows.length; i++) {
    const a = i * RW, b = a + RW - 1, deg = kind[i] === 2 || kind[i] === 3 || F.sec(rowX[i]).hw < 2e-3;
    if (deg) { const sgn = kind[i] === 3 || (kind[i] === 0 && i > rows.length / 2) ? -dir : dir; for (let j = 0; j < RW; j++) nr.setXYZ(a + j, sgn, 0, 0); continue; }
    const v = new V3(nr.getX(a) + nr.getX(b), nr.getY(a) + nr.getY(b), nr.getZ(a) + nr.getZ(b)).normalize(); nr.setXYZ(a, v.x, v.y, v.z); nr.setXYZ(b, v.x, v.y, v.z);
  }
  const cuts = [x0, ...(o.splits || []), x1], parts = [];
  for (let k = 0; k < cuts.length - 1; k++) {
    let r0 = rowX.findIndex((x) => x >= cuts[k] - 1e-6), r1 = rowX.length - 1 - [...rowX].reverse().findIndex((x) => x <= cuts[k + 1] + 1e-6);
    if (k === 0) r0 = 0; if (k === cuts.length - 2) r1 = rows.length - 1;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', all.attributes.position); g.setAttribute('normal', nr); g.setAttribute('uv', all.attributes.uv); g.setIndex(quads(r0, r1)); g.computeBoundingSphere(); parts.push(g);
  }
  return o.splits ? parts : parts[0];
}

function foil(f, t, cam) {
  const yt = 5 * t * (.2969 * Math.sqrt(Math.max(f, 0)) - .126 * f - .3516 * f * f + .2843 * f ** 3 - .1036 * f ** 4), p = .4;
  const yc = cam ? (f < p ? cam * (2 * p * f - f * f) / (p * p) : cam * ((1 - 2 * p) + 2 * p * f - f * f) / ((1 - p) ** 2)) : 0;
  return [yc + yt, yc - yt];
}
function surfDef(raw, B) {
  const ss = raw.map((r) => r.s), I = (k) => pl(ss, raw.map((r) => r[k]));
  const fx = I('x'), fh = I('h'), fw = I('w'), fc = I('c'), ft = I('t'), ftw = I('tw'), fcam = I('cam');
  const le = (s) => B(fx(s), fh(s), fw(s));
  const at = (s, c0 = 0, c1 = 1) => {
    const e = .04, T = le(Math.min(s + e, ss[ss.length - 1])).sub(le(Math.max(s - e, ss[0]))).normalize(), dir0 = new V3(-1, 0, 0), n0 = dir0.clone().cross(T).normalize(), A = n0.clone().cross(dir0).normalize(), q = QA(A, ftw(s) * D);
    return { s, p: le(s), dir: dir0.applyQuaternion(q), n: n0.applyQuaternion(q), c: fc(s), t: ft(s), cam: fcam(s), x: fx(s), c0, c1, T };
  };
  return { at, s0: ss[0], s1: ss[ss.length - 1], fx, fc, fh, fw, raw };
}
function surf(st, o) {
  const M = o.M || 14, K = 2 * M + 4, mz = o.mz || 1, pos = [], uv = [], idx = [], pl0 = o.plate || 0;
  const ys = (q, f, up) => {
    const [a, b] = foil(f, q.t, q.cam);
    if (!pl0) return up ? a : b;
    const base = pl0 > 0 ? a : b, d = 1 / q.c;
    return pl0 > 0 ? (up ? base + .004 * d : base - .014 * d) : (up ? base + .014 * d : base - .004 * d);
  };
  for (const q of st) {
    const fr = (j) => q.c0 + (q.c1 - q.c0) * (1 - Math.cos(Math.PI * j / M)) / 2;
    const pt = (f, y) => q.p.clone().addScaledVector(q.dir, f * q.c).addScaledVector(q.n, y * q.c);
    const ring = [];
    for (let j = M; j >= 0; j--) ring.push([pt(fr(j), ys(q, fr(j), true)), 0]);
    for (let j = 0; j <= M; j++) ring.push([pt(fr(j), ys(q, fr(j), false)), 1]);
    if (q.c0 > .002 && !pl0) { const [a, b] = foil(q.c0, q.t, q.cam), np = pt(q.c0 - (a - b) * .45, (a + b) / 2); ring[M][0] = np; ring[M + 1][0] = np.clone(); }
    ring.push([ring[2 * M + 1][0].clone(), 1], [ring[0][0].clone(), 0]);
    for (const [p, b] of ring) { pos.push(p.x, p.y, p.z * mz); uv.push(...(b ? o.uvB : o.uvT)(q.s, q.xOf(p))); }
  }
  const R = st.length;
  for (let i = 0; i < R - 1; i++) for (let j = 0; j < K - 1; j++) { const a = i * K + j, b = a + 1, c = a + K, d = c + 1; idx.push(a, c, b, b, c, d); }
  const cap = (i, end) => {
    const base = pos.length / 3, cen = new V3();
    for (let j = 0; j < 2 * M + 2; j++) { const k = (i * K + j) * 3; cen.add(new V3(pos[k], pos[k + 1], pos[k + 2])); pos.push(pos[k], pos[k + 1], pos[k + 2]); uv.push(uv[(i * K + j) * 2], uv[(i * K + j) * 2 + 1]); }
    cen.multiplyScalar(1 / (2 * M + 2)); pos.push(cen.x, cen.y, cen.z); uv.push(uv[i * K * 2], uv[i * K * 2 + 1]);
    const c = base + 2 * M + 2;
    for (let j = 0; j < 2 * M + 2; j++) { const a = base + j, b = base + (j + 1) % (2 * M + 2); if (end) idx.push(c, b, a); else idx.push(c, a, b); }
  };
  if (o.capA) cap(0, false); if (o.capB) cap(R - 1, true);
  if (mz < 0) for (let i = 0; i < idx.length; i += 3) { const t = idx[i + 1]; idx[i + 1] = idx[i + 2]; idx[i + 2] = t; }
  const g = geoOf(pos, uv, idx);
  if (!pl0) weldPairs(g, Array.from({ length: R }, (_, i) => [i * K + M, i * K + M + 1]));
  return g;
}

function hullMap(F, sp, n = 64) {
  const X1 = sp.hullLen, xs = [], e0 = Math.min(6, X1 * .35), e1 = Math.min(6, X1 * .3);
  for (let x = 0; x < e0; x += .025) xs.push(x); for (let x = e0; x < X1 - e1; x += Math.max(.08, X1 / 300)) xs.push(x); for (let x = X1 - e1; x < X1; x += .05) xs.push(x); xs.push(X1);
  const Kn = xs.length, ys = new Float32Array(Kn * (n + 1)), zs = new Float32Array(Kn * (n + 1)), lens = new Float32Array(Kn);
  for (let i = 0; i < Kn; i++) { const R = F.ring(xs[i], n); ys.set(R.ys, i * (n + 1)); zs.set(R.zs, i * (n + 1)); lens[i] = R.len; }
  const sAt = (i, Y) => { const o = i * (n + 1); if (Y >= ys[o]) return 0; if (Y <= ys[o + n]) return 1; let a = 0, b = n; while (b - a > 1) { const m = (a + b) >> 1; if (ys[o + m] > Y) a = m; else b = m; } return (a + (ys[o + a] - Y) / (ys[o + a] - ys[o + b] || 1)) / n; };
  const zS = (i, s) => { const f = clamp(s, 0, 1) * n, k = Math.min(n - 1, f | 0); return lerp(zs[i * (n + 1) + k], zs[i * (n + 1) + k + 1], f - k); };
  const yS = (i, s) => { const f = clamp(s, 0, 1) * n, k = Math.min(n - 1, f | 0); return lerp(ys[i * (n + 1) + k], ys[i * (n + 1) + k + 1], f - k); };
  const ix = (x) => { x = clamp(x, 0, X1); let a = 0, b = Kn - 1; while (b - a > 1) { const m = (a + b) >> 1; if (xs[m] > x) b = m; else a = m; } return [a, (x - xs[a]) / (xs[a + 1] - xs[a] || 1)]; };
  const sY = (x, Y) => { const [i, t] = ix(x); return lerp(sAt(i, Y), sAt(i + 1, Y), t); };
  const zAt = (x, s) => { const [i, t] = ix(x); return lerp(zS(i, s), zS(i + 1, s), t); };
  const yAt = (x, s) => { const [i, t] = ix(x); return lerp(yS(i, s), yS(i + 1, s), t); };
  const sZ = (x, Z, low) => { let a = low ? .5 : 0, b = low ? 1 : .5; const up = !low; for (let k = 0; k < 24; k++) { const m = (a + b) / 2, z = zAt(x, m); if ((z < Z) === up) a = m; else b = m; } return (a + b) / 2; };
  const crown = (x) => yAt(x, 0), keel = (x) => yAt(x, 1), len = (x) => { const [i, t] = ix(x); return lerp(lens[i], lens[i + 1], t); };
  const xAtZ = (Y, Z, xa = 0, xb = X1 * .3) => { for (let k = 0; k < 30; k++) { const m = (xa + xb) / 2, z = Y > crown(m) ? -1 : zAt(m, sY(m, Y)); if (z < Z) xa = m; else xb = m; } return (xa + xb) / 2; };
  const xAtS = (Y, S, xa = 0, xb = X1 * .35) => { for (let k = 0; k < 34; k++) { const m = (xa + xb) / 2; if (sY(m, Y) < S) xa = m; else xb = m; } return (xa + xb) / 2; };
  return { X1, U: .995, sY, zAt, yAt, sZ, crown, keel, len, xAtZ, xAtS };
}

function painter(H, Ls) {
  const uv = (x, Y, side) => { const s = H.sY(x, Y); return [x / H.X1 * H.U, side > 0 ? s / 2 : 1 - s / 2]; };
  const uvZ = (x, Z, low, side) => { const s = H.sZ(x, Math.abs(Z), low); return [x / H.X1 * H.U, side > 0 ? s / 2 : 1 - s / 2]; };
  const px = (L, p) => [p[0] * L.W - (L.ox || 0), p[1] * L.H - (L.oy || 0)];
  const res = (p) => (Array.isArray(p) ? p : p.S != null ? [H.xAtS(p.Y, p.S), p.Y] : p.Z != null ? [H.xAtZ(p.Y, p.Z), p.Y] : [p.x, p.Y]);
  const P = {
    H, uv, uvZ, Ls,
    path(L, pts, side) {
      const g = L.g, Q = pts.map(res), p2 = new Path2D(); g.beginPath();
      for (let i = 0; i < Q.length; i++) {
        const j = (i + 1) % Q.length, a = Q[i], b = Q[j], zz = pts[i].S != null && pts[j].S != null, m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .05));
        for (let k = 0; k < m; k++) { const t = k / m, pp = zz ? res({ S: lerp(pts[i].S, pts[j].S, t), Y: lerp(pts[i].Y, pts[j].Y, t) }) : [lerp(a[0], b[0], t), lerp(a[1], b[1], t)], q = px(L, uv(pp[0], pp[1], side)); if (!i && !k) { g.moveTo(...q); p2.moveTo(...q); } else { g.lineTo(...q); p2.lineTo(...q); } }
      }
      g.closePath(); p2.closePath(); return p2;
    },
    pathZ(L, pts, low, side) {
      const g = L.g; g.beginPath();
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], m = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / .08)); for (let k = 0; k < m; k++) { const t = k / m, q = px(L, uvZ(lerp(a[0], b[0], t), lerp(a[1], b[1], t), low, side)); if (!i && !k) g.moveTo(...q); else g.lineTo(...q); } }
      g.closePath();
    },
    poly(L, pts, side, fill, stroke) { P.path(L, pts, side); const g = L.g; if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke[0]; g.lineWidth = stroke[1]; g.stroke(); } },
    ppm(L) { return L.W / H.X1 * H.U; },
    band(L, side, x0, x1, top, bot, fill, step = .2) {
      const T = typeof top === 'function' ? top : () => top, B = typeof bot === 'function' ? bot : () => bot, g = L.g, m = Math.max(2, Math.ceil((x1 - x0) / step));
      g.beginPath();
      for (let k = 0; k <= m; k++) { const x = lerp(x0, x1, k / m), q = px(L, uv(x, T(x), side)); if (!k) g.moveTo(...q); else g.lineTo(...q); }
      for (let k = m; k >= 0; k--) { const x = lerp(x0, x1, k / m); g.lineTo(...px(L, uv(x, B(x), side))); }
      g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); }
    },
    mat(L, x, Y, side) { const d = .05, p0 = px(L, uv(x, Y, side)), pa = px(L, uv(x - d, Y, side)), pb = px(L, uv(x, Y + d, side)); return new DOMMatrix([(pa[0] - p0[0]) / d, (pa[1] - p0[1]) / d, (pb[0] - p0[0]) / d, (pb[1] - p0[1]) / d, p0[0], p0[1]]); },
    local(L, x, Y, side, fn) { const g = L.g; g.save(); g.setTransform(P.mat(L, x, Y, side)); fn(g); g.restore(); },
    localZ(L, x, Z, low, side, fn) {
      const d = .05, p0 = px(L, uvZ(x, Z, low, side)), pa = px(L, uvZ(x - d, Z, low, side)), pb = px(L, uvZ(x, Z + d, low, side)), g = L.g;
      g.save(); g.setTransform((pa[0] - p0[0]) / d, (pa[1] - p0[1]) / d, (pb[0] - p0[0]) / d, (pb[1] - p0[1]) / d, p0[0], p0[1]); fn(g); g.restore();
    },
    text(L, str, x, Y, side, h, fill, font = 'Arial, Helvetica, sans-serif', wt = 700, align = 'center', sx = 1) {
      P.local(L, x, Y, side, (g) => { const r = side > 0 ? 1 : -1; g.transform(r * .01 * sx, 0, 0, -.01, 0, 0); g.font = `${wt} ${h * 100 * 1.36}px ${font}`; g.textAlign = align; g.textBaseline = 'middle'; g.fillStyle = fill; g.fillText(str, 0, 0); });
    },
  };
  return P;
}
const rr = (g, x, y, w, h, r) => { r = Math.min(r, w / 2, h / 2); g.beginPath?.(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
function groove(L, p, k, w) {
  const g = L.g; g.save(); g.lineWidth = w; g.globalAlpha = .55;
  for (const [dx, dy, c] of [[-1, 0, NRM(k, 0)], [1, 0, NRM(-k, 0)], [0, -1, NRM(0, k)], [0, 1, NRM(0, -k)]]) { g.setTransform(1, 0, 0, 1, dx * w * .6, dy * w * .6); g.strokeStyle = c; g.stroke(p); }
  g.restore();
}
const RRP = new Map(), rrP = (w, h, r) => { const k = `${w.toFixed(3)} ${h.toFixed(3)} ${r.toFixed(3)}`; if (!RRP.has(k)) { const p = new Path2D(); rr(p, -w / 2, -h / 2, w, h, r); RRP.set(k, p); } return RRP.get(k); };
function segs(L, list, w, col, dash) { if (!list.length) return; const g = L.g; g.save(); g.beginPath(); for (const q of list) if (typeof q[0] === 'number') { g.moveTo(q[0], q[1]); g.lineTo(q[2], q[3]); } else q.forEach((p, k) => g[k ? 'lineTo' : 'moveTo'](p[0], p[1])); g.strokeStyle = col; g.lineWidth = w; if (dash) { g.lineCap = 'round'; g.setLineDash([.01, dash]); } g.stroke(); g.restore(); }
function rivetTile(pitch, d, k, vert) {
  const w = Math.max(2, Math.round(vert ? d * 2 : pitch)), h = Math.max(2, Math.round(vert ? pitch : d * 2)), c = cv(w, h), g = c.getContext('2d'), im = g.createImageData(w, h), r = d / 2;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const dx = x + .5 - w / 2, dy = y + .5 - h / 2, q = Math.hypot(dx, dy), i = (y * w + x) * 4;
    if (q < r) { const s = Math.sqrt(Math.max(0, r * r - q * q)), nx = dx / r * k, ny = dy / r * k; im.data[i] = 128 + nx * 127; im.data[i + 1] = 128 + ny * 127; im.data[i + 2] = 255 * clamp(s / r + .4, 0, 1); im.data[i + 3] = 255; }
  }
  g.putImageData(im, 0, 0); return c;
}
function rivets(L, x0, y0, x1, y1, pitch, d, k, cache) {
  const vert = Math.abs(x1 - x0) < Math.abs(y1 - y0), key = `${vert}${pitch.toFixed(1)}${d.toFixed(1)}`;
  let pat = cache[key]; if (!pat) pat = cache[key] = L.g.createPattern(rivetTile(pitch, d, k, vert), 'repeat');
  const g = L.g; g.save(); g.fillStyle = pat;
  const w = Math.max(2, Math.round(vert ? d * 2 : pitch)), h = Math.max(2, Math.round(vert ? pitch : d * 2));
  if (vert) { const x = Math.round(x0 - w / 2); pat.setTransform(new DOMMatrix([1, 0, 0, 1, x, 0])); g.fillRect(x, Math.min(y0, y1), w, Math.abs(y1 - y0)); }
  else { const y = Math.round(y0 - h / 2); pat.setTransform(new DOMMatrix([1, 0, 0, 1, 0, y])); g.fillRect(Math.min(x0, x1), y, Math.abs(x1 - x0), h); }
  g.restore();
}
const dots = (L, x0, y0, x1, y1, pitch, d, col) => segs(L, [[x0, y0, x1, y1]], d, col, pitch);
function line(L, x0, y0, x1, y1, w, col) { const g = L.g; g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }

let RAMP = null;
const BLOB = new Map();
function ramp() { if (RAMP) return RAMP; const c = cv(64, 64), g = c.getContext('2d'), im = g.createImageData(64, 64); for (let i = 0; i < 4096; i++) { im.data[i * 4] = (i & 63) * 255 / 63; im.data[i * 4 + 1] = (i >> 6) * 255 / 63; im.data[i * 4 + 3] = 255; } g.putImageData(im, 0, 0); return (RAMP = c); }
function blobs(wv) { const k = wv.toFixed(3); if (BLOB.has(k)) return BLOB.get(k); const r = rng(77), out = []; for (let i = 0; i < 12; i++) { const c = cv(64, 64), g = c.getContext('2d'), q = g.createRadialGradient(32, 32, 0, 32, 32, 32), c0 = NRM((r() - .5) * 2 * wv, (r() - .5) * 2 * wv).replace('rgb', 'rgba'); q.addColorStop(0, c0.replace(')', ',.55)')); q.addColorStop(1, c0.replace(')', ',0)')); g.fillStyle = q; g.fillRect(0, 0, 64, 64); out.push(c); } BLOB.set(k, out); return out; }
function blobIn(g, img, cx, cy, rad, x0, y0, x1, y1) { const a = Math.max(x0, cx - rad), b = Math.max(y0, cy - rad), c = Math.min(x1, cx + rad), d = Math.min(y1, cy + rad); if (c - a < 1 || d - b < 1) return; const k = 32 / rad; g.drawImage(img, (a - cx + rad) * k, (b - cy + rad) * k, (c - a) * k, (d - b) * k, a, b, c - a, d - b); }
function skinPanels(P, sp, Lc, Ln, Lo, r) {
  const H = P.H, X1 = H.X1, sk = sp.skin, cache = {}, U = H.U;
  const frames = [...(sk.frames || [])], fp = sk.fp; if (!sk.frames) for (let x = sk.f0 ?? .6; x < X1 - .2; x += fp * (sk.fk || 4)) frames.push(x);
  const midLen = H.len(X1 * .45), nS = Math.max(4, Math.round(midLen / 2 / sk.sp));
  const vcol = (s, side) => (side > 0 ? s / 2 : 1 - s / 2);
  const amp = sk.tilt ?? .05, tone = sk.tone ?? .03;
  const Wn = Ln.W, Hn = Ln.H, Wc = Lc.W, Hc = Lc.H, Wo = Lo.W, Ho = Lo.H, gn = Ln.g;
  const xsAll = [0, ...frames.filter((x) => x > .3 && x < X1 - .3), X1], ramps = [], waves = [];
  for (let i = 0; i < xsAll.length - 1; i++) {
    const xa = xsAll[i], xb = xsAll[i + 1], stag = (i % 2) * .5;
    for (const side of [1, -1]) for (let j = -1; j < nS; j++) {
      const sa = clamp((j + stag) / nS, 0, 1), sb = clamp((j + 1 + stag) / nS, 0, 1); if (sb - sa < 1e-3) continue;
      const va = vcol(sa, side), vb = vcol(sb, side), v0 = Math.min(va, vb), v1 = Math.max(va, vb), u0 = xa / X1 * U, u1 = xb / X1 * U;
      const af = P.ampAt ? P.ampAt((xa + xb) / 2, (sa + sb) / 2, side) : 1, at = Math.min(af, 2.6), tx = (r() - .5) * 2 * amp * at, ty = (r() - .5) * 2 * amp * at, wv = af > 1 ? (sk.wave || .03) * at : sk.wave;
      const rc = [u0 * Wn, v0 * Hn, (u1 - u0) * Wn, (v1 - v0) * Hn];
      gn.fillStyle = NRM(tx - amp * .6, ty - amp * .6); gn.fillRect(...rc); ramps.push(rc);
      if (wv) for (let k = 0; k < 3; k++) waves.push([wv, lerp(u0, u1, r()) * Wn, lerp(v0, v1, r()) * Hn, Math.max(rc[2], rc[3]) * (.25 + .35 * r()), r() * 12 | 0, rc]);
      const gq = Lc.g.createLinearGradient(u0 * Wc, v0 * Hc, u1 * Wc, v1 * Hc); gq.addColorStop(0, TCOL((r() - .5) * 2 * tone * af)); gq.addColorStop(1, TCOL((r() - .5) * 2 * tone * af)); Lc.g.fillStyle = gq; Lc.g.fillRect(u0 * Wc, v0 * Hc, (u1 - u0) * Wc, (v1 - v0) * Hc); if (sk.patch && r() < .22) { Lc.g.fillStyle = `rgba(${r() < .5 ? '104,100,92' : '88,94,102'},${(sk.patch * (.5 + .5 * r())).toFixed(3)})`; Lc.g.fillRect(u0 * Wc, v0 * Hc, (u1 - u0) * Wc, (v1 - v0) * Hc); }
      const ro = (r() - .5) * 2 * (sk.rvar ?? .04) * af; Lo.g.fillStyle = ro > 0 ? `rgba(0,255,0,${ro})` : `rgba(0,0,${af > 1 ? 255 : 0},${-ro})`; Lo.g.fillRect(u0 * Wo, v0 * Ho, (u1 - u0) * Wo, (v1 - v0) * Ho);
    }
  }
  gn.save(); gn.globalCompositeOperation = 'lighter'; gn.globalAlpha = amp * 1.2 * 127 / 255; const RP = ramp(); for (const rc of ramps) gn.drawImage(RP, ...rc); gn.restore();
  for (const [wv, cx, cy, rad, k, [x, y, w, h]] of waves) blobIn(gn, blobs(wv)[k], cx, cy, rad, x, y, x + w, y + h);
  const seamC = sk.seamC || 'rgba(40,46,52,.35)', sw = Math.max(1, Wc / X1 * .006), nw = Math.max(1, Wn / X1 * .004), rk = sk.rk ?? .5, rvC = sk.rivetC || 'rgba(30,34,40,.25)';
  const rv = sk.rivet, rpx = rv ? rv[0] * Wn / X1 : 0, rd = rv ? rv[1] * Wn / X1 : 0, rpy = rv ? rv[0] * Hn / midLen / 2 : 0, cn = Wc / Wn;
  const S = { c: [], o: [], n1: [], n2: [], n3: [], n4: [], dv: [], dh: [] };
  for (const x of frames) {
    const u = x / X1 * U;
    S.c.push([u * Wc, 0, u * Wc, Hc]); S.o.push([u * Wo, 0, u * Wo, Ho]); S.n1.push([u * Wn - nw, 0, u * Wn - nw, Hn]); S.n2.push([u * Wn + nw, 0, u * Wn + nw, Hn]);
    if (rv) { for (const o of [-1.4, 1.4]) rivets(Ln, u * Wn + o * rd, 0, u * Wn + o * rd, Hn, rpy, rd, rk, cache); S.dv.push([(u * Wn - 1.4 * rd) * cn, 0, (u * Wn - 1.4 * rd) * cn, Hc], [(u * Wn + 1.4 * rd) * cn, rpy * cn * .5, (u * Wn + 1.4 * rd) * cn, Hc]); }
  }
  for (const side of [1, -1]) for (let j = 0; j <= nS; j++) for (const stag of [0, .5]) {
    const sv = clamp((j + stag) / nS, 0, 1); if (sv <= 0 || sv >= 1) continue; const v = vcol(sv, side);
    for (let i = 0; i < xsAll.length - 1; i++) if ((i % 2) * .5 === stag) {
      const u0 = xsAll[i] / X1 * U, u1 = xsAll[i + 1] / X1 * U;
      S.c.push([u0 * Wc, v * Hc, u1 * Wc, v * Hc]); S.n3.push([u0 * Wn, v * Hn - nw, u1 * Wn, v * Hn - nw]); S.n4.push([u0 * Wn, v * Hn + nw, u1 * Wn, v * Hn + nw]);
      if (rv) { rivets(Ln, u0 * Wn, v * Hn - 1.4 * rd, u1 * Wn, v * Hn - 1.4 * rd, rpx, rd, rk, cache); S.dh.push([u0 * Wc, (v * Hn - rd * 1.4) * cn, u1 * Wc, (v * Hn - rd * 1.4) * cn]); }
    }
  }
  segs(Lc, S.c, sw, seamC); segs(Lo, S.o, Math.max(1, sw * Wo / Wc), 'rgba(0,200,0,.5)'); segs(Ln, S.n1, nw, NRM(.35, 0)); segs(Ln, S.n2, nw, NRM(-.35, 0)); segs(Ln, S.n3, nw, NRM(0, .3)); segs(Ln, S.n4, nw, NRM(0, -.3));
  if (rv) {
    segs(Lc, S.dv, rd * cn, rvC, rpy * cn); segs(Lc, S.dh, rd * cn, rvC, rpx * cn);
    if (sk.sub) { for (let x = sk.f0 ?? .6; x < X1 - .2; x += fp) { const u = x / X1 * U; rivets(Ln, u * Wn, 0, u * Wn, Hn, rpy, rd * .9, rk * .8, cache); } }
  }
}

function wins(P, c, list, o = {}) {
  if (!list.length) return;
  const { Lc, Ln, Lo } = c, Le = o.lit === false ? null : c.Le, fr = o.frame ?? .025, N = () => new Path2D(), A = { seal: N(), rev: N(), frm: N(), oF: N(), oG: N(), nG: N(), nF: N(), e: N(), gl: { 1: N(), [-1]: N() } }, G = {};
  for (const [x, Y, sd, w, h] of list) {
    const r = o.r ?? Math.min(w, h) * .38, mc = P.mat(Lc, x, Y, sd), mo = P.mat(Lo, x, Y, sd), mn = P.mat(Ln, x, Y, sd), F = rrP(w + fr * 2, h + fr * 2, r + fr), Gp = rrP(w, h, r);
    A.rev.addPath(rrP(w + fr * 3.2, h + fr * 3.2, r + fr * 1.6), mc); A.frm.addPath(F, mc); A.seal.addPath(rrP(w + fr * .7, h + fr * .7, r + fr * .35), mc); A.gl[sd].addPath(Gp, mc); A.oF.addPath(F, mo); A.oG.addPath(Gp, mo); A.nF.addPath(Gp, mn); A.nG.addPath(F, mn);
    if (Le) A.e.addPath(Gp, P.mat(Le, x, Y, sd));
    G[sd] ||= [mc.transformPoint({ x: 0, y: h / 2 }), mc.transformPoint({ x: 0, y: -h / 2 })];
  }
  const f = (L, p, st) => { L.g.fillStyle = st; L.g.fill(p); };
  f(Lc, A.rev, o.reveal || 'rgba(60,66,72,.35)'); f(Lc, A.frm, o.frameC || '#9da3a8'); if (o.seal) f(Lc, A.seal, o.sealC || 'rgba(34,38,42,.9)');
  for (const sd in G) { const [a, b] = G[sd], q = Lc.g.createLinearGradient(a.x, a.y, b.x, b.y); q.addColorStop(0, o.glassT || '#3a4652'); q.addColorStop(.5, o.glass || '#151b22'); q.addColorStop(1, o.glassB || '#0c1015'); f(Lc, A.gl[sd], q); }
  f(Lo, A.oF, ORM(.4, o.fm ?? 0)); f(Lo, A.oG, ORM(o.gR ?? .04, 0)); f(Ln, A.nF, N0); groove(Ln, A.nG, .5, Math.max(1.2, fr * .8 * Ln.W / P.H.X1));
  if (Le) f(Le, A.e, o.light || '#ffd9a0');
}
function rrPts(cx, cy, w, h, r, flat) {
  const out = [], q = (x, y, a0) => { for (let k = 0; k <= 4; k++) { const a = a0 + k / 4 * Math.PI / 2; out.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); } };
  r = Math.min(r, w / 2, h / 2);
  q(cx + w / 2 - r, cy - h / 2 + r, -Math.PI / 2);
  if (flat) out.push([cx + w / 2, cy + h / 2], [cx - w / 2, cy + h / 2]); else { q(cx + w / 2 - r, cy + h / 2 - r, 0); q(cx - w / 2 + r, cy + h / 2 - r, Math.PI / 2); }
  q(cx - w / 2 + r, cy - h / 2 + r, Math.PI);
  return out;
}
function paintedDoor(P, Lc, Ln, Lo, x, sill, side, w, h, o = {}) {
  const pts = rrPts(x, sill + h / 2, w, h, o.r ?? .16, o.flat), ppm = P.ppm(Lc), lw = o.jet ? Math.max(1.6, (o.lw || .022) * ppm) : (o.lw || .016) * ppm, g = Lc.g;
  if (!o.jet) { P.path(Lc, pts, side); g.strokeStyle = o.c || 'rgba(70,76,84,.85)'; g.lineWidth = lw; g.stroke(); }
  else {
  if (o.lip !== false) { P.path(Lc, rrPts(x, sill + h / 2 - .02, w, h, o.r ?? .16, o.flat), side); g.strokeStyle = 'rgba(255,255,255,.4)'; g.lineWidth = lw * .7; g.stroke(); }
  P.path(Lc, pts, side); g.fillStyle = 'rgba(40,38,34,.03)'; g.fill(); g.strokeStyle = 'rgba(60,56,48,.07)'; g.lineWidth = lw * 5; g.stroke(); g.strokeStyle = o.c || 'rgba(28,31,35,.82)'; g.lineWidth = lw; g.stroke();
  if (o.hinge) P.local(Lc, x - w / 2 - .05, sill + h / 2, side, (q) => { q.fillStyle = 'rgba(40,44,48,.45)'; q.fillRect(-.007, -h * .4, .014, h * .8); });
  if (o.grab) P.local(Lc, x + w * .28, sill + h * .45, side, (q) => { q.fillStyle = 'rgba(32,35,39,.7)'; q.fillRect(-.12, -.035, .24, .07); q.fillStyle = 'rgba(255,255,255,.35)'; q.fillRect(-.12, -.05, .24, .012); });
  }
  groove(Ln, P.path(Ln, pts, side), .6, Math.max(1, lw * Ln.W / Lc.W));
  P.path(Lo, pts, side); Lo.g.strokeStyle = 'rgba(0,255,0,.6)'; Lo.g.lineWidth = Math.max(1, lw * Lo.W / Lc.W); Lo.g.stroke();
  if (o.port) P.local(Lc, x, sill + h * .72, side, (g) => { g.beginPath(); g.arc(0, 0, .065, 0, 7); g.fillStyle = '#20262c'; g.fill(); g.strokeStyle = '#9aa0a5'; g.lineWidth = .014; g.stroke(); });
  if (o.handle) P.local(Lc, x - w * .3, sill + h * .5, side, (g) => { g.fillStyle = 'rgba(55,60,66,.7)'; g.fillRect(-.09, -.025, .18, .05); });
}
function regText(L, R, str, s, x, h, dx, dy, fill, sx = 1, font = 'Arial, Helvetica, sans-serif') {
  const pu = (R.u1 - R.u0) / (R.s1 - R.s0) * L.W, pv = (R.v1 - R.v0) / (R.x1 - R.x0) * L.H, p0 = R.px(s, x), g = L.g;
  g.save(); g.setTransform(dx[0] * pu * .01 * sx, dx[1] * pv * .01 * sx, dy[0] * pu * .01, dy[1] * pv * .01, p0[0] * L.W / (R.pxW || L.W), p0[1] * L.H / (R.pxH || L.H));
  g.font = `700 ${h * 136}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = fill; g.fillText(str, 0, 0); g.restore();
}
function regionMap(regs, W, H) {
  return regs.map((r) => ({ ...r, uv: (s, x) => [r.u0 + (s - r.s0) / (r.s1 - r.s0) * (r.u1 - r.u0), r.v0 + (x - r.x0) / (r.x1 - r.x0) * (r.v1 - r.v0)], px: (s, x) => [(r.u0 + (s - r.s0) / (r.s1 - r.s0) * (r.u1 - r.u0)) * W, (r.v0 + (x - r.x0) / (r.x1 - r.x0) * (r.v1 - r.v0)) * H] }));
}
function surfPaint(R, def, Lc, Ln, Lo, sp, o, r) {
  const g = Lc.g, s0 = Math.max(def.s0, R.s0), s1 = Math.min(def.s1, R.s1);
  const at = (s, f) => R.px(s, def.fx(s) + f * def.fc(s));
  const cP = (L, f, sa = s0, sb = s1) => [sa, ...def.raw.map((q) => q.s).filter((s) => s > sa + 1e-4 && s < sb - 1e-4), sb].map((s) => { const p = at(s, f); return [p[0] * L.W / Lc.W, p[1] * L.H / Lc.H]; });
  const curve = (L, f, w, col, sa, sb) => segs(L, [cP(L, f, sa, sb)], w, col);
  const regionPoly = (L, fa, fb, sa, sb) => { const q = L.g; q.beginPath(); [...cP(L, fa, sa, sb), ...cP(L, fb, sa, sb).reverse()].forEach((p, k) => q[k ? 'lineTo' : 'moveTo'](p[0], p[1])); q.closePath(); };
  if (o.base) { regionPoly(Lc, -.2, 1.25, s0, s1); g.fillStyle = o.base; g.fill(); regionPoly(Lo, -.2, 1.25, s0, s1); Lo.g.fillStyle = ORM(o.rough ?? .4, o.metal ?? 0); Lo.g.fill(); }
  const chordL = o.chord || [.15, .4, .65], spanStep = o.rib || 1.2, amp = o.tilt ?? .05, fs = [-.05, ...chordL, 1.05], rv = o.rvar ?? .05, tn = o.tone ?? .03, ribs = [];
  for (let k = 0; k < fs.length - 1; k++) for (let sa = s0, j = 0; sa < s1 - 1e-3; j++) {
    let sb = Math.min(s1, sa + spanStep * (j ? .55 + .9 * r() : .3 + 1.1 * r())); if (s1 - sb < spanStep * .3) sb = s1;
    regionPoly(Ln, fs[k], fs[k + 1], sa, sb); Ln.g.fillStyle = NRM((r() - .5) * 2 * amp, (r() - .5) * 2 * amp); Ln.g.fill();
    const fm = (fs[k] + fs[k + 1]) / 2, pa = at(sa, fm + (r() - .5) * .3), pb = at(sb, fm + (r() - .5) * .3), q = g.createLinearGradient(pa[0], pa[1], pb[0], pb[1]); q.addColorStop(0, TCOL((r() - .5) * 2 * tn)); q.addColorStop(1, TCOL((r() - .5) * 2 * tn)); regionPoly(Lc, fs[k], fs[k + 1], sa, sb); g.fillStyle = q; g.fill();
    const ro = (r() - .5) * 2 * rv; regionPoly(Lo, fs[k], fs[k + 1], sa, sb); Lo.g.fillStyle = ro > 0 ? `rgba(0,255,0,${ro})` : `rgba(0,0,0,${-ro})`; Lo.g.fill();
    if (sb < s1) ribs.push([at(sb, fs[k] + (k ? .004 : .03)), at(sb, fs[k + 1] - (k < fs.length - 2 ? .004 : .03))]);
    sa = sb;
  }
  const pu = Lc.W / (R.s1 - R.s0) * (R.u1 - R.u0), pv = Lc.H / (R.x1 - R.x0) * (R.v1 - R.v0);
  for (const L of [Lc, Lo]) { L.g.save(); L.g.beginPath(); L.g.rect(R.u0 * L.W, R.v0 * L.H, (R.u1 - R.u0) * L.W, (R.v1 - R.v0) * L.H); L.g.clip(); }
  for (let i = 0, nb = o.blobs ?? Math.round((s1 - s0) * 1.2); i < nb; i++) {
    const s = lerp(s0, s1, r()), f = r() * 1.1 - .05, [x, y] = at(s, f), rad = .4 + 1.4 * r(), lt = r() < .5, a = (o.weather ?? .035) * (.4 + .6 * r()), ro = .03 + .05 * r(), ang = r() * 3;
    for (const [L, col] of [[Lc, lt ? `rgba(255,255,255,${a})` : `rgba(20,18,14,${a * 1.3})`], [Lo, lt ? `rgba(0,0,0,${ro})` : `rgba(0,255,0,${ro})`]]) { const k2 = L.W / Lc.W, G = L.g; G.save(); G.translate(x * k2, y * k2); G.rotate(ang); G.scale(rad * pu * k2 * (1 + r()), rad * pv * k2 * (.5 + .5 * r())); const q = G.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, col); q.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); G.fillStyle = q; G.fillRect(-1, -1, 2, 2); G.restore(); }
  }
  for (const L of [Lc, Lo]) L.g.restore();
  const sw = Math.max(1, Lc.W / (R.s1 - R.s0) * (o.seamW ?? .006)), nw = Math.max(1, Ln.W / (R.s1 - R.s0) * .005), seam = o.seam || 'rgba(40,46,52,.3)';
  segs(Lc, [...chordL.map((f) => cP(Lc, f)), ...ribs], sw, seam); segs(Ln, chordL.map((f) => cP(Ln, f)), nw, NRM(.1, .1)); segs(Ln, ribs.map((q) => q.map((p) => [p[0] * Ln.W / Lc.W, p[1] * Ln.H / Lc.H])), nw, NRM(.12, 0));
  if (o.rivet) {
    const pt = o.fr ? 0 : o.rivet[0] * Ln.W / (R.s1 - R.s0), d = o.rivet[1] * Ln.W / (R.s1 - R.s0), k = Lc.W / Ln.W, fr = []; if (o.fr) for (let s = s0 + o.fr; s < s1 - .1; s += o.fr) fr.push([at(s, .015), at(s, .985)]);
    Ln.g.globalAlpha = pt ? 1 : .45; segs(Ln, [...chordL.map((f) => cP(Ln, f)), ...fr.map((q) => q.map((p) => [p[0] / k, p[1] * Ln.H / Lc.H]))], pt ? d : Math.max(.8, d), NRM(.3, .3), pt); Lc.g.globalAlpha = pt ? 1 : .55; segs(Lc, [...chordL.map((f) => cP(Lc, f)), ...fr], pt ? d * k : Math.max(1, d * k), o.rivetC || 'rgba(30,34,40,.2)', pt * k); Ln.g.globalAlpha = Lc.g.globalAlpha = 1;
  }
  if (o.le) { regionPoly(Lc, -.2, o.le[0], s0, s1); g.fillStyle = o.le[1]; g.fill(); regionPoly(Lo, -.2, o.le[0], s0, s1); Lo.g.fillStyle = ORM(o.le[2] ?? .2, o.le[3] ?? 1); Lo.g.fill(); }
  return { at, regionPoly, curve, cP };
}

function fabric(R, def, Lc, Ln, Lo, s0, s1, fA, o) {
  s0 = Math.max(s0, def.s0, R.s0); s1 = Math.min(s1, def.s1, R.s1); if (s1 - s0 < .05) return;
  const at = (L, s, f) => { const p = R.px(s, def.fx(s) + f * def.fc(s)); return [p[0] * L.W / Lc.W, p[1] * L.H / Lc.H]; };
  const poly = (L, sa, sb) => { const g = L.g; g.beginPath(); for (let k = 0; k <= 8; k++) { const s = lerp(sa, sb, k / 8); g.lineTo(...at(L, s, fA(s) + .005)); } for (let k = 8; k >= 0; k--) { const s = lerp(sa, sb, k / 8); g.lineTo(...at(L, s, 1.04)); } g.closePath(); };
  poly(Lc, s0, s1); Lc.g.fillStyle = o.col; Lc.g.fill(); poly(Lo, s0, s1); Lo.g.fillStyle = ORM(o.rough, o.metal ?? 0); Lo.g.fill();
  const n = Math.max(1, Math.round((s1 - s0) / o.rib)), k0 = o.sag ?? .06;
  const rl = [];
  for (let k = 0; k < n; k++) {
    const sa = lerp(s0, s1, k / n), sb = lerp(s0, s1, (k + 1) / n), a = at(Ln, sa, .7), b = at(Ln, sb, .7), q = Ln.g.createLinearGradient(a[0], a[1], b[0], b[1]);
    q.addColorStop(0, NRM(k0, 0)); q.addColorStop(.5, N0); q.addColorStop(1, NRM(-k0, 0)); poly(Ln, sa, sb); Ln.g.fillStyle = q; Ln.g.fill();
    rl.push([...at(Lc, sa, fA(sa)), ...at(Lc, sa, 1.03)]);
  }
  segs(Lc, rl, Math.max(5, Lc.W / 360), 'rgba(0,0,0,.035)'); segs(Lc, rl, Math.max(1.5, Lc.W / 1400), o.ribC || 'rgba(255,255,255,.07)');
  const h0 = at(Lc, s0, fA(s0) + .003), h1 = at(Lc, s1, fA(s1) + .003); line(Lc, h0[0], h0[1], h1[0], h1[1], Math.max(2, Lc.W / 700), 'rgba(15,15,15,.45)');
}
const SKY = { acSkyZ: { value: new THREE.Color(1, 1, 1) }, acSkyH: { value: new THREE.Color(1, 1, 1) }, acSkyG: { value: new THREE.Color(1, 1, 1) }, acSpec: { value: 1 } };
const SKYP = '#include <common>\nuniform vec3 acSkyZ, acSkyH, acSkyG; uniform float acSpec;\nvec3 acSky(float y) { return y > 0. ? mix(acSkyH, acSkyZ, sqrt(y)) : mix(acSkyH, acSkyG, sqrt(-y)); }', ENVP = THREE.ShaderChunk.envmap_physical_pars_fragment.replace('PI * envMapColor.rgb * envMapIntensity', 'PI * envMapColor.rgb * envMapIntensity * acSky((envMapRotation * worldNormal).y)').replace('return envMapColor.rgb * envMapIntensity', 'return envMapColor.rgb * envMapIntensity * acSky((envMapRotation * reflectVec).y)');
const SKYK = [[0, 1, [1, 1, 1], [1, 1, 1], [1, 1, 1]], [.5, .55, [.94, .88, .98], [1.2, .94, .78], [1.05, .92, .86]], [.8, .2, [.9, .78, .92], [1.38, .9, .72], [1.12, .8, .84]], [1, .025, [.7, .88, 1.45], [.95, .86, 1], [.6, .76, 1.2]]];
function skyTint(n) {
  let i = 1; while (i < SKYK.length - 1 && n > SKYK[i][0]) i++;
  const a = SKYK[i - 1], b = SKYK[i], f = clamp((n - a[0]) / (b[0] - a[0]), 0, 1), L = lerp(a[1], b[1], f);
  SKY.acSpec.value = lerp(1, .4, sm(.85, 1, n));
  ['acSkyZ', 'acSkyH', 'acSkyG'].forEach((k, j) => SKY[k].value.setRGB(lerp(a[j + 2][0], b[j + 2][0], f) * L, lerp(a[j + 2][1], b[j + 2][1], f) * L, lerp(a[j + 2][2], b[j + 2][2], f) * L));
}
const DEC = (sh) => { Object.assign(sh.uniforms, SKY); sh.fragmentShader = sh.fragmentShader.replace('#include <common>', SKYP).replace('#include <envmap_physical_pars_fragment>', ENVP).replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n{ float pk = max(metalnessFactor, 1. - smoothstep(.1, .2, roughnessFactor)); material.specularF90 = mix(.45, 1., pk); material.specularColor *= mix(.75, 1., pk); }').replace('#include <aomap_fragment>', '{ float sl = dot(reflectedLight.directSpecular, vec3(.2126, .7152, .0722)), e = max(sl - 1.4, 0.); reflectedLight.directSpecular *= acSpec * (sl - e + e / (1. + e / 2.4)) / max(sl, 1e-4); }\n#include <aomap_fragment>').replace('#include <map_fragment>', '#ifdef USE_MAP\n\tdiffuseColor *= sRGBTransferEOTF( texture2D( map, vMapUv ) );\n#endif').replace('#include <emissivemap_fragment>', '#ifdef USE_EMISSIVEMAP\n\ttotalEmissiveRadiance *= sRGBTransferEOTF( texture2D( emissiveMap, vEmissiveMapUv ) ).rgb;\n#endif'); }, DECK = () => 'acdec';
const WELL = (sh) => {
  DEC(sh);
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec4 wbox; attribute float wtop; varying vec3 vLP, vLC; varying vec4 vWB; varying float vWT;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvLP = position; vLC = (inverse(modelMatrix) * vec4(cameraPosition, 1.)).xyz; vWB = wbox; vWT = wtop;');
  sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vLP, vLC; varying vec4 vWB; varying float vWT;').replace('#include <color_fragment>', `#include <color_fragment>
{ vec3 rd = normalize(vLP - vLC); rd += vec3(1e-5); float tx = ((rd.x > 0. ? vWB.y : vWB.x) - vLP.x) / rd.x, tz = ((rd.z > 0. ? vWB.w : vWB.z) - vLP.z) / rd.z, ty = (vWT - vLP.y) / max(rd.y, 1e-4), tw = min(tx, tz), t = max(min(tw, ty), 0.);
  vec3 h = vLP + rd * t; float dep = clamp((h.y - vLP.y) / max(vWT - vLP.y, .1), 0., 1.), top = step(ty, tw), e = min(min(h.x - vWB.x, vWB.y - h.x), min(h.z - vWB.z, vWB.w - h.z));
  float ao = (top > .5 ? mix(.3, .6, smoothstep(0., .6, e)) : mix(.95, .34, sqrt(dep))) * mix(.6, 1., smoothstep(0., .25, e));
  vec2 q = top > .5 ? h.xz : vec2(h.x + h.z, h.y);
  float fr = smoothstep(.8, .86, fract(q.x * 2.2)) * (1. - smoothstep(.9, .96, fract(q.x * 2.2))), ln = smoothstep(.92, .955, fract(q.y * 3.1 + .3)) * (1. - smoothstep(.965, 1., fract(q.y * 3.1 + .3)));
  vec2 c = floor(q * vec2(1.4, 2.3)); float n = fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.55), bx = step(.72, n) * step(.15, fract(q.x * 1.4)) * step(.2, fract(q.y * 2.3));
  diffuseColor.rgb *= ao * (1. + .55 * fr + .8 * ln) * (1. - .5 * bx + .15 * n) * mix(vec3(1.), vec3(.9, .94, .86), top); }`);
};
const SOOT = (sh) => { DEC(sh); sh.fragmentShader = sh.fragmentShader.replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nfloat sk = smoothstep(.04, .55, vColor.r); roughnessFactor = mix(1., roughnessFactor, sk); metalnessFactor *= sk;').replace('#include <lights_fragment_begin>', 'material.specularColor *= sk; material.specularF90 *= sk;\n#include <lights_fragment_begin>'); }, sootM = (m) => { m.onBeforeCompile = SOOT; m.customProgramCacheKey = () => 'acsoot'; return m; };
let DEF = null;
function std(T, o, ei = 1) {
  const m = new THREE.MeshStandardMaterial(o), d = DEF || (DEF = [tex(layer(4, 4, '#fff').c), tex(layer(4, 4, N0).c)]); for (const k of ['map', 'roughnessMap', 'metalnessMap', 'emissiveMap']) m[k] ||= d[0]; m.normalMap ||= d[1]; m.onBeforeCompile = DEC; m.customProgramCacheKey = DECK; m.envMap = envTex(T.env); m.envMapRotation = T.erot; m.envMapIntensity = ei; T.mats.push(m); return m;
}

function liftSurface(K, name, def, cuts, o) {
  const { mz = 1, M = 14 } = o, gap = o.gap ?? .012, sEps = .002, gapL = o.gapL ?? .004;
  const box = (s) => {
    let c0 = 0, c1 = 1;
    for (const c of cuts) { if (s < c.s0 - 1e-6 || s > c.s1 + 1e-6 || c.plate) continue; if (c.lead) c0 = Math.max(c0, c.c1 + gapL); else c1 = Math.min(c1, c.f(s) - gap); }
    return [c0, c1];
  };
  const brk = new Set(def.raw.map((r) => r.s)); for (const c of cuts) if (!c.plate) { brk.add(c.s0 - sEps); brk.add(c.s0 + sEps); brk.add(c.s1 - sEps); brk.add(c.s1 + sEps); }
  const sa = o.sa ?? def.s0, sb = o.sb ?? def.s1;
  let ss = [...brk].filter((s) => s >= sa && s <= sb); ss.push(sa, sb); ss = [...new Set(ss)].sort((a, b) => a - b);
  const fine = []; for (let i = 0; i < ss.length; i++) { if (i) { const a = ss[i - 1], b = ss[i], m = Math.ceil((b - a) / (o.step || 1.5)); for (let k = 1; k < m; k++) fine.push(a + (b - a) * k / m); } fine.push(ss[i]); }
  fine.sort((a, b) => a - b);
  const xOf = (p) => o.xOf(p);
  const st = fine.map((s) => { const q = def.at(s, ...box(s)); q.xOf = xOf; return q; });
  const geo = K.g(name, () => surf(st, { M, mz, uvT: o.uvT, uvB: o.uvB, capA: o.capA, capB: o.capB ?? true }));
  const movers = cuts.map((c, i) => {
    if ((c.s1 < sa) || (c.s0 > sb)) return null;
    const tr = c.lead ? .02 : .01, a = Math.max(c.s0 + tr, sa), b = Math.min(c.s1 - tr, sb), m = Math.max(1, Math.ceil((b - a) / 1.2));
    const sl = [...Array.from({ length: m + 1 }, (_, k) => lerp(a, b, k / m)), ...def.raw.map((q) => q.s).filter((s) => s > a + .01 && s < b - .01)].sort((x, y) => x - y);
    const sts = sl.map((s) => { const q = def.at(s, c.lead ? 0 : c.f(s), c.lead ? c.c1 : (c.plate ? c.f2(s) : 1)); q.xOf = xOf; return q; });
    const q0 = o.up ? sts[sts.length >> 2] : sts[0], q1 = o.up ? sts[(sts.length * 3) >> 2] : sts[sts.length - 1], hf = c.lead ? c.c1 * .9 : c.f(q0.s), hf1 = c.lead ? c.c1 * .9 : c.f(q1.s);
    const hy = (q, f) => { const [u, l] = foil(f, q.t, q.cam); return c.plate > 0 ? u : c.plate < 0 ? l : (u + l) / 2; };
    const H0 = q0.p.clone().addScaledVector(q0.dir, hf * q0.c).addScaledVector(q0.n, hy(q0, hf) * q0.c), H1 = q1.p.clone().addScaledVector(q1.dir, hf1 * q1.c).addScaledVector(q1.n, hy(q1, hf1) * q1.c);
    H0.z *= mz; H1.z *= mz;
    const axis = H1.clone().sub(H0).normalize(); if (o.up ? axis.y < 0 : axis.z < 0) axis.negate();
    const g = K.g(`${name}:${i}`, () => surf(sts, { M: c.plate ? 6 : 8, mz, uvT: o.uvT, uvB: o.uvB, capA: true, capB: true, plate: c.plate }).translate(-H0.x, -H0.y, -H0.z));
    const dirAvg = q0.dir.clone().add(q1.dir).normalize(), nAvg = q0.n.clone().add(q1.n).normalize(); dirAvg.z *= mz; nAvg.z *= mz;
    return { c, g, H0, axis, dir: dirAvg, n: nAvg, cm: (q0.c + q1.c) / 2 };
  }).filter(Boolean);
  return { geo, movers, st };
}

function latheV(P, V, S, ur = 1) { const rows = [], uvs = []; P.forEach(([x, r], i) => { const row = [], u = []; for (let j = 0; j <= S; j++) { const a = j / S * Math.PI * 2; row.push([x, r * Math.cos(a), r * Math.sin(a)]); u.push([j / S * ur, V[i]]); } rows.push(row); uvs.push(u); }); return sheet(rows, uvs, false, true).rotateY(-Math.PI / 2); }
function tyreGeo(D, W) {
  const R = D / 2, ri = R * .58;
  return latheV([[W * .38, ri], [W * .47, ri + R * .04], [W * .5, ri + R * .14], [W * .5, R - R * .22], [W * .47, R - R * .1], [W * .42, R - R * .03], [W * .32, R], [0, R * 1.002], [-W * .32, R], [-W * .42, R - R * .03], [-W * .47, R - R * .1], [-W * .5, R - R * .22], [-W * .5, ri + R * .14], [-W * .47, ri + R * .04], [-W * .38, ri]], [0, .04, .1, .24, .29, .32, .36, .5, .64, .68, .71, .76, .9, .96, 1], 36, 4);
}
function hubGeo(D, W) { const R = D / 2, ri = R * .58; return merge([[latheV([[W * .42, .001], [W * .42, ri * .1], [W * .36, ri * .16], [W * .36, ri * .38], [W * .3, ri * .46], [W * .2, ri * .52], [W * .2, ri * .82], [W * .32, ri * .9], [W * .38, ri * .97], [W * .38, ri]], [0, .1, .14, .3, .36, .42, .62, .8, .92, 1], 28)], [latheV([[-W * .38, ri], [-W * .3, ri * .7], [-W * .34, ri * .25], [-W * .4, .001]], [.5, .5, .5, .5], 20)]]); }
let TYRE = null, HUBT = null;
function tyreTex() {
  if (TYRE) return TYRE;
  const W = 64, H = 256, C = layer(W, H, '#29292b'), N = layer(W, H, N0), O = layer(W, H, ORM(.86, 0)), g = C.g, r = rng(21);
  for (const [a, b] of [[0, .3], [.7, 1]]) { const q = g.createLinearGradient(0, a * H, 0, b * H), inner = a < .5; for (const [o, c] of [[0, '#393a3c'], [.12, '#303133'], [.5, '#252628'], [.85, '#2c2d2f'], [1, '#333437']]) q.addColorStop(inner ? o : 1 - o, c); g.fillStyle = q; g.fillRect(0, a * H, W, (b - a) * H); const n = N.g.createLinearGradient(0, a * H, 0, b * H); for (const [o, c] of [[0, NRM(0, inner ? .5 : -.5)], [.3, N0], [.7, N0], [1, NRM(0, inner ? -.35 : .35)]]) n.addColorStop(o, c); N.g.fillStyle = n; N.g.fillRect(0, a * H, W, (b - a) * H); }
  for (const v of [.1, .9]) { line(C, 0, v * H, W, v * H, 2, 'rgba(70,72,76,.5)'); line(N, 0, v * H - 1, W, v * H - 1, 1, NRM(0, .6)); line(N, 0, v * H + 1, W, v * H + 1, 1, NRM(0, -.6)); }
  g.fillStyle = '#262729'; g.fillRect(0, .33 * H, W, .34 * H); O.g.fillStyle = ORM(.93, 0); O.g.fillRect(0, .33 * H, W, .34 * H);
  for (let k = 0; k < 40; k++) { g.fillStyle = `rgba(90,88,84,${(.03 + .05 * r()).toFixed(3)})`; g.fillRect(r() * W, (.35 + .3 * r()) * H, 2 + 6 * r(), 1 + 2 * r()); }
  for (const v of [.42, .475, .525, .58]) { g.fillStyle = '#080809'; g.fillRect(0, v * H - 2.5, W, 5); N.g.fillStyle = NRM(0, .8); N.g.fillRect(0, v * H - 3.5, W, 2); N.g.fillStyle = NRM(0, -.8); N.g.fillRect(0, v * H + 1.5, W, 2); O.g.fillStyle = ORM(1, 0); O.g.fillRect(0, v * H - 2.5, W, 5); }
  const t = tex(C.c, true, true); t.userData = { n: tex(N.c, false, true), o: tex(O.c, false, true) }; return (TYRE = t);
}
function hubTex() {
  if (HUBT) return HUBT;
  const W = 256, H = 128, C = layer(W, H, '#d6d9db'), O = layer(W, H, ORM(.32, .85)), g = C.g, F = (a, b, col, ro, me) => { g.fillStyle = col; g.fillRect(0, a * H, W, (b - a) * H); O.g.fillStyle = ORM(ro, me); O.g.fillRect(0, a * H, W, (b - a) * H); };
  F(0, .1, '#9a9ea2', .4, .8); F(.1, .14, '#c4c8cb', .3, .85); F(.36, .62, '#3a3c3f', .7, .5); F(.42, .6, '#2a2b2d', .75, .4); F(.62, .8, '#8d9195', .45, .7); F(.46, .5, 'rgba(110,100,90,.55)', .8, .3);
  for (let k = 0; k < 10; k++) { const x = (k + .5) / 10 * W; g.fillStyle = '#5c6064'; g.beginPath(); g.ellipse(x, .22 * H, 6, 5, 0, 0, 7); g.fill(); g.fillStyle = '#e8eaec'; g.beginPath(); g.ellipse(x - 1.5, .22 * H - 1.2, 2.5, 2, 0, 0, 7); g.fill(); }
  for (let k = 0; k < 8; k++) { const x = (k + .25) / 8 * W; g.fillStyle = '#1b1c1e'; g.fillRect(x - 7, .66 * H, 14, .1 * H); }
  const t = tex(C.c, true); t.userData = { o: tex(O.c, false) }; return (HUBT = t);
}
function bladeGeo(R, hub, chordF, twistF, n, thick = .1) {
  const parts = [];
  for (let b = 0; b < n; b++) {
    const rows = [], uvs = [];
    for (const t of [0, .11, .22, .33, .44, .55, .66, .76, .85, .9, .94, .97, .99, 1]) {
      const r = lerp(hub, R, t), c = chordF(t), beta = twistF(t) * D, ring = [];
      const dir = new V3(-Math.sin(beta), 0, -Math.cos(beta)), nn = new V3(Math.cos(beta), 0, -Math.sin(beta));
      for (const [f, up] of [[0, 1], [.15, 1], [.4, 1], [.75, 1], [1, 1], [.75, 0], [.4, 0], [.15, 0], [0, 0]]) { const [a, l] = foil(f, thick * (1.4 - t), .03); const y = up ? a : l; ring.push(new V3(0, r, 0).addScaledVector(dir, (f - .3) * c).addScaledVector(nn, y * c).toArray()); }
      rows.push(ring); uvs.push(ring.map((_, j) => [j / (ring.length - 1), t]));
    }
    parts.push([sheet(rows, uvs, false), M4([0, 0, 0], QE(b / n * Math.PI * 2, 0, 0))]);
  }
  return merge(parts);
}

function wingRaw(w) {
  const pf = w.pf, raw = [];
  const dihAt = (y) => { if (typeof w.dih === 'number') return w.dih; let d = w.dih[0][1]; for (const [y0, v] of w.dih) if (y >= y0) d = v; return d; };
  const hAt = w.hs ? tab(w.hs) : (() => { const y0 = pf[0][0]; return (y) => { let h = w.h, yy = y0; while (yy < y - 1e-6) { const st = Math.min(.25, y - yy); h += Math.tan(dihAt(yy + st / 2) * D) * st; yy += st; } return h; }; })();
  const tcA = tab(w.tc), twA = tab(w.tw || [[0, 0]]);
  for (const [y, le, te] of pf) raw.push({ s: y, x: le, h: hAt(y), w: y, c: te - le, t: tcA(y), tw: twA(y), cam: w.cam ?? .02 });
  if (w.tip) {
    const l = raw.pop(), [yT, xT] = w.tip, N = 7;
    for (let k = 0; k <= N; k++) { const a = k / N * Math.PI / 2, y = l.w + (yT - l.w) * Math.sin(a), le = l.x + (xT - l.x) * (1 - Math.cos(a)) ** 1.2, te = l.x + l.c + (xT - l.x - l.c) * (1 - Math.cos(a)) ** 1.2; raw.push({ s: y, x: le, h: hAt(y), w: y, c: Math.max(te - le, l.c * .06), t: l.t * (1 - .3 * (1 - Math.cos(a))), tw: l.tw, cam: l.cam }); }
  }
  if (w.wl) {
    const l = raw[raw.length - 1], { dy, rise, x, c, t, rho = .4 } = w.wl;
    let a = .1, b = 1.55; for (let k = 0; k < 40; k++) { const p = (a + b) / 2, Ls = (rise - rho * (1 - Math.cos(p))) / Math.sin(p), d = rho * Math.sin(p) + Ls * Math.cos(p); if (d > dy) a = p; else b = p; }
    const phi = (a + b) / 2, Ls = (rise - rho * (1 - Math.cos(phi))) / Math.sin(phi), arc = rho * phi, tot = arc + Ls, pts = [];
    for (let k = 1; k <= 4; k++) { const p = phi * k / 4; pts.push([rho * Math.sin(p), rho * (1 - Math.cos(p)), rho * p]); }
    for (let k = 1; k <= 3; k++) { const d = Ls * k / 3; pts.push([rho * Math.sin(phi) + d * Math.cos(phi), rho * (1 - Math.cos(phi)) + d * Math.sin(phi), arc + d]); }
    for (const [dyy, dh, sl] of pts) { const q = sl / tot; raw.push({ s: l.s + sl, x: lerp(l.x, x, q), h: l.h + dh, w: l.w + dyy, c: lerp(l.c, c, q), t: lerp(l.t, t, q), tw: l.tw * (1 - q), cam: lerp(l.cam, 0, q) }); }
  }
  return raw;
}
function finRaw(f) {
  if (f.egg) {
    const [x0, x1, yb, yt, yw, zf, cant = 0] = f.egg, N = f.n || 14, raw = [], C = x1 - x0, xc = (x0 + x1) / 2;
    for (let k = 0; k <= N; k++) { const t = k / N, y = lerp(yb, yt, (1 - Math.cos(t * Math.PI)) / 2), e = y < yw ? (yw - y) / (yw - yb) : (y - yw) / (yt - yw), q2 = y > yw && f.sqT ? f.sqT : f.sq ?? 2, c = Math.max(C * .08, C * Math.pow(Math.max(0, 1 - Math.pow(e, q2)), 1 / q2)); raw.push({ s: y - yb, x: xc - c / 2 + (f.lean || 0) * (y - yb), h: y, w: zf + Math.tan(cant * D) * (y - yb), c, t: f.t || .12, tw: 0, cam: 0 }); }
    return raw;
  }
  return f.st.map(([h, le, te, t]) => ({ s: h, x: le, h: f.base + h, w: f.z || 0, c: te - le, t: t ?? f.t ?? .11, tw: 0, cam: 0 }));
}


export function buildAircraft(key, reg) {
  reg = reg && String(reg).split(/[;/]/)[0].replace(/\s*\([^)]*\)/g, '').trim();
  const sp = SPECS[key] || SPECS.a330; if (!SPECS[key]) key = 'a330';
  const K = kitOf(key), tk = `${key}|${reg ?? ''}`, L = sp.length, y0 = sp.y0 || 0;
  const B = (x, h, w = 0) => new V3(L / 2 - x, h - y0, w);
  const xOfP = (p) => L / 2 - p.x;
  const X1 = sp.hullLen;
  const F = K.v('loft', () => loftFn(sp.loft, { nU: sp.nU, nL: sp.nL, vee: sp.vee }));
  const H = K.v('map', () => hullMap(F, sp));
  const FF = sp.fair ? K.v('fairF', () => loftFn(sp.fair, { nU: 2, nL: 2.4 })) : null;
  const belly = (x, z) => { const a = lowAt(F, x, z), b = FF && lowAt(FF, x, z); return b && (!a || b.y < a.y - .01) ? { ...b, fair: true } : a; };
  let T = CACHE.tpl.get(tk);
  if (!T) { T = { mats: [], texs: [], erot: new THREE.Euler(), m: {}, env: (sp.paint || {}).env || ((sp.paint || {}).metal ? 'm' : 'p') }; CACHE.tpl.set(tk, T); }
  const mat = (n, f) => T.m[n] || (T.m[n] = f());
  const kseed = hashS(key);
  const group = new THREE.Group(), parts = {}; group.name = key;
  const meshes = [], lights = [], ctl = [], props = [], gears = [], doorsL = [];
  const add = (parent, g, m, o = {}) => { const ms = new THREE.Mesh(g, m); ms.castShadow = !o.noShadow; ms.receiveShadow = true; if (o.ro) ms.renderOrder = o.ro; if (o.p) ms.position.copy(o.p); if (o.q) ms.quaternion.copy(o.q); parent.add(ms); meshes.push(ms); return ms; };
  for (const n of ['nose', 'mid', 'aft', 'wings', 'fin']) { parts[n] = new THREE.Group(); parts[n].name = n; group.add(parts[n]); }
  const LV = LIV[key] || {};
  const paint = sp.paint || {}, metalType = !!paint.metal;

  const splits = sp.splits || [L * .3, L * .62];
  const fineK = []; for (const [a, b, st] of sp.fine || []) for (let x = a; x <= b; x += st) fineK.push(x);
  const hullGeos = K.g('hull', () => loftGeo(F, { n: sp.ringN || 40, step: sp.hullStep || L / 130, splits, knots: fineK, capEnd: true, capStart: sp.openFront ? false : true, conv: (x, y, z) => [L / 2 - x, y - y0, z], uv: (x, s, len, k) => [k === 3 ? .9985 : x / X1 * .995, s / 2] }));
  const HC = Math.round(4096 * TS * (sp.hullTex ?? 1)), HN = Math.round(2048 * TS * (sp.hullTexN ?? 1));
  const hullBase = K.v('hullBase', () => {
    const Lc = layer(HC, HC / 2, paint.base || '#f2f3f1'), Ln = layer(HN, HN / 2, N0), Lo = layer(HN, HN / 2, ORM(paint.rough ?? .32, paint.metal ? 1 : 0)), Le = layer(1024 * TS, 512 * TS, '#000');
    const P = painter(H, [Lc, Ln, Lo]), rr2 = rng(kseed + 1);
    (LV.hull || (() => {}))(P, { Lc, Ln, Lo, Le, sp, r: rr2, B, H, F, FF, belly }, 'pre');
    skinPanels(P, sp, Lc, Ln, Lo, rr2);
    (LV.hull || (() => {}))(P, { Lc, Ln, Lo, Le, sp, r: rr2, B, H, F, FF, belly }, 'post');
    Lc.g.fillStyle = paint.exhaust || '#2a2d30'; Lc.g.fillRect(.997 * HC, 0, HC, Lc.H);
    return { Lc, Ln: K.t(tex(Ln.c, false)), Lo: K.t(tex(Lo.c, false)), Le: K.t(tex(Le.c, true)), P };
  });
  const regTex = (kind, base, ctx) => { if (!(reg && LV.regOn?.includes(kind))) return K.v(kind + 'Tex', () => K.t(tex(base, true))); return mat(kind + 'C', () => { const c2 = cv(base.width, base.height), g = c2.getContext('2d'); g.drawImage(base, 0, 0); LV.reg(null, { Lc: { c: c2, g, W: c2.width, H: c2.height }, sp, reg, ...ctx }, kind); const t = tex(c2, true); T.texs.push(t); return t; }); };
  const hullC = regTex('hull', hullBase.Lc.c);
  const metalNS = paint.nScale ?? (metalType ? .9 : .45);
  const hullM = mat('hull', () => std(T, { map: hullC, normalMap: hullBase.Ln, normalScale: new THREE.Vector2(metalNS, metalNS), roughnessMap: hullBase.Lo, metalnessMap: hullBase.Lo, roughness: 1, metalness: 1, emissiveMap: hullBase.Le, emissive: 0xffffff, emissiveIntensity: 0 }, paint.ei ?? 1));
  const names = ['nose', 'mid', 'aft'];
  hullGeos.forEach((g, i) => add(parts[names[i]], g, hullM));
  const ra = reg && LV.regAt?.(reg);
  if (ra) {
    const { P } = hullBase, w = ra.h * .62 * (ra.sx || 1) * String(reg).length + .2;
    for (const sd of [1, -1]) {
      const vs = []; for (let k = 0; k <= 8; k++) for (const Y of [ra.Y - ra.h * .8, ra.Y + ra.h * .8]) vs.push(P.uv(lerp(ra.x - w, ra.x + w, k / 8), Y, sd)[1]);
      const u0 = (ra.x - w) / X1 * H.U, u1 = (ra.x + w) / X1 * H.U, v0 = Math.min(...vs), v1 = Math.max(...vs), dk = Math.min(1, 1100 / Math.max((u1 - u0) * HC * 2, (v1 - v0) * HC)), Ws = HC * 2 * dk, Hs = HC * dk, c = cv((u1 - u0) * Ws + 4, (v1 - v0) * Hs + 4), Ld = { c, g: c.getContext('2d'), W: Ws, H: Hs, ox: u0 * Ws - 2, oy: v0 * Hs - 2 };
      LV.reg(P, { Lc: Ld, sp, reg }, 'hull'); const t = tex(c, true); t.premultiplyAlpha = false; T.texs.push(t);
      const ua = u0 - 2 / Ws, ub = u1 + 2 / Ws, va = v0 - 2 / Hs, vb = v1 + 2 / Hs, g = decalGeo(hullGeos, ua, ub, va, vb, .008); K.geos.push(g);
      add(parts[names[ra.x < splits[0] ? 0 : ra.x < splits[1] ? 1 : 2]], g, std(T, { map: t, roughness: paint.rough ?? .3, metalness: 0, transparent: true, opacity: .999, depthWrite: false }, paint.ei ?? 1), { noShadow: true });
    }
  }
  const fracM = mat('frac', () => sootM(std(T, { map: hullC, normalMap: hullBase.Ln, normalScale: new THREE.Vector2(metalNS, metalNS), roughnessMap: hullBase.Lo, metalnessMap: hullBase.Lo, roughness: 1, metalness: 1, emissiveMap: hullBase.Le, emissive: 0xffffff, emissiveIntensity: 0, vertexColors: true, side: THREE.DoubleSide }, paint.ei ?? 1)));
  const frac = (x, dir) => K.g(`frac${x}${dir}`, () => {
    const n = 32, r2 = rng((x * 977 | 0) + (dir > 0 ? 1 : 7)), NJ = 2 * n, Lj = [], pet = [], ph = r2() * 6, Dp = Math.min(3.2, x * .5, (X1 - x) * .5), cu = [.37, .012];
    for (let j = 0; j < NJ;) { const w = 2 + (r2() * 4 | 0), h = (.15 + 1.6 * r2() ** 1.3) * (.4 + .3 * (1 + Math.sin(j / NJ * 12.57 + ph))), pk = .2 + .6 * r2(), pt = (r2() - .35) * .2; for (let i = 0; i < w && j < NJ; i++, j++) { const u = (i + .5) / w; Lj.push(.05 + h * Math.min(1, 1.3 * (u < pk ? u / pk : (1 - u) / (1 - pk))) + .08 * r2()); pet.push(pt); } }
    const th0 = 1.6 + (x * 3.7 % 2.2), Ao = Math.min(1.2, Dp * .4); for (let j = 0; j < NJ; j++) Lj[j] += Ao * (1 + dir * Math.cos(Math.PI * j / n - th0)) * (.75 + .5 * r2());
    Lj.push(Lj[0]); pet.push(pet[0]);
    const P = (j, xx, k) => { const R = F.ring(xx, n), kk = j <= n ? j : NJ - j, sd = j <= n ? 1 : -1, zc = R.s.zw; return [L / 2 - xx, zc + (R.ys[kk] - zc) * k - y0, sd * R.zs[kk] * k]; };
    const rows = [], uvs = [], cols = [], row = (f, uvF, c) => { const rw = [], uw = []; for (let j = 0; j <= NJ; j++) { const [xx, k] = f(j); rw.push(P(j, xx, k)); uw.push(uvF ? [xx / X1 * .995, (j <= n ? j / n : 2 - j / n) / 2] : cu); cols.push(...c(j)); } rows.push(rw); uvs.push(uw); };
    for (const t of [0, .3, .6, .85, 1]) row((j) => [x + dir * t * Lj[j], 1 + pet[j] * t * t], true, (j) => GR(.022 + .07 * t * Math.min(1, Lj[j] / 1.2)));
    row((j) => [x + dir * Lj[j], (1 + pet[j]) * .975], false, () => GR(.04));
    for (const t of [1, .5, 0]) row((j) => [x + dir * t * Lj[j], (1 + pet[j] * t * t) * .975], false, () => GR(.05 + .03 * t));
    for (let d = .254, i = 0; d <= Dp; d += .254, i++) row(() => [x - dir * d, .975], false, () => GR((i % 2 ? .06 : .14) * Math.exp(-d / 1.4) + .012));
    const g = sheet(rows, uvs, dir < 0, true); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
    const Rf = F.ring(x, n), yf = Rf.s.kl + (Rf.s.cr - Rf.s.kl) * .34, kf = (() => { for (let k = n; k > 0; k--) if (Rf.ys[k - 1] >= yf) return k; return n; })(), zf = Rf.zs[kf] * .965, fl = [], fu = [], fc = [];
    for (let i = 0; i <= 4; i++) { const xx = x + dir * .2 - dir * (Dp + .2) * i / 4, v = .2 * Math.exp(-(Dp * i / 4) / 1.2) + .02; for (const z of [-zf, zf]) { fl.push(L / 2 - xx, yf - y0, z); fu.push(...cu); fc.push(...GR(v)); } }
    const fi = []; for (let i = 0; i < 4; i++) { const a = i * 2; fi.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    const fg = geoOf(fl, fu, fi); fg.setAttribute('color', new THREE.Float32BufferAttribute(fc, 3));
    const Re = F.ring(x - dir * Dp, n), dl = [L / 2 - (x - dir * Dp), Re.s.zw - y0, 0], du = [...cu], dc = [.015, .015, .015], di = [];
    for (let j = 0; j <= NJ; j++) { dl.push(...P(j, x - dir * Dp, .975)); du.push(...cu); dc.push(.015, .015, .015); if (j) di.push(0, j, j + 1); }
    const dg = geoOf(dl, du, di); dg.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
    const n2 = 48, sv = Array.from({ length: n2 * 2 + 1 }, () => r2()), sr = [], su = [], sc = [], dS = Math.max(Math.min(1.6, Dp), Math.min(sp.dia * .62, x * .4, (X1 - x) * .4)), soot = (z) => { const a = sm(0, .5, z), b = sm(.4, .95, z); return [lerp(lerp(1, .36, a), .02, b), lerp(lerp(1, .3, a), .018, b), lerp(lerp(1, .24, a), .016, b)]; };
    const lb = sv.map((_, j) => { let a = 0; for (let q = -3; q <= 3; q++) a += sv[(j + q + 2 * n2) % (2 * n2)]; return clamp(.5 + .5 * (.5 + .5 * Math.sin(j * .38 + ph)) * (a / 7 + .3), .5, 1); });
    for (const t of [1, .84, .68, .54, .42, .31, .21, .12, .05, 0]) { const d = dS * t, rw = [], uw = [], R = F.ring(x - dir * d, n2), zc = R.s.zw; for (let j = 0; j <= 2 * n2; j++) { const kk = j <= n2 ? j : 2 * n2 - j, sd = j <= n2 ? 1 : -1, nz = Math.min(1, 1.08 * Math.max(0, 1 - t / lb[j % (2 * n2)]) ** .6); rw.push([L / 2 - (x - dir * d), zc + (R.ys[kk] - zc) * 1.006 - y0, sd * R.zs[kk] * 1.006]); uw.push([(x - dir * d) / X1 * .995, (j <= n2 ? j / n2 : 2 - j / n2) / 2]); sc.push(...soot(nz)); } sr.push(rw); su.push(uw); }
    const sg = sheet(sr, su, dir > 0, true); sg.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
    const bits = [], bit = (len, w, at, ax, c) => { const b = new THREE.BoxGeometry(len, w, w).translate(len / 2, 0, 0); b.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(1, 0, 0), ax.normalize())); b.translate(...at); const uv = b.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, ...cu); b.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: b.attributes.position.count }, () => GR(c)).flat(), 3)); bits.push([b]); };
    for (let k = 0; k < 18; k++) { const j = r2() * NJ | 0, e = Lj[j] * (.3 + .5 * r2()), p0 = P(j, x + dir * e, (1 + pet[j] * .3) * .99), c0 = P(j, x + dir * e, 0); bit(.35 + .8 * r2(), .045 + .03 * r2(), p0, new V3(-dir, 0, 0).addScaledVector(new V3(p0[0] - c0[0], p0[1] - c0[1], p0[2] - c0[2]).normalize(), .25 + .5 * r2()).add(new V3(0, r2() - .5, r2() - .5).multiplyScalar(.4)), .16 + .14 * r2()); }
    for (let k = 0; k < 7; k++) { const z = lerp(-zf, zf, (k + .3 + .4 * r2()) / 7); bit(.4 + 1.1 * r2(), .09, [L / 2 - (x + dir * .15), yf - y0 - .06, z], new V3(-dir, (r2() - .6) * .5, (r2() - .5) * .3), .2 + .1 * r2()); }
    const m = merge([[g], [fg], [dg], [sg], ...bits]); g.dispose(); fg.dispose(); dg.dispose(); sg.dispose(); for (const [b] of bits) b.dispose(); return m;
  });
  const fracs = []; splits.forEach((x, i) => { for (const [k, dir] of [[i, 1], [i + 1, -1]]) { const m = add(parts[names[k]], frac(x, dir), fracM, { noShadow: true }); m.visible = false; fracs.push([m, () => parts[names[i]].parent !== group || parts[names[i + 1]].parent !== group]); } });

  const wingCanvasW = Math.round(2048 * TS), wingCanvasH = Math.round(2048 * TS);
  const wd = K.v('wdef', () => surfDef(wingRaw(sp.wing), B));
  const wx0 = Math.min(...wd.raw.map((q) => q.x)) - .5 - (sp.wing.slat ? 0 : 0), wx1 = Math.max(...wd.raw.map((q) => q.x + q.c)) + .3;
  const nWB = LV.wingReg ? 4 : 2, WR0 = regionMap(Array.from({ length: nWB }, (_, b) => ({ s0: wd.s0, s1: wd.s1, x0: wx0, x1: wx1, u0: .01, u1: .99, v0: b / nWB + .004, v1: (b + 1) / nWB - .004 })), wingCanvasW, wingCanvasH), WR = nWB === 4 ? WR0 : [WR0[0], WR0[1], WR0[0], WR0[1]];
  const wingBase = K.v('wingBase', () => {
    const Lc = layer(wingCanvasW, wingCanvasH, paint.wing || '#c9ccce'), Ln = layer(wingCanvasW / 2, wingCanvasH / 2, N0), Lo = layer(wingCanvasW / 2, wingCanvasH / 2, ORM(paint.wingR ?? .4, paint.wingM ?? 0)), rr2 = rng(kseed + 2);
    WR0.forEach((R, b) => { const o = { ...(paint.wingSurf || {}), base: b % 2 ? (paint.wingLow || paint.wing) : paint.wing, rough: b % 2 ? (paint.wingLowR ?? paint.wingR) : paint.wingR, metal: paint.wingM }; const h = surfPaint(R, wd, Lc, Ln, Lo, sp, o, rr2); if (paint.fabric) for (const [a, bb, c] of sp.wing.ail || []) fabric(R, wd, Lc, Ln, Lo, a, bb, (s) => (c < 0 ? 1 + c / wd.fc(s) : 1 - c), { ...paint.fabric, col: b % 2 ? paint.fabric.colLowW || paint.fabric.colLow || paint.fabric.col : paint.fabric.col }); (LV.wing || (() => {}))({ R, b, h, Lc, Ln, Lo, def: wd, sp, r: rr2 }); });
    return { Lc, Ln: K.t(tex(Ln.c, false)), Lo: K.t(tex(Lo.c, false)) };
  });
  const wingC = regTex('wing', wingBase.Lc.c, { WR, def: wd });
  const wingM = mat('wing', () => std(T, { map: wingC, normalMap: wingBase.Ln, normalScale: new THREE.Vector2(metalNS, metalNS), roughnessMap: wingBase.Lo, metalnessMap: wingBase.Lo, roughness: 1, metalness: 1 }, paint.ei ?? 1));
  const W = sp.wing, cutsW = [];
  const cf = (v) => (typeof v === 'function' ? v : v < 0 ? (s) => 1 + v / wd.fc(s) : () => 1 - v);
  for (const [a, b] of W.slat || []) cutsW.push({ s0: a, s1: b, lead: true, c1: W.slatC || .12, kind: 'slat' });
  for (const [a, b, c, k] of W.flap || []) if (k === 'split') cutsW.push({ s0: a, s1: b, f: () => 1 - c, f2: () => .985, plate: -1, kind: 'flap' }); else cutsW.push({ s0: a, s1: b, f: cf(c), kind: 'flap', fowler: k === 'plain' ? 0 : W.fowler ?? .15 });
  for (const [a, b, c] of W.ail || []) cutsW.push({ s0: a, s1: b, f: cf(c), kind: 'ail' });
  for (const [a, b, c = .13] of W.kr || []) cutsW.push({ s0: a, s1: b, f: () => .012, f2: () => c, plate: -1, kind: 'kr' });
  for (const [a, b, c, n = 1, cfl = .3] of W.spl || []) for (let k = 0; k < n; k++) { const s0 = lerp(a, b, k / n) + .02, s1 = lerp(a, b, (k + 1) / n) - .02; cutsW.push({ s0, s1, f: () => 1 - cfl - c, f2: () => 1 - cfl + .02, plate: 1, kind: 'spl' }); }
  for (const side of [1, -1]) {
    const R0 = WR[side > 0 ? 0 : 2], R1 = WR[side > 0 ? 1 : 3];
    const ws = liftSurface(K, `wing${side}`, wd, cutsW, { mz: side, uvT: R0.uv, uvB: R1.uv, xOf: xOfP, capA: false, step: Math.max(.6, sp.span / 40), M: 16 });
    add(parts.wings, ws.geo, wingM);
    for (const mv of ws.movers) { const pv = new THREE.Group(); pv.position.copy(mv.H0); parts.wings.add(pv); add(pv, mv.g, wingM); ctl.push({ ...mv, pv, side }); }
    for (const y of W.ftf || []) {
      const q = wd.at(y), fL = W.ftfL || .45, f0 = 1 - fL, len = q.c * fL + (W.ftfP ?? 1.3), dep = W.ftfD || q.c * .07, hw = (W.ftfW || dep * .8) / 2;
      const fl = ctl.find((c) => c.side === side && c.c.kind === 'flap' && !c.c.plate && y >= c.c.s0 && y <= c.c.s1), hf = fl ? 1 - fl.c.f(y) : .2;
      const tCut = clamp((q.c * (1 - hf + .02) - q.c * f0) / len, .15, .85), tTE = q.c * fL / len, tH = clamp(tCut + .05, .3, tTE - .03), R1 = WR[1];
      const piece = (ta, tb, key) => K.g(`ftf${y}${key}`, () => {
        const rows = [], uvs = [], NS = 16, NR = Math.max(4, Math.round(18 * (tb - ta))), dT = -dep * .24, dB = -dep * .7, tn = .8 * dep / len, E = (x) => Math.sqrt(Math.max(0, 1 - (1 - Math.min(1, x)) ** 2));
        const prof = (t) => { const u = clamp((t - tTE) / (1 - tTE), 0, 1), yB = t < tH ? -dep * (.72 * E(t / tn) + .28 * Math.min(1, t / tH) ** .8) : lerp(-dep, dB, ((t - tH) / (1 - tH)) ** 1.5), yT = t < tTE ? .05 : lerp(0, dT, u ** 1.25), w = hw * (.3 + .7 * E(t / (tn * 1.3))) * lerp(1, .85, u); return { yB: Math.min(yB, yT - .01), yT, w }; };
        const ring = (t, sc = 1, dx = 0) => { const f = f0 + t * len / q.c, fw = Math.min(f, 1), wl = foil(fw, q.t, q.cam)[1] * q.c, { yB, yT, w } = prof(t), o = q.p.clone().addScaledVector(q.dir, f * q.c + dx).addScaledVector(q.n, wl), yW = yB + (yT - yB) * .58, yc = (yT + yB) / 2, row = [], ur = [], sx = L / 2 - Math.max(o.x, q.p.x + q.dir.x * q.c * .98);
          for (let k = 0; k <= NS; k++) { const a = k / NS * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a), up = sn >= 0, n = up ? 6 : 2.4, z = w * Math.sign(c) * Math.abs(c) ** (2 / n), yy = up ? yW + (yT - yW) * sn ** (2 / n) : yW - (yW - yB) * (-sn) ** (2 / n); row.push([o.x, o.y + yc + (yy - yc) * sc, o.z + z * sc]); ur.push(R1.uv(y + z * .3, sx)); }
          rows.push(row); uvs.push(ur); };
        for (let i = 0; i <= NR; i++) ring(lerp(ta, tb, i / NR));
        if (tb >= 1) { const e = prof(1), rc = Math.min(e.w, (e.yT - e.yB) / 2) * 1.1; for (const ph of [.35, .7, 1.05, 1.4]) ring(1, Math.cos(ph), Math.sin(ph) * rc); }
        for (const [i, e] of [[0, 0], [rows.length - 1, 1]]) { const c = rows[i].reduce((a, p) => [a[0] + p[0] / (NS + 1), a[1] + p[1] / (NS + 1), a[2] + p[2] / (NS + 1)], [0, 0, 0]); if (e) { rows.push(rows[i].map(() => c)); uvs.push(uvs[i]); } else { rows.unshift(rows[0].map(() => c)); uvs.unshift(uvs[0]); } }
        return sheet(rows, uvs, true, true);
      });
      add(parts.wings, piece(0, tCut, 'a'), wingM).scale.z = side;
      if (fl) { const rm = add(fl.pv, piece(tCut, 1, 'b'), wingM, { p: fl.H0.clone().negate() }); rm.scale.z = side; }
      else add(parts.wings, piece(tCut, 1, 'b'), wingM).scale.z = side;
    }
  }
  if (sp.fillet) {
    const rf = tab(sp.fillet), xa = sp.fillet[0][0], xb = sp.fillet[sp.fillet.length - 1][0], fm = mat('filM', () => std(T, { color: paint.filC || paint.fair || paint.base, roughness: paint.rough ?? .3, metalness: metalType ? 1 : 0, normalMap: tileN(K), normalScale: new THREE.Vector2(metalType ? .5 : .25, metalType ? .5 : .25), roughnessMap: tileO(K) }, paint.ei ?? 1));
    for (const side of [1, -1]) {
      const g = K.g(`fil${side}`, () => {
        const rows = [], uvs = [], N = 24, M = 10;
        for (let i = 0; i <= N; i++) {
          const x = lerp(xa, xb, i / N), r = Math.max(.002, rf(x)); let zf = sp.dia * .4, yw = 0;
          for (let k = 0; k < 4; k++) { const q = wd.at(clamp(zf, wd.s0, wd.s1)), f = clamp((x - q.x) / q.c, 0, 1); yw = q.p.y + q.dir.y * f * q.c + q.n.y * foil(f, q.t, q.cam)[0] * q.c; zf = H.zAt(x, H.sY(x, yw + y0)); }
          const row = [[L / 2 - x, yw - .03, (zf + r * 1.05) * side]], ur = [[x / 2, 0]];
          for (let j = 0; j <= M; j++) { const th = j / M * Math.PI / 2; row.push([L / 2 - x, yw + r - r * Math.cos(th), (zf + r - r * Math.sin(th)) * side]); ur.push([x / 2, (j + 1) / (M + 2)]); }
          row.push([L / 2 - x, yw + r * 1.05, (zf - .03) * side]); ur.push([x / 2, 1]); rows.push(row); uvs.push(ur);
        }
        return sheet(rows, uvs, side > 0);
      });
      add(parts.mid, g, fm);
    }
  }
  if (sp.fair) {
    const fx0 = sp.fair[0][0], fx1 = sp.fair[sp.fair.length - 1][0], fl = fx1 - fx0, fu = (x) => (x - fx0) / fl, met = !!paint.fairMetal, us = [];
    for (const x of [1.4, 3.3, 4.6, 6.9, 8.2, 10.6, 12.1, 14.4, 16.2, 18.5, 20.1].map((v) => fx0 + v)) if (x < fx1 - .5) us.push(fu(x));
    const fT = panelTex(K, 'fairT', { base: paint.fair || paint.base, rough: paint.fairR ?? paint.rough ?? .35, metal: met ? .85 : 0, lu: fl, lv: 9, us, vs: [.2, .37, .5, .63, .8], tilt: met ? .07 : .035, tone: met ? .07 : .03, rvar: met ? .1 : .05, seam: met ? 'rgba(46,50,56,.3)' : 'rgba(80,84,90,.26)', paint({ Lc, Ln, Lo, W, H: Hh, r }) {
      const g2 = Lc.g, uv = (x, z, sd) => { const q = lowAt(FF, x, z); return [fu(x) * W, (sd > 0 ? q.s / 2 : 1 - q.s / 2) * Hh]; };
      const gq = g2.createLinearGradient(0, 0, 0, Hh); for (const [o, a] of [[0, 0], [.28, .05], [.42, .14], [.5, .2], [.58, .14], [.72, .05], [1, 0]]) gq.addColorStop(o, `rgba(66,60,50,${a})`); g2.fillStyle = gq; g2.fillRect(0, 0, W, Hh);
      for (let k = 0; k < 70; k++) { const y = Hh * (.22 + .56 * r()), x0 = W * (.2 + .7 * r()), ln = W * (.08 + .3 * r()), h = 2 + 7 * r(), a = (.05 + .1 * r()).toFixed(3), sq = g2.createLinearGradient(x0, 0, x0 + ln, 0); sq.addColorStop(0, `rgba(70,62,50,${a})`); sq.addColorStop(1, 'rgba(70,62,50,0)'); g2.fillStyle = sq; for (const [k, al] of [[2.6, .35], [1, .6]]) { g2.globalAlpha = al; g2.fillRect(x0, y - h * k / 2, ln, h * k); } g2.globalAlpha = 1; }
      const ax = g2.createLinearGradient(0, 0, W, 0); for (const [o, a] of [[0, 0], [.55, 0], [.85, .1], [1, .16]]) ax.addColorStop(o, `rgba(58,52,44,${a})`); g2.fillStyle = ax; g2.fillRect(0, Hh * .25, W, Hh * .5);
      for (const u of sp.gear || []) for (const d of u.doors || []) {
        const z0 = Math.abs(d.w || 0), z1 = Math.abs((d.w || 0) + d.wd * d.to), za = Math.min(z0, z1), zb = Math.max(z0, z1); if (!belly(d.x, (za + zb) / 2)?.fair) continue;
        for (const sd of [1, -1]) {
          const pts = []; for (let k = 0; k <= 8; k++) pts.push([d.x - d.l / 2 + d.l * k / 8, za]); for (let k = 0; k <= 4; k++) pts.push([d.x + d.l / 2, lerp(za, zb, k / 4)]); for (let k = 8; k >= 0; k--) pts.push([d.x - d.l / 2 + d.l * k / 8, zb]); for (let k = 4; k >= 0; k--) pts.push([d.x - d.l / 2, lerp(za, zb, k / 4)]);
          const pa = new Path2D(); pts.forEach((p, k) => pa[k ? 'lineTo' : 'moveTo'](...uv(p[0], p[1], sd))); pa.closePath();
          g2.fillStyle = 'rgba(40,38,34,.06)'; g2.fill(pa); g2.strokeStyle = 'rgba(28,30,34,.85)'; g2.lineWidth = 2.2; g2.stroke(pa); const pN = new Path2D(); pN.addPath(pa, new DOMMatrix([Ln.W / W, 0, 0, Ln.H / Hh, 0, 0])); groove(Ln, pN, .5, 1);
          const hz = d.to > 0 ? za : zb, h0 = uv(d.x - d.l / 2, hz, sd), h1 = uv(d.x + d.l / 2, hz, sd); line(Lc, h0[0], h0[1] + (sd > 0 ? -5 : 5) * Math.sign(d.to), h1[0], h1[1] + (sd > 0 ? -5 : 5) * Math.sign(d.to), 1.5, 'rgba(40,42,46,.5)');
        }
      }
    } });
    const g = K.g('fair', () => loftGeo(FF, { n: 22, step: .5, conv: (x, y, z) => [L / 2 - x, y - y0, z], uv: (x, s) => [fu(x), s / 2], capEnd: true, capStart: true }));
    add(parts.mid, g, panelMat(T, mat, std, 'fairM', fT, met ? .7 : .45, paint.ei ?? 1));
  }

  const fins = (sp.fins || [sp.fin]).map((f) => surfDef(finRaw(f), B));
  const stb = K.v('sdef', () => surfDef(wingRaw(sp.stab), B));
  const tx0 = Math.min(...fins.map((d) => Math.min(...d.raw.map((q) => q.x))), ...stb.raw.map((q) => q.x)) - .3, tx1 = Math.max(...fins.map((d) => Math.max(...d.raw.map((q) => q.x + q.c))), ...stb.raw.map((q) => q.x + q.c)) + .3;
  const nF = fins.length, TW = Math.round(2048 * TS), TH = Math.round(2048 * TS);
  const TRf = fins.map((d, i) => regionMap([0, 1].map((b) => ({ s0: d.s0, s1: d.s1, x0: tx0, x1: tx1, u0: .01, u1: .99, v0: (i * 2 + b) / (nF * 2) * .6 + .003, v1: (i * 2 + b + 1) / (nF * 2) * .6 - .003 })), TW, TH));
  const TRs = regionMap([0, 1, 2, 3].map((b) => ({ s0: stb.s0, s1: stb.s1, x0: tx0, x1: tx1, u0: .01, u1: .99, v0: .6 + b / 10 + .003, v1: .6 + (b + 1) / 10 - .003 })), TW, TH);
  const tailBase = K.v('tailBase', () => {
    const Lc = layer(TW, TH, paint.fin || paint.base || '#eee'), Ln = layer(TW / 2, TH / 2, N0), Lo = layer(TW / 2, TH / 2, ORM(paint.finR ?? paint.rough ?? .35, paint.finM ?? (metalType ? 1 : 0))), rr2 = rng(kseed + 3);
    fins.forEach((d, i) => TRf[i].forEach((R, b) => { const h = surfPaint(R, d, Lc, Ln, Lo, sp, { ...(paint.finSurf || paint.wingSurf || {}), base: paint.fin || paint.base, rough: paint.finR ?? paint.rough, metal: paint.finM ?? (metalType ? 1 : 0), chord: [.3, .6], rib: .9, le: paint.finLE }, rr2); const fd = (sp.fins || [sp.fin])[i]; if (paint.fabric && fd.rud) { const hx = tab(fd.rud); fabric(R, d, Lc, Ln, Lo, fd.rudS?.[0] ?? d.s0, fd.rudS?.[1] ?? d.s1, (s) => clamp((hx(s) - d.fx(s)) / d.fc(s), .2, .95), { ...paint.fabric, col: paint.fabric.colFin || paint.fabric.col }); } (LV.fin || (() => {}))({ R, b, i, h, Lc, Ln, Lo, def: d, sp, r: rr2 }); }));
    TRs.forEach((R, b) => { const h = surfPaint(R, stb, Lc, Ln, Lo, sp, { ...(paint.wingSurf || {}), base: b % 2 ? paint.stabLow || paint.stab || paint.base : paint.stab || paint.base, rough: paint.finR ?? paint.rough, metal: paint.finM ?? (metalType ? 1 : 0), chord: [.3, .6], rib: .9, le: paint.stabLE }, rr2); if (paint.fabric) { const hx = tab(sp.stab.hinge); fabric(R, stb, Lc, Ln, Lo, sp.stab.elev[0], sp.stab.elev[1], (s) => clamp((hx(s) - stb.fx(s)) / stb.fc(s), .3, .9), { ...paint.fabric, col: b % 2 ? paint.fabric.colLow || paint.fabric.col : paint.fabric.col }); } (LV.stab || (() => {}))({ R, b, h, Lc, Ln, Lo, def: stb, sp, r: rr2 }); });
    return { Lc, Ln: K.t(tex(Ln.c, false)), Lo: K.t(tex(Lo.c, false)) };
  });
  const tailC = regTex('fin', tailBase.Lc.c, { TRf, fins });
  const tailM = mat('tail', () => std(T, { map: tailC, normalMap: tailBase.Ln, normalScale: new THREE.Vector2(metalNS, metalNS), roughnessMap: tailBase.Lo, metalnessMap: tailBase.Lo, roughness: 1, metalness: 1 }, paint.ei ?? 1));
  const tfracM = mat('tfrac', () => std(T, { map: tailC, normalMap: tailBase.Ln, normalScale: new THREE.Vector2(metalNS, metalNS), roughnessMap: tailBase.Lo, metalnessMap: tailBase.Lo, roughness: 1, metalness: 1, vertexColors: true, side: THREE.DoubleSide }, paint.ei ?? 1));
  const finFrac = (d, R, s, dir) => K.g(`ffrac${s}${dir}`, () => {
    const NF = 20, r2 = rng((s * 997 | 0) + (dir > 0 ? 3 : 11)), fs = Array.from({ length: NF + 1 }, (_, j) => .5 - .5 * Math.cos(Math.PI * j / NF)), Lj = [], s4 = d.s0 + .4, cu = R[0].uv(s4, d.fx(s4) + d.fc(s4) * .5), out = [];
    for (let j = 0; j <= NF;) { const w = 2 + (r2() * 3 | 0), h = .12 + 1.2 * r2() ** 1.2, pk = .2 + .6 * r2(); for (let i = 0; i < w && j <= NF; i++, j++) { const u = (i + .5) / w; Lj.push(.04 + h * Math.min(1, 1.3 * (u < pk ? u / pk : (1 - u) / (1 - pk))) + .06 * r2()); } }
    const pt = (ss, f, k, side) => { const q = d.at(clamp(ss, d.s0, d.s1)), [a, b] = foil(f, q.t, q.cam), mm = (a + b) / 2; return q.p.clone().addScaledVector(q.dir, f * q.c).addScaledVector(q.n, (mm + ((side > 0 ? a : b) - mm) * k) * q.c); };
    for (const side of [1, -1]) {
      const rows = [], uvs = [], cols = [], row = (sf, k, uvOn, c) => { const rw = [], uw = []; for (let j = 0; j <= NF; j++) { const ss = s + dir * sf(j), p = pt(ss, fs[j], k, side); rw.push(p.toArray()); uw.push(uvOn ? R[side > 0 ? 0 : 1].uv(ss, L / 2 - p.x) : cu); cols.push(...GR(c(j))); } rows.push(rw); uvs.push(uw); };
      for (const t of [0, .35, .7, 1]) row((j) => t * Lj[j], 1, true, () => 1 - .45 * t ** 1.6);
      row((j) => Lj[j], .75, false, () => .07); row(() => .01, .75, false, () => .03);
      const g = sheet(rows, uvs, side * dir < 0); g.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3)); out.push([g]);
    }
    const cp = [], cuv = [], cc = []; for (const side of [1, -1]) for (let j = 0; j <= NF; j++) { cp.push(...pt(s + dir * .01, fs[j], .75, side).toArray()); cuv.push(...cu); cc.push(.025, .025, .025); }
    const ci = []; for (let j = 0; j < NF; j++) { const a = j, b = NF + 1 + j; ci.push(a, b, a + 1, a + 1, b, b + 1); }
    const cg = geoOf(cp, cuv, ci); cg.setAttribute('color', new THREE.Float32BufferAttribute(cc, 3)); out.push([cg]);
    const m = merge(out); for (const [g] of out) g.dispose(); return m;
  });
  const finDefs = sp.fins || [sp.fin];
  fins.forEach((d, i) => {
    const fdat = finDefs[i], R = TRf[i], rudCut = [];
    if (fdat.rud) { const hx = tab(fdat.rud); rudCut.push({ s0: fdat.rudS?.[0] ?? d.s0, s1: fdat.rudS?.[1] ?? d.s1, f: (s) => clamp((hx(s) - d.fx(s)) / d.fc(s), .2, .95), kind: 'rud' }); }
    const split = !sp.fins && sp.finSplit != null ? sp.finSplit : null;
    const ranges = split != null ? [[d.s0, split, parts.fin], [split, d.s1, null]] : [[d.s0, d.s1, parts.fin]];
    if (split != null) { parts.finUpper = new THREE.Group(); parts.finUpper.name = 'finUpper'; parts.fin.add(parts.finUpper); ranges[1][2] = parts.finUpper; }
    ranges.forEach(([sa, sb, grp], k) => {
      const fs = liftSurface(K, `fin${i}_${k}`, d, rudCut, { uvT: R[0].uv, uvB: R[1].uv, xOf: xOfP, up: true, sa, sb, capA: k > 0 || !!fdat.capA, capB: true, step: .8, M: 14 });
      add(grp, fs.geo, tailM);
      for (const mv of fs.movers) { const pv = new THREE.Group(); pv.position.copy(mv.H0); grp.add(pv); add(pv, mv.g, tailM); ctl.push({ ...mv, pv, side: 0 }); }
    });
    if (split != null) for (const [dir, grp] of [[1, parts.fin], [-1, parts.finUpper]]) { const m = add(grp, finFrac(d, R, split, dir), tfracM, { noShadow: true }); m.visible = false; fracs.push([m, () => parts.finUpper.parent !== parts.fin]); }
  });
  parts.elev = [];
  const sd = sp.stab, cutsS = [{ s0: sd.elev[0], s1: sd.elev[1], f: (() => { const hx = tab(sd.hinge); return (s) => clamp((hx(s) - stb.fx(s)) / stb.fc(s), .3, .9); })(), kind: 'elev' }];
  for (const side of [1, -1]) {
    const ss = liftSurface(K, `stab${side}`, stb, cutsS, { mz: side, uvT: TRs[side > 0 ? 0 : 2].uv, uvB: TRs[side > 0 ? 1 : 3].uv, xOf: xOfP, capA: false, step: 1, M: 12 });
    add(parts.fin, ss.geo, tailM);
    for (const mv of ss.movers) { const pv = new THREE.Group(); pv.position.copy(mv.H0); parts.fin.add(pv); add(pv, mv.g, tailM); ctl.push({ ...mv, pv, side }); parts.elev[side > 0 ? 1 : 0] = pv; }
  }
  if (!parts.elev[0]) parts.elev[0] = new THREE.Group(); if (!parts.elev[1]) parts.elev[1] = new THREE.Group();

  parts.engines = []; parts.props = [];
  const eng = ENGINES[sp.engine];
  for (const e of sp.engines) {
    const grp = new THREE.Group(), side = Math.sign(e.w) || 0;
    grp.position.copy(B(e.x, e.h, e.w)); if (e.tilt) grp.rotation.z = -e.tilt * D;
    (e.mount === 'fin' ? parts.fin : parts.wings).add(grp); parts.engines.push(grp);
    eng.build({ K, T, sp, e, grp, add, mat, std, side, props, B, wd, paint, tailM, wingM, hullM });
  }
  for (const p of props) parts.props.push(p);
  if (sp.nac) {
    const NF = K.v('nacF', () => loftFn(sp.nac, { nU: 2.2, nL: 2.2 }));
    const NP = sp.nacP, nx0 = sp.nac[0][0], nx1 = sp.nac[sp.nac.length - 1][0], nu = (x) => (x - nx0) / (nx1 - nx0);
    const nm = NP ? panelMat(T, mat, std, 'nacBody', panelTex(K, 'nacPT', { ...NP, lu: nx1 - nx0, lv: 4, us: (NP.us || []).map(nu), paint({ Lc, Ln, Lo, W, H, r }) {
      const g2 = Lc.g;
      if (NP.low) { g2.fillStyle = NP.low[1]; g2.fillRect(0, (.5 - NP.low[0]) * H, W, NP.low[0] * 2 * H); Lo.g.fillStyle = ORM(NP.low[2] ?? NP.rough, 0); Lo.g.fillRect(0, (.5 - NP.low[0]) * H / 2, W / 2, NP.low[0] * H); }
      if (NP.gills) { const [a, b, n] = NP.gills, ua = nu(a) * W, ub = nu(b) * W; g2.fillStyle = 'rgba(20,20,16,.35)'; g2.fillRect(ub - 3, 0, 6, H); for (let k = 0; k < n * 2; k++) { const v = k / (n * 2) * H; line(Lc, ua, v, ub, v, 2.5, 'rgba(20,20,16,.55)'); line(Ln, ua / 2, v / 2 - 1, ub / 2, v / 2 - 1, 1, NRM(0, .5)); line(Ln, ua / 2, v / 2 + 1, ub / 2, v / 2 + 1, 1, NRM(0, -.5)); } }
      if (NP.fade) for (let k = 0; k < 40; k++) { const x = r() * W, y = r() * H, rd = (.05 + .12 * r()) * W, q = g2.createRadialGradient(x, y, 0, x, y, rd), c = r() < .55 ? NP.fade[0] : NP.fade[1]; q.addColorStop(0, c.replace(')', `,${.1 + .15 * r()})`).replace('rgb', 'rgba')); q.addColorStop(1, c.replace(')', ',0)').replace('rgb', 'rgba')); g2.fillStyle = q; g2.fillRect(x - rd, y - rd, rd * 2, rd * 2); }
      if (NP.belly) { const xa = nu(NP.belly[0]) * W, q = g2.createLinearGradient(xa, 0, W, 0); q.addColorStop(0, `rgba(42,38,34,${NP.belly[1]})`); q.addColorStop(.6, `rgba(42,38,34,${NP.belly[1] * .5})`); q.addColorStop(1, 'rgba(42,38,34,.05)'); g2.fillStyle = q; g2.fillRect(xa, .41 * H, W - xa, .18 * H); }
      if (NP.soot) for (const [v0, dir] of [[NP.soot, 1], [1 - NP.soot, -1]]) for (let k = 0; k < 8; k++) { const va = v0 + (r() - .5) * .04, vb = va + dir * (.08 + .1 * r()), xa = nu(NP.sootX ?? 1.5) * W + r() * 30, q = g2.createLinearGradient(0, va * H, 0, vb * H); q.addColorStop(0, `rgba(30,28,24,${.2 + .2 * r()})`); q.addColorStop(1, 'rgba(30,28,24,0)'); g2.fillStyle = q; g2.fillRect(xa, Math.min(va, vb) * H, W - xa, Math.abs(vb - va) * H); }
    } }), NP.ns ?? .45, paint.ei ?? 1) : mat('nacBody', () => std(T, { color: paint.nacBody || paint.base, roughness: paint.rough ?? .3, metalness: metalType ? 1 : 0, normalMap: tileN(K), normalScale: new THREE.Vector2(metalType ? .6 : .3, metalType ? .6 : .3), roughnessMap: tileO(K) }, paint.ei ?? 1));
    for (const e of sp.engines) { if (e.nac === false) continue; const g = K.g(`nacB${e.x}${e.h}${e.w}`, () => loftGeo(NF, { n: 24, step: .15, conv: (x, y, z) => [L / 2 - x - e.x, y + e.h - y0, z + e.w], uv: NP ? (x, s) => [nu(x), s / 2] : (x, s, len) => [x / 1.5, s * len / 1.5], capEnd: true, capStart: false })); add(parts.wings, g, nm); }
  }

  parts.gear = new THREE.Group(); parts.gear.name = 'gear'; group.add(parts.gear); parts.gear.visible = !!sp.gearExposed;
  const tyreM = mat('tyre', () => { const t = tyreTex(); return std(T, { map: t, normalMap: t.userData.n, normalScale: new THREE.Vector2(.9, .9), roughnessMap: t.userData.o, metalnessMap: t.userData.o, roughness: 1, metalness: 1 }, .35); });
  const hubM = mat('hubM', () => { const t = hubTex(); return std(T, { color: paint.hub || 0xb9bdc0, map: t, roughnessMap: t.userData.o, metalnessMap: t.userData.o, roughness: 1, metalness: 1 }); });
  const strutM = mat('strut', () => std(T, { color: paint.strut || 0xcfd2d4, roughness: .3, metalness: .6 }));
  const chromeM = mat('chrome', () => std(T, { color: 0xe8eaec, roughness: .08, metalness: 1 }));
  const darkM = mat('dark', () => std(T, { color: 0x111315, roughness: .7, metalness: .3 }, .2));
  const doorM = paint.doorT ? panelMat(T, mat, std, 'door', panelTex(K, 'doorT', paint.doorT), .6, paint.ei ?? 1) : mat('door', () => std(T, { color: paint.door || paint.base || 0xeeeeee, roughness: paint.doorR ?? paint.rough ?? .35, metalness: metalType ? 1 : 0, normalMap: tileN(K), normalScale: new THREE.Vector2(.25, .25) }, paint.ei ?? 1));
  const primerM = mat('primer', () => std(T, { color: 0x949c88, roughness: .62, metalness: 0 }, .5)), wellM = mat('well', () => { const m = std(T, { color: paint.well || 0x9ea395, roughness: .82, metalness: .05 }, 1.25); m.onBeforeCompile = WELL; m.customProgramCacheKey = () => 'acwell'; return m; });
  const doorGeo = (d) => K.v(`dg${d.x}${d.w}${d.l}`, () => {
    const z0 = d.w || 0, b0 = belly(d.x, z0), conf = b0 && !b0.out && Math.abs(b0.y - d.h) < .5, S0 = conf && (b0.fair ? FF : F), zm = conf ? lowAt(S0, d.x, 1e3)?.z ?? 1e3 : 1e3, z1 = clamp(z0 + d.wd * d.to, -zm * .97, zm * .97), hy = conf ? b0.y : d.h, X0 = L / 2 - d.x, Y0 = hy - y0, NX = 8, NZ = 4;
    const yAt = (x, z) => (conf ? lowAt(S0, x, z)?.y ?? d.h : d.h);
    const grid = (fz, dy, fx) => { const rows = [], uvs = []; for (let i = 0; i <= NX; i++) { const x = d.x + d.l / 2 * fx * (i / NX * 2 - 1), row = [], ur = []; for (let j = 0; j <= NZ; j++) { const z = lerp(z0, lerp(z0, z1, fz), j / NZ) + (fz < 1 ? (z1 - z0) * .015 : 0); row.push([L / 2 - x - X0, yAt(x, z) + dy - y0 - Y0, z - z0]); ur.push([i / NX, j / NZ]); } rows.push(row); uvs.push(ur); } return [rows, uvs]; };
    const mk = (ru, up) => { let g = sheet(ru[0], ru[1], false); let ny = 0; const n = g.attributes.normal; for (let i = 0; i < n.count; i++) ny += n.getY(i); if ((ny > 0) !== up) { g.dispose(); g = sheet(ru[0], ru[1], true); } K.geos.push(g); return g; };
    const well = mk(grid(.96, -.012, .97), false), wp = well.attributes.position, nv = wp.count, bb = new THREE.Box3().setFromBufferAttribute(wp), dep = clamp(d.l * .38, .5, 1.4);
    well.setAttribute('wbox', new THREE.Float32BufferAttribute(Array.from({ length: nv }, () => [bb.min.x, bb.max.x, bb.min.z, bb.max.z]).flat(), 4)); well.setAttribute('wtop', new THREE.Float32BufferAttribute(new Array(nv).fill(bb.max.y + dep), 1));
    return { hy, out: mk(grid(1, 0, 1), false), inn: mk(grid(1, .05, 1), true), well };
  });
  for (const u of sp.gear || []) for (const side of u.w ? [1, -1] : [0]) {
    const piv = new THREE.Group(), sgn = side || 1; piv.position.copy(B(u.p[0], u.p[1], (u.p[2] || 0) * sgn)); (u.fixed ? parts[u.fixed] : parts.gear).add(piv);
    const leg = new THREE.Group(); piv.add(leg);
    const low = new THREE.Group(); leg.add(low);
    const wh = u.wh, D0 = wh.D, len = u.len;
    const ro = u.oleo || D0 * .12;
    for (const tz of u.twin ? [-u.twin, u.twin] : [0]) {
      add(leg, K.g(`oleo${u.id}`, () => cyl(ro, ro * .9, len * .55, 14).translate(0, -len * .55, 0)), strutM, { p: new V3(0, 0, tz) });
      add(low, K.g(`pist${u.id}`, () => cyl(ro * .72, ro * .72, len * .5, 12)), chromeM, { p: new V3(0, 0, tz) });
    }
    if (u.brace) add(leg, K.g(`brace${u.id}`, () => cyl(ro * .35, ro * .35, len * .55, 8).rotateZ(u.brace[0] * D).rotateX(u.brace[1] * D).translate(0, -len * .45, 0)), strutM);
    const tg = K.g(`tyre${u.id}`, () => tyreGeo(D0, wh.W)), hg = K.g(`hub${u.id}`, () => hubGeo(D0, wh.W));
    const bog = new THREE.Group(); low.add(bog);
    const ax = wh.ax || 1, nW = wh.n || 1;
    for (let a = 0; a < ax; a++) for (let k = 0; k < nW; k++) {
      const px = ax > 1 ? (a - (ax - 1) / 2) * wh.pitch : 0, pz = nW > 1 ? (k - (nW - 1) / 2) * wh.gap : (u.off || 0) * sgn;
      add(bog, tg, tyreM, { p: new V3(px, 0, pz) }); const hm = add(bog, hg, hubM, { p: new V3(px, 0, pz) }); if (pz * sgn < 0 || (nW === 1 && sgn < 0)) hm.scale.z = -1;
    }
    if (ax > 1) add(bog, K.g(`beam${u.id}`, () => new THREE.BoxGeometry(wh.pitch * (ax - 1) + .2, ro * 1.1, ro * 1.1)), strutM);
    if (nW > 1 || u.axle) add(bog, K.g(`axle${u.id}`, () => cyl(ro * .4, ro * .4, Math.max(wh.gap || 0, .2) + wh.W, 12).translate(0, -(Math.max(wh.gap || 0, .2) + wh.W) / 2, 0).rotateX(Math.PI / 2)), strutM);
    if (u.torque) add(leg, K.g(`tq${u.id}`, () => merge([[new THREE.BoxGeometry(.08, len * .22, .06).rotateZ(.5), M4([ro * 1.3, -len * .52, 0])], [new THREE.BoxGeometry(.08, len * .22, .06).rotateZ(-.5), M4([ro * 1.3, -len * .7, 0])]])), strutM);
    if (u.legDoor) { const [lx, ly, lz, lw, lh] = u.legDoor; const dg = add(leg, K.g(`ldoor${u.id}`, () => new THREE.BoxGeometry(lw, lh, .03).translate(lx, ly, lz)), doorM); if (sgn < 0) dg.scale.z = -1; }
    if (u.fork) add(bog, K.g(`fork${u.id}`, () => merge([[new THREE.BoxGeometry(.05, D0 * .7, .04), M4([0, D0 * .3, wh.W * .7])], [new THREE.BoxGeometry(.05, D0 * .7, .04), M4([0, D0 * .3, -wh.W * .7])], [new THREE.BoxGeometry(.08, .05, wh.W * 1.5), M4([0, D0 * .65, 0])]])), strutM);
    const doors = (u.doors || []).flatMap((d) => (u.w ? [sgn] : d.w && !u.doors.some((e) => e !== d && e.x === d.x && Math.abs(e.w + d.w) < 1e-6) ? [1, -1] : [1]).map((ds) => {
      const dg = doorGeo(d), dp = new THREE.Group(); dp.position.copy(B(d.x, dg.hy, d.w || 0)); dp.position.z *= ds; parts.gear.add(dp);
      for (const [g, m] of [[dg.out, doorM], [dg.inn, primerM]]) { const ms = add(dp, g, m); ms.scale.z = ds; ms.visible = d.only !== 'well'; }
      const well = add(parts.gear, dg.well, wellM, { p: dp.position, noShadow: true }); well.scale.z = ds;
      return { d, dp, well, sgn: ds };
    }));
    gears.push({ u, piv, leg, low, bog, sgn, doors, len });
  }

  const glassM = mat('glass', () => std(T, { color: 0x1d2329, roughness: .04, metalness: .1, envMapIntensity: 1 }, 1.3));
  for (const [ci, cn] of (sp.canopy || []).entries()) {
    const CF = K.v(`canF${ci}`, () => loftFn(cn.inf ? cn.loft.map((r) => [r[0], r[1] + cn.inf, r[2] - cn.inf, r[3] > 1e-3 ? r[3] + cn.inf : 0, ...r.slice(4)]) : cn.loft, { nU: cn.nU ?? 1.8, nL: 2 })), x0 = cn.loft[0][0], x1 = cn.loft[cn.loft.length - 1][0];
    const g = K.g(`can${ci}`, () => loftGeo(CF, { n: 20, step: .08, conv: (x, y, z) => [L / 2 - x, y - y0, z], uv: (x, s, len) => [(x - x0) / (x1 - x0), s / 2], capEnd: false, capStart: !!cn.capS }));
    const ct = K.g(`canT${ci}`, () => { const Lc = layer(1024, 512, '#11171c'), gq = Lc.g.createLinearGradient(0, 0, 0, 512), [ga, gb, gc] = cn.glass || ['#26323d', '#121920', '#0b0f13']; for (const [o, c] of [[0, ga], [.16, ga], [.32, gb], [.5, gc], [.68, gb], [.84, ga], [1, ga]]) gq.addColorStop(o, c); Lc.g.fillStyle = gq; Lc.g.fillRect(0, 0, 1024, 512); if (cn.inside) { const r3 = rng(5); for (let k = 0; k < cn.inside; k++) { const x = r3() * 1024, y = (.1 + .32 * r3()) * 512, rad = 25 + 70 * r3(), c = r3() < .5 ? '86,88,78' : '52,56,50'; for (const yy of [y, 512 - y]) { const q = Lc.g.createRadialGradient(x, yy, 0, x, yy, rad); q.addColorStop(0, `rgba(${c},.55)`); q.addColorStop(1, `rgba(${c},0)`); Lc.g.fillStyle = q; Lc.g.fillRect(x - rad, yy - rad, rad * 2, rad * 2); } } } const Lo = layer(512, 256, ORM(.04, 0)); const fw = cn.fw ?? .045, fc = cn.fc || paint.frame || paint.base || '#cfd3d6'; const g2 = Lc.g; g2.fillStyle = fc; Lo.g.fillStyle = ORM(paint.rough ?? .3, metalType ? 1 : 0); for (const [fr, k] of [[cn.frames, 1], [cn.thin || [], .5]]) for (const x of fr) { const u = (x - x0) / (x1 - x0), w = fw * k / (x1 - x0); g2.fillRect((u - w / 2) * 1024, 0, w * 1024, 512); Lo.g.fillRect((u - w / 2) * 512, 0, w * 512, 256); } for (const r0 of cn.rows || []) { const [sv, ra = x0, rb = x1] = [r0].flat(), ua = (ra - x0) / (x1 - x0) * 1024, ub = (rb - x0) / (x1 - x0) * 1024, rw = cn.rowW ?? 6; for (const v of [sv / 2, 1 - sv / 2]) { g2.fillRect(ua, v * 512 - rw / 2, ub - ua, rw); Lo.g.fillRect(ua / 2, v * 256 - rw / 4, (ub - ua) / 2, rw / 2); } } for (const [a, b] of cn.solid || []) for (const [va, vb] of [[a / 2, b / 2], [1 - b / 2, 1 - a / 2]]) { g2.fillRect(0, va * 512, 1024, (vb - va) * 512); Lo.g.fillRect(0, va * 256, 512, (vb - va) * 256); } g2.fillRect(0, 512 * .5 - 14, 1024, 28); Lo.g.fillRect(0, 256 * .5 - 7, 512, 14); g2.fillRect(0, 0, 1024, 6); g2.fillRect(0, 506, 1024, 6); const t = tex(Lc.c, true); t.userData.o = K.t(tex(Lo.c, false)); return t; });
    add(parts[cn.part || 'nose'], g, mat(`canM${ci}`, () => std(T, { map: ct, roughnessMap: ct.userData.o, metalnessMap: ct.userData.o, roughness: 1, metalness: 1 }, 1.2)));
  }
  for (const dm of sp.domes || []) {
    const g = K.g(`dome${dm.x}`, () => new THREE.SphereGeometry(dm.r, 28, 16, 0, Math.PI * 2, 0, Math.PI * (dm.full ? 1 : .55)).scale(dm.sx || 1, dm.sy || 1, 1));
    const m = add(parts[dm.part || 'mid'], g, glassM, { p: B(dm.x, dm.h, 0), q: dm.rx ? QE(0, 0, dm.rx * D) : null });
    add(parts[dm.part || 'mid'], K.g(`ring${dm.x}`, () => new THREE.TorusGeometry(dm.r * (dm.sx || 1) * .99, dm.r * .06, 8, 32).rotateX(Math.PI / 2)), mat('frameM', () => std(T, { color: paint.frame || paint.base, roughness: .35, metalness: metalType ? 1 : .2 })), { p: m.position, q: m.quaternion });
    if (dm.fr) add(parts[dm.part || 'mid'], K.g(`domeFr${dm.x}`, () => merge(Array.from({ length: dm.fr }, (_, k) => [new THREE.TorusGeometry(dm.r * 1.006, dm.r * .045, 4, 28, Math.PI).rotateY(k * Math.PI / dm.fr)])).scale(dm.sx || 1, dm.sy || 1, 1)), mat('frameM', () => std(T, { color: paint.frame || paint.base, roughness: .35, metalness: metalType ? 1 : .2 })), { p: m.position, q: m.quaternion });
    for (const gz of dm.guns || []) add(parts[dm.part || 'mid'], K.g('gun', () => cyl(.03, .02, 1, 6).rotateZ(Math.PI / 2)), darkM, { p: B(dm.x, dm.h + (dm.gy ?? 0), gz), q: QE(0, 0, (dm.ga ?? 0) * D) });
  }
  for (const fl of sp.floats || []) for (const sd of [1, -1]) {
    const FF = K.v('floatF', () => loftFn(fl.loft, { nU: 2.2, nL: 1.4 }));
    add(parts.wings, K.g(`float${sd}`, () => loftGeo(FF, { n: 16, step: .2, conv: (x, y, z) => [L / 2 - x, y - y0, z + fl.w * sd], uv: (x, s, len) => [x / 2, s * len / 2], capEnd: true, capStart: true })), mat('floatM', () => std(T, { color: paint.float || paint.low || paint.base, roughness: paint.floatR ?? paint.rough ?? .3, metalness: metalType ? 1 : 0, normalMap: tileN(K), normalScale: new THREE.Vector2(.3, .3) }, paint.ei ?? 1)));
    for (const [a, b] of fl.struts) { const A = B(a[0], a[1], (a[2] ?? fl.w) * sd), Bp = B(b[0], b[1], (b[2] ?? fl.w) * sd), d = Bp.clone().sub(A); add(parts.wings, K.g(`strut${a}${b}${sd}`, () => cyl(.05, .05, d.length(), 6)), strutM, { p: A }).quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); }
  }
  (LV.extra || (() => {}))({ K, T, sp, B, add, mat, std, parts, F, H, paint, group, wd, fins, hullM, wingM, tailM, darkM, strutM, chromeM });

  const glowS = (col, size, p, kind, parent, sec) => { const m = new THREE.SpriteMaterial({ map: glowTex(), color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: .999, toneMapped: false }); T.mats.push(m); const s = new THREE.Sprite(m); Object.assign(s.userData, { sz: size, kind, key, sec, vin: !!sp.vintage }); s.scale.setScalar(size); s.onBeforeRender = glowOBR; s.position.copy(p); s.renderOrder = 107; (parent || group).add(s); lights.push(s); return s; };
  const tip = wd.at(wd.s1 - (sp.wing.wl ? sp.wing.wl.dy + .05 : .02)), q = Math.max(sp.span * .025, .6);
  const tipP = (sd) => { const p = tip.p.clone().addScaledVector(tip.dir, tip.c * .35); p.z *= sd; return p; };
  const lensM = (c) => mat(`lens${c}`, () => { const m = std(T, { color: new THREE.Color(c).multiplyScalar(.12), roughness: .05, metalness: 0, transparent: true, opacity: .8, emissive: c, emissiveIntensity: .06 }); m.userData.lens = 1; return m; });
  const ls = sp.vintage ? .5 : 1, warm = !/a330|b777/.test(key);
  for (const sd of [-1, 1]) { const p = tipP(sd); glowS(sd < 0 ? 0xff1e12 : 0x12ff6e, q * 3.2, p.clone().add(new V3(0, 0, sd * .08 * ls)), 'nav', parts.wings, sd); add(parts.wings, K.g('lens', () => new THREE.SphereGeometry(.09 * ls, 12, 8).scale(2.2, 1, 1)), lensM(sd < 0 ? 0xff3030 : 0x30ff60), { p, ro: 106, noShadow: true }); }
  const tl = sp.tailLight || [X1, 0, 0], tailP = !sp.vintage && Math.abs(tl[0] - X1) < .2 ? B(X1 + .03, Math.max(tl[1], F.sec(X1).cr), 0) : B(...tl);
  glowS(warm ? 0xfff0dc : 0xfffaf2, q * 2.6, tailP, 'tail', parts.aft, 0);
  const strobes = [], beacons = [], land = [];
  if (!sp.vintage) {
    for (const sd of [-1, 1]) strobes.push(glowS(0xf2f6ff, q * 5.5, tipP(sd).add(new V3(-tip.c * .3, 0, sd * .1)), 'strobe', parts.wings));
    strobes.push(glowS(0xf2f6ff, q * 4.5, tailP.clone().add(new V3(-.1, 0, 0)), 'strobe', parts.aft));
    const bx = sp.beacons || [X1 * .35, X1 * .5];
    beacons.push(glowS(0xff1a0c, q * 4, B(bx[0], F.sec(bx[0]).cr + .12, 0), 'beacon', parts.mid), glowS(0xff1a0c, q * 4, B(bx[1], F.sec(bx[1]).kl - .12, 0), 'beacon', parts.mid));
    for (const p of [...beacons.map((b) => b.position)]) add(parts.mid, K.g('bcn', () => new THREE.SphereGeometry(.12, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)), lensM(0xff2020), { p, q: p.y < 0 ? QE(Math.PI, 0, 0) : null, ro: 106, noShadow: true });
  }
  for (const lp of sp.land || []) for (const sd of lp[2] ? [1, -1] : [0]) land.push(glowS(0xfff4e0, (lp[3] ? lp[3] * 3 : q * 4), B(lp[0], lp[1], (lp[2] || 0) * sd), 'land', parts.wings));

  group.traverse((o) => { if (o.isMesh && o.material.opacity < 1) { o.castShadow = false; o.renderOrder = Math.max(o.renderOrder, 106); } });

  const st = { rpm: 1, elevL: 0, elevR: 0, aileron: 0, rudder: 0, flaps: 0, gear: null, spoilers: 0 }; let gearIn = false;
  let t = 0, lightsOn = true; const ph = (kseed % 997) / 997 * 1.2;
  const qT = new THREE.Quaternion(), qI = new THREE.Quaternion(), vU = new V3(), Y = new V3(0, 1, 0), eu = new THREE.Euler();
  const AX = new V3(1, 0, 0), AZ = new V3(0, 0, 1), tv = new V3(), qG = new THREE.Quaternion();
  const setCtl = (c, ang, off) => { c.pv.quaternion.setFromAxisAngle(c.axis, ang); c.pv.position.copy(c.H0); if (off) c.pv.position.add(off); };
  const W1 = sp.wing;
  function pose() {
    for (const c of ctl) {
      const k = c.c.kind, sd = c.side;
      if (k === 'elev') setCtl(c, -(sd > 0 ? st.elevR : st.elevL) * D);
      else if (k === 'ail') setCtl(c, (sd > 0 ? -st.aileron : st.aileron) * D * (c.c.s0 > (W1.ailSplit ?? 1e9) ? 1 : 1));
      else if (k === 'rud') setCtl(c, st.rudder * D);
      else if (k === 'flap') { const f = st.flaps; if (c.c.plate) setCtl(c, f * (W1.splitMax ?? 45) * D); else setCtl(c, f * (W1.flapMax ?? 30) * D, tv.copy(c.dir).multiplyScalar(f * (c.c.fowler ?? 0) * c.cm).addScaledVector(c.n, -f * .02 * c.cm)); }
      else if (k === 'kr') setCtl(c, Math.min(1, st.flaps * 2) * (W1.krMax ?? 112) * D);
      else if (k === 'spl') setCtl(c, -Math.max(st.spoilers, 0) * (W1.splMax ?? 45) * D);
      else if (k === 'slat') { const f = Math.min(1, st.flaps * 1.6); setCtl(c, -f * (W1.slatMax ?? 18) * D, tv.copy(c.dir).multiplyScalar(-f * .05 * c.cm).addScaledVector(c.n, -f * .02 * c.cm)); }
    }
    const g = gearIn ? st.gear : parts.gear.visible && !sp.gearExposed ? 1 : 0;
    if (gearIn && !sp.gearExposed) parts.gear.visible = g > .002;
    for (const G of gears) {
      const u = G.u, legT = sm(.12, .85, g);
      if (u.axis === 'x' && !sp.engineKind) G.leg.quaternion.setFromAxisAngle(AZ, (u.rake || 0) * D).multiply(qG.setFromAxisAngle(AX, (1 - legT) * u.ang * D * G.sgn)); else G.leg.quaternion.setFromAxisAngle(u.axis === 'x' ? AX : AZ, ((u.rake || 0) + (1 - legT) * u.ang) * D * (u.axis === 'x' ? G.sgn : 1));
      G.low.position.y = -G.len * lerp(u.tele ?? 1, 1, legT);
      G.bog.rotation.z = (u.wh.tilt || 0) * D * sm(.6, .95, g) + (u.wh.stow || 0) * D * (1 - legT);
      G.leg.visible = g > .002 || !!sp.gearExposed || !!u.fixed;
      for (const dr of G.doors) { const d = dr.d, op = d.shut ? sm(0, .15, g) * (1 - sm(.85, 1, g)) : sm(0, .15, g); dr.dp.quaternion.setFromAxisAngle(AX, op * d.ang * D * dr.sgn); dr.dp.visible = op > .01; dr.well.visible = op > .01; }
    }
    return g;
  }
  const api = {
    group, parts, spec: sp,
    setNight(n) { NIGHT[key] = n; skyTint(n); const dk = sp.vintage ? .15 + .85 * n : lerp(.55, 1, n); for (const T2 of CACHE.tpl.values()) { if (T2.n === n && T2.nm === T2.mats.length) continue; T2.n = n; T2.nm = T2.mats.length; for (const k of ['hull', 'frac']) if (T2.m[k]) T2.m[k].emissiveIntensity = n * (paint.cabin ?? .5); for (const m of T2.mats) { if (m.userData.c != null) m.color.set(m.userData.c).multiplyScalar(dk); if (m.userData.lens) m.emissiveIntensity = lerp(.06, .9, n); } } },
    setLights(on) { lightsOn = on; for (const s of lights) s.visible = on && (s.userData.kind === 'nav' || s.userData.kind === 'tail'); },
    tick(dt, opts) {
      t += dt || 0;
      if (opts) for (const k in st) if (opts[k] != null) st[k] = opts[k];
      gearIn = opts?.gear != null;
      const rpm0 = st.rpm;
      for (const p of props) { const rpm = Array.isArray(rpm0) ? rpm0[p.i] ?? 1 : rpm0; p.o.rotation.x += (dt || 0) * (p.fan ? 32 : 75) * rpm; if (p.blur) { const v = clamp((rpm - .1) / .9, 0, 1) ** .85; p.blur.userData.op = p.blur.material.opacity = Math.min(v * p.blurMax, .999); p.blur.visible = v > .005; p.blur.rotation.x += (dt || 0) * 1.7 * rpm; if (p.blades) { const bm = p.blades.material; bm.opacity = lerp(.999, p.fade, sm(.25, .7, rpm)); bm.depthWrite = bm.opacity > .5; } } }
      const g = pose();
      for (const [m, f] of fracs) m.visible = f();
      const w = performance.now() / 1e3 + ph, sc = w % 1.2, fl = (x) => (x < 0 ? 0 : x < .05 ? 1 : x < .09 ? 1 - (x - .05) / .04 : 0), se = Math.max(fl(sc), sp.strobe2 ? fl(sc - .14) : 0);
      for (const s of strobes) { s.userData.e = se; s.visible = lightsOn && se > 0; }
      beacons.forEach((b, i) => { const c = Math.max(0, Math.cos((w * .75 + i * .5) * Math.PI * 2)) ** 6; b.userData.e = c; b.visible = lightsOn && c > .01; });
      for (const s of land) s.visible = lightsOn && g > .5 && (!sp.vintage || (NIGHT[key] ?? 0) > .3);
      group.getWorldQuaternion(qT);
      if (opts?.up) { if (Array.isArray(opts.up)) vU.fromArray(opts.up); else vU.copy(opts.up); vU.normalize(); qI.setFromUnitVectors(vU, Y); } else qI.copy(qT).invert();
      eu.setFromQuaternion(qI); T.erot.set(-eu.x, -eu.y, -eu.z);
    },
  };
  T.n = null; api.setNight(NIGHT[key] ?? 0); api.setLights(true); api.tick(0, {});
  return api;
}

let TILE_N = null, TILE_O = null;
function tileN(K) { if (TILE_N) return TILE_N; const S = 256, L = layer(S, S, N0), r = rng(9); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { L.g.fillStyle = NRM((r() - .5) * .08, (r() - .5) * .08); L.g.fillRect(i * 64, j * 64, 64, 64); } for (let i = 0; i <= 4; i++) { line(L, i * 64 - 1, 0, i * 64 - 1, S, 1, NRM(.4, 0)); line(L, i * 64 + 1, 0, i * 64 + 1, S, 1, NRM(-.4, 0)); line(L, 0, i * 64 - 1, S, i * 64 - 1, 1, NRM(0, .4)); line(L, 0, i * 64 + 1, S, i * 64 + 1, 1, NRM(0, -.4)); } return (TILE_N = tex(L.c, false, true)); }
function tileO(K) { if (TILE_O) return TILE_O; const S = 256, L = layer(S, S, ORM(1, 0)), r = rng(10); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { L.g.fillStyle = ORM(.85 + r() * .3, 1); L.g.fillRect(i * 64, j * 64, 64, 64); } return (TILE_O = tex(L.c, false, true)); }

function nacTex(K, key, fn) { return K.g(key, () => { const L = layer(1024 * TS, 1024 * TS, '#eeeeee'), Lo = layer(512 * TS, 512 * TS, ORM(.35, 0)), Ln = layer(512 * TS, 512 * TS, N0); fn(L, Lo, Ln); const t = tex(L.c, true); t.userData = { o: K.t(tex(Lo.c, false)), n: K.t(tex(Ln.c, false)) }; return t; }); }
function panelTex(K, key, o) {
  return K.g(key, () => {
    const W = Math.round((o.W || 1024) * TS), H = Math.round((o.H || 1024) * TS), Lc = layer(W, H, o.base), Ln = layer(W / 2, H / 2, N0), Lo = layer(W / 2, H / 2, ORM(o.rough, o.metal)), r = rng(hashS(key));
    const us = [0, ...(o.us || []), 1], vs = [0, ...(o.vs || []), 1], pu = W / o.lu, pv = H / o.lv, amp = o.tilt ?? .05, tn = o.tone ?? .04;
    for (let i = 0; i < us.length - 1; i++) for (let j = 0; j < vs.length - 1; j++) {
      const x = us[i] * W, y = vs[j] * H, w = (us[i + 1] - us[i]) * W, h = (vs[j + 1] - vs[j]) * H, t = (r() - .5) * 2 * tn, ro = (r() - .5) * 2 * (o.rvar ?? .05);
      Lc.g.fillStyle = t > 0 ? `rgba(255,255,255,${t})` : `rgba(0,0,0,${-t})`; Lc.g.fillRect(x, y, w, h);
      Ln.g.fillStyle = NRM((r() - .5) * 2 * amp, (r() - .5) * 2 * amp); Ln.g.fillRect(x / 2, y / 2, w / 2, h / 2);
      const q = Ln.g.createRadialGradient(x / 2 + w / 4, y / 2 + h / 4, 0, x / 2 + w / 4, y / 2 + h / 4, Math.max(w, h) / 3); q.addColorStop(0, `rgba(${128 + (r() - .5) * 40 | 0},${128 + (r() - .5) * 40 | 0},255,.5)`); q.addColorStop(1, 'rgba(128,128,255,0)'); Ln.g.fillStyle = q; Ln.g.fillRect(x / 2, y / 2, w / 2, h / 2);
      Lo.g.fillStyle = ro > 0 ? `rgba(0,255,0,${ro})` : `rgba(0,0,0,${-ro})`; Lo.g.fillRect(x / 2, y / 2, w / 2, h / 2);
    }
    const sc = o.seam || 'rgba(40,44,50,.5)', sw = Math.max(1.5, .008 * pu);
    const seam = (x0, y0, x1, y1, rv) => {
      line(Lc, x0, y0, x1, y1, sw, sc); const vert = Math.abs(x1 - x0) < Math.abs(y1 - y0);
      line(Ln, x0 / 2 - (vert ? 1 : 0), y0 / 2 - (vert ? 0 : 1), x1 / 2 - (vert ? 1 : 0), y1 / 2 - (vert ? 0 : 1), 1, vert ? NRM(.45, 0) : NRM(0, .45)); line(Ln, x0 / 2 + (vert ? 1 : 0), y0 / 2 + (vert ? 0 : 1), x1 / 2 + (vert ? 1 : 0), y1 / 2 + (vert ? 0 : 1), 1, vert ? NRM(-.45, 0) : NRM(0, -.45));
      if (rv && o.rivet) { const p = o.rivet * (vert ? pv : pu), d = Math.max(1.6, .008 * pu), off = .025 * (vert ? pu : pv); for (const s of [-1, 1]) { const dx = vert ? s * off : 0, dy = vert ? 0 : s * off; dots(Lc, x0 + dx, y0 + dy, x1 + dx, y1 + dy, p, d, o.rivetC || 'rgba(30,32,36,.35)'); dots(Ln, (x0 + dx) / 2, (y0 + dy) / 2, (x1 + dx) / 2, (y1 + dy) / 2, p / 2, d / 2 + .5, NRM(.3, .3)); } }
    };
    for (const u of o.us || []) seam(u * W, 0, u * W, H, true);
    for (const v of o.vs || []) seam(0, v * H, W, v * H, true);
    if (o.paint) o.paint({ Lc, Ln, Lo, W, H, pu, pv, r });
    const t = tex(Lc.c, true); t.userData = { o: K.t(tex(Lo.c, false)), n: K.t(tex(Ln.c, false)) }; return t;
  });
}
const panelMat = (T, mat, std, name, t, ns = .8, ei = 1) => mat(name, () => std(T, { map: t, normalMap: t.userData.n, normalScale: new THREE.Vector2(ns, ns), roughnessMap: t.userData.o, metalnessMap: t.userData.o, roughness: 1, metalness: 1 }, ei));
function ogive(R, len, back, n = 14, e = .62) { const p = []; for (let k = 0; k <= n; k++) { const t = k / n; p.push([len - back - t * len, Math.max(.002, R * Math.pow(1 - (1 - t) ** 2, e))]); } return lathe(p, 32); }
const ENGINES = {
  fan: {
    build({ K, T, sp, e, grp, add, mat, std, props, B, wd, paint, side }) {
      const E = e.fan ? sp[e.fan] : sp.fan, ek = e.fan || '', rh = E.hl / 2, rf = E.fan / 2, rmax = Math.max(...E.prof.map((p) => p[1])) / 2, lipT = rmax - rh;
      const prof = K.v('nacProf' + ek, () => {
        const C = [[-E.fanAt, rf + .02], [-E.fanAt * .5, rh - .03], [-.18, rh - .035], [-.05, rh - .02], [0, rh], [-.04, rh + lipT * .45], [-.16, rh + lipT * .8], [-.42, rh + lipT * .97], ...E.prof.slice(1).map(([a, d]) => [-a, d / 2])];
        const out = catmull(C, 5), nz = E.prof[E.prof.length - 1]; out.push([-nz[0] + .03, nz[1] / 2 - .04], [-nz[0] + .4, nz[1] / 2 - .1], [-E.fanAt - .25, rf + .04], [-E.fanAt - .02, rf + .025]); return out;
      });
      const acc = K.v('nacAcc' + ek, () => { let l = 0; return prof.map((p, i) => (i ? (l += Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1])) : 0)).map((v, _, a) => v / a[a.length - 1]); });
      const i0 = prof.findIndex((p) => p[0] === 0), vAt = (xa) => { if (xa <= 0) return acc[i0] * .78; for (let i = i0 + 1; i < prof.length; i++) if (prof[i][0] <= -xa) { const a = prof[i - 1][0], b = prof[i][0]; return lerp(acc[i - 1], acc[i], (a + xa) / (a - b || 1)) * .78; } return .78; };
      const lipV = acc[prof.findIndex((p) => p[0] === 0)] * .78, Ltot = K.v('nacLen' + ek, () => prof.reduce((a, p, i) => (i ? a + Math.hypot(p[0] - prof[i - 1][0], p[1] - prof[i - 1][1]) : 0), 0));
      const nT = nacTex(K, 'nacT' + ek, (Lc, Lo, Ln) => {
        const Wc = Lc.W, Hc = Lc.H, g = Lc.g; g.fillStyle = E.cowl || paint.nac || '#f1f2f0'; g.fillRect(0, 0, Wc, Hc * .78);
        const lp0 = (lipV - .12 / Ltot * .78) * Hc, lp1 = vAt(E.lip ?? .22) * Hc;
        const q = g.createLinearGradient(0, 0, 0, lp0); q.addColorStop(0, '#24272a'); q.addColorStop(.7, '#4a4f54'); q.addColorStop(1, '#5a5f64'); g.fillStyle = q; g.fillRect(0, 0, Wc, lp0);
        const lq = g.createLinearGradient(0, lp0, 0, lp1); lq.addColorStop(0, '#8d9296'); lq.addColorStop(.35, '#c3c7ca'); lq.addColorStop(1, '#ccd0d3'); g.fillStyle = lq; g.fillRect(0, lp0, Wc, lp1 - lp0); Lo.g.fillStyle = ORM(.24, .9); Lo.g.fillRect(0, lp0 * Lo.H / Hc, Lo.W, (lp1 - lp0) * Lo.H / Hc); Lo.g.fillStyle = ORM(.6, .3); Lo.g.fillRect(0, 0, Lo.W, lp0 * Lo.H / Hc);
        for (const j of E.joints || []) { const v = vAt(j) * Hc; g.fillStyle = 'rgba(60,66,72,.6)'; g.fillRect(0, v - 1, Wc, 2); line(Ln, 0, v * Ln.H / Hc - 1, Ln.W, v * Ln.H / Hc - 1, 1, NRM(0, .4)); line(Ln, 0, v * Ln.H / Hc + 1, Ln.W, v * Ln.H / Hc + 1, 1, NRM(0, -.4)); }
        if (E.metalAft) { const v = vAt(E.metalAft) * Hc; g.fillStyle = '#b5b9bc'; g.fillRect(0, v, Wc, Hc * .78 - v); Lo.g.fillStyle = ORM(.32, 1); Lo.g.fillRect(0, v * Lo.H / Hc, Lo.W, Lo.H * .78 - v * Lo.H / Hc); }
        for (const [a, b, col] of E.stripes || []) { g.fillStyle = col; g.fillRect(0, vAt(a) * Hc, Wc, (vAt(b) - vAt(a)) * Hc); }
        for (const [a, b, col, ka = 0, kb = ka] of E.slant || []) { g.beginPath(); for (let k = 0; k <= 64; k++) g.lineTo(k / 64 * Wc, vAt(a + ka * Math.cos(k / 32 * Math.PI)) * Hc); for (let k = 64; k >= 0; k--) g.lineTo(k / 64 * Wc, vAt(b + kb * Math.cos(k / 32 * Math.PI)) * Hc); g.fillStyle = col; g.fill(); }
        for (const [u0, u1, a, b, col] of E.bands || []) { g.fillStyle = col; g.fillRect(u0 * Wc, vAt(a) * Hc, (u1 - u0) * Wc, (vAt(b) - vAt(a)) * Hc); }
        const j0 = vAt(E.joints?.[0] ?? 1.2), j1 = vAt(E.joints?.[1] ?? 3), ve = vAt(E.prof[E.prof.length - 1][0] - .1), pn = new Path2D(), lt = new Path2D();
        Lo.g.fillStyle = ORM(E.cowlR ?? .22, 0); Lo.g.fillRect(0, lp1 * Lo.H / Hc + 1, Lo.W, (ve - lp1 / Hc) * Lo.H); Lo.g.fillStyle = ORM(.3, 0); Lo.g.fillRect(0, j0 * Lo.H, Lo.W, (j1 - j0) * Lo.H);
        for (const u of [.27, .73]) rr(pn, (u - .045) * Wc, lerp(j0, j1, .18) * Hc, .09 * Wc, (j1 - j0) * .5 * Hc, 8);
        for (const u of [.37, .63]) rr(pn, (u - .012) * Wc, lerp(j0, j1, .78) * Hc, .024 * Wc, (j1 - j0) * .12 * Hc, 3);
        pn.moveTo(.5 * Wc, j0 * Hc); pn.lineTo(.5 * Wc, ve * Hc); for (let k = 0; k < 3; k++) rr(lt, .5 * Wc - 7, lerp(j0, ve, .2 + .3 * k) * Hc, 14, 22, 3);
        g.lineWidth = 2; g.strokeStyle = 'rgba(70,76,82,.55)'; g.stroke(pn); g.fillStyle = 'rgba(60,64,70,.5)'; g.fill(lt);
        const pN = new Path2D(); pN.addPath(pn, new DOMMatrix([Ln.W / Wc, 0, 0, Ln.H / Hc, 0, 0])); groove(Ln, pN, .45, 1);
        const cg = g.createLinearGradient(0, .8 * Hc, 0, Hc); cg.addColorStop(0, E.coreC || '#8d8a84'); cg.addColorStop(.6, '#6e6a63'); cg.addColorStop(1, '#3b3936'); g.fillStyle = cg; g.fillRect(0, .8 * Hc, Wc, .2 * Hc);
        Lo.g.fillStyle = ORM(.4, .65); Lo.g.fillRect(0, .8 * Lo.H, Lo.W, .2 * Lo.H);
        for (let k = 0; k < 14; k++) { const v = (.82 + k * .012) * Hc; g.fillStyle = 'rgba(30,28,25,.14)'; g.fillRect(0, v, Wc, 2); }
        const sr = rng(4); for (let k = 0; k < 160; k++) { g.fillStyle = `rgba(40,36,30,${.03 + .05 * sr()})`; g.fillRect(sr() * Wc, (.84 + .16 * sr()) * Hc, 2 + sr() * 5, 20 + sr() * 80); }
        const dg = g.createLinearGradient(0, 0, Wc, 0); for (const [o, a] of [[0, 0], [.32, 0], [.5, .12], [.68, 0], [1, 0]]) dg.addColorStop(o, `rgba(66,62,56,${a})`); g.fillStyle = dg; g.fillRect(0, lp1, Wc, ve * Hc - lp1);
        const vs0 = vAt(Math.max(.5, E.prof[E.prof.length - 1][0] - .9)) * Hc, sg2 = g.createLinearGradient(0, vs0, 0, ve * Hc); sg2.addColorStop(0, 'rgba(46,42,36,0)'); sg2.addColorStop(.6, 'rgba(46,42,36,.14)'); sg2.addColorStop(1, 'rgba(40,36,30,.45)'); g.fillStyle = sg2; g.fillRect(0, vs0, Wc, ve * Hc - vs0);
        for (let k = 0; k < 40; k++) { const u = .5 + (sr() - .5) * (sr() < .7 ? .3 : .9), y0 = lerp(j0, ve, .3 + .5 * sr()) * Hc, ln = (ve * Hc - y0) * (.6 + .5 * sr()), w = 2 + 6 * sr(), q2 = g.createLinearGradient(0, y0, 0, y0 + ln); q2.addColorStop(0, 'rgba(56,50,42,0)'); q2.addColorStop(.6, `rgba(56,50,42,${(.05 + .08 * sr()).toFixed(3)})`); q2.addColorStop(1, 'rgba(56,50,42,0)'); g.fillStyle = q2; g.fillRect(u * Wc - w / 2, y0, w, ln); }
      });
      const nacM = mat('nac' + ek, () => std(T, { map: nT, roughnessMap: nT.userData.o, metalnessMap: nT.userData.o, roughness: 1, metalness: 1, normalMap: nT.userData.n, normalScale: new THREE.Vector2(.4, .4) }, paint.ei ?? 1));
      add(grp, K.g('nacG' + ek, () => lathe(prof, 48, [0, .78])), nacM);
      const coreP = K.v('coreP' + ek, () => { const cp = E.core.map(([a, d]) => [-a, d / 2]); return [[-E.fanAt - .3, rf * .62], [-E.fanAt - 1.2, cp[0][1] * .95], ...cp, [cp[cp.length - 1][0] + .05, cp[cp.length - 1][1] * .86], [cp[cp.length - 1][0] + .4, cp[cp.length - 1][1] * .8]]; });
      add(grp, K.g('coreG' + ek, () => lathe(catmull(coreP, 3), 32, [.79, .97])), nacM);
      const pl0 = coreP[coreP.length - 3];
      add(grp, K.g('plugG' + ek, () => lathe([[pl0[0] + .5, pl0[1] * .72], [pl0[0], pl0[1] * .72], [lerp(pl0[0], -E.plug, .5), pl0[1] * .5], [-E.plug + .08, .05], [-E.plug, .001]], 24, [.97, 1])), mat('plug', () => std(T, { color: 0x8c8882, roughness: .45, metalness: .6 })));
            const rot = new THREE.Group(); rot.position.x = -E.fanAt; grp.add(rot);
      const bladeM = mat('fanB', () => std(T, { color: E.bladeC || 0x5e646a, roughness: .38, metalness: 1 }, .8));
      const fanG = K.g('fanBl' + ek, () => { const n = E.blades, ps = []; for (let i = 0; i < n; i++) { const rows = [], S = 6; for (let k = 0; k <= S; k++) { const t = k / S, r = lerp(rf * .34, rf + .006, t), beta = lerp(25, 60, t) * D, c = lerp(rf * .3, rf * (E.wide ? .42 : .26), t), th = lerp(.02, .006, t), dir = new V3(-Math.cos(beta), 0, Math.sin(beta)), nn = new V3(Math.sin(beta), 0, Math.cos(beta)), o = new V3(0, r, 0); rows.push([o.clone().addScaledVector(dir, -.5 * c), o.clone().addScaledVector(nn, th), o.clone().addScaledVector(dir, .5 * c), o.clone().addScaledVector(nn, -th), o.clone().addScaledVector(dir, -.5 * c)].map((v) => v.toArray())); } ps.push([sheet(rows, null, false), M4([0, 0, 0], QE(i / n * Math.PI * 2, 0, 0))]); } if (E.shroud) ps.push([new THREE.TorusGeometry(rf * .58, .02, 6, 64).rotateY(Math.PI / 2)]); return merge(ps); });
      add(rot, fanG, bladeM);
      add(grp, K.g('fanBack' + ek, () => merge([1, -1].map((s) => [new THREE.CircleGeometry(rf + .03, 40).rotateY(s * Math.PI / 2).translate(-E.fanAt - .07, 0, 0)]))), ED(mat, std, T), { noShadow: true });
      add(rot, K.g('fanHub' + ek, () => lathe([[.05, rf * .34], [-.25, rf * .36], [-.5, rf * .3]], 32)), mat('hubDark', () => std(T, { color: 0x2c2f33, roughness: .6, metalness: .6 })));
      const spinT = K.g('spinT' + ek, () => { const L2 = layer(256, 256, E.spinC || '#3e4246'), g = L2.g; g.fillStyle = '#f2f2f2'; if (E.swirl) for (let k = 0; k < 64; k++) g.fillRect((k * 3) % 256, k * 4, 18, 5); else g.fillRect(4, 90, 12, 80); return tex(L2.c, true); });
      add(rot, K.g('spin' + ek, () => lathe([[E.spinL, .002], [E.spinL * .85, E.spin * .12], [E.spinL * .5, E.spin * .33], [E.spinL * .15, E.spin * .47], [0, E.spin / 2]], 32)), mat('spinM', () => std(T, { map: spinT, roughness: .3, metalness: .6 })));
      props.push({ o: rot, fan: true, i: props.length });
      if (e.pylon !== false && E.pylon) {
        const py = E.pylon, q = wd.at(Math.abs(e.w)), wingLow = (x) => { const f = clamp((x - q.x) / q.c, 0, 1); return q.p.y + q.n.y * foil(f, q.t, q.cam)[1] * q.c + (q.dir.y * f * q.c); };
        const ex = e.x, eh = grp.position.y, len = py.len, xs = 22, rows = [];
        const pyG = K.g(`pylon${Math.abs(e.w)}`, () => {
          for (let k = 0; k <= xs; k++) {
            const t = k / xs, xn = ex + py.x0 + t * len, Xb = L2B(xn), th = py.w / 2 * Math.pow(Math.sin(Math.PI * Math.min(1, (t + .02) / 1.02)), .5) * (t > .7 ? lerp(1, .25, (t - .7) / .3) : 1);
            const xLE = q.x + .25, top = (xn < xLE ? lerp(Math.max(...E.prof.map((p) => p[1])) / 2 + .25, wingLow(xLE) - eh + .05, clamp((xn - ex - py.x0) / (xLE - ex - py.x0), 0, 1)) : wingLow(xn) - eh + .3), nacTop = Math.max(...E.prof.map((p) => p[1])) / 2, bot = t < py.over ? (nacTop - .12) : lerp(nacTop - .12, py.endH ?? .4, sm(py.over, 1, t) ** .8) + (t > py.over ? py.drop * Math.sin(Math.PI * sm(py.over, 1, t)) : 0);
            const b2 = Math.min(bot, top - .05), ring = [[Xb, b2 + .1, -th], [Xb, top, -th], [Xb, top, th], [Xb, b2 + .1, th], [Xb, b2, th * .4], [Xb, b2, -th * .4], [Xb, b2 + .1, -th]];
            rows.push(ring);
          }
          const g = sheet(rows, rows.map((rw, i) => rw.map((p, j) => [i / xs * 3, j / 6])), false), col = [];
          rows.forEach((rw, i) => { const t = i / xs, h = sm(py.over - .05, py.over + .25, t), b = h * lerp(.55, .2, sm(.75, 1, t)); rw.forEach((p, j) => { const lo = j >= 4 || j === 0 || j === 3 ? 1 : .35, k = 1 - b * lo; col.push(k, k * lerp(1, .9, b * lo), k * lerp(1, .8, b * lo)); }); });
          g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); return g;
        });
        function L2B(xn) { return (sp.length / 2 - xn) - grp.position.x; }
        add(grp, pyG, mat('pyM', () => std(T, { color: paint.pylonM || paint.pylon || '#c9ccce', vertexColors: true, roughness: .42, metalness: .12, normalMap: tileN(K), normalScale: new THREE.Vector2(.4, .4), roughnessMap: tileO(K) }, paint.ei ?? 1)));
      }
    },
  },
  radial: {
    build({ K, T, sp, e, grp, add, mat, std, props, paint, side, B }) {
      const R = sp.radial, od = R.od / 2, op = R.open / 2, lip = R.lip, cl = R.len, x0 = -R.cowlAt;
      const cowlT = nacTex(K, 'cowlT', (Lc, Lo, Ln) => { const g = Lc.g; g.fillStyle = R.cowlC || paint.cowl || '#c8ccd0'; g.fillRect(0, 0, Lc.W, Lc.H); g.fillStyle = '#2a2d31'; g.fillRect(0, 0, Lc.W, Lc.H * .16); Lo.g.fillStyle = ORM(R.cowlR ?? .22, R.cowlM ?? 1); Lo.g.fillRect(0, Lo.H * .2, Lo.W, Lo.H); Lo.g.fillStyle = ORM(.7, .3); Lo.g.fillRect(0, 0, Lo.W, Lo.H * .18); const r2 = rng(3); if (R.brushed) for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(${r2() < .5 ? '255,255,255' : '0,0,0'},${.03 + .04 * r2()})`; g.fillRect(r2() * Lc.W, Lc.H * (.2 + .8 * r2()), 1 + r2() * 2, 30 + r2() * 200); } for (const s of R.seams || [.5]) { const v = (.2 + .8 * s) * Lc.H; g.fillStyle = 'rgba(40,44,50,.5)'; g.fillRect(0, v, Lc.W, 2); line(Ln, 0, v / 2 - 1, Ln.W, v / 2 - 1, 1, NRM(0, .5)); line(Ln, 0, v / 2 + 1, Ln.W, v / 2 + 1, 1, NRM(0, -.5)); dots(Lc, 0, v + 6, Lc.W, v + 6, 9, 3, 'rgba(30,30,30,.35)'); dots(Lc, 0, v - 6, Lc.W, v - 6, 9, 3, 'rgba(30,30,30,.35)'); } for (let k = 0; k < 6; k++) { const u = k / 6 * Lc.W; g.fillStyle = 'rgba(40,44,50,.35)'; g.fillRect(u, Lc.H * .2, 2, Lc.H); } for (const [a, b, col] of R.bands || []) { g.fillStyle = col; g.fillRect(0, (.2 + .8 * a) * Lc.H, Lc.W, (b - a) * .8 * Lc.H); } });
      const cowlM = mat('cowl', () => std(T, { map: cowlT, roughnessMap: cowlT.userData.o, metalnessMap: cowlT.userData.o, normalMap: cowlT.userData.n, normalScale: new THREE.Vector2(.5, .5), roughness: 1, metalness: 1 }));
      const prof = K.v('cowlP', () => { const C = R.face ? [[x0 - R.inner, op * .96], ...R.face.map(([dx, r]) => [x0 + dx, r]), ...R.prof] : [[x0 - R.inner, op * .96], [x0 - lip * .9, op], [x0 - lip * .25, op + lip * .15], [x0, op + lip * .5], [x0 - lip * .25, op + lip * .95], [x0 - lip, Math.min(od, op + lip * 1.4)], [x0 - lip * 2.4, od], ...(R.prof || [[x0 - cl * .6, od * 1.0], [x0 - cl, od * (R.taper ?? .98)]])]; return catmull(C, 5); });
      const ovl = (y, z) => { const r = Math.hypot(y, z); if (r < 1e-6) return [y, z]; const t = sm(op * .95, od, r), e = 2 / lerp(2, R.sq || 2, t), c = y / r, s = z / r; return [r * Math.sign(c) * Math.abs(c) ** e * lerp(R.ovalIn, R.oval, t), r * Math.sign(s) * Math.abs(s) ** e]; };
      if (!R.noCowl) add(grp, K.g('cowlG', () => { const g = lathe(prof, 48, [0, 1]); if (R.ovalIn) { const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const [y, z] = ovl(p.getY(i), p.getZ(i)); p.setY(i, y); p.setZ(i, z); } g.computeVertexNormals(); weldPairs(g, prof.map((_, i) => [i * 49, i * 49 + 48])); } return g; }), cowlM).scale.y = R.ovalIn ? 1 : R.oval || 1;
      if (R.slots) add(grp, K.g('slots', () => {
        const [ra, w, a0] = R.slots, iF = prof.reduce((b, p, i) => (p[0] > prof[b][0] ? i : b), 0), xAt = (r) => { for (let i = iF; i < prof.length - 1; i++) if (prof[i + 1][1] >= r) return lerp(prof[i][0], prof[i + 1][0], clamp((r - prof[i][1]) / (prof[i + 1][1] - prof[i][1] || 1), 0, 1)); return prof[prof.length - 1][0]; };
        const mk = (sd, flip) => { const rows = [[], []]; for (let k = 0; k <= 12; k++) { const a = (k / 6 - 1) * a0 * D, f = Math.cos((k / 6 - 1) * Math.PI / 2) ** .55; [ra + w / 2, ra + w / 2 - w * f].forEach((r0, j) => { const ph = sd * Math.PI / 2 + a, fp = (xAt(r0 + .005) - xAt(r0 - .005)) / .01, nl = Math.hypot(1, fp), r = r0 - .007 * fp / nl, [y, z] = ovl(r * Math.cos(ph), r * Math.sin(ph)); rows[j].push([xAt(r0) + .007 / nl, y, z]); }); } return sheet(rows, null, flip); };
        return merge([1, -1].map((sd) => { let g = mk(sd, false); if (g.attributes.normal.getX(6) < 0) { g.dispose(); g = mk(sd, true); } return [g]; }));
      }), ED(mat, std, T), { noShadow: true });
      if (R.cres) { const [ra, w, a0] = R.cres; add(grp, K.g('cres', () => merge([1, -1].map((sd) => { const pts = []; const V2 = (u, v) => (R.cres[3] ? new THREE.Vector2(v, u) : new THREE.Vector2(u, v)); for (let k = 0; k <= 16; k++) { const a = (-a0 + 2 * a0 * k / 16) * D; pts.push(V2(sd * Math.cos(a) * ra, Math.sin(a) * ra)); } for (let k = 16; k >= 0; k--) { const a = (-a0 + 2 * a0 * k / 16) * D, rb = ra - w * Math.cos(a / a0 / D * Math.PI / 2) ** .6; pts.push(V2(sd * Math.cos(a) * rb, Math.sin(a) * rb)); } return [new THREE.ShapeGeometry(new THREE.Shape(pts)).rotateY(Math.PI / 2).translate(x0 + .01, 0, 0)]; }))), ED(mat, std, T)).scale.y = R.ovalIn ?? R.oval ?? 1; }
      const darkM = ED(mat, std, T);
      add(grp, K.g('baffle', () => (R.baffle ? new THREE.CircleGeometry(1, 32).scale(R.baffle[2], R.baffle[1], 1).rotateY(Math.PI / 2).translate(R.baffle[0], 0, 0) : new THREE.CircleGeometry(R.noCowl ? R.open / 2 * 1.02 : od * .98, 32).rotateY(Math.PI / 2).translate(x0 - lip * 2.2 - R.cylD * 1.4 * (R.rows || 1) - .05, 0, 0))), darkM).scale.y = R.baffle ? 1 : R.oval || 1;
      const cylM = mat('cyl', () => std(T, { color: R.cylC || 0x3a3d40, roughness: .55, metalness: .7 }));
      const engG = K.g('engG', () => {
        const ps = [], rows = R.rows || 1, n = R.cyl, r0 = R.r0 ?? op * .34, rE = Math.min(R.engR, od * .93), hl = rE - r0, cd = R.cylD, xc = x0 - lip * 2.2 - .05;
        const prof = []; const NF = 12; for (let k = 0; k <= NF * 2; k++) { const t = k / (NF * 2); prof.push([t * hl * .58, k % 2 ? cd * .42 : cd * .6]); }
        prof.push([hl * .6, cd * .5], [hl * .62, cd * .72], [hl * .7, cd * .6], [hl * .72, cd * .74], [hl * .8, cd * .62], [hl * .82, cd * .72], [hl * .9, cd * .55], [hl * .97, cd * .4], [hl, .002]);
        const cylG = lathe(prof, 12, null, true).rotateZ(Math.PI / 2);
        const rock = new THREE.BoxGeometry(cd * .5, cd * .35, cd * 1.1).translate(0, hl * .93, 0);
        for (let rw = 0; rw < rows; rw++) for (let i = 0; i < n; i++) { const a = (i + rw * .5) / n * Math.PI * 2, x = xc - rw * cd * (R.rowK ?? 1.25); ps.push([cylG, M4([x, Math.cos(a) * r0, Math.sin(a) * r0], QE(a, 0, 0))], [rock, M4([x, Math.cos(a) * r0, Math.sin(a) * r0], QE(a, 0, 0))]); const pr = cyl(.008, .008, hl * .8, 4); for (const o of [-.16, .16]) ps.push([pr, M4([x + cd * .55, Math.cos(a + o * 2 / n * 3) * r0 * .95, Math.sin(a + o * 2 / n * 3) * r0 * .95], QE(a + o * 2 / n * 3, 0, 0))]); }
        ps.push([new THREE.SphereGeometry(r0 * 1.05, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(.55, 1, 1).translate(xc + cd * .3, 0, 0)]);
        ps.push([new THREE.TorusGeometry(r0 * 1.35, .014, 6, 48).rotateY(Math.PI / 2).translate(xc + cd * .45, 0, 0)]);
        return merge(ps);
      });
      add(grp, engG, cylM).scale.y = R.ovalIn ? 1 : R.oval || 1;
      const hubM = mat('hubP', () => std(T, { color: R.hubC || 0xb8bcc0, roughness: R.hubR ?? .25, metalness: R.hubM ?? 1 }));
      const rot = new THREE.Group(); grp.add(rot);
      if (R.spinner) add(rot, K.g('spinner', () => lathe(catmull([[R.spinner[1], .002], [R.spinner[1] * .7, R.spinner[0] * .3], [R.spinner[1] * .25, R.spinner[0] * .48], [-.05, R.spinner[0] / 2]], 4), 32)), mat('spinR', () => std(T, { color: R.spinC || 0x111214, roughness: .3, metalness: .5 })));
      else add(rot, K.g('hubG', () => merge([[cyl(R.hub[0] / 2, R.hub[0] / 2, R.hub[1], 16).rotateZ(-Math.PI / 2).translate(-R.hub[1] * .5, 0, 0)], [new THREE.SphereGeometry(R.hub[0] * .45, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).translate(R.hub[1] * .5, 0, 0)], ...(R.clamp ? Array.from({ length: sp.prop.n }, (_, b) => [cyl(R.clamp, R.clamp * .9, .16, 10).translate(0, R.hub[0] / 2 - .04, 0), M4([0, 0, 0], QE(b / sp.prop.n * Math.PI * 2, 0, 0))]) : []), ...(R.cw ? [[new THREE.BoxGeometry(.08, .2, .03), M4([R.hub[1] * .4, .14, 0])], [new THREE.BoxGeometry(.08, .2, .03), M4([R.hub[1] * .4, -.14, 0])], [new THREE.SphereGeometry(.045, 10, 6), M4([R.hub[1] * .5, .24, 0])], [new THREE.SphereGeometry(.045, 10, 6), M4([R.hub[1] * .5, -.24, 0])]] : [])])), hubM);
      propBlades({ K, T, sp, rot, add, mat, std, props, P: sp.prop });
      if (R.dome) add(rot, K.g('domeG', () => new THREE.SphereGeometry(R.dome / 2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(1.3, 1, 1).translate(R.hub[1] * .5, 0, 0)), hubM);
      for (const sd of side ? [side] : [1, -1]) exhaustStub({ K, sp, grp, add, mat, std, T, side: sd, R });
    },
  },
  inline: {
    build({ K, T, sp, e, grp, add, mat, std, props, paint, side, B }) {
      const R = sp.inline, ex = R.exh, lk = e.nl || 'loft', LO = R[lk], x0 = LO[0][0], x1 = LO[LO.length - 1][0];
      const FC = K.v(`mlF${lk}`, () => loftFn(LO, { nU: 2.2, nL: 2.4 }));
      const g = K.g(`mlG${lk}`, () => loftGeo(FC, { n: 24, step: .1, conv: (x, y, z) => [-x, y, z], uv: (x, s) => [(x - x0) / (x1 - x0), s / 2], capEnd: true, capStart: false }));
      const tx = panelTex(K, `mlT${lk}`, { W: 1024, H: 512, base: R.cowlC || '#c4c8cc', rough: R.cowlR ?? .2, metal: 1, lu: x1 - x0, lv: 3.4, us: R.us.filter((u) => u < x1).map((u) => (u - x0) / (x1 - x0)), vs: [.13, .3, .5, .7, .87], tilt: .07, tone: .06, rivet: .045, paint({ Lc, Lo, W, H, r }) {
        const ux = (x) => (x - x0) / (x1 - x0) * W, g2 = Lc.g, Rg = FC.ring(1, 48), dE = (k) => Math.hypot(Rg.ys[k] - ex.y, Rg.zs[k] - ex.z); let kb = 0; for (let k = 1; k <= 48; k++) if (dE(k) < dE(kb)) kb = k;
        const vE = kb / 96, xs = ux(ex.x + .05), xa = ux(ex.x + ex.l - .1), xb = ux(Math.min(x1, ex.x + ex.l + 3.4));
        for (const [v0, dir] of [[vE, 1], [1 - vE, -1]]) {
          const band = (xA, xB, t0, t1, t2, t3, stops, col) => { const p = new Path2D(), q = g2.createLinearGradient(xA, 0, xB, 0); p.moveTo(xA, (v0 - dir * t0) * H); p.lineTo(xB, (v0 - dir * t1) * H); p.lineTo(xB, (v0 + dir * t2) * H); p.lineTo(xA, (v0 + dir * t3) * H); p.closePath(); for (const [o, a] of stops) q.addColorStop(o, `rgba(${col},${a})`); g2.fillStyle = q; g2.fill(p); return p; };
          band(xs, xa, .022, .026, .03, .022, [[0, .25], [1, .42]], '34,30,27');
          const p = band(xa, xb, .03, .06, .15, .05, [[0, .82], [.2, .68], [.55, .34], [1, 0]], '24,22,20');
          Lo.g.save(); Lo.g.scale(.5, .5); Lo.g.globalAlpha = .6; Lo.g.fillStyle = ORM(.55, .45); Lo.g.fill(p); Lo.g.restore();
          const sl = []; for (let k = 0; k < 18; k++) { const va = v0 + dir * (r() * .13 - .03); sl.push([xa + r() * 24, va * H, lerp(xa, xb, .35 + .65 * r()), (va + dir * .035 * r()) * H]); } segs(Lc, sl, 3, 'rgba(20,18,16,.2)');
        }
        g2.fillStyle = 'rgba(45,40,32,.16)'; g2.fillRect(ux(.4), .43 * H, ux(x1) - ux(.4), .14 * H);
        Lo.g.fillStyle = ORM(.34, .9); Lo.g.fillRect(ux(.3) / 2, .42 * H / 2, (ux(x1) - ux(.3)) / 2, .16 * H / 2);
      } });
      const cM = panelMat(T, mat, std, `mlM${lk}`, tx, .8);
      add(grp, g, cM);
      const darkM = ED(mat, std, T), [rw, rh, rx, ry] = R.rad, rrS = (s, w, h, r) => { const x = -w / 2, y = -h / 2; s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h); s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y); return s; };
      add(grp, K.g('radI', () => new THREE.ShapeGeometry(rrS(new THREE.Shape(), rw - .06, rh - .06, .14), 4).rotateY(Math.PI / 2).translate(-rx + .02, ry, 0)), darkM);
      add(grp, K.g('radL', () => { const sh = rrS(new THREE.Shape(), rw, rh, .17); sh.holes.push(rrS(new THREE.Path(), rw - .07, rh - .07, .14)); return new THREE.ExtrudeGeometry(sh, { depth: .07, bevelEnabled: true, bevelThickness: .008, bevelSize: .006, bevelSegments: 2, curveSegments: 4 }).rotateY(Math.PI / 2).translate(-rx + .02, ry, 0); }), mat('radLip', () => std(T, { color: '#b4b8bb', roughness: .3, metalness: 1, normalMap: tileN(K), normalScale: new THREE.Vector2(.2, .2) }, paint.ei ?? 1)));
      add(grp, K.g('trough', () => merge([1, -1].map((sd) => [new THREE.BoxGeometry(ex.l, ex.h * .42, .02), M4([-ex.x - ex.l / 2 + .02, ex.y, sd * (ex.z - .012)])]))), mat('trough', () => std(T, { color: 0x8e8c89, roughness: .42, metalness: .85 }, .8)));
      const stub = (sd, k, cap) => { const g = cap ? new THREE.CircleGeometry(.036, 10).rotateX(-Math.PI / 2).translate(0, .202, 0) : cyl(.05, .045, .2, 10); return [g.scale(.72, 1, 1.3).translate(0, -.03, 0).rotateX(sd * Math.PI / 2).rotateY(-sd * .5), M4([-ex.x - .12 - k * .235, ex.y, sd * (ex.z - .04)])]; };
      add(grp, K.g('stubs', () => merge([1, -1].flatMap((sd) => Array.from({ length: 6 }, (_, k) => stub(sd, k))))), mat('stubM', () => std(T, { color: 0x2b2826, roughness: .6, metalness: .5 }, .45)));
      add(grp, K.g('stubE', () => merge([1, -1].flatMap((sd) => Array.from({ length: 6 }, (_, k) => stub(sd, k, 1))))), ED(mat, std, T));
      const rot = new THREE.Group(); grp.add(rot);
      add(rot, K.g('spinner', () => ogive(R.spinner[0] / 2, R.spinner[1], R.spinner[2] ?? .1, 16, R.spinner[3] ?? .62)), mat('spinR', () => std(T, { color: 0x141518, roughness: .38, metalness: .35 })));
      propBlades({ K, T, sp, rot, add, mat, std, props, P: sp.prop });
    },
  },
};
function propBlades({ K, T, sp, rot, add, mat, std, props, P }) {
  const g = K.g('blades', () => bladeGeo(P.d / 2, P.hub, chordOf(P), (t) => lerp(P.pitch[0], P.pitch[1], t), P.n));
  const bt = K.g('bladeT', () => { const L2 = layer(4, 64, P.col); if (P.tip) { L2.g.fillStyle = P.tipC; L2.g.fillRect(0, (P.d / 2 * (1 - P.tip) - P.hub) / (P.d / 2 - P.hub) * 64, 4, 64); } return tex(L2.c, true); });
  const bm = mat('bladesM', () => std(T, { map: bt, roughness: P.rough ?? .45, metalness: P.metal ?? .3, transparent: true, opacity: .999 }));
  const bm1 = bm.clone(); bm1.onBeforeCompile = bm.onBeforeCompile; bm1.customProgramCacheKey = bm.customProgramCacheKey;
  const bl = add(rot, g, bm1, { ro: 106 });
  const dm = std(T, { color: 0xffffff, map: blurTex(P), roughness: Math.max(.6, P.rough ?? .5), metalness: P.metal ?? .2, transparent: true, opacity: .2, depthWrite: false }, .35);
  const disc = new THREE.Mesh(K.g('blurG', () => new THREE.CircleGeometry(P.d / 2, 48).rotateY(Math.PI / 2)), dm);
  disc.onBeforeRender = (r, sc, cam) => { BV.setFromMatrixPosition(disc.matrixWorld).sub(BN.setFromMatrixPosition(cam.matrixWorld)).normalize(); BN.set(1, 0, 0).transformDirection(disc.matrixWorld); dm.opacity = disc.userData.op * (.5 + .5 * Math.abs(BV.dot(BN))); };
  const back = new THREE.Mesh(disc.geometry, dm); back.onBeforeRender = disc.onBeforeRender; disc.renderOrder = back.renderOrder = 107; back.rotation.y = Math.PI; disc.add(back); disc.position.x = .02; rot.parent.add(disc);
  props.push({ o: rot, blur: disc, blades: bl, blurMax: P.blurMax ?? 1, fade: P.fade ?? .05, i: props.length });
}
const ED = (mat, std, T) => mat('engDark', () => std(T, { color: 0x15171a, roughness: .8, metalness: .2 }, .2)), WM = (mat, std, T) => mat('wire', () => std(T, { color: 0x2a2c2e, roughness: .5, metalness: .6 }));
function exhaustStub({ K, sp, grp, add, mat, std, T, side, R }) {
  if (!R.exh) return;
  const [x, y, z, d, l] = R.exh;
  if (R.exhK === 'stub') { add(grp, K.g('exh', () => merge([[cyl(d / 2, d / 2 * 1.08, l, 14).rotateZ(Math.PI / 2 + .5).translate(-x, y, z)], [new THREE.BoxGeometry(.34, .3, .04).translate(-x + .05, y + .06, z - .02)]])), mat('exhM2', () => std(T, { color: 0x3d3530, roughness: .7, metalness: .7 }, .5))).scale.z = side || 1; add(grp, K.g('exhE', () => new THREE.CircleGeometry(d / 2 * .9, 14).rotateX(-Math.PI / 2).translate(0, -l - .002, 0).rotateZ(Math.PI / 2 + .5).translate(-x, y, z)), ED(mat, std, T)).scale.z = side || 1; return; }
  add(grp, K.g('exh', () => cyl(d / 2, d / 2 * .95, l, 12).rotateZ(Math.PI / 2 + .35).translate(-x, y, z)), mat('exhM', () => std(T, { color: 0x3a3633, roughness: .6, metalness: .6 }))).scale.z = side || 1;
  add(grp, K.g('exhO', () => new THREE.CircleGeometry(d * .4, 12).rotateX(-Math.PI / 2).translate(0, l + .004, 0).rotateZ(Math.PI / 2 + .35).translate(-x, y, z)), ED(mat, std, T)).scale.z = side || 1;
}

const both = (f) => { f(1); f(-1); }, BV = new V3(), BN = new V3();
function aerial({ K, T, add, mat, std, parts, B, F, fins }, mx, mh, lean = .12, extra = [], by) {
  const wire = WM(mat, std, T), mm = mat('mastM', () => std(T, { color: 0x9a9ea2, roughness: .35, metalness: .9 }));
  const cr = by ?? F.sec(mx).cr, part = parts.mid;
  add(part, K.g('mastA', () => cyl(.025, .012, mh, 8).rotateZ(lean)), mm, { p: B(mx, cr - .02, 0) });
  const top = B(mx, cr - .02, 0).add(new V3(-Math.sin(lean) * mh, Math.cos(lean) * mh, 0));
  const wireTo = (a, b) => { const d = b.clone().sub(a), g = K.g(`aw${a.x.toFixed(2)}${b.x.toFixed(2)}${b.y.toFixed(2)}${b.z.toFixed(2)}`, () => cyl(.004, .004, d.length(), 4)), m = add(part, g, wire, { p: a, noShadow: true }); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); };
  for (const d of fins) { const q = d.at(d.s1 - .05); wireTo(top, q.p.clone().add(new V3(-q.c * .4, 0, 0))); }
  for (const [x, y] of extra) wireTo(B(x, y, 0), top);
}
function grime(P, Lc, sp, o = {}) {
  const H = P.H, X1 = H.X1, r = o.r, hf = (f) => (x) => H.keel(x) + (H.crown(x) - H.keel(x)) * f;
  both((sd) => {
    if (!o.jet) { P.band(Lc, sd, X1 * .28, X1 * .9, hf(.28), -99, `rgba(70,66,58,${o.belly ?? .05})`); P.band(Lc, sd, X1 * .34, X1 * .85, hf(.14), -99, `rgba(60,56,48,${o.belly2 ?? .06})`); }
    else for (const [k, f] of [.3, .17, .07].entries()) P.band(Lc, sd, X1 * (.16 + .05 * k), X1 * (.93 - .04 * k), hf(f), -99, `rgba(66,60,50,${o.belly ?? .055})`, .5);
    for (let k = 0; k < (o.streaks ?? 14); k++) {
      const x0 = X1 * (.36 + .3 * r()), yy = hf(.06 + .26 * r())(x0), ln = X1 * (.06 + .2 * r()), th = o.jet ? .04 + .16 * r() : .03 + .03 * r(), a = o.jet ? .07 + .13 * r() : .04 + .06 * r();
      if (!o.jet) { P.band(Lc, sd, x0, x0 + ln, yy + th, yy - .02, `rgba(60,55,45,${a})`); continue; }
      for (const f of [1, .6, .3]) P.band(Lc, sd, x0, x0 + ln * f, (x) => yy + th * (.3 + .7 * (x - x0) / ln), (x) => yy - th * (.1 + .3 * (x - x0) / ln), `rgba(58,52,42,${(a / 2.2).toFixed(3)})`, Math.max(.4, ln / 6));
    }
    if (o.FF) { const FF = o.FF, xa = FF.T[0][0] + .5, xb = FF.T[FF.T.length - 1][0] - .3; for (const [dy, a] of [[.32, .06], [.14, .08]]) P.band(Lc, sd, xa, xb, (x) => FF.sec(x).cr + dy, (x) => FF.sec(x).cr - .15, `rgba(56,50,42,${a})`, .5); }
    if (o.soot) for (let k = 0; k < 7; k++) { const x0 = o.soot[0] + (o.soot[1] - o.soot[0]) * r(), yy = hf(.05 + .25 * r())(x0), ln = 4 + 10 * r(), h = .1 + .3 * r(), a = (.05 + .05 * r()).toFixed(3); for (const f of [1, .55, .25]) P.band(Lc, sd, x0, x0 + ln * f, yy + h / 2, yy - h / 2, `rgba(40,36,30,${a})`, ln / 4); }
  });
}
function gearMarks(P, c) {
  const { Lc, sp } = c, w = Math.max(1.6, .022 * P.ppm(Lc));
  for (const u of sp.gear || []) for (const d of u.doors || []) {
    const z0 = Math.abs(d.w || 0), z1 = Math.abs((d.w || 0) + d.wd * d.to), za = Math.min(z0, z1), zb = Math.max(z0, z1);
    const bq = c.belly?.(d.x, (za + zb) / 2); if (!bq || bq.fair || bq.out) continue;
    both((sd) => { const pts = [[d.x - d.l / 2, za], [d.x + d.l / 2, za], [d.x + d.l / 2, zb], [d.x - d.l / 2, zb]]; P.pathZ(Lc, pts, true, sd); Lc.g.strokeStyle = 'rgba(30,33,37,.8)'; Lc.g.lineWidth = w; Lc.g.stroke(); P.pathZ(Lc, [[d.x - d.l / 2 + .05, z0], [d.x + d.l / 2 - .05, z0], [d.x + d.l / 2 - .05, z0 + .015], [d.x - d.l / 2 + .05, z0 + .015]], true, sd); Lc.g.strokeStyle = 'rgba(40,44,48,.45)'; Lc.g.lineWidth = w * .6; Lc.g.stroke(); });
  }
}
function odFade(P, c, sd, X, Ymax) {
  const r = c.r;
  for (let k = 0; k < 70; k++) { const x = r() * X, y = .3 + r() * Ymax, rad = .4 + 1.6 * r(), light = r() < .6; P.local(c.Lc, x, y, sd, (g) => { const q = g.createRadialGradient(0, 0, 0, 0, 0, rad); q.addColorStop(0, light ? `rgba(122,116,94,${.12 + .14 * r()})` : `rgba(46,45,34,${.12 + .14 * r()})`); q.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = q; g.fillRect(-rad, -rad, rad * 2, rad * 2); }); }
  for (let k = 0; k < 14; k++) { const x = 1 + r() * (X - 2), y = .9 + r() * (Ymax - 1.2), w = .3 + .6 * r(), h = .2 + .35 * r(), col = r() < .5 ? '58,56,38' : '100,94,66', a = .14 + .14 * r(), rot = (r() - .5) * .8; P.local(c.Lc, x, y, sd, (g) => { g.rotate(rot); g.scale(w, h); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(.55, `rgba(${col},${a * .8})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.beginPath(); for (let j = 0; j < 9; j++) { const t = j / 9 * Math.PI * 2, rr2 = .75 + .25 * r(); g.lineTo(Math.cos(t) * rr2, Math.sin(t) * rr2); } g.fill(); }); }
}
function rowWin(P, c, rows, Y, w, h, o = {}) { const list = []; for (const sd of [1, -1]) for (const r of rows) { const [a, b] = r.length === 1 ? [r[0], r[0]] : r, n = Math.max(0, Math.round((b - a) / (o.pitch || .508))); for (let k = 0; k <= n; k++) { const x = n ? lerp(a, b, k / n) : a; if (!o.skip?.(x, sd)) list.push([x, Y, sd, w, h]); } } wins(P, c, list, { seal: o.seal, r: o.r ?? Math.min(w, h) * .38, frame: o.frame ?? .02, frameC: o.frameC || '#c5c9cc', reveal: o.reveal || 'rgba(90,96,102,.3)', glass: o.glass, lit: o.lit }); }
function cockpit(P, c, sd, panes, o = {}) {
  const { Lc, Ln, Lo } = c, ppm = P.ppm(Lc);
  for (const pts of panes) {
    const g = Lc.g, fw = (o.fw ?? .09) * ppm; P.path(Lc, pts, sd); g.lineJoin = 'round';
    if (o.rv) { g.strokeStyle = 'rgba(38,42,46,.75)'; g.lineWidth = fw + .025 * ppm; g.stroke(); }
    g.strokeStyle = o.frame || '#d4d7d8'; g.lineWidth = fw; g.stroke();
    if (o.rv) for (const k of [.78, .48]) { g.save(); g.setLineDash([.014 * ppm, .05 * ppm]); g.strokeStyle = 'rgba(62,66,70,.85)'; g.lineWidth = fw * k; g.stroke(); g.restore(); g.strokeStyle = o.frame; g.lineWidth = fw * (k - .14); g.stroke(); }
    g.fillStyle = o.glass || '#10151a'; g.fill(); g.strokeStyle = 'rgba(25,28,32,.85)'; g.lineWidth = .03 * ppm; g.stroke();
    P.path(Lo, pts, sd); Lo.g.fillStyle = ORM(.03, 0); Lo.g.fill(); Lo.g.strokeStyle = ORM(o.fm ? .34 : .35, o.fm ?? 0); Lo.g.lineWidth = (o.rv ? o.fw * .9 : .07) * ppm * Lo.W / Lc.W; Lo.g.stroke();
    P.path(Ln, pts, sd); Ln.g.fillStyle = N0; Ln.g.fill(); groove(Ln, P.path(Ln, pts, sd), .6, Math.max(1, .025 * ppm * Ln.W / Lc.W));
  }
}
function bandsOf(P, c, sd, bands) { for (const b of bands) { const [top, bot, col, x0 = 0, x1 = P.H.X1, m] = b; P.band(c.Lc, sd, x0, x1, top, bot, col); if (m) P.band(c.Lo, sd, x0, x1, top, bot, ORM(m[0], m[1])); } }
function jetLiv(o) {
  return {
    hull(P, c, ph) {
      const { H } = c;
      if (ph === 'pre') {
        const mb = (o.bands || []).filter((b) => b[5] && b[5][1] > .8), fy = (f, x) => (typeof f === 'function' ? f(x) : f);
        if (mb.length) P.ampAt = (x, s) => { const Y = H.yAt(x, s); if (o.noAmp && o.noAmp(x, Y)) return 1; return mb.some(([top, , , x0 = 0, x1 = H.X1]) => x >= x0 && x <= x1 && Y < fy(top, x)) ? (o.metalAmp ?? 3) : 1; };
        both((sd) => {
          if (o.cap && o.cap[4]) noseCap(P, c, sd, ...o.cap);
          bandsOf(P, c, sd, o.bands || []);
          if (o.radome) P.band(c.Lc, sd, 0, o.radome[0], 99, -99, o.radome[1]);
          if (o.pre) o.pre(P, c, sd);
          if (o.cap && !o.cap[4]) noseCap(P, c, sd, ...o.cap);
        });
        return;
      }
      rowWin(P, c, o.win.rows, o.win.Y, o.win.w, o.win.h, { seal: 1, frame: .028, pitch: o.win.pitch, frameC: o.win.frameC, reveal: o.win.reveal, skip: (x) => (o.doors || []).some(([dx, , , w = 1.07]) => Math.abs(x - dx) < w / 2 + .12) });
      if (o.win2) rowWin(P, c, o.win2.rows, o.win2.Y, o.win2.w, o.win2.h, { seal: 1, frame: .028, pitch: o.win2.pitch, frameC: o.win2.frameC, skip: (x) => (o.win2.plug || []).some((px) => Math.abs(px - x) < .1) });
      both((sd) => {
        for (const [x, sill, h, w = 1.07, flat] of o.doors || []) paintedDoor(P, c.Lc, c.Ln, c.Lo, x, sill, sd, w, h, { flat, port: w > .8, r: w > .8 ? .17 : .1, jet: 1, hinge: w > .8, grab: w > .8 });
        for (const x of o.win2?.plug || []) P.local(c.Lc, x, o.win2.Y, sd, (g) => { rr(g, -o.win2.w / 2, -o.win2.h / 2, o.win2.w, o.win2.h, .08); g.strokeStyle = 'rgba(120,126,130,.5)'; g.lineWidth = .014; g.stroke(); });
        if (sd > 0) for (const [x, w, h] of o.cargo || []) paintedDoor(P, c.Lc, c.Ln, c.Lo, x, H.keel(x) + .55, sd, w, h, { r: .12, lw: .02, c: 'rgba(34,38,42,.78)', jet: 1 });
        cockpit(P, c, sd, o.cock, o.cockO);
        if (o.wiper) P.local(c.Lc, o.wiper[0], o.wiper[1], sd, (g) => { g.lineCap = 'round'; g.strokeStyle = '#1b1e21'; g.lineWidth = .032; g.beginPath(); g.moveTo(.32, -.03); g.lineTo(-.52, .06); g.stroke(); g.lineWidth = .016; g.beginPath(); g.moveTo(.2, .015); g.lineTo(-.62, .1); g.stroke(); g.fillStyle = '#2b2e31'; g.beginPath(); g.arc(.34, -.035, .045, 0, 7); g.fill(); });
        for (const [x, y] of o.det?.pitot || []) P.local(c.Lc, x, y, sd, (g) => { g.fillStyle = '#7d8286'; g.fillRect(-.06, -.015, .12, .03); });
        for (const x of (o.doors || []).filter((d) => (d[3] ?? 1.07) > .8).map((d) => d[0])) P.local(c.Lc, x - .38, (o.doors.find((d) => d[0] === x)[1]) - .2, sd, (g) => { g.fillStyle = 'rgba(70,74,80,.55)'; g.fillRect(-.05, -.02, .1, .04); });
        P.band(c.Lc, sd, H.X1 - 1.6, H.X1, 9, -9, 'rgba(40,36,32,.16)'); P.band(c.Lc, sd, H.X1 - .7, H.X1, 9, -9, 'rgba(30,28,25,.22)');
        if (o.post) o.post(P, c, sd);
      });
      grime(P, c.Lc, c.sp, { r: c.r, jet: 1, belly: .08, streaks: 20, FF: c.FF, soot: o.soot }); jetDirt(P, c, { root: wingRoot(c.sp), winY: o.win.Y, doors: o.doors }); jetWeather(P, c, wingRoot(c.sp)); gearMarks(P, c);
    },
    reg(P, c, kind) { if (kind === 'hull' && o.reg) both((sd) => P.text(c.Lc, c.reg, o.reg[0], o.reg[1], sd, o.reg[2], o.reg[3])); }, regAt: () => o.reg && { x: o.reg[0], Y: o.reg[1], h: o.reg[2] },
    fin: o.fin, stab: o.stab, wing(c) { walkway(c); o.wing?.(c); }, extra(ctx) { jetDetails(ctx, o.det || {}); if (o.extra) o.extra(ctx); },
  };
}
function walkway({ R, b, h, Lc, Ln, Lo, sp, def, r }) {
  const s0 = sp.dia / 2 + .25, ws = [...new Set(sp.engines.filter((e) => e.mount !== 'fin').map((e) => Math.abs(e.w)))].sort((a, c) => a - c), se = ws[0], s1 = se - 1, pu = Lc.W / (R.s1 - R.s0) * (R.u1 - R.u0), pv = (R.v1 - R.v0) / (R.x1 - R.x0) * Lc.H, g = Lc.g, k = Ln.W / Lc.W;
  const blob = (s, f, a, bb, col, L = Lc, rot = 0) => { const [x, y] = h.at(s, f), q2 = L.W / Lc.W, G = L.g; G.save(); G.translate(x * q2, y * q2); G.rotate(rot); G.scale(a * pu * q2, bb * pv * q2); const q = G.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, col); q.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); G.fillStyle = q; G.fillRect(-1, -1, 2, 2); G.restore(); };
  const streak = (s, f0, f1, w, a, col = '52,47,40') => { const [x0, y0] = h.at(s, f0), [x1, y1] = h.at(s + (r() - .5) * .3, f1), q = g.createLinearGradient(x0, y0, x1, y1); q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(.35, `rgba(${col},${a * .8})`); q.addColorStop(1, `rgba(${col},0)`); g.beginPath(); for (const [ss, ff] of [[s - w * .4, f0], [s + w * .4, f0], [s + w / 2 + .1, f1], [s - w / 2 - .1, f1]]) g.lineTo(...h.at(ss, ff)); g.closePath(); g.fillStyle = q; g.fill(); };
  if (b % 2) {
    const pn = new Path2D(); for (let s = s0 + 1; s < R.s1 - 2; s += 1.6) { const [x, y] = h.at(s, .36); pn.ellipse(x, y, .24 * pu, .16 * pv, 0, 0, 7); pn.moveTo(x + .3 * pu, y); }
    g.lineWidth = Math.max(1.5, pu * .012); g.strokeStyle = 'rgba(60,66,72,.5)'; g.stroke(pn); const pN = new Path2D(); pN.addPath(pn, new DOMMatrix([k, 0, 0, k, 0, 0])); groove(Ln, pN, .5, 1);
    for (const e of ws) { for (let i = 0; i < 5; i++) streak(e + (r() - .5) * 1.4, .45 + .1 * r(), 1.08, .5 + .6 * r(), .16 + .12 * r(), '40,36,30'); blob(e, .75, 1.6, 2.2, 'rgba(40,36,30,.12)'); }
    for (let i = 0; i < 4; i++) streak(s0 + 1.5 * r(), .5 + .2 * r(), 1.08, .4 + .5 * r(), .12 + .1 * r(), '48,42,34');
    return;
  }
  h.regionPoly(Lc, .16, .4, s0, s1); g.fillStyle = 'rgba(64,68,72,.2)'; g.fill(); h.regionPoly(Lo, .16, .4, s0, s1); Lo.g.fillStyle = 'rgba(0,255,0,.25)'; Lo.g.fill();
  segs(Lc, [h.cP(Lc, .16, s0, s1), h.cP(Lc, .4, s0, s1), [h.at(s1, .16), h.at(s1, .4)], [h.at(s0, .16), h.at(s0, .4)]], Math.max(2, pu * .05), 'rgba(20,22,25,.8)');
  const ap = new Path2D(); for (const [f, w, d, st] of [[.11, .5, .22, 2.3], [.66, .7, .3, 1.9], [.82, .45, .25, 3.1]]) for (let s = s0 + .8 + r(); s < R.s1 - 2.5; s += st * (.8 + .4 * r())) { const [x, y] = h.at(s, f); rr(ap, x - w / 2 * pu, y - d / 2 * pv, w * pu, d * pv, 3); }
  g.fillStyle = 'rgba(70,74,80,.07)'; g.fill(ap); g.lineWidth = Math.max(1.2, pu * .008); g.strokeStyle = 'rgba(40,44,50,.3)'; g.stroke(ap); const aN = new Path2D(); aN.addPath(ap, new DOMMatrix([k, 0, 0, k, 0, 0])); groove(Ln, aN, .45, 1);
  for (let i = 0; i < 50; i++) blob(lerp(s0 + .2, s1 - .2, r()), lerp(.18, .38, r()), .08 + .25 * r(), .05 + .15 * r(), `rgba(70,70,66,${(.05 + .08 * r()).toFixed(3)})`);
  for (const e of ws) { for (let i = 0; i < 4; i++) streak(e + (r() - .5) * 1.2, .5 + .15 * r(), 1.06, .35 + .5 * r(), .1 + .1 * r()); blob(e, .82, 1.3, 1.6, 'rgba(56,50,42,.1)'); }
  for (let i = 0; i < 6; i++) streak(s0 + 2.2 * r(), .55 + .2 * r(), 1.06, .3 + .5 * r(), .1 + .12 * r(), '58,52,44');
  blob(s0 + .6, .8, 1.4, 1.2, 'rgba(58,52,44,.14)');
  for (let i = 0; i < 26; i++) { const s = lerp(s0, R.s1 - 2, r()), f = lerp(.5, .8, r()); blob(s, f + .08, .02 + .03 * r(), .3 + .5 * r(), `rgba(60,58,52,${(.05 + .07 * r()).toFixed(3)})`); }
}
const wingRoot = (sp) => { const p = sp.wing.pf[0]; return [p[1] + (p[2] - p[1]) * .35, p[2] + 2.5]; };
function jetDirt(P, c, o = {}) {
  const { Lc, Lo, H, r } = c, X1 = H.X1, hf = (f) => (x) => H.keel(x) + (H.crown(x) - H.keel(x)) * f;
  both((sd) => {
    for (let k = 0; k < 56; k++) { const x = r() * X1, y = lerp(H.keel(x) + .3, H.crown(x), .45 * r()), rad = .5 + 1.4 * r(), a = .02 + .03 * r(), dark = r() < .75, col = dark ? '72,68,60' : '255,255,255'; P.local(Lc, x, y, sd, (g) => { g.scale(2, .7); const q = g.createRadialGradient(0, 0, 0, 0, 0, rad); q.addColorStop(0, `rgba(${col},${a})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(-rad, -rad, 2 * rad, 2 * rad); }); }
    for (let k = 0; k < 38; k++) { const x0 = X1 * (.06 + .86 * r()), y0 = hf(.2 + .55 * r())(x0), ln = 1.2 + 5 * r(), dy = -(.25 + .7 * r()), w = .03 + .05 * r(), a = (.06 + .09 * r()).toFixed(3); P.band(Lc, sd, x0, x0 + ln, (x) => y0 + dy * (x - x0) / ln + w * (1 - .6 * (x - x0) / ln), (x) => y0 + dy * (x - x0) / ln - w * .3, `rgba(60,56,48,${a})`, ln / 6); }
    if (o.root) { const [xa, xb] = o.root; for (const [f, a] of [[1, .07], [.65, .08], [.35, .1]]) P.band(Lc, sd, xa + (xb - xa) * (1 - f) * .3, xb, (x) => hf(.34 + .08 * f)(x), -99, `rgba(60,54,46,${a})`, .4); P.band(Lo, sd, xa, xb, hf(.3), -99, 'rgba(0,255,0,.08)', .5); }
    const soft = (L, x, y, rx, ry, rot, col) => P.local(L, x, y, sd, (g) => { g.rotate(rot); g.scale(rx, ry); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, col); q.addColorStop(.55, col.replace(/[\d.]+\)$/, (m) => `${+m.slice(0, -1) * .45})`)); q.addColorStop(1, col.replace(/[\d.]+\)$/, '0)')); g.fillStyle = q; g.fillRect(-1, -1, 2, 2); });
    for (let k = 0; k < 80; k++) { const x = r() * X1, f = .5 * r(), y = lerp(H.keel(x), H.crown(x), f), rx = 1.5 + 4 * r(), ry = .4 + 1 * r(), rot = (r() - .5) * .25, dk = r() < .62 - .3 * f; soft(Lc, x, y, rx, ry, rot, dk ? `rgba(92,86,74,${(.04 + .07 * (1 - f) * r()).toFixed(3)})` : `rgba(255,255,250,${(.03 + .04 * r()).toFixed(3)})`); soft(Lo, x, y, rx * 1.2, ry * 1.2, rot, dk ? `rgba(0,255,0,${(.06 + .1 * r()).toFixed(3)})` : `rgba(0,0,0,${(.05 + .08 * r()).toFixed(3)})`); }
    if (o.winY != null) for (let k = 0; k < 70; k++) { const x0 = X1 * (.08 + .8 * r()), y0 = o.winY - .22 - .1 * r(), ln = .5 + 1.6 * r(), dy = -(.08 + .3 * r()), w = .012 + .02 * r(); P.band(Lc, sd, x0, x0 + ln, (x) => y0 + dy * (x - x0) / ln + w, (x) => y0 + dy * (x - x0) / ln - w * .4, `rgba(70,64,54,${(.05 + .07 * r()).toFixed(3)})`, ln / 4); }
    for (const [x, sill, h, w = 1.07] of o.doors || []) for (let k = 0; k < 3; k++) { const x0 = x + w / 2 - .1 + .15 * k, y0 = sill + .05 + (k === 2 ? h * .5 : 0), ln = 1.2 + 2.2 * r(), dy = -(.2 + .5 * r()), ww = .03 + .04 * r(); P.band(Lc, sd, x0, x0 + ln, (x2) => y0 + dy * (x2 - x0) / ln + ww * (1 - .5 * (x2 - x0) / ln), (x2) => y0 + dy * (x2 - x0) / ln - ww * .3, `rgba(74,62,48,${(.06 + .06 * r()).toFixed(3)})`, ln / 5); }
    const xo = X1 * (.66 + .04 * r()), yo = hf(.2)(xo), lo = 4 + 5 * r(); for (const [f, a] of [[1, .07], [.6, .09], [.3, .12]]) P.band(Lc, sd, xo, xo + lo * f, (x) => yo + .12 + .25 * (x - xo) / lo, (x) => yo - .1 - .45 * (x - xo) / lo, `rgba(104,82,54,${a})`, lo / 6);
    const [ra, rb] = o.root || [X1 * .38, X1 * .52], blot = (x, y, rx, ry, col, a) => P.local(Lc, x, y, sd, (g) => { g.scale(rx, ry); const q = g.createRadialGradient(0, 0, 0, 0, 0, 1); q.addColorStop(0, `rgba(${col},${a.toFixed(3)})`); q.addColorStop(.6, `rgba(${col},${(a * .4).toFixed(3)})`); q.addColorStop(1, `rgba(${col},0)`); g.fillStyle = q; g.fillRect(-1, -1, 2, 2); });
    for (let k = 0; k < 7; k++) { const f = k / 6; P.band(Lc, sd, lerp(ra, rb, .4) + f * 4, X1 * .985, (x) => hf(lerp(.2, .42, sm(rb, X1, x)) - f * .12)(x), -99, 'rgba(92,84,70,.038)', .5); P.band(Lo, sd, lerp(ra, rb, .4) + f * 4, X1 * .985, (x) => hf(lerp(.2, .42, sm(rb, X1, x)) - f * .12)(x), -99, 'rgba(0,255,0,.03)', .5); }
    for (let k = 0; k < 34; k++) { const x0 = X1 * (.05 + .9 * r()), w = .04 + .08 * r(), y0 = hf(.97)(x0), y1 = hf(.62 + .25 * r())(x0), a = .012 + .014 * r(); for (const f of [1, .6, .3]) P.band(Lc, sd, x0, x0 + w, y0, lerp(y0, y1, f), `rgba(96,90,78,${a.toFixed(3)})`, w); }
    for (let k = 0; k < 22; k++) { const x = X1 * (.08 + .86 * r()), f = .42 * r(); blot(x, lerp(H.keel(x), H.crown(x), f), 1.2 + 2.4 * r(), .5 + 1 * r(), r() < .7 ? '104,96,82' : '230,232,236', .03 + .04 * r()); }
    for (const [f, a] of [[1, .1], [.55, .14], [.25, .2]]) P.band(Lc, sd, X1 - 3.4 * f, X1, 99, -99, `rgba(34,30,26,${a})`, .2);
    for (let k = 0; k < 9; k++) { const x0 = X1 - 1.5 - 2.5 * r(), yy = hf(.45 + .45 * r())(x0), ln = X1 - x0; P.band(Lc, sd, x0, X1, yy + .05 + .1 * r(), yy - .05, `rgba(30,27,23,${(.06 + .08 * r()).toFixed(3)})`, ln / 4); }
  });
}
function jetWeather(P, c, [ra, rb]) {
  const { Lc, Lo, H } = c, X1 = H.X1, U = H.U, r = rng(X1 * 131 | 0), ls = [[Lc, 1], [Lo, 0]];
  const q = (L, x, s, sd) => [x / X1 * U * L.W, (sd > 0 ? s / 2 : 1 - s / 2) * L.H];
  const A = (x) => sm(X1 * .1, ra - 1, x) * lerp(1, .55, sm(rb + 4, X1 * .97, x));
  for (const [L, cl] of ls) for (const sd of [1, -1]) for (let x = 0; x < X1; x += .5) {
    const a = A(x + .25), s0 = .6 - .06 * Math.sin(x * .7) - .08 * a; if (a < .01) continue;
    const [px, y0] = q(L, x, s0, sd), y1 = q(L, x, 1, sd)[1], g = L.g, gr = g.createLinearGradient(0, y0, 0, y1);
    gr.addColorStop(0, cl ? 'rgba(86,78,64,0)' : 'rgba(0,255,0,0)'); gr.addColorStop(.55, cl ? `rgba(86,78,64,${(.17 * a).toFixed(3)})` : `rgba(0,255,0,${(.2 * a).toFixed(3)})`); gr.addColorStop(1, cl ? `rgba(78,70,56,${(.32 * a).toFixed(3)})` : `rgba(0,255,0,${(.35 * a).toFixed(3)})`);
    g.fillStyle = gr; g.fillRect(px, Math.min(y0, y1), Math.ceil(.5 / X1 * U * L.W) + 1, Math.abs(y1 - y0));
  }
  const streak = (L, sd, x0, s0, ln, ds, w, col, a) => { const g = L.g, p0 = q(L, x0, s0, sd), p1 = q(L, x0 + ln, s0 - ds, sd), gr = g.createLinearGradient(...p0, ...p1); gr.addColorStop(0, `rgba(${col},${a})`); gr.addColorStop(.3, `rgba(${col},${(a * .8).toFixed(3)})`); gr.addColorStop(1, `rgba(${col},0)`); g.beginPath(); for (const [x, ss] of [[x0, s0 - w * .5], [x0 + ln * .3, s0 - ds * .3 - w], [x0 + ln, s0 - ds - w * 1.4], [x0 + ln, s0 - ds + w * 1.4], [x0 + ln * .3, s0 - ds * .3 + w], [x0, s0 + w * .5]]) g.lineTo(...q(L, x, ss, sd)); g.closePath(); g.fillStyle = gr; g.fill(); };
  for (const sd of [1, -1]) for (let k = 0; k < 90; k++) {
    const x0 = lerp(ra - 4, X1 * .9, r() ** 1.2), s0 = .66 + .33 * r(), ln = 2 + 9 * r(), ds = (.03 + .12 * r()) * (s0 > .9 ? .5 : 1), w = .004 + .014 * r(), a = (.07 + .12 * r()) * (.5 + A(x0)), col = r() < .7 ? '70,62,50' : '104,96,84';
    streak(Lc, sd, x0, s0, ln, ds, w, col, a.toFixed(3)); streak(Lo, sd, x0, s0, ln, ds, w, '0,255,0', (a * 1.2).toFixed(3));
  }
  for (let k = 0; k < 16; k++) {
    const x = lerp(ra - 1, rb + 6, r()), w = .02 + .05 * r(), ln = 1.5 + 3 * r(), a = .07 + .1 * r();
    for (const [L, cl] of ls) { const g = L.g, [px, py] = q(L, x, 1, 1), sx = ln / X1 * U * L.W, sy = w * L.H; g.save(); g.translate(px + sx * .4, py); g.scale(sx, sy); const gr = g.createRadialGradient(0, 0, 0, 0, 0, 1); gr.addColorStop(0, cl ? `rgba(62,54,42,${a.toFixed(3)})` : `rgba(0,255,0,${(a * 1.5).toFixed(3)})`); gr.addColorStop(1, cl ? 'rgba(62,54,42,0)' : 'rgba(0,255,0,0)'); g.fillStyle = gr; g.fillRect(-1, -1, 2, 2); g.restore(); }
  }
  for (const sd of [1, -1]) for (let k = 0; k < 90; k++) {
    const x0 = lerp(.5, X1 - 2, r()), ln = .6 + 1.8 * r(), s0 = .04 + .5 * r(), sh = .015 + .035 * r(), lt = r() < .45, a = (lt ? .03 + .03 * r() : .018 + .022 * r()).toFixed(3), g = Lc.g, p0 = q(Lc, x0, s0, sd), p1 = q(Lc, x0 + ln, s0 + sh, sd);
    g.fillStyle = lt ? `rgba(255,253,246,${a})` : `rgba(120,124,128,${a})`; g.fillRect(Math.min(p0[0], p1[0]), Math.min(p0[1], p1[1]), Math.abs(p1[0] - p0[0]), Math.abs(p1[1] - p0[1]));
  }
}
function noseCap(P, c, sd, Yc, R, col, m) {
  const pts = []; for (let k = 0; k <= 16; k++) { const a = k / 16 * Math.PI; pts.push({ Y: Yc + R * Math.cos(a), Z: Math.max(.002, R * Math.sin(a)) }); }
  for (let k = 1; k < 16; k++) pts.push({ Y: Yc - R + 2 * R * k / 16, Z: .002 });
  P.path(c.Lc, pts, sd); c.Lc.g.fillStyle = col; c.Lc.g.fill();
  if (m) { P.path(c.Lo, pts, sd); c.Lo.g.fillStyle = ORM(m[0], m[1]); c.Lo.g.fill(); }
}
function jetDetails({ K, T, sp, B, add, mat, std, parts, F, H, wd, chromeM }, d) {
  const sx = sp.splits || [sp.length * .3, sp.length * .62], part = (x) => parts[x < sx[0] ? 'nose' : x < sx[1] ? 'mid' : 'aft'];
  const am = mat('ant', () => std(T, { color: d.antC ?? 0xeef0f0, roughness: .35, metalness: 0 })), wm = mat('wick', () => std(T, { color: 0x2a2c2e, roughness: .5, metalness: .4 })), bm = mat('antB', () => std(T, { color: d.antB ?? 0x9a9ea2, roughness: .4, metalness: .6 }));
  const blade = K.g('blade', () => { const sh = new THREE.Shape([new THREE.Vector2(.18, 0), new THREE.Vector2(-.18, 0), new THREE.Vector2(-.3, .42), new THREE.Vector2(-.18, .45)]); return new THREE.ExtrudeGeometry(sh, { depth: .025, bevelEnabled: false }).translate(0, 0, -.0125); });
  for (const [x, top, sc = 1] of d.ant || []) { const ms = add(part(x), blade, top ? am : bm, { p: B(x, top ? F.sec(x).cr - .02 : F.sec(x).kl + .02, 0), q: top ? null : QE(Math.PI, 0, 0) }); ms.scale.set(sc, sc, 1); }
  if (d.satc) add(part(d.satc[0]), K.g('satc', () => new THREE.SphereGeometry(1, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2).scale(d.satc[1], .22, .5)), am, { p: B(d.satc[0], F.sec(d.satc[0]).cr - .03, 0) });
  const pit = K.g('pitot', () => merge([[cyl(.014, .011, .1, 6).rotateX(Math.PI / 2)], [cyl(.009, .009, .14, 6).rotateZ(Math.PI / 2).translate(.07, 0, .1)]]));
  for (const sd of [1, -1]) for (const [x, y] of d.pitot || []) add(part(x), pit, chromeM, { p: B(x, y, H.zAt(x, H.sY(x, y)) * sd), noShadow: true }).scale.z = sd;
  const wick = K.g('wick', () => cyl(.006, .004, .28, 5).rotateZ(Math.PI / 2 + .1));
  for (const sd of [1, -1]) for (const s0 of d.wick || []) { const q = wd.at(s0), p = q.p.clone().addScaledVector(q.dir, q.c * .98); p.z *= sd; add(parts.wings, wick, wm, { p, noShadow: true }); }
}
const cockJet = (x0, x1, x2, x3, sill0, sill1, top, vee = 0, dip = 0) => [
  [{ S: .008, Y: sill0 + vee }, ...(dip ? [{ x: lerp(x0, x1 - .45, .5), Y: sill0 - dip }] : []), { x: x1 - .45, Y: sill0 }, { x: x1, Y: sill0 + (sill1 - sill0) * .3 }, { x: x1 - .08, Y: top }, { S: .008, Y: top }],
  [{ x: x1 + .06, Y: sill0 + (sill1 - sill0) * .35 }, { x: x2, Y: sill0 + (sill1 - sill0) * .7 }, { x: x2 - .04, Y: top + .01 }, { x: x1 + .02, Y: top }],
  [{ x: x2 + .06, Y: sill0 + (sill1 - sill0) * .75 }, { x: x3 - .25, Y: sill1 }, { x: x3, Y: top + .01 }, { x: x2 + .04, Y: top + .01 }],
];
function crane(Lc, R, s, x, rad) {
  const [cx, cy] = R.px(s, x), pu = (R.u1 - R.u0) / (R.s1 - R.s0) * Lc.W, pv = (R.v1 - R.v0) / (R.x1 - R.x0) * Lc.H, g = Lc.g;
  g.save(); g.setTransform(0, pv * rad, pu * rad, 0, cx, cy); g.beginPath(); g.arc(0, 0, 1, 0, 7); g.fillStyle = '#c8161e'; g.fill(); g.restore();
}
function tabP(R, Lc, Ln, s0, s1, x0, x1) { for (const [L, w, col] of [[Lc, 2.6, 'rgba(6,8,14,.7)'], [Ln, 1.4, NRM(.45, .45)]]) { const k = L.W / Lc.W, g = L.g, P = (s, x) => R.px(s, x).map((v) => v * k), sm2 = (s0 + s1) / 2; g.beginPath(); for (const [s, x] of [[s0, x1 + .1], [s0, x0], [s1, x0], [s1, x1 + .1]]) g.lineTo(...P(s, x)); g.moveTo(...P(sm2, x0 - .02)); g.lineTo(...P(sm2, x0 - .16)); g.strokeStyle = col; g.lineWidth = w; g.stroke(); } }
function finPoly(R, Lc, pts, col) { const g = Lc.g; g.beginPath(); for (const [s, x] of pts) g.lineTo(...R.px(s, x)); g.closePath(); g.fillStyle = col; g.fill(); }
function propLiv(o) {
  return {
    hull(P, c, ph) {
      if (ph === 'pre') { both((sd) => { bandsOf(P, c, sd, o.bands || []); if (o.pre) o.pre(P, c, sd); }); return; }
      wins(P, c, [1, -1].flatMap((sd) => (o.win || []).filter((q) => !q[4] || q[4] === sd).map(([x, Y, w, h]) => [x, Y, sd, w, h])), { r: .06, frame: .02, frameC: o.frameC || '#b9bec2' });
      both((sd) => { for (const [x, sill, h, w, sdOnly] of o.doors || []) if (!sdOnly || sdOnly === sd) paintedDoor(P, c.Lc, c.Ln, c.Lo, x, sill, sd, w, h, { r: .12, handle: true }); if (o.cock) cockpit(P, c, sd, o.cock, o.cockO); if (o.post) o.post(P, c, sd); });
      grime(P, c.Lc, c.sp, { r: c.r, belly: .05, belly2: .05, streaks: 10 });
    },
    reg(P, c, kind) { if (o.reg) o.reg(P, c, kind); }, regAt: o.regAt, regOn: o.regOn,
    fin: o.fin, stab: o.stab, wing: o.wing, extra: o.extra, wingReg: o.wingReg,
  };
}
function starXY(P, L, sd, cx, cy, r, bars, rot = 0) {
  const ring = (rad, n = 40) => Array.from({ length: n }, (_, k) => { const a = k / n * Math.PI * 2; return [cx + Math.cos(a) * rad, cy + Math.sin(a) * rad]; });
  P.poly(L, ring(r * 1.18), sd, '#2a3550');
  if (bars) { const bx = r * 2.3, by = r * .3, bw = r * .1; P.poly(L, [[cx - bx - bw, cy - by - bw], [cx + bx + bw, cy - by - bw], [cx + bx + bw, cy + by + bw], [cx - bx - bw, cy + by + bw]], sd, '#2a3550'); P.poly(L, [[cx - bx, cy - by], [cx + bx, cy - by], [cx + bx, cy + by], [cx - bx, cy + by]], sd, '#e8e6dc'); }
  P.poly(L, Array.from({ length: 10 }, (_, k) => { const a = Math.PI / 2 + k * Math.PI / 5 + rot, q = k % 2 ? r * .382 : r; return [cx + Math.cos(a) * q * (sd > 0 ? -1 : 1), cy + Math.sin(a) * q]; }), sd, '#e8e6dc');
}
function star(g, cx, cy, r, bars) { g.save(); g.translate(cx, cy); g.fillStyle = '#2a3550'; g.beginPath(); g.arc(0, 0, r * 1.18, 0, 7); g.fill(); if (bars) { g.fillStyle = '#e8e6dc'; g.fillRect(-r * 2.3, -r * .3, r * 4.6, r * .6); } g.fillStyle = '#e8e6dc'; g.beginPath(); for (let k = 0; k < 10; k++) { const a = -Math.PI / 2 + k * Math.PI / 5, q = k % 2 ? r * .38 : r; g.lineTo(Math.cos(a) * q, Math.sin(a) * q); } g.closePath(); g.fill(); g.restore(); }
function wheelWell(R, Lc, s, x, rw, rings, door) { const p = R.px(s, x), pu = (R.u1 - R.u0) / (R.s1 - R.s0) * Lc.W, pv = (R.v1 - R.v0) / (R.x1 - R.x0) * Lc.H, g = Lc.g; g.save(); g.setTransform(pu, 0, 0, pv, p[0], p[1]); g.lineWidth = .022; g.strokeStyle = 'rgba(20,22,24,.5)'; if (door) { rr(g, door[0] - s, door[2] - x, door[1] - door[0], door[3] - door[2], .1); g.stroke(); } g.beginPath(); g.arc(0, 0, rw * 1.08, 0, 7); g.stroke(); for (const [c, r] of rings) { g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = c; g.fill(); } g.restore(); }
function wingStar(R, Lc, s, def, rad, bars) { const p = R.px(s, def.fx(s) + def.fc(s) * .45), pu = (R.u1 - R.u0) / (R.s1 - R.s0) * Lc.W, pv = (R.v1 - R.v0) / (R.x1 - R.x0) * Lc.H, g = Lc.g; g.save(); g.setTransform(pu, 0, 0, pv, p[0], p[1]); star(g, 0, 0, rad, bars); g.restore(); }

const LIV = {

  b777: (() => {
    const f = (x) => sm(1.0, 3.8, x), rT = (x) => (x < 42 ? lerp(-.15, .11, f(x)) : lerp(.11, .19, sm(42, 49.5, x))), rB = (x) => (x < 42 ? -.16 : lerp(-.16, -1.0, sm(42, 49.5, x)) - (x > 49.5 ? (x - 49.5) * .3 : 0)), bB = (x) => (x < 42 ? lerp(-.17, -.49, f(x)) : lerp(-.49, -3.2, sm(42, 53, x)));
    return jetLiv({
      bands: [[bB, -9, '#8b8f94', 0, 53.2, [.34, 0]], [rT, rB, '#c8102e', .9, 63.7], [rB, bB, '#1a2766', .9, 53.2]],
      doors: [[6.5, -.55, 1.88], [16.9, -.55, 1.88], [36.2, -.55, 1.88], [49.5, -.5, 1.88]],
      win: { rows: [[7.8, 14.6], [15.4], [18.2, 34.6], [37.5, 47.6]], Y: .43, w: .28, h: .40, pitch: .53 }, cargo: [[11.6, 2.69, 1.70], [41.1, 1.78, 1.70]],
      cock: cockJet(1.55, 2.12, 2.6, 2.95, .32, .45, .9, .02, .07), cockO: { frame: '#3c4146', fw: .16, rv: 1 }, wiper: [1.95, .36], reg: [47.75, -.02, .2, '#f2f2f0'],
      det: { ant: [[18, 1], [46, 1], [8, 0], [11.5, 0], [33, 0]], satc: [47.8, 1.1], pitot: [[2.45, -.45], [2.75, -.62], [3.05, -.5]], wick: [24.5, 26, 27.5, 29, 30.2] },
    });
  })(),
  b747: (() => {
    const f = (x) => sm(2.2, 7.5, x), red = '#8a1426';
    return jetLiv({
      metalAmp: 4, soot: [44, 62], bands: [[-1.35, -9, '#d3d6d8', 0, 70.7, [.27, .88]], [(x) => lerp(-.3, .05, f(x)), (x) => lerp(-.32, -.55, f(x)), red, 2.2, 40], [(x) => lerp(-.32, -.8, f(x)), (x) => lerp(-.34, -1.35, f(x)), red, 2.2, 40]],
      noAmp: (x, Y) => x > 38.5 && x < 58 && Y > -4,
      pre(P, c, sd) { const H = c.H; P.band(c.Lc, sd, 39, 57.6, .05, (x) => (x < 42.5 ? lerp(-1.35, H.keel(x) - .1, sm(39, 42.5, x)) : x > 54.6 ? lerp(H.keel(x) - .1, .05, (x - 54.6) / 3) : -9), red); P.band(c.Lo, sd, 39, 57.6, .05, (x) => (x < 42.5 ? lerp(-1.35, H.keel(x) - .1, sm(39, 42.5, x)) : x > 54.6 ? lerp(H.keel(x) - .1, .05, (x - 54.6) / 3) : -9), ORM(.34, 0)); P.band(c.Lc, sd, 37.5, 50, (x) => lerp(-.55, -.675, sm(38, 50, x)), (x) => lerp(-.8, -.675, sm(38, 50, x)), '#f3f3f1'); },
      radome: [2.2, '#ebeceb'], doors: [[9.3, -.66, 1.93], [19.0, -.66, 1.93], [31.2, -.66, 1.93], [41.7, -.66, 1.93], [56.2, -.66, 1.93]],
      win: { rows: [[1.6, 8.0], [10.4], [13.6, 17.4], [20.5, 25.8], [26.9], [28.0], [29.1], [33.2, 39.9], [42.7, 55.1]], Y: .40, w: .25, h: .36 }, win2: { rows: [[12.0], [13.7], [15.4]], Y: 2.92, w: .23, h: .33 },
      cargo: [[15.4, 3.2, 1.7], [55.5, 3.0, 1.7]], cock: cockJet(4.9, 5.55, 6.0, 6.4, 2.86, 2.95, 3.38, .02, .08), cockO: { frame: '#b3b7ba', fw: .25, fm: .9, rv: 1 }, wiper: [5.3, 2.9], reg: [58, .35, .22, '#222'],
      det: { ant: [[13.5, 1], [34, 1], [10, 0], [46, 0]], pitot: [[3.7, -.3], [4.0, -.36], [4.3, -.3]], wick: [24, 25.6, 27.2, 28.8] },
      fin({ R, Lc, def }) { finPoly(R, Lc, [[.7, def.fx(.7) + def.fc(.7) * .12], [8.6, def.fx(8.6) + def.fc(8.6) * .12], [8.6, def.fx(8.6) + def.fc(8.6) - .4], [.7, def.fx(.7) + def.fc(.7) - .4]], red); },
    });
  })(),
  b747jal: jetLiv({
    bands: [[-.61, -9, '#8d9396', 0, 70.7, [.38, .35]], [.77, .34, '#b8311f', .3, 66.2], [.34, -.12, '#1f1c22', .3, 66.2]],
    cap: [-.05, .6, '#3a3d40', [.3, 0], 1], doors: [[9.3, -.66, 1.93], [19.0, -.66, 1.93], [31.2, -.66, 1.93], [41.7, -.66, 1.93], [56.2, -.66, 1.93]],
    win: { rows: [[1.6, 8.0], [9.9, 17.9], [20.0, 30.0], [32.4, 40.9], [42.4, 55.1]], Y: .40, w: .25, h: .36, frameC: '#55585c', reveal: 'rgba(20,20,22,.4)' }, win2: { rows: [[11.1, 15.67]], Y: 2.92, w: .23, h: .33, plug: [15.67] },
    cock: cockJet(4.9, 5.55, 6.0, 6.4, 2.86, 2.95, 3.38, .02, .08), cockO: { frame: '#b3b7ba', fw: .25, fm: .9, rv: 1 }, wiper: [5.3, 2.9], reg: [58, 1.0, .24, '#1a1a1c'],
    det: { ant: [[13.5, 1], [34, 1], [10, 0], [46, 0]], pitot: [[3.7, -.3], [4.0, -.36], [4.3, -.3]], wick: [24, 25.6, 27.2, 28.8] },
    fin({ R, Lc, def }) { const s = 5.9; crane(Lc, R, s, def.fx(s) + def.fc(s) * .47, 2.05); },
  }),
  b767: (() => {
    const k = 1.05, rho = 1.5, a0 = 45.85, ramp = (u) => (u < -rho ? 0 : u > rho ? k * u : k * (u + rho) ** 2 / (4 * rho)), E = (Y) => (x) => Y + ramp(x - a0 - .48 * (1.19 - Y)) - .04 * (1 - sm(1.2, 4, x));
    const red = '#741612', gold = '#a88554', xe = (Y, s) => a0 + .48 * (1.19 - Y) + (2.72 + s - Y) / k;
    return jetLiv({
      bands: [[(x) => E(1.19)(x) - .62 * (1 - sm(1.2, 2.45, x)), E(.29), red, 1.2, 54], [E(.09), E(-.31), gold, 1.2, 54, [.3, .55]]],
      doors: [[5.7, -.36, 1.88], [17.0, -.36, 1.88], [42.6, -.36, 1.88], [25.0, .30, .91, .51]],
      win: { rows: [[7.4, 13.5], [19.3], [20.4], [21.6], [22.1], [22.7], [23.3], [24.0], [25.6, 39.8]], Y: .74, w: .25, h: .33, frameC: '#a89c98' }, cargo: [[8.8, 1.75, 1.78], [38.4, 1.75, 1.78]],
      cock: cockJet(1.5, 2.1, 2.6, 3.05, .45, .6, 1.1, .02, .07), cockO: { frame: '#cdd0d1', fw: .2, rv: 1 }, wiper: [1.9, .5], reg: [40, 1.45, .24, '#26282c'],
      det: { ant: [[13, 1], [38, 1], [10, 0], [33, 0]], satc: [7.2, .7], pitot: [[2.4, -.3], [2.7, -.45], [3.0, -.6]], wick: [18.5, 20, 21.5, 22.8] },
      fin({ R, Lc, def }) {
        for (const [t, b, col] of [[1.19, .29, red], [.09, -.31, gold]]) finPoly(R, Lc, [[-.9, xe(t, -.9)], [8.8, xe(t, 8.8)], [8.8, xe(b, 8.8)], [-.9, xe(b, -.9)]], col);
        const s = 4.44, [cx, cy] = R.px(s, def.fx(s) + def.fc(s) * .55), pu = (R.u1 - R.u0) / (R.s1 - R.s0) * Lc.W, pv = (R.v1 - R.v0) / (R.x1 - R.x0) * Lc.H, g = Lc.g;
        for (const [rd, col] of [[1.1, '#7a5c32'], [1.02, '#f1efe8'], [.94, gold]]) { g.beginPath(); g.ellipse(cx, cy, rd * pu, rd * pv, 0, 0, 7); g.fillStyle = col; g.fill(); }
      },
    });
  })(),
  dc10: (() => {
    const tq = '#0b7482', bl = '#001c68', d = (x) => 1 - sm(.3, 4.4, x), Yf = (x) => 6.07 - (47.58 - x) * 1.02, Yb = (x) => Yf(x) - 1.05;
    return jetLiv({
      metalAmp: 4, soot: [36, 50], bands: [[(x) => -.57 - .25 * d(x), -9, '#c4c7c9', 0, 52.6, [.27, .88]], [(x) => 1.16 - 1.04 * d(x), (x) => .21 - .62 * d(x), tq, .2, 52.6], [(x) => -.02 - .5 * d(x), (x) => -.25 - .42 * d(x), bl, .2, 52.6],
        [(x) => Math.min(Yb(x), 9), -.57, bl, 41.5, 52.6], [(x) => Yf(x), (x) => Math.max(Yb(x), .21), tq, 42.4, 52.6]],
      noAmp: (x, Y) => x > 41.5 && Y > -.6,
      cap: [-.5, .63, '#0b0b0d', [.12, 0]], doors: [[5.1, -.30, 1.93], [15.05, -.30, 1.93], [27.25, -.30, 1.93], [43.25, -.30, 1.93]],
      win: { rows: [[6.5, 13.6], [17.2, 26.2], [28.5, 42.3]], Y: .72, w: .23, h: .36, frameC: '#a9c9cc' }, cargo: [[18.95, 2.7, 1.7], [39.95, 1.9, 1.7]],
      cock: cockJet(1.6, 2.2, 2.6, 3.35, .43, .5, 1.25, .1), cockO: { frame: '#aeb2b4', fw: .2, rv: 1 }, wiper: [2.0, .48], reg: [43, -.42, .2, '#16356b'],
      det: { ant: [[12.7, 1, 1.1], [42, 0], [9, 0]], pitot: [[3.2, -.5], [3.9, -.55], [4.6, -.5]], wick: [21, 22.4, 23.8, 24.9] },
      fin({ R, Lc, def }) { const LE = (s) => def.fx(s), wf = (s) => lerp(1.13, .38, s / 6.39), tw = (s) => lerp(.66, .32, s / 6.39); finPoly(R, Lc, [[-1, LE(-1) + wf(-1)], [6.05, LE(6.05) + wf(6.05)], [6.05, 60], [-1, 60]], bl); finPoly(R, Lc, [[-1, LE(-1) + wf(-1)], [6.05, LE(6.05) + wf(6.05)], [6.05, LE(6.05) + wf(6.05) + tw(6.05)], [-1, LE(-1) + wf(-1) + tw(-1)]], tq); finPoly(R, Lc, [[5.7, LE(5.7) + wf(5.7)], [6.05, LE(6.05) + wf(6.05)], [6.05, 60], [5.7, 60]], tq); finPoly(R, Lc, [[6.05, 40], [6.6, 40], [6.6, 60], [6.05, 60]], '#f4f4f0'); },
      extra({ K, T, B, add, mat, std, parts, sp, paint, F }) {
        const blk = mat('dcBlk', () => std(T, { color: '#f4f4f0', roughness: .3, metalness: 0, normalMap: tileN(K), normalScale: new THREE.Vector2(.2, .2) }, paint.ei ?? 1)), pym = mat('dcPy', () => std(T, { color: bl, roughness: .32, metalness: 0, normalMap: tileN(K), normalScale: new THREE.Vector2(.2, .2) }, paint.ei ?? 1));
        const prism = (pts, w, t0 = .7) => { const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(sp.length / 2 - x, y - (sp.y0 || 0)))); const g = new THREE.ExtrudeGeometry(sh, { depth: w, bevelEnabled: true, bevelThickness: w * .25, bevelSize: w * .2, bevelSegments: 2, curveSegments: 4 }); return g.translate(0, 0, -w / 2); };
        add(parts.fin, K.g('dcPylon', () => { const rows = [], N = 16; for (let i = 0; i <= N; i++) { const t = i / N, x = lerp(44.2, 50.6, t), th = Math.max(.004, .3 * 1.4 * (1.5 * Math.sqrt(t) - .5 * t) * (1 - t ** 3)), yb = F.sec(x).cr - .2 - (sp.y0 || 0), yt = 4.75 - .0524 * (x - 42.9) - 1.25 - (sp.y0 || 0), X = sp.length / 2 - x; rows.push([[X, yb, -th], [X, yt, -th], [X, yt, th], [X, yb, th], [X, yb, -th]]); } return sheet(rows, null, false); }), pym);
        add(parts.fin, K.g('dcBlock', () => prism([[52.2, 6.2], [55.95, 6.05], [56.0, 4.6], [53.2, 4.8], [51.8, 5.5]], .58)), blk);
      },
    });
  })(),
  lancastrian: (() => {
    const win = [[6.6, 1.85, .45, .5], [12.2, 1.85, .45, .5], [13.15, 1.85, .45, .5], [14.1, 1.85, .45, .5], [15.05, 1.85, .45, .5], [16.0, 1.85, .45, .5], [16.95, 1.85, .45, .5], [18.4, 1.85, .45, .5, 1]];
    return propLiv({
      win, doors: [[17.5, .6, 1.1, .7, 1]],
      wing({ R, b, Lc, def, r }) { if (b) return; const g = Lc.g; for (const e of [3.6, 7.8]) for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) { const s = e + sg * (.5 + .08 * r()), w = k ? .025 + .03 * r() : .09, x0 = def.fx(s) + .05, x1 = x0 + (k ? 1.6 + 1.8 * r() : 3.2), p0 = R.px(s, x0), p1 = R.px(s, x1), q = g.createLinearGradient(...p0, ...p1), a = k ? .18 + .14 * r() : .42; q.addColorStop(0, `rgba(38,34,30,${a})`); q.addColorStop(.4, `rgba(38,34,30,${a * .55})`); q.addColorStop(1, 'rgba(38,34,30,0)'); g.beginPath(); for (const [ss, xx] of [[s - w, x0], [s + w, x0], [s + w + sg * (.12 + .1 * r()), x1], [s - w + sg * .04, x1]]) g.lineTo(...R.px(ss, xx)); g.closePath(); g.fillStyle = q; g.fill(); } },
      extra(ctx) { aerial(ctx, 7.35, .55, .25); const { K, T, add, mat, std, parts, B, H } = ctx; add(parts.aft, K.g('tlamp', () => merge([[new THREE.SphereGeometry(.075, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2).scale(1, .7, 1).rotateZ(Math.PI / 2)], [new THREE.TorusGeometry(.078, .012, 6, 18).rotateY(Math.PI / 2)]])), mat('tlampM', () => std(T, { color: 0xe4eaee, roughness: .06, metalness: .6, emissive: 0xfff6e8, emissiveIntensity: .15 })), { p: B(22.655, 1.4, 0), noShadow: true }); add(parts.nose, K.g('stubN', () => cyl(.02, .012, .3, 6).rotateZ(Math.PI - .5)), mat('mastM', () => std(T, { color: 0x9a9ea2, roughness: .35, metalness: .9 })), { p: B(1.6, H.keel(1.6) + .03, 0) }); },
      regAt: () => ({ x: 15.2, Y: 1.5, h: 1.32, sx: .7 }), reg(P, c, kind) { if (kind !== 'hull') return; both((sd) => { P.text(c.Lc, c.reg, 15.2, 1.5, sd, 1.32, '#121416', undefined, 700, 'center', .7); for (const [x, Y, w, h, so] of win) if (!so || so === sd) P.local(c.Lc, x, Y, sd, (g) => { rr(g, -w / 2, -h / 2, w, h, .06); const q = g.createLinearGradient(0, h / 2, 0, -h / 2); q.addColorStop(0, '#3a4652'); q.addColorStop(.5, '#151b22'); q.addColorStop(1, '#0c1015'); g.fillStyle = q; g.fill(); g.strokeStyle = '#b9bec2'; g.lineWidth = .03; g.stroke(); }); }); },
    });
  })(),
  b24: propLiv({
    bands: [[(x) => .7 + sm(14, 20, x) * .9 + (1 - sm(0, 2.5, x)) * .45, -9, '#8c9094', 0, 21, [.55, 0]]],
    pre(P, c, sd) { odFade(P, c, sd, 20, 3.2); },
    cock: [[{ x: 3.0, Y: 2.68 }, { x: 3.42, Y: 2.62 }, { x: 3.42, Y: 3.06 }, { x: 3.2, Y: 3.1 }], [{ x: 3.48, Y: 2.62 }, { x: 3.9, Y: 2.62 }, { x: 3.9, Y: 3.04 }, { x: 3.48, Y: 3.06 }], [{ x: 3.95, Y: 2.62 }, { x: 4.35, Y: 2.62 }, { x: 4.35, Y: 3.0 }, { x: 3.95, Y: 3.04 }], [{ x: 1.12, Y: 1.88 }, { x: 1.28, Y: 1.88 }, { x: 1.28, Y: 2.18 }, { x: 1.12, Y: 2.18 }]], cockO: { frame: '#3f3d2a', fw: .05, fm: 0 },
    win: [[11.75, 2.0, .3, .3]],
    post(P, c, sd) {
      wins(P, c, [[13.98, 1.98, sd, .96, .6]], { r: .08, frame: .03, frameC: '#4a4733', glass: '#0b0c0a', glassT: '#24261f', glassB: '#060706', gR: .95, lit: false, reveal: 'rgba(20,20,14,.5)' });
      starXY(P, c.Lc, sd, 12.4, 1.8, .75, false); P.text(c.Lc, '64', 1.6, 1.55, sd, .6, '#e3e0d4', undefined, 700, 'center', .8);
      for (const x0 of [5.84, 8.6]) { const pts = [[x0, .44], [x0 + 2.72, .44], [x0 + 2.72, -1], [x0, -1]]; P.poly(c.Lc, pts, sd, null, ['rgba(25,25,20,.75)', .022 * P.ppm(c.Lc)]); for (let x = x0 + .12; x < x0 + 2.7; x += .12) { P.band(c.Lc, sd, x - .006, x + .006, .42, -9, 'rgba(30,30,26,.32)', 1); P.band(c.Ln, sd, x - .012, x, .42, -9, NRM(.35, 0), 1); P.band(c.Ln, sd, x, x + .012, .42, -9, NRM(-.35, 0), 1); } }
      for (let k = 0; k < 14; k++) { const x = 2 + c.r() * 16; P.band(c.Lc, sd, x, x + .015, 2.9, .9, `rgba(30,28,20,${.05 + .06 * c.r()})`, .5); }
    },
    regOn: ['fin'], reg(P, c, kind) { if (kind === 'fin') { const { TRf, fins } = c; fins.forEach((d, i) => { const right = d.fw(0) > 0, R = TRf[i][right ? 1 : 0], dx = right ? [0, -1] : [0, 1]; regText(c.Lc, R, (c.reg || '').replace('41-', '1'), 2.0, 18.4, .23, dx, [-1, 0], '#d6a12a', .82); }); } },
    wingReg: true, wing({ R, b, Lc, def }) { if (b === 2 || b === 1) wingStar(R, Lc, 13, def, .95, false); if (b % 2) wheelWell(R, Lc, 6.4, 7.95, .72, [['#2a2b2d', .72], ['#6d7072', .4], ['#3a3c3e', .12]]); },
    extra(ctx) {
      const { K, T, add, mat, std, parts, B, H, darkM, paint } = ctx; aerial(ctx, 11.2, .32, .2);
      for (const gz of [.12, -.14]) add(parts.nose, K.g('ngun', () => cyl(.016, .012, .7, 6).rotateZ(-Math.PI / 2 - .08)), darkM, { p: B(.25, 1.62 + gz * .4, gz) });
      const tm = mat('turbo', () => std(T, { color: 0x6c675e, roughness: .5, metalness: .75 }, .7));
      for (const e of ctx.sp.engines) add(parts.wings, K.g('turbo', () => merge([[new THREE.SphereGeometry(.3, 18, 10).scale(2.4, .85, 1)], [cyl(.09, .07, .4, 10).rotateZ(Math.PI / 2 + .1).translate(-.75, -.05, 0)]])), tm, { p: B(e.x + 3.05, e.h - .46, e.w) });
      const tc = B(19.95, 1.98, 0), fm = mat('ttM', () => std(T, { color: paint.frame, roughness: .6, metalness: 0 }, .8)), oct = (y, r) => new THREE.TorusGeometry(r, .028, 4, 8).rotateX(Math.PI / 2).rotateY(Math.PI / 8).translate(0, y, 0);
      add(parts.aft, K.g('ttFr', () => merge([[oct(-.36, .405)], [oct(0, .385)], [oct(.36, .365)], ...Array.from({ length: 8 }, (_, k) => [new THREE.BoxGeometry(.05, .74, .05), M4([Math.cos(k * Math.PI / 4 - Math.PI / 8) * .385, 0, Math.sin(k * Math.PI / 4 - Math.PI / 8) * .385])]), [new THREE.TorusGeometry(.365, .028, 4, 16, Math.PI).scale(1, .8, 1).translate(0, .36, 0)], [new THREE.TorusGeometry(.365, .028, 4, 16, Math.PI).rotateY(Math.PI / 2).scale(1, .8, 1).translate(0, .36, 0)], [new THREE.SphereGeometry(.41, 8, 3, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2).scale(1, .45, 1).translate(0, -.36, 0)]]).scale(1.12, 1, 1)), fm, { p: tc });
      add(parts.aft, K.g('ttIn', () => merge([[cyl(.3, .26, .6, 8).translate(0, -.32, 0)], [new THREE.BoxGeometry(.3, .16, .2).translate(-.1, .02, 0)]])), darkM, { p: tc });
      add(parts.aft, K.g('ttGl', () => merge([[new THREE.CylinderGeometry(.365, .405, .72, 8, 1, true).rotateY(Math.PI / 8)], [new THREE.SphereGeometry(.365, 8, 3, Math.PI / 8, Math.PI * 2, 0, Math.PI / 2).scale(1, .8, 1).translate(0, .36, 0)]]).scale(1.12, 1, 1)), mat('ttGlass', () => std(T, { color: 0x1c2226, roughness: .05, metalness: .1, transparent: true, opacity: .55 }, 1.6)), { p: tc, ro: 106 });
      for (const gz of [.12, -.12]) add(parts.aft, K.g('ttGun', () => cyl(.022, .016, .95, 6).rotateZ(Math.PI / 2)), darkM, { p: tc.clone().add(new V3(-.3, -.04, gz)) });
      for (const sd of [1, -1]) { const x = 14.0, Y = 2.05, z = H.zAt(x, H.sY(x, Y)); add(parts.aft, K.g('wgun', () => merge([[cyl(.022, .016, 1.05, 6).rotateX(Math.PI / 2).translate(0, 0, -.25)], [new THREE.BoxGeometry(.18, .12, .3).translate(0, 0, -.45)]])), darkM, { p: B(x, Y, sd * z), q: QE(0, sd * .35, 0) }).scale.z = sd; }
    },
  }),
  tbm: propLiv({
    bands: [[(x) => .55 + sm(9, 11.6, x) * .6 - (1 - sm(.65, 2, x)) * .1, -9, '#d3d6d6', 0, 12.5, [.34, 0]]],
    pre(P, c, sd) { for (const f of [1, .7, .45, .25]) P.band(c.Lc, sd, 1.82, 1.82 + 2.8 * f, (x) => .7 + .06 * (x - 1.82), (x) => .54 - .12 * (x - 1.82), 'rgba(42,38,34,.16)', .1); for (let k = 0; k < 9; k++) { const y = .5 + .14 * c.r(), x0 = 1.9 + .1 * c.r(); P.band(c.Lc, sd, x0, x0 + 1.5 + 2.5 * c.r(), y + .015, y - .015, `rgba(28,26,24,${.1 + .1 * c.r()})`, .1); } },
    post(P, c, sd) {
      starXY(P, c.Lc, sd, 8.3, 1.22, .48, true); P.poly(c.Lc, rrPts(7.96, .92, .74, .85, .15), sd, null, ['rgba(10,14,22,.85)', .015 * P.ppm(c.Lc)]); wins(P, c, [[7.35, 1.03, sd, .3, .46]], { r: .14, frame: .015, frameC: '#1d2639', lit: false }); wins(P, c, [[8.54, 1.01, sd, .32, .22]], { r: .1, frame: .012, frameC: '#1d2639', lit: false });
      for (let k = 0; k < 30; k++) { const x = 1 + 9 * c.r(), y = .6 + 1.4 * c.r(); P.local(c.Lc, x, y, sd, (g) => { g.fillStyle = `rgba(150,160,170,${.08 + .1 * c.r()})`; g.fillRect(0, 0, .02 + .06 * c.r(), .01 + .02 * c.r()); }); }
      P.band(c.Lc, sd, 2.05, 6.4, .385, .365, 'rgba(20,24,30,.55)', .2); P.band(c.Ln, sd, 2.05, 6.4, .39, .375, NRM(0, .5), .2); P.band(c.Ln, sd, 2.05, 6.4, .375, .36, NRM(0, -.5), .2);
      P.band(c.Lc, sd, 2.0, 6.5, .06, -9, 'rgba(60,62,60,.1)', .2);
    },
    regAt: () => ({ x: 10.55, Y: 1.25, h: .13 }), reg(P, c, kind) { if (kind === 'hull') both((sd) => P.text(c.Lc, c.reg || '', 10.55, 1.25, sd, .13, '#e2e4e4', undefined, 700, 'center', .85)); },
    fin({ R, Lc, Ln }) { tabP(R, Lc, Ln, -.5, .9, 11.93, 12.18); }, stab({ R, Lc, Ln }) { tabP(R, Lc, Ln, .6, 1.2, 12.19, 12.35); },
    wingReg: true, wing({ R, b, Lc, def, r }) { if (b === 2 || b === 1) wingStar(R, Lc, 6.2, def, .75, true); const g = Lc.g; if (b % 2) wheelWell(R, Lc, 2.95, 4.05, .44, [], [1.2, 3.42, 3.55, 4.52]); else for (let k = 0; k < 70; k++) { const p = R.px(.6 + 1.3 * r() ** 1.5, 3.0 + 1.6 * r()); g.fillStyle = `rgba(150,158,168,${(.12 + .2 * r()).toFixed(2)})`; g.fillRect(p[0], p[1], 1 + 4 * r(), 1 + 2 * r()); } g.beginPath(); for (const [z, x] of [[2.18, 2.8], [2.31, 4.48], [1.74, 4.88], [2.04, 6.55]]) g.lineTo(...R.px(z, x)); g.strokeStyle = 'rgba(8,10,16,.6)'; g.lineWidth = 3; g.stroke(); },
    extra(ctx) {
      const { K, T, add, mat, std, parts, B, F, H, paint, darkM, sp, hullM } = ctx;
      aerial(ctx, 4.11, .62, .19, [], 2.84);
      const L = sp.length, y0 = sp.y0, X1 = sp.hullLen;
      add(parts.aft, K.g('strake', () => {
        const rows = [], uvs = [], NF = 10, NC = 5, NX = 40;
        for (let i = 0; i <= NX; i++) {
          const x = lerp(7.64, 11.3, (1 - Math.cos(i / NX * Math.PI)) / 2), cr0 = H.crown(x), wm = sm(7.64, 8.3, x) * (x > 10.7 ? Math.sqrt(Math.max(0, 1 - ((x - 10.7) / .6) ** 2)) : 1);
          const top = Math.max(cr0, x < 7.76 ? lerp(H.crown(7.64), 2.11, (x - 7.64) / .12) : lerp(2.11, 2.29, clamp((x - 7.76) / 2.46, 0, 1)) - .12 * sm(10.8, 11.3, x));
          const wT = lerp(.012, .075, sm(7.8, 10.5, x)) * wm, zB = Math.min(.82 * H.zAt(x, H.sY(x, H.crown(x) - .3)), lerp(.1, .36, sm(7.7, 10.2, x))) * wm, sB = H.sZ(x, Math.max(zB, 1e-3)), yB = H.yAt(x, sB) - .012;
          const half = [], q = [];
          for (let k = 0; k < NF; k++) { const u = k / NF; half.push([yB + (top - wT - yB) * u, wT + (zB - wT) * (1 - u) ** 1.75]); }
          for (let j = 0; j <= NC; j++) { const a = j / NC * Math.PI / 2; half.push([top - wT + wT * Math.sin(a), wT * Math.cos(a)]); }
          let len = 0; half.forEach((p, k) => { if (k) len += Math.hypot(p[0] - half[k - 1][0], p[1] - half[k - 1][1]); q.push(len); });
          const row = [], ur = [], u0 = x / X1 * .995, put = (p, k, sd) => { row.push([L / 2 - x, p[0] - y0, sd * p[1]]); ur.push([u0, sB / 2 * (1 - q[k] / (len || 1))]); };
          for (let k = 0; k < half.length; k++) put(half[k], k, -1);
          for (let k = half.length - 2; k >= 0; k--) put(half[k], k, 1);
          rows.push(row); uvs.push(ur);
        }
        let g = sheet(rows, uvs, false); const c = (NF + NC), n = g.attributes.normal; if (n.getY(Math.floor(NX / 2) * (2 * c + 1) + c) < 0) { g.dispose(); g = sheet(rows, uvs, true); }
        return g;
      }), hullM);
      const tp = B(6.6, 2.34, 0), glass = mat('tGlass', () => std(T, { color: 0x1c2328, roughness: .04, metalness: .1, transparent: true, opacity: .5 }, 1.7)), frm = mat('tFrm', () => std(T, { color: paint.base, roughness: paint.rough, metalness: 0, normalMap: tileN(K), normalScale: new THREE.Vector2(.2, .2) }, paint.ei));
      const [gG, gM] = K.v('tSph', () => { const g = new THREE.SphereGeometry(.49, 36, 22), Pp = g.attributes.position, I = g.index.array, a = [], b = []; for (let t = 0; t < I.length; t += 3) { const v = [0, 1, 2].map((k) => new V3().fromBufferAttribute(Pp, I[t + k])).reduce((q, w) => q.add(w), new V3()).multiplyScalar(1 / 3 / .49); (v.x < -.12 && v.y < .55 ? b : a).push(I[t], I[t + 1], I[t + 2]); } const ga = g.clone(); ga.setIndex(a); g.setIndex(b); K.geos.push(ga, g); return [ga, g]; });
      add(parts.mid, gG, glass, { p: tp, ro: 106 }); add(parts.mid, gM, frm, { p: tp });
      add(parts.mid, K.g('tIn', () => merge([[new THREE.SphereGeometry(.43, 16, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2)], [new THREE.BoxGeometry(.12, .5, .34).translate(.18, .05, 0)], [new THREE.BoxGeometry(.4, .14, .12).translate(-.1, .1, .1)]])), darkM, { p: tp });
      add(parts.mid, K.g('tFrame', () => merge([[new THREE.TorusGeometry(.497, .034, 6, 40, Math.PI)], [new THREE.TorusGeometry(.5, .036, 6, 44).rotateX(Math.PI / 2).translate(0, -.02, 0)], [new THREE.TorusGeometry(.3, .03, 6, 32).translate(.02, .05, .39)], [new THREE.TorusGeometry(.3, .03, 6, 32).translate(.02, .05, -.39)], [cyl(.53, .5, .34, 36).translate(0, -.46, 0)], [new THREE.TorusGeometry(.515, .03, 6, 40).rotateX(Math.PI / 2).translate(0, -.12, 0)]])), frm, { p: tp });
      add(parts.mid, K.g('tGun', () => merge([[cyl(.025, .018, 1.0, 8).rotateZ(Math.PI / 2).translate(-.05, 0, 0)], [new THREE.BoxGeometry(.3, .1, .08).translate(-.25, 0, 0)]])), darkM, { p: B(6.75, 2.47, 0) });
      add(parts.aft, K.g('tunGun', () => cyl(.02, .015, .45, 6).rotateZ(Math.PI / 2 + .12)), darkM, { p: B(8.85, .45, 0) });
    },
  }),
  pbm: propLiv({
    bands: [[(x) => 3.6 + sm(17, 24, x) * 1.0, -9, '#c0c4c3', 0, 24.4, [.46, 0]]],
    cock: [[{ x: 2.2, Y: 3.58 }, { x: 2.75, Y: 3.58 }, { x: 2.75, Y: 3.95 }, { x: 2.55, Y: 3.95 }], [{ x: 2.82, Y: 3.58 }, { x: 3.45, Y: 3.6 }, { x: 3.45, Y: 4.0 }, { x: 2.82, Y: 3.98 }]], cockO: { frame: '#1d2639', fw: .05 },
    win: [[4.79, 3.47, .37, .37], [4.79, 1.86, .37, .37], [10.15, 2.3, .28, .14], [11.7, 2.32, .28, .14], [12.75, 2.32, .28, .14], [13.25, 3.05, .28, .14]],
    doors: [[15.75, 2.32, .99, 1.1], [1.8, 1.47, 1.09, .69]],
    post(P, c, sd) {
      starXY(P, c.Lc, sd, 3.9, 2.9, .7, true);
      P.band(c.Lc, sd, .5, 10.1, (x) => 1.25 - x * .045, (x) => 1.0 - x * .05, 'rgba(110,104,92,.1)', .3);
      const zw = (x) => c.F.sec(x).zw; P.band(c.Lc, sd, .4, 18.3, (x) => zw(x) + .3, (x) => zw(x) - .32, 'rgba(112,106,90,.22)', .5); P.band(c.Lc, sd, .4, 18.3, (x) => zw(x) + .1, (x) => zw(x) - .06, 'rgba(84,80,68,.28)', .5); P.band(c.Lc, sd, 9.9, 11.2, (x) => zw(x) + .2, (x) => zw(x) - .5, 'rgba(60,56,48,.18)', .3);
      const st = []; for (let x = 1.2; x < 18; x += .28) { const a = P.uv(x, zw(x) + 1.1, sd), b = P.uv(x, zw(x) - .02, sd); st.push([a[0] * c.Lc.W, a[1] * c.Lc.H, b[0] * c.Lc.W, b[1] * c.Lc.H]); } segs(c.Lc, st, Math.max(1, .012 * P.ppm(c.Lc)), 'rgba(66,70,76,.2)');
      for (let k = 0; k < 40; k++) { const x = .5 + 17 * c.r(), y = .4 + 2.5 * c.r(); P.local(c.Lc, x, y, sd, (g) => { g.fillStyle = `rgba(${c.r() < .5 ? '60,64,70' : '255,255,255'},${.05 + .08 * c.r()})`; g.fillRect(0, 0, .05 + .3 * c.r(), .01 + .02 * c.r()); }); }
    },
    extra(ctx) {
      const { K, T, add, mat, std, parts, B, F, paint, sp } = ctx;
      const cm = mat('chineM', () => std(T, { color: '#c0c4c3', roughness: .42, metalness: 0, normalMap: tileN(K), normalScale: new THREE.Vector2(.2, .2) }, paint.ei));
      for (const [xa, xb, part] of [[.12, sp.length * .3, 'nose'], [sp.length * .3, 10.16, 'mid']]) for (const sd of [1, -1]) add(parts[part], K.g(`chine${xa}${sd}`, () => { const rows = []; for (let k = 0; k <= 40; k++) { const x = lerp(xa, xb, k / 40), q = F.sec(x), w = .095 * sm(.1, 1.2, x) * (1 - sm(9.6, 10.2, x)) + .004, P0 = (z, y) => B(x, y, sd * z).toArray(); rows.push([P0(q.hw - .03, q.zw + .04), P0(q.hw + w, q.zw - .005), P0(q.hw + w * .7, q.zw - .03), P0(q.hw - .03, q.zw - .06)]); } return sheet(rows, null, sd < 0); }), cm);
      add(parts.wings, K.g('slight', () => merge([[lathe([[.9, .002], [.75, .2], [.4, .36], [-.3, .36], [-.85, .1], [-.9, .002]], 16).scale(1, 1, 1)]])), cm, { p: B(9.9, 4.35, 10.2) });
    },
    wingReg: true, wing({ R, b, Lc, def }) { if (b === 2 || b === 1) wingStar(R, Lc, 13, def, 1.0, true); },
  }),
  a330: {
    hull(P, c, ph) {
      const { Lc, Ln, Lo, Le, sp, r, H } = c; if (ph === 'pre') return;
      const ppm = P.ppm(Lc);
      both((sd) => {
        P.band(Lc, sd, 0, 1.65, 9, -9, '#eceeed'); P.band(Lo, sd, 0, 1.65, 9, -9, ORM(.36, 0));
        const doors = [[5.85, -.18, 1.93], [14.56, -.14, 1.93], [32.77, -.10, 1.66, 1], [45.63, .03, 1.99]];
        for (const [x, sill, h, flat] of doors) paintedDoor(P, Lc, Ln, Lo, x, sill, sd, 1.07, h, { flat, port: !flat, r: flat ? .12 : .17, jet: 1, hinge: !flat, grab: !flat });
        let after1 = 0, after2 = 0; const wl = [];
        for (let k = 0; ; k++) {
          const x = 6.85 + .533 * k; if (x > 44.8) break;
          if (doors.some(([dx]) => Math.abs(x - dx) < .7)) continue;
          let ghost = false; if (x > 5.85 && x < 14.56 && after1 < 2) { after1++; ghost = true; } else if (x > 14.56 && x < 32.77 && after2 < 3) { after2++; ghost = true; }
          if (ghost) { P.local(Lc, x, .82, sd, (g) => { rr(g, -.115, -.165, .23, .33, .09); g.strokeStyle = 'rgba(120,126,130,.45)'; g.lineWidth = .012; g.stroke(); }); continue; }
          wl.push([x, .82, sd, .23, .33]);
        }
        wins(P, c, wl, { seal: 1, r: .09, frame: .03, frameC: '#c5c9cc', reveal: 'rgba(90,96,102,.35)' });
        if (sd > 0) for (const [x, w, h] of [[9.53, 2.70, 1.70], [38.98, 2.78, 1.68], [42.01, .95, .63]]) { const bot = H.keel(x) + .25 + .35; paintedDoor(P, Lc, Ln, Lo, x, bot, sd, w, h, { r: .12, lw: .02, c: 'rgba(34,38,42,.78)', jet: 1 }); }
        const panes = [
          [{ S: .02, Y: .7 }, { x: 1.8, Y: .6 }, { x: 2.32, Y: .58 }, { x: 2.22, Y: 1.2 }, { S: .02, Y: 1.2 }, { S: .02, Y: .95 }],
          [{ x: 2.41, Y: .58 }, { x: 2.89, Y: .59 }, { x: 2.86, Y: 1.21 }, { x: 2.33, Y: 1.2 }],
          [{ x: 2.96, Y: .59 }, { x: 3.14, Y: .6 }, { x: 3.4, Y: 1.21 }, { x: 2.94, Y: 1.21 }],
        ];
        for (const pts of panes) {
          P.path(Lc, pts, sd); Lc.g.lineJoin = 'round'; Lc.g.strokeStyle = '#d4d7d8'; Lc.g.lineWidth = .1 * ppm; Lc.g.stroke(); Lc.g.strokeStyle = '#23282d'; Lc.g.lineWidth = .045 * ppm; Lc.g.stroke();
          const g = Lc.g, q = g.createLinearGradient(0, 0, 0, Lc.H * .2); q.addColorStop(0, '#2b3540'); q.addColorStop(1, '#0d1116'); g.fillStyle = '#10151a'; g.fill();
          P.path(Lo, pts, sd); Lo.g.fillStyle = ORM(.03, 0); Lo.g.fill(); Lo.g.strokeStyle = ORM(.4, 0); Lo.g.lineWidth = .08 * ppm * Lo.W / Lc.W; Lo.g.stroke();
          P.path(Ln, pts, sd); Ln.g.fillStyle = N0; Ln.g.fill(); groove(Ln, P.path(Ln, pts, sd), .6, Math.max(1, .03 * ppm * Ln.W / Lc.W));
        }
        P.local(Lc, 2.0, .63, sd, (g) => { g.strokeStyle = '#1a1d20'; g.lineWidth = .035; g.lineCap = 'round'; g.beginPath(); g.moveTo(.25, 0); g.lineTo(-.35, .05); g.stroke(); });
        for (const [x, y] of [[2.4, -.38], [2.65, -.42], [2.9, -.36]]) P.local(Lc, x, y, sd, (g) => { g.fillStyle = '#7d8286'; g.fillRect(-.06, -.015, .12, .03); });
        P.local(Lc, 12.9, -.9, sd, (g) => { g.fillStyle = 'rgba(150,154,158,.5)'; g.fillRect(-.6, -.12, 1.2, .24); });
        for (const x of [5.85, 14.56, 45.63]) P.local(Lc, x - .35, -.35, sd, (g) => { g.fillStyle = '#b8202c'; g.fillRect(-.03, -.12, .06, .2); g.fillRect(-.09, .06, .18, .04); });
        P.band(Lc, sd, 56.0, 57.51, 2.9, 1.2, 'rgba(40,36,32,.18)'); P.band(Lc, sd, 56.9, 57.51, 2.9, 1.2, 'rgba(30,28,25,.25)');
      });
      grime(P, Lc, sp, { r, jet: 1, belly: .08, streaks: 20, FF: c.FF }); jetDirt(P, c, { root: wingRoot(sp) }); jetWeather(P, c, wingRoot(sp)); gearMarks(P, c);
      P.pathZ(Lc, [[8.6, -.25], [9.4, -.25], [9.4, .25], [8.6, .25]], true, 1);
    },
    regAt: () => ({ x: 42.95, Y: 1.48, h: .24 }), reg(P, c, kind) { if (kind !== 'hull') return; both((sd) => P.text(c.Lc, c.reg, 42.95, 1.48, sd, .24, '#1b2346', undefined, 700)); },
    wing: walkway,
    extra(ctx) { jetDetails(ctx, { ant: [[9.1, 1], [35.9, 1], [40.8, 1], [8.0, 0], [12.6, 0], [14.6, 0], [37.0, 0]], satc: [12.6, 1.0], pitot: [[2.35, -.35], [2.65, -.42], [2.9, -.3]], wick: [24, 25.5, 27, 28.5] }); },
    fin({ R, b, Lc, def }) {
      const g = Lc.g, LE = (s) => 56.21 - .839 * (9.3 - s), y0 = .83, y1 = 9.6;
      let x = 1.3; for (const [w, col] of [[1.27, '#1a1f32'], [.32, 0], [.82, '#1a1f32'], [.18, 0], [.55, '#1a1f32'], [.23, 0], [.23, '#1a1f32'], [.42, 0], [1.24, '#d5152f']]) {
        if (col) { g.beginPath(); for (const [s, o] of [[y0, x], [y1, x], [y1, x + w], [y0, x + w]]) g.lineTo(...R.px(s, LE(s) + o)); g.closePath(); g.fillStyle = col; g.fill(); }
        x += w;
      }
    },
  },
  electra: {
    wingReg: true, regOn: ['wing', 'fin'],
    hull(P, c, ph) {
      const { Lc, Ln, Lo, Le, sp, r, H } = c; if (ph === 'pre') return;
      const ppm = P.ppm(Lc), rc = {}, pn = Ln.W / H.X1 * H.U;
      const patch = (sd, x0, x1, y0, y1, tone, rough, stag) => {
        const pts = rrPts((x0 + x1) / 2, (y0 + y1) / 2, x1 - x0, y1 - y0, .04);
        P.path(Lc, pts, sd); Lc.g.fillStyle = tone; Lc.g.fill(); Lc.g.strokeStyle = 'rgba(50,55,60,.45)'; Lc.g.lineWidth = .006 * ppm; Lc.g.stroke();
        P.path(Lo, pts, sd); Lo.g.fillStyle = ORM(rough, 1); Lo.g.fill();
        P.path(Ln, pts, sd); Ln.g.fillStyle = NRM((r() - .5) * .12, (r() - .5) * .12); Ln.g.fill(); groove(Ln, P.path(Ln, pts, sd), .5, Math.max(1, .004 * pn));
        const rv = [[x0 + .02, y0 + .02, x1 - .02, y0 + .02], [x1 - .02, y0 + .02, x1 - .02, y1 - .02], [x1 - .02, y1 - .02, x0 + .02, y1 - .02], [x0 + .02, y1 - .02, x0 + .02, y0 + .02]];
        for (const [a, b, cc, d] of rv) for (const off of stag ? [0, .016] : [0]) { const p0 = P.uv(a, b, sd), p1 = P.uv(cc, d, sd), o = off / H.X1 * H.U; dots(Lc, (p0[0] + o) * Lc.W, p0[1] * Lc.H, (p1[0] + o) * Lc.W, p1[1] * Lc.H, .022 * ppm, .007 * ppm, 'rgba(40,44,50,.4)'); dots(Ln, (p0[0] + o) * Ln.W, p0[1] * Ln.H, (p1[0] + o) * Ln.W, p1[1] * Ln.H, .022 * pn, .008 * pn, NRM(.35, .35)); }
      };
      both((sd) => {
        for (const x of [2.51, 3.67, 4.46, 5.27, 6.06]) patch(sd, x - .245, x + .245, .98, 1.23, '#e2e5e8', .08, false);
        P.band(Lc, sd, 0, 1.36, 9, -9, 'rgba(255,255,255,.03)');
        const panes = [
          [{ S: .012, Y: 1.13 }, { S: .2, Y: 1.125 }, { S: .2, Y: 1.335 }, { S: .012, Y: 1.34 }],
          [{ x: 1.72, Y: 1.13 }, { x: 1.86, Y: 1.13 }, { x: 1.86, Y: 1.36 }, { x: 1.76, Y: 1.36 }],
          [{ x: 1.9, Y: 1.13 }, { x: 2.03, Y: 1.13 }, { x: 2.03, Y: 1.37 }, { x: 1.9, Y: 1.37 }],
          [{ x: 2.07, Y: 1.13 }, { x: 2.36, Y: 1.13 }, { x: 2.36, Y: 1.36 }, { x: 2.07, Y: 1.37 }],
        ];
        for (const pts of panes) {
          P.path(Lc, pts, sd); Lc.g.lineJoin = 'round'; Lc.g.strokeStyle = '#e4e7ea'; Lc.g.lineWidth = .07 * ppm; Lc.g.stroke(); Lc.g.fillStyle = '#272e35'; Lc.g.fill(); Lc.g.strokeStyle = 'rgba(30,34,38,.8)'; Lc.g.lineWidth = .012 * ppm; Lc.g.stroke();
          P.path(Lo, pts, sd); Lo.g.fillStyle = ORM(.03, 0); Lo.g.fill(); Lo.g.strokeStyle = ORM(.08, 1); Lo.g.lineWidth = .04 * ppm * Lo.W / Lc.W; Lo.g.stroke();
          P.path(Ln, pts, sd); Ln.g.fillStyle = N0; Ln.g.fill(); groove(Ln, P.path(Ln, pts, sd), .6, Math.max(1, .01 * pn));
        }
        P.local(Lc, P.H.xAtZ(.28, .25), .28, sd, (g) => { g.beginPath(); g.arc(0, 0, .085, 0, 7); g.fillStyle = '#b9c0c6'; g.fill(); g.beginPath(); g.arc(0, 0, .065, 0, 7); const q = g.createRadialGradient(-.02, .02, 0, 0, 0, .065); q.addColorStop(0, '#f4f6f8'); q.addColorStop(1, '#4b535b'); g.fillStyle = q; g.fill(); });
        for (const x of [2.35, 3.16, 4.34, 7.34, 9.6]) { P.band(Lc, sd, x - .004, x + .004, 9, -9, 'rgba(40,46,52,.55)'); }
        P.band(Lc, sd, 1.2, 10.5, 1.505, 1.495, 'rgba(40,46,52,.4)'); P.band(Lc, sd, 2.4, 6.4, 1.235, 1.228, 'rgba(40,46,52,.35)'); P.band(Lc, sd, 2.4, 6.4, .975, .968, 'rgba(40,46,52,.35)');
        P.band(Lc, sd, 1.85, 6.5, .6, -9, 'rgba(60,58,52,.06)');
        for (let k = 0; k < 10; k++) { const x0 = 2.6 + 3 * r(), y = .1 + .4 * r(); P.band(Lc, sd, x0, x0 + 1 + 2 * r(), y + .015, y - .015, `rgba(70,62,50,${.05 + .06 * r()})`); }
      });
      patch(1, 6.7, 7.31, .8, 1.27, '#e6e8ea', .06, true);
      { const pts = rrPts(7.005, .83, .61, 1.08, .25); P.path(Lc, pts, -1); Lc.g.strokeStyle = 'rgba(40,46,52,.8)'; Lc.g.lineWidth = .01 * ppm; Lc.g.stroke(); groove(Ln, P.path(Ln, pts, -1), .7, Math.max(1, .006 * pn)); P.local(Lc, 7.2, .85, -1, (g) => { g.fillStyle = '#5b6168'; g.fillRect(-.06, -.015, .12, .03); }); }
      { const pts = [[1.89, .03], [2.4, .03], [2.4, .56], [1.89, .56]]; P.pathZ(Lc, pts, false, -1); Lc.g.strokeStyle = 'rgba(40,46,52,.8)'; Lc.g.lineWidth = .01 * ppm; Lc.g.stroke(); P.pathZ(Ln, pts, false, -1); Ln.g.strokeStyle = NRM(.4, .4); Ln.g.lineWidth = Math.max(1, .006 * pn); Ln.g.stroke(); }
    },
    reg(P, c, kind) {
      if (kind === 'wing') { const { WR, def } = c; for (const b of [0, 3]) { const R = WR[b], s = 5.05, x = def.fx(s) + def.fc(s) * .45; regText(c.Lc, R, 'NR16020', s, x, .95, [1, 0], [0, 1], '#15171a', 1.05); } }
      if (kind === 'fin') { const { TRf, fins } = c; fins.forEach((d, i) => { const right = d.fw(0) > 0, R = TRf[i][right ? 1 : 0], dx = right ? [0, -1] : [0, 1], dy = [-1, 0]; regText(c.Lc, R, 'NR', 1.2, 11.25, .21, dx, dy, '#15171a', .85); regText(c.Lc, R, '16020', .95, 11.26, .19, dx, dy, '#15171a', .74); }); }
    },
    wing({ R, b, h, Lc, def, r }) {
      const g = Lc.g;
      for (const s of [1.69, 2.65, 3.5, 4.4]) { const a = R.px(s, def.fx(s) - .02), c2 = R.px(s, def.fx(s) + def.fc(s) * 1.02); line(Lc, a[0], a[1], c2[0], c2[1], 2, 'rgba(40,46,52,.5)'); }
      if (b === 0 || b === 2) { const s0 = .85, s1 = 1.64; g.beginPath(); for (const [s, x] of [[s0, 3.87], [s1, 3.87], [s1, 4.24], [s0, 4.24]]) g.lineTo(...R.px(s, x)); g.closePath(); g.fillStyle = 'rgba(150,150,145,.35)'; g.fill(); }
      if (b % 2) for (let k = 0; k < 6; k++) { const s = 1.6 + r() * 1.2, x = 4.0 + r() * .8; g.beginPath(); for (const [ss, xx] of [[s, x], [s + .25, x], [s + .2, x + 1.2], [s + .05, x + 1.2]]) g.lineTo(...R.px(ss, xx)); g.fillStyle = `rgba(55,48,38,${.08 + .1 * r()})`; g.fill(); }
      else for (let k = 0; k < 4; k++) { const s = 1.7 + r() * .9, x = 3.4 + r() * .4; g.beginPath(); for (const [ss, xx] of [[s, x], [s + .2, x], [s + .15, x + 1.4], [s + .05, x + 1.4]]) g.lineTo(...R.px(ss, xx)); g.fillStyle = `rgba(60,52,40,${.05 + .06 * r()})`; g.fill(); }
    },
    extra({ K, T, sp, B, add, mat, std, parts, F, H, chromeM, strutM, darkM, fins }) {
      const wire = WM(mat, std, T);
      const loopM = mat('loop', () => std(T, { color: 0xc9cdd1, roughness: .15, metalness: 1 }));
      const cr = F.sec(1.9).cr;
      add(parts.nose, K.g('loop', () => merge([[new THREE.TorusGeometry(.17, .013, 8, 32), M4([0, .27, 0])], [cyl(.02, .015, .12, 8)], [new THREE.CylinderGeometry(.03, .045, .03, 12).translate(0, .015, 0)]])), loopM, { p: B(1.9, cr - .01, 0) });
      add(parts.mid, K.g('mast', () => cyl(.018, .01, .5, 8).rotateZ(.15)), loopM, { p: B(5.7, F.sec(5.7).cr - .01, 0) });
      const top = B(5.75, F.sec(5.7).cr + .48, 0);
      const wireTo = (a, b) => { const d = b.clone().sub(a), g = K.g(`w${a.x.toFixed(2)}${b.x.toFixed(2)}${b.z.toFixed(2)}`, () => cyl(.004, .004, d.length(), 4)), m = add(parts.mid, g, wire, { p: a, noShadow: true }); m.quaternion.setFromUnitVectors(new V3(0, 1, 0), d.normalize()); };
      for (const d of fins) { const q = d.at(d.s1 - .03); wireTo(top, q.p.clone().add(new V3(-q.c * .3, 0, 0))); }
      wireTo(B(2.5, F.sec(2.5).cr, 0), top);
      for (const sd of [1, -1]) add(parts.nose, K.g('pitot', () => merge([[cyl(.012, .01, .38, 6).translate(0, -.36, 0)], [cyl(.012, .012, .2, 6).rotateZ(-Math.PI / 2).translate(0, -.36, 0)]])), chromeM, { p: B(.8, H.yAt(.8, H.sZ(.8, .25, true)) + .03, .25 * sd) });
      for (const sd of [1, -1]) add(parts.nose, K.g('lamp', () => new THREE.SphereGeometry(.07, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2).rotateZ(-Math.PI / 2).scale(.5, 1, 1)), mat('lamp', () => std(T, { color: 0xeef2f4, roughness: .05, metalness: .3, emissive: 0x333333 })), { p: B(H.xAtZ(.28, .24), .28, .24 * sd).add(new V3(-.02, 0, 0)), noShadow: true });
    },
  },
};
export const PERSPECTIVES = {
  ...Object.fromEntries(['a330', 'b777', 'b747', 'b747jal', 'b767', 'dc10', 'lancastrian'].map((k) => [k, [{ id: 'captain', label: 'Cockpit, left seat' }, { id: 'passenger', label: 'Passenger' }]])),
  electra: [{ id: 'pilot', label: 'Pilot' }, { id: 'navigator', label: 'Navigator' }], b24: [{ id: 'pilot', label: 'Pilot' }, { id: 'waist', label: 'Waist gunner' }], tbm: [{ id: 'pilot', label: 'Pilot' }, { id: 'turret', label: 'Turret gunner' }], pbm: [{ id: 'pilot', label: 'Pilot' }],
};
export const SPECS = {

  b777: {
    length: 63.73, span: 60.93, dia: 6.2, hullLen: 63.73, ringN: 44, hullStep: .48,
    loft: [[0, -.72, -.72, 0, -.72, 1.9, 2.1], [.25, -.20, -1.24, .56, -.75, 1.9, 2.1], [.5, -.04, -1.39, .76, -.74, 1.9, 2.1], [1.0, .36, -1.63, 1.07, -.68, 1.9, 2.1], [1.5, .75, -1.87, 1.31, -.60, 1.9, 2.1], [2.0, 1.07, -2.03, 1.51, -.52, 1.95, 2.1], [2.5, 1.39, -2.27, 1.71, -.44], [3.0, 1.63, -2.43, 1.91, -.36], [4.0, 1.95, -2.67, 2.23, -.24], [5.0, 2.26, -2.83, 2.50, -.15], [6.0, 2.42, -2.91, 2.70, -.08], [7.0, 2.66, -3.06, 2.82, -.03], [8.0, 2.82, -3.08, 2.94, 0], [10.0, 3.10, -3.10, 3.10, 0], [46.0, 3.10, -3.10, 3.10, 0], [48.0, 3.10, -2.68, 3.05, .15], [50.0, 3.08, -2.22, 2.82, .40], [52.0, 3.04, -1.76, 2.43, .65], [54.0, 2.98, -1.31, 2.03, .90], [56.0, 2.88, -.85, 1.63, 1.10], [58.0, 2.70, -.39, 1.15, 1.30], [60.0, 2.45, .06, .70, 1.45, 2.2, 2.2], [62.0, 2.25, .95, .33, 1.65, 2.2, 2.2], [63.73, 2.10, 1.55, .06, 1.85, 2, 2]],
    skin: { seamC: 'rgba(60,66,72,.24)', fp: .53, fk: 4, sp: 1.6, tilt: .025, tone: .03, rvar: .08, patch: .04, f0: 2.1 },
    paint: { base: '#f4f5f3', rough: .3, wing: '#989b9b', wingLow: '#b0b4b7', wingR: .4, fin: '#f4f5f3', stab: '#f2f3f1', stabLow: '#c6c9ca', nac: '#8e9297', pylon: '#c9ccce', fair: '#8b8f94', fairR: .36, stabLE: [.03, '#cdd0d2', .38, .45], cabin: .5, wingSurf: { le: [.025, '#c4c7c9', .4, .3], chord: [.1, .2, .3, .42, .54, .66, .78], rib: 5.5, fr: .6, tilt: .06, tone: .065, rvar: .08, weather: .07, rivet: [.03, .01], rivetC: 'rgba(36,40,46,.24)', seam: 'rgba(40,46,52,.45)' } },
    wing: { pf: [[1.2, 21.0, 35.4], [3.1, 21.6, 35.4], [4.0, 22.62, 35.4], [11.0, 27.24, 35.47], [30.47, 40.05, 41.92]], h: -2.12, dih: 6, tc: [[0, .14], [11, .12], [30.5, .095]], tw: [[0, 2.5], [30.5, -1]], cam: .02,
      slat: [[7.2, 10.3], [10.3, 13.4], [13.4, 16.5], [16.5, 19.6], [19.6, 22.7], [22.7, 25.9], [25.9, 29.0]], slatC: .13, flap: [[3.4, 9.0, .30], [11.4, 21.6, .26]], flapMax: 30, ail: [[9.0, 11.4, .30], [21.8, 27.6, .26]], spl: [[11.6, 21.0, .14, 5, .26], [4.0, 8.8, .14, 2, .30]], ftf: [4.4, 8.4, 13.8, 19.2], ftfL: .62, ftfP: .95, ftfD: .75, ftfW: .5 },
    fair: [[19.6, -2.7, -3.05, 0, -2.9], [21.5, -1.9, -3.32, 2.1, -2.3, 2.4, 2.5], [25, -1.5, -3.5, 2.75, -2.0, 2.6, 2.7], [34, -1.5, -3.5, 2.75, -2.0, 2.6, 2.7], [37.5, -1.8, -3.35, 2.35, -2.3, 2.4, 2.4], [39.7, -2.7, -3.15, 0, -2.95]],
    fin: { base: 3.10, st: [[-.9, 51.3, 58.6], [0, 48.5, 59.0], [.2, 49.7, 59.05], [.5, 50.6, 59.1], [.9, 51.3, 59.2], [9.98, 60.2, 62.6]], t: .11, rud: [[0, 56.5], [9.98, 61.4]], rudS: [.1, 9.7] }, finSplit: 3.0,
    stab: { pf: [[.6, 54.0, 60.9], [2.5, 54.6, 61.0], [10.67, 61.3, 63.75]], h: 1.0, dih: 6, tc: [[0, .11]], cam: 0, elev: [2.6, 10.5], hinge: [[2.5, 59.4], [10.67, 63.0]] },
    engine: 'fan', engines: [{ x: 20.2, h: -3.0, w: 9.93 }, { x: 20.2, h: -3.0, w: -9.93 }],
    fan: { hl: 3.05, fan: 2.80, fanAt: 1.0, prof: [[0, 3.05], [.8, 3.45], [1.6, 3.55], [3.5, 3.42], [5.0, 3.22], [5.5, 3.15]], core: [[5.6, 2.05], [6.8, 1.45]], plug: 7.9, blades: 26, wide: true, spin: .95, spinL: .95, lip: .15, cowl: '#8e9297', joints: [1.6, 3.6], swirl: true, pylon: { x0: 1.8, len: 8.6, w: .75, over: .55, endH: 1.2, drop: .3 } },
    gear: [
      { id: 'n', p: [5.6, -2.0, 0], axis: 'z', ang: 96, len: 3.7, tele: .78, wh: { D: 1.09, W: .40, n: 2, gap: .74 }, oleo: .14, torque: 1, axle: 1, brace: [0, -28], doors: [{ x: 5.9, h: -2.9, w: .45, l: 2.6, wd: .44, to: -1, ang: -88 }] },
      { id: 'm', p: [31.6, -2.3, 5.9], w: true, axis: 'x', ang: 86, rake: 6, len: 3.4, wh: { D: 1.27, W: .51, n: 2, gap: 1.40, ax: 3, pitch: 1.45, tilt: 10 }, oleo: .3, torque: 1, brace: [0, 32], legDoor: [0, -1.2, .34, 1.2, 2.0], doors: [{ x: 31.8, h: -3.5, w: 1.6, l: 4.4, wd: 1.5, to: 1, ang: 82, shut: true }] },
    ],
    land: [[22.4, -1.95, 3.8]], beacons: [19, 30], tailLight: [63.6, 1.85, 0], fillet: [[21.4, 0], [22.6, .32], [26, .5], [32, .55], [34.8, .38], [35.5, 0]],
  },
  b747: {
    length: 70.66, span: 59.64, dia: 6.5, hullLen: 70.66, ringN: 46, hullStep: .5, splits: [21.2, 43.8],
    loft: [[0, -.05, -.05, 0, -.05], [.25, .48, -.57, .48, -.10], [.5, .64, -.82, .72, -.15], [1.0, 1.05, -1.22, 1.00, -.20], [1.5, 1.37, -1.47, 1.24, -.22], [2.0, 1.62, -1.71, 1.44, -.22], [3.0, 2.11, -2.20, 1.81, -.20], [4.0, 2.59, -2.52, 2.13, -.16, 2.1], [4.9, 3.25, -2.72, 2.33, -.12, 2.3], [6.0, 3.97, -3.01, 2.65, -.08, 2.5], [7.0, 4.30, -3.17, 2.81, -.05, 2.6], [8.0, 4.38, -3.26, 3.01, 0, 2.6], [10.0, 4.38, -3.42, 3.21, 0, 2.6], [12.0, 4.38, -3.50, 3.25, 0, 2.6], [16.0, 4.38, -3.50, 3.25, 0, 2.6], [18.0, 4.14, -3.50, 3.25, 0, 2.45], [20.0, 3.81, -3.50, 3.25, 0, 2.25], [22.0, 3.49, -3.50, 3.25, 0, 2.08], [24.0, 3.35, -3.50, 3.25, 0, 2], [48.0, 3.35, -3.42, 3.24, .02], [50.0, 3.35, -3.01, 3.18, .10], [54.0, 3.35, -2.20, 2.95, .35], [58.0, 3.35, -1.31, 2.16, .80], [62.0, 3.35, -.33, 1.34, 1.35], [64.0, 3.32, .08, .90, 1.70], [66.0, 3.25, .56, .47, 2.00], [68.0, 3.10, 1.05, .24, 2.20], [70.66, 2.47, 2.30, .12, 2.40]],
    skin: { seamC: 'rgba(60,66,72,.24)', fp: .508, fk: 4, sp: 1.6, tilt: .03, tone: .03, rvar: .08, patch: .04, f0: 2.2 },
    paint: { base: '#f3f3f1', rough: .32, wing: '#939696', wingLow: '#adb1b3', wingR: .4, fin: '#f3f3f1', stab: '#f1f1ef', stabLow: '#c3c6c8', nac: '#eceeed', pylon: '#c3c6c8', fair: '#c9ccce', fairR: .36, fairMetal: true, cabin: .5, wingSurf: { le: [.035, '#c3c6c8', .36, .8], chord: [.1, .2, .3, .42, .54, .66, .78], rib: 5.5, fr: .6, tilt: .06, tone: .065, rvar: .08, weather: .07, rivet: [.03, .01], rivetC: 'rgba(36,40,46,.24)', seam: 'rgba(40,46,52,.45)' } },
    wing: { pf: [[1.3, 19.6, 34.5], [3.3, 20.56, 35.13], [12.6, 28.84, 38.15], [29.82, 44.2, 48.2]], h: -2.17, dih: 7, tc: [[0, .134], [12.6, .105], [29.8, .08]], tw: [[0, 2], [29.8, -1.5]], cam: .02,
      flap: [[3.5, 12.4, .30], [13.4, 21.5, .30]], flapMax: 30, kr: [[3.8, 6.4, .11], [6.9, 11.0], [12.9, 17.8], [17.8, 23.0], [23.0, 28.5, .12]], ail: [[12.4, 13.4, .22], [21.8, 27.6, .21]], spl: [[4.2, 12, .12, 3, .30], [13.6, 21, .12, 3, .30]], ftf: [5.6, 8.4, 14.4, 18.2], ftfL: .6, ftfP: 1.0, ftfD: .75, ftfW: .52 },
    fair: [[20.5, -2.9, -3.4, 0, -3.15], [22.5, -2.0, -3.75, 2.4, -2.5, 2.4, 2.5], [26, -1.7, -3.9, 2.95, -2.3, 2.6, 2.7], [35, -1.7, -3.9, 2.95, -2.3, 2.6, 2.7], [42, -2.0, -3.72, 2.25, -2.6, 2.4, 2.4], [48, -2.9, -3.45, 0, -3.2]],
    fin: { base: 3.35, st: [[-.9, 55.8, 66.4], [0, 53.5, 66.7], [.3, 55.0, 66.8], [.8, 56.0, 66.95], [10.45, 67.0, 70.6]], t: .11, rud: [[0, 64.4], [10.45, 69.5]], rudS: [.15, 10.2] }, finSplit: 3.1,
    stab: { pf: [[.8, 58.9, 66.9], [3.0, 59.5, 67.06], [11.04, 67.8, 69.4]], h: .8, dih: 7, tc: [[0, .11]], cam: 0, elev: [3.1, 10.8], hinge: [[3, 65.2], [11.04, 68.5]] },
    engine: 'fan', engines: [{ x: 23.9, h: -3.3, w: 11.9 }, { x: 23.9, h: -3.3, w: -11.9 }, { x: 31.8, h: -2.6, w: 20.7 }, { x: 31.8, h: -2.6, w: -20.7 }],
    fan: { hl: 2.45, fan: 2.34, fanAt: .7, prof: [[0, 2.45], [.6, 2.75], [1.2, 2.80], [2.4, 2.66], [3.0, 2.46]], core: [[3.1, 1.95], [5.6, 1.25]], plug: 7.0, blades: 46, shroud: true, spin: .80, spinL: .95, lip: .18, joints: [1.2, 2.4], coreC: '#bdbab3', pylon: { x0: .6, len: 8.6, w: .7, over: .4, endH: 1.05, drop: .2 } },
    gear: [
      { id: 'n', p: [7.6, -2.3, 0], axis: 'z', ang: 96, len: 3.6, tele: .8, wh: { D: 1.17, W: .41, n: 2, gap: .76 }, oleo: .15, torque: 1, axle: 1, brace: [0, -28], doors: [{ x: 7.9, h: -3.25, w: .48, l: 2.6, wd: .46, to: -1, ang: -88 }] },
      { id: 'w', p: [32.2, -2.4, 6.0], w: true, axis: 'x', ang: 86, rake: 8, len: 3.4, wh: { D: 1.17, W: .41, n: 2, gap: 1.12, ax: 2, pitch: 1.47, tilt: 12 }, oleo: .26, torque: 1, brace: [0, 32], legDoor: [0, -1.2, .3, 1.0, 2.0] },
      { id: 'b', p: [35.2, -2.7, 1.92], w: true, axis: 'z', ang: 90, len: 3.0, wh: { D: 1.17, W: .41, n: 2, gap: 1.12, ax: 2, pitch: 1.47, tilt: 12 }, oleo: .26, torque: 1, doors: [{ x: 34.4, h: -3.48, w: .35, l: 3.2, wd: 1.5, to: 1, ang: 85, shut: true }] },
    ],
    land: [[20.9, -1.95, 3.6]], beacons: [28, 33], tailLight: [70.6, 2.4, 0], fillet: [[20.4, 0], [21.6, .32], [25, .5], [31, .55], [34.5, .38], [35.2, 0]],
  },
  dc10: {
    length: 55.35, span: 50.39, dia: 6.02, hullLen: 52.6, ringN: 44, hullStep: .45,
    loft: [[0, -.50, -.50, 0, -.50, 1.9, 2.2], [.25, -.06, -1.08, .47, -.57, 1.9, 2.2], [.5, .18, -1.35, .73, -.58, 1.9, 2.2], [1.0, .54, -1.60, 1.02, -.53, 1.9, 2.2], [1.5, .89, -1.81, 1.29, -.46, 1.9, 2.2], [2.0, 1.30, -1.98, 1.50, -.34, 1.95, 2.15], [3.0, 1.84, -2.26, 1.85, -.21], [4.0, 2.20, -2.46, 2.11, -.13], [5.0, 2.50, -2.60, 2.34, -.05], [7.0, 2.87, -2.88, 2.70, 0], [9.0, 3.00, -2.98, 2.93, 0], [10.0, 3.01, -3.01, 3.01, 0], [38.0, 3.01, -3.01, 3.01, 0], [40.0, 2.91, -2.83, 2.81, .04], [42.0, 2.80, -2.59, 2.52, .10], [44.0, 2.71, -2.25, 2.20, .23], [46.0, 2.55, -1.80, 1.85, .37], [48.0, 2.44, -1.25, 1.45, .60], [50.0, 2.29, -.64, 1.05, .83], [52.0, 2.15, .01, .60, 1.08], [52.6, 1.95, .45, .35, 1.20]],
    skin: { seamC: 'rgba(60,66,72,.24)', fp: .508, fk: 4, sp: 1.6, tilt: .03, tone: .03, rvar: .08, patch: .04, f0: 2.0 },
    paint: { base: '#f4f4f0', rough: .32, wing: '#9c9e9c', wingLow: '#b7bab9', wingR: .4, fin: '#f4f4f0', stab: '#f1f1ee', stabLow: '#c6c8c9', nac: '#f1f2f0', pylon: '#e8e9e8', fair: '#c7cacc', fairR: .36, fairMetal: true, cabin: .5, stabLE: [.03, '#cdd0d2', .38, .45], wingSurf: { le: [.025, '#cfd1d1', .4, .3], chord: [.1, .2, .3, .42, .54, .66, .78], rib: 5.5, fr: .6, tilt: .06, tone: .065, rvar: .08, weather: .07, rivet: [.03, .01], rivetC: 'rgba(36,40,46,.24)', seam: 'rgba(40,46,52,.45)' } },
    wing: { pf: [[1.2, 20.52, 33.66], [3.1, 22.01, 33.96], [9.5, 27.03, 34.95], [25.2, 39.34, 42.32]], h: -1.71, dih: [[0, 5.2], [9.5, 3.0]], tc: [[0, .122], [25.2, .084]], tw: [[0, 2.5], [25.2, -1.5]], cam: .02,
      slat: [[3.5, 5.8], [5.8, 7.6], [7.6, 9.6], [9.6, 11.9], [11.9, 14.0], [14.0, 17.5], [17.5, 19.9], [19.9, 22.0], [22.0, 24.3]], slatC: .17, flap: [[3.1, 8.6, .18], [9.7, 17.1, .24]], flapMax: 40, ail: [[8.6, 9.7, .25], [19.3, 24.0, .25]], spl: [[9.8, 17, .13, 5, .24]], ftf: [5.6, 10.9, 15.8], ftfL: .62, ftfP: .95, ftfD: .9, ftfW: .55 },
    fair: [[20.5, -2.7, -3.05, 0, -2.9], [22.5, -1.8, -3.3, 2.1, -2.3, 2.4, 2.5], [27, -1.5, -3.45, 2.65, -2.0, 2.6, 2.7], [32, -1.5, -3.45, 2.65, -2.0, 2.6, 2.7], [35, -1.8, -3.3, 2.2, -2.3, 2.4, 2.4], [37, -2.7, -3.1, 0, -2.95]],
    fin: { base: 6.07, st: [[-.7, 45.9, 52.7], [0, 46.45, 52.7], [6.39, 52.72, 55.61]], t: .1, rud: [[.6, 50.7], [6.39, 54.2]], rudS: [.66, 6.33] }, finSplit: 1.9,
    stab: { pf: [[.8, 44.4, 52.4], [2.17, 45.0, 52.5], [10.85, 52.16, 54.8]], h: .95, dih: 7, tc: [[0, .11]], cam: 0, elev: [2.3, 10.5], hinge: [[2.17, 50.4], [10.85, 53.9]] },
    engine: 'fan', engines: [{ x: 20.7, h: -2.93, w: 8.3 }, { x: 20.7, h: -2.93, w: -8.3 }, { x: 42.9, h: 4.75, w: 0, mount: 'fin', tilt: -3, fan: 'fan2', pylon: false }],
    fan: { hl: 2.55, fan: 2.19, fanAt: .8, prof: [[0, 2.55], [.6, 2.88], [1.2, 2.95], [3.5, 2.75], [4.9, 2.6]], core: [[5.0, 1.9], [6.6, 1.15]], plug: 7.7, coreC: '#aaa7a0', blades: 38, shroud: true, spin: .75, spinL: .8, lip: .18, joints: [1.2, 3.4], bands: [[.205, .24, .5, 4.85, '#0b7482'], [.24, .252, .5, 4.85, '#001c68'], [.76, .795, .5, 4.85, '#0b7482'], [.748, .76, .5, 4.85, '#001c68']], pylon: { x0: 1.0, len: 8.4, w: .7, over: .45, endH: 1.1, drop: .3 } },
    fan2: { hl: 2.6, fan: 2.19, fanAt: 3.8, prof: [[0, 2.6], [.5, 2.9], [1.0, 2.93], [9.3, 2.93], [10.6, 2.6]], core: [[10.7, 2.1], [12.6, 1.0]], plug: 13.2, coreC: '#aaa7a0', blades: 38, shroud: true, spin: .75, spinL: .8, lip: .18, joints: [.9, 9.3], slant: [[3.2, 4.25, '#0b7482', 1.44], [4.25, 8.9, '#001c68', 1.44, 0]] },
    gear: [
      { id: 'n', p: [8.6, -2.1, 0], axis: 'z', ang: 96, len: 3.4, tele: .8, wh: { D: 1.02, W: .39, n: 2, gap: .7 }, oleo: .14, torque: 1, axle: 1, brace: [0, -28], doors: [{ x: 8.85, h: -2.98, w: .44, l: 2.5, wd: .43, to: -1, ang: -88 }] },
      { id: 'm', p: [30.6, -2.2, 5.8], w: true, axis: 'x', ang: 86, rake: 8, len: 3.3, wh: { D: 1.32, W: .53, n: 2, gap: 1.55, ax: 2, pitch: 1.88, tilt: 12 }, oleo: .27, torque: 1, brace: [0, 32], legDoor: [0, -1.2, .34, 1.1, 2.0], doors: [{ x: 30.83, h: -3.45, w: 1.4, l: 3.8, wd: 1.3, to: 1, ang: 82, shut: true }] },
      { id: 'c', p: [31.7, -2.7, 0], axis: 'z', ang: 90, len: 3.0, wh: { D: 1.32, W: .53, n: 2, gap: 1.55 }, oleo: .24, axle: 1, torque: 1 },
    ],
    land: [[22.1, -1.6, 3.2]], beacons: [13, 9], tailLight: [56.05, 5.3, 0], fillet: [[21.8, 0], [22.9, .3], [26, .45], [31, .5], [33.4, .35], [34, 0]],
  },
  b767: {
    length: 54.94, span: 47.57, dia: 5.03, hullLen: 54.94, ringN: 42, hullStep: .42,
    loft: [[0, -.34, -.34, 0, -.34], [.25, .19, -.86, .62, -.40], [.5, .37, -1.06, .80, -.42], [1.0, .67, -1.30, 1.17, -.40], [1.5, 1.11, -1.55, 1.42, -.35], [2.0, 1.55, -1.80, 1.67, -.30], [2.5, 1.79, -1.92, 1.82, -.22], [3.0, 2.03, -2.11, 1.98, -.15], [4.0, 2.35, -2.27, 2.22, -.05], [5.0, 2.53, -2.48, 2.41, .05], [6.0, 2.65, -2.60, 2.53, .12], [7.0, 2.71, -2.66, 2.60, .18], [8.0, 2.72, -2.72, 2.515, .20], [40.0, 2.72, -2.62, 2.515, .25], [42.0, 2.72, -2.23, 2.47, .35], [44.0, 2.72, -1.86, 2.30, .50], [46.0, 2.67, -1.43, 1.95, .70], [48.0, 2.55, -.99, 1.55, .90], [50.0, 2.35, -.55, 1.17, 1.05], [52.0, 2.05, -.12, .80, 1.15], [53.5, 1.60, .38, .45, 1.15], [54.94, 1.40, 1.10, .15, 1.25]],
    skin: { seamC: 'rgba(60,66,72,.24)', fp: .508, fk: 4, sp: 1.4, tilt: .028, tone: .03, rvar: .08, patch: .04, f0: 1.9 },
    paint: { base: '#f4f3f0', rough: .3, wing: '#959898', wingLow: '#aeb2b4', wingR: .4, fin: '#f4f3f0', stab: '#f2f1ee', stabLow: '#c5c8ca', nac: '#f1f2f0', pylon: '#c8cbcc', fair: '#ecedeb', cabin: .5, wingSurf: { le: [.025, '#c2c5c7', .4, .3], chord: [.1, .2, .3, .42, .54, .66, .78], rib: 5.5, fr: .6, tilt: .06, tone: .065, rvar: .08, weather: .07, rivet: [.03, .01], rivetC: 'rgba(36,40,46,.24)', seam: 'rgba(40,46,52,.45)' } },
    wing: { pf: [[1.2, 19.2, 31.05], [2.52, 19.7, 31.05], [3.5, 20.58, 31.05], [8.5, 23.95, 31.25], [23.79, 34.25, 36.6]], h: -1.6, dih: 6, tc: [[0, .15], [8.5, .125], [23.8, .103]], tw: [[0, 4.25], [23.8, .75]], cam: .02,
      slat: [[3.6, 7.0], [9.3, 11.55], [11.55, 13.8], [13.8, 16.05], [16.05, 18.3], [18.3, 20.55], [20.55, 22.8]], slatC: .15, flap: [[2.8, 7.8, .30], [9.0, 17.6, .25]], flapMax: 30, ail: [[7.9, 9.0, .25], [17.8, 22.9, .22]], spl: [[9.2, 17.5, .12, 4, .25], [3.0, 7.6, .12, 2, .30]], ftf: [6.5, 11.2, 15.3, 18.3], ftfL: .62, ftfP: .8, ftfD: .62, ftfW: .46 },
    fair: [[17.0, -2.4, -2.78, 0, -2.6], [18.8, -1.5, -2.95, 1.75, -1.95, 2.4, 2.5], [22, -1.2, -3.07, 2.3, -1.7, 2.6, 2.7], [30, -1.2, -3.07, 2.3, -1.7, 2.6, 2.7], [32.5, -1.5, -2.95, 1.9, -1.95, 2.4, 2.4], [34.6, -2.4, -2.75, 0, -2.6]],
    fin: { base: 2.72, st: [[-.9, 44.9, 51.3], [0, 41.0, 51.6], [.3, 43.0, 51.7], [.8, 44.6, 51.8], [8.53, 52.75, 55.0]], t: .11, rud: [[0, 49.3], [8.53, 53.6]], rudS: [.1, 8.3] }, finSplit: 2.6,
    stab: { pf: [[.6, 46.5, 52.4], [2.5, 47.1, 52.45], [9.31, 52.3, 54.25]], h: .45, dih: 7, tc: [[0, .11]], cam: 0, elev: [2.6, 9.1], hinge: [[2.5, 50.97], [9.31, 53.6]] },
    engine: 'fan', engines: [{ x: 19.4, h: -2.45, w: 7.85 }, { x: 19.4, h: -2.45, w: -7.85 }],
    fan: { hl: 2.42, fan: 2.38, fanAt: .85, prof: [[0, 2.42], [.6, 2.7], [1.2, 2.75], [2.4, 2.62], [3.3, 2.55], [4.4, 2.35]], metalAft: 3.3, core: [[4.5, 1.65], [5.4, 1.20]], plug: 6.0, blades: 38, spin: .75, spinL: .75, spinC: '#b9bdc0', lip: .18, joints: [1.2, 3.3], pylon: { x0: 1.6, len: 7.6, w: .62, over: .55, endH: 1.0, drop: .25 } },
    gear: [
      { id: 'n', p: [4.8, -1.9, 0], axis: 'z', ang: 96, len: 3.2, tele: .8, wh: { D: .94, W: .33, n: 2, gap: .64 }, oleo: .13, torque: 1, axle: 1, brace: [0, -28], doors: [{ x: 5.0, h: -2.64, w: .4, l: 2.2, wd: .39, to: -1, ang: -88 }] },
      { id: 'm', p: [27.6, -2.0, 5.0], w: true, axis: 'x', ang: 86, rake: 7, len: 3.1, wh: { D: 1.17, W: .46, n: 2, gap: 1.14, ax: 2, pitch: 1.42, tilt: 12 }, oleo: .24, torque: 1, brace: [0, 32], legDoor: [0, -1.1, .3, 1.0, 1.8], doors: [{ x: 27.76, h: -3.05, w: 1.3, l: 3.4, wd: 1.2, to: 1, ang: 82, shut: true }] },
    ],
    land: [[20.2, -1.45, 3.0]], beacons: [20, 26], tailLight: [54.9, 1.25, 0], fillet: [[19.5, 0], [20.6, .28], [23.5, .42], [28, .45], [30.4, .32], [31.1, 0]],
  },
  lancastrian: {
    length: 23.42, span: 31.09, dia: 2.2, y0: 1.31, hullLen: 22.68, ringN: 36, hullStep: .2, hullTex: .5, engineKind: 'inline', vintage: true, twinFin: true,
    loft: [[0, 1.80, 1.80, 0, 1.78, 2, 2], [.1, 2.02, 1.53, .3, 1.76, 2, 2], [.25, 2.16, 1.3, .45, 1.73, 2, 2], [.5, 2.29, 1.03, .57, 1.68, 2.1, 2.1], [1.0, 2.41, .71, .7, 1.6, 2.3, 2.3], [1.5, 2.48, .52, .78, 1.54, 2.5, 2.6], [2.0, 2.50, .37, .82, 1.48, 2.7, 2.9], [2.5, 2.51, .24, .87, 1.40, 2.9, 3.2], [3.0, 2.46, .14, .89, 1.35, 3, 3.4], [3.47, 2.40, .08, .90, 1.30, 3, 3.5], [5.0, 2.62, 0, .90, 1.25, 3, 3.5], [11.77, 2.62, 0, .90, 1.25, 3, 3.5], [13.67, 2.62, 0, .87, 1.30, 3, 3.3], [14.47, 2.62, .13, .85, 1.35, 3, 3.2], [15.47, 2.62, .24, .83, 1.40, 3, 3], [16.47, 2.62, .36, .80, 1.45, 2.9, 2.9], [17.47, 2.60, .45, .76, 1.50, 2.8, 2.8], [18.47, 2.58, .55, .71, 1.55, 2.7, 2.7], [19.47, 2.53, .65, .64, 1.58, 2.5, 2.5], [20.47, 2.37, .8, .51, 1.56, 2.3, 2.3], [21.07, 2.2, .9, .43, 1.52, 2.1, 2.1], [22.0, 1.94, 1.0, .36, 1.44, 2, 2], [22.6, 1.75, 1.07, .3, 1.39, 2, 2], [23.0, 1.6, 1.13, .23, 1.36, 2, 2], [23.25, 1.51, 1.17, .17, 1.34, 2, 2], [23.42, 1.34, 1.34, 0, 1.34]],
    skin: { frames: [.8, 1.6, 2.4, 3.47, 4.8, 6.1, 7.4, 8.7, 10.0, 11.3, 12.6, 13.9, 15.2, 16.5, 17.8, 19.1, 20.4, 21.5, 22.3], fp: .45, f0: .4, sp: .6, wave: .05, tilt: .05, tone: .04, rvar: .045, rivet: [.03, .008], sub: true, rk: .55, seamC: 'rgba(40,46,52,.42)', rivetC: 'rgba(25,30,36,.3)' },
    paint: { metal: true, base: '#d0d4d8', exhaust: '#c4c8cc', rough: .16, doorR: .3, door: '#bfc3c7', doorT: { base: '#c4c8cc', rough: .3, metal: 1, W: 512, H: 256, lu: 3.1, lv: .55, us: [.2, .4, .6, .8], vs: [.5], tilt: .06, tone: .06, rvar: .08 }, fabric: { col: '#b5b8ba', rough: .55, metal: .25, rib: .25, sag: .03, ribC: 'rgba(255,255,255,.05)' }, wing: '#cdd1d5', wingR: .23, wingLowR: .35, wingM: 1, fin: '#ccd0d4', finM: 1, finR: .18, stab: '#ccd0d4', nScale: .9, ei: 1.1, frame: '#c4c8cc', wingSurf: { chord: [.1, .26, .44, .62, .78], rib: 1.45, tilt: .03, tone: .035, rvar: .05, rivet: [.035, .008], le: [.05, '#dde0e3', .1, 1] }, cabin: .3 },
    canopy: [{ loft: [[3.4, 2.38, 2.25, 0, 2.3], [3.94, 2.78, 2.3, .6, 2.45], [4.34, 2.99, 2.35, .66, 2.55], [5.95, 2.99, 2.35, .66, 2.55], [7.08, 2.66, 2.35, .45, 2.45], [7.3, 2.6, 2.35, 0, 2.4]], frames: [3.94, 4.34, 4.8, 5.3, 5.95, 6.5, 7.0], rows: [.25, .55], part: 'nose' }],
    domes: [{ x: 7.1, h: 2.62, r: .22, part: 'mid' }],
    wing: { pf: [[.6, 7.10, 11.77], [4.5, 7.10, 11.77], [8, 7.57, 11.48], [10, 7.84, 11.31], [12, 8.11, 11.15], [14.7, 8.48, 10.92]], tip: [15.545, 9.7], h: 1.55, dih: [[0, 0], [4.5, 6]], tc: [[0, .18], [4.5, .17], [15, .12]], tw: [[0, 3], [15, 0]], cam: .03, flap: [[.9, 8.1, .25, 'split']], ail: [[8.1, 13.1, -.56]] },
    fins: [{ egg: [19.06, 20.88, .29, 4.23, 2.45, 4.86], n: 22, sq: 2.4, sqT: 2.8, t: .12, rud: [[0, 19.9], [4, 19.9]], capA: true }, { egg: [19.06, 20.88, .29, 4.23, 2.45, -4.86], n: 22, sq: 2.4, sqT: 2.8, t: .12, rud: [[0, 19.9], [4, 19.9]], capA: true }],
    stab: { pf: [[.3, 18.97, 21.05], [4.9, 18.97, 21.05], [5.03, 19.0, 21.0]], h: 1.38, dih: 0, tc: [[0, .11]], cam: 0, elev: [.5, 4.75], hinge: [[0, 19.99], [5.03, 19.99]] },
    engine: 'inline', engines: [{ x: 4.57, h: 1.05, w: 3.6 }, { x: 4.57, h: 1.05, w: -3.6 }, { x: 5.22, h: 1.37, w: 7.8, nl: 'loftO' }, { x: 5.22, h: 1.37, w: -7.8, nl: 'loftO' }],
    inline: {
      loft: [[.05, .40, -.40, .40, 0, 2, 2], [.2, .45, -.47, .46, -.02, 2, 2], [.3, .48, -.52, .5, -.04, 2.1, 2.1], [.355, .495, -.55, .51, -.06, 2.1, 2.1], [.365, .5, -.86, .51, -.14, 2.1, 2.3], [0.8, .51, -.93, .525, -.17, 2.2, 2.4], [1.4, .53, -.95, .535, -.19, 2.2, 2.5], [2, .6, -.95, .54, -.19, 2.2, 2.5], [2.55, .8, -.98, .55, -.18, 2.3, 2.6], [3.1, .84, -.96, .55, -.15, 2.4, 2.8], [4.2, .76, -.94, .55, -.12, 2.6, 3], [5.7, .58, -.86, .54, -.1, 2.6, 3], [6.7, .45, -.62, .46, -.05, 2.4, 2.6], [7.3, .3, -.3, .28, 0, 2.2, 2.2], [7.55, .12, -.04, 0, .04]],
      loftO: [[.05, .40, -.40, .40, 0, 2, 2], [.2, .45, -.47, .46, -.02, 2, 2], [.3, .48, -.52, .5, -.04, 2.1, 2.1], [.355, .495, -.55, .51, -.06, 2.1, 2.1], [.365, .5, -.86, .51, -.14, 2.1, 2.3], [0.8, .51, -.93, .525, -.17, 2.2, 2.4], [1.4, .53, -.94, .535, -.19, 2.2, 2.5], [1.9, .6, -.93, .54, -.19, 2.2, 2.5], [2.33, .8, -.94, .55, -.18, 2.3, 2.6], [3, .82, -.88, .54, -.15, 2.4, 2.8], [3.8, .7, -.68, .48, -.1, 2.4, 2.6], [4.5, .5, -.28, .3, 0, 2.2, 2.2], [4.88, .34, .12, 0, .22]],
      us: [.37, 1.2, 2.01, 2.33, 3.8, 5.4], rad: [.7, .48, .37, -.71], spinner: [.78, .62, .2, .75], exh: { x: .35, l: 1.46, h: .3, y: .05, z: .532 }, cowlC: '#c3c7cb', cowlR: .2,
    },
    prop: { d: 3.96, n: 3, hub: .2, chord: [.13, .28, .35, .15], pitch: [42, 18], col: '#101215', tipC: '#e3b31e', tip: .07, metal: .2, rough: .5 },
    gear: [
      { id: 'm', p: [7.35, .85, 3.62], w: true, axis: 'z', ang: -95, rake: 3, len: 2.05, tele: .82, twin: .33, wh: { D: 1.68, W: .47, n: 1 }, oleo: .085, axle: 1, brace: [-28, 0],
        doors: [{ x: 8.55, h: .12, w: 4.16, l: 3.1, wd: .52, to: -1, ang: -92 }, { x: 8.55, h: .12, w: 3.08, l: 3.1, wd: .52, to: 1, ang: 92 }] },
      { id: 't', p: [19.3, .85, 0], axis: 'z', ang: 0, rake: -15, len: .76, wh: { D: .6, W: .18, n: 1 }, oleo: .05, fork: 1, fixed: 'aft' },
    ],
    land: [[8.0, 1.2, 5.5, .5]], tailLight: [22.7, 1.4, 0],
  },
  b24: {
    length: 20.47, span: 33.53, dia: 2.1, y0: 1.55, hullLen: 20.22, ringN: 36, hullStep: .2, engineKind: 'radial', vintage: true, twinFin: true, nU: 2.4, nL: 3,
    loft: [[0, 2.03, 2.03, 0, 2.03, 2, 2], [.1, 2.23, 1.68, .16, 1.95, 2, 2], [.25, 2.33, 1.18, .30, 1.75, 2, 2.2], [.5, 2.40, .73, .42, 1.55, 2.1, 2.5], [1.0, 2.45, .36, .60, 1.45], [2.0, 2.58, .25, .81, 1.35], [3.0, 2.68, .17, .95, 1.30], [3.6, 3.10, .13, .99, 1.28], [4.0, 3.15, .11, 1.01, 1.27], [5.0, 3.17, .07, 1.06, 1.25], [6.0, 3.15, .03, 1.10, 1.25], [7.0, 3.12, .02, 1.13, 1.25], [8.0, 3.12, 0, 1.13, 1.25], [9.0, 3.07, 0, 1.13, 1.25], [10.0, 3.05, .03, 1.13, 1.28], [11.0, 3.02, .08, 1.08, 1.30], [12.0, 3.00, .13, 1.00, 1.35], [13.0, 2.97, .25, .95, 1.45], [14.0, 2.94, .35, .90, 1.55], [16.0, 2.88, .61, .78, 1.75], [18.0, 2.79, .93, .66, 1.85], [19.0, 2.71, 1.11, .55, 1.90], [20.0, 2.71, 1.34, .35, 2.00], [20.22, 2.40, 1.60, 0, 2.00]],
    skin: { fp: .5, fk: 3, sp: .7, tilt: .04, tone: .035, rvar: .08, f0: .8, rivet: [.04, .01], rk: .4, rivetC: 'rgba(24,24,14,.32)', seamC: 'rgba(24,23,14,.42)' },
    paint: { base: '#5a5638', rough: .64, fabric: { col: '#5f5a3d', colLow: '#888c90', rough: .75, rib: .3, sag: .06, ribC: 'rgba(255,255,230,.06)' }, wing: '#5a5638', wingLow: '#8c9094', wingR: .66, wingLowR: .58, fin: '#5a5638', finR: .64, stab: '#5a5638', stabLow: '#8c9094', cowl: '#5a5638', nacBody: '#5a5638', frame: '#3f3d2a', door: '#8c9094', strut: 0x9da1a3, ei: .75, nScale: .7, wingSurf: { chord: [.12, .3, .5, .68], rib: 1.6, tilt: .035, tone: .05, rvar: .1, rivet: [.05, .01], rivetC: 'rgba(20,20,12,.32)', seam: 'rgba(25,25,15,.42)' }, cabin: .15 },
    canopy: [{ loft: [[0, 2.03, 2.03, 0, 2.03, 2, 2], [.1, 2.23, 1.68, .16, 1.95, 2, 2], [.25, 2.33, 1.18, .30, 1.75, 2, 2.2], [.5, 2.40, .73, .42, 1.55, 2.1, 2.5], [.85, 2.45, .42, .57, 1.47, 2.3, 2.9]], inf: .012, frames: [.14, .42, .84], thin: [.62], rows: [.2, .44, [.64, .32, .85]], rowW: 9, fw: .055, solid: [[.84, 1]], fc: '#4a4733', glass: ['#3a4146', '#1d2326', '#111517'], inside: 26, part: 'nose' }],
    domes: [{ x: 5.48, h: 3.08, r: .56, sy: .8, guns: [.26, -.26], gy: .25, ga: 0, part: 'mid' }, { x: 1.34, h: 2.42, r: .3, sy: .55, part: 'nose' }],
    wing: { pf: [[.6, 6.18, 10.38], [1.25, 6.21, 10.25], [2, 6.27, 10.08], [4, 6.35, 9.93], [6, 6.50, 9.74], [8, 6.63, 9.55], [10, 6.66, 9.37], [12, 6.84, 9.16], [14, 6.94, 8.94], [16, 7.08, 8.67]], tip: [16.77, 7.75], h: 2.45, dih: 2.3, tc: [[0, .17], [16, .09]], tw: [[0, 4], [16, 1]], cam: .03, flap: [[1.25, 9.72, .2]], fowler: .2, flapMax: 30, ail: [[9.72, 15.99, .2]] },
    fins: [{ egg: [16.71, 19.61, 1.24, 4.81, 3.05, 3.96], n: 24, sq: 2.7, t: .11, rud: [[0, 18.6], [4, 18.6]], capA: true }, { egg: [16.71, 19.61, 1.24, 4.81, 3.05, -3.96], n: 24, sq: 2.7, t: .11, rud: [[0, 18.6], [4, 18.6]], capA: true }],
    stab: { pf: [[.3, 17.04, 19.31], [3.96, 17.04, 19.31]], h: 2.73, dih: 0, tc: [[0, .11]], cam: 0, elev: [.4, 3.85], hinge: [[0, 18.25], [4, 18.25]] },
    engine: 'radial', engines: [{ x: 4.64, h: 2.18, w: 3.38 }, { x: 4.64, h: 2.18, w: -3.38 }, { x: 4.87, h: 2.31, w: 7.80 }, { x: 4.87, h: 2.31, w: -7.80 }],
    radial: { od: 1.57, open: 1.12, face: [[-.08, .56], [-.025, .575], [0, .61], [-.012, .645], [-.035, .69], [-.06, .745], [-.1, .778], [-.16, .785]], lip: .085, len: .6, cowlAt: .2, inner: .3, engR: .61, r0: .24, cyl: 7, rows: 2, cylD: .16, hub: [.4, .3], oval: .78, ovalIn: .97, sq: 2.5, slots: [.702, .1, 60], cowlC: '#5a5638', cowlR: .66, cowlM: 0, prof: [[-.6, .785], [-.8, .78]], cylC: 0x4a4d50, hubC: 0x6a6d70, hubR: .4, hubM: .7, dome: .22, clamp: .06 },
    nac: [[.75, .615, -.615, .785, 0, 2.5, 2.5], [1.15, .65, -.67, .78, -.02, 2.4, 2.4], [1.72, .8, -.68, .77, -.05], [2.6, .84, -.62, .72, -.08, 2.4], [3.2, .7, -.5, .62, -.1, 2.4], [3.9, .5, -.36, .46, -.1], [4.5, .3, -.2, .26, -.05], [4.9, .15, -.05, 0, .05]],
    nacP: { base: '#5a5638', rough: .64, metal: 0, tilt: .03, tone: .06, rivet: .06, rivetC: 'rgba(20,20,12,.25)', seam: 'rgba(25,25,15,.4)', us: [1.15, 1.72, 2.6, 3.9], vs: [.2, .38, .62, .8], gills: [.8, 1.35, 10], low: [.13, '#8c9094', .55], fade: ['rgb(120,112,80)', 'rgb(52,50,34)'], soot: .3, sootX: 1.6, belly: [3.3, .5], ns: .5 },
    prop: { d: 3.53, n: 3, hub: .22, chord: [.13, .24, .45, .14], pitch: [40, 16], col: '#15161a', tipC: '#e3b31e', tip: .09, metal: .2, rough: .55 },
    gear: [
      { id: 'm', p: [7.95, 2.23, 4.25], w: true, axis: 'x', ang: -88, rake: 9.7, len: 2.2, wh: { D: 1.44, W: .41, n: 1 }, oleo: .1, axle: 1, torque: 1 },
      { id: 'n', p: [3.07, .45, 0], axis: 'z', ang: -88, len: .72, tele: .85, wh: { D: .79, W: .25, n: 1 }, oleo: .07, fork: 1, torque: 1, doors: [{ x: 3.75, h: .1, w: .28, l: 1.4, wd: .28, to: -1, ang: -85 }, { x: 3.75, h: .1, w: -.28, l: 1.4, wd: .28, to: 1, ang: 85 }] },
    ],
    land: [[6.3, 2.4, 10.5, .5]], tailLight: [20.3, 2.0, 0],
  },
  tbm: {
    length: 12.48, span: 16.51, dia: 1.75, y0: 1.05, hullLen: 11.6, ringN: 36, hullStep: .1, engineKind: 'radial', vintage: true, openFront: true, nU: 2.4, nL: 2.8,
    loft: [[.65, 1.75, .40, .70, 1.06, 2, 2], [1.0, 1.95, .21, .78, 1.06, 2.1, 2.2], [1.5, 2.08, .05, .80, 1.06, 2.3, 2.6], [2.0, 2.16, 0, .80, 1.05, 2.6, 3.4], [2.5, 2.22, 0, .80, 1.10, 3, 4], [2.85, 2.24, 0, .78, 1.15, 3.4, 4.2], [3.5, 2.16, 0, .77, 1.10, 4, 4.4], [5.0, 2.15, 0, .78, 1.10, 4, 4.4], [6.0, 2.15, 0, .79, 1.10, 4, 4.2], [6.5, 2.15, 0, .80, 1.15, 4, 3.8], [7.0, 2.13, 0, .79, 1.20, 3.6, 3.2], [7.5, 2.1, .02, .76, 1.25, 3.2, 2.8], [8.0, 2.02, .07, .72, 1.25, 2.8, 2.6], [8.5, 1.92, .14, .67, 1.25, 2.6, 2.4], [8.85, 1.84, .22, .63, 1.25, 2.5, 2.3], [9.18, 1.77, .68, .58, 1.30], [9.55, 1.69, .75, .52, 1.28], [10.0, 1.5, .85, .46, 1.20], [10.5, 1.41, .93, .38, 1.18], [11.0, 1.37, 1.01, .28, 1.18], [11.6, 1.32, 1.14, .14, 1.23]],
    skin: { fp: .5, fk: 1, sp: .5, wave: .04, tilt: .055, tone: .02, rvar: .05, f0: 1.2, rivet: [.035, .008], rk: .45, rivetC: 'rgba(14,18,26,.35)', seamC: 'rgba(10,14,22,.45)' },
    paint: { env: 's', base: '#172030', rough: .4, fabric: { col: '#19222f', colLow: '#d2d5d6', rough: .5, rib: .2, sag: .06, ribC: 'rgba(255,255,255,.05)' }, wing: '#172030', wingLow: '#d3d6d6', wingR: .4, wingLowR: .42, fin: '#172030', finR: .42, stab: '#172030', stabLow: '#d3d6d6', cowl: '#172030', frame: '#182131', door: '#d9dcdd', strut: 0xc9cccd, ei: .62, nScale: .7, wingSurf: { chord: [.12, .3, .5, .7], rib: .9, tilt: .03, tone: .02, rvar: .05, rivet: [.035, .008], rivetC: 'rgba(14,18,26,.3)', seam: 'rgba(10,14,22,.4)' }, cabin: .1 },
    canopy: [{ loft: [[2.85, 2.29, 2.1, .4, 2.12], [3.11, 2.66, 2.1, .46, 2.12], [3.43, 2.91, 2.1, .5, 2.13], [5.98, 2.86, 2.1, .5, 2.13], [6.12, 2.66, 2.1, .45, 2.12], [6.22, 2.3, 2.1, 0, 2.12]], nU: 2.5, capS: 1, frames: [3.11, 3.44, 4.13, 4.8, 5.4, 5.98], thin: [4.47, 5.1, 5.7], rows: [.29, .63], rowW: 9, fw: .06, glass: ['#353d44', '#1c2228', '#0e1215'], inside: 14, part: 'mid', fc: '#182131' }],
    wing: { pf: [[.5, 2.83, 6.51], [2.18, 2.86, 6.49], [3.50, 3.05, 6.21], [5.62, 3.38, 5.76], [8.06, 3.76, 5.24], [8.2, 3.84, 5.15]], tip: [8.255, 4.3], h: 1.17, dih: [[0, 0], [2.18, 5.5]], tc: [[0, .15], [8, .09]], tw: [[0, 2.3], [8, 0]], cam: .02, flap: [[2.04, 5.66, .2, 'split']], ail: [[5.66, 8.06, .2]] },
    fin: { base: 2.0, st: [[-.55, 10.05, 12.38, .15], [0, 10.13, 12.36, .14], [.31, 10.25, 12.32, .125], [.8, 10.43, 12.24, .112], [1.3, 10.62, 12.14], [1.7, 10.77, 12.04], [1.9, 10.87, 11.97], [2.02, 10.97, 11.91], [2.1, 11.07, 11.82], [2.15, 11.18, 11.7], [2.17, 11.32, 11.5]], t: .1, rud: [[-.55, 11.30], [2.02, 11.39]], rudS: [-.45, 2.06] }, finSplit: .3,
    stab: { pf: [[.04, 10.26, 11.5], [.75, 10.38, 12.44], [2.68, 10.74, 11.95]], tip: [3.17, 11.17], h: 2.06, dih: 0, tc: [[0, .1]], cam: 0, elev: [.3, 2.95], hinge: [[0, 11.19], [3, 11.32]] },
    engine: 'radial', engines: [{ x: .45, h: 1.06, w: 0 }],
    radial: { od: 1.42, open: 1.22, lip: .05, len: .5, cowlAt: .17, inner: .35, engR: .62, cyl: 7, rows: 2, cylD: .23, rowK: .8, hub: [.33, .32], dome: .21, exh: [1.3, -.45, .74, .2, .3], exhK: 'stub', cylC: 0x4a4d50, cowlC: '#172030', cowlR: .33, cowlM: 0, prof: [[-.3, .712], [-.45, .717], [-.6, .74]], hubC: 0x3e4144, hubR: .42, hubM: .6, clamp: .055, cres: [.58, .13, 50, 1], seams: [.5], baffle: [-.52, .82, .76] },
    prop: { d: 3.96, n: 3, hub: .2, chord: [.15, .36, .4, .22], pitch: [40, 18], col: '#141518', tipC: '#e3b31e', tip: .07, metal: .2, rough: .5 },
    gear: [
      { id: 'm', p: [3.45, .85, 1.14], w: true, axis: 'x', ang: -80, rake: -12, len: 1.72, wh: { D: .864, W: .25, n: 1 }, oleo: .075, axle: 1, torque: 1, brace: [0, -40], legDoor: [0, -.8, -.11, .46, 1.25] },
      { id: 't', p: [9.95, .7, 0], axis: 'z', ang: -80, rake: -20, len: .6, wh: { D: .3, W: .1, n: 1 }, oleo: .03, fork: 1 },
    ],
    land: [[3.0, .9, 4.0, .45]], tailLight: [11.6, 1.23, 0],
  },
  pbm: {
    length: 24.33, span: 35.97, dia: 2.9, y0: 2.1, hullLen: 24.33, ringN: 38, hullStep: .2, engineKind: 'radial', vintage: true, twinFin: true, gearExposed: false,
    loft: [[0, 2.77, 2.45, 0, 2.60, 2, 2], [.15, 3.05, 1.85, .45, 2.3, 2, 1.8], [.35, 3.2, 1.35, .66, 1.75, 2.1, 1.4], [.6, 3.27, .95, .8, 1.42, 2.3, 1.2], [1.0, 3.33, .6, .9, 1.31, 2.5, 1.15], [1.5, 3.40, .34, .99, 1.15, 2.6, 1.15], [2.0, 3.48, .19, 1.05, 1.00, 2.6, 1.15], [3.0, 4.08, .04, 1.19, .78, 2.6, 1.15], [4.0, 4.13, 0, 1.28, .65, 2.6, 1.15], [5.0, 4.12, 0, 1.36, .54, 2.6, 1.15], [6.0, 4.14, 0, 1.41, .50, 2.6, 1.15], [7.0, 4.15, 0, 1.43, .46, 2.6, 1.15], [10.18, 4.18, 0, 1.43, .44, 2.6, 1.15], [10.2, 4.18, .16, 1.43, .68, 2.6, 1.2], [12.1, 4.20, .41, 1.30, 1.06, 2.5, 1.3], [14.0, 4.21, .64, 1.13, 1.29, 2.4, 1.35], [16.0, 4.14, .85, 1.05, 1.35, 2.3, 1.4], [18.0, 4.31, 1.15, .92, 1.27, 2.2, 1.5], [18.43, 4.40, 1.29, .88, 1.29, 2.2, 1.6], [18.7, 4.45, 2.22, .86, 2.9, 2.2, 2], [19.05, 4.53, 2.42, .84, 3.2, 2.1, 2], [20.0, 4.73, 2.74, .77, 3.6, 2, 2], [21.0, 4.99, 3.05, .68, 4.0, 2, 2], [22.0, 5.34, 3.35, .62, 4.3, 2, 2], [23.0, 5.69, 3.65, .53, 4.65, 2, 2], [24.0, 5.20, 3.95, .41, 4.6, 2, 2], [24.33, 4.83, 4.10, .30, 4.5, 2, 2]],
    skin: { fp: .32, fk: 3, sp: .7, wave: .045, tilt: .05, tone: .035, rvar: .05, f0: .8, rivet: [.035, .008], sub: true, rk: .45, rivetC: 'rgba(14,18,26,.26)', rivetC2: 'rgba(14,18,26,.15)', seamC: 'rgba(10,14,22,.36)' },
    paint: { base: '#1d2639', rough: .26, fabric: { col: '#1f283b', colLow: '#c6cacb', colLowW: '#1f283b', rough: .38, rib: .3, sag: .06, ribC: 'rgba(255,255,255,.05)' }, wing: '#1d2639', wingLow: '#1d2639', wingR: .28, fin: '#1d2639', finR: .28, stab: '#1d2639', stabLow: '#c0c4c3', cowl: '#1d2639', nacBody: '#1d2639', frame: '#1e273b', float: '#c0c4c3', floatR: .46, strut: 0x8c9094, ei: 1, nScale: .7, wingSurf: { chord: [.12, .3, .5, .7], rib: 1.2, tilt: .045, tone: .02, rvar: .05, rivet: [.04, .009], rivetC: 'rgba(14,18,26,.3)', seam: 'rgba(10,14,22,.4)' }, cabin: .1 },
    domes: [{ x: .4, h: 3.0, r: .55, sx: 1.2, part: 'nose', guns: [.2, -.2], gy: .1, ga: 180, fr: 4 }, { x: 14.1, h: 4.15, r: .5, part: 'aft', guns: [.15, -.15], gy: .2, ga: 180, fr: 3 }, { x: 23.75, h: 4.55, r: .45, sx: 1.2, full: true, part: 'aft', guns: [.15, -.15], ga: 0, fr: 3 }, { x: 5.0, h: 4.05, r: .5, sx: 2.7, sy: .9, part: 'nose' }],
    wing: { pf: [[.5, 7.75, 13.35], [1.41, 7.81, 13.20], [4.64, 7.95, 12.42], [8, 8.12, 11.91], [12, 8.31, 11.31], [16, 8.51, 10.70], [16.93, 8.56, 10.56]], tip: [17.985, 9.6], hs: [[.5, 3.58], [1.2, 3.7], [4.6, 4.85], [12, 5.02], [17.9, 5.15]], tc: [[0, .17], [4.6, .16], [17, .1]], tw: [[0, 3], [17, 1]], cam: .03, flap: [[1.5, 3.0, .22], [4.64, 11.57, .22]], ail: [[11.57, 16.93, .14]] },
    floats: [{ w: 12.47, loft: [[6.62, 2.14, 1.98, 0, 2.04, 2.4, 1], [6.9, 2.36, 1.72, .3, 1.84, 2.6, 1], [7.5, 2.46, 1.56, .44, 1.73, 2.8, 1], [8.4, 2.46, 1.52, .455, 1.69, 2.8, 1], [9.58, 2.45, 1.53, .45, 1.7, 2.8, 1], [9.62, 2.45, 1.71, .44, 1.87, 2.8, 1], [10.2, 2.36, 1.83, .32, 1.95, 2.6, 1], [10.6, 2.2, 1.9, .15, 1.99, 2.4, 1], [10.83, 2.03, 1.95, 0, 1.99, 2.2, 1]], struts: [[[8.71, 4.86], [7.67, 2.49]], [[8.71, 4.86], [9.55, 2.32]], [[10.18, 4.76], [9.60, 2.32]], [[8.9, 4.86, 10.85], [8.6, 2.4, 12.2]], [[10.0, 4.8, 10.9], [9.2, 2.38, 12.25]]] }],
    fins: [{ egg: [20.78, 23.35, 4.18, 8.41, 5.35, 4.62, -15], n: 22, sqT: 2.05, t: .14, rud: [[0, 22.14], [4.3, 22.3]], capA: true }, { egg: [20.78, 23.35, 4.18, 8.41, 5.35, -4.62, 15], n: 22, sqT: 2.05, t: .14, rud: [[0, 22.14], [4.3, 22.3]], capA: true }],
    stab: { pf: [[.5, 20.5, 22.66], [1.7, 20.5, 23.3], [4.4, 20.5, 23.3]], h: 4.85, dih: 13, tc: [[0, .13]], cam: 0, elev: [.8, 4.3], hinge: [[0, 21.87], [4.4, 21.87]] },
    engine: 'radial', engines: [{ x: 5.58, h: 4.55, w: 3.60 }, { x: 5.58, h: 4.55, w: -3.60 }],
    radial: { od: 1.32, open: 1.2, lip: .07, len: 1.3, cowlAt: .26, inner: .32, engR: .64, cyl: 9, rows: 2, cylD: .17, hub: [.25, .45], cowlC: '#1d2639', cowlR: .26, cowlM: 0, prof: [[-.45, .74], [-.9, .783], [-1.56, .79]], hubC: 0xc8ccd0, hubR: .3, hubM: .9, cylC: 0x2e3033, seams: [.45] },
    nac: [[1.6, .79, -.8, .79, 0], [2.4, .93, -1.05, .87, -.1], [3.0, .88, -1.05, .87, -.15], [3.85, .5, -1.02, .86, -.25], [5.5, .1, -.96, .8, -.4], [7.0, -.22, -.95, .66, -.58], [7.6, -.4, -.92, .4, -.65], [7.9, -.55, -.85, 0, -.7]],
    nacP: { base: '#1d2639', rough: .26, metal: 0, tilt: .045, tone: .02, rivet: .045, rivetC: 'rgba(14,18,26,.3)', seam: 'rgba(10,14,22,.45)', us: [1.95, 2.4, 3.85, 5.5], vs: [.18, .36, .64, .82], gills: [1.6, 1.95, 16], soot: .32, sootX: 2.0, ns: .6 },
    prop: { d: 4.47, n: 4, hub: .2, chord: [.15, .30, .45, .2], pitch: [42, 16], col: '#15161a', tipC: '#e3b31e', tip: .07, metal: .2, rough: .5 },
    gear: [],
    tailLight: [24.3, 4.5, 0],
  },
  a330: { strobe2: true,
    length: 59.0, span: 60.3, dia: 5.64, hullLen: 57.51, ringN: 48, hullStep: .45, fine: [[.9, 3.6, .08]], hullTex: 1, splits: [17.7, 36.6],
    loft: [[0, -.5, -.5, 0, -.5, 2, 2.2], [.25, .14, -.82, .45, -.34, 2, 2.2], [.54, .40, -1.05, .64, -.32, 2, 2.2], [1.07, .66, -1.35, .95, -.33, 2, 2.2], [1.61, 1.12, -1.60, 1.22, -.24, 2, 2.2], [2.14, 1.55, -1.78, 1.44, -.12, 2, 2.15], [2.68, 1.81, -1.96, 1.62, -.08, 2, 2.1], [3.22, 2.01, -2.11, 1.80, -.05], [4.29, 2.28, -2.35, 2.11, -.03], [5.36, 2.50, -2.56, 2.39, -.03], [7.5, 2.76, -2.77, 2.68, 0], [8.58, 2.81, -2.82, 2.74, 0], [10.7, 2.82, -2.82, 2.82, 0], [38.6, 2.82, -2.82, 2.82, 0], [40.7, 2.82, -2.62, 2.70, .10], [42.9, 2.82, -2.31, 2.57, .26], [45.0, 2.81, -1.88, 2.37, .47], [47.2, 2.82, -1.37, 2.11, .72], [49.3, 2.82, -.78, 1.80, 1.02], [51.5, 2.80, -.06, 1.42, 1.37], [53.6, 2.76, .66, 1.06, 1.70], [55.7, 2.65, 1.24, .71, 1.95], [56.8, 2.52, 1.62, .54, 2.07], [57.51, 2.45, 2.05, .30, 2.25]],
    skin: { seamC: 'rgba(60,66,72,.24)', fp: .533, fk: 4, sp: 1.5, tilt: .028, tone: .03, rvar: .08, patch: .04, f0: 1.65 },
    paint: { base: '#f3f4f2', rough: .3, wing: '#8f9392', wingLow: '#adb1b4', wingR: .4, wingLowR: .45, fin: '#f3f4f2', stab: '#f1f2f0', stabLow: '#c6c9ca', nac: '#f1f2f0', pylon: '#eceeed', fair: '#eceeec', cabin: .5, stabLE: [.03, '#cdd0d2', .38, .45], wingSurf: { le: [.025, '#bcc0c3', .4, .3], chord: [.1, .2, .3, .42, .54, .66, .78], rib: 5.5, fr: .6, tilt: .06, tone: .065, rvar: .08, weather: .07, rivet: [.03, .01], rivetC: 'rgba(36,40,46,.24)', seam: 'rgba(40,46,52,.45)' }, hub: 0xa8acaf },
    wing: { pf: [[1.0, 18.35, 29.95], [2.84, 19.5, 30.06], [9.09, 23.41, 30.76], [29.15, 35.96, 38.42]], h: -1.45, dih: 6, tc: [[0, .155], [2.84, .15], [9.09, .115], [29.15, .105]], tw: [[0, 2.5], [2.84, 2.5], [29.15, -2.5]], cam: .022,
      wl: { dy: 1.0, rise: 1.82, x: 38.49, c: .55, t: .09, rho: .45 },
      slat: [[3.7, 9.0], [9.6, 12.6], [12.6, 16.1], [16.1, 19.1], [19.1, 22.4], [22.4, 25.7], [25.7, 28.8]], slatC: .12,
      flap: [[3.2, 9.1, .30], [9.4, 19.8, .30]], flapMax: 32, fowler: .2,
      ail: [[20.0, 23.8, .24], [23.9, 28.0, .24]],
      spl: [[9.5, 19.5, .15, 6, .30], [4.6, 7.8, .15, 1, .30]],
      ftf: [7.46, 10.88, 14.21, 17.65], ftfL: .5, ftfP: .95, ftfD: .72, ftfW: .5 },
    fair: [[16.4, -2.35, -2.66, 0, -2.5, 2, 2.2], [17.8, -1.85, -2.98, 1.85, -2.35, 2.3, 2.4], [20, -1.6, -3.16, 2.45, -2.3, 2.5, 2.6], [23, -1.5, -3.24, 2.6, -2.3, 2.6, 2.7], [29.5, -1.5, -3.24, 2.6, -2.3, 2.6, 2.7], [32.5, -1.65, -3.12, 2.35, -2.4, 2.5, 2.6], [35.7, -2.4, -2.8, 0, -2.6, 2, 2]],
    fin: { base: 2.82, st: [[-.9, 47.6, 55.37], [0, 47.09, 55.67], [.18, 47.8, 55.73], [.42, 48.5, 55.8], [.8, 49.08, 55.94], [9.3, 56.21, 59.0]], t: .11, rud: [[0, 52.97], [9.3, 57.94]], rudS: [.1, 9.05] },
    finSplit: 2.8,
    stab: { pf: [[.5, 49.3, 55.4], [1.56, 49.92, 55.56], [9.70, 56.36, 58.37]], h: .76, dih: 5.5, tc: [[0, .11]], cam: 0, elev: [1.75, 9.55], hinge: [[1.56, 54.46], [9.7, 57.62]] },
    engine: 'fan', engines: [{ x: 17.94, h: -2.57, w: 9.37 }, { x: 17.94, h: -2.57, w: -9.37 }],
    fan: { hl: 2.60, fan: 2.44, fanAt: .95, prof: [[0, 2.60], [.7, 3.02], [1.53, 3.08], [3.07, 2.82], [4.44, 2.49], [4.76, 2.40]], core: [[4.9, 1.95], [5.84, 1.55], [6.28, 1.28]], plug: 7.95, blades: 34, wide: true, spin: .82, spinL: .78, lip: .22, joints: [1.53, 3.07, 4.44], pylon: { x0: 1.5, len: 8.2, w: .62, over: .5, endH: 1.1, drop: .25 } },
    gear: [
      { id: 'n', p: [6.3, -1.75, 0], axis: 'z', ang: 96, len: 3.85, tele: .72, wh: { D: 1.05, W: .395, n: 2, gap: .71 }, oleo: .1, axle: 1, brace: [0, -28], doors: [{ x: 6.2, h: -2.66, w: .44, l: 2.3, wd: .43, to: -1, ang: -88 }] },
      { id: 'm', p: [28.6, -1.95, 6.0], w: true, axis: 'x', ang: 86, rake: 9, len: 3.75, wh: { D: 1.40, W: .53, n: 2, gap: 1.397, ax: 2, pitch: 1.981, tilt: 14 }, oleo: .26, brace: [0, 30], legDoor: [0, -1.25, .36, 1.2, 2.1], torque: 1, doors: [{ x: 28.77, h: -3.22, w: 1.56, l: 3.96, wd: 1.42, to: 1, ang: 81, shut: true }] },
    ],
    land: [[20.0, -1.28, 3.6]], beacons: [19, 36], tailLight: [57.45, 2.3, 0], fillet: [[19.4, 0], [20.5, .3], [24, .45], [28, .5], [29.6, .35], [30.1, 0]],
  },
  electra: {
    twinFin: true, length: 11.76, span: 16.76, dia: 1.65, y0: .78, hullLen: 11.74, ringN: 48, hullStep: .1, hullTex: 1, hullTexN: 1.25, engineKind: 'radial', vintage: true, gearExposed: true,
    loft: [[0, .50, .50, 0, .50], [.25, .83, .23, .35, .48], [.5, .97, .12, .47, .50], [.75, 1.06, .06, .55, .52], [1.0, 1.09, .04, .60, .55, 2.1, 2.3], [1.37, 1.14, 0, .66, .58, 2.4, 2.6], [1.5, 1.38, 0, .68, .62, 2.6, 2.8], [1.75, 1.46, 0, .70, .68, 3, 3], [2.0, 1.51, 0, .70, .72, 3.2, 3.1], [3.0, 1.58, 0, .71, .78, 3.2, 3.1], [4.0, 1.59, 0, .71, .78, 3.2, 3.1], [5.0, 1.58, .04, .71, .80, 3.1, 3], [6.0, 1.57, .10, .68, .85, 3, 3], [7.0, 1.55, .19, .60, .88, 2.9, 2.9], [8.0, 1.52, .29, .51, .92, 2.7, 2.7], [9.0, 1.50, .42, .43, .97, 2.5, 2.5], [10.0, 1.60, .56, .33, 1.05, 2.3, 2.3], [10.5, 1.56, .64, .27, 1.10, 2.2, 2.2], [11.0, 1.53, .93, .16, 1.22, 2, 2], [11.74, 1.33, 1.33, 0, 1.33]],
    vee: [.44, 1.2, 1.33, 1.72, 1.9], fine: [[1.25, 2.0, .025]],
    skin: { frames: [.55, 1.0, 1.37, 1.75, 2.35, 3.16, 4.34, 5.35, 6.35, 7.34, 8.45, 9.6, 10.6], fp: .5, f0: .3, sp: .42, wave: .06, tilt: .08, tone: .08, rvar: .07, rivet: [.025, .0075], sub: true, rk: .6, seamC: 'rgba(40,46,52,.45)', rivetC: 'rgba(25,30,36,.32)' },
    paint: { metal: true, base: '#d6dadd', rough: .12, wing: '#d6d6d4', wingR: .21, wingM: .82, fin: '#d6d6d4', finM: .85, finR: .15, stab: '#d3d7da', nScale: 1, ei: 1.15, hub: 0xc0c4c8, exhaust: '#3a3c3e', door: '#d0d4d8', finLE: [.06, '#e4e7ea', .06, 1], stabLE: [.06, '#e4e7ea', .06, 1], wingSurf: { chord: [.12, .3, .62], rib: .75, rivet: [.03, .008], tilt: .028, tone: .03, rvar: .035, le: [.05, '#e3e6e9', .07, 1] }, cabin: .25 },
    wing: { pf: [[.3, 2.01, 5.59], [.7, 2.06, 5.53], [2.0, 2.22, 5.31], [4.46, 2.52, 4.92], [6.0, 2.73, 4.64], [7.7, 2.95, 4.35]], tip: [8.38, 3.45], h: .38, dih: 4, tc: [[0, .18], [8.4, .09]], tw: [[0, 4.5], [8.4, 1.5]], cam: .035,
      flap: [[.75, 4.4, .21, 'split']], ail: [[4.5, 7.7, -.42]], splitMax: 45 },
    fins: [{ egg: [10.22, 11.66, .85, 2.50, 1.35, 2.85], t: .11, rud: [[0, 10.98], [2, 10.98]], capA: true }, { egg: [10.22, 11.66, .85, 2.50, 1.35, -2.85], t: .11, rud: [[0, 10.98], [2, 10.98]], capA: true }],
    stab: { pf: [[.25, 9.62, 11.5], [.37, 9.67, 11.5], [2.84, 10.22, 11.38], [2.95, 10.27, 11.37]], tip: [3.26, 10.8], h: 1.6, dih: 0, tc: [[0, .1]], cam: 0, elev: [.45, 2.72], hinge: [[0, 10.81], [3.3, 10.81]] },
    engine: 'radial', engines: [{ x: .99, h: .28, w: 2.10 }, { x: .99, h: .28, w: -2.10 }],
    radial: { od: 1.42, open: 1.02, lip: .1, len: .65, cowlAt: .16, inner: .32, engR: .655, cyl: 9, cylD: .21, hub: [.2, .3], cw: true, prof: [[-.5, .712], [-.81, .705]], brushed: true, cowlC: '#c5c9cd', cowlR: .2, exh: [1.44, -.42, .52, .15, .36], seams: [.46] },
    nac: [[.77, .71, -.71, .705, 0], [1.01, .71, -.72, .69, -.01], [1.41, .69, -.72, .66, -.02], [1.81, .62, -.70, .6, -.06], [2.21, .52, -.66, .48, -.1], [2.47, .45, -.61, .36, -.13], [2.81, .3, -.52, .22, -.16], [3.11, .1, -.38, 0, -.16]],
    prop: { d: 2.70, n: 2, hub: .1, chord: [.1, .24, .65, .14], pitch: [40, 15], col: '#c3c7cb', tipC: '#c3c7cb', tip: 0, metal: .95, rough: .22, blurC: '#8f969d', fade: .08 },
    gear: [
      { id: 'm', p: [2.55, .65, 2.10], w: true, axis: 'z', ang: -59, rake: -8, len: 2.0, tele: .67, wh: { D: .85, W: .28, n: 1 }, oleo: .07, fork: 1, brace: [14, 0] },
      { id: 't', p: [10.95, .8, 0], axis: 'z', ang: 0, rake: -28, len: .45, wh: { D: .42, W: .13, n: 1 }, oleo: .035, fork: 1 },
    ],
    land: [[.12, .28, .24, .35]], fillet: [[3.0, 0], [3.6, .05], [4.3, .13], [5.0, .24], [5.5, .32], [5.85, 0]],
  },
};
SPECS.b747jal = { ...SPECS.b747, paint: { ...SPECS.b747.paint, base: '#f4f4f2', fin: '#f4f4f2', fair: '#8d9396', fairMetal: false, pylon: '#cfd2d3' } };
export const decodeSRGB = (m) => { m.onBeforeCompile = DEC; m.customProgramCacheKey = DECK; return m; };
export { clamp, lerp, sm, rng, hashS, cv, layer, tex, NRM, ORM, N0, rr, merge, lathe, sheet, geoOf, M4, QE, PHONE, TS };
