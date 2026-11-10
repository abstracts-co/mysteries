import * as THREE from 'three';
import { SPECS } from './aircraft.js';

const D2R = Math.PI / 180, TAU = Math.PI * 2, V3 = THREE.Vector3;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), lerp = (a, b, t) => a + (b - a) * t;
const nz = (v) => v != null && Number.isFinite(v), wrap = (a) => ((a % 360) + 360) % 360;
const PHONE = typeof navigator !== 'undefined' && (/iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900));
const TS = PHONE ? .6 : 1, FN = 'Arial, Helvetica, sans-serif', FNN = '"Arial Narrow", "Liberation Sans Narrow", "Roboto Condensed", Arial, sans-serif';
const pw = (p) => (v) => { if (v <= p[0][0]) return p[0][1]; for (let i = 1; i < p.length; i++) if (v <= p[i][0]) return lerp(p[i - 1][1], p[i][1], (v - p[i - 1][0]) / (p[i][0] - p[i - 1][0])); return p[p.length - 1][1]; };
const rng = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
const WH = '#ece8da', CR = '#d8d0b8', RED = '#c8201a', AMB = '#ffb21a', GRN = '#2df06a', CYA = '#2ee6ff', MAG = '#ff47f0', YEL = '#ffe81a';

function cv(w, h) { const c = document.createElement('canvas'); c.width = Math.max(2, Math.round(w)); c.height = Math.max(2, Math.round(h)); return c; }
function ctex(c) { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }
function T(g, s, x, y, px, col, al = 'center', wt = 600, f = FN) { g.font = `${wt} ${px}px ${f}`; g.fillStyle = col; g.textAlign = al; g.textBaseline = 'middle'; g.fillText(s, x, y); }
function ln(g, x0, y0, x1, y1, w, col) { g.strokeStyle = col; g.lineWidth = w; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
function circ(g, x, y, r, fill, stroke, w) { g.beginPath(); g.arc(x, y, Math.max(.1, r), 0, TAU); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke(); } }
function rr(g, x, y, w, h, r) { g.beginPath(); g.roundRect(x, y, w, h, r); }
function poly(g, pts, fill, stroke, w) { g.beginPath(); pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); if (fill) { g.fillStyle = fill; g.fill(); } if (stroke) { g.strokeStyle = stroke; g.lineWidth = w; g.stroke(); } }

let NOISE = null;
function noiseTile() {
  if (NOISE) return NOISE;
  const S = 256, G = 16, c = cv(S, S), g = c.getContext('2d'), im = g.createImageData(S, S), r = rng(11), grid = Array.from({ length: G * G }, r);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const gx = x / S * G, gy = y / S * G, ix = gx | 0, iy = gy | 0, fx = gx - ix, fy = gy - iy, sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy), q = (a, b) => grid[(b % G) * G + (a % G)];
    const v = lerp(lerp(q(ix, iy), q(ix + 1, iy), sx), lerp(q(ix, iy + 1), q(ix + 1, iy + 1), sx), sy) * .55 + r() * .45, i = (y * S + x) * 4;
    im.data[i] = im.data[i + 1] = im.data[i + 2] = v * 255; im.data[i + 3] = 255;
  }
  g.putImageData(im, 0, 0); return (NOISE = c);
}
function grainOver(g, w, h, a, op = 'overlay', sc = 1) {
  const p = g.createPattern(noiseTile(), 'repeat'); p.setTransform(new DOMMatrix([sc, 0, 0, sc, 0, 0]));
  g.save(); g.globalAlpha = a; g.globalCompositeOperation = op; g.fillStyle = p; g.fillRect(0, 0, w, h); g.restore();
}

const P = (S, ang, r) => { const a = (ang - 90) * D2R; return [S / 2 + Math.cos(a) * r * S, S / 2 + Math.sin(a) * r * S]; };
function dial(g, S, col = '#1c1c1c') { const c = S / 2; circ(g, c, c, S * .5, '#080808'); const gr = g.createRadialGradient(c, c * .82, S * .04, c, c, S * .47); gr.addColorStop(0, col); gr.addColorStop(.85, '#101010'); gr.addColorStop(1, '#040404'); circ(g, c, c, S * .47, gr); }
function tickAt(g, S, a, r0, r1, w, col) { const [x0, y0] = P(S, a, r0), [x1, y1] = P(S, a, r1); ln(g, x0, y0, x1, y1, w * S, col); }
function ticks(g, S, map, a, b, st, r0, r1, w, col) { for (let v = a; v <= b + 1e-9; v += st) tickAt(g, S, map(v), r0, r1, w, col); }
function nums(g, S, map, list, r, px, col, f = String, wt = 600, font = FN) { for (const v of list) { const [x, y] = P(S, map(v), r); T(g, f(v), x, y, px * S, col, 'center', wt, font); } }
function hand(g, S, ang, len, w, col, o = {}) {
  const c = S / 2, L = len * S, W = w * S, tl = (o.tail ?? .12) * S;
  g.save(); g.translate(o.cx ?? c, o.cy ?? c); g.rotate(ang * D2R); g.shadowColor = 'rgba(0,0,0,.65)'; g.shadowBlur = S * .02; g.shadowOffsetX = S * .01; g.shadowOffsetY = S * .014; g.fillStyle = col; g.beginPath();
  if (o.kind === 'bar') g.rect(-W / 2, -L, W, L + tl);
  else if (o.kind === 'wide') { g.moveTo(-W * .3, tl); g.lineTo(-W / 2, -L * .55); g.lineTo(0, -L); g.lineTo(W / 2, -L * .55); g.lineTo(W * .3, tl); }
  else { g.moveTo(-W / 2, tl); g.lineTo(-W * .42, -L * .78); g.lineTo(0, -L); g.lineTo(W * .42, -L * .78); g.lineTo(W / 2, tl); }
  g.fill(); if (o.ol !== false) { g.shadowColor = 'transparent'; g.lineWidth = S * .006; g.strokeStyle = 'rgba(0,0,0,.7)'; g.stroke(); } g.restore();
}
function hub(g, S, r, col = '#1e1e1e') { circ(g, S / 2, S / 2, r * S, col); circ(g, S / 2 - r * S * .3, S / 2 - r * S * .3, r * S * .35, 'rgba(255,255,255,.16)'); }
function barber(g, S, ang, len) { const c = S / 2; g.save(); g.translate(c, c); g.rotate(ang * D2R); g.fillStyle = '#f2f2f2'; g.fillRect(-S * .009, -len * S, S * .018, len * S * .75); g.fillStyle = RED; for (let i = 0; i < 7; i++) g.fillRect(-S * .009, -len * S + i * len * S * .11, S * .018, len * S * .055); g.restore(); }
function flag(g, x, y, w, h, txt, k = 'stripe', tc) {
  g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = h * .2; g.fillStyle = k === 'stripe' ? '#f2efe6' : k; g.fillRect(x, y, w, h); g.restore();
  if (k === 'stripe') { g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); g.fillStyle = RED; for (let i = -h; i < w + h; i += h * .9) poly(g, [[x + i, y + h], [x + i + h * .45, y + h], [x + i + h * .45 + h, y], [x + i + h, y]], RED); g.restore(); }
  if (txt) { if (k === 'stripe') { g.fillStyle = '#f2efe6'; const tw = h * .5 * txt.length + h * .3; g.fillRect(x + w / 2 - tw / 2, y + h * .14, tw, h * .72); } T(g, txt, x + w / 2, y + h / 2 + h * .03, h * .6, tc || (k === 'stripe' ? '#111' : '#fff'), 'center', 800); }
}
function glint(g, S, sq) {
  g.save(); g.beginPath(); if (sq) g.rect(0, 0, S, S); else g.arc(S / 2, S / 2, S * .48, 0, TAU); g.clip();
  const v = g.createRadialGradient(S / 2, S / 2, S * .3, S / 2, S / 2, S * .52); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.45)'); g.fillStyle = v; g.fillRect(0, 0, S, S);
  const l = g.createLinearGradient(S * .1, S * .02, S * .55, S * .62); l.addColorStop(0, 'rgba(255,255,255,.14)'); l.addColorStop(.5, 'rgba(255,255,255,.035)'); l.addColorStop(.51, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, S, S); g.restore();
}
function cwin(g, x, y, w, h) { g.fillStyle = '#020202'; rr(g, x, y, w, h, h * .12); g.fill(); g.strokeStyle = '#3a3a3a'; g.lineWidth = h * .07; g.stroke(); }
function roll(g, x, y, w, h, val, n, px, col, o = {}) {
  g.save(); g.beginPath(); g.rect(x, y, w, h); g.clip(); const cw = w / n;
  for (let i = 0; i < n; i++) {
    const p = 10 ** (n - 1 - i), d = Math.floor(val / p) % 10, last = i === n - 1, fr = last ? (val / p) % 1 : (Math.floor(val / p * 10) % 10 === 9 ? (val / p * 10) % 1 : 0), cx = x + cw * (i + .5), cy = y + h / 2;
    if (o.hatch && i === 0 && val < 10 ** (n - 1)) { g.fillStyle = o.hatch; for (let k = -2; k < 6; k++) poly(g, [[x + k * cw * .3, y + h], [x + k * cw * .3 + cw * .15, y + h], [x + k * cw * .3 + cw * .15 + h, y], [x + k * cw * .3 + h, y]], o.hatch); continue; }
    T(g, String(d), cx, cy + fr * h, px, col, 'center', 700, o.font || FN); T(g, String((d + 1) % 10), cx, cy + fr * h - h, px, col, 'center', 700, o.font || FN);
  }
  const sh = g.createLinearGradient(0, y, 0, y + h); sh.addColorStop(0, 'rgba(0,0,0,.7)'); sh.addColorStop(.3, 'rgba(0,0,0,0)'); sh.addColorStop(.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.7)'); g.fillStyle = sh; g.fillRect(x, y, w, h); g.restore();
}
const gauge = (face, dyn, o = {}) => ({ face, dyn, ...o });
const offCard = (g, S, x = .5, y = .64, t = 'OFF') => flag(g, S * (x - .11), S * (y - .05), S * .22, S * .1, t, RED);

const asiJ = pw([[30, -24], [60, 0], [100, 45], [140, 90], [200, 180], [250, 237], [300, 270], [350, 300], [400, 328], [450, 348]]);
function gAsiJ(vmo = 365, cnt = true, sm) {
  return gauge((g, S) => {
    dial(g, S); ticks(g, S, asiJ, 60, 250, 10, .405, .46, .008, WH); ticks(g, S, asiJ, 60, 240, 20, .365, .46, .013, WH); ticks(g, S, asiJ, 250, 450, 25, .405, .46, .008, WH); ticks(g, S, asiJ, 250, 450, 50, .365, .46, .013, WH);
    nums(g, S, asiJ, sm ? [80, 120, 160, 200, 250, 300] : [80, 120, 160, 200, 250, 300, 400], .3, sm ? .11 : .1, WH, String, 700, FNN);
    T(g, 'KNOTS', S * .5, S * .36, S * .055, CR); if (cnt) cwin(g, S * .34, S * .6, S * .32, S * .13);
  }, (g, S, st) => {
    barber(g, S, asiJ(vmo), .45); const v = st.ias;
    if (!nz(v)) { hand(g, S, asiJ(30), .42, .05, WH); flag(g, S * .32, S * .585, S * .36, S * .16, 'OFF', 'stripe'); }
    else { if (cnt) roll(g, S * .34, S * .6, S * .32, S * .13, Math.max(0, v), 3, S * .1, WH); hand(g, S, asiJ(clamp(v, 30, 450)), .42, .05, WH); }
    hub(g, S, .05);
  }, { sb: sm });
}
function gAltJ(hatch = '#e8e8e8', sm) {
  return gauge((g, S) => {
    dial(g, S); for (let i = 0; i < 50; i++) tickAt(g, S, i * 7.2, i % 5 ? .42 : .37, .46, i % 5 ? .008 : .014, WH);
    nums(g, S, (v) => v * 36, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], .315, sm ? .12 : .115, WH, String, 700, FNN);
    cwin(g, S * .22, S * .37, S * .56, S * .17); if (!sm) { cwin(g, S * .17, S * .69, S * .25, S * .09); cwin(g, S * .58, S * .69, S * .25, S * .09); T(g, 'MB', S * .29, S * .82, S * .045, CR); T(g, 'IN', S * .7, S * .82, S * .045, CR); }
  }, (g, S, st) => {
    if (!sm) { T(g, '1013', S * .295, S * .735, S * .065, WH, 'center', 600); T(g, '29.92', S * .705, S * .735, S * .065, WH, 'center', 600); }
    const a = st.altFt;
    if (!nz(a)) { hand(g, S, 0, .43, .045, WH); flag(g, S * .2, S * .355, S * .6, S * .2, 'OFF', 'stripe'); }
    else { const v = Math.max(0, a); roll(g, S * .22, S * .37, S * .42, S * .17, v / 100, 3, S * .13, WH, { hatch }); T(g, '00', S * .71, S * .455, S * .085, WH, 'center', 700); hand(g, S, (v % 1000) * .36, .43, .045, WH); }
    hub(g, S, .05);
  }, { sb: sm });
}
const vsiF = pw([[0, 0], [500, 30], [1000, 54], [2000, 92], [4000, 135], [6000, 166]]), vsiM = (v) => 270 + Math.sign(v) * vsiF(Math.abs(v));
function gVsiJ(sq) {
  return gauge((g, S) => {
    if (sq) { g.fillStyle = '#4a4744'; g.fillRect(0, 0, S, S); } dial(g, S);
    for (const v of [500, 1000, 1500, 2000, 3000, 4000, 6000]) for (const s of [1, -1]) tickAt(g, S, vsiM(v * s), .37, .46, .014, WH);
    for (const v of [250, 750]) for (const s of [1, -1]) tickAt(g, S, vsiM(v * s), .41, .46, .008, WH);
    tickAt(g, S, 270, .34, .46, .018, WH); nums(g, S, vsiM, [0], .29, .1, WH);
    for (const [v, t] of [[500, '.5'], [1000, '1'], [2000, '2'], [4000, '4'], [6000, '6']]) for (const s of [1, -1]) { const [x, y] = P(S, vsiM(v * s), .29); T(g, t, x, y, S * .115, WH, 'center', 700, FNN); }
    T(g, 'UP', S * .3, S * .32, S * .055, CR); T(g, 'DN', S * .3, S * .68, S * .055, CR); T(g, 'VERT SPEED', S * .6, S * .42, S * .048, CR); T(g, '1000 FPM', S * .6, S * .58, S * .045, CR);
  }, (g, S, st) => { if (!nz(st.vs)) { hand(g, S, 270, .42, .045, WH); offCard(g, S, .62, .5); } else hand(g, S, vsiM(clamp(st.vs, -6600, 6600)), .42, .045, WH); hub(g, S, .05); }, { sq });
}
function attitude(g, S, cx, cy, R, p, r, o) {
  g.save(); g.beginPath(); if (o.box) g.roundRect(cx - o.box[0], cy - o.box[1], o.box[0] * 2, o.box[1] * 2, o.box[2]); else g.arc(cx, cy, R, 0, TAU); g.clip();
  g.translate(cx, cy); g.rotate(-r * D2R); const k = o.k ?? R * .022; g.translate(0, p * k);
  g.fillStyle = o.sky; g.fillRect(-S * 2, -S * 4, S * 4, S * 4); g.fillStyle = o.gnd; g.fillRect(-S * 2, 0, S * 4, S * 4);
  ln(g, -S * 2, 0, S * 2, 0, R * .03, o.hor || '#fff');
  for (let d = -40; d <= 40; d += o.st ?? 2.5) { if (!d) continue; const y = -d * k, big = d % 10 === 0, mid = d % 5 === 0, w = big ? R * .36 : mid ? R * .18 : R * .08; if (Math.abs(d) > (o.lim ?? 30)) continue; ln(g, -w, y, w, y, R * (big ? .022 : .016) * (o.lw ?? 1), o.lad || '#fff'); if (big && o.labels !== false) { T(g, String(Math.abs(d)), -w - R * .13, y, R * .13, o.lad || '#fff', 'center', 600, o.font); T(g, String(Math.abs(d)), w + R * .13, y, R * .13, o.lad || '#fff', 'center', 600, o.font); } }
  g.restore();
}
function bankScale(g, cx, cy, R, col, list = [10, 20, 30, 45, 60], w = .025) { for (const a of [0, ...list, ...list.map((x) => -x)]) { const t = (a - 90) * D2R, l = a % 30 === 0 ? R * .12 : R * .07; ln(g, cx + Math.cos(t) * R, cy + Math.sin(t) * R, cx + Math.cos(t) * (R + l), cy + Math.sin(t) * (R + l), R * w, col); } }
function gAdi(o = {}) {
  const sky = o.sky || '#6f9cbe', gnd = o.gnd || '#4a3423', sym = o.sym || '#ff9a2a';
  return gauge((g, S) => { dial(g, S, '#141414'); }, (g, S, st) => {
    const ok = nz(st.pitch) && nz(st.roll), p = ok ? clamp(st.pitch, -60, 60) : 0, r = ok ? st.roll : 0, c = S / 2, R = S * .35;
    attitude(g, S, c, c, R, p, r, { sky, gnd, lad: '#f0eee6', hor: '#f0eee6', k: R * .024, st: 5, lim: 30, lw: .85, font: FNN });
    g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip(); const sh = g.createRadialGradient(c - R * .3, c - R * .35, R * .05, c, c, R * 1.02); sh.addColorStop(0, 'rgba(255,255,255,.14)'); sh.addColorStop(.5, 'rgba(0,0,0,0)'); sh.addColorStop(.85, 'rgba(0,0,0,.3)'); sh.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = sh; g.fillRect(0, 0, S, S);
    g.translate(c, c); g.rotate(-r * D2R); poly(g, [[0, -R * .99], [-R * .07, -R * .85], [R * .07, -R * .85]], '#f4f2ea'); g.restore();
    circ(g, c, c, (R + S * .47) / 2, null, '#151515', S * .47 - R); circ(g, c, c, R + S * .006, null, 'rgba(0,0,0,.85)', S * .014); circ(g, c, c, S * .465, null, '#2a2a2a', S * .01);
    bankScale(g, c, c, R * 1.04, '#e8e6de', [10, 20, 30, 60]); poly(g, [[c, c - R * 1.04], [c - S * .022, c - R * 1.17], [c + S * .022, c - R * 1.17]], '#e8e6de');
    g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = S * .02; g.shadowOffsetY = S * .008;
    for (const sx of [-1, 1]) poly(g, [[c + sx * R * .66, c - S * .011], [c + sx * R * .22, c - S * .011], [c + sx * R * .22, c + S * .036], [c + sx * R * .29, c + S * .036], [c + sx * R * .29, c + S * .011], [c + sx * R * .66, c + S * .011]], sym);
    circ(g, c, c, S * .016, sym); g.restore();
    for (const d of [-.16, -.08, .08, .16]) circ(g, S * .9, c + d * S, S * .009, null, '#ddd', S * .004); g.fillStyle = '#ddd'; g.fillRect(S * .875, c - S * .003, S * .05, S * .006);
    g.save(); g.beginPath(); g.arc(c, S * .46, S * .42, 72 * D2R, 108 * D2R); g.strokeStyle = '#d8d6ce'; g.lineWidth = S * .036; g.stroke(); g.strokeStyle = '#1a1a1a'; g.lineWidth = S * .026; g.stroke(); g.restore();
    const ib = ok ? clamp(-(st.roll || 0) * .002, -.05, .05) * S : 0; circ(g, c + ib, S * .88 - Math.abs(ib) * .12, S * .013, '#0a0a0a', '#cfcfcf', S * .003); for (const sx of [-1, 1]) ln(g, c + sx * S * .022, S * .86, c + sx * S * .022, S * .9, S * .004, '#bbb');
    if (!ok) flag(g, S * .2, S * .3, S * .2, S * .1, 'ATT');
  });
}
function gAdiS(o = {}) {
  return gauge((g, S) => { dial(g, S); }, (g, S, st) => {
    const ok = nz(st.pitch) && nz(st.roll), c = S / 2, R = S * .42;
    attitude(g, S, c, c, R, ok ? st.pitch : -14, ok ? st.roll : 31, { sky: o.sky || '#8fd0e8', gnd: o.gnd || '#101010', hor: o.hor || '#ffb21a', lad: '#fff', k: R * .026, labels: false, st: 5, lim: 20, lw: .8 });
    bankScale(g, c, c, R * .93, '#fff', [10, 20, 30, 60], .03); poly(g, [[c - R * .55, c], [c - R * .18, c], [c - R * .18, c + S * .03]], o.sym || '#ffb21a', '#000', S * .006); poly(g, [[c + R * .55, c], [c + R * .18, c], [c + R * .18, c + S * .03]], o.sym || '#ffb21a', '#000', S * .006); circ(g, c, c, S * .018, o.sym || '#ffb21a');
    circ(g, S * .83, S * .84, S * .06, '#555', '#222', S * .01);
    if (!ok) flag(g, S * .32, S * .22, S * .36, S * .13, 'OFF', 'stripe');
  }, { sb: 1 });
}
const CARD = ['N', '3', '6', 'E', '12', '15', 'S', '21', '24', 'W', '30', '33'];
function card(g, S, R, hdg, o = {}) {
  g.save(); g.translate(S / 2, S / 2); g.rotate(-hdg * D2R);
  for (let d = 0; d < 360; d += 5) { const t = d * D2R; g.save(); g.rotate(t); ln(g, 0, -R, 0, -R + (d % 10 ? R * .06 : R * .12), S * (d % 30 ? .007 : .012), o.col || WH); if (d % 30 === 0) T(g, CARD[d / 30], 0, -R + R * .26, S * (CARD[d / 30].length > 1 ? .085 : .1), o.col || WH, 'center', 700); g.restore(); }
  g.restore();
}
function gHsi(o = {}) {
  return gauge((g, S) => { dial(g, S, '#121212'); for (let a = 0; a < 360; a += 45) { const [x, y] = P(S, a, .465); poly(g, [[x, y], ...[[-1, 0], [1, 0]].map(([s]) => P(S, a + s * 3, .5))], a ? '#ddd' : WH); } }, (g, S, st, k) => {
    const ok = nz(st.hdg), h = ok ? st.hdg : 247, c = S / 2, R = S * .4; card(g, S, R, h);
    const crs = k.crs ?? (k.crs = ok ? Math.round(st.hdg / 10) * 10 : 270), bug = ok ? Math.round(st.hdg / 5) * 5 + 5 : 200;
    g.save(); g.translate(c, c); g.rotate((bug - h) * D2R); g.fillStyle = '#ff8a1a'; g.fillRect(-S * .03, -R - S * .005, S * .06, S * .035); g.restore();
    g.save(); g.translate(c, c); g.rotate((crs - h) * D2R); poly(g, [[0, -R * .82], [-S * .03, -R * .66], [S * .03, -R * .66]], YEL); g.fillStyle = YEL; g.fillRect(-S * .01, -R * .66, S * .02, R * .32); g.fillRect(-S * .01, R * .4, S * .02, R * .4);
    for (const d of [-2, -1, 1, 2]) circ(g, d * R * .17, 0, S * .012, null, WH, S * .006); g.fillStyle = YEL; g.fillRect(-S * .01 + (ok ? R * .06 : 0), -R * .32, S * .02, R * .7); g.restore();
    poly(g, [[c, c - R * .15], [c - R * .2, c + R * .02], [c - R * .05, c], [c - R * .04, c + R * .14], [c + R * .04, c + R * .14], [c + R * .05, c], [c + R * .2, c + R * .02]], '#ff8a1a');
    poly(g, [[c, c - R * 1.06], [c - S * .025, c - R * 1.17], [c + S * .025, c - R * 1.17]], WH);
    cwin(g, S * .04, S * .04, S * .22, S * .1); cwin(g, S * .74, S * .04, S * .22, S * .1); T(g, ok ? '42.6' : '---', S * .15, S * .09, S * .065, WH, 'center', 700); T(g, String(crs).padStart(3, '0'), S * .85, S * .09, S * .065, WH, 'center', 700);
    if (!ok) { flag(g, S * .08, S * .62, S * .2, S * .1, 'HDG'); flag(g, S * .72, S * .62, S * .2, S * .1, 'NAV'); }
  });
}
function gRmi() {
  return gauge((g, S) => dial(g, S, '#121212'), (g, S, st) => {
    const ok = nz(st.hdg), h = ok ? st.hdg : 112, c = S / 2, R = S * .42; card(g, S, R, h);
    for (const [b, dbl] of [[h + 34, false], [h - 61, true]]) { g.save(); g.translate(c, c); g.rotate((b - h) * D2R); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = S * .02; if (dbl) { ln(g, -S * .018, R * .9, -S * .018, -R * .75, S * .01, '#e8e8e8'); ln(g, S * .018, R * .9, S * .018, -R * .75, S * .01, '#e8e8e8'); } else ln(g, 0, R * .9, 0, -R * .75, S * .016, '#e8e8e8'); poly(g, [[0, -R * .95], [-S * .04, -R * .72], [S * .04, -R * .72]], '#e8e8e8'); g.restore(); }
    hub(g, S, .045); poly(g, [[c, c - R * 1.02], [c - S * .025, c - R * 1.12], [c + S * .025, c - R * 1.12]], '#ff8a1a');
    if (!ok) flag(g, S * .38, S * .62, S * .24, S * .1, 'HDG');
  });
}
function gClock() {
  return gauge((g, S) => { dial(g, S); for (let i = 0; i < 60; i++) tickAt(g, S, i * 6, i % 5 ? .42 : .37, .46, i % 5 ? .007 : .014, WH); nums(g, S, (v) => v * 30, [12, 3, 6, 9], .3, .11, WH); }, (g, S, st) => {
    const t = nz(st.timeMs) ? st.timeMs / 1000 : 0; hand(g, S, (t / 3600 % 12) * 30, .26, .04, WH); hand(g, S, (t / 60 % 60) * 6, .38, .03, WH); hand(g, S, (t % 60) * 6, .42, .012, '#ff8a1a', { tail: .14 }); hub(g, S, .04);
  }, { sb: 1, clk: 1 });
}
function gEng(lab, v, o = {}) {
  const max = o.max ?? 110, a0 = -130, sw = o.sw ?? 230, m = (x) => a0 + x / max * sw;
  return gauge((g, S) => {
    dial(g, S); g.strokeStyle = WH; g.lineWidth = S * .018; g.beginPath(); g.arc(S / 2, S / 2, S * .4, (m(0) - 90) * D2R, (m(max) - 90) * D2R); g.stroke();
    for (let x = 0; x <= max; x += max / 10) tickAt(g, S, m(x), .4, .33, .016, WH); if (o.red != null) tickAt(g, S, m(o.red), .44, .3, .03, RED);
    T(g, lab, S * .5, S * .76, S * .12, CR, 'center', 700); cwin(g, S * .28, S * .55, S * .44, S * .14); T(g, o.txt ?? (v * (o.dig ?? 1)).toFixed(o.dp ?? 1), S * .5, S * .62, S * .11, WH, 'center', 700);
    hand(g, S, m(v), .4, .05, WH); hub(g, S, .06);
  }, null);
}
function gRA() {
  const m = pw([[-20, -150], [0, -135], [100, -60], [200, -10], [500, 60], [1000, 110], [2500, 160]]);
  return gauge((g, S) => { dial(g, S); for (const v of [0, 100, 200, 300, 400, 500, 1000, 1500, 2000, 2500]) tickAt(g, S, m(v), .38, .46, .013, WH); nums(g, S, m, [0, 100, 200, 500, 1000, 2000], .31, .09, WH, (v) => v / 100); g.fillStyle = '#2a2a2a'; g.beginPath(); g.moveTo(S / 2, S / 2); g.arc(S / 2, S / 2, S * .47, (165 - 90) * D2R, (205 - 90) * D2R); g.fill(); T(g, 'RADIO ALT', S * .5, S * .65, S * .055, CR); }, (g, S, st) => {
    const a = st.altFt; if (nz(a) && a < 2500) hand(g, S, m(a), .42, .04, WH); else if (!nz(a)) offCard(g, S, .5, .36); hub(g, S, .05);
  });
}
const asiV = (z, sw, mn, mx) => (v) => z + (clamp(v, mn - (mx - mn) * .04, mx) - mn) / (mx - mn) * sw;
function gAsiV(o = {}) {
  const mn = o.min ?? 0, mx = o.max ?? 400, m = asiV(o.z ?? 200, o.sw ?? 320, mn, mx), col = o.col || CR;
  return gauge((g, S) => {
    dial(g, S); ticks(g, S, m, mn, mx, o.minor ?? 10, .41, .46, .008, col); ticks(g, S, m, mn, mx, o.major ?? 50, .36, .46, .014, col);
    for (const [a, b, c] of o.arcs || []) { g.strokeStyle = c; g.lineWidth = S * .03; g.beginPath(); g.arc(S / 2, S / 2, S * .445, (m(a) - 90) * D2R, (m(b) - 90) * D2R); g.stroke(); }
    nums(g, S, m, o.labs || [], .3, o.px ?? .09, col, (v) => (o.div ? v / o.div : v)); T(g, o.unit || 'MPH', S * .5, S * .64, S * .06, col); if (o.title) T(g, o.title, S * .5, S * .36, S * .05, col);
  }, (g, S, st) => { if (!nz(st.ias)) { hand(g, S, m(mn - 99), .41, .035, col); offCard(g, S, .5, .5); } else hand(g, S, m((o.kt ? 1 : 1.1508) * st.ias), .41, .035, col); hub(g, S, .05, '#111'); });
}
function gAltV(o = {}) {
  const col = o.col || CR;
  return gauge((g, S) => { dial(g, S); for (let i = 0; i < 50; i++) tickAt(g, S, i * 7.2, i % 5 ? .42 : .37, .46, i % 5 ? .007 : .013, col); nums(g, S, (v) => v * 36, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9], .315, .1, col); cwin(g, S * .62, S * .45, S * .17, S * .1); T(g, o.lab || 'ALT', S * .5, S * .66, S * .06, col); T(g, '100 FEET', S * .5, S * .27, S * .04, col); }, (g, S, st) => {
    T(g, '2992', S * .705, S * .5, S * .055, col, 'center', 700); const a = nz(st.altFt) ? Math.max(0, st.altFt) : 0;
    hand(g, S, (a % 100000) * .0036, .22, .07, col, { kind: 'wide', tail: .05 }); hand(g, S, (a % 10000) * .036, .3, .05, col, { tail: .08 }); hand(g, S, (a % 1000) * .36, .43, .022, col, { tail: .15 });
    if (!nz(st.altFt)) offCard(g, S, .5, .78); hub(g, S, .045, '#111');
  });
}
function gRocV(o = {}) {
  const mx = o.max ?? 6, col = o.col || CR, m = (v) => 270 + clamp(v / 1000 / mx, -1, 1) * (o.sw ?? 170);
  return gauge((g, S) => {
    dial(g, S); for (let v = -mx; v <= mx + 1e-9; v += mx > 3 ? .5 : .2) tickAt(g, S, m(v * 1000), Math.abs(v % 1) < .01 ? .36 : .41, .46, Math.abs(v % 1) < .01 ? .014 : .008, col);
    for (let v = -mx; v <= mx; v += 1) { const [x, y] = P(S, m(v * 1000), .3); T(g, String(Math.abs(v)), x, y, S * .1, o.ncol || col); }
    T(g, o.up || 'UP', S * .5, S * .34, S * .065, col); T(g, o.dn || 'DOWN', S * .5, S * .66, S * .065, col); if (o.sub) T(g, o.sub, S * .6, S * .5, S * .04, col);
  }, (g, S, st) => { if (!nz(st.vs)) { hand(g, S, 270, .42, .04, col); offCard(g, S, .62, .58); } else hand(g, S, m(st.vs), .42, .04, col); hub(g, S, .045, '#111'); });
}
function gTB(o = {}) {
  const col = o.col || CR;
  return gauge((g, S) => { dial(g, S); for (const s of [-1, 1]) { const [x, y] = P(S, s * 17, .38); g.fillStyle = col; g.fillRect(x - S * .02, y - S * .05, S * .04, S * .09); } T(g, 'L', S * .22, S * .46, S * .1, col); T(g, 'R', S * .78, S * .46, S * .1, col); g.fillStyle = '#222'; g.beginPath(); g.arc(S / 2, S * .1, S * .66, 63 * D2R, 117 * D2R); g.arc(S / 2, S * .1, S * .74, 117 * D2R, 63 * D2R, true); g.closePath(); g.fill(); g.strokeStyle = '#999'; g.lineWidth = S * .006; g.stroke(); for (const s of [-1, 1]) { const a = (90 + s * 5) * D2R; ln(g, S / 2 + Math.cos(a) * S * .66, S * .1 + Math.sin(a) * S * .66, S / 2 + Math.cos(a) * S * .74, S * .1 + Math.sin(a) * S * .74, S * .008, col); } T(g, o.title || 'TURN', S * .5, S * .62, S * .05, col); }, (g, S, st) => {
    const ok = nz(st.roll), gs = nz(st.ias) ? Math.max(st.ias, 60) : 150, rate = ok ? 1091 * Math.tan(clamp(st.roll, -60, 60) * D2R) / gs : 0;
    hand(g, S, clamp(rate / 3 * 17, -40, 40), .4, .05, col, { cy: S * .58, tail: .02 }); const a = (90 + clamp((ok ? Math.sin((st.timeMs || 0) / 900) * .6 : 0), -6, 6)) * D2R; circ(g, S / 2 + Math.cos(a) * S * .7, S * .1 + Math.sin(a) * S * .7, S * .034, '#111', '#bbb', S * .006);
    if (!ok) offCard(g, S, .5, .32);
  });
}
function gHorizonV(o = {}) {
  const col = o.col || CR;
  return gauge((g, S) => { dial(g, S, o.bg || '#1a1d24'); }, (g, S, st) => {
    const ok = nz(st.pitch) && nz(st.roll), p = ok ? clamp(st.pitch, -25, 25) : 21, r = ok ? clamp(st.roll, -100, 100) : -38, c = S / 2, R = S * .43;
    g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip(); g.translate(c, c); g.rotate(-r * D2R); g.translate(0, p * R * .03);
    g.fillStyle = o.sky || '#1e2430'; g.fillRect(-S, -S * 2, S * 2, S * 2); g.fillStyle = o.gnd || '#151515'; g.fillRect(-S, 0, S * 2, S * 2);
    g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = S * .02; g.fillStyle = o.bar || '#f2eee2'; g.fillRect(-R * 1.1, -S * .012, R * 2.2, S * .024);
    for (const d of [-10, 10]) { g.fillRect(-R * .2, -d * R * .03 - S * .004, R * .4, S * .008); }
    g.restore();
    g.save(); g.translate(c, c); g.rotate(-r * D2R); poly(g, [[0, R * .98], [-S * .035, R * .78], [S * .035, R * .78]], o.ptr || '#fff'); g.restore();
    for (const a of [0, 10, 20, 30, 60, 90, -10, -20, -30, -60, -90]) { const t = (90 + a) * D2R; ln(g, c + Math.cos(t) * R, c + Math.sin(t) * R, c + Math.cos(t) * R * (a % 30 ? .9 : .84), c + Math.sin(t) * R * (a % 30 ? .9 : .84), S * .012, col); }
    g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = S * .015; g.strokeStyle = o.ac || '#ff9a2a'; g.lineWidth = S * .025; g.lineCap = 'round'; g.beginPath(); g.moveTo(c - R * .45, c); g.lineTo(c - R * .15, c); g.lineTo(c, c + R * .1); g.lineTo(c + R * .15, c); g.lineTo(c + R * .45, c); g.stroke(); g.restore();
    circ(g, c, S * .92, S * .05, '#2a2a2a', '#555', S * .008);
    if (!ok) offCard(g, S, .3, .3, 'OFF');
  });
}
function gDG(o = {}) {
  return gauge((g, S) => { g.fillStyle = o.case || '#232323'; rr(g, 0, 0, S, S, S * .06); g.fill(); g.fillStyle = '#060606'; rr(g, S * .08, S * .26, S * .84, S * .38, S * .04); g.fill(); T(g, o.title || 'DIRECTIONAL GYRO', S * .5, S * .14, S * .06, CR, 'center', 700); circ(g, S * .5, S * .84, S * .085, '#2a2a2a', '#666', S * .01); T(g, 'PUSH', S * .5, S * .72, S * .045, CR); }, (g, S, st) => {
    const ok = nz(st.hdg), h = ok ? st.hdg : 133.5, x0 = S * .1, w = S * .8, y0 = S * .28, hh = S * .34, ppd = w / 80;
    g.save(); g.beginPath(); g.rect(x0, y0, w, hh); g.clip(); g.fillStyle = o.cardc || '#e8dfc4'; g.fillRect(x0, y0, w, hh);
    for (let d = Math.floor((h - 45) / 5) * 5; d <= h + 45; d += 5) { const x = S / 2 + (d - h) * ppd, wd = wrap(d); ln(g, x, y0, x, y0 + (wd % 10 ? hh * .2 : hh * .34), S * (wd % 30 ? .007 : .012), '#111'); if (wd % 30 === 0) T(g, wd === 0 ? 'N' : wd === 90 ? 'E' : wd === 180 ? 'S' : wd === 270 ? 'W' : String(wd / 10), x, y0 + hh * .66, S * .12, '#111', 'center', 700); }
    const sh = g.createLinearGradient(x0, 0, x0 + w, 0); sh.addColorStop(0, 'rgba(0,0,0,.75)'); sh.addColorStop(.25, 'rgba(0,0,0,0)'); sh.addColorStop(.75, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.75)'); g.fillStyle = sh; g.fillRect(x0, y0, w, hh); g.restore();
    ln(g, S / 2, y0 - S * .03, S / 2, y0 + hh + S * .03, S * .012, o.lub || '#ff8a1a'); if (!ok) flag(g, S * .66, S * .66, S * .26, S * .09, 'CAGED', RED);
  }, { sq: true });
}
function gCompass() {
  return gauge((g, S) => { g.fillStyle = '#1a1a1a'; rr(g, 0, 0, S, S, S * .2); g.fill(); g.fillStyle = '#040404'; rr(g, S * .1, S * .22, S * .8, S * .5, S * .2); g.fill(); }, (g, S, st) => {
    const h = nz(st.hdg) ? st.hdg : 200 + Math.sin((st.timeMs || 0) / 2300) * 25, x0 = S * .1, w = S * .8, y0 = S * .22, hh = S * .5, ppd = w / 70;
    g.save(); g.beginPath(); g.roundRect(x0, y0, w, hh, S * .2); g.clip(); g.fillStyle = '#16140f'; g.fillRect(x0, y0, w, hh);
    for (let d = Math.floor((h - 40) / 5) * 5; d <= h + 40; d += 5) { const x = S / 2 + (d - h) * ppd, wd = wrap(d); ln(g, x, y0 + hh * .62, x, y0 + hh * (wd % 10 ? .76 : .86), S * .012, '#e6dcc0'); if (wd % 30 === 0) T(g, wd === 0 ? 'N' : wd === 90 ? 'E' : wd === 180 ? 'S' : wd === 270 ? 'W' : String(wd / 10), x, y0 + hh * .36, S * .16, '#e6dcc0', 'center', 700); }
    const sh = g.createLinearGradient(x0, 0, x0 + w, 0); sh.addColorStop(0, 'rgba(0,0,0,.8)'); sh.addColorStop(.3, 'rgba(0,0,0,0)'); sh.addColorStop(.7, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.8)'); g.fillStyle = sh; g.fillRect(x0, y0, w, hh); g.restore(); ln(g, S / 2, y0, S / 2, y0 + hh, S * .02, '#ff7a1a');
  }, { sq: true, sb: 1 });
}
function gStat(o) {
  const mn = o.min ?? 0, mx = o.max ?? 100, z = o.z ?? -135, sw = o.sw ?? 270, m = (v) => z + (v - mn) / (mx - mn) * sw, col = o.col || CR;
  return gauge((g, S) => {
    dial(g, S); for (const [a, b, c] of o.arcs || []) { g.strokeStyle = c; g.lineWidth = S * .035; g.beginPath(); g.arc(S / 2, S / 2, S * .43, (m(a) - 90) * D2R, (m(b) - 90) * D2R); g.stroke(); }
    ticks(g, S, m, mn, mx, (mx - mn) / (o.n ?? 10), .37, .46, .014, col); if (o.n2) ticks(g, S, m, mn, mx, (mx - mn) / o.n2, .41, .46, .008, col);
    nums(g, S, m, o.labs || [], .29, o.px ?? .11, col); if (o.red != null) tickAt(g, S, m(o.red), .3, .47, .03, RED);
    if (o.t) T(g, o.t, S * .5, S * .61, S * (o.tpx ?? (o.t.length > 7 ? .048 : .058)), col, 'center', 700, FNN); if (o.t2) T(g, o.t2, S * .5, S * .35, S * .05, col);
    const v = Array.isArray(o.v) ? o.v : [o.v]; v.forEach((x, i) => hand(g, S, m(x), i ? .34 : .41, i ? .05 : .04, i ? '#f5b23a' : col)); hub(g, S, .05, '#111');
  }, null);
}
function gRafAsi() {
  const m = (v) => (v <= 250 ? 205 + (v - 60) / 190 * 300 : 195 + (v - 250) / 150 * 300);
  return gauge((g, S) => {
    dial(g, S, '#1a1a1a'); for (let v = 60; v <= 240; v += 10) tickAt(g, S, m(v), v % 20 ? .43 : .4, .47, .01, CR); for (let v = 6; v <= 24; v += 2) { const [x, y] = P(S, m(v * 10), .37); T(g, String(v), x, y, S * .085, CR); }
    for (let v = 260; v <= 400; v += 20) { const [x, y] = P(S, m(v), .25); T(g, String(v / 10), x, y, S * .07, CR); } T(g, 'AIR', S * .5, S * .38, S * .075, CR); T(g, 'MPH', S * .5, S * .56, S * .075, CR);
  }, (g, S, st) => { const v = nz(st.ias) ? st.ias * 1.1508 : 0; hand(g, S, nz(st.ias) ? m(clamp(v, 60, 400)) : 198, .42, .025, '#e8e0c4', { tail: .02 }); if (!nz(st.ias)) offCard(g, S, .5, .66); hub(g, S, .035, '#111'); });
}
function gRafHorizon() {
  return gauge((g, S) => dial(g, S, '#151515'), (g, S, st) => {
    const ok = nz(st.pitch) && nz(st.roll), c = S / 2, R = S * .44, p = ok ? clamp(st.pitch, -20, 20) : 18, r = ok ? clamp(st.roll, -90, 90) : 41;
    g.save(); g.beginPath(); g.arc(c, c, R, 0, TAU); g.clip(); g.translate(c, c); g.rotate(-r * D2R); g.translate(0, p * R * .03); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = S * .02; g.fillStyle = '#e8e0c4'; g.fillRect(-R * .9, -S * .01, R * 1.8, S * .02); g.restore();
    g.save(); g.translate(c, c); g.rotate(-r * D2R); poly(g, [[0, R * .96], [-S * .03, R * .82], [S * .03, R * .82]], '#e8e0c4'); g.restore();
    for (const [a, t] of [[0, '0'], [30, '3'], [60, '6'], [-30, '3'], [-60, '6']]) { const q = (90 + a) * D2R; T(g, t, c + Math.cos(q) * R * .78, c + Math.sin(q) * R * .78, S * .08, CR); }
    g.strokeStyle = '#2b2b2b'; g.lineWidth = S * .04; g.beginPath(); g.moveTo(c - R * .2, c - R * .05); g.quadraticCurveTo(c - R * .45, c - R * .8, c - R * .12, c - R * .9); g.moveTo(c + R * .2, c - R * .05); g.quadraticCurveTo(c + R * .45, c - R * .8, c + R * .12, c - R * .9); g.stroke();
    g.save(); g.shadowColor = 'rgba(0,0,0,.8)'; g.shadowBlur = S * .02; g.strokeStyle = '#d8d0b0'; g.lineWidth = S * .025; g.beginPath(); g.moveTo(c - R * .55, c + R * .02); g.lineTo(c - R * .12, c + R * .02); g.moveTo(c + R * .12, c + R * .02); g.lineTo(c + R * .55, c + R * .02); g.stroke(); circ(g, c, c + R * .02, S * .02, '#d8d0b0'); g.restore();
    if (!ok) offCard(g, S, .5, .28);
  });
}
function gRafDG() {
  return gauge((g, S) => { dial(g, S, '#161616'); g.fillStyle = '#020202'; g.fillRect(S * .22, S * .22, S * .56, S * .26); circ(g, S * .5, S * .84, S * .07, '#222', '#555', S * .01); }, (g, S, st) => {
    const ok = nz(st.hdg), h = ok ? st.hdg : 214, x0 = S * .22, w = S * .56, y0 = S * .22, hh = S * .26; g.save(); g.beginPath(); g.rect(x0, y0, w, hh); g.clip(); g.fillStyle = '#e4dcc6'; g.fillRect(x0, y0, w, hh);
    for (let d = Math.floor((h - 16) / 2) * 2; d <= h + 16; d += 2) { const x = S / 2 + (d - h) * w / 24, wd = wrap(d); ln(g, x, y0 + hh * .74, x, y0 + hh * (wd % 10 ? .86 : 1), S * .008, '#111'); if (wd % 10 === 0) T(g, String(wd / 10 | 0), x, y0 + hh * .38, S * .15, '#111', 'center', 700); }
    g.restore(); poly(g, [[S / 2, y0 + hh + S * .01], [S / 2 - S * .025, y0 + hh + S * .07], [S / 2 + S * .025, y0 + hh + S * .07]], '#e4dcc6'); if (!ok) offCard(g, S, .5, .66);
  });
}
function gRafTS() {
  return gauge((g, S) => { dial(g, S, '#161616'); const c = S / 2; g.strokeStyle = CR; g.lineWidth = S * .008; g.beginPath(); g.arc(c, c + S * .1, S * .36, -125 * D2R, -55 * D2R); g.stroke(); g.beginPath(); g.arc(c, c - S * .1, S * .36, 55 * D2R, 125 * D2R); g.stroke(); T(g, 'SIDE', S * .25, S * .3, S * .05, CR); T(g, 'SLIP', S * .25, S * .35, S * .05, CR); T(g, 'SIDE', S * .75, S * .3, S * .05, CR); T(g, 'SLIP', S * .75, S * .35, S * .05, CR); T(g, 'L', S * .2, S * .5, S * .1, CR); T(g, 'R', S * .8, S * .5, S * .1, CR); T(g, 'TURN', S * .25, S * .74, S * .05, CR); T(g, 'TURN', S * .75, S * .74, S * .05, CR); circ(g, c, c, S * .1, '#0a0a0a'); }, (g, S, st) => {
    const ok = nz(st.roll), gs = nz(st.ias) ? Math.max(st.ias, 60) : 150, rate = ok ? 1091 * Math.tan(clamp(st.roll, -60, 60) * D2R) / gs : 0, c = S / 2;
    hand(g, S, ok ? Math.sin((st.timeMs || 0) / 1300) * 2 : 0, .34, .04, '#e8e0c4', { tail: 0 }); hand(g, S, 180 - clamp(rate * 6, -35, 35), .34, .04, '#e8e0c4', { tail: 0 }); if (!ok) offCard(g, S, .5, .6);
  });
}

const DIS = { a: { s: '#1299fa', g: '#9a4910' } };
function tapeV(g, x0, y0, w, h, cy, v, ppu, step, lab, fmt, o) {
  g.save(); g.beginPath(); g.rect(x0, y0, w, h); g.clip(); g.fillStyle = o.bg; g.fillRect(x0, y0, w, h);
  const lo = v - (y0 + h - cy) / ppu, hi = v + (cy - y0) / ppu;
  for (let t = Math.ceil(lo / step) * step; t <= hi; t += step) { if (o.min != null && t < o.min) continue; const y = cy - (t - v) * ppu, L = t % lab === 0; if (o.tr) ln(g, x0 + w - o.tl * (L ? 1 : .6), y, x0 + w, y, o.tw, '#f4f4f4'); else ln(g, x0, y, x0 + o.tl * (L ? 1 : .6), y, o.tw, '#f4f4f4'); if (L) T(g, fmt(t), o.lx, y, o.fs, '#f4f4f4', o.la || 'center', 500, FNN); }
  g.restore();
}
function redFail(g, x, y, w, h, t, px, col = '#ff2a1a', box = true) { if (box) { g.strokeStyle = col; g.lineWidth = px * .1; g.strokeRect(x, y, w, h); } T(g, t, x + w / 2, y + h / 2, px, col, 'center', 700, FNN); }
function ambBox(g, x, y, t, px) { g.font = `700 ${px}px ${FNN}`; const w = g.measureText(t).width + px * .5; g.strokeStyle = AMB; g.lineWidth = px * .1; g.strokeRect(x - w / 2, y - px * .65, w, px * 1.3); T(g, t, x, y, px, AMB, 'center', 700, FNN); }
const UNC = '#7d838a', UNL = '#2f3337';
function noData(g, x, y, w, h, px, t = '– – –') { g.save(); g.setLineDash([px * .35, px * .3]); g.strokeStyle = UNL; g.lineWidth = Math.max(1, px * .08); g.strokeRect(x, y, w, h); g.restore(); if (t) T(g, t, x + w / 2, y + h / 2, px, UNC, 'center', 600, FNN); }
function unkTag(g, x, y, px) { T(g, 'FLIGHT STATE', x, y - px * .62, px, '#9aa1a8', 'center', 600, FNN); T(g, 'NOT KNOWN', x, y + px * .62, px, '#9aa1a8', 'center', 600, FNN); }
const isU = (st, k) => !!st.unk?.has(k), fail = (st, k, a, b) => (isU(st, k) ? a() : b());
const apOn = (st) => st.ap !== false && !st.unknown && (st.ap === true || (nz(st.pitch) && nz(st.roll) && st.pitch > -12 && st.pitch < 18 && Math.abs(st.roll) < 35 && !(nz(st.vs) && Math.abs(st.vs) > 7000) && !(st.warnings || []).some((w) => /STALL|PULL UP/i.test(w))));
function trackLine(g, ox, oy, R, col, w) { ln(g, ox, oy - R * .06, ox, oy - R, w, col); for (const f of [.25, .5, .75]) ln(g, ox - R * .025, oy - R * f, ox + R * .025, oy - R * f, w, col); }
function wptMark(g, st, ox, oy, R, hdg, col, fs) { const w = st.wpt; if (!w || !nz(w.brg) || !nz(w.nm) || !w.id) return; const a = (w.brg - hdg) * D2R, r = R * clamp(w.nm / (w.range || 80), 0, 1.3), x = ox + Math.sin(a) * r, y = oy - Math.cos(a) * r; ln(g, ox, oy, x, y, fs * .12, col); poly(g, [[x, y - fs * .32], [x + fs * .32, y], [x, y + fs * .32], [x - fs * .32, y]], null, col, fs * .1); T(g, String(w.id).toUpperCase().slice(0, 6), x + fs * 1.6, y, fs * .9, col, 'center', 500, FNN); }
function trend(k, st) { const now = performance.now(), v = st.ias; if (!nz(v)) return 0; if (k.ti != null) { const dt = (now - k.ti) / 1000; if (dt > .02 && dt < 2) k.tr = lerp(k.tr || 0, clamp((v - k.tv) / dt * 10, -40, 40), .3); } k.ti = now; k.tv = v; return k.tr || 0; }

function pfdA(g, S, st, k) {
  const X = (f) => f * S, cy = X(.508), fs = S * .052, wh = '#f4f4f4', grey = '#6f6f75';
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  for (const f of [.207, .418, .645, .843]) ln(g, X(f), X(.012), X(f), X(.13), S * .004, '#8a8a8a');
  if (apOn(st) && nz(st.ias)) { T(g, 'SPEED', X(.103), X(.04), fs, GRN, 'center', 500, FNN); T(g, Math.abs(st.vs || 0) < 300 ? 'ALT CRZ' : 'V/S', X(.31), X(.04), fs, GRN, 'center', 500, FNN); T(g, 'NAV', X(.53), X(.04), fs, GRN, 'center', 500, FNN); T(g, 'AP1', X(.92), X(.04), fs, wh, 'center', 500, FNN); T(g, '1 FD 2', X(.92), X(.085), fs, wh, 'center', 500, FNN); T(g, 'A/THR', X(.92), X(.13), fs, wh, 'center', 500, FNN); }
  const sx0 = X(.011), sw = X(.108), ty0 = X(.246), th = X(.528);
  if (!nz(st.ias)) fail(st, 'ias', () => noData(g, sx0, ty0, sw, th, fs), () => redFail(g, sx0, ty0, sw, th, 'SPD', fs * 1.2));
  else {
    const v = Math.max(30, st.ias), ppu = S * .0062;
    tapeV(g, sx0, ty0, sw, th, cy, v, ppu, 10, 20, String, { bg: grey, tr: true, tl: S * .025, tw: S * .005, lx: X(.055), fs: fs * 1.05, min: 30 });
    const ym = cy - (330 - v) * ppu; if (ym > ty0) { g.save(); g.beginPath(); g.rect(X(.119), ty0, X(.02), Math.min(ym, ty0 + th) - ty0); g.clip(); for (let y = ym - S * .02; y > ty0 - S * .02; y -= S * .04) { g.fillStyle = '#ff2a1a'; g.fillRect(X(.119), y - S * .02, X(.02), S * .02); g.fillStyle = '#000'; g.fillRect(X(.119), y - S * .04, X(.02), S * .02); } g.restore(); }
    const tr = trend(k, st); if (Math.abs(tr) > 2) { const yt = cy - tr * ppu; ln(g, X(.13), cy, X(.13), yt, S * .006, YEL); poly(g, [[X(.13), yt - Math.sign(tr) * S * .012], [X(.118), yt + Math.sign(tr) * S * .004], [X(.142), yt + Math.sign(tr) * S * .004]], YEL); }
    const tgt = Math.round(v / 5) * 5 + 3, yg = cy - (tgt - v) * ppu; poly(g, [[X(.12), yg], [X(.145), yg - S * .014], [X(.145), yg + S * .014]], MAG);
    ln(g, X(.0), cy, X(.07), cy, S * .007, YEL); poly(g, [[X(.085), cy], [X(.125), cy - S * .018], [X(.125), cy + S * .018]], YEL); ln(g, X(.1), cy, X(.165), cy, S * .008, YEL);
    if (nz(st.altFt) && st.altFt > 18000) { const tas = v * (1 + st.altFt / 1000 * .02), a = 661 * Math.sqrt(clamp(1 - st.altFt * 6.875e-6, .75, 1)); T(g, '.' + String(Math.round(tas / a * 100)).padStart(2, '0').slice(-2), X(.065), X(.81), fs * 1.1, GRN, 'center', 500, FNN); }
  }
  const ax = X(.433), R = X(.262);
  if (!(nz(st.pitch) && nz(st.roll))) { if (isU(st, 'pitch') || isU(st, 'roll')) { noData(g, ax - R, cy - R * .9, R * 2, R * 1.8, fs, st.unknown ? '' : undefined); if (st.unknown) unkTag(g, ax, cy, fs * 1.05); } else T(g, 'ATT', ax, cy, fs * 1.4, '#ff2a1a', 'center', 700, FNN); }
  else {
    g.save(); g.beginPath(); g.rect(X(.201), 0, X(.466), S); g.clip(); attitude(g, S, ax, cy, R, clamp(st.pitch, -60, 60), st.roll, { sky: '#1299fa', gnd: '#9a4910', k: S * .0106, font: FNN }); g.restore();
    g.strokeStyle = wh; g.lineWidth = S * .006; g.beginPath(); g.arc(ax, cy, R * 1.06, -132 * D2R, -48 * D2R); g.stroke(); bankScale(g, ax, cy, R * 1.06, wh, [10, 20, 30, 45], .02);
    poly(g, [[ax, X(.25)], [ax - S * .02, X(.222)], [ax + S * .02, X(.222)]], null, YEL, S * .006);
    g.save(); g.translate(ax, cy); g.rotate(-st.roll * D2R); poly(g, [[0, -R * 1.02], [-S * .02, -R * .92], [S * .02, -R * .92]], null, YEL, S * .006); g.strokeStyle = YEL; g.strokeRect(-S * .022, -R * .9, S * .044, S * .012); g.restore();
    for (const [a, b] of [[.213, .311], [.557, .655]]) { g.fillStyle = '#000'; g.strokeStyle = YEL; g.lineWidth = S * .005; const inner = a < .4 ? b : a; g.beginPath(); g.rect(X(a), X(.499), X(b - a), X(.019)); g.fill(); g.stroke(); g.beginPath(); g.rect(inner - (a < .4 ? X(.019) : 0), X(.499), X(.019), X(.044)); g.fill(); g.stroke(); }
    g.fillStyle = '#000'; g.fillRect(ax - X(.009), cy - X(.009), X(.018), X(.018)); g.strokeStyle = YEL; g.strokeRect(ax - X(.009), cy - X(.009), X(.018), X(.018));
    ln(g, ax - R * .55, cy - S * .006, ax + R * .55, cy - S * .006, S * .006, GRN); ln(g, ax + S * .004, cy - R * .55, ax + S * .004, cy + R * .55, S * .006, GRN);
    if (nz(st.altFt) && st.altFt < 2500) T(g, String(Math.round(st.altFt / 10) * 10), ax, X(.737), fs * 1.3, GRN, 'center', 500, FNN);
  }
  const al0 = X(.742), aw = X(.084);
  if (!nz(st.altFt)) fail(st, 'altFt', () => noData(g, al0, ty0, aw + X(.03), th, fs), () => redFail(g, al0, ty0, aw + X(.03), th, 'ALT', fs * 1.2));
  else {
    const a = st.altFt, ppu = S * .00046;
    tapeV(g, al0, ty0, aw, th, cy, a, ppu, 100, 500, (t) => String(Math.round(t / 100)).padStart(3, '0'), { bg: grey, tr: true, tl: S * .02, tw: S * .005, lx: X(.776), fs: fs * 1.02 });
    const sel = Math.round(a / 1000) * 1000 + (Math.abs(st.vs || 0) > 300 ? Math.sign(st.vs) * 1000 : 0); T(g, String(sel), X(.79), X(.225), fs * 1.05, CYA, 'center', 500, FNN);
    g.fillStyle = '#000'; g.fillRect(X(.742), X(.481), X(.11), X(.056)); g.fillRect(X(.85), X(.464), X(.06), X(.091)); g.strokeStyle = YEL; g.lineWidth = S * .005; g.beginPath(); g.moveTo(X(.742), X(.481)); g.lineTo(X(.85), X(.481)); g.lineTo(X(.85), X(.464)); g.lineTo(X(.91), X(.464)); g.lineTo(X(.91), X(.555)); g.lineTo(X(.85), X(.555)); g.lineTo(X(.85), X(.537)); g.lineTo(X(.742), X(.537)); g.closePath(); g.stroke();
    T(g, String(Math.floor(Math.max(0, a) / 100)), X(.848), cy, fs * 1.3, GRN, 'right', 500, FNN);
    g.save(); g.beginPath(); g.rect(X(.85), X(.466), X(.06), X(.087)); g.clip(); const d = (Math.max(0, a) % 100) / 20, d0 = Math.floor(d); for (let i = -2; i <= 2; i++) { const val = ((d0 + i) * 20 + 100) % 100; T(g, String(val).padStart(2, '0'), X(.88), cy - (i - (d - d0)) * X(.04), fs * .95, GRN, 'center', 500, FNN); } g.restore();
    ln(g, X(.68), cy, X(.73), cy, S * .008, YEL);
    if (a > 10000) { g.strokeStyle = YEL; g.lineWidth = S * .004; g.strokeRect(X(.77), X(.83), X(.09), X(.045)); T(g, 'STD', X(.815), X(.853), fs, CYA, 'center', 500, FNN); } else { T(g, 'QNH', X(.79), X(.85), fs, wh, 'center', 500, FNN); T(g, '1013', X(.88), X(.85), fs, CYA, 'center', 500, FNN); }
  }
  const vf = pw([[0, 0], [500, .1], [1000, .169], [1500, .2], [2000, .23], [6000, .293]]);
  if (!nz(st.vs)) fail(st, 'vs', () => noData(g, X(.93), X(.2), X(.065), X(.62), fs * .8, '–'), () => T(g, 'V/S', X(.958), cy, fs * 1.05, '#ff2a1a', 'center', 700, FNN));
  else {
    poly(g, [[X(.94), X(.196)], [X(.995), X(.196)], [X(.995), X(.823)], [X(.94), X(.823)], [X(.923), X(.69)], [X(.923), X(.33)]], '#3c3c40');
    for (const [v, t] of [[1000, '1'], [2000, '2'], [6000, '6']]) for (const s of [1, -1]) { const y = cy - s * vf(v) * S; T(g, t, X(.947), y, fs * .9, wh, 'center', 500, FNN); ln(g, X(.96), y, X(.975), y, S * .006, wh); }
    for (const v of [500, 1500]) for (const s of [1, -1]) { const y = cy - s * vf(v) * S; ln(g, X(.965), y, X(.975), y, S * .004, wh); }
    ln(g, X(.94), cy, X(.98), cy, S * .009, YEL); const vs = clamp(st.vs, -6500, 6500), yv = cy - Math.sign(vs) * vf(Math.abs(vs)) * S, col = Math.abs(vs) > 6000 ? AMB : GRN;
    g.save(); g.beginPath(); g.rect(X(.93), X(.19), X(.07), X(.64)); g.clip(); ln(g, X(1.12), cy, X(.93), yv, S * .008, col); g.restore();
    if (Math.abs(vs) >= 200) { g.fillStyle = '#000'; g.fillRect(X(.925), yv + Math.sign(-vs) * S * .03 - S * .02, X(.075), S * .04); T(g, String(Math.round(Math.abs(vs) / 100)).padStart(2, '0'), X(.962), yv + Math.sign(-vs) * S * .03, fs * .9, col, 'center', 500, FNN); }
  }
  const hx0 = X(.2), hw = X(.466), hy0 = X(.909), hh = X(.077);
  if (!nz(st.hdg)) fail(st, 'hdg', () => noData(g, hx0, hy0, hw, hh, fs), () => redFail(g, hx0, hy0, hw, hh, 'HDG', fs * 1.1));
  else {
    const h = st.hdg, ppd = S * .0094, hc = X(.433);
    g.save(); g.beginPath(); g.rect(hx0, hy0, hw, hh); g.clip(); g.fillStyle = grey; g.fillRect(hx0, hy0, hw, hh);
    for (let d = Math.floor((h - 30) / 5) * 5; d <= h + 30; d += 5) { const x = hc + (d - h) * ppd, wd = wrap(d); ln(g, x, hy0, x, hy0 + (wd % 10 ? hh * .2 : hh * .35), S * .005, wh); if (wd % 10 === 0) T(g, String(wd / 10), x, hy0 + hh * .65, fs * (wd % 30 ? .85 : 1.05), wh, 'center', 500, FNN); }
    g.restore(); ln(g, hc, X(.873), hc, X(.915), S * .009, YEL); poly(g, [[hc + S * .03, hy0], [hc + S * .019, hy0 + S * .016], [hc + S * .041, hy0 + S * .016]], CYA);
  }
}
function ndA(g, S, st, k) {
  const ox = S * .5, oy = S * .82, R = S * .66, wh = '#f4f4f4', fs = S * .048, ok = nz(st.hdg);
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  const un = !ok && isU(st, 'hdg'); g.setLineDash([S * .02, S * .02]); for (const f of [.5, .25]) { g.strokeStyle = ok ? '#bbb' : un ? UNL : '#ff2a1a'; g.lineWidth = S * .004; g.beginPath(); g.arc(ox, oy, R * f, Math.PI, 0); g.stroke(); } g.setLineDash([]);
  if (un) { g.strokeStyle = UNL; g.lineWidth = S * .005; g.beginPath(); g.arc(ox, oy, R, Math.PI * 1.17, Math.PI * 1.83); g.stroke(); if (st.unknown) unkTag(g, ox, S * .4, fs * 1.05); T(g, 'GS', S * .03, S * .04, fs * .85, UNC, 'left', 500, FNN); T(g, '–––', S * .1, S * .04, fs * 1.05, UNC, 'left', 500, FNN); return; }
  if (!ok) { g.strokeStyle = '#ff2a1a'; g.lineWidth = S * .005; g.beginPath(); g.arc(ox, oy, R, Math.PI * 1.17, Math.PI * 1.83); g.stroke(); T(g, 'HDG', S * .5, S * .07, fs * 1.3, '#ff2a1a', 'center', 700, FNN); T(g, 'MAP NOT AVAIL', S * .5, S * .14, fs * 1.1, '#ff2a1a', 'center', 600, FNN); g.strokeStyle = wh; g.lineWidth = S * .004; g.strokeRect(S * .22, S * .92, S * .56, S * .06); T(g, 'GPS PRIMARY LOST', S * .5, S * .95, fs, AMB, 'center', 600, FNN); return; }
  const h = st.hdg; g.save(); g.translate(ox, oy); g.rotate(-h * D2R);
  g.strokeStyle = wh; g.lineWidth = S * .005; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  for (let d = 0; d < 360; d += 5) { g.save(); g.rotate(d * D2R); ln(g, 0, -R, 0, -R + (d % 10 ? S * .018 : S * .032), S * .005, wh); if (d % 10 === 0) T(g, String(d / 10), 0, -R + S * .065, d % 30 ? fs * .85 : fs * 1.15, wh, 'center', 500, FNN); g.restore(); }
  g.restore();
  poly(g, [[ox, oy - R - S * .012], [ox + S * .014, oy - R + S * .006], [ox, oy - R + S * .024], [ox - S * .014, oy - R + S * .006]], null, GRN, S * .005); wptMark(g, st, ox, oy, R, h, GRN, fs);
  ln(g, ox, oy - R - S * .035, ox, oy - R + S * .02, S * .009, YEL); poly(g, [[ox, oy - S * .03], [ox - S * .05, oy], [ox + S * .05, oy], [ox, oy - S * .03]], null, YEL, S * .008); ln(g, ox, oy - S * .04, ox, oy + S * .045, S * .008, YEL); ln(g, ox - S * .02, oy + S * .035, ox + S * .02, oy + S * .035, S * .008, YEL);
  T(g, '7.5', ox - R * .5 - S * .04, oy - S * .03, fs * .85, CYA, 'center', 500, FNN); T(g, '15', ox - R * .25 - S * .03, oy - S * .03, fs * .85, CYA, 'center', 500, FNN);
  T(g, 'GS', S * .03, S * .04, fs * .85, wh, 'left', 500, FNN); T(g, nz(st.gs) ? String(Math.round(st.gs)) : '---', S * .1, S * .04, fs * 1.05, GRN, 'left', 500, FNN); T(g, 'TAS', S * .21, S * .04, fs * .85, wh, 'left', 500, FNN); T(g, nz(st.ias) ? String(Math.round(st.ias * (1 + (st.altFt || 0) / 1000 * .02))) : '---', S * .3, S * .04, fs * 1.05, GRN, 'left', 500, FNN);
  if (st.wpt?.id && nz(st.wpt.nm)) { T(g, String(st.wpt.id).toUpperCase().slice(0, 6), S * .97, S * .04, fs, wh, 'right', 500, FNN); if (nz(st.wpt.brg)) T(g, String(Math.round(wrap(st.wpt.brg))).padStart(3, '0') + '°', S * .97, S * .1, fs, GRN, 'right', 500, FNN); T(g, Math.round(st.wpt.nm) + ' NM', S * .97, S * .16, fs, GRN, 'right', 500, FNN); }
}
function warnList(st) { return (st.warnings || []).slice(0, 6).map((w) => String(w).toUpperCase().slice(0, 22)); }
const sev = (w) => (/WARN|FIRE|STALL|PULL|TERRAIN|OVERSPEED|DEPRESS|CABIN|EXCESS|SINK|DUAL|FAIL/i.test(w) ? 2 : 1);
function ewdA(g, S, st) {
  const wh = '#f4f4f4', fs = S * .05; g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  for (const [cx, n1] of [[.29, 86.2], [.69, 86.4]]) {
    const x = S * cx, y = S * .15, r = S * .105, m = (v) => (-210 + v / 110 * 255) * D2R;
    g.strokeStyle = wh; g.lineWidth = S * .007; g.beginPath(); g.arc(x, y, r, m(0), m(101)); g.stroke(); g.strokeStyle = '#ff2a1a'; g.beginPath(); g.arc(x, y, r, m(101), m(110)); g.stroke();
    for (const v of [50, 100]) { ln(g, x + Math.cos(m(v)) * r, y + Math.sin(m(v)) * r, x + Math.cos(m(v)) * r * .82, y + Math.sin(m(v)) * r * .82, S * .006, wh); T(g, String(v / 10), x + Math.cos(m(v)) * r * .65, y + Math.sin(m(v)) * r * .65, fs * .8, wh, 'center', 500, FNN); }
    ln(g, x, y, x + Math.cos(m(n1)) * r * 1.05, y + Math.sin(m(n1)) * r * 1.05, S * .008, GRN); g.strokeStyle = '#777'; g.lineWidth = S * .004; g.strokeRect(x - S * .015, y + S * .025, S * .11, S * .05); T(g, n1.toFixed(1), x + S * .04, y + S * .05, fs * 1.05, GRN, 'center', 500, FNN);
    const ey = S * .31, er = S * .07; g.strokeStyle = wh; g.lineWidth = S * .006; g.beginPath(); g.arc(x, ey, er, Math.PI, 0); g.stroke(); ln(g, x, ey, x - er * .3, ey - er * .9, S * .007, GRN); g.strokeStyle = '#777'; g.strokeRect(x - S * .045, ey + S * .01, S * .09, S * .045); T(g, '612', x, ey + S * .033, fs * .95, GRN, 'center', 500, FNN);
    T(g, '96.1', x, S * .42, fs * 1.05, GRN, 'center', 500, FNN); T(g, '2610', x, S * .51, fs * 1.05, GRN, 'center', 500, FNN);
  }
  for (const [t, u, y] of [['N1', '%', .14], ['EGT', '°C', .31], ['N2', '%', .42], ['FF', 'KG/H', .51]]) { T(g, t, S * .49, S * y - S * .02, fs * .9, wh, 'center', 500, FNN); T(g, u, S * .49, S * y + S * .025, fs * .8, CYA, 'center', 500, FNN); }
  T(g, 'CLB', S * .9, S * .04, fs, CYA, 'center', 500, FNN); T(g, '89.3%', S * .9, S * .09, fs, GRN, 'center', 500, FNN);
  ln(g, S * .01, S * .67, S * .58, S * .67, S * .005, wh); ln(g, S * .67, S * .67, S, S * .67, S * .005, wh); ln(g, S * .625, S * .69, S * .625, S * .96, S * .005, wh);
  const W = warnList(st);
  if (W.length) W.forEach((w, i) => T(g, w, S * .03, S * (.73 + i * .055), fs, sev(w) > 1 ? '#ff2a1a' : AMB, 'left', 500, FNN));
  else ['SEAT BELTS', 'NO SMOKING', 'CABIN READY'].forEach((w, i) => T(g, w, S * .05, S * (.73 + i * .055), fs, GRN, 'left', 500, FNN));
  ['AUTO BRK MED', 'TCAS STBY', 'GND SPLRS ARMED'].forEach((w, i) => T(g, w, S * .66, S * (.73 + i * .055), fs * .92, GRN, 'left', 500, FNN));
}
function sdA(g, S) {
  const wh = '#f4f4f4', fs = S * .05; g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  T(g, 'CRUISE', S * .5, S * .05, fs * 1.15, wh, 'center', 500, FNN); ln(g, S * .4, S * .085, S * .6, S * .085, S * .004, wh);
  T(g, 'ENG', S * .12, S * .17, fs, wh, 'center', 500, FNN); T(g, 'F.USED', S * .5, S * .17, fs, wh, 'center', 500, FNN); T(g, '5210', S * .3, S * .23, fs * 1.1, GRN, 'center', 500, FNN); T(g, '5190', S * .7, S * .23, fs * 1.1, GRN, 'center', 500, FNN); T(g, 'KG', S * .5, S * .23, fs * .85, CYA, 'center', 500, FNN);
  T(g, 'OIL', S * .5, S * .31, fs, wh, 'center', 500, FNN); T(g, '14.5', S * .3, S * .31, fs * 1.1, GRN, 'center', 500, FNN); T(g, '14.0', S * .7, S * .31, fs * 1.1, GRN, 'center', 500, FNN);
  T(g, 'VIB N1', S * .5, S * .39, fs * .9, wh, 'center', 500, FNN); T(g, '0.8', S * .3, S * .39, fs * 1.1, GRN, 'center', 500, FNN); T(g, '0.9', S * .7, S * .39, fs * 1.1, GRN, 'center', 500, FNN);
  ln(g, S * .05, S * .46, S * .95, S * .46, S * .004, '#888'); T(g, 'AIR', S * .12, S * .52, fs, wh, 'center', 500, FNN); T(g, 'LDG ELEV', S * .45, S * .52, fs * .9, wh, 'center', 500, FNN); T(g, 'AUTO', S * .65, S * .52, fs, GRN, 'center', 500, FNN);
  T(g, 'ΔP', S * .62, S * .6, fs, wh, 'center', 500, FNN); T(g, '8.1', S * .74, S * .6, fs * 1.1, GRN, 'center', 500, FNN); T(g, 'CAB V/S', S * .2, S * .66, fs * .9, wh, 'center', 500, FNN); T(g, '0', S * .2, S * .72, fs * 1.1, GRN, 'center', 500, FNN); T(g, 'CAB ALT', S * .7, S * .69, fs * .9, wh, 'center', 500, FNN); T(g, '6800', S * .7, S * .75, fs * 1.1, GRN, 'center', 500, FNN);
  ln(g, 0, S * .86, S, S * .86, S * .005, wh); ln(g, S * .33, S * .86, S * .33, S, S * .005, wh); ln(g, S * .66, S * .86, S * .66, S, S * .005, wh);
  T(g, 'TAT', S * .04, S * .9, fs * .85, wh, 'left', 500, FNN); T(g, '-26', S * .16, S * .9, fs, GRN, 'left', 500, FNN); T(g, 'SAT', S * .04, S * .96, fs * .85, wh, 'left', 500, FNN); T(g, '-52', S * .16, S * .96, fs, GRN, 'left', 500, FNN);
  T(g, '08 H 41', S * .5, S * .93, fs * 1.05, GRN, 'center', 500, FNN); T(g, 'GW', S * .7, S * .93, fs * .85, wh, 'left', 500, FNN); T(g, '198600', S * .78, S * .93, fs, GRN, 'left', 500, FNN);
}
function isis(g, S, st) {
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S); const ok = nz(st.pitch) && nz(st.roll);
  if (ok) attitude(g, S, S * .5, S * .5, S * .5, st.pitch, st.roll, { sky: '#1a8ce0', gnd: '#8a4a12', k: S * .012, box: [S * .3, S * .38, 0], labels: false }); else if (isU(st, 'pitch') || isU(st, 'roll')) noData(g, S * .26, S * .3, S * .48, S * .4, S * .08); else T(g, 'ATT', S * .5, S * .5, S * .1, '#ff2a1a', 'center', 700, FNN);
  for (const [x, v, f] of [[.1, st.ias, (a) => String(Math.round(a))], [.9, st.altFt, (a) => String(Math.round(a / 20) * 20)]]) { g.fillStyle = '#555'; g.fillRect(S * (x - .1), S * .1, S * .2, S * .8); g.fillStyle = '#000'; g.fillRect(S * (x - .1), S * .44, S * .2, S * .12); g.strokeStyle = YEL; g.lineWidth = S * .01; g.strokeRect(S * (x - .1), S * .44, S * .2, S * .12); T(g, nz(v) ? f(v) : isU(st, x < .5 ? 'ias' : 'altFt') ? '–––' : '', S * x, S * .5, S * .09, nz(v) ? '#fff' : UNC, 'center', 600, FNN); if (!nz(v) && !isU(st, x < .5 ? 'ias' : 'altFt')) T(g, x < .5 ? 'SPD' : 'ALT', S * x, S * .3, S * .08, '#ff2a1a', 'center', 700, FNN); }
  poly(g, [[S * .32, S * .5], [S * .44, S * .5], [S * .44, S * .53]], YEL); poly(g, [[S * .68, S * .5], [S * .56, S * .5], [S * .56, S * .53]], YEL);
}
function pfdB(g, S, st, k) {
  const X = (f) => f * S, cy = X(.48), fs = S * .052, wh = '#f2f2f2', grey = '#4a4a50';
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  for (const f of [.43, .6]) ln(g, X(f), X(.02), X(f), X(.11), S * .004, st.unknown ? UNL : wh);
  if (apOn(st)) { T(g, 'SPD', X(.35), X(.045), fs, GRN, 'center', 500, FNN); T(g, 'LNAV', X(.515), X(.045), fs, GRN, 'center', 500, FNN); T(g, 'VNAV PTH', X(.69), X(.045), fs, GRN, 'center', 500, FNN); T(g, 'A/P', X(.5), X(.17), fs * 1.3, GRN, 'center', 500, FNN); }
  const sx0 = X(.05), sw = X(.14), ty0 = X(.12), th = X(.71);
  if (!nz(st.ias)) fail(st, 'ias', () => noData(g, sx0, ty0, sw, th, fs), () => ambBox(g, X(.12), cy, 'SPD', fs * 1.1));
  else {
    const v = Math.max(30, st.ias), ppu = S * .0058; tapeV(g, sx0, ty0, sw, th, cy, v, ppu, 10, 20, String, { bg: grey, tr: true, tl: S * .025, tw: S * .005, lx: X(.1), fs: fs * 1.05, min: 30 });
    g.fillStyle = '#000'; g.strokeStyle = wh; g.lineWidth = S * .005; g.beginPath(); g.moveTo(X(.05), cy - X(.035)); g.lineTo(X(.17), cy - X(.035)); g.lineTo(X(.17), cy - X(.012)); g.lineTo(X(.19), cy); g.lineTo(X(.17), cy + X(.012)); g.lineTo(X(.17), cy + X(.035)); g.lineTo(X(.05), cy + X(.035)); g.closePath(); g.fill(); g.stroke();
    T(g, String(Math.floor(v)), X(.155), cy, fs * 1.3, wh, 'right', 500, FNN); T(g, String(Math.round(v / 5) * 5 + 5), X(.13), X(.08), fs * 1.05, MAG, 'center', 500, FNN);
    const tr = trend(k, st); if (Math.abs(tr) > 2) ln(g, X(.2), cy, X(.2), cy - tr * ppu, S * .006, GRN);
  }
  if (!(nz(st.pitch) && nz(st.roll))) { if (isU(st, 'pitch') || isU(st, 'roll')) { noData(g, X(.27), cy - X(.21), X(.39), X(.42), fs, st.unknown ? '' : undefined); if (st.unknown) unkTag(g, X(.465), cy, fs * 1.05); } else ambBox(g, X(.465), cy, 'ATT', fs * 1.2); }
  else {
    attitude(g, S, X(.465), cy, X(.22), clamp(st.pitch, -60, 60), st.roll, { sky: '#1a6fc0', gnd: '#7a4a14', k: S * .0105, box: [X(.205), X(.26), X(.05)], font: FNN });
    const ax = X(.465), R = X(.23); bankScale(g, ax, cy, R, wh, [10, 20, 30, 45, 60], .02); g.save(); g.translate(ax, cy); g.rotate(-st.roll * D2R); poly(g, [[0, -R], [-S * .018, -R + S * .03], [S * .018, -R + S * .03]], wh); g.fillStyle = wh; g.fillRect(-S * .02, -R + S * .035, S * .04, S * .01); g.restore();
    for (const s of [-1, 1]) { const x0 = ax + s * X(.07), x1 = ax + s * X(.17); g.fillStyle = '#000'; g.strokeStyle = wh; g.lineWidth = S * .005; g.beginPath(); g.rect(Math.min(x0, x1), cy - X(.01), Math.abs(x1 - x0), X(.02)); g.fill(); g.stroke(); }
    g.fillStyle = '#000'; g.fillRect(ax - X(.012), cy - X(.012), X(.024), X(.024)); g.strokeStyle = wh; g.strokeRect(ax - X(.012), cy - X(.012), X(.024), X(.024));
    ln(g, ax - X(.13), cy - X(.03), ax + X(.13), cy - X(.03), S * .007, MAG); ln(g, ax + X(.01), cy - X(.13), ax + X(.01), cy + X(.12), S * .007, MAG);
  }
  const al0 = X(.7), aw = X(.15);
  if (!nz(st.altFt)) fail(st, 'altFt', () => noData(g, al0, X(.15), aw, X(.7), fs), () => ambBox(g, X(.775), cy, 'ALT', fs * 1.1));
  else {
    const a = st.altFt, ppu = S * .0009; tapeV(g, al0, X(.15), aw, X(.7), cy, a, ppu, 100, 200, String, { bg: grey, tl: S * .02, tw: S * .005, lx: X(.795), fs: fs * .95 });
    g.fillStyle = '#000'; g.strokeStyle = wh; g.lineWidth = S * .005; g.beginPath(); g.moveTo(X(.69), cy); g.lineTo(X(.705), cy - X(.04)); g.lineTo(X(.86), cy - X(.04)); g.lineTo(X(.86), cy + X(.04)); g.lineTo(X(.705), cy + X(.04)); g.closePath(); g.fill(); g.stroke();
    const v = Math.max(0, a); T(g, String(Math.floor(v / 1000)), X(.775), cy, fs * 1.4, wh, 'right', 500, FNN); T(g, String(Math.floor(v % 1000 / 20) * 20).padStart(3, '0'), X(.78), cy, fs * 1.05, wh, 'left', 500, FNN);
    if (v < 10000) { g.save(); g.beginPath(); g.rect(X(.71), cy - X(.035), X(.025), X(.07)); g.clip(); for (let i = -4; i < 8; i++) ln(g, X(.71) + i * X(.012), cy + X(.04), X(.71) + i * X(.012) + X(.07), cy - X(.04), S * .004, GRN); g.restore(); }
    T(g, String(Math.round(a / 1000) * 1000), X(.79), X(.1), fs * 1.05, MAG, 'center', 500, FNN); T(g, a > 18000 ? 'STD' : '29.92 IN', X(.78), X(.9), fs, GRN, 'center', 500, FNN);
  }
  if (!nz(st.vs)) fail(st, 'vs', () => noData(g, X(.875), X(.24), X(.085), X(.53), fs * .8, '–'), () => ambBox(g, X(.92), cy, 'VS', fs));
  else {
    poly(g, [[X(.875), X(.24)], [X(.93), X(.24)], [X(.96), X(.35)], [X(.96), X(.65)], [X(.93), X(.77)], [X(.875), X(.77)]], '#2a2a2e'); const m = (v) => Math.sign(v) * pw([[0, 0], [1000, .1], [2000, .17], [6000, .24]])(Math.abs(v));
    for (const [v, t] of [[1000, '1'], [2000, '2'], [6000, '6']]) for (const s of [1, -1]) T(g, t, X(.895), cy - s * m(v) * S, fs * .9, wh, 'center', 500, FNN); ln(g, X(.92), cy, X(.955), cy, S * .005, wh);
    const yv = cy - m(clamp(st.vs, -6500, 6500)) * S; ln(g, X(1.08), cy, X(.915), yv, S * .007, wh); if (Math.abs(st.vs) > 400) T(g, String(Math.round(Math.abs(st.vs) / 50) * 50), X(.92), st.vs > 0 ? X(.21) : X(.8), fs * .9, wh, 'center', 500, FNN);
  }
  if (!nz(st.hdg)) fail(st, 'hdg', () => noData(g, X(.3), X(.84), X(.33), X(.12), fs), () => ambBox(g, X(.465), X(.9), 'HDG', fs));
  else {
    const h = st.hdg, hc = X(.465), hy = X(1.32), R = X(.5); g.save(); g.beginPath(); g.rect(X(.28), X(.82), X(.38), X(.18)); g.clip(); g.fillStyle = '#3a3a40'; g.beginPath(); g.arc(hc, hy, R, 0, TAU); g.fill();
    g.translate(hc, hy); g.rotate(-h * D2R); for (let d = 0; d < 360; d += 5) { g.save(); g.rotate(d * D2R); ln(g, 0, -R, 0, -R + (d % 10 ? S * .015 : S * .03), S * .005, wh); if (d % 30 === 0) T(g, String(d / 10), 0, -R + S * .06, fs, wh, 'center', 500, FNN); g.restore(); } g.restore();
    poly(g, [[hc, X(.83)], [hc - S * .015, X(.81)], [hc + S * .015, X(.81)]], wh); T(g, 'MAG', X(.58), X(.84), fs * .85, GRN, 'center', 500, FNN);
  }
  T(g, 'GS', X(.03), X(.92), fs * .85, st.unknown ? UNC : wh, 'left', 500, FNN); T(g, nz(st.gs) ? String(Math.round(st.gs)) : isU(st, 'gs') ? '–––' : '', X(.1), X(.92), fs * 1.05, nz(st.gs) ? wh : UNC, 'left', 500, FNN);
}
function ndB(g, S, st, k) {
  const ox = S * .5, oy = S * .86, R = S * .7, wh = '#f2f2f2', fs = S * .05; g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  if (!nz(st.hdg)) { if (isU(st, 'hdg')) { g.strokeStyle = UNL; g.lineWidth = S * .005; g.setLineDash([S * .02, S * .02]); g.beginPath(); g.arc(ox, oy, R, Math.PI * 1.17, Math.PI * 1.83); g.stroke(); g.setLineDash([]); noData(g, S * .38, S * .015, S * .24, S * .06, fs); if (st.unknown) unkTag(g, ox, S * .45, fs * 1.05); T(g, 'GS', S * .03, S * .04, fs * .85, UNC, 'left', 500, FNN); T(g, '–––', S * .1, S * .04, fs * 1.05, UNC, 'left', 500, FNN); } else { ambBox(g, S * .5, S * .07, 'HDG', fs * 1.2); ambBox(g, S * .5, S * .45, 'MAP', fs * 1.2); } return; }
  const h = st.hdg; g.strokeStyle = wh; g.lineWidth = S * .004; g.setLineDash([S * .018, S * .018]); for (const f of [.75, .5, .25]) { g.beginPath(); g.arc(ox, oy, R * f, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); } g.setLineDash([]);
  g.save(); g.translate(ox, oy); g.rotate(-h * D2R); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke(); for (let d = 0; d < 360; d += 5) { g.save(); g.rotate(d * D2R); ln(g, 0, -R, 0, -R + (d % 10 ? S * .018 : S * .032), S * .005, wh); if (d % 30 === 0) T(g, String(d / 10), 0, -R + S * .065, fs, wh, 'center', 500, FNN); g.restore(); } g.restore();
  g.strokeStyle = wh; g.lineWidth = S * .005; g.strokeRect(S * .38, S * .015, S * .24, S * .06); T(g, String(Math.round(h)).padStart(3, '0'), S * .5, S * .047, fs * 1.15, wh, 'center', 500, FNN); T(g, 'TRK', S * .32, S * .047, fs * .85, GRN, 'center', 500, FNN); T(g, 'MAG', S * .68, S * .047, fs * .85, GRN, 'center', 500, FNN);
  trackLine(g, ox, oy, R, wh, S * .004); wptMark(g, st, ox, oy, R, h, MAG, fs);
  poly(g, [[ox, oy - S * .04], [ox - S * .025, oy + S * .02], [ox + S * .025, oy + S * .02]], null, wh, S * .006);
  T(g, 'GS', S * .03, S * .04, fs * .85, wh, 'left', 500, FNN); T(g, nz(st.gs) ? String(Math.round(st.gs)) : '', S * .1, S * .04, fs * 1.05, wh, 'left', 500, FNN);
  if (st.wpt?.id && nz(st.wpt.nm)) { T(g, String(st.wpt.id).toUpperCase().slice(0, 6), S * .97, S * .04, fs, MAG, 'right', 500, FNN); T(g, st.wpt.nm.toFixed(1) + ' NM', S * .97, S * .1, fs, wh, 'right', 500, FNN); }
}
function eicasB(g, S, st) {
  const U = !!st.unknown, wh = '#f2f2f2', fs = S * .05; g.fillStyle = '#000'; g.fillRect(0, 0, S, S); T(g, U ? 'TAT –––' : 'TAT -26c', S * .04, S * .04, fs * .9, U ? UNC : wh, 'left', 500, FNN);
  for (const [cx, v] of [[.16, 92.1], [.42, 92.4]]) for (const [cy, lab, r] of [[.2, 'N1', .1], [.5, 'EGT', .085]]) {
    const x = S * cx, y = S * cy, R = S * r, m = (q) => (-200 + q * 2.1) * D2R; g.strokeStyle = U ? UNL : wh; g.lineWidth = S * .007; g.beginPath(); g.arc(x, y, R, m(0), m(100)); g.stroke(); if (!U) { g.fillStyle = '#333'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, R * .95, m(0), m(v * (cy < .3 ? 1 : .7))); g.fill(); ln(g, x, y, x + Math.cos(m(v * (cy < .3 ? 1 : .7))) * R, y + Math.sin(m(v * (cy < .3 ? 1 : .7))) * R, S * .008, wh); }
    g.strokeStyle = U ? UNL : wh; g.lineWidth = S * .004; g.strokeRect(x + S * .01, y - S * .075, S * .1, S * .05); T(g, U ? '–––' : cy < .3 ? v.toFixed(1) : '685', x + S * .06, y - S * .05, fs * 1.05, U ? UNC : wh, 'center', 500, FNN); if (cx < .3) T(g, lab, S * .29, y, fs * .9, U ? UNC : wh, 'center', 500, FNN);
  }
  const W = warnList(st); W.forEach((w, i) => T(g, w, S * .58, S * (.08 + i * .06), fs, sev(w) > 1 ? '#ff2a1a' : AMB, 'left', 500, FNN));
  g.strokeStyle = wh; g.lineWidth = S * .004; g.strokeRect(S * .9, S * .62, S * .05, S * .3); T(g, 'FLAPS', S * .925, S * .95, fs * .8, wh, 'center', 500, FNN);
}
function eadi767(g, W, H, st) {
  g.fillStyle = '#020403'; g.fillRect(0, 0, W, H); const ok = nz(st.pitch) && nz(st.roll), cx = W * .5, cy = H * .52, R = H * .36, fs = H * .07;
  if (ok) { attitude(g, W, cx, cy, R, clamp(st.pitch, -40, 40), st.roll, { sky: '#18a8e0', gnd: '#b87a28', k: R * .038, box: [R * 1.05, R * 1.05, R * .28], font: FNN, st: 5, lim: 25, lw: 1.45 });
    bankScale(g, cx, cy, R * 1.1, '#f2f2f2', [10, 20, 30, 45, 60], .02); g.save(); g.translate(cx, cy); g.rotate(-st.roll * D2R); poly(g, [[0, -R * 1.08], [-H * .02, -R * .98], [H * .02, -R * .98]], '#f2f2f2'); g.restore();
    for (const s of [-1, 1]) poly(g, [[cx + s * R * .25, cy - H * .01], [cx + s * R * .7, cy - H * .01], [cx + s * R * .7, cy + H * .015], [cx + s * R * .32, cy + H * .015], [cx + s * R * .32, cy + H * .05], [cx + s * R * .25, cy + H * .05]], '#000', '#f2f2f2', H * .006);
    ln(g, cx - R * .5, cy - H * .04, cx + R * .5, cy - H * .04, H * .01, MAG); ln(g, cx + H * .01, cy - R * .5, cx + H * .01, cy + R * .5, H * .01, MAG);
    if (apOn(st)) { T(g, 'SPD', W * .3, H * .07, fs, GRN, 'center', 500, FNN); T(g, 'VNAV PTH', W * .5, H * .07, fs, GRN, 'center', 500, FNN); T(g, 'LNAV', W * .7, H * .07, fs, GRN, 'center', 500, FNN); T(g, 'CMD', W * .5, H * .17, fs, GRN, 'center', 500, FNN); }
    T(g, 'GS ' + (nz(st.gs) ? Math.round(st.gs) : ''), W * .03, H * .07, fs, '#f2f2f2', 'left', 500, FNN);
    g.strokeStyle = '#f2f2f2'; g.lineWidth = H * .005; g.strokeRect(W * .1, cy - R * .5, W * .02, R); const se = clamp(((st.ias || 0) % 7) - 3, -5, 5); poly(g, [[W * .125, cy + se * R * .08], [W * .145, cy + se * R * .08 - H * .02], [W * .145, cy + se * R * .08 + H * .02]], '#f2f2f2');
  } else if (isU(st, 'pitch') || isU(st, 'roll')) { noData(g, cx - R, cy - R, R * 2, R * 2, fs, st.unknown ? '' : undefined); if (st.unknown) unkTag(g, cx, cy, fs); } else { ambBox(g, cx, cy, 'ATT', fs * 1.3); }
}
function ehsi767(g, W, H, st) {
  g.fillStyle = '#020403'; g.fillRect(0, 0, W, H); const ox = W * .5, oy = H * .9, R = H * .78, fs = H * .065, wh = '#f2f2f2';
  if (!nz(st.hdg)) { if (isU(st, 'hdg')) { noData(g, W * .42, H * .02, W * .16, H * .08, fs); if (st.unknown) unkTag(g, W * .5, H * .5, fs); } else { ambBox(g, W * .5, H * .1, 'HDG', fs * 1.2); ambBox(g, W * .5, H * .5, 'MAP', fs * 1.2); } return; }
  const h = st.hdg; g.save(); g.beginPath(); g.rect(0, 0, W, H); g.clip(); g.translate(ox, oy); g.rotate(-h * D2R); g.strokeStyle = wh; g.lineWidth = H * .005; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.stroke();
  for (let d = 0; d < 360; d += 5) { g.save(); g.rotate(d * D2R); ln(g, 0, -R, 0, -R + (d % 10 ? H * .02 : H * .04), H * .006, wh); if (d % 30 === 0) T(g, String(d / 10), 0, -R + H * .08, fs, wh, 'center', 500, FNN); g.restore(); } g.restore();
  g.strokeStyle = wh; g.setLineDash([H * .02, H * .02]); g.beginPath(); g.arc(ox, oy, R * .5, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.setLineDash([]);
  trackLine(g, ox, oy, R, wh, H * .005); wptMark(g, st, ox, oy, R, h, MAG, fs);
  poly(g, [[ox, oy - H * .05], [ox - H * .03, oy + H * .02], [ox + H * .03, oy + H * .02]], null, wh, H * .007); g.strokeRect(W * .42, H * .02, W * .16, H * .08); T(g, String(Math.round(h)).padStart(3, '0'), W * .5, H * .065, fs * 1.1, wh, 'center', 500, FNN); T(g, 'M', W * .62, H * .065, fs, GRN, 'center', 500, FNN);
}
function eicas767(g, W, H, st, upper) {
  g.fillStyle = '#020403'; g.fillRect(0, 0, W, H); const wh = '#f2f2f2', fs = H * .07;
  const rows = upper ? [['EPR', 1.42, 1.7, .25], ['N1', 88.6, 110, .53], ['EGT', 612, 1000, .8]] : [['N2', 94.1, 110, .3], ['FF', 2.61, 6, .72]];
  for (const [lab, v, mx, y] of rows) { for (const cx of [.2, .5]) { const x = W * cx, yy = H * y, r = H * .1, m = (q) => (-200 + q / mx * 210) * D2R; const U = !!st.unknown; g.strokeStyle = U ? UNL : wh; g.lineWidth = H * .007; g.beginPath(); g.arc(x, yy, r, m(0), m(mx)); g.stroke(); if (!U) ln(g, x, yy, x + Math.cos(m(v)) * r, yy + Math.sin(m(v)) * r, H * .009, wh); g.strokeRect(x + W * .01, yy - H * .1, W * .1, H * .07); T(g, U ? '–––' : v >= 100 ? String(Math.round(v)) : v.toFixed(v < 10 ? 2 : 1), x + W * .06, yy - H * .065, fs, U ? UNC : wh, 'center', 500, FNN); } T(g, lab, W * .35, H * y + H * .04, fs * .9, CYA, 'center', 500, FNN); }
  if (upper) { const Wl = warnList(st); Wl.forEach((w, i) => T(g, w, W * .66, H * (.1 + i * .08), fs * .95, sev(w) > 1 ? '#ff3a2a' : AMB, 'left', 500, FNN)); }
  else { T(g, 'OIL P', W * .82, H * .25, fs * .85, CYA, 'center', 500, FNN); T(g, '62  64', W * .82, H * .33, fs, wh, 'center', 500, FNN); T(g, 'OIL T', W * .82, H * .48, fs * .85, CYA, 'center', 500, FNN); T(g, '98  97', W * .82, H * .56, fs, wh, 'center', 500, FNN); T(g, 'VIB', W * .82, H * .72, fs * .85, CYA, 'center', 500, FNN); T(g, '0.9 0.8', W * .82, H * .8, fs, wh, 'center', 500, FNN); }
}
function cduFace(g, W, H, o = {}) {
  g.fillStyle = o.body || '#5b636b'; g.fillRect(0, 0, W, H); g.fillStyle = '#050805'; g.fillRect(W * .12, H * .05, W * .76, H * .34); const fs = H * .032;
  const L = o.lines || (o.amber ? ['MCDU MENU', '', '<FMGC', '', '<ACARS', '', '<AIDS', '<CFDS'] : ['INIT/REF INDEX', '', '<IDENT', 'NAV DATA>', '<POS', '', '<PERF', 'MAINT>']);
  L.forEach((s, i) => s && T(g, s, i ? W * (i % 2 ? .82 : .18) : W * .5, H * (.1 + (i >> 1) * .075), fs, i ? '#f2f2f2' : o.amber ? AMB : '#f2f2f2', i ? (i % 2 ? 'right' : 'left') : 'center', 600, FNN));
  for (let r = 0; r < 6; r++) for (const s of [0, 1]) { g.fillStyle = '#2a2d31'; g.fillRect(s ? W * .9 : W * .02, H * (.08 + r * .052), W * .08, H * .035); }
  for (let r = 0; r < 7; r++) for (let c = 0; c < 6; c++) { const x = W * (.08 + c * .145), y = H * (.45 + r * .075); g.fillStyle = r < 2 ? '#3b4148' : '#262a2f'; rr(g, x, y, W * .12, H * .055, W * .01); g.fill(); g.fillStyle = '#d8d8d0'; g.font = `600 ${H * .025}px ${FN}`; g.textAlign = 'center'; g.fillText(r < 2 ? ['INIT', 'RTE', 'CLB', 'CRZ', 'DES', 'DIR'][c] : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/+-.'[(r - 2) * 6 + c] || '', x + W * .06, y + H * .035); }
}
function annunDraw(style) {
  return (g, W, H, st) => {
    const Wl = warnList(st), any = Wl.length > 0, red = Wl.some((w) => sev(w) > 1);
    g.fillStyle = style.bg || '#151515'; g.fillRect(0, 0, W, H);
    if (style.kind === 'master') { const half = W / 2; for (const [i, lab, col, on] of [[0, 'MASTER', RED, red], [1, 'MASTER', AMB, any]]) { const x = i * half + half * .08, w = half * .84; g.fillStyle = on ? col : '#2b2420'; rr(g, x, H * .08, w, H * .84, H * .08); g.fill(); if (on) { g.save(); g.shadowColor = col; g.shadowBlur = H * .3; g.fill(); g.restore(); } T(g, lab, x + w / 2, H * .36, H * .26, on ? '#fff' : '#5a4a40', 'center', 800, FNN); T(g, i ? 'CAUT' : 'WARN', x + w / 2, H * .68, H * .26, on ? '#fff' : '#5a4a40', 'center', 800, FNN); } return; }
    if (style.kind === 'lamps') { const n = style.n || 4; for (let i = 0; i < n; i++) { const x = W * (i + .5) / n, on = i < Wl.length, col = on && sev(Wl[i]) > 1 ? '#ff3020' : style.col || '#ff3020'; const gr = g.createRadialGradient(x - H * .1, H * .32, H * .02, x, H * .4, H * .3); gr.addColorStop(0, on ? '#fff3e0' : '#6a2a22'); gr.addColorStop(.35, on ? col : '#4a1812'); gr.addColorStop(1, on ? '#5a0a04' : '#1a0806'); circ(g, x, H * .4, H * .3, gr, '#888', H * .05); if (on) { g.save(); g.globalCompositeOperation = 'lighter'; circ(g, x, H * .4, H * .42, 'rgba(255,60,30,.25)'); g.restore(); } T(g, on ? Wl[i].slice(0, 9) : '', x, H * .86, H * .16, '#e8e0c4', 'center', 700, FNN); } return; }
    const cols = style.cols || 4, rows = style.rows || 2, cw = W / cols, ch = H / rows;
    for (let i = 0; i < cols * rows; i++) { const x = (i % cols) * cw, y = Math.floor(i / cols) * ch, w = Wl[i], on = !!w, col = on && sev(w) > 1 ? '#ff3a24' : style.lit || '#ffb020'; g.fillStyle = on ? col : style.off || '#26221e'; rr(g, x + cw * .06, y + ch * .1, cw * .88, ch * .8, ch * .12); g.fill(); if (on) { g.save(); g.shadowColor = col; g.shadowBlur = ch * .4; g.fill(); g.restore(); T(g, w.slice(0, 14), x + cw / 2, y + ch / 2, Math.min(ch * .36, cw * .12), '#1a0a00', 'center', 800, FNN); } else if (style.dim) T(g, style.dim[i % style.dim.length], x + cw / 2, y + ch / 2, Math.min(ch * .3, cw * .1), '#55504a', 'center', 700, FNN); }
  };
}

const LK = new V3(.6, .7, -.38).normalize(), SL = new V3(-.5, .75, .45).normalize(), _v = new V3(), _n = new V3(), _c = new THREE.Color();
let FLOOR = -1.2, DECK = false;
const hgt = (y) => lerp(.5, 1, clamp((y + 1.2) / .75));
function shadeAt(n, p) { return DECK ? clamp((.84 + .36 * Math.max(0, n.dot(LK)) - .14 * Math.max(0, -n.y)) * hgt(p.y), .55, 1.2) : clamp((1 + .55 * Math.max(0, n.dot(LK)) + .2 * n.y) * hgt(p.y), .3, 1.75); }
function bake(geo, col, o = {}) {
  if (geo.index) geo = geo.toNonIndexed(); if (!geo.attributes.normal) geo.computeVertexNormals();
  const Pp = geo.attributes.position, N = geo.attributes.normal, n = Pp.count, C = new Float32Array(n * 3), U = new Float32Array(n * 2); _c.set(col); const cc = [_c.r, _c.g, _c.b]; geo.computeBoundingBox(); const bb = geo.boundingBox, fur = o.fin || (bb.max.x - bb.min.x < 1.1 && bb.max.y - bb.min.y < 1.1 && bb.max.z - bb.min.z < 1.1);
  for (let i = 0; i < n; i++) {
    _v.fromBufferAttribute(Pp, i); _n.fromBufferAttribute(N, i); let s = (o.flat ?? (o.sh ? o.sh(_n, _v) : shadeAt(_n, _v))) * (o.k ?? 1); if (o.grad && _n.y > .3) { const [ax, a, b, k0, k1] = o.grad; s *= lerp(k0, k1, clamp((_v.getComponent(ax) - a) / (b - a))); }
    if (DECK && o.ao !== false) { if (o.lz) s *= lerp(.66, 1, clamp(o.lz[i] / .022)); if (fur && _n.y < .7) s *= lerp(.6, 1, clamp((_v.y - FLOOR) / .07)); if (o.fin) s *= hgt(_v.y) * .5 + .5; }
    let wr = 0; if (o.wear) for (const [x, y, z, r, a] of o.wear) { const d = Math.hypot(_v.x - x, _v.y - y, _v.z - z); if (d < r) wr = Math.max(wr, a * (1 - d / r) ** 1.5); }
    for (let k = 0; k < 3; k++) { const ch = cc[k] * s; C[i * 3 + k] = lerp(ch, ch * 1.8 + .03, wr); }
    const ax = Math.abs(_n.x), ay = Math.abs(_n.y), az = Math.abs(_n.z); const us = o.uvs ?? 2.2; U[i * 2] = (ax > ay && ax > az ? _v.z : _v.x) * us; U[i * 2 + 1] = (ay > ax && ay > az ? _v.z : _v.y) * us;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(C, 3)); if (!o.keepUV || !geo.attributes.uv) geo.setAttribute('uv', new THREE.BufferAttribute(U, 2));
  return geo;
}
function merge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count;
  const Pp = new Float32Array(n * 3), N = new Float32Array(n * 3), U = new Float32Array(n * 2), C = new Float32Array(n * 3); let o = 0;
  for (const g of list) { const c = g.attributes.position.count; Pp.set(g.attributes.position.array, o * 3); N.set(g.attributes.normal.array, o * 3); if (g.attributes.uv) U.set(g.attributes.uv.array, o * 2); if (g.attributes.color) C.set(g.attributes.color.array, o * 3); else C.fill(1, o * 3, (o + c) * 3); o += c; g.dispose(); }
  const m = new THREE.BufferGeometry(); m.setAttribute('position', new THREE.BufferAttribute(Pp, 3)); m.setAttribute('normal', new THREE.BufferAttribute(N, 3)); m.setAttribute('uv', new THREE.BufferAttribute(U, 2)); m.setAttribute('color', new THREE.BufferAttribute(C, 3)); return m;
}
function quadGeo(a, b, c, d, nrm) {
  const fl = nrm && new V3().subVectors(c, a).cross(new V3().subVectors(d, b)).dot(nrm) < 0, g = new THREE.BufferGeometry(), p = (fl ? [a, c, b, a, d, c] : [a, b, c, a, c, d]).flatMap((v) => [v.x, v.y, v.z]); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
  const n = nrm || new V3().subVectors(c, a).cross(new V3().subVectors(d, b)).normalize(); g.setAttribute('normal', new THREE.Float32BufferAttribute(Array(6).fill(0).flatMap(() => [n.x, n.y, n.z]), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(fl ? [0, 0, 1, 1, 1, 0, 0, 0, 0, 1, 1, 1] : [0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1], 2)); return g;
}
let GRAIN = null;
let GRAIN0 = null;
function grainTex() { if (!DECK) { if (GRAIN0) return GRAIN0; const c = cv(256, 256), g = c.getContext('2d'); g.fillStyle = '#f4f4f4'; g.fillRect(0, 0, 256, 256); grainOver(g, 256, 256, .1, 'multiply', .5); GRAIN0 = ctex(c); GRAIN0.wrapS = GRAIN0.wrapT = THREE.RepeatWrapping; return GRAIN0; } if (GRAIN) return GRAIN; const c = cv(256, 256), g = c.getContext('2d'), r = rng(21); g.fillStyle = '#f2f2f2'; g.fillRect(0, 0, 256, 256); grainOver(g, 256, 256, .035, 'multiply', .25); g.globalAlpha = .025; for (let i = 0; i < 40; i++) { g.fillStyle = r() < .5 ? '#000' : '#fff'; g.fillRect(r() * 256, 0, 1 + r() * 3, 256); } GRAIN = ctex(c); GRAIN.wrapS = GRAIN.wrapT = THREE.RepeatWrapping; return GRAIN; }
const FIN = { satin: { r: .5, kd: 1.12, km: 0, ks: .6 }, rubber: { r: .34, kd: 1.05, km: 0, ks: .55 }, bake: { r: .2, kd: 1.08, km: 0, ks: .85 }, metal: { r: .3, kd: .5, km: .85, ks: .08 }, chrome: { r: .1, kd: .14, km: 1.3, ks: .12 } }, MCAP = {};
function envAt(x, y, z) {
  if (z > 0) return y > .55 ? .22 : .07;
  if (y < -.22) return .03; if (y < .06) return .07;
  if (Math.abs(x) > .78) return .6; return y > .82 ? .4 : .75 + .25 * clamp(y * 2);
}
function matcap(kind) {
  if (MCAP[kind]) return MCAP[kind];
  const f = FIN[kind], S = 128, c0 = cv(S, S), g0 = c0.getContext('2d'), im = g0.createImageData(S, S), L = new V3(0, .9, -.45).normalize(), met = f.km > 0;
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const x = (i + .5) / S * 2 - 1, y = 1 - (j + .5) / S * 2, q = Math.min(.999, x * x + y * y), z = Math.sqrt(1 - q), k = (j * S + i) * 4, l = Math.sqrt(q + z * z);
    const d = clamp(.32 + .52 * Math.max(0, (x * L.x + y * L.y + z * L.z) / l) + .16 * z - .18 * Math.max(0, -y)), e = envAt(2 * z * x, 2 * z * y, -1 + 2 * z * z) * (met ? 1 : .1 + .9 * (1 - z) ** 2.5);
    im.data[k] = d * 255; im.data[k + 1] = clamp(e) * 255; im.data[k + 2] = 0; im.data[k + 3] = 255;
  }
  g0.putImageData(im, 0, 0); const c = cv(S, S), g = c.getContext('2d'); g.filter = `blur(${(f.r * S * .2).toFixed(1)}px)`; g.drawImage(c0, 0, 0); g.filter = 'none';
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.NoColorSpace; return (MCAP[kind] = t);
}
function finMat(kind) {
  const f = FIN[kind], m = new THREE.MeshMatcapMaterial({ matcap: matcap(kind), vertexColors: true, transparent: true });
  m.defines = { KD: f.kd.toFixed(3), KM: f.km.toFixed(3), KS: f.ks.toFixed(3) };
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;', 'vec3 outgoingLight = diffuseColor.rgb * ( matcapColor.r * KD + matcapColor.g * KM ) + diffuse * ( matcapColor.g * KS );'); };
  return m;
}
const RIV = {};
function rivetTex(p) { if (RIV[p]) return RIV[p]; const S = 256, n = Math.max(4, Math.round(1 / 2.2 / p)), c = cv(S, S), g = c.getContext('2d'), d = S / n; g.fillStyle = '#ececec'; g.fillRect(0, 0, S, S); grainOver(g, S, S, .03, 'multiply', .25); for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const x = (i + .5) * d, y = (j + .5) * d; circ(g, x + .8, y + .8, d * .13, 'rgba(0,0,0,.35)'); circ(g, x, y, d * .11, '#d8d8d8'); circ(g, x - d * .03, y - d * .03, d * .05, '#fff'); } const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (RIV[p] = t); }
function aluTex() { const S = 512, c = cv(S, S), g = c.getContext('2d'), r = rng(31); g.fillStyle = '#d4d6d8'; g.fillRect(0, 0, S, S); for (let i = 0; i < 4; i++) for (let j = 0; j < 10; j++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${.03 + r() * .05})`; g.fillRect(i * S / 4, j * S / 10, S / 4, S / 10); } grainOver(g, S, S, .03, 'multiply', .25);
  for (let j = 0; j < 10; j++) { const y = j * S / 10; ln(g, 0, y, S, y, 2, 'rgba(0,0,0,.25)'); ln(g, 0, y + 2, S, y + 2, 1, 'rgba(255,255,255,.3)'); g.setLineDash([2, 9]); ln(g, 0, y + 6, S, y + 6, 2.2, 'rgba(0,0,0,.35)'); g.setLineDash([]); }
  for (let i = 0; i < 4; i++) { const x = i * S / 4; g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(x, 0, 10, S); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 10, 0, 2, S); g.setLineDash([2, 8]); ln(g, x + 5, 0, x + 5, S, 2.2, 'rgba(0,0,0,.4)'); g.setLineDash([]); }
  const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
const LIN = {};
function liningTex(kind = 'jet', seed = 1) {
  const key = kind + seed; if (LIN[key]) return LIN[key]; const S = 512, c = cv(S, S), g = c.getContext('2d'), r = rng(seed * 17 + 3), rib = kind !== 'jet';
  g.fillStyle = '#eeeeee'; g.fillRect(0, 0, S, S);
  const wrapF = (f) => { for (const dx of [-S, 0, S]) for (const dy of [-S, 0, S]) f(dx, dy); };
  for (let i = 0; i < 16; i++) { const x = r() * S, y = r() * S, rad = 40 + r() * 150, a = .015 + r() * (rib ? .05 : .025), lt = r() < .45; wrapF((dx, dy) => { const gr = g.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, rad); gr.addColorStop(0, lt ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x + dx - rad, y + dy - rad, rad * 2, rad * 2); }); }
  grainOver(g, S, S, rib ? .03 : .018, 'multiply', .3);
  const seam = (x0, y0, x1, y1, w = 3, a = .3) => { const h = y0 === y1; ln(g, x0, y0, x1, y1, w, `rgba(0,0,0,${a})`); ln(g, x0 + (h ? 0 : w * .9), y0 + (h ? w * .9 : 0), x1 + (h ? 0 : w * .9), y1 + (h ? w * .9 : 0), w * .45, `rgba(255,255,255,${a * 1.3})`); };
  const dots = (x0, y0, x1, y1, step, rad, col) => { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / step); for (let i = 0; i <= n; i++) circ(g, lerp(x0, x1, i / n), lerp(y0, y1, i / n), rad, col); };
  if (!rib) {
    for (const [x0, x1] of [[0, 256], [256, 512]]) { const y = x0 ? 310 : 120; seam(x0, y, x1, y); }
    for (const x of [0, 256]) { seam(x + 1.5, 0, x + 1.5, S); dots(x + 10, 14, x + 10, S - 14, 54, 2.2, 'rgba(0,0,0,.28)'); }
    for (let i = 0; i < 2; i++) { const gr = g.createLinearGradient(i * 256, 0, i * 256 + 256, 0); gr.addColorStop(0, 'rgba(0,0,0,.05)'); gr.addColorStop(.2, 'rgba(255,255,255,.04)'); gr.addColorStop(.85, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.07)'); g.fillStyle = gr; g.fillRect(i * 256, 0, 256, S); }
  } else {
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},${.02 + r() * .05})`; g.fillRect(i * 256, j * 128, 256, 128); }
    for (let j = 0; j < 4; j++) { const y = j * 128 + 64; seam(0, y, S, y, 4, .32); dots(4, y - 7, S - 4, y - 7, 13, 1.9, 'rgba(0,0,0,.45)'); dots(4, y + 9, S - 4, y + 9, 13, 1.9, 'rgba(0,0,0,.45)'); }
    for (const x of [0, 256]) { const gr = g.createLinearGradient(x - 26, 0, x + 26, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.25, 'rgba(0,0,0,.32)'); gr.addColorStop(.42, 'rgba(255,255,255,.3)'); gr.addColorStop(.6, 'rgba(255,255,255,.12)'); gr.addColorStop(.8, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; wrapF((dx) => g.fillRect(x - 26 + dx, 0, 52, S)); for (const d of [-15, 15]) wrapF((dx) => dots(x + d + dx, 6, x + d + dx, S - 6, 12, 2.1, 'rgba(0,0,0,.5)')); }
    for (let i = 0; i < 6; i++) { const x = r() * S, y = r() * S, l = 20 + r() * 60; ln(g, x, y, x + l * (r() - .5), y + l, 1, 'rgba(255,255,255,.12)'); }
  }
  const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (LIN[key] = t); }
let HAZE = null;
function hazeTex() { if (HAZE) return HAZE; const c = cv(256, 256), g = c.getContext('2d'), r = rng(5); g.fillStyle = '#9aa2aa'; g.fillRect(0, 0, 256, 256); g.globalAlpha = .18; for (let i = 0; i < 30; i++) { g.strokeStyle = '#fff'; g.lineWidth = .6 + r(); g.beginPath(); const x = r() * 256, y = r() * 256; g.moveTo(x, y); g.lineTo(x + (r() - .5) * 90, y + (r() - .5) * 30); g.stroke(); } g.globalAlpha = .35; grainOver(g, 256, 256, .5, 'overlay', 2); HAZE = ctex(c); HAZE.wrapS = HAZE.wrapT = THREE.RepeatWrapping; return HAZE; }

function frame(F, U, R, yaw = 0, tilt = 0, rollDeg = 0) { const o = new THREE.Object3D(); o.position.set(F, U, R); o.rotation.set(-tilt * D2R, (-90 + yaw) * D2R, rollDeg * D2R, 'YXZ'); o.updateMatrix(); return o.matrix; }

function makeKit() {
  const K = { lists: new Map(), matFor: new Map(), group: new THREE.Group(), mats: [], texs: [], dyn: [], items: [], panels: [], gauges: [], disp: [] };
  K.mat = (key, map, kind = 'cab', o = {}) => K.matFor.set(key, { map, kind, o });
  const push = (key, geo) => { const L = K.cap || K.lists; if (!L.has(key)) L.set(key, []); L.get(key).push(geo); };
  K.add = (geo, col, o = {}) => { let lz = null; if (o.m) { if (geo.index) geo = geo.toNonIndexed(); const p = geo.attributes.position; lz = new Float32Array(p.count); for (let i = 0; i < p.count; i++) lz[i] = p.getZ(i); geo.applyMatrix4(o.m); } const fin = FIN[o.mat]; push(o.mat || 'flat', bake(geo, col, fin ? { flat: 1, ...o, lz, fin: true } : { ...o, lz })); return geo; };
  K.box = (m, p, s, col, o = {}) => { const g = new THREE.BoxGeometry(...s); if (o.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot.map((d) => d * D2R)))); g.translate(...p); return K.add(g, col, { ...o, m }); };
  K.cyl = (m, p, r, h, col, o = {}) => { const g = new THREE.CylinderGeometry(o.r2 ?? r, r, h, o.seg ?? 20, 1, !!o.open); if (o.axis === 'z') g.rotateX(Math.PI / 2); if (o.axis === 'x') g.rotateZ(Math.PI / 2); if (o.rot) g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...o.rot.map((d) => d * D2R)))); g.translate(...p); return K.add(g, col, { ...o, m }); };
  K.sph = (m, p, r, col, o = {}) => { const g = new THREE.SphereGeometry(r, o.seg ?? 16, 10); if (o.sc) g.scale(...o.sc); g.translate(...p); return K.add(g, col, { ...o, m }); };
  K.tube = (pts, r, col, o = {}) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map((p) => new V3(...p)), !!o.closed), o.n ?? 40, r, o.rs ?? 10, !!o.closed); return K.add(g, col, o); };
  K.lathe = (m, p, prof, col, o = {}) => { const g = new THREE.LatheGeometry(prof.map(([a, b]) => new THREE.Vector2(a, b)), o.seg ?? 24); if (o.axis === 'z') g.rotateX(Math.PI / 2); if (o.axis === 'x') g.rotateZ(-Math.PI / 2); g.translate(...p); return K.add(g, col, { ...o, m }); };
  K.quad = (a, b, c, d, col, o = {}) => K.add(quadGeo(...[a, b, c, d].map((v) => new V3(...v))), col, o);
  K.prism = (prof, z0, z1, col, o = {}) => { const s = new THREE.Shape(prof.map(([a, b]) => new THREE.Vector2(a, b))); const g = new THREE.ExtrudeGeometry(s, { depth: z1 - z0, bevelEnabled: false, curveSegments: 4 }); g.translate(0, 0, z0); return K.add(g, col, o); };
  K.flatShape = (m, pts, col, o = {}) => { const g = new THREE.ShapeGeometry(new THREE.Shape(pts.map(([a, b]) => new THREE.Vector2(a, b)))); if (o.z) g.translate(0, 0, o.z); return K.add(g, col, { ...o, m }); };
  K.gauge = (m, x, y, d, def, o = {}) => {
    const r = d / 2, z = o.z ?? .004; K.items.push({ m, x, y, r: r * 1.14, sq: def.sq, kind: 'g', screws: o.screws });
    K.gauges.push({ m, x, y, r, z, def, dyn: !!def.dyn });
    if (o.bezel !== false) { const bc = o.bez || '#141414', br = r * (def.sq ? 1.06 : 1.12), h = o.bh ?? Math.min(.016, d * .14);
      if (def.sq) { for (const [px, py, w, hh] of [[0, r + (br - r) / 2, br * 2, br - r], [0, -r - (br - r) / 2, br * 2, br - r], [r + (br - r) / 2, 0, br - r, r * 2], [-r - (br - r) / 2, 0, br - r, r * 2]]) K.box(m, [x + px, y + py, h / 2], [w, hh, h], bc); }
      else { K.cyl(m, [x, y, h / 2], br, h, bc, { axis: 'z', open: true, seg: 28 }); const rg = new THREE.RingGeometry(r * .97, br, 28); rg.translate(x, y, h); K.add(rg, bc, { m, k: 1.25 }); const ig = new THREE.CylinderGeometry(r * .99, r * .99, h, 28, 1, true); ig.rotateX(Math.PI / 2); ig.translate(x, y, h / 2); K.add(ig, '#050505', { m, flat: .5 }); } }
  };
  K.screen = (m, x, y, w, h, draw, o = {}) => {
    const res = Math.round((o.res ?? 512) * TS), W = w >= h ? res : Math.round(res * w / h), H = w >= h ? Math.round(res * h / w) : res, c = cv(W, H), t = ctex(c), mt = new THREE.MeshBasicMaterial({ map: t, transparent: true });
    const geo = new THREE.PlaneGeometry(w, h); geo.translate(x, y, o.z ?? .003); geo.applyMatrix4(m); const mesh = new THREE.Mesh(geo, mt); mesh.renderOrder = 105; mesh.frustumCulled = false; K.group.add(mesh);
    K.texs.push(t); K.mats.push({ m: mt, kind: o.kind || 'disp' }); const it = { c, g: c.getContext('2d'), t, draw, W, H, sig: o.sig, last: null, k: {}, once: !o.dyn, sb: o.sb }; K.disp.push(it);
    if (o.item !== false) K.items.push({ m, x, y, w: w + .012, h: h + .012, kind: 's' });
    if (o.bezel !== false) { const b = o.bw ?? .012, d = o.bd ?? .012, bc = o.bez || '#202326'; for (const [px, py, ww, hh] of [[0, h / 2 + b / 2, w + b * 2, b], [0, -h / 2 - b / 2, w + b * 2, b], [w / 2 + b / 2, 0, b, h], [-w / 2 - b / 2, 0, b, h]]) K.box(m, [x + px, y + py, d / 2], [ww, hh, d], bc); }
    return it;
  };
  K.panel = (m, rect, paint, o = {}) => { const p = { m, rect, paint, o }; K.panels.push(p); return p; };
  K.cabin = (def) => {
    const { rcl, cols, pat, col } = def, dep = def.depth ?? .07, ref = new V3(...(def.ref || [.1, -.15, rcl])), mir = (q) => [q[0], q[1], 2 * rcl - q[2]], rad = def.corner ?? .05;
    for (const C of def.mirror === false ? [cols] : [cols, cols.map((c) => c.map(mir))]) for (let j = 0; j < C.length - 1; j++) for (let k = 0; k < C[j].length - 1; k++) {
      const t = pat[j][k], A = new V3(...C[j][k]), B = new V3(...C[j + 1][k]), Cc = new V3(...C[j + 1][k + 1]), Dd = new V3(...C[j][k + 1]), mid = A.clone().add(B).add(Cc).add(Dd).multiplyScalar(.25);
      if (A.distanceTo(B) + Cc.distanceTo(Dd) < 1e-4 && A.distanceTo(Dd) + B.distanceTo(Cc) < 1e-4) continue;
      let n = new V3().subVectors(Cc, A).cross(new V3().subVectors(Dd, B)); if (n.lengthSq() < 1e-10) continue; n.normalize(); if (n.dot(new V3().subVectors(ref, mid)) < 0) n.negate();
      if (t !== 'g' && t !== 'G') { K.add(quadGeo(A, B, Cc, Dd, n), col[t] || col.w, def.rivet && t === 'f' ? { mat: 'rivet' } : def.rmat && t === 'r' ? { mat: def.rmat, uvs: def.wuv } : def.wmat && (def.wcells || 'w').includes(t) ? { mat: def.wmat, uvs: def.wuv } : {}); continue; }
      const out = n.clone().multiplyScalar(-dep), [A2, B2, C2, D2] = [A, B, Cc, Dd].map((v) => v.clone().add(out)), fc = col.f, eds = [[A, B, B2, A2], [B, Cc, C2, B2], [Cc, Dd, D2, C2], [Dd, A, A2, D2]];
      for (const [p, q, q2, p2] of eds) { const en = new V3().subVectors(q, p).cross(out).normalize(); if (en.dot(new V3().subVectors(mid, p)) < 0) en.negate(); K.add(quadGeo(p, q, q2, p2, en), fc, { k: .85, ...(def.rivet ? { mat: 'rivet' } : {}) });
        if (def.bev) { const b = out.clone().normalize().multiplyScalar(def.bev[0]), e = en.clone().multiplyScalar(.0012), lt = .75 + .7 * Math.max(0, en.y) + .35 * Math.max(0, en.z * Math.sign(rcl + .01 - mid.z)); K.add(quadGeo(p.clone().add(e), q.clone().add(e), q.clone().add(b).add(e), p.clone().add(b).add(e), en), def.bev[1], { flat: lt, ao: false }); } }
      if (def.rivet) K.mat('rivet', rivetTex(def.rivet), 'cab');
      const bl = (s, tt, dd) => A.clone().lerp(B, s).lerp(Dd.clone().lerp(Cc, s), tt).add(n.clone().multiplyScalar(-dd)), ls = A.distanceTo(B), lt = A.distanceTo(Dd), rs = clamp(rad / ls, 0, .3), rt2 = clamp(rad / lt, 0, .3), fan = [];
      for (const [cs, ct, a0] of [[0, 0, 180], [1, 0, 270], [1, 1, 0], [0, 1, 90]]) { const cx = cs ? 1 - rs : rs, cy = ct ? 1 - rt2 : rt2; for (let i = 0; i < 5; i++) { const a = (a0 + i * 18) * D2R, b = (a0 + (i + 1) * 18) * D2R; fan.push(bl(cs, ct, dep * .55), bl(cx + Math.cos(a) * rs, cy + Math.sin(a) * rt2, dep * .55), bl(cx + Math.cos(b) * rs, cy + Math.sin(b) * rt2, dep * .55)); } }
      const fg = new THREE.BufferGeometry(); fg.setAttribute('position', new THREE.Float32BufferAttribute(fan.flatMap((v) => [v.x, v.y, v.z]), 3)); fg.setAttribute('normal', new THREE.Float32BufferAttribute(fan.flatMap(() => [n.x, n.y, n.z]), 3)); K.add(fg, fc, { k: .8 });
      const gq = new V3().subVectors(B2, A2).cross(new V3().subVectors(C2, A2)).dot(n) >= 0 ? quadGeo(A2, B2, C2, D2, n) : quadGeo(A2, D2, C2, B2, n); gq.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, ls, 0, ls, lt, 0, 0, ls, lt, 0, lt].map((v) => v * .6), 2)); push('glass', gq);
      if (DECK || def.seal) { const es = clamp((def.seal ?? .014) / ls, 0, .2), et = clamp((def.seal ?? .014) / lt, 0, .2), sd = dep * .96, sc = def.sealc || '#0d0e0f';
      for (const [s0, t0, s1, t1] of [[0, 0, 1, et], [0, 1 - et, 1, 1], [0, 0, es, 1], [1 - es, 0, 1, 1]]) K.add(quadGeo(bl(s0, t0, sd), bl(s1, t0, sd), bl(s1, t1, sd), bl(s0, t1, sd), n), sc, { flat: 1, ao: false }); }
    }
  };
  K.hdr = (cols, idx, U) => { for (const i of idx) { const c = cols[i], a = c[1], b = c[2], t = (U - a[1]) / (b[1] - a[1]); c[2] = [lerp(a[0], b[0], t), U, lerp(a[2], b[2], t)]; } return cols; };
  K.jet = (o) => {
    const { rcl, F = .8, fl = FLOOR, pc = '#2b2e31' } = o;
    for (const sz of [0, 2 * rcl]) for (const sd of [-1, 1]) { const z = sz + sd * .12; K.box(null, [F, fl + .2, z], [.025, .2, .085], pc, { rot: [0, 0, 16], mat: 'satin', wear: [[F - .03, fl + .26, z, .07, .35]] }); for (let i = 0; i < 5; i++) K.box(null, [F - .016, fl + .13 + i * .035, z], [.006, .008, .075], '#121314', { rot: [0, 0, 16] }); K.box(null, [F + .07, fl + .1, z], [.16, .03, .03], '#1a1b1c', { rot: [0, 0, 35], mat: 'satin' }); }
    const fs = o.seat; if (fs) { const z = 2 * rcl, x = fs.F ?? -.3, cu = fs.cu ?? -.72, fab = fs.fab || '#5a6068', sh = fs.shell || '#3a3e44';
      const c1 = roundBox(.5, .5, .1, .04, 2); c1.rotateX(-Math.PI / 2); c1.translate(x + .2, cu - .05, z); K.add(c1, '#f0f0f0', { mat: 'seatfab' });
      const bk = roundBox(.48, .78, .12, .05, 2); bk.rotateY(Math.PI / 2); bk.rotateZ(.2); bk.translate(x - .16, cu + .4, z); K.add(bk, '#f0f0f0', { mat: 'seatfab' });
      const hr = roundBox(.28, .18, .1, .04, 2); hr.rotateY(Math.PI / 2); hr.rotateZ(.2); hr.translate(x - .26, cu + .88, z); K.add(hr, '#f0f0f0', { mat: 'seatfab' });
      const sb = roundBox(.52, .82, .04, .02, 1); sb.rotateY(Math.PI / 2); sb.rotateZ(.2); sb.translate(x - .23, cu + .4, z); K.add(sb, sh, { mat: 'satin' });
      for (const sd of [-1, 1]) { K.box(null, [x + .12, cu + .2, z + sd * .29], [.36, .05, .07], sh, { mat: 'satin' }); K.box(null, [x + .1, cu - .25, z + sd * .2], [.4, .38, .05], '#202224'); }
      K.box(null, [x + .1, fl + .05, z], [.6, .1, .5], '#1c1d1f'); K.mat('seatfab', fabric(fab, fs.kind || 'slip', { seed: 3 }), 'cab'); }
    for (const w of o.wipers || []) { const [a, b] = w; K.tube([a, lerp3(a, b, .5, .006), b], .007, '#1b1c1d', { n: 6, rs: 6, mat: 'satin' }); K.tube([lerp3(a, b, .25, .012), lerp3(a, b, 1.05, .012)], .005, '#0e0e0e', { n: 4, rs: 5 }); K.cyl(null, a, .016, .02, '#222', { mat: 'satin' }); }
  };
  K.visor = (A, B, C, D, s0, s1, t0, t1, o = {}) => {
    const P = (s, t) => new V3(...lerp3(lerp3(A, B, s), lerp3(D, C, s), t)), n = new V3().subVectors(P(1, 0), P(0, 0)).cross(new V3().subVectors(P(0, 1), P(0, 0))).normalize(); if (n.x > 0) n.negate();
    const d = o.d ?? .03, off = (v, e = d) => v.clone().addScaledVector(n, e).toArray(), q = [P(s0, t0), P(s1, t0), P(s1, t1), P(s0, t1)];
    K.quad(...q.map((v) => off(v)), o.col || '#06090a', { mat: 'visor', flat: 1, ao: false }); K.mat('visor', null, 'cab', { opacity: o.op ?? .8, depthWrite: false });
    for (const [a, b, r] of [[q[0], q[1], .0045], [q[1], q[2], .004], [q[3], q[0], .004]]) K.tube([off(a), off(b)], r, '#141516', { n: 1, rs: 5, mat: 'satin' });
    K.tube([off(P(s0 - .03, t1 + .02), d + .008), off(P(s1 + .03, t1 + .02), d + .008)], .009, o.rail || '#202224', { n: 1, rs: 8, mat: 'satin' });
    K.box(null, off(P(lerp(s0, s1, .5), t0), d + .006), [.012, .012, .05], '#101112', { mat: 'rubber' });
  };
  K.outside = (geo, mat) => { const ms = new THREE.Mesh(geo, mat); ms.renderOrder = 104; ms.frustumCulled = false; K.group.add(ms); K.mats.push({ m: mat, kind: 'out' }); };
  K.finish = () => {
    const S = Math.round(256 * TS), dynG = K.gauges.filter((q) => q.dyn), stG = K.gauges.filter((q) => !q.dyn);
    for (const [list, dyn] of [[dynG, true], [stG, false]]) {
      if (!list.length) continue; const slot = dyn ? S : Math.round(S * .75), cols = Math.ceil(Math.sqrt(list.length)), rows = Math.ceil(list.length / cols), c = cv(cols * slot, rows * slot), g = c.getContext('2d'), t = ctex(c), geos = [];
      list.forEach((q, i) => { q.sx = (i % cols) * slot; q.sy = Math.floor(i / cols) * slot; q.slot = slot; q.fc = cv(slot, slot); q.def.face(q.fc.getContext('2d'), slot); const geo = q.def.sq ? new THREE.PlaneGeometry(q.r * 2, q.r * 2) : new THREE.CircleGeometry(q.r, 40), uv = geo.attributes.uv; for (let j = 0; j < uv.count; j++) uv.setXY(j, (q.sx + uv.getX(j) * slot) / c.width, 1 - (q.sy + (1 - uv.getY(j)) * slot) / c.height); geo.translate(q.x, q.y, q.z); geo.applyMatrix4(q.m); geos.push(geo); });
      const drawAll = (st) => { const off = st.lights === false; for (const q of list) { g.save(); g.translate(q.sx, q.sy); g.beginPath(); g.rect(0, 0, slot, slot); g.clip(); g.fillStyle = '#050505'; g.fillRect(0, 0, slot, slot); g.drawImage(q.fc, 0, 0); const un = st.unknown && q.def.dyn && !q.def.clk && !off; if (q.def.dyn && !un) q.def.dyn(g, slot, off && !q.def.sb ? DEAD : st, q.k || (q.k = {})); if (un) { g.fillStyle = 'rgba(0,0,0,.5)'; g.fillRect(0, 0, slot, slot); T(g, '– – –', slot / 2, slot * .5, slot * .11, UNC, 'center', 700, FNN); } glint(g, slot, q.def.sq); if (off) { g.fillStyle = q.def.sb ? 'rgba(0,0,0,.3)' : 'rgba(0,0,0,.62)'; g.fillRect(0, 0, slot, slot); } g.restore(); } t.needsUpdate = true; };
      if (!dyn) drawAll({});
      const mt = new THREE.MeshBasicMaterial({ map: t, transparent: true }), mesh = new THREE.Mesh(merge(geos.map((x) => (x.index ? x.toNonIndexed() : x))), mt); mesh.renderOrder = 105; mesh.frustumCulled = false; K.group.add(mesh); K.mats.push({ m: mt, kind: 'gauge' }); K.texs.push(t);
      if (dyn) K.dyn.push(drawAll);
    }
    for (const p of K.panels) {
      const { x0, x1, y0, y1 } = p.rect, kpx = Math.min((p.o.ppm ?? 900) * TS, 2048 * TS / Math.max(x1 - x0, y1 - y0)), c = cv((x1 - x0) * kpx, (y1 - y0) * kpx), g = c.getContext('2d');
      const lc = p.o.legend ? cv(c.width, c.height) : null, lg = lc?.getContext('2d'), lit = (col) => /^#[c-f]/i.test(col), X = (x) => (x - x0) * kpx, Y = (y) => (y1 - y) * kpx, L = (l) => l * kpx, its = K.items.filter((i) => i.m === p.m && i.x > x0 - .05 && i.x < x1 + .05 && i.y > y0 - .05 && i.y < y1 + .05);
      const Pt = { g, k: kpx, X, Y, L, W: c.width, H: c.height,
        fill(col) { g.fillStyle = col; g.fillRect(0, 0, c.width, c.height); },
        rect(x, y, w, h, col, r = 0) { g.fillStyle = col; rr(g, X(x - w / 2), Y(y + h / 2), L(w), L(h), L(r)); g.fill(); },
        inset(x, y, w, h, col, o = {}) { const xx = X(x - w / 2), yy = Y(y + h / 2), ww = L(w), hh = L(h); g.fillStyle = col; rr(g, xx, yy, ww, hh, L(o.r ?? .004)); g.fill(); g.lineWidth = L(.0025); g.strokeStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.moveTo(xx, yy + hh); g.lineTo(xx, yy); g.lineTo(xx + ww, yy); g.stroke(); g.strokeStyle = 'rgba(0,0,0,.45)'; g.beginPath(); g.moveTo(xx + ww, yy); g.lineTo(xx + ww, yy + hh); g.lineTo(xx, yy + hh); g.stroke(); if (o.screws !== false) for (const [sx, sy] of [[.5, .5], [-.5, .5], [.5, -.5], [-.5, -.5]]) Pt.screw(x + sx * (w - .016), y + sy * (h - .016)); },
        screw(x, y, r = .0035) { circ(g, X(x), Y(y), L(r), '#2a2a2a'); circ(g, X(x) - L(r * .2), Y(y) - L(r * .2), L(r * .7), 'rgba(200,200,200,.35)'); ln(g, X(x) - L(r * .6), Y(y), X(x) + L(r * .6), Y(y), L(r * .3), '#111'); },
        text(s, x, y, size, col = '#e8e8e0', al = 'center', wt = 600) { T(g, s, X(x), Y(y), L(size), col, al, wt); if (lg && lit(col)) T(lg, s, X(x), Y(y), L(size), '#fff4dc', al, wt); },
        knob(x, y, r, col = '#d8d8d0') { const gr = g.createRadialGradient(X(x) - L(r * .3), Y(y) - L(r * .3), 0, X(x), Y(y), L(r)); gr.addColorStop(0, '#fff'); gr.addColorStop(.4, col); gr.addColorStop(1, '#333'); g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = L(r * .5); g.shadowOffsetY = L(r * .3); circ(g, X(x), Y(y), L(r), gr); g.restore(); },
        btn(x, y, w, h, col = '#1a1a1a', lab, lc = '#ddd', lit) { g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = L(.003); g.shadowOffsetY = L(.002); g.fillStyle = col; rr(g, X(x - w / 2), Y(y + h / 2), L(w), L(h), L(.002)); g.fill(); g.restore(); if (lit) { g.fillStyle = lit; g.fillRect(X(x - w * .3), Y(y - h * .18), L(w * .6), L(h * .14)); } if (lab) { T(g, lab, X(x), Y(y + h * .12), L(Math.min(h * .3, w * .22)), lc, 'center', 700); if (lg) T(lg, lab, X(x), Y(y + h * .12), L(Math.min(h * .3, w * .22)), '#fff4dc', 'center', 700); } },
        toggle(x, y, s = .012) { circ(g, X(x), Y(y), L(s * .45), '#0d0d0d', '#777', L(s * .08)); g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = L(s * .3); g.shadowOffsetY = L(s * .4); ln(g, X(x), Y(y), X(x), Y(y + s * .7), L(s * .22), '#cfcfcf'); g.restore(); circ(g, X(x), Y(y + s * .7), L(s * .16), '#eee'); },
        grille(x, y, r) { circ(g, X(x), Y(y), L(r), '#2b3137'); for (let i = -6; i <= 6; i++) for (let j = -6; j <= 6; j++) if (i * i + j * j < 34) circ(g, X(x + i * r / 7), Y(y + j * r / 7), L(r * .045), '#14181c'); },
        lcd(x, y, w, h, s, col = '#f2f2f2', bg = '#050505') { g.fillStyle = bg; g.fillRect(X(x - w / 2), Y(y + h / 2), L(w), L(h)); T(g, s, X(x + w * .44), Y(y), L(h * .74), col, 'right', 600, FNN); if (lg) T(lg, s, X(x + w * .44), Y(y), L(h * .74), col, 'right', 600, FNN); },
        noise(a = .18, sc = 1, op = 'overlay') { if (DECK) grainOver(g, c.width, c.height, Math.min(.035, a * .3), op, Math.max(.2, kpx / 4000) * Math.min(1, sc)); else grainOver(g, c.width, c.height, a, op, sc); },
        grime(o = {}) { const r = rng(o.seed ?? Math.round(x0 * 97 + y0 * 31 + 7)), e = L(o.edge ?? .03); for (const [gx0, gy0, gx1, gy1, rx, ry] of [[0, 0, e, 0, 0, 0], [c.width, 0, c.width - e, 0, c.width - e, 0], [0, 0, 0, e, 0, 0], [0, c.height, 0, c.height - e, 0, c.height - e]]) { const gr = g.createLinearGradient(gx0, gy0, gx1, gy1); gr.addColorStop(0, `rgba(0,0,0,${o.ea ?? .14})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(rx, ry, gx1 === gx0 ? c.width : e, gy1 === gy0 ? c.height : e); }
          const n = Math.round((x1 - x0) * (y1 - y0) * (o.n ?? 14)); for (let i = 0; i < n; i++) { const px = r() * c.width, py = r() * c.height, rad = L(.03 + r() * .09), gr = g.createRadialGradient(px, py, 0, px, py, rad), lt = r() < .35; gr.addColorStop(0, lt ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(px - rad, py - rad, rad * 2, rad * 2); } },
        shade(top = .5, h = .08) { const gr = g.createLinearGradient(0, 0, 0, L(h)); gr.addColorStop(0, `rgba(0,0,0,${top})`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, c.width, L(h)); },
        guard(x, y, w, h, col = '#3b3d40') { const t = Math.min(w, h) * .16; g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = L(t); g.shadowOffsetY = L(t * .5); for (const [gx, gy, gw, gh] of [[x - w / 2 + t / 2, y, t, h], [x + w / 2 - t / 2, y, t, h], [x, y - h / 2 + t / 2, w, t]]) Pt.rect(gx, gy, gw, gh, col, t * .3); g.restore(); g.fillStyle = 'rgba(255,255,255,.18)'; for (const gx of [x - w / 2, x + w / 2 - t]) g.fillRect(X(gx), Y(y + h / 2), Math.max(1, L(t * .35)), L(h)); },
        lens(x, y, w, h, t) { const b = Math.min(w, h) * .14; Pt.rect(x, y, w + b * 2, h + b * 2, '#2a2b2d', b); Pt.rect(x, y, w + b, h + b, '#070707', b * .6); const gr = g.createLinearGradient(0, Y(y + h / 2), 0, Y(y - h / 2)); gr.addColorStop(0, '#2b2924'); gr.addColorStop(.5, '#171612'); gr.addColorStop(1, '#100f0d'); g.fillStyle = gr; rr(g, X(x - w / 2), Y(y + h / 2), L(w), L(h), L(b * .6)); g.fill(); g.fillStyle = 'rgba(255,255,255,.1)'; g.fillRect(X(x - w / 2), Y(y + h / 2), L(w), Math.max(1, L(h * .14))); if (t) T(g, t, X(x), Y(y), L(Math.min(h * .3, w * .16)), '#57534a', 'center', 700, FNN); },
        dim(s, x, y, size, a = .15, col = '#dcdcd4') { T(g, s, X(x), Y(y), L(size), col, 'center', 600, FNN); if (lg) { lg.globalAlpha = a; T(lg, s, X(x), Y(y), L(size), '#fff4dc', 'center', 600, FNN); lg.globalAlpha = 1; } },
        gl(pts, w, a = .08, col = '#c9ccc8') { for (const [cx, al] of [[g, 1], [lg, a]]) { if (!cx) continue; cx.globalAlpha = al; cx.strokeStyle = cx === g ? col : '#fff4dc'; cx.lineWidth = Math.max(1, L(w)); cx.beginPath(); pts.forEach(([px, py], i) => (i ? cx.lineTo(X(px), Y(py)) : cx.moveTo(X(px), Y(py)))); cx.stroke(); cx.globalAlpha = 1; } },
        pb(x, y, w, h, t1, t2) { g.save(); g.shadowColor = 'rgba(0,0,0,.6)'; g.shadowBlur = L(.002); g.shadowOffsetY = L(.0015); Pt.rect(x, y, w, h, '#2b2e31', w * .1); g.restore(); Pt.rect(x, y, w * .84, h * .84, '#0f1012', w * .06); ln(g, X(x - w * .4), Y(y), X(x + w * .4), Y(y), Math.max(1, L(.0006)), '#26282b'); if (t1) T(g, t1, X(x), Y(y + h * .2), L(h * .22), '#6e5c34', 'center', 700, FNN); if (t2) T(g, t2, X(x), Y(y - h * .2), L(h * .22), '#5a5f63', 'center', 700, FNN); g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(X(x - w * .42), Y(y + h * .42), L(w * .84), Math.max(1, L(h * .08))); },
        label(x, y, w, h, col = '#d8d8d0') { const n = 1 + Math.round(Math.abs(Math.sin(x * 91 + y * 37)) * 2), gp = w * .12, sw = (w - gp * (n - 1)) / n; for (let i = 0; i < n; i++) { const sx = X(x - w / 2 + i * (sw + gp)), sy = Y(y + h / 2), ww = L(sw), hh = Math.max(1, L(h)); g.fillStyle = col; g.fillRect(sx, sy, ww, hh); if (lg) { lg.globalAlpha = .05; lg.fillStyle = '#fff4dc'; lg.fillRect(sx, sy, ww, hh); lg.globalAlpha = 1; } } },
      };
      p.paint(Pt, its);
      for (const i of its) { if (i.kind === 'g') { g.save(); g.shadowColor = 'rgba(0,0,0,.75)'; g.shadowBlur = L(i.r * .25); g.shadowOffsetY = L(i.r * .12); if (i.sq) { g.fillStyle = '#060606'; g.fillRect(X(i.x - i.r * 1.04), Y(i.y + i.r * 1.04), L(i.r * 2.08), L(i.r * 2.08)); } else circ(g, X(i.x), Y(i.y), L(i.r * 1.04), '#060606'); g.restore(); if (i.screws) for (const a of [45, 135, 225, 315]) Pt.screw(i.x + Math.cos(a * D2R) * i.r * 1.2, i.y + Math.sin(a * D2R) * i.r * 1.2, .0032); } else { g.save(); g.shadowColor = 'rgba(0,0,0,.7)'; g.shadowBlur = L(.008); g.fillStyle = '#0a0a0a'; g.fillRect(X(i.x - i.w / 2), Y(i.y + i.h / 2), L(i.w), L(i.h)); g.restore(); } }
      if (DECK && p.o.grime !== false) Pt.grime(p.o.grime || {}); if (p.o.after) p.o.after(Pt);
      const t = ctex(c), mt = new THREE.MeshBasicMaterial({ map: t, vertexColors: true, transparent: true, side: THREE.DoubleSide }), out = p.o.shape || [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
      const geo = new THREE.ShapeGeometry(new THREE.Shape(out.map(([a, b]) => new THREE.Vector2(a, b))), 12), pos = geo.attributes.position, uv = geo.attributes.uv; for (let j = 0; j < pos.count; j++) uv.setXY(j, (pos.getX(j) - x0) / (x1 - x0), (pos.getY(j) - y0) / (y1 - y0));
      if (DECK) geo.translate(0, 0, .0015); geo.applyMatrix4(p.m); const pg = bake(geo, '#ffffff', { keepUV: true, flat: p.o.flat ?? 1 }); const mesh = new THREE.Mesh(pg, mt); mesh.renderOrder = 105; mesh.frustumCulled = false; K.group.add(mesh); K.mats.push({ m: mt, kind: 'cab' }); K.texs.push(t);
      if (lc) { const lt = ctex(lc), lm = new THREE.MeshBasicMaterial({ map: lt, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: .999 }), lgeo = pg.clone(); lgeo.deleteAttribute('color'); const ms = new THREE.Mesh(lgeo, lm); ms.renderOrder = 106; ms.frustumCulled = false; K.group.add(ms); K.mats.push({ m: lm, kind: 'legend' }); K.texs.push(lt); }
      if (p.o.edge !== false) { const d = p.o.depth ?? .03; for (let j = 0; j < out.length; j++) { const [a, b] = [out[j], out[(j + 1) % out.length]]; K.quad(...[[a[0], a[1], 0], [b[0], b[1], 0], [b[0], b[1], -d], [a[0], a[1], -d]].map((q) => new V3(...q).applyMatrix4(p.m).toArray()), p.o.edgeCol || '#1a1a1a', { k: .8 }); } }
    }
    const flatM = new THREE.MeshBasicMaterial({ map: grainTex(), vertexColors: true, transparent: true, side: THREE.DoubleSide });
    const mk = (key, list, dx) => {
      const geo = merge(list); if (dx) geo.translate(-dx[0], -dx[1], -dx[2]); let mt;
      if (key === 'glass') { mt = new THREE.MeshBasicMaterial({ map: hazeTex(), color: 0xc8d4dc, transparent: true, opacity: .07, depthWrite: false, side: THREE.DoubleSide }); K.mats.push({ m: mt, kind: 'glass' }); }
      else if (key === 'lamp') { mt = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true }); K.mats.push({ m: mt, kind: 'gauge' }); }
      else if (FIN[key]) { mt = finMat(key); K.mats.push({ m: mt, kind: 'cab' }); }
      else if (K.matFor.get(key)?.kind.startsWith('fin:')) { const q = K.matFor.get(key); mt = finMat(q.kind.slice(4)); mt.map = q.map; K.mats.push({ m: mt, kind: 'cab' }); K.texs.push(q.map); }
      else if (K.matFor.has(key)) { const q = K.matFor.get(key); mt = new THREE.MeshBasicMaterial({ map: q.map, vertexColors: true, transparent: true, side: THREE.DoubleSide, ...q.o }); K.mats.push({ m: mt, kind: q.kind }); if (q.map && q.map !== GRAIN && q.map !== HAZE) K.texs.push(q.map); }
      else { mt = flatM; }
      const mesh = new THREE.Mesh(geo, mt); mesh.name = key; mesh.renderOrder = key === 'glass' || mt.opacity < 1 ? 106 : 105; mesh.frustumCulled = false; return mesh;
    };
    for (const [key, list] of K.lists) if (list.length) K.group.add(mk(key, list));
    for (const y of K.yokes || []) { y.g = new THREE.Group(); y.g.position.set(...y.piv); for (const [key, list] of y.cap) if (list.length) y.g.add(mk(key, list, y.piv)); K.group.add(y.g); }
    K.mats.push({ m: flatM, kind: 'cab' });
    for (const d of K.disp) if (d.once) { paintDisp(d, {}); d.t.needsUpdate = true; }
  };
  return K;
}

const DEAD = { warnings: [], lights: false }, deadDisp = (d) => { const g = d.g, l = g.createLinearGradient(0, 0, d.W * .7, d.H); g.fillStyle = '#050607'; g.fillRect(0, 0, d.W, d.H); l.addColorStop(0, 'rgba(255,255,255,.045)'); l.addColorStop(.45, 'rgba(255,255,255,.012)'); l.addColorStop(.46, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, d.W, d.H); };
const SQ = new Set([pfdA, ndA, ewdA, sdA, isis, pfdB, ndB, eicasB]), paintDisp = (d, st) => { if (SQ.has(d.draw)) d.draw(d.g, d.W, st, d.k); else d.draw(d.g, d.W, d.H, st, d.k); const g = d.g, l = g.createLinearGradient(0, 0, d.W * .7, d.H); l.addColorStop(0, 'rgba(255,255,255,.07)'); l.addColorStop(.45, 'rgba(255,255,255,.02)'); l.addColorStop(.46, 'rgba(255,255,255,0)'); g.fillStyle = l; g.fillRect(0, 0, d.W, d.H); };
const sigOf = (st) => [st.ias, st.altFt, st.vs, st.pitch, st.roll, st.hdg, st.gs].map((v) => (nz(v) ? Math.round(v * 4) : 'x')).join(',') + '|' + (st.warnings || []).join(',') + (st.unk?.size ? '|u' + [...st.unk].join() + st.unknown : '') + (st.ap ?? '') + (st.wpt ? `|${st.wpt.id}${Math.round(st.wpt.nm * 10)}${Math.round(st.wpt.brg)}` : '');

function fcuPanel(P, x0, x1, y, h, C) {
  P.inset((x0 + x1) / 2, y, x1 - x0, h, C.fcu || '#656968');
  const w = x1 - x0, at = (f) => x0 + w * f;
  for (const [f, lab] of [[.12, 'SPD'], [.36, 'HDG'], [.6, 'ALT'], [.82, 'V/S']]) { P.text(lab, at(f), y + h * .32, h * .11, '#e8e8e0'); P.lcd(at(f), y + h * .12, w * .13, h * .2, '', '#ffa63a', '#0a0805'); P.knob(at(f), y - h * .2, h * .13, '#cfd0cc'); }
  for (const [f, lab] of [[.24, 'LOC'], [.5, 'AP1'], [.56, 'AP2'], [.7, 'A/THR'], [.94, 'APPR']]) P.btn(at(f), y - h * .22, w * .045, h * .2, '#2a2c2e', lab, '#ddd', lab.startsWith('AP') || lab === 'A/THR' ? '#3aff6a' : null);
}
function mcpPanel(P, x0, x1, y, h, C, lcd = true) {
  P.inset((x0 + x1) / 2, y, x1 - x0, h, C.mcp || '#887e75', { r: .003 });
  const w = x1 - x0, at = (f) => x0 + w * f;
  for (const [f, lab] of [[.2, 'IAS/MACH'], [.42, 'HDG'], [.6, 'V/S'], [.8, 'ALTITUDE']]) { P.text(lab, at(f), y + h * .34, h * .1, '#efe9dc'); P.rect(at(f), y + h * .12, w * .12, h * .2, lcd ? '#060606' : '#0c0c0c'); P.knob(at(f), y - h * .22, h * .13, '#e6e0cc'); }
  for (const [f, lab] of [[.08, 'A/T'], [.3, 'LNAV'], [.33, 'VNAV'], [.52, 'HOLD'], [.68, 'V/S'], [.9, 'CMD'], [.95, 'CMD']]) P.btn(at(f), y - h * .1, w * .03, h * .22, '#121212', lab, '#ddd', lab === 'CMD' ? '#3aff6a' : null);
}
function mcpWins(K, m, x0, x1, y, h, o = {}) { const w = x1 - x0; for (const [f, k, n] of [[.2, 'spd', 3], [.42, 'hdg', 3], [.6, 'vs', 5], [.8, 'alt', 5]]) selWin(K, m, x0 + w * f, y + h * .12, w * .12, h * .2, k, { n, col: o.col || '#f4f4f4', bg: o.bg || '#060606', glow: o.glow ?? false, dash: o.dash ?? '     ' }); }
function quadrant(K, o) {
  const { F, U, R, n, gap = .055, len = .2, ang = 18, grip = '#d8ceb4', arm = '#2a2622' } = o;
  if (o.body !== false) { const b = roundBox(.3, .07, n * gap + .05, .02, 2); b.translate(F - .02, U + .02, R); K.add(b, o.body || '#4a4440', { mat: 'satin' }); for (let i = 0; i <= n; i++) K.box(null, [F - .02, U + .056, R + (i - n / 2) * gap], [.26, .004, .006], '#0c0c0c', { flat: 1 }); }
  for (let i = 0; i < n; i++) {
    const z = R + (i - (n - 1) / 2) * gap, a = (o.angs?.[i] ?? ang) * D2R, b0 = U + .05, tp = [F + Math.sin(a) * len, b0 + Math.cos(a) * len, z];
    K.box(null, [F + Math.sin(a) * len / 2, b0 + Math.cos(a) * len / 2, z], [o.aw ?? .02, len, o.at ?? .016], arm, { rot: [0, 0, -(o.angs?.[i] ?? ang)], mat: 'satin' });
    if (o.knob) K.sph(null, tp, o.knob, grip, { mat: o.gm || 'bake', wear: [[tp[0], tp[1] + o.knob, z, o.knob * 1.5, .3]] });
    else K.cyl(null, tp, o.gr ?? .015, o.gw ?? gap * .92, grip, { axis: 'z', mat: o.gm || 'satin', wear: [[tp[0] - .01, tp[1] + .012, z, .04, .25]] });
    if (o.rev) K.box(null, [tp[0] - .035, tp[1] - .045, z], [.012, .06, .01], '#111', { rot: [0, 0, 30], mat: 'satin' });
  }
}
const LENS = ['LOW PRESS', 'VALVE', 'OFF', 'FAULT', 'OPEN', 'ON BAT', 'XFEED', 'OVHT'];
function switches(P, x, y, w, h, n, m, o = {}) { for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const xx = x - w / 2 + w * (i + .5) / n, yy = y + h / 2 - h * (j + .5) / m, cw = w / n, ch = h / m; if (o.lens && (i * 3 + j * 5) % 7 === 2) { P.lens(xx, yy - ch * .05, cw * .7, ch * .42, LENS[(i + j * 3) % LENS.length]); continue; } if (o.lens) P.dim(OVL[(i * 7 + j * 13 + Math.round(x * 100 + y * 37)) % OVL.length], xx, yy + ch * .34, Math.max(.0028, ch * .1), .12); if (o.guard && (i + j) % 5 === 0) P.guard(xx, yy - ch * .12, cw * .58, ch * .66); P.toggle(xx, yy - ch * .15, Math.min(cw, ch) * .6); } }

function selOf(st) { const q = st.sel || {}; return { spd: q.spd ?? null, hdg: q.hdg ?? null, alt: q.alt ?? null, vs: q.vs ?? null, baro: q.baro ?? null }; }
const selSig = (st) => { const q = selOf(st); return [q.spd, q.hdg, q.alt, q.vs, q.baro].join(); };
function selWin(K, m, x, y, w, h, key, o = {}) {
  K.screen(m, x, y, w, h, (g, W, H, st) => { const q = selOf(st), v = q[key], c = o.col || '#ffa63a'; g.fillStyle = o.bg || '#0a0805'; g.fillRect(0, 0, W, H); const t = v == null ? (o.dash || '-----').slice(0, o.n || 5) : key === 'hdg' ? String(v).padStart(3, '0') : key === 'vs' ? (v > 0 ? '+' : '-') + String(Math.abs(v)).padStart(4, '0') : String(v); g.save(); if (o.glow !== false) { g.shadowColor = c; g.shadowBlur = H * .25; } T(g, t, W * .92, H * .55, H * .74, c, 'right', 600, FNN); g.restore(); }, { dyn: true, res: o.res ?? 160, bezel: false, item: false, z: o.z ?? .0025, sig: selSig, kind: o.kind || 'lcd' });
}
function deckA330(K) {
  FLOOR = -1.15; const rcl = .55, C = { pan: '#5f6c78', side: '#36404d', glare: '#3a3c40', fcu: '#656968', frame: '#7d8791', wall: '#6c7784', roof: '#858f98', floor: '#252d37', dark: '#1d2228', ped: '#56626e', hdr: '#6a7480' };
  const cols = K.hdr([
    [[-1.5, -1.15, -.82], [-1.5, -.22, -.82], [-1.5, .22, -.8], [-1.5, .42, -.55], [-1.5, .52, rcl]],
    [[-.5, -1.15, -.82], [-.5, -.2, -.8], [-.5, .2, -.78], [-.5, .42, -.55], [-.5, .52, rcl]],
    [[-.1, -1.15, -.82], [-.1, -.2, -.79], [-.1, .22, -.77], [-.1, .43, -.55], [-.1, .52, rcl]],
    [[-.04, -1.15, -.82], [-.04, -.2, -.79], [-.04, .22, -.77], [-.04, .43, -.55], [-.04, .52, rcl]],
    [[.96, -1.15, -.8], [.82, -.24, -.76], [.52, .27, -.7], [.42, .44, -.5], [.4, .5, rcl]],
    [[1.15, -1.15, -.66], [1.02, -.36, -.58], [.66, .33, -.5], [.55, .43, -.42], [.46, .48, rcl]],
    [[1.15, -1.15, .49], [1.05, -.36, .5], [.62, .34, .5], [.52, .44, .5], [.46, .48, rcl]],
    [[1.15, -1.15, rcl], [1.05, -.36, rcl], [.62, .34, rcl], [.52, .44, rcl], [.46, .48, rcl]]], [4, 5, 6, 7], .22);
  K.cabin({ rcl, cols, wmat: 'lin', wcells: 'whr', wuv: 1 / 1.2, pat: ['wwwr', 'wgwr', 'wfwr', 'wgwr', 'wfhr', 'dghr', 'dfhr'], col: { w: C.wall, f: C.frame, r: C.roof, d: C.dark, h: C.hdr } }); K.mat('lin', liningTex('jet', 1), 'cab');
  K.visor(cols[5][1], cols[6][1], cols[6][2], cols[5][2], .03, .32, .68, .97, { col: '#05080a', op: .9 }); hdrKit(K, cols[5][2], cols[6][2], cols[6][3], cols[5][3], { col: '#4a525a' });
  K.quad([-1.5, -1.15, -.85], [1.2, -1.15, -.85], [1.2, -1.15, 1.95], [-1.5, -1.15, 1.95], C.floor); K.quad([-1.5, -1.2, -.9], [-1.5, -1.2, 2], [-1.5, .6, 2], [-1.5, .6, -.9], C.wall);
  K.prism([[.548, -.15], [.57, -.135], [1.05, -.35], [1.07, -.4], [.78, -.29], [.575, -.215], [.552, -.205]], -.66, 1.76, C.glare, { grad: [0, .55, 1.05, .8, 1.25] });
  K.box(null, [.555, -.137, rcl], [.016, .008, 2.42], '#5a5e63', { flat: 1.15 });
  const gf = frame(.548, 0, 0), m = (x, s) => (s ? 2 * rcl - x : x);
  K.panel(gf, { x0: -.66, x1: 1.76, y0: -.207, y1: -.148 }, (P) => {
    P.fill('#2e3236');
    for (const s of [0, 1]) { P.inset(m(-.49, s), -.178, .3, .054, C.fcu); P.inset(m(-.17, s), -.178, .3, .054, C.fcu); P.inset(m(.1, s), -.178, .2, .054, C.fcu); P.inset(m(.26, s), -.178, .17, .054, C.fcu);
      P.text('BARO', m(.21, s), -.158, .006); P.knob(m(.21, s), -.19, .009, '#cfd0cc'); P.knob(m(.3, s), -.17, .013, '#cfd0cc'); P.knob(m(.3, s), -.192, .008, '#d8d8d0'); for (let i = 0; i < 5; i++) P.btn(m(.19 + i * .03, s), -.2, .02, .009, '#2a2c2e', ['CSTR', 'WPT', 'VORD', 'NDB', 'ARPT'][i]);
      P.btn(m(.07, s), -.172, .03, .02, '#2a2c2e', 'CHRONO'); P.text('SIDE STICK PRIORITY', m(-.06, s), -.193, .0055); P.btn(m(-.06, s), -.172, .024, .02, '#2a2c2e', '', '#ddd', '#3a2a12'); P.text('LOUD SPKR', m(-.47, s), -.158, .005); P.knob(m(-.47, s), -.18, .011, '#cfd0cc'); P.btn(m(-.56, s), -.178, .02, .02, '#2a2c2e'); P.btn(m(-.38, s), -.178, .02, .02, '#2a2c2e'); }
    fcuPanel(P, .37, .73, -.178, .054, C);
  }, { depth: .02, grime: { ea: .1 }, legend: true });
  for (const s of [0, 1]) K.screen(gf, m(-.24, s), -.172, .06, .022, annunDraw({ kind: 'master' }), { dyn: true, res: 128, bw: .003, bd: .005, z: .003, sig: (st) => (st.warnings || []).join() });
  for (const s of [0, 1]) { selWin(K, gf, m(.21, s), -.172, .04, .013, 'baro', {}); }
  for (const [x, k, n] of [[.37 + .36 * .12, 'spd', 3], [.37 + .36 * .36, 'hdg', 3], [.37 + .36 * .6, 'alt', 5], [.37 + .36 * .82, 'vs', 5]]) selWin(K, gf, x, -.178 + .054 * .12, .36 * .13, .054 * .2, k, { n });
  for (const x of [.21, .3, .44, .51, .6, .68, .89, .8, -.47, 1.57]) K.cyl(gf, [x, -.19, .01], .008, .02, '#c9cbc6', { axis: 'z', seg: 14, mat: 'satin' });
  const pf = frame(.78, 0, 0), k = 1.62, Sx = (x) => x * k, ds = .184 * k, top = -.3, pc = top - ds / 2, ek = 1.3, es = .184 * ek;
  K.panel(pf, { x0: -.74, x1: 1.84, y0: -.86, y1: -.285 }, (P) => {
    P.fill(C.pan); P.shade(.85, .14);
    P.grille(-.58, -.4, .07); P.grille(2 * rcl + .58, -.4, .07);
    P.inset(rcl, -.6, es + .2, .62, C.pan, { screws: true });
    for (let i = 0; i < 4; i++) P.btn(.37, -.62 - i * .035, .04, .026, '#2a2e33', ['TERR', 'NORTH', 'ECAM', ''][i]);
    P.inset(.82, -.48, .12, .24, C.pan); P.text('LDG GEAR', .82, -.375, .009); for (const [x, y] of [[.795, -.41], [.845, -.41], [.82, -.44]]) P.rect(x, y, .02, .015, '#0e2a12'); P.rect(.82, -.53, .03, .1, '#0c0c0c');
    for (const s of [0, 1]) { P.inset(m(-.42, s), -.66, .55, .07, '#4f5a64', { screws: false }); P.rect(m(-.42, s), -.66, .14, .02, '#22272c', .004); }
  }, { depth: .02 });
  K.screen(pf, Sx(-.12), pc, ds, ds, pfdA, { dyn: true, sig: sigOf }); K.screen(pf, Sx(.12), pc, ds, ds, ndA, { dyn: true, sig: sigOf });
  K.screen(pf, rcl, top - es / 2, es, es, ewdA, { dyn: true, sig: (st) => (st.warnings || []).join() }); K.screen(pf, rcl, top - es * 1.5 - .03, es, es, sdA, {});
  K.screen(pf, 2 * rcl - Sx(.12), pc, ds, ds, ndA, { dyn: true, sig: sigOf }); K.screen(pf, 2 * rcl - Sx(-.12), pc, ds, ds, pfdA, { dyn: true, sig: sigOf });
  K.screen(pf, .37, top - .045, .07, .07, isis, { dyn: true, res: 256, sig: sigOf, sb: 1 });
  K.cyl(pf, [.82, -.53, .04], .022, .03, '#151515', { axis: 'z', mat: 'rubber' }); K.box(pf, [.82, -.5, .015], [.012, .09, .03], '#888', { mat: 'chrome' });
  for (const z of [-.05, 1.15]) { const tb = roundBox(.6, .06, .026, .01, 2); tb.rotateX(-Math.PI / 2); tb.rotateY(Math.PI / 2); tb.translate(.755, -.68, z); K.add(tb, '#1c1f22', { mat: 'satin', wear: [[.728, -.667, z, .1, .1]] }); K.box(null, [.7265, -.667, z], [.004, .003, .57], '#363b41', { flat: 1, ao: false }); K.box(null, [.733, -.6662, z], [.012, .002, .12], '#0b0c0d', { flat: 1, ao: false }); K.box(null, [.775, -.7, z], [.012, .045, .64], '#0e1012'); }
  for (const z of [-.24, .14]) { K.box(null, [.76, -1.02, z], [.2, .03, .1], '#1a1c1f', { rot: [0, 0, -35], mat: 'satin' }); for (let i = 0; i < 4; i++) K.box(null, [.73 + i * .025, -1.0 + i * .018, z], [.006, .004, .09], '#2e3238', { rot: [0, 0, -35] }); }
  { const ph = frame(.776, -.8, -.05); K.box(ph, [0, 0, .015], [.07, .03, .03], '#2a2e33', { mat: 'satin' }); K.box(ph, [0, .026, .004], [.05, .01, .003], '#8a8e92', { flat: .9 }); }
  K.box(null, [.72, -.86, .02], [.04, .1, .07], '#1e2226', { mat: 'satin' }); K.box(null, [.7, -.82, .02], [.004, .03, .05], '#d8d8d0', { flat: 1 }); K.box(null, [.85, -.95, -.05], [.12, .4, .5], '#14171a');
  K.box(null, [.15, -.72, rcl], [.95, .16, .56], C.ped);
  const ped = frame(.15, -.64, rcl, 0, 90);
  K.panel(ped, { x0: -.28, x1: .28, y0: -.47, y1: .47 }, (P) => { P.fill(C.ped); for (const s of [-1, 1]) { const cdu = cv(240, 360); cduFace(cdu.getContext('2d'), 240, 360, { amber: true }); P.g.drawImage(cdu, P.X(s * .17 - .085), P.Y(.4), P.L(.17), P.L(.25)); } P.rect(0, .1, .16, .34, '#4a545e', .004); for (const [y, t] of [[.22, 'TOGA'], [.17, 'FLX MCT'], [.12, 'CL'], [.0, 'IDLE']]) { P.rect(0, y, .15, .003, '#d8d8d0'); P.text(t, .065, y + .008, .006); } P.rect(-.035, .1, .006, .3, '#111'); P.rect(.035, .1, .006, .3, '#111'); for (let i = 0; i < 18; i++) P.knob(-.2 + (i % 6) * .08, -.15 - (i / 6 | 0) * .07, .012, '#cfd0cc'); for (const s of [-1, 1]) { P.rect(s * .1, -.05, .03, .05, '#c81a1a', .003); P.text('ENG ' + (s < 0 ? 1 : 2), s * .1, -.02, .007); } });
  for (const [i, z] of [[0, rcl - .035], [1, rcl + .035]]) { K.box(null, [.2, -.585, z], [.025, .12, .022], '#1a1b1d', { rot: [0, 0, -14], mat: 'satin' }); const hb = roundBox(.06, .028, .04, .01, 2); hb.translate(.215, -.52, z); K.add(hb, '#26282b', { mat: 'rubber', wear: [[.215, -.505, z, .04, .4]] }); K.box(null, [.215, -.52, z + (i ? .022 : -.022)], [.05, .02, .004], '#e8e8e0', { flat: 1 }); }
  for (const z of [rcl - .2, rcl + .2]) { K.cyl(null, [.12, -.72, z], .14, .045, '#141516', { axis: 'z', seg: 36, mat: 'satin' }); K.cyl(null, [.12, -.72, z], .141, .012, '#e8e8e0', { axis: 'z', seg: 36 }); }
  K.box(null, [.2, -.72, -.57], [1.2, .2, .46], C.side); K.box(null, [.2, -.72, 1.67], [1.2, .2, .46], C.side);
  { const sx = .5, sy = -.62, sz = -.28; K.box(null, [sx, sy, sz], [.18, .03, .14], '#24292e', { mat: 'satin' }); K.lathe(null, [sx, sy + .015, sz], [[0, 0], [.04, 0], [.036, .008], [.04, .016], [.034, .024], [.038, .032], [.03, .04], [.022, .046], [0, .048]], '#121314', { mat: 'rubber', seg: 18 });
    const gp = new THREE.LatheGeometry([[0, 0], [.02, 0], [.024, .03], [.025, .06], [.023, .09], [.026, .11], [.024, .125], [.014, .135], [0, .137]].map(([a, b]) => new THREE.Vector2(a, b)), 20); gp.scale(1.25, 1, .9); gp.rotateZ(-12 * D2R); gp.translate(sx + .004, sy + .055, sz); K.add(gp, '#2b2d30', { mat: 'rubber', wear: [[sx + .02, sy + .17, sz, .05, .35]] });
    K.cyl(null, [sx + .028, sy + .175, sz + .016], .009, .012, '#c8201a', { rot: [70, 0, -12], mat: 'bake' }); K.box(null, [sx + .04, sy + .12, sz], [.012, .03, .014], '#0e0e0f', { rot: [0, 0, -12], mat: 'rubber' });
    const ar = roundBox(.3, .05, .1, .02, 2); ar.translate(sx - .12, sy + .04, sz - .14); K.add(ar, '#5a6168', { mat: 'satin' }); }
  K.box(null, [-.05, .46, rcl], [1.1, .08, .9], C.roof);
  const ov = frame(-.05, .418, rcl, 0, -90);
  ovMain(K, ov, .45, .55, '#3d434a', '#454b52', 31, true);
  K.jet({ rcl, F: .86, seat: { F: -.32, fab: '#4a5260', shell: '#2e3238' }, wipers: [[[1.0, -.25, -.5], [.975, -.212, -.04]], [[1.0, -.25, 2 * rcl + .5], [.975, -.212, 2 * rcl + .04]]] });
  ovFwd(K, { F0: .645, U0: .25, F1: .53, U1: .41, R: rcl, w: .72, col: '#3d434a', sub: '#454b52', rim: '#76808a', rows: 3, btn: true, seed: 3 });
  return { rcl, ex: 3.9, ey: 1.5, cam: [-.14, 0, .02], look: [9, -13], fov: 76 };
}
function ramsHorn(K, o) {
  const cap = new Map(); K.cap = cap; ramsHornParts(K, o); K.cap = null; (K.yokes ??= []).push({ cap, piv: [o.F + .15, -1.07, o.R ?? 0] });
}
function ramsHornParts(K, o) {
  const { F, U, w, tip } = o, c = o.col, z = o.R ?? 0, ar = o.ar ?? .016, gr = o.gr ?? .021, gc = o.grip || c, sat = { mat: 'satin' };
  const hb = roundBox(.105, .062, .05, .014, 2); hb.rotateY(Math.PI / 2); hb.translate(F + .01, U, z); K.add(hb, c, sat);
  const pl = roundBox(.08, .044, .008, .005, 1); pl.rotateY(Math.PI / 2); pl.translate(F - .02, U + .003, z); K.add(pl, o.plate || c, { mat: o.plateM || 'metal' });
  if (o.clip) { K.box(null, [F - .027, U + .022, z], [.006, .014, .085], o.clipc || '#141414', { mat: 'rubber' }); K.box(null, [F - .026, U + .006, z], [.004, .02, .06], '#d8d4c8', { flat: .9 }); }
  for (const s of [-1, 1]) {
    const wr = { mat: 'rubber', wear: [[F - .019, U + tip * 1.02, z + s * (w - .012), .045, o.wear ?? .45], [F - .014, U + tip * .62, z + s * (w + .003), .03, (o.wear ?? .45) * .5]] };
    K.tube([[F + .005, U - .005, z + s * .055], [F, U - .03, z + s * .1], [F - .006, U - .02, z + s * (w - .035)], [F - .012, U + tip * .35, z + s * w], [F - .018, U + tip, z + s * (w - .01)]], ar, c, { n: 28, rs: 12, ...sat });
    K.tube([[F - .01, U + tip * .3, z + s * w], [F - .014, U + tip * .65, z + s * (w + .003)], [F - .019, U + tip * 1.02, z + s * (w - .012)]], gr, gc, { n: 14, rs: 12, ...wr }); K.sph(null, [F - .019, U + tip * 1.02, z + s * (w - .012)], gr, gc, wr);
  }
  if (o.column !== false) { const g = new THREE.CylinderGeometry(.034, .05, 1.0, 4, 1); g.rotateY(Math.PI / 4); g.scale(1.3, 1, 1); g.rotateZ(.12); g.translate(F + .09, U - .52, z); K.add(g, o.colc || c, sat); K.box(null, [F + .15, -1.12, z], [.24, .1, .2], o.base || c); }
}
const OVT = ['ELEC', 'AIR COND', 'ANTI ICE', 'CABIN PRESS', 'EXT LT', 'APU', 'SIGNS', 'INT LT', 'FUEL', 'HYD', 'ENG', 'FIRE', 'NAV', 'CALLS', 'OXYGEN', 'WIPER', 'GPWS', 'FLT CTL', 'VENT', 'EVAC', 'RCDR', 'CARGO SMOKE', 'BLEED', 'PRESS'];
const OVL = ['BAT 1', 'BAT 2', 'EXT PWR', 'GEN 1', 'GEN 2', 'APU GEN', 'BUS TIE', 'GALLEY', 'IDG 1', 'PACK 1', 'PACK 2', 'HOT AIR', 'X BLEED', 'BLEED 1', 'BLEED 2', 'APU BLEED', 'RAM AIR', 'WING', 'ENG 1', 'ENG 2', 'PROBE HEAT', 'LDG ELEV', 'MODE SEL', 'DITCHING', 'ELEC PUMP', 'ENG PUMP', 'PTU', 'L PUMP 1', 'R PUMP 2', 'CTR TK', 'XFEED', 'STROBE', 'BEACON', 'NAV', 'LOGO', 'TURN OFF', 'LAND', 'TAXI', 'SEAT BELTS', 'NO SMOKING', 'EMER LT', 'DOME', 'ANN LT', 'MASTER', 'START', 'CREW', 'PAX', 'TERR', 'SYS', 'IR 1', 'IR 2', 'ADR 1', 'BLOWER', 'EXTRACT', 'CAB FANS', 'AGENT 1', 'AGENT 2', 'TEST', 'DISCH', 'WDO HEAT', 'YAW DAMP', 'STBY PWR', 'EQUIP COOL', 'RECIRC', 'TRIM AIR', 'ISOL', 'OUTFLOW', 'RAIN RPLNT'];
function ovRows(P, x0, x1, top, rows, h, r, btn, sub) {
  const pick = (a) => a[Math.floor(r() * a.length)], g = P.g, X = P.X, Y = P.Y, L = P.L, w = x1 - x0;
  for (let j = 0; j < rows; j++) { const y = top - h * (j + .5); let x = x0 + .006;
    while (x < x1 - .03) { let pw = .07 + r() * .15; if (x1 - .006 - x - pw < .06) pw = x1 - .006 - x; const cx = x + pw / 2, n = Math.max(1, Math.round((pw - .012) / (btn ? .032 : .027))), sp = (pw - .012) / n, ys = y - h * .08;
      P.inset(cx, y, pw - .005, h * .9, sub, { screws: false }); P.dim(pick(OVT), cx, y + h * .36, h * .075, .2);
      const ks = Array.from({ length: n }, () => { const k = r(); return btn ? (k < .6 ? 'pb' : k < .7 ? 'pbg' : k < .82 ? 'knob' : k < .92 ? 'tg' : 'ann') : (k < .42 ? 'tg' : k < .56 ? 'tgg' : k < .72 ? 'knob' : k < .9 ? 'ann' : 'pb'); }), xs = ks.map((_, i) => x + .006 + sp * (i + .5));
      if (n > 2 && r() < .5) { const yl = ys + (r() < .5 ? 0 : -h * .2); P.gl([[xs[0], yl], [xs[n - 1], yl]], .0011, .07); if (yl !== ys) for (const xx of xs) P.gl([[xx, yl], [xx, ys - .006]], .0011, .07); }
      ks.forEach((k, i) => { const xx = xs[i]; if (r() < .85) P.dim(pick(OVL), xx, ys + h * .2, h * .058, .14);
        if (k === 'pb' || k === 'pbg') P.pb(xx, ys, Math.min(.02, sp * .8), .018, r() < .55 ? 'FAULT' : '', r() < .7 ? (r() < .5 ? 'OFF' : 'ON') : '');
        if (k === 'pbg' || k === 'tgg') P.guard(xx, ys - .001, Math.min(.026, sp * .9), .024, r() < .3 ? '#5c1a14' : '#2a2c2e');
        if (k === 'tg' || k === 'tgg') P.toggle(xx, ys - .004, .014);
        if (k === 'ann') P.lens(xx, ys, Math.min(.022, sp * .85), .013, pick(LENS));
        if (k === 'knob') { const a = (r() - .5) * 2.4; for (const t of [-.8, 0, .8]) P.gl([[xx + Math.sin(t) * .011, ys + Math.cos(t) * .011], [xx + Math.sin(t) * .0135, ys + Math.cos(t) * .0135]], .0009, .1); P.knob(xx, ys, .0075, '#c2c4be'); ln(g, X(xx), Y(ys), X(xx + Math.sin(a) * .0072), Y(ys + Math.cos(a) * .0072), L(.0013), '#151515'); } });
      x += pw; } }
}
function ovMain(K, m, hw, hh, col, sub, seed, btn) { K.panel(m, { x0: -hw, x1: hw, y0: -hh, y1: hh }, (P) => { P.fill(col); ovRows(P, -hw, hw, hh - .01, Math.floor((2 * hh - .02) / .064), .064, rng(seed), btn, sub); }, { edge: false, legend: true, ppm: 1000 }); }
function ovFwd(K, o) {
  const { F0, U0, F1, U1, R, w, col = '#3d434a', sub = '#454b52', rim = '#7d8791', rows = 2 } = o, dF = F1 - F0, dU = U1 - U0, len = Math.hypot(dF, dU), tilt = -Math.atan2(-dF, dU) / D2R, m = frame((F0 + F1) / 2, (U0 + U1) / 2, R, 0, tilt);
  K.panel(m, { x0: -w / 2, x1: w / 2, y0: -len / 2, y1: len / 2 }, (P) => { P.fill(col); P.shade(.3, .04); ovRows(P, -w / 2, w / 2, len / 2 - .01, rows, (len - .02) / rows, rng(o.seed ?? 7), o.btn, sub); o.paint?.(P, len); }, { depth: .035, edgeCol: rim, legend: true, ppm: 1400 });
  K.box(m, [0, -len / 2 - .006, .01], [w + .02, .014, .03], rim, { mat: 'satin' });
}
function hdrKit(K, A, B, C, D, o = {}) {
  const at = (a, b) => new V3(...lerp3(lerp3(A, B, a), lerp3(D, C, a), b)), cap = (s, t, r, h, d, col, mat, r2) => { const p = at(s, t), n = new V3().subVectors(at(s + .05, t), p).cross(new V3().subVectors(at(s, t + .05), p)).normalize(); if (n.x > 0) n.negate(); const g = new THREE.CylinderGeometry(r2 ?? r, r, h, 20); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new V3(0, 1, 0), n)); g.translate(...p.addScaledVector(n, d).toArray()); K.add(g, col, { mat }); return [p, n]; };
  const c = o.col || '#2c2e30', s0 = o.s ?? .46; cap(s0, .32, .036, .03, .014, c, 'satin', .03); cap(s0, .32, .02, .004, .031, '#a8a69e', 'bake');
  const [p, n] = cap(s0 - .12, .36, .03, .024, .012, c, 'satin', .026); K.sph(null, p.addScaledVector(n, .016).toArray(), .015, '#1a1b1c', { mat: 'satin' }); K.cyl(null, p.toArray(), .006, .012, '#050505', { seg: 8 });
}
function glareTop(K, o) {
  const { F0, U0, Uf, sill, F, top, z0, z1, col } = o, pr = [[F0 + .005, Uf], [F0 - .004, U0 - .028], [F0 + .002, U0 - .006], [F0 + .016, U0 + .004], [F0 + .04, U0 + .006], [sill[0], sill[1]], [sill[0] + .02, sill[1] - .05], [F, top - .004], [F0 + .03, Uf - .006]];
  K.prism(pr, z0, z1, col, { grad: [0, F0, sill[0], .85, 1.9] }); return frame(F0 - .004, 0, 0);
}
function deckB777(K) {
  FLOOR = -1.2; const rcl = .53, C = { pan: '#62564a', post: '#9c7e64', side: '#8e7863', glare: '#4a4244', mcp: '#887e75', frame: '#b8a690', wall: '#ac9784', roof: '#c8bfb0', floor: '#3a4458', dark: '#231b15', ped: '#857d75', hdr: '#a8998a' };
  const cols = K.hdr([
    [[-1.5, -1.2, -.84], [-1.5, -.24, -.82], [-1.5, .27, -.8], [-1.5, .45, -.55], [-1.5, .56, rcl]],
    [[-.52, -1.2, -.84], [-.52, -.2, -.8], [-.52, .24, -.78], [-.52, .45, -.55], [-.52, .56, rcl]],
    [[-.08, -1.2, -.84], [-.08, -.2, -.79], [-.08, .27, -.77], [-.08, .46, -.55], [-.08, .56, rcl]],
    [[-.03, -1.2, -.84], [-.03, -.2, -.79], [-.03, .27, -.77], [-.03, .46, -.55], [-.03, .56, rcl]],
    [[.95, -1.2, -.82], [.84, -.25, -.76], [.52, .3, -.7], [.42, .46, -.5], [.4, .54, rcl]],
    [[1.12, -1.2, -.72], [1.0, -.33, -.65], [.64, .33, -.58], [.55, .44, -.45], [.45, .5, rcl]],
    [[1.12, -1.2, .47], [1.0, -.33, .48], [.62, .34, .48], [.52, .45, .48], [.45, .5, rcl]],
    [[1.12, -1.2, rcl], [1.0, -.33, rcl], [.62, .34, rcl], [.52, .45, rcl], [.45, .5, rcl]]], [4, 5, 6, 7], .2);
  K.cabin({ rcl, cols, wmat: 'lin', wcells: 'whr', wuv: 1 / 1.2, pat: ['wwwr', 'wgwr', 'wfwr', 'wgwr', 'wfhr', 'dghr', 'dphr'], col: { w: C.wall, f: C.frame, r: C.roof, d: C.dark, p: C.post, h: C.hdr } }); K.mat('lin', liningTex('jet', 2), 'cab');
  K.visor(cols[5][1], cols[6][1], cols[6][2], cols[5][2], .03, .3, .68, .97, { col: '#070604', op: .9, rail: '#5a4c40' }); hdrKit(K, cols[5][2], cols[6][2], cols[6][3], cols[5][3], { col: '#7a6c5e' });
  ovFwd(K, { F0: .6, U0: .27, F1: .5, U1: .42, R: rcl, w: .8, col: '#b0a492', sub: '#a39684', rim: '#c8bfb0', rows: 3, btn: true, seed: 11 });
  const cp = frame(.66, .17, rcl); K.box(cp, [0, 0, -.02], [.11, .1, .05], C.post, { mat: 'satin' }); K.gauge(cp, 0, 0, .08, gCompass(), { z: .006 });
  K.quad([-1.5, -1.2, -.88], [1.2, -1.2, -.88], [1.2, -1.2, 1.95], [-1.5, -1.2, 1.95], C.floor); K.quad([-1.5, -1.25, -.9], [-1.5, -1.25, 2], [-1.5, .6, 2], [-1.5, .6, -.9], C.wall);
  const gf = glareTop(K, { F0: .55, U0: -.135, Uf: -.205, sill: [1.0, -.33], F: .78, top: -.295, z0: -.74, z1: 1.8, col: C.glare });
  K.box(null, [.553, -.136, rcl], [.014, .008, 2.54], '#5e5456', { flat: 1.1 });
  K.panel(gf, { x0: -.74, x1: 1.8, y0: -.205, y1: -.142 }, (P) => {
    P.fill('#3a3232'); mcpPanel(P, .2, .69, -.174, .058, C);
    for (const s of [0, 1]) { const m = (x) => (s ? 2 * rcl - x : x); P.inset(m(.135), -.174, .12, .058, C.mcp); for (const [dx, dy] of [[-.03, .01], [.03, .01], [-.03, -.016], [.03, -.016]]) P.knob(m(.135 + dx), -.174 + dy, .009, '#e6e0cc'); P.inset(m(-.3), -.174, .36, .058, C.mcp); for (let i = 0; i < 6; i++) { P.knob(m(-.44 + i * .055), -.182, .008, '#e6e0cc'); P.text(['VOR', 'ADF', 'APP', 'MAP', 'PLN', 'CTR'][i], m(-.44 + i * .055), -.158, .0055, '#efe9dc'); } }
    P.inset(.755, -.174, .09, .058, C.mcp); for (let i = 0; i < 12; i++) P.btn(.728 + (i % 4) * .018, -.158 - (i / 4 | 0) * .015, .014, .011, '#1a1a1a');
    for (const s of [0, 1]) { const m = (x) => (s ? 2 * rcl - x : x); for (let i = 0; i < 3; i++) P.btn(m(-.06 + i * .022), -.192, .018, .01, '#1a1a1a', ['ACPT', 'CANC', 'RJCT'][i]); }
  }, { depth: .02, grime: { ea: .1 }, legend: true });
  mcpWins(K, gf, .2, .69, -.174, .058);
  for (const s of [0, 1]) K.screen(gf, s ? 2 * rcl + .04 : -.04, -.163, .06, .026, annunDraw({ kind: 'master' }), { dyn: true, res: 128, bw: .003, bd: .005, z: .003, sig: (st) => (st.warnings || []).join() });
  for (const x of [.105, .165, .33, .5, .69]) K.cyl(gf, [x, -.19, .01], .008, .02, '#e6e0cc', { axis: 'z', seg: 14, mat: 'satin' });
  const pf = frame(.78, 0, 0), ds = .29, top = -.3, pc = top - ds / 2 - .012;
  K.panel(pf, { x0: -.76, x1: 1.82, y0: -.62, y1: -.29 }, (P) => {
    P.fill(C.pan); P.shade(.85, .14); const g = P.g, lg = g.createLinearGradient(0, 0, P.W * .3, P.H); lg.addColorStop(0, 'rgba(255,240,220,.06)'); lg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = lg; g.fillRect(0, 0, P.W, P.H);
    P.rect(.15, -.296, .9, .005, '#ffa25a'); P.rect(-.5, -.3, .25, .004, '#ffa25a'); P.rect(1.56, -.3, .25, .004, '#ffa25a');
    P.inset(.36, pc, .07, ds, '#56483a'); P.inset(.79, pc - .03, .14, .3, C.pan); P.text('GND PROX', .79, pc + .1, .009); for (let i = 0; i < 3; i++) P.btn(.75 + i * .04, pc + .06, .032, .026, '#1a1a1a'); P.rect(.79, pc - .06, .03, .1, '#0c0c0c'); P.text('LANDING GEAR', .79, pc - .14, .008);
    for (const x of [-.15, .17, .56]) for (const sx of [-1, 1]) P.knob(x + sx * (ds / 2 + .012), pc - ds / 2 + .01, .007, '#d8d0bc');
    for (const s of [0, 1]) { const m = (x) => (s ? 2 * rcl - x : x); P.inset(m(-.55), pc, .22, .26, '#5a4e43'); P.grille(m(-.55), pc + .03, .06); for (let i = 0; i < 3; i++) P.btn(m(-.6 + i * .05), pc - .09, .03, .02, '#1a1a1a'); }
  }, { depth: .02 });
  const kp = frame(.85, 0, 0);
  K.panel(kp, { x0: -.76, x1: 1.82, y0: -.92, y1: -.62 }, (P) => { P.fill('#3a2c22'); P.shade(.75, .12); for (const s of [0, 1]) for (const d of [-1, 1]) { const x = (s ? 2 * rcl : 0) + d * .13; P.rect(x, -1.0, .1, .16, '#0c0a08', .004); for (let i = 0; i < 4; i++) P.rect(x, -.935 + i * .02 + .06, .09, .006, '#2a221c'); } }, { depth: .02, flat: .85 });
  K.quad([.78, -.62, -.76], [.85, -.62, -.76], [.85, -.62, 1.82], [.78, -.62, 1.82], '#4e4034');
  for (const sz of [0, 2 * rcl]) for (const d of [-1, 1]) { const z = sz + d * .25, vb = roundBox(.1, .11, .16, .02, 2); vb.rotateY(Math.PI / 2); vb.translate(.79, -.82, z); K.add(vb, '#5e5044', { mat: 'satin' }); K.cyl(null, [.708, -.82, z], .036, .006, '#141210', { axis: 'x', seg: 20 }); K.box(null, [.704, -.82, z], [.004, .05, .008], '#3a3029', { rot: [35, 0, 0] }); }
  K.screen(pf, -.15, pc, ds, ds, pfdB, { dyn: true, sig: sigOf, bez: '#2e251e', bw: .016 }); K.screen(pf, .17, pc, ds, ds, ndB, { dyn: true, sig: sigOf, bez: '#2e251e', bw: .016 });
  K.screen(pf, .56, pc, ds, ds, eicasB, { dyn: true, sig: (st) => (st.warnings || []).join(), bez: '#2e251e', bw: .016 });
  K.screen(pf, 2 * rcl - .17, pc, ds, ds, ndB, { dyn: true, sig: sigOf, bez: '#2e251e', bw: .016 }); K.screen(pf, 2 * rcl + .15, pc, ds, ds, pfdB, { dyn: true, sig: sigOf, bez: '#2e251e', bw: .016 });
  K.gauge(pf, .36, pc + .095, .058, gAdiS({ sky: '#2a8ad0', gnd: '#6a4418', hor: '#fff', sym: '#fff' })); K.gauge(pf, .36, pc, .058, gAsiJ(330, false, true)); K.gauge(pf, .36, pc - .095, .058, gAltJ('#2df06a', true));
  K.gauge(pf, -.37, pc + .07, .07, gClock());
  K.cyl(pf, [.79, pc - .06, .05], .022, .04, '#e8e4d8', { axis: 'z', mat: 'satin' }); K.box(pf, [.79, pc - .04, .02], [.012, .05, .04], '#aaa', { mat: 'chrome' });
  ramsHorn(K, { F: .43, U: -.45, w: .175, tip: .13, col: '#34302c', grip: '#4a443e', plate: '#8a8a86', colc: '#2e2a27', clip: true, wear: .55 });
  K.box(null, [.1, -.72, rcl], [1.0, .14, .58], C.ped, { mat: 'satin' }); const ped = frame(.12, -.65, rcl, 0, 90);
  K.panel(ped, { x0: -.29, x1: .29, y0: -.5, y1: .5 }, (P) => { P.fill(C.ped); for (const s of [-1, 1]) { const cdu = cv(240, 360); cduFace(cdu.getContext('2d'), 240, 360, { body: '#6e665e' }); P.g.drawImage(cdu, P.X(s * .17 - .085), P.Y(.42), P.L(.17), P.L(.25)); } P.rect(0, .3, .12, .16, '#0a0a0a');
    P.rect(-.2, .08, .05, .2, '#5a524b', .004); P.text('SPEED BRAKE', -.2, .2, .007); P.rect(.2, .08, .05, .2, '#5a524b', .004); for (const [y, t] of [[.17, 'UP'], [.13, '1'], [.09, '5'], [.05, '15'], [.01, '30']]) { P.rect(.2, y, .05, .002, '#ddd'); P.text(t, .235, y, .006); } P.text('FLAPS', .2, .2, .008);
    for (let i = 0; i < 3; i++) { P.inset(i - 1 ? 0 : 0, -.12 - i * .1, .5, .08, '#6e665e'); for (let j = 0; j < 6; j++) P.knob(-.2 + j * .08, -.12 - i * .1, .011, '#d8d0bc'); P.lcd(-.05, -.105 - i * .1, .08, .016, ['118.70', '121.50', '1200'][i], '#f4f4f4', '#060606'); } }, { grime: { n: 10 } });
  quadrant(K, { F: .2, U: -.65, R: rcl, n: 2, gap: .06, len: .2, ang: 14, grip: '#d4c9ae', arm: '#3a3530', body: '#4a433c', rev: true });
  K.box(null, [.2, -.6, rcl - .2], [.012, .09, .012], '#222', { rot: [0, 0, -10] }); K.box(null, [.207, -.555, rcl - .2], [.04, .018, .024], '#1a1a1a', { mat: 'rubber' });
  K.box(null, [.2, -.6, rcl + .2], [.012, .09, .012], '#222', { rot: [0, 0, -10] }); K.box(null, [.207, -.555, rcl + .2], [.02, .022, .04], '#d8d4c8', { mat: 'satin' });
  for (const d of [-1, 1]) { K.box(null, [-.04, -.62, rcl + d * .04], [.012, .045, .012], '#141414', { mat: 'satin' }); K.sph(null, [-.04, -.595, rcl + d * .04], .011, '#141414', { mat: 'bake' }); }
  K.box(null, [.2, -.74, -.66], [1.3, .2, .3], C.side, { mat: 'satin' }); K.box(null, [.2, -.74, 1.72], [1.3, .2, .3], C.side, { mat: 'satin' });
  K.box(null, [-.05, .48, rcl], [1.2, .08, .96], C.roof); const ov = frame(-.05, .438, rcl, 0, -90);
  ovMain(K, ov, .47, .6, '#b8ab98', '#a89a86', 37, true);
  K.jet({ rcl, F: .8, seat: { F: -.32, fab: '#5c6470', shell: '#4a4038' }, wipers: [[[.99, -.26, -.5], [.965, -.222, -.04]], [[.99, -.26, 2 * rcl + .5], [.965, -.222, 2 * rcl + .04]]] });
  return { rcl, ex: 4.6, ey: 1.5, cam: [-.1, 0, .02], look: [11, -12], fov: 72 };
}
function deckB767(K) {
  FLOOR = -1.2; const rcl = .53, C = { pan: '#6b5540', side: '#604d3b', glare: '#2a2420', mcp: '#7c6a56', frame: '#c4b8a4', wall: '#bfb4a0', roof: '#d0c8b8', floor: '#242328', dark: '#2a2018', ped: '#7a6550', hdr: '#b0a490', post: '#8a7562' };
  const cols = K.hdr([
    [[-1.5, -1.2, -.82], [-1.5, -.24, -.8], [-1.5, .25, -.78], [-1.5, .44, -.55], [-1.5, .54, rcl]],
    [[-.52, -1.2, -.82], [-.52, -.22, -.79], [-.52, .22, -.77], [-.52, .44, -.55], [-.52, .54, rcl]],
    [[-.1, -1.2, -.82], [-.1, -.22, -.78], [-.1, .25, -.76], [-.1, .45, -.55], [-.1, .54, rcl]],
    [[-.04, -1.2, -.82], [-.04, -.22, -.78], [-.04, .25, -.76], [-.04, .45, -.55], [-.04, .54, rcl]],
    [[.9, -1.2, -.8], [.8, -.26, -.74], [.48, .28, -.68], [.4, .45, -.5], [.38, .52, rcl]],
    [[1.08, -1.2, -.7], [.95, -.31, -.62], [.6, .3, -.55], [.5, .42, -.45], [.42, .48, rcl]],
    [[1.08, -1.2, .47], [.95, -.31, .48], [.6, .3, .48], [.5, .42, .48], [.42, .48, rcl]],
    [[1.08, -1.2, rcl], [.95, -.31, rcl], [.6, .3, rcl], [.5, .42, rcl], [.42, .48, rcl]]], [4, 5, 6, 7], .2);
  K.cabin({ rcl, cols, wmat: 'lin', wcells: 'whr', wuv: 1 / 1.2, pat: ['wwwr', 'wgwr', 'wfwr', 'wgwr', 'wfhr', 'dghr', 'dphr'], col: { w: C.wall, f: C.frame, r: C.roof, d: C.dark, h: C.hdr, p: C.post } }); K.mat('lin', liningTex('jet', 3), 'cab');
  K.visor(cols[5][1], cols[6][1], cols[6][2], cols[5][2], .03, .3, .68, .97, { col: '#070604', op: .9, rail: '#6a5a4a' }); hdrKit(K, cols[5][2], cols[6][2], cols[6][3], cols[5][3], { col: '#8a7c6a' });
  ovFwd(K, { F0: .58, U0: .26, F1: .48, U1: .41, R: rcl, w: .8, col: '#c4baa6', sub: '#b8ad98', rim: '#d0c8b8', rows: 3, seed: 5 });
  const cp = frame(.63, .21, rcl); K.box(null, [.66, .25, rcl], [.02, .06, .02], '#2a2420'); K.box(cp, [0, 0, -.025], [.1, .09, .05], '#3a332c', { mat: 'satin' }); K.gauge(cp, 0, 0, .07, gCompass(), { z: .004 });
  K.quad([-1.5, -1.2, -.86], [1.2, -1.2, -.86], [1.2, -1.2, 1.95], [-1.5, -1.2, 1.95], C.floor); K.quad([-1.5, -1.25, -.9], [-1.5, -1.25, 2], [-1.5, .6, 2], [-1.5, .6, -.9], C.wall);
  const gf = glareTop(K, { F0: .55, U0: -.13, Uf: -.2, sill: [.95, -.31], F: .78, top: -.29, z0: -.72, z1: 1.78, col: C.glare });
  K.box(null, [.553, -.131, rcl], [.014, .008, 2.5], '#4a403a', { flat: 1.1 });
  K.panel(gf, { x0: -.72, x1: 1.78, y0: -.2, y1: -.137 }, (P) => { P.fill('#3a2e24'); mcpPanel(P, .25, .81, -.169, .058, C, false); for (const s of [0, 1]) { const m = (x) => (s ? 2 * rcl - x : x); P.inset(m(.14), -.169, .16, .058, C.mcp); P.lcd(m(.1), -.158, .045, .015, '113.20', '#ff5a2a', '#0a0503'); P.lcd(m(.18), -.158, .045, .015, '112.10', '#ff5a2a', '#0a0503'); P.knob(m(.1), -.184, .012, '#ede6d6'); P.knob(m(.18), -.184, .012, '#ede6d6'); P.inset(m(-.27), -.169, .3, .058, C.mcp); for (let i = 0; i < 4; i++) P.knob(m(-.38 + i * .07), -.176, .01, '#ede6d6'); P.lcd(m(-.31), -.152, .06, .013, '1013', '#ff5a2a', '#0a0503'); } }, { depth: .02, grime: { ea: .1 }, legend: true });
  mcpWins(K, gf, .25, .81, -.169, .058, { col: '#f0f0f0', bg: '#0c0c0c' });
  for (const s of [0, 1]) K.screen(gf, s ? 2 * rcl + .06 : -.06, -.168, .055, .024, annunDraw({ kind: 'master' }), { dyn: true, res: 128, bw: .003, bd: .005, z: .003, sig: (st) => (st.warnings || []).join() });
  const pf = frame(.78, 0, 0), r1 = -.375, r2 = -.585;
  K.panel(pf, { x0: -.76, x1: 1.82, y0: -.86, y1: -.285 }, (P, its) => {
    P.fill(C.pan); P.shade(.85, .14);
    for (const [x, y, w, h] of [[-.42, -.48, .17, .42], [-.15, -.48, .29, .44], [.09, -.48, .19, .42], [.23, -.48, .12, .4], [.53, -.5, .3, .46], [.78, -.48, .16, .36]]) P.inset(x, y, w, h, '#735f49', { screws: false });
    for (const i of its) if (i.kind === 'g') P.inset(i.x, i.y, i.r * 2 + .014, i.r * 2 + .014, '#6e5945', { r: .003 }); else P.inset(i.x, i.y, i.w + .008, i.h + .008, '#6e5945', { r: .003 });
    for (let i = 0; i < 9; i++) P.btn(.315, -.33 - i * .026, .04, .018, '#1e1a16', '', '#ddd', i === 2 ? '#3a3020' : null); P.knob(.315, -.6, .016, '#d8d0c0');
    for (const x of [-.15]) for (const y of [r1 - .105, r2 - .13]) for (const d of [-1, 1]) P.knob(x + d * .09, y, .008, '#d8d0c0');
    P.btn(.07, r1 + .075, .03, .014, '#2a1a12', 'AUTOLAND', '#ddd', '#5a2a12'); P.btn(.15, r1 + .075, .03, .014, '#2a1a12', 'NO LAND 3', '#ddd', '#5a4a12');
    P.btn(-.33, r2 - .1, .035, .02, '#2a1a12', 'GND PROX', '#ddd', '#5a2a12'); P.btn(-.29, r2 - .1, .035, .02, '#2a1a12', 'BELOW G/S', '#ddd', '#5a4a12'); P.inset(-.42, -.73, .17, .08, '#735f49'); P.toggle(-.46, -.73, .016); P.toggle(-.42, -.73, .016); P.toggle(-.38, -.73, .016); P.text('FLT DIR', -.42, -.705, .006); P.knob(-.15, -.73, .012, '#d8d0c0'); P.knob(-.1, -.73, .012, '#d8d0c0'); P.text('EFI', -.125, -.71, .006);
    for (const [x, y] of [[-.43, r1 + .07], [-.43, r2 - .07], [.11, r1 - .07], [.23, r1 - .235], [-.15, r1 + .1]]) { P.rect(x, y, .035, .009, '#e8e2d0', .001); P.rect(x, y, .025, .002, '#555'); }
    P.rect(.78, -.47, .028, .14, '#0c0c0c'); P.text('LANDING GEAR', .78, -.36, .009, '#eee');
  }, { depth: .02 });
  K.gauge(pf, -.43, r1, .115, gAsiJ(360)); K.gauge(pf, -.43, r2 + .02, .1, gRmi());
  K.screen(pf, -.15, r1 - .01, .24, .175, eadi767, { dyn: true, sig: sigOf, bez: '#3b3026', bw: .016 }); K.screen(pf, -.15, r2 - .015, .24, .21, ehsi767, { dyn: true, sig: sigOf, bez: '#3b3026', bw: .016 });
  K.screen(pf, .02, r1 + .005, .032, .14, (g, W, H, st) => { g.fillStyle = '#060606'; g.fillRect(0, 0, W, H); const a = st.altFt; if (!nz(a)) { flag(g, 0, H * .4, W, H * .12, 'RA', RED); return; } for (let i = 0; i < 12; i++) ln(g, W * .5, H * i / 12, W, H * i / 12, H * .006, '#ddd'); if (a < 2500) poly(g, [[0, H * .5], [W * .4, H * .47], [W * .4, H * .53]], '#ddd'); else { g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, W, H); } }, { dyn: true, res: 128, bw: .006, sig: (st) => String(nz(st.altFt) ? Math.min(2500, Math.round(st.altFt)) : 'x') });
  K.gauge(pf, .11, r1, .105, gAltJ('#2df06a')); K.gauge(pf, .1, r2 + .07, .09, gVsiJ(true)); K.gauge(pf, .1, r2 - .055, .065, gClock());
  K.gauge(pf, .23, r1 + .02, .08, gAdiS({ gnd: '#111' })); K.gauge(pf, .23, r1 - .085, .072, gAltJ('#2df06a', true)); K.gauge(pf, .23, r1 - .18, .072, gAsiJ(360, false, true));
  K.screen(pf, .53, r1 - .02, .25, .2, (g, W, H, st) => eicas767(g, W, H, st, true), { dyn: true, sig: (st) => (st.warnings || []).join(), bez: '#3b3026', bw: .016 }); K.screen(pf, .53, r2 - .055, .25, .2, (g, W, H, st) => eicas767(g, W, H, st, false), { bez: '#3b3026', bw: .016 });
  K.cyl(pf, [.78, -.47, .05], .028, .04, '#e8e4d8', { axis: 'z', mat: 'satin' }); K.box(pf, [.78, -.45, .02], [.012, .06, .04], '#999', { mat: 'chrome' });
  ramsHorn(K, { F: .41, U: -.45, w: .19, tip: .15, col: '#4e4236', grip: '#6f6253', plate: '#3a3028', plateM: 'satin', colc: '#5a4c40', clip: true, wear: .5 });
  K.box(null, [.1, -.7, rcl], [1.0, .14, .58], C.ped, { mat: 'satin' }); const ped = frame(.12, -.63, rcl, 0, 90);
  K.panel(ped, { x0: -.29, x1: .29, y0: -.5, y1: .5 }, (P) => { P.fill(C.ped); for (const s of [-1, 1]) { const cdu = cv(240, 360); cduFace(cdu.getContext('2d'), 240, 360, { body: '#7a6a58' }); P.g.drawImage(cdu, P.X(s * .17 - .085), P.Y(.42), P.L(.17), P.L(.25)); }
    P.rect(.2, .08, .05, .2, '#6a5848', .004); for (const [y, t] of [[.17, 'UP'], [.13, '1'], [.09, '5'], [.05, '20'], [.01, '30']]) { P.rect(.2, y, .05, .002, '#ddd'); P.text(t, .235, y, .006); } P.text('FLAP', .2, .2, .008); P.rect(-.2, .08, .05, .2, '#6a5848', .004); P.text('SPEED BRAKE', -.2, .2, .007);
    for (const d of [-1, 1]) P.rect(d * .025, -.06, .02, .04, '#a8281e', .003); P.text('FUEL CONTROL', 0, -.03, .007); for (let i = 0; i < 3; i++) { P.inset(0, -.14 - i * .1, .5, .08, '#7a6a58'); for (let j = 0; j < 6; j++) P.knob(-.2 + j * .08, -.14 - i * .1, .011, '#e0d8c8'); P.lcd(-.05, -.125 - i * .1, .08, .016, ['118.70', '121.50', '1200'][i], '#ff5a2a', '#0a0503'); } }, { grime: { n: 10 } });
  quadrant(K, { F: .2, U: -.63, R: rcl, n: 2, gap: .065, len: .19, ang: 12, grip: '#d4ccb4', arm: '#5a4c40', body: '#5a4a3c', gr: .017, gw: .07, rev: true });
  K.box(null, [.2, -.58, rcl - .2], [.012, .09, .012], '#222', { rot: [0, 0, -10] }); K.box(null, [.207, -.535, rcl - .2], [.04, .018, .024], '#e8e0cc', { mat: 'satin' });
  K.box(null, [.2, -.58, rcl + .2], [.012, .09, .012], '#222', { rot: [0, 0, -10] }); K.box(null, [.207, -.535, rcl + .2], [.02, .022, .04], '#e8e0cc', { mat: 'satin' });
  K.box(null, [.2, -.74, -.66], [1.3, .2, .3], C.side, { mat: 'satin' }); K.box(null, [.2, -.74, 1.72], [1.3, .2, .3], C.side, { mat: 'satin' });
  K.box(null, [-.05, .47, rcl], [1.15, .08, .96], C.roof); const ov = frame(-.05, .428, rcl, 0, -90);
  ovMain(K, ov, .47, .57, '#cfc6b4', '#c2b8a4', 41, false);
  K.jet({ rcl, F: .82, seat: { F: -.32, fab: '#d8d0c0', shell: '#5a4a3c', kind: 'check' }, wipers: [[[.95, -.25, -.5], [.925, -.205, -.04]], [[.95, -.25, 2 * rcl + .5], [.925, -.205, 2 * rcl + .04]]] });
  return { rcl, ex: 4.2, ey: 1.7, cam: [-.12, 0, .02], look: [4, -12], fov: 74 };
}
function engGrid(K, m, x0, y0, cols, rows, dx, dy, d, labs) { const r = rng(3); for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const [lab, v, max, red, dig, dp] = labs[j]; K.gauge(m, x0 + i * dx, y0 - j * dy, d, gEng(lab, v * (1 + (r() - .5) * .012), { max, red, dig, dp }), { bh: .008 }); } }
const ENG4 = [['EPR', 1.38, 1.8, 1.65, 1, 2], ['N1', 92.1, 110, 106, 1, 1], ['EGT', 612, 1000, 885, 1, 0], ['N2', 94.6, 110, 105, 1, 1], ['FF', 6.8, 12, 11, 1, 1]];
function deckSteam(K, o) {
  const { rcl, C } = o; FLOOR = -1.2; const cols = K.hdr(o.cols, [4, 5, 6, 7], o.hdr ?? .22);
  K.cabin({ rcl, cols, pat: o.pat, col: { w: C.wall, f: C.frame, r: C.roof, d: C.dark, h: C.hdr || C.roof }, corner: .06, wmat: 'lin', wcells: 'whr', wuv: 1 / 1.2 }); K.mat('lin', liningTex('jet', o.seed ?? 4), 'cab');
  K.visor(cols[5][1], cols[6][1], cols[6][2], cols[5][2], .03, .3, .68, .97, { col: '#05070a', op: .9, rail: C.frame }); hdrKit(K, cols[5][2], cols[6][2], cols[6][3], cols[5][3], { col: '#6a6e72' });
  K.quad([-1.6, -1.2, -.95], [1.25, -1.2, -.95], [1.25, -1.2, 2.0], [-1.6, -1.2, 2.0], C.floor); K.quad([-1.6, -1.25, -1], [-1.6, -1.25, 2.1], [-1.6, .65, 2.1], [-1.6, .65, -1], C.wall);
  const pf = frame(.78, 0, 0); o.glare(K);
  K.panel(pf, { x0: -.85, x1: 1.9, y0: o.bot ?? -.86, y1: o.top }, (P, its) => { P.fill(C.pan); o.paint?.(P, its); P.shade(.85, .14); }, { depth: .02, ...o.po });
  return pf;
}
function footGrille(K, rcl, o = {}) {
  for (const sz of [0, 2 * rcl]) for (const d of [-1, 1]) K.panel(frame(o.F ?? .74, o.U ?? -.95, sz + d * .17, 0, 30), { x0: -.13, x1: .13, y0: -.11, y1: .11 }, (P) => { P.fill(o.col || '#4a4e52'); for (let i = 0; i < 6; i++) for (let j = 0; j < 5; j++) P.rect(-.1 + i * .04, -.08 + j * .04, .03, .03, '#060708', .002); }, { depth: .015, grime: false, flat: .8 });
}
function deckB747(K) {
  const rcl = .52, C = { pan: '#2c3034', frame: '#a8acab', wall: '#b7bdbd', roof: '#cecbc5', floor: '#353940', dark: '#2a2c2e', glare: '#1c1e20', mcp: '#617177', side: '#5f6870', ped: '#5a646c', hdr: '#b4b8b6' };
  const r1 = -.39, r2 = -.585;
  const pf = deckSteam(K, { rcl, C, top: -.3, bot: -.72,
    cols: [
      [[-1.6, -1.2, -.95], [-1.6, -.22, -.93], [-1.6, .25, -.9], [-1.6, .47, -.62], [-1.6, .56, rcl]],
      [[-.6, -1.2, -.95], [-.6, -.2, -.92], [-.6, .25, -.9], [-.6, .47, -.62], [-.6, .56, rcl]],
      [[-.08, -1.2, -.95], [-.08, -.22, -.9], [-.08, .3, -.86], [-.08, .48, -.62], [-.08, .56, rcl]],
      [[-.02, -1.2, -.95], [-.02, -.22, -.9], [-.02, .3, -.86], [-.02, .48, -.62], [-.02, .56, rcl]],
      [[.98, -1.2, -.92], [.88, -.24, -.86], [.62, .31, -.8], [.5, .47, -.6], [.48, .54, rcl]],
      [[1.15, -1.2, -.82], [1.0, -.3, -.75], [.74, .35, -.69], [.62, .45, -.55], [.5, .52, rcl]],
      [[1.15, -1.2, .45], [1.0, -.3, .46], [.72, .35, .46], [.6, .46, .46], [.5, .52, rcl]],
      [[1.15, -1.2, rcl], [1.0, -.3, rcl], [.72, .35, rcl], [.6, .46, rcl], [.5, .52, rcl]]].map((c) => [c[0], c[1], c[2], lerp3(c[2], c[3], .2), lerp3(c[2], c[3], .74), c[3], c[4]]),
    pat: ['wwwwwr', 'wgfgwr', 'wfffwr', 'wgfgwr', 'wfhhhr', 'dghhhr', 'dfhhhr'], seed: 5,
    glare: (K) => {
      glareTop(K, { F0: .55, U0: -.15, Uf: -.21, sill: [1.0, -.3], F: .78, top: -.3, z0: -.82, z1: 1.86, col: C.glare });
      K.box(null, [.553, -.151, rcl], [.014, .008, 2.66], '#3c4044', { flat: 1.1 });
      K.box(null, [.565, -.172, rcl], [.07, .07, 2.2], '#24292c'); const gf = frame(.528, 0, 0);
      K.panel(gf, { x0: -.58, x1: 1.62, y0: -.207, y1: -.137 }, (P) => { P.fill('#2e383c'); P.inset(.52, -.172, .3, .06, '#4c5c62'); P.text('AUTOPILOT / FLIGHT DIRECTOR', .52, -.147, .006, '#e8e8e0');
        for (let i = 0; i < 5; i++) { P.knob(.4 + i * .06, -.18, .009, '#d8d8d0'); P.btn(.4 + i * .06, -.196, .024, .008, '#151515', '', '#ddd', i === 1 ? '#ff3a2a' : null); } P.rect(.52, -.16, .14, .005, '#3aff6a'); for (let i = 0; i < 3; i++) P.toggle(.62 + i * .025, -.18, .012);
        for (const x of [-.25, .21, .83, 2 * rcl + .25]) { P.inset(x, -.172, .2, .06, '#4c5c62'); P.lcd(x - .035, -.162, .065, .016, x < 0 || x > 1.2 ? '108.50' : '113.90', '#f0f0f0', '#050505'); P.lcd(x + .045, -.162, .045, .016, x < 0 || x > 1.2 ? '114' : '274', '#f0f0f0', '#050505'); P.knob(x - .035, -.188, .011, '#d8d8d0'); P.knob(x + .045, -.188, .011, '#d8d8d0'); P.text(x < 0 || x > 1.2 ? 'NAV' : 'VOR / ILS', x, -.147, .006, '#e8e8e0'); } }, { depth: .015, grime: { ea: .1 }, legend: true });
    },
    paint: (P) => {
      P.inset(.1 - .4, -.5, .5, .4, '#30353a', { screws: false }); P.inset(.56, -.5, .4, .4, '#30353a', { screws: false }); P.inset(.9, -.5, .14, .4, '#30353a');
      P.rect(.9, -.36, .11, .045, '#e8e2d0'); P.text('GEAR LIMIT', .9, -.36, .009, '#222'); P.rect(.9, -.5, .028, .14, '#0c0c0c'); P.text('LANDING GEAR', .9, -.6, .008, '#ddd');
      for (let i = 0; i < 3; i++) P.btn(.36, -.47 - i * .045, .055, .035, '#26262a', '', '#ddd', null);
      for (const [x, y] of [[-.33, r1 + .07], [.09, r1 + .07], [-.12, r2 - .085], [-.33, r2 - .065]]) { P.rect(x, y, .04, .009, '#e8e2d0', .001); P.rect(x, y, .028, .002, '#555'); }
    } });
  K.gauge(pf, -.33, r1, .11, gAsiJ(375)); K.gauge(pf, -.12, r1 - .01, .15, gAdi({ sky: '#6b9bc0', gnd: '#4d3522', sym: '#ff9a2a' })); K.gauge(pf, .09, r1, .11, gAltJ());
  K.gauge(pf, -.12, r2 - .02, .13, gHsi()); K.gauge(pf, -.33, r2, .1, gRmi()); K.gauge(pf, .09, r2, .1, gVsiJ()); K.gauge(pf, .215, r1 + .01, .075, gRA()); K.gauge(pf, .215, r2 + .02, .07, gClock());
  K.screen(pf, -.12, -.313, .2, .022, annunDraw({ cols: 6, rows: 1, lit: '#ffb020', off: '#1a3a3a', dim: ['', 'A/P', 'A/T', '', 'ALT', ''] }), { dyn: true, res: 256, bw: .004, sig: (st) => (st.warnings || []).join() });
  K.gauge(pf, .36, r1 + .015, .085, gAdiS({ sky: '#3a7ac0', gnd: '#111' }));
  engGrid(K, pf, .45, -.34, 4, 5, .072, .068, .062, ENG4);
  for (let i = 0; i < 4; i++) K.gauge(pf, .75, -.35 - i * .075, .05, gStat({ min: 0, max: 50, labs: [0, 25, 50], v: 31 - i * 3, t: ['TAT', 'FUEL', 'FUEL', 'OIL'][i] }), { bh: .008 });
  K.cyl(pf, [.9, -.5, .05], .025, .04, '#e8e4d8', { axis: 'z', mat: 'satin' }); K.box(pf, [.9, -.48, .02], [.012, .07, .04], '#aaa', { mat: 'chrome' });
  K.panel(frame(.8, 0, 0), { x0: -.85, x1: 1.9, y0: -1.2, y1: -.72 }, (P) => { P.fill('#1c1f22'); P.shade(.7, .1); }, { depth: .02, flat: .8 });
  K.quad([.78, -.72, -.85], [.8, -.72, -.85], [.8, -.72, 1.9], [.78, -.72, 1.9], '#3a3e42');
  footGrille(K, rcl, { F: .74, U: -.98 });
  ramsHorn(K, { F: .42, U: -.45, w: .17, tip: .14, ar: .013, col: '#3a3d3f', grip: '#2b2d2f', plate: '#4a4e52', column: false, clip: true });
  { const g = new THREE.CylinderGeometry(.03, .04, .75, 16); g.rotateZ(.12); g.translate(.51, -.83, 0); K.add(g, '#34373a', { mat: 'satin' }); K.cyl(null, [.56, -1.17, 0], .15, .05, '#b8bcbe', { r2: .12, seg: 32, mat: 'chrome' }); }
  K.box(null, [.1, -.68, rcl], [.9, .14, .56], C.ped, { mat: 'satin' });
  K.panel(frame(.1, -.61, rcl, 0, 90), { x0: -.28, x1: .28, y0: -.45, y1: .45 }, (P) => { P.fill(C.ped); for (let i = 0; i < 4; i++) { P.inset(0, -.15 - i * .085, .5, .075, '#4e575e'); for (let j = 0; j < 5; j++) P.knob(-.2 + j * .1, -.15 - i * .085, .011, '#d8d8d0'); P.lcd(.05, -.135 - i * .085, .08, .015, ['118.10', '126.70', '0254', '1200'][i], '#f0f0f0', '#050505'); } P.rect(-.2, .2, .05, .2, '#4a5258', .004); P.text('SPEED BRAKE', -.2, .32, .007); P.rect(.2, .2, .05, .2, '#4a5258', .004); P.text('FLAPS', .2, .32, .008); for (const [y, t] of [[.28, 'UP'], [.24, '1'], [.2, '10'], [.16, '20'], [.12, '30']]) P.text(t, .235, y, .006); }, { grime: { n: 10 } });
  quadrant(K, { F: .2, U: -.61, R: rcl, n: 4, gap: .06, len: .22, ang: 22, aw: .025, grip: '#d8d8d0', arm: '#2e3236', body: '#3e464c', gr: .012, gw: .045, rev: true });
  K.box(null, [.22, -.56, rcl - .2], [.012, .1, .012], '#222', { rot: [0, 0, -10] }); K.box(null, [.23, -.51, rcl - .2], [.04, .018, .024], '#1a1a1a', { mat: 'rubber' }); K.box(null, [.22, -.56, rcl + .2], [.012, .1, .012], '#222', { rot: [0, 0, -10] }); K.box(null, [.23, -.51, rcl + .2], [.02, .022, .04], '#d8d4c8', { mat: 'satin' });
  K.box(null, [.2, -.74, -.78], [1.3, .2, .3], C.side, { mat: 'satin' }); K.box(null, [.2, -.74, 1.82], [1.3, .2, .3], C.side, { mat: 'satin' });
  K.box(null, [-.1, .5, rcl], [1.3, .08, 1.0], C.roof); const ov = frame(-.1, .458, rcl, 0, -90);
  ovMain(K, ov, .49, .65, '#151617', '#1c1d1f', K.key === 'b747jal' ? 61 : 43, false);
  K.jet({ rcl, F: .8, fl: -1.2, seat: { F: -.32, fab: '#7a7e80', shell: '#3a3e42', kind: 'check' }, wipers: [[[1.0, -.25, -.55], [.975, -.215, -.06]], [[1.0, -.25, 2 * rcl + .55], [.975, -.215, 2 * rcl + .06]]] });
  ovFwd(K, { F0: .6, U0: .29, F1: .5, U1: .45, R: rcl, w: .9, col: '#151617', sub: '#1d1e20', rim: '#96989b', rows: 3, seed: K.key === 'b747jal' ? 59 : 17 });
  return { rcl, ex: 6.4, ey: 3.25, cam: [-.1, 0, .02], look: [8.5, -12], fov: 72 };
}
function deckDC10(K) {
  const rcl = .5, C = { pan: '#6a717c', frame: '#9aa0a8', wall: '#a8aeb6', roof: '#c2c6cc', floor: '#1d314f', dark: '#2a2e34', glare: '#121410', fcu: '#8a919c', side: '#3d4656', ped: '#8d95a3', hdr: '#a4aab2' };
  const r1 = -.385, r2 = -.565;
  const pf = deckSteam(K, { rcl, C, top: -.29,
    cols: [
      [[-1.6, -1.2, -.9], [-1.6, -.22, -.88], [-1.6, .25, -.85], [-1.6, .46, -.6], [-1.6, .55, rcl]],
      [[-.55, -1.2, -.9], [-.55, -.2, -.87], [-.55, .24, -.85], [-.55, .46, -.6], [-.55, .55, rcl]],
      [[-.08, -1.2, -.9], [-.08, -.22, -.86], [-.08, .28, -.82], [-.08, .47, -.6], [-.08, .55, rcl]],
      [[-.02, -1.2, -.9], [-.02, -.22, -.86], [-.02, .28, -.82], [-.02, .47, -.6], [-.02, .55, rcl]],
      [[.96, -1.2, -.86], [.86, -.24, -.8], [.58, .3, -.74], [.48, .46, -.56], [.46, .53, rcl]],
      [[1.14, -1.2, -.76], [1.0, -.28, -.7], [.7, .33, -.63], [.6, .44, -.5], [.48, .5, rcl]],
      [[1.14, -1.2, .44], [1.0, -.28, .45], [.68, .34, .45], [.58, .45, .45], [.48, .5, rcl]],
      [[1.14, -1.2, rcl], [1.0, -.28, rcl], [.68, .34, rcl], [.58, .45, rcl], [.48, .5, rcl]]],
    pat: ['wwwr', 'wgwr', 'wfwr', 'wgwr', 'wfhr', 'dghr', 'dfhr'],
    glare: (K) => {
      glareTop(K, { F0: .55, U0: -.14, Uf: -.205, sill: [1.0, -.28], F: .78, top: -.29, z0: -.8, z1: 1.8, col: C.glare });
      K.prism([[.548, -.205], [.546, -.09], [.556, -.072], [.61, -.066], [.8, -.16], [.86, -.24], [.78, -.29], [.58, -.21]], .1, .9, C.glare, { grad: [0, .55, .85, .9, 1.3] });
      for (const [zs, d] of [[.1, -1], [.9, 1]]) { const zo = zs + d * .3, A = [.546, -.074, zs], A2 = [.61, -.066, zs], B = [.551, -.141, zo], B2 = [.64, -.136, zo], Cc = [.546, -.205, zs], F = [.8, -.16, zs];
        K.quad(A, B, Cc, Cc, '#141612', { flat: .8, ao: false }); K.quad(A, A2, B2, B, '#1a1c18', { flat: 1.05, ao: false }); K.quad(A2, F, B2, B2, '#161814', { flat: .95, ao: false });
        for (const [t, u] of [[.25, .55], [.5, .45], [.35, .25]]) K.box(null, [.543, lerp(-.205, -.08, u) - t * .02, zs + d * t * .2], [.008, .014, .014], t === .5 ? '#3a3a36' : '#2a2a26', { flat: 1, ao: false }); }
      for (const [zi, zo] of [[-.45, -.76], [2 * rcl + .45, 2 * rcl + .76]]) { const sh = new THREE.Shape([[zi, -.141], [zo, -.06], [zo + Math.sign(zo - zi) * .02, -.141]].map(([a, b]) => new THREE.Vector2(-a, b))), eg = new THREE.ExtrudeGeometry(sh, { depth: .22, bevelEnabled: false }); eg.rotateY(Math.PI / 2); eg.translate(.55, 0, 0); K.add(eg, C.glare, { k: 1.1 }); }
      K.box(null, [.553, -.141, rcl], [.014, .008, 2.6], '#30332e', { flat: 1.1 });
      const gf = frame(.546, 0, 0); K.panel(gf, { x0: .1, x1: .9, y0: -.205, y1: -.09 }, (P) => { P.fill('#1a1b18'); for (const x of [.2, .5, .8]) P.screw(x, -.1); for (let i = 0; i < 5; i++) { const x = .18 + i * .16; P.inset(x, -.16, .15, .075, C.fcu); P.text(['SPD', 'HDG', 'ALT', 'V/S', 'MACH'][i], x, -.128, .007, '#f0f0f0'); P.lcd(x, -.145, .07, .018, i === 3 ? '' : i === 4 ? '.82' : '', '#f0f0f0', '#050505'); P.knob(x - .04, -.184, .01, '#e8e8e8'); P.knob(x + .04, -.184, .01, '#e8e8e8'); } }, { depth: .02, grime: { ea: .1 }, legend: true });
      for (const [i, k, n] of [[0, 'spd', 3], [1, 'hdg', 3], [2, 'alt', 5], [3, 'vs', 5]]) selWin(K, gf, .18 + i * .16, -.145, .07, .018, k, { n, col: '#f0f0f0', bg: '#050505', glow: false, dash: '     ' });
      for (const s of [0, 1]) K.screen(frame(.546, 0, 0), s ? 2 * rcl + .07 : -.07, -.165, .07, .025, annunDraw({ kind: 'master' }), { dyn: true, res: 128, bw: .003, bd: .005, z: .003, sig: (st) => (st.warnings || []).join() });
    },
    paint: (P, its) => { const g = P.g;
      for (const [x, y, w, h] of [[-.17, -.55, .56, .58], [.31, -.5, .11, .42], [.49, -.47, .25, .36]]) P.inset(x, y, w, h, '#626974', { screws: true });
      for (const i of its) if (i.kind === 'g') P.inset(i.x, i.y, i.r * 2 + .012, i.r * 2 + .012, '#59606a', { r: .003, screws: false });
      for (const x of [-.46, .25, .365, .62, .8]) { ln(g, P.X(x), P.Y(-.29), P.X(x), P.Y(-.86), P.L(.004), 'rgba(0,0,0,.5)'); ln(g, P.X(x) + P.L(.004), P.Y(-.29), P.X(x) + P.L(.004), P.Y(-.86), P.L(.0015), 'rgba(255,255,255,.16)'); }
      for (let i = 0; i < 5; i++) { P.toggle(-.12 + i * .045, -.74, .016); P.rect(-.12 + i * .045, -.715, .03, .006, '#e8e8e0', .001); } for (const x of [.1, .2]) P.knob(x, -.76, .012, '#d8d8d8');
      for (const [x, y] of [[-.4, -.74], [.5, -.67], [.42, -.67]]) { P.rect(x, y, .05, .012, '#e8e2d0', .001); P.rect(x, y, .034, .002, '#555'); }
      { const gr = g.createLinearGradient(0, P.Y(-.6), 0, P.Y(-.86)); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.5)'); g.fillStyle = gr; g.fillRect(0, P.Y(-.6), P.W, P.H - P.Y(-.6)); }
      P.inset(.67, -.47, .12, .34, '#5d646e'); for (let i = 0; i < 6; i++) P.rect(.645 + (i % 3) * .025, -.36 - (i / 3 | 0) * .02, .018, .014, '#f2f2f2'); P.rect(.67, -.46, .06, .05, '#0c0c0c'); P.rect(.67, -.53, .06, .05, '#0c0c0c'); P.rect(.76, -.49, .02, .1, '#111'); P.rect(.76, -.4, .06, .04, '#e8e2d0'); P.text('GEAR', .76, -.4, .008, '#222'); for (const [x, y] of [[-.25, r1 + .065], [.145, r1 + .065], [-.05, r2 - .08]]) { P.rect(x, y, .04, .009, '#e8e2d0', .001); P.rect(x, y, .028, .002, '#555'); } }
  });
  K.gauge(pf, -.25, r1, .105, gAsiJ(365)); K.gauge(pf, -.05, r1 - .005, .15, gAdi({ sky: '#8fc4b6', gnd: '#141414', sym: '#ff8a1a', fdc: YEL })); K.gauge(pf, .145, r1, .105, gAltJ('#e8e8e8'));
  K.screen(pf, .063, r1, .028, .13, (g, W, H, st) => { g.fillStyle = '#060606'; g.fillRect(0, 0, W, H); for (let i = 0; i < 10; i++) { ln(g, W * .5, H * i / 10, W, H * i / 10, H * .008, '#ddd'); } if (!nz(st.altFt)) { g.fillStyle = '#2a2a2a'; g.fillRect(0, 0, W, H); flag(g, 0, H * .42, W, H * .14, '', RED); } else { const y = st.altFt > 2500 ? H * .06 : H * (.06 + .88 * (1 - st.altFt / 2500)); g.fillStyle = '#3a3a3a'; g.fillRect(0, 0, W, y - H * .01); poly(g, [[0, y], [W * .45, y - H * .03], [W * .45, y + H * .03]], '#f2f2f2'); } }, { dyn: true, res: 96, bw: .006, sig: (st) => String(nz(st.altFt) ? Math.min(2500, Math.round(st.altFt)) : 'x') });
  K.gauge(pf, -.05, r2 - .02, .13, gHsi()); K.gauge(pf, .145, r2, .095, gRmi()); K.gauge(pf, -.25, r2, .095, gVsiJ());
  K.gauge(pf, -.39, r1 + .01, .07, gClock()); K.gauge(pf, -.39, r2, .06, gStat({ min: 0, max: 4, labs: [0, 2, 4], v: 3, t: 'BRAKE' })); K.gauge(pf, .1, r2 - .12, .055, gStat({ min: 0, max: 10, labs: [0, 5, 10], v: 6, t: 'CABIN' })); K.gauge(pf, .19, r2 - .12, .055, gStat({ min: -2, max: 2, labs: [-2, 0, 2], v: 0, t: 'RATE' }));
  K.screen(pf, -.05, -.307, .2, .022, annunDraw({ cols: 7, rows: 1, lit: '#ffb020', off: '#3a3420', dim: ['', '', '', 'AP', 'AT', '', ''] }), { dyn: true, res: 256, bw: .004, sig: (st) => (st.warnings || []).join() });
  K.screen(pf, .225, r1 + .01, .028, .1, annunDraw({ cols: 1, rows: 3, lit: '#3a8aff', off: '#202836' }), { dyn: true, res: 96, bw: .004, sig: (st) => (st.warnings || []).join() });
  K.gauge(pf, .31, r1 + .01, .08, gAdiS({ sky: '#3a7ac0', gnd: '#111' })); K.gauge(pf, .31, r1 - .085, .07, gAsiJ(365, false, true)); K.gauge(pf, .31, r1 - .17, .07, gAltJ('#e8e8e8', true));
  engGrid(K, pf, .42, -.35, 3, 4, .068, .066, .058, [ENG4[1], ENG4[2], ENG4[3], ENG4[4]]);
  K.cyl(pf, [.76, -.48, .05], .02, .03, '#ddd', { axis: 'z', mat: 'satin' });
  const yc = '#1b1b1b', F = .4, U = -.45; K.cyl(null, [F, U, 0], .075, .08, yc, { axis: 'x', seg: 32, mat: 'satin' }); K.cyl(null, [F - .042, U, 0], .062, .006, '#5a4630', { axis: 'x', seg: 32, mat: 'metal' }); K.cyl(null, [F - .045, U, 0], .054, .006, '#202020', { axis: 'x', seg: 28, mat: 'satin' });
  for (const s of [-1, 1]) { const tg = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[F, U - .01, s * .065], [F - .005, U - .055, s * .13], [F - .01, U - .035, s * .2], [F - .015, U + .05, s * .215], [F - .02, U + .12, s * .2]].map((q) => new V3(...q))), 28, .019, 12); tg.translate(-F, 0, 0); tg.scale(.7, 1, 1); tg.translate(F, 0, 0); K.add(tg, yc, { mat: 'satin', wear: [[F - .02, U + .11, s * .2, .05, .4]] }); if (s < 0) K.sph(null, [F - .02, U + .13, s * .2], .012, '#a88a20', { mat: 'satin' }); }
  K.box(null, [F + .06, U - .4, 0], [.06, .75, .1], yc, { rot: [0, 0, 7], mat: 'satin' });
  K.box(null, [.15, -.66, rcl], [.6, .2, .4], '#66707c', { mat: 'satin' }); K.cyl(null, [.12, -.56, rcl], .14, .38, '#6e7884', { axis: 'z', seg: 32, mat: 'satin' });
  for (let i = 0; i < 4; i++) K.box(null, [.12, -.42, rcl - .135 + i * .09], [.24, .004, .012], '#0c0d0e', { rot: [0, 0, 0] });
  for (let i = 0; i < 3; i++) { const z = rcl - .09 + i * .09, a = 25; K.box(null, [.12 + Math.sin(a * D2R) * .15, -.42 + Math.cos(a * D2R) * .15, z], [.022, .3, .018], '#141414', { rot: [0, 0, -a], mat: 'satin' }); K.cyl(null, [.12 + Math.sin(a * D2R) * .3, -.42 + Math.cos(a * D2R) * .3, z], .014, .07, '#1a1a1a', { axis: 'z', mat: 'bake', wear: [[.25, -.14, z, .04, .3]] }); K.box(null, [.0, -.44, z], [.05, .03, .03], '#c8401a', { mat: 'satin' }); }
  K.box(null, [.5, -.8, -.68], [.7, .3, .3], C.side, { mat: 'satin' }); K.box(null, [.5, -.8, 1.68], [.7, .3, .3], C.side, { mat: 'satin' });
  K.box(null, [-.1, .49, rcl], [1.25, .08, 1.0], C.roof); const ov = frame(-.1, .448, rcl, 0, -90);
  ovMain(K, ov, .49, .62, '#6a7078', '#5f656d', 47, false);
  footGrille(K, rcl, { F: .76, U: -.98, col: '#5a606a' });
  K.jet({ rcl, F: .8, fl: -1.2, seat: { F: -.32, fab: '#4a5a78', shell: '#3a414c' }, wipers: [[[1.0, -.24, -.52], [.975, -.205, -.05]], [[1.0, -.24, 2 * rcl + .52], [.975, -.205, 2 * rcl + .05]]] });
  ovFwd(K, { F0: .6, U0: .29, F1: .5, U1: .45, R: rcl, w: .9, col: '#4e545c', sub: '#5a6068', rim: '#9aa0a8', rows: 3, seed: 23 });
  return { rcl, ex: 4.3, ey: 1.68, cam: [-.1, 0, .02], look: [12.5, -12], fov: 72 };
}
function floorTex(kind) {
  const key = 'fl' + kind; if (LIN[key]) return LIN[key]; const S = 256, c = cv(S, S), g = c.getContext('2d'), r = rng(kind.length * 31); g.fillStyle = '#e4e4e4'; g.fillRect(0, 0, S, S);
  if (kind === 'tread') { for (let j = 0; j < 16; j++) for (let i = 0; i < 16; i++) { const x = i * 16 + 8, y = j * 16 + 8, a = (i + j) % 2 ? 1 : -1; g.save(); g.translate(x, y); g.rotate(a * Math.PI / 4); g.fillStyle = 'rgba(0,0,0,.28)'; g.fillRect(-5, -1, 11, 3.4); g.fillStyle = 'rgba(255,255,255,.5)'; g.fillRect(-6, -2, 11, 2); g.restore(); } }
  else { for (let i = 0; i < 40; i++) { const y = r() * S; ln(g, 0, y, S, y + (r() - .5) * 6, .6 + r() * 1.4, `rgba(${r() < .5 ? '60,40,20' : '255,255,255'},${.05 + r() * .08})`); } for (const y of [0, 128]) { ln(g, 0, y + 1, S, y + 1, 3, 'rgba(0,0,0,.4)'); ln(g, 0, y + 3.5, S, y + 3.5, 1, 'rgba(255,255,255,.25)'); for (const x of [20, 236]) circ(g, x, y + 16, 2.5, 'rgba(0,0,0,.4)'); } }
  grainOver(g, S, S, .05, 'multiply', .4); const t = ctex(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; return (LIN[key] = t); }
function vintageCab(K, rcl, cols, pat, C, o = {}) {
  const f0 = (o.floor ?? -1.1) - .04; cols = cols.map((c) => c.map((q, k) => (k ? q : [q[0], Math.min(q[1], f0), q[2]])));
  K.cabin({ rcl, cols, pat, col: { w: C.wall, f: C.frame, r: C.roof, d: C.dark, s: C.side || C.wall }, depth: o.depth ?? .05, corner: o.corner ?? .03, rivet: o.rivet, seal: o.seal ?? .008, sealc: o.sealc, wmat: o.wmat, rmat: o.rmat, wuv: o.wuv, wcells: o.wcells, bev: o.bev });
  const w = Math.abs(cols[0][0][2] - rcl) + .1, fl = o.floor ?? -1.1; K.quad([-1.6, fl, rcl - w], [1.4, fl, rcl - w], [1.4, fl, rcl + w], [-1.6, fl, rcl + w], C.floor, { k: .8, ...(o.fmat ? { mat: 'fl' + o.fmat, uvs: o.fuv ?? 2 } : {}) }); if (o.fmat) K.mat('fl' + o.fmat, floorTex(o.fmat), 'cab'); K.quad([cols[0][0][0], fl - .05, rcl - w], [cols[0][0][0], fl - .05, rcl + w], [cols[0][0][0], .7, rcl + w], [cols[0][0][0], .7, rcl - w], C.wall, { k: .7 });
}
function riveted(P, col, o = {}) { P.fill(col); P.noise(.14, .7); P.noise(.06, 2, 'multiply'); if (o.rivets !== false) { const g = P.g; g.fillStyle = 'rgba(0,0,0,.4)'; for (let x = 6; x < P.W; x += P.L(.025)) { g.beginPath(); g.arc(x, P.L(.01), P.L(.002), 0, TAU); g.fill(); g.beginPath(); g.arc(x, P.H - P.L(.01), P.L(.002), 0, TAU); g.fill(); } } }
function wheel(K, c, r, o) {
  const [F, U, Z] = c, seg = o.arc ?? 360, a0 = o.a0 ?? 0, tg = new THREE.TorusGeometry(r, o.t ?? .016, 12, 48, seg * D2R); tg.rotateZ((a0 - 90) * D2R + Math.PI / 2 - seg * D2R / 2 - Math.PI / 2); tg.rotateY(Math.PI / 2); tg.rotateZ(o.tilt ?? 0); tg.translate(F, U, Z);
  K.add(tg, o.rim || o.col, { mat: o.rm || 'bake', wear: (o.grips ?? [60, -60]).map((a) => [F, U + Math.cos(a * D2R) * r, Z + Math.sin(a * D2R) * r, r * .45, o.wear ?? .35]) });
  for (const a of o.spokes || [0, 120, 240]) { const t = a * D2R; K.tube([[F + .005, U, Z], [F, U + Math.cos(t) * r * .55, Z + Math.sin(t) * r * .55], [F - .002, U + Math.cos(t) * r * .98, Z + Math.sin(t) * r * .98]], o.st ?? .011, o.col, { n: 12, rs: 8, mat: o.sm || 'satin' }); }
  K.cyl(null, [F + .01, U, Z], o.hub ?? .04, .04, o.hubc || o.col, { axis: 'x', seg: 20, mat: o.hm || 'satin' }); K.sph(null, [F - .01, U, Z], (o.hub ?? .04) * .9, o.hubc || o.col, { sc: [.5, 1, 1], mat: o.hm || 'satin' }); if (o.nut) K.cyl(null, [F - .016, U, Z], o.nut, .012, '#c8ccd0', { axis: 'x', seg: 16, mat: 'chrome' });
}
function outsideNose(K, o) {
  const pts = o.prof.map(([x, r]) => new THREE.Vector2(r, x)), g = new THREE.LatheGeometry(pts, 40, Math.PI * (o.phi0 ?? 1), Math.PI * (o.phi ?? 1)); g.rotateZ(-Math.PI / 2); g.scale(-1, 1, 1); if (o.sc) g.scale(1, o.sc[0], o.sc[1]); g.translate(...o.at);
  K.outside(g, new THREE.MeshStandardMaterial({ color: o.col, metalness: o.metal ?? 0, roughness: o.rough ?? .5, envMapIntensity: 1, side: THREE.DoubleSide }));
}
function deckElectra(K) {
  const rcl = .42, C = { pan: '#3f3f41', wall: '#9a9ca0', frame: '#2a2a2c', roof: '#a4a6aa', floor: '#5a4630', dark: '#1a1a1a', side: '#8f9196' };
  vintageCab(K, rcl, [
    [[-1.4, -1.09, -.5], [-1.4, -.28, -.52], [-1.4, .1, -.5], [-1.4, .25, -.36], [-1.4, .32, rcl]],
    [[-.26, -1.09, -.5], [-.26, -.27, -.52], [-.26, .09, -.5], [-.26, .25, -.36], [-.26, .32, rcl]],
    [[.22, -1.09, -.5], [.22, -.26, -.52], [.2, .09, -.49], [.2, .25, -.35], [.2, .31, rcl]],
    [[.32, -1.09, -.5], [.4, -.22, -.5], [.4, .1, -.46], [.3, .22, -.3], [.24, .3, rcl]],
    [[.82, -1.09, -.45], [.74, -.17, -.41], [.62, .12, -.37], [.45, .25, -.26], [.3, .29, rcl]],
    [[.88, -1.09, -.36], [.82, -.19, -.31], [.7, .12, -.27], [.48, .26, -.2], [.3, .29, rcl]],
    [[.95, -1.09, .38], [.89, -.2, .395], [.73, .12, .4], [.5, .26, .4], [.3, .29, rcl]],
    [[.95, -1.09, rcl], [.89, -.2, rcl], [.73, .12, rcl], [.5, .26, rcl], [.3, .29, rcl]]],
  ['wwwr', 'wgwr', 'wfwr', 'wgwr', 'wfwr', 'dgwr', 'dfwr'], C, { depth: .045, wmat: 'alu', rmat: 'alur', wuv: 1 / 1.2, fmat: 'ply', bev: [.01, '#6a6a6c'] }); K.mat('alu', aluTex(), 'fin:metal'); K.mat('alur', aluTex(), 'cab');
  outsideNose(K, { prof: [[0, 0], [.2, .38], [.5, .56], [.9, .66], [1.4, .7], [1.8, .7]], at: [2.7, -.74, rcl], sc: [.7, 1], col: '#c8ccd0', metal: 1, rough: .18 });
  K.cyl(null, [.62, .13, rcl], .008, .06, '#222'); K.cyl(null, [.62, .07, rcl], .055, .09, '#1e1e20', { seg: 24 }); K.cyl(null, [.62, .023, rcl], .057, .012, '#3a3a3a', { seg: 24 }); K.gauge(frame(.565, .07, rcl), 0, 0, .05, gCompass(), { z: .003, bezel: false });
  const pf = frame(.75, 0, 0), arch = [];
  for (let i = 0; i <= 32; i++) { const x = -.52 + i / 32 * 1.88, t = (x - rcl) / .94; arch.push([x, -.115 - .07 * t * t - .1 * Math.max(0, Math.abs(t) - .78) ** 1.5 * 3]); }
  K.panel(pf, { x0: -.52, x1: 1.36, y0: -.66, y1: -.1 }, (P) => {
    riveted(P, C.pan, { rivets: false }); P.noise(.18, .45, 'overlay'); const g = P.g;
    P.inset(rcl, -.45, .5, .32, '#323234', { screws: false }); g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = P.L(.003); g.strokeRect(P.X(.17), P.Y(-.29), P.L(.5), P.L(.32));
    for (const [x, y] of [[.27, -.31], [.33, -.31], [.53, -.31], [.6, -.31], [.3, -.52], [.38, -.55], [.5, -.55], [.58, -.52]]) P.knob(x, y, .014, '#202020');
    P.rect(.42, -.635, 1.88, .05, '#5a5b5d'); for (let i = 0; i < 24; i++) P.btn(-.44 + i * .075, -.635, .03, .024, i % 5 ? '#1c1c1c' : '#6a1a14');
    for (const [x, y] of [[-.31, -.26], [-.27, -.26]]) circ(g, P.X(x), P.Y(y), P.L(.011), '#9a1a10', '#222', P.L(.003));
    P.rect(1.17, -.42, .1, .07, '#d8d2c0'); P.text('SERIAL NO', 1.17, -.4, .008, '#333', 'center', 800); P.rect(1.17, -.427, .07, .002, '#555'); for (const [x, y] of [[-.47, -.58], [1.3, -.58]]) P.screw(x, y);
    for (let i = 0; i < 70; i++) { const t = i / 69, x = -.5 + t * 1.84, tt = (x - rcl) / .94; P.screw(x, -.125 - .07 * tt * tt - .1 * Math.max(0, Math.abs(tt) - .78) ** 1.5 * 3 - .012, .0022); }
    for (let i = 0; i < 24; i++) P.text(String(i + 1), -.44 + i * .075, -.611, .009, '#e8e4d8', 'center', 700); P.shade(.55, .1);
  }, { shape: [...arch, [1.36, -.66], [-.52, -.66]], depth: .025, legend: true });
  K.tube(arch.map(([x, y]) => [.744, y + .004, x]), .009, '#111', { n: 64, rs: 8 }); K.tube(arch.map(([x, y]) => [.737, y + .006, x]), .0035, '#c8ccd0', { n: 64, rs: 6 });
  const G = (x, y, d, def) => K.gauge(pf, x, y, d, def, { screws: true, bez: '#1a1a1a' }), asi = { min: 50, max: 300, labs: [50, 100, 150, 200, 250, 300], minor: 10, major: 50, z: 210, sw: 300, unit: 'M.P.H.' };
  G(-.215, -.27, .072, gStat({ min: 0, max: 40, labs: [0, 10, 20, 30, 40], v: 24, t: 'FUEL PRESS' })); G(-.07, -.245, .08, gTB()); G(.075, -.255, .095, gAsiV(asi));
  G(-.36, -.34, .078, gStat({ min: -10, max: 10, z: -50, sw: 100, labs: [], v: 0, t: 'L  R', n: 4 })); G(-.215, -.385, .075, gCompass()); G(-.07, -.385, .08, gStat({ min: 0, max: 10, labs: [0, 5, 10], v: 4.6, t: 'SUCTION' })); G(.075, -.385, .095, gRocV({ max: 2, up: 'CLIMB', dn: 'DOWN', sw: 175, sub: '1000 FT' }));
  G(-.215, -.515, .072, gStat({ min: 0, max: 100, labs: [0, 50, 100], v: 62, t: 'OIL PRESS' })); G(.075, -.52, .095, gAltV({ lab: 'ALTITUDE' }));
  for (let i = 0; i < 4; i++) G(.2 + i * .135, -.215 + (i === 1 || i === 2 ? .012 : 0), .072, i < 2 ? gStat({ min: 10, max: 50, labs: [10, 20, 30, 40, 50], v: [28.5, 28.8][i], t: 'MANIFOLD' }) : gStat({ min: 0, max: 25, labs: [0, 5, 10, 15, 20, 25], v: [19.5, 19.4][i - 2], red: 23.5, t: 'R.P.M.' }));
  K.gauge(pf, .26, -.42, .11, gDG(), { bez: '#1a1a1a' }); K.gauge(pf, .45, -.415, .105, gHorizonV({ sky: '#5d6066', gnd: '#8f9298', bar: '#f4f0e4', bg: '#3a3d42', ptr: '#111', col: '#e8e4d8' }), { screws: true, bez: '#1a1a1a' }); G(.42, -.31, .055, gStat({ min: 0, max: 10, labs: [], v: 5 }));
  G(.75, -.26, .09, gHorizonV({})); G(.905, -.27, .09, gAsiV(asi)); G(1.04, -.29, .07, gStat({ min: 0, max: 15, labs: [0, 5, 10, 15], v: 7, t: 'FUEL' }));
  G(.75, -.395, .09, gAltV({ lab: 'ALTITUDE' })); G(.87, -.4, .06, gStat({ min: 0, max: 300, labs: [0, 150, 300], v: 180, t: 'CYL' })); G(.97, -.4, .06, gStat({ min: 0, max: 300, labs: [0, 150, 300], v: 175, t: 'CYL' }));
  G(.75, -.53, .08, gStat({ min: 0, max: 10, labs: [], v: 5, t: 'VACUUM' })); G(.87, -.53, .08, gStat({ min: 0, max: 10, labs: [], v: 3, t: 'L   R' })); G(.99, -.53, .07, gStat({ min: 0, max: 45, z: -60, sw: 120, labs: [0, 45], v: 0, t: 'FLAPS' }));
  K.screen(pf, -.29, -.205, .07, .026, annunDraw({ kind: 'lamps', n: 3 }), { dyn: true, res: 192, bw: .003, bez: '#222', sig: (st) => (st.warnings || []).join() });
  const ux = frame(.6, .118, rcl, 0, -14);
  K.panel(ux, { x0: -.72, x1: .36, y0: -.062, y1: .062 }, (P) => { riveted(P, '#1c1c1e', { rivets: false }); P.inset(-.63, 0, .15, .11, '#2a2a2c'); for (let i = 0; i < 6; i++) P.knob(-.67 + (i % 3) * .04, .025 - (i / 3 | 0) * .045, .009, '#bbb'); P.rect(-.18, .057, 1.0, .006, '#c8c4b8'); }, { depth: .025 });
  K.box(null, [.6, .2, rcl - .55], [.02, .06, .02], '#1a1a1a'); K.box(null, [.6, .2, rcl + .2], [.02, .06, .02], '#1a1a1a');
  for (let i = 0; i < 4; i++) K.gauge(ux, -.33 + i * .15, .026, .052, gStat({ min: 0, max: 100, labs: [0, 50, 100], v: 40 + i * 8, t: ['CYL TEMP', 'CYL TEMP', 'OIL TEMP', 'OIL TEMP'][i] }), { screws: true });
  for (let i = 0; i < 7; i++) K.gauge(ux, -.47 + i * .13, -.03, i < 2 ? .04 : .048, gStat({ min: 0, max: 10, labs: [0, 5, 10], v: 3 + i, t: ['', '', 'FUEL', 'FUEL', 'OIL P', 'OIL P', 'AMP'][i] }), { screws: true });
  for (const z of [0, 2 * rcl]) wheel(K, [.42, -.33, z], .2, { col: '#c8b896', rim: '#c8b896', spokes: [-50, 100, 220], t: .018, st: .011, hub: .042, hubc: '#2a2a2a', hm: 'bake', sm: 'bake', nut: .026, grips: [-60, 60], wear: -.35 });
  for (const z of [0, 2 * rcl]) K.tube([[.445, -.33, z], [.5, -.42, z + (rcl - z) * .55], [.58, -.52, rcl]], .02, '#c0c4c8', { n: 16, mat: 'chrome' });
  K.cyl(null, [.6, -.84, rcl], .026, .62, '#b0b4b8', { mat: 'chrome' }); K.box(null, [.6, -1.06, rcl], [.14, .08, .14], '#555');
  for (let i = 0; i < 6; i++) { const z = rcl - .15 + i * .06, h = i === 2 || i === 3 ? .14 : .1; K.box(null, [.69, -.57, z], [.012, h, .008], '#222', { rot: [0, 0, 12] }); K.sph(null, [.675, -.57 + h / 2, z], .015, ['#e09a2a', '#e09a2a', '#a8221a', '#a8221a', '#2a8a6a', '#2a8a6a'][i]); }
  for (const z of [.28, .52]) { K.cyl(null, [.68, -.7, z + .05], .05, .02, '#e8e4d8', { axis: 'x', seg: 24 }); K.box(null, [.67, -.7, z + .05], [.004, .008, .07], '#c8201a'); }
  for (const z of [-.12, .12]) { K.box(null, [.72, -.8, z], [.02, .5, .018], '#8a8e92'); K.box(null, [.7, -1.02, z], [.08, .03, .09], '#3a3a3a'); }
  K.box(null, [-.3, -.79, 0], [.5, .1, .48], '#6b4f2a'); K.prism([[-1.45, -1.13], [-.05, -1.13], [-.15, -.88], [-.25, -.76], [-.35, -.7], [-.55, -.63], [-.9, -.54], [-1.45, -.54]], -.56, 2 * rcl + .56, '#5e6164', { mat: 'satin' });
  return { rcl, ex: 1.88, ey: .56, look: [8, -6], fov: 70, tint: [1.3, .85, .62] };
}
function deckLancastrian(K) {
  const rcl = .4, C = { pan: '#1c1c1e', wall: '#5f6650', frame: '#18181a', roof: '#4e5444', floor: '#2a2824', dark: '#121212', side: '#5f6650' };
  vintageCab(K, rcl, [
    [[-1.4, -1.0, -.62], [-1.4, -.25, -.66], [-1.4, .2, -.6], [-1.4, .38, -.35], [-1.4, .45, rcl]],
    [[-.3, -1.0, -.62], [-.3, -.25, -.66], [-.3, .22, -.6], [-.3, .4, -.35], [-.3, .46, rcl]],
    [[.05, -1.0, -.62], [.05, -.24, -.66], [.05, .23, -.6], [.05, .4, -.35], [.05, .46, rcl]],
    [[.12, -1.0, -.62], [.12, -.24, -.66], [.12, .23, -.6], [.12, .4, -.35], [.12, .46, rcl]],
    [[.45, -1.0, -.6], [.45, -.24, -.64], [.42, .24, -.56], [.38, .4, -.32], [.36, .45, rcl]],
    [[.52, -1.0, -.6], [.52, -.24, -.63], [.48, .24, -.55], [.42, .39, -.32], [.38, .45, rcl]],
    [[.86, -1.0, -.42], [.86, -.22, -.42], [.6, .25, -.36], [.5, .38, -.24], [.42, .44, rcl]],
    [[.9, -1.0, -.36], [.9, -.22, -.36], [.62, .25, -.31], [.52, .38, -.2], [.42, .44, rcl]],
    [[.94, -1.0, -.03], [.94, -.22, -.03], [.645, .25, -.02], [.54, .38, .02], [.42, .44, rcl]],
    [[.945, -1.0, .02], [.945, -.22, .02], [.648, .25, .03], [.542, .38, .06], [.42, .44, rcl]],
    [[.98, -1.0, .32], [.98, -.22, .33], [.66, .25, .33], [.55, .38, .34], [.42, .44, rcl]],
    [[.98, -1.0, rcl], [.98, -.22, rcl], [.66, .25, rcl], [.55, .38, rcl], [.42, .44, rcl]]],
  ['wwwr', 'wggr', 'wffr', 'wggr', 'wffr', 'wggr', 'wffr', 'dggr', 'dffr', 'dggr', 'dffr'], C, { depth: .06, corner: .025, rivet: .05, seal: .006, sealc: '#4a4a48', wmat: 'rib', wuv: 1 / .6, wcells: 'wr', fmat: 'ply', bev: [.012, '#77776f'] }); K.mat('rib', liningTex('rib', 6), 'cab');
  outsideNose(K, { prof: [[0, 0], [.4, .6], [1.0, .9], [1.8, 1.02], [2.6, 1.05], [3.0, 1.05]], at: [4.0, -1.45, rcl], sc: [.9, 1], col: '#c4c8cc', metal: 1, rough: .22 });
  K.prism([[.82, -.2], [.86, -.19], [.98, -.23], [.98, -.3], [.84, -.26]], -.62, 1.42, C.pan);
  const pf = frame(.7, 0, 0), k = 1.25, Sx = (x) => .0 + x * k, Sy = (y) => -.38 + (y + .38) * k, cres = [];
  for (let i = 0; i <= 24; i++) { const x = -.6 + i / 24 * 2.0, t = (x - .4) / 1.0; cres.push([x, -.2 + .02 * (1 - t * t) - Math.max(0, Math.abs(t) - .55) * .45]); }
  K.panel(pf, { x0: -.6, x1: 1.4, y0: -.72, y1: -.17 }, (P) => {
    riveted(P, C.pan); const g = P.g; g.fillStyle = 'rgba(255,255,255,.18)'; for (let x = -.58; x < 1.4; x += .025) for (const y of [-.24, -.7]) { g.beginPath(); g.arc(P.X(x), P.Y(y), P.L(.0022), 0, TAU); g.fill(); }
    P.inset(Sx(-.08), Sy(-.375), .4 * k, .3 * k, '#141416'); for (let i = 0; i < 4; i++) { P.toggle(.35 + i * .05, -.24, .02); P.toggle(.62 + i * .05, -.24, .02); }
    P.rect(.9, -.3, .08, .03, '#ddd'); P.text('DANGER', .9, -.3, .012, '#a01a12', 'center', 800);
    for (let i = 0; i < 8; i++) P.text(['NAV', 'PITOT', 'IDENT', 'CALL', 'PUMP', 'FUEL', 'HEAT', 'LAMP'][i], (i < 4 ? .35 : .42) + i * .05, -.266, .0085, '#e8e2d0', 'center', 700);
    P.text('FEATHER', Sx(.85), Sy(-.375), .0095, '#e8e2d0', 'center', 700); P.shade(.6, .09);
  }, { shape: [...cres, [1.4, -.72], [-.6, -.72]], depth: .02, legend: true });
  const G = (x, y, d, def, o) => K.gauge(pf, Sx(x), Sy(y), d * k, def, { screws: true, ...o });
  G(-.2, -.31, .08, gRafAsi()); G(-.08, -.31, .085, gRafHorizon()); G(.04, -.31, .08, gRocV({ max: 4, up: 'CLIMB', dn: 'DESCENT', sub: 'THOUSANDS FT/MIN', ncol: '#f0a050', sw: 160 }));
  G(-.2, -.44, .075, gAltV({ lab: 'ALT' })); G(-.08, -.44, .07, gRafDG()); G(.04, -.44, .085, gRafTS());
  for (let i = 0; i < 4; i++) { G(.26 + i * .1, -.29, .06, gStat({ min: -7, max: 18, labs: [-4, 0, 4, 8, 12, 16], v: 7, t: 'BOOST', arcs: [[12, 18, '#a8221a']] })); G(.26 + i * .1, -.4, .075, gStat({ min: 0, max: 5, labs: [0, 1, 2, 3, 4, 5], v: 2.65, t: 'R.P.M.', n2: 25 })); }
  G(.33, -.51, .06, gStat({ min: 0, max: 12, labs: [0, 4, 8, 12], v: 5, t: 'SUPERCHARGER' }));
  for (let i = 0; i < 4; i++) { const x = Sx(.76 + i * .06), y = Sy(-.42); K.cyl(pf, [x, y, .015], .022, .03, '#2a2a2a', { axis: 'z', seg: 3 }); K.sph(pf, [x, y, .035], .022, '#b8261c', { sc: [1, 1, .7] }); K.sph(pf, [x, y - .07, .02], .009, '#c02a1e'); }
  G(.82, -.52, .065, gStat({ min: 0, max: 100, labs: [0, 50, 100], v: 60, t: 'OIL' })); G(.94, -.52, .065, gStat({ min: 0, max: 100, labs: [0, 50, 100], v: 55, t: 'OIL' }));
  K.screen(pf, .22, -.215, .12, .035, annunDraw({ kind: 'lamps', n: 4 }), { dyn: true, res: 192, bw: .003, bez: '#222', sig: (st) => (st.warnings || []).join() });
  K.gauge(frame(.62, -.11, -.04, 0, -10), 0, 0, .085, gCompass(), { z: .012 }); K.box(null, [.64, -.13, -.04], [.06, .04, .11], '#1a1a1a');
  K.lathe(null, [.2, -.66, -.35], [[0, 0], [.1, 0], [.11, .05], [.105, .09], [0, .09]], '#c8c4b0', { axis: 'x', rot: [0, 0, 35] }); K.cyl(null, [.18, -.64, -.35], .085, .01, '#0e0e0e', { axis: 'x', rot: [0, 0, 35] });
  const W = (q) => [q[0] + .08, q[1] - .03, q[2]];
  K.box(null, W([.5, -.8, .0]), [.1, .6, .1], '#181818'); K.box(null, W([.44, -.48, 0]), [.12, .07, .08], '#181818');
  K.cyl(null, W([.42, -.37, 0]), .036, .05, '#202020', { axis: 'x', seg: 20, mat: 'bake' }); K.sph(null, W([.395, -.37, 0]), .034, '#202020', { sc: [.6, 1, 1], mat: 'bake' }); K.cyl(null, W([.374, -.37, 0]), .01, .012, '#c8ccd0', { axis: 'x', seg: 14, mat: 'chrome' });
  for (const s of [-1, 1]) { K.tube([[.405, -.365, s * .02], [.4, -.32, s * .09], [.392, -.262, s * .172]].map(W), .011, '#2a2a28', { n: 10, rs: 10, mat: 'satin' }); K.tube([[.393, -.27, s * .19], [.392, -.235, s * .188], [.39, -.205, s * .18]].map(W), .017, '#3a2a1e', { n: 8, rs: 12, mat: 'rubber', wear: [[...W([.39, -.22, s * .185]), .03, .3]] }); K.sph(null, W([.39, -.205, s * .18]), .017, '#3a2a1e', { mat: 'rubber' }); }
  K.tube([[.392, -.25, -.19], [.396, -.36, -.205], [.4, -.45, -.15], [.402, -.485, 0], [.4, -.45, .15], [.396, -.36, .205], [.392, -.25, .19]].map(W), .017, '#1e1a17', { n: 48, rs: 12, mat: 'bake', wear: [[...W([.396, -.36, -.205]), .07, .5], [...W([.396, -.36, .205]), .07, .5]] });
  
  K.box(null, [.45, -.56, .32], [.25, .1, .3], '#8a8c86', { mat: 'satin' }); K.panel(frame(.45, -.509, .32, 0, 90), { x0: -.15, x1: .15, y0: -.125, y1: .125 }, (P) => { P.fill('#9a9c96'); for (let i = 0; i < 8; i++) P.rect(-.105 + i * .03, 0, .008, .22, '#141414', .003); for (const y of [-.06, .06]) P.rect(0, y, .26, .003, '#3a3a38'); P.rect(.13, .03, .02, .03, '#a8221a'); P.text('THROTTLE', -.06, .11, .009, '#222'); P.text('PITCH', .06, .11, .009, '#222'); }, { depth: .005, grime: { n: 30 } });
  for (let i = 0; i < 8; i++) { const z = .215 + i * .03, a = i < 4 ? 25 : 18; K.box(null, [.45 - Math.sin(a * D2R) * .07, -.51 + Math.cos(a * D2R) * .07, z], [.01, .14, .008], '#5a5c58', { rot: [0, 0, a], mat: 'metal' }); K.sph(null, [.45 - Math.sin(a * D2R) * .14, -.51 + Math.cos(a * D2R) * .14, z], i < 4 ? .0125 : .011, i < 4 ? '#141414' : '#a8221a', { mat: 'bake' }); }
  K.box(null, [-.15, -.6, 0], [.3, .7, .48], '#2a1a1c'); K.box(null, [-.35, -.2, 0], [.06, .5, .42], '#7a3040');
  return { rcl, ex: 5.2, ey: 1.0, look: [6, -13.5], fov: 70, tint: [1.3, .85, .62] };
}
function deckB24(K) {
  const rcl = .37, C = { pan: '#3a3a2c', wall: '#56583c', frame: '#1e1c1a', roof: '#3a3828', floor: '#4a4632', dark: '#151412', side: '#5e5838' };
  const cols = [
    [[-1.4, -1.0, -.7], [-1.4, -.2, -.72], [-1.4, .2, -.66], [-1.4, .4, -.35], [-1.4, .46, rcl]],
    [[.0, -1.0, -.7], [.0, -.2, -.72], [.0, .22, -.66], [.0, .4, -.35], [.0, .46, rcl]],
    [[.08, -1.0, -.7], [.08, -.18, -.72], [.08, .23, -.66], [.08, .4, -.35], [.08, .46, rcl]],
    [[.66, -1.0, -.68], [.68, -.15, -.7], [.6, .22, -.62], [.5, .38, -.34], [.4, .45, rcl]],
    [[.72, -1.0, -.62], [.74, -.15, -.62], [.66, .24, -.54], [.54, .39, -.3], [.42, .45, rcl]],
    [[.96, -1.0, -.3], [.98, -.13, -.3], [.8, .28, -.24], [.62, .42, -.14], [.44, .46, rcl]],
    [[1.0, -1.0, -.22], [1.0, -.13, -.22], [.82, .3, -.18], [.64, .43, -.1], [.46, .46, rcl]],
    [[1.02, -1.0, .28], [1.02, -.12, .3], [.84, .3, .2], [.66, .44, .26], [.46, .46, rcl]],
    [[1.02, -1.0, rcl], [1.02, -.12, rcl], [.84, .3, rcl], [.66, .44, rcl], [.46, .46, rcl]]];
  vintageCab(K, rcl, cols, ['wwwr', 'wgfr', 'wggr', 'wffr', 'wggr', 'wffr', 'dggr', 'dffr'], C, { depth: .06, corner: .055, rivet: .05, wmat: 'rib', wuv: 1 / .6, wcells: 'wr', fmat: 'tread', bev: [.012, '#5e5c50'] }); K.mat('rib', liningTex('rib', 7), 'cab');
  const cell = (a, b, k, sx, t, d) => { const A = new V3(...cols[a][k]), B = new V3(...cols[b][k]), Cc = new V3(...cols[b][k + 1]), Dd = new V3(...cols[a][k + 1]), p = A.clone().lerp(B, sx).lerp(Dd.clone().lerp(Cc, sx), t); return p.add(new V3(d, 0, 0)).toArray(); };
  const bar = (p, q, w, col = '#1c1a18') => { K.tube([p, q], w, col, { n: 2, rs: 6, mat: 'satin' }); };
  for (const sd of [1, -1]) { const mz = (q) => (sd > 0 ? q : [q[0], q[1], 2 * rcl - q[2]]); for (const [s0, t0, s1, t1] of [[0, .02, 1, .02], [0, .98, 1, .98], [.01, 0, .01, 1], [.99, 0, .99, 1]]) bar(mz(cell(6, 7, 1, s0, t0, .045)), mz(cell(6, 7, 1, s1, t1, .045)), .011); for (let i = 1; i < 12; i++) K.sph(null, mz(cell(6, 7, 1, i / 12, .02, .056)), .006, '#3a3a34', { mat: 'satin' }); bar(mz(cell(4, 5, 1, .15, .05, .05)), mz(cell(4, 5, 1, .85, .9, .05)), .006, '#3a3a34'); for (const t of [.05, .95]) bar(mz(cell(4, 5, 1, .1, t, .05)), mz(cell(4, 5, 1, .9, t, .05)), .004, '#2e2e2a'); }
  outsideNose(K, { prof: [[0, 0], [.3, .5], [.9, .8], [1.8, .95], [2.8, 1.0], [3.2, 1.0]], at: [4.2, -1.08, rcl], sc: [.85, 1], col: '#59573a', metal: 0, rough: .7 });
  K.prism([[.75, -.125], [.77, -.112], [1.0, -.13], [1.0, -.18], [.77, -.136]], -.75, 1.5, '#1e1a18'); for (const z of [-.68, 1.42]) { K.cyl(null, [.76, -.1, z], .045, .3, '#3a3a30', { axis: 'x', seg: 16, mat: 'satin' }); K.cyl(null, [.6, -.1, z], .046, .1, '#8a7a5a', { axis: 'x', seg: 16 }); }
  for (const z of [rcl - .035, rcl + .035]) K.cyl(null, [.82, .08, z], .018, .42, '#1e1a18', { rot: [0, 0, -25], mat: 'satin' });
  const tw = frame(.8, .1, rcl); K.box(tw, [0, .13, -.02], [.14, .05, .04], '#6a6a5c', { mat: 'satin' }); for (let i = 0; i < 4; i++) K.sph(tw, [-.045 + i * .03, .13, .005], .009, '#ff7a2a', { mat: 'bake' }); K.box(tw, [0, .055, -.02], [.09, .07, .04], '#2a2a2a', { mat: 'satin' }); K.gauge(tw, 0, .055, .06, gStat({ min: 0, max: 360, n: 12, labs: [], v: 90, t: '' }), { z: .002, bezel: false }); K.box(tw, [0, -.04, -.02], [.13, .08, .04], '#7a7a6c', { mat: 'satin' }); K.gauge(tw, -.03, -.04, .05, gStat({ min: 0, max: 10, labs: [], v: 4 }), { z: .001 }); K.gauge(tw, .03, -.04, .05, gStat({ min: 0, max: 10, labs: [], v: 6 }), { z: .001 });
  K.box(null, [.76, -.1, .6], [.04, .04, .07], '#d84a1a', { mat: 'satin' });
  const pf = frame(.78, 0, 0), u1 = -.185, u2 = -.29;
  K.panel(pf, { x0: -.48, x1: 1.22, y0: -.62, y1: -.13 }, (P) => {
    riveted(P, '#46483a', { rivets: false }); P.rect(-.1, -.24, .6, .22, '#2e3026'); P.rect(.4, -.24, .38, .22, '#2e3026'); P.rect(.9, -.24, .5, .22, '#2e3026');
    const g = P.g; g.strokeStyle = '#d8c23a'; g.lineWidth = P.L(.003); g.strokeRect(P.X(.64), P.Y(-.135), P.L(.5), P.L(.21)); g.strokeStyle = '#b82a1a'; g.strokeRect(P.X(.64), P.Y(-.135), P.L(.5), P.L(.1));
    P.rect(.43, -.18, .14, .03, '#e8e0d0'); P.text('WARNING', .43, -.172, .008, '#a01a12', 'center', 800); P.text('DO NOT EXCEED', .43, -.187, .005, '#a01a12');
    for (let i = 0; i < 4; i++) { circ(g, P.X(.12 + (i % 2) * .045), P.Y(-.37 - (i >> 1) * .045), P.L(.013), '#123a1c', '#777', P.L(.003)); P.text('NO.' + (i + 1), .12 + (i % 2) * .045, -.39 - (i >> 1) * .045, .006, '#ddd'); }
    for (let i = 0; i < 40; i++) P.screw(-.46 + i * .043, -.6, .0025); P.shade(.6, .08);
  }, { depth: .02, legend: true });
  const G = (x, y, d, def) => K.gauge(pf, x, y, d, def, { screws: true, bez: '#161614' });
  G(-.38, u1, .062, gStat({ min: 0, max: 10, labs: [], v: 4, t: 'SUCTION' })); G(-.3, u1, .062, gStat({ min: 0, max: 10, labs: [], v: 5 })); G(-.2, u1, .078, gStat({ min: -10, max: 10, z: -60, sw: 120, labs: [], v: 0, t: 'PDI' })); G(-.08, u1, .085, gDG({ case: '#1e1e1a' })); G(.05, u1, .09, gHorizonV({}));
  G(-.38, u2, .062, gStat({ min: 0, max: 2000, labs: [0, 1000, 2000], v: 1000, t: 'PRESS' })); G(-.3, u2, .062, gStat({ min: 0, max: 2000, labs: [0, 1000, 2000], v: 1050, t: 'PRESS' }));
  G(-.2, u2, .085, gAltV({})); G(-.095, u2, .085, gAsiV({ min: 0, max: 500, labs: [100, 200, 300, 400, 500], arcs: [[140, 275, '#2a8a3a'], [355, 500, '#a8221a']], z: 200, sw: 320 })); G(.01, u2, .08, gTB()); G(.115, u2, .085, gRocV({ max: 6, up: 'CLIMB', dn: 'DOWN' }));
  for (let i = 0; i < 4; i++) G(.235 + i * .078, u1 + .005, .07, gStat({ min: 10, max: 60, labs: [10, 20, 30, 40, 50, 60], v: i < 2 ? [38, 37.5] : [24, 23.5], t: i < 2 ? 'MANIFOLD' : 'R.P.M.' }));
  for (let i = 0; i < 4; i++) G(.68 + i * .095, u1 + .005, .072, i < 2 ? gStat({ min: 0, max: 25, labs: [0, 10, 20], v: 15, t: 'FUEL' }) : gStat({ min: 0, max: 300, labs: [0, 150, 300], v: [200, 190], t: 'CYL', arcs: [[150, 232, '#2a8a3a'], [260, 300, '#a8221a']] }));
  for (let i = 0; i < 5; i++) G(.66 + i * .09, u2 + .01, .07, gStat({ min: i ? 0 : -50, max: i ? 200 : 50, labs: [], v: i ? 70 : 10, t: ['FREE AIR', 'OIL P', 'OIL P', 'OIL T', 'OIL T'][i] }));
  K.box(pf, [.35, -.3, .02], [.15, .13, .04], '#1a1a16'); const af = frame(.738, 0, 0); K.panel(af, { x0: .275, x1: .425, y0: -.365, y1: -.235 }, (P) => { P.fill('#1c1c18'); switches(P, .35, -.28, .13, .06, 6, 2); for (let i = 0; i < 6; i++) circ(P.g, P.X(.29 + i * .024), P.Y(-.345), P.L(.006), ['#c83a1a', '#3a8a3a', '#d8b020'][i % 3]); }, { depth: .01 });
  K.screen(pf, -.36, -.37, .1, .03, annunDraw({ kind: 'lamps', n: 3, col: '#ff3020' }), { dyn: true, res: 192, bw: .003, bez: '#222', sig: (st) => (st.warnings || []).join() });
  for (const z of [0, .74]) { K.cyl(null, [.68, -.44, z], .088, .2, '#45472f', { axis: 'x', seg: 28, wear: [[.6, -.36, z, .06, .25], [.62, -.5, z + .07, .05, .2]] }); K.cyl(null, [.575, -.44, z], .093, .014, '#33352a', { axis: 'x', seg: 28 }); K.cyl(null, [.57, -.44, z], .08, .006, '#2a2a22', { axis: 'x', seg: 24 }); K.tube([[.565, -.44, z], [.47, -.4, z], [.39, -.38, z]], .022, '#2a2a28', { n: 8, rs: 10, mat: 'metal' });
    wheel(K, [.36, -.38, z], .2, { col: '#121212', spokes: [-60, 60, 180], arc: 240, a0: 0, t: .019, st: .012, hub: .036, hubc: '#1c3570', hm: 'bake', grips: [-95, 95], wear: .3 }); for (const sd of [-1, 1]) K.sph(null, [.36, -.38 + Math.cos(60 * D2R) * .2, z + sd * Math.sin(60 * D2R) * .2], .022, '#121212', { mat: 'bake' }); }
  for (let i = 0; i < 12; i++) { const z = rcl - .2 + i * .036; K.box(null, [.63, -.47, z], [.01, .12, .008], '#2a2a2a', { rot: [0, 0, 30], mat: 'satin' }); K.sph(null, [.6, -.42, z], .012, i % 4 === 3 ? '#a8221a' : '#141414', { mat: 'bake' }); }
  K.box(null, [.38, -.66, rcl], [.45, .32, .28], C.side, { mat: 'satin' }); const rp = frame(.153, -.6, rcl);
  K.panel(rp, { x0: -.13, x1: .13, y0: -.15, y1: .15 }, (P) => { P.fill('#2a2a24'); P.inset(0, .07, .22, .1, '#1a1a18'); for (let i = 0; i < 3; i++) { circ(P.g, P.X(-.07 + i * .07), P.Y(.07), P.L(.028), '#0c0c0a', '#777', P.L(.003)); P.knob(-.07 + i * .07, .07, .012, '#2a2a2a'); } P.text('RADIO COMPASS', 0, .135, .008, '#d8d4c4'); for (let i = 0; i < 4; i++) P.toggle(-.08 + i * .055, -.02, .014); P.rect(0, -.09, .2, .04, '#e8e0d0', .002); P.text('TUNE', 0, -.09, .008, '#333'); }, { depth: .01 });
  K.cyl(null, [.145, -.73, rcl], .06, .018, '#121212', { axis: 'x', seg: 28, mat: 'bake' }); for (let i = 0; i < 6; i++) { const a = i * 60 * D2R; K.box(null, [.14, -.73 + Math.cos(a) * .045, rcl + Math.sin(a) * .045], [.01, .008, .008], '#2a2a2a'); } K.cyl(null, [.135, -.69, rcl + .045], .007, .03, '#1a1a1a', { axis: 'x', mat: 'bake' });
  for (const d of [-1, 1]) { K.box(null, [.3, -.48, rcl + d * .08], [.01, .03, .01], '#2a2a2a'); K.box(null, [.3, -.462, rcl + d * .08], [.014, .01, .05], '#b82a1a', { mat: 'bake' }); }
  K.box(null, [-.22, -.4, 0], [.06, .7, .5], '#6a6440', { mat: 'satin' }); K.box(null, [-.22, -.4, .74], [.06, .7, .5], '#6a6440', { mat: 'satin' }); for (let i = 0; i < 5; i++) K.box(null, [-.19, -.7 + i * .12, 0], [.01, .01, .5], '#4c4621');
  return { rcl, ex: 4.1, ey: 1.25, look: [5, -12.5], fov: 70, tint: [.5, 1.3, .65] };
}
function deckTBM(K) {
  const rcl = 0, C = { pan: '#323036', wall: '#5f6a52', frame: '#4d5644', roof: '#5f6a52', floor: '#4a4f42', dark: '#1a1c18', side: '#5a6450' };
  vintageCab(K, rcl, [
    [[-1.3, -1.05, -.42], [-1.3, -.22, -.44], [-1.3, .12, -.4], [-1.3, .32, -.24], [-1.3, .38, 0]],
    [[-.85, -1.05, -.42], [-.85, -.22, -.44], [-.85, .12, -.4], [-.85, .32, -.24], [-.85, .38, 0]],
    [[-.8, -1.05, -.42], [-.8, -.22, -.44], [-.8, .12, -.4], [-.8, .32, -.24], [-.8, .38, 0]],
    [[-.3, -1.05, -.42], [-.3, -.22, -.44], [-.3, .12, -.4], [-.3, .32, -.24], [-.3, .38, 0]],
    [[-.25, -1.05, -.42], [-.25, -.22, -.44], [-.25, .12, -.4], [-.25, .32, -.24], [-.25, .38, 0]],
    [[.25, -1.05, -.42], [.25, -.2, -.43], [.25, .14, -.39], [.22, .32, -.22], [.2, .36, 0]],
    [[.3, -1.05, -.42], [.3, -.2, -.43], [.3, .14, -.39], [.27, .32, -.22], [.25, .36, 0]],
    [[.72, -1.05, -.36], [.72, -.16, -.36], [.58, .18, -.32], [.5, .26, -.2], [.46, .29, 0]],
    [[.78, -1.05, -.28], [.78, -.15, -.26], [.62, .19, -.24], [.53, .27, -.16], [.48, .29, 0]],
    [[.8, -1.05, -.2], [.8, -.14, -.2], [.64, .2, -.2], [.55, .27, -.12], [.5, .29, 0]],
    [[.82, -1.05, 0], [.82, -.14, 0], [.66, .2, 0], [.56, .27, 0], [.5, .29, 0]]],
  ['wggg', 'wfff', 'wggg', 'wfff', 'wggg', 'wfff', 'wggg', 'wfff', 'dgfg', 'dggg'], C, { depth: .035, corner: .02, rivet: .03, wmat: 'rib', wuv: 1 / .6, fmat: 'tread', bev: [.008, '#8a9478'] }); K.mat('rib', liningTex('rib', 8), 'cab');
  outsideNose(K, { prof: [[0, .55], [.2, .66], [.6, .72], [1.4, .74], [2.2, .72], [2.5, .68]], at: [3.4, -.86, 0], col: '#26324a', metal: .1, rough: .45 });
  K.prism([[.64, -.125], [.67, -.112], [.82, -.15], [.82, -.2], [.68, -.14]], -.45, .45, '#141414'); K.tube([[.66, -.11, -.42], [.67, -.103, 0], [.66, -.11, .42]], .016, '#1a1a1a', { n: 16, mat: 'rubber' });
  K.box(null, [.6, -.06, 0], [.08, .06, .08], '#1e1e1e', { mat: 'satin' }); K.box(null, [.58, .0, 0], [.004, .07, .07], '#9ab0b0', { mat: 'glass' });
  const pf = frame(.7, 0, 0), arch = [];
  for (let i = 0; i <= 20; i++) { const x = -.36 + i / 20 * .72, t = x / .36; arch.push([x, -.15 + .04 * (1 - t * t * t * t)]); }
  K.panel(pf, { x0: -.36, x1: .36, y0: -.47, y1: -.11 }, (P) => { riveted(P, C.pan); P.rect(0, -.385, .2, .016, '#1a1a18'); P.text('BUAERO NO. 23307', 0, -.385, .008, '#c8c4b4'); P.rect(-.29, -.25, .05, .03, '#d8d2bc'); P.text('WARNING', -.29, -.245, .006, '#a01a12', 'center', 800); P.shade(.65, .07); }, { shape: [...arch, [.3, -.47], [-.3, -.47]], depth: .02, legend: true });
  const G = (x, y, d, def) => K.gauge(pf, x, y, d, def, { screws: true });
  G(-.18, -.215, .08, gStat({ min: -10, max: 10, z: -60, sw: 120, labs: [], v: 1, t: 'PDI' })); G(-.09, -.215, .08, gAltV({})); G(0, -.205, .085, gDG()); G(.105, -.215, .1, gHorizonV({ bg: '#20242c', sky: '#1e2534', gnd: '#141414' })); G(.235, -.255, .066, gStat({ min: 0, max: 400, labs: [0, 100, 200, 300, 400], v: 0, t: 'LOW RANGE' }));
  G(-.245, -.3, .072, gStat({ min: 10, max: 60, labs: [10, 20, 30, 40, 50, 60], v: 34, t: 'MANIFOLD' })); G(-.155, -.31, .08, gStat({ min: 0, max: 35, labs: [0, 5, 10, 15, 20, 25, 30, 35], v: 23, t: 'R.P.M.' })); G(-.065, -.31, .08, gAsiV({ min: 0, max: 400, labs: [80, 120, 160, 200, 240, 280, 320, 360, 400], minor: 10, major: 40, kt: true, unit: 'KNOTS', z: 200, sw: 320 }));
  G(.025, -.31, .08, gTB()); G(.115, -.31, .08, gRocV({ max: 6 })); G(.195, -.325, .066, gStat({ min: 0, max: 10, labs: [], v: 6, t: 'AYD' }));
  K.screen(pf, .21, -.168, .055, .024, annunDraw({ kind: 'lamps', n: 2 }), { dyn: true, res: 128, bw: .003, bez: '#222', sig: (st) => (st.warnings || []).join() });
  K.cyl(pf, [0, -.42, .025], .015, .62, '#3a3c3a', { axis: 'x', seg: 14, mat: 'satin' }); for (const x of [-.3, .3]) K.box(pf, [x, -.42, .012], [.02, .03, .024], '#2a2a2a');
  const lp = frame(.66, 0, 0, 0, -10); K.panel(lp, { x0: -.3, x1: .3, y0: -.75, y1: -.47 }, (P) => { riveted(P, '#2a2a2a'); for (const [x, t] of [[-.15, 'COWL FLAPS'], [-.05, 'ARREST HOOK'], [.05, 'BOMB DOOR'], [.15, 'WING FOLD']]) { P.rect(x, -.5, .034, .012, '#d8d2bc', .001); P.text(t, x, -.5, .0042, '#222', 'center', 700); } }, { depth: .02 });
  for (const [x, y] of [[.22, -.555], [.22, -.64], [.15, -.705]]) K.gauge(lp, x, y, .07, gStat({ min: 0, max: 10, labs: [0, 5, 10], v: 4 }), { screws: true });
  for (const [x, y] of [[-.22, -.57], [-.22, -.665]]) K.gauge(lp, x, y, .065, gStat({ min: 0, max: 300, labs: [0, 300], v: 180 }), { screws: true });
  const lw = (x) => new V3(x, -.56, .02).applyMatrix4(lp).toArray(), lw2 = (x, y, z) => new V3(x, y, z).applyMatrix4(lp).toArray();
  K.box(null, lw(-.15), [.012, .06, .012], '#3a3a3a', { mat: 'satin' }); K.box(null, lw2(-.15, -.53, .045), [.04, .014, .014], '#d8d4c4', { rot: [90, 0, 0], mat: 'bake' });
  K.box(null, lw(-.05), [.012, .06, .012], '#3a3a3a', { mat: 'satin' }); K.cyl(null, lw2(-.05, -.53, .05), .016, .03, '#1a1a1a', { axis: 'z', mat: 'bake' });
  K.box(null, lw(.05), [.04, .016, .05], '#2a2a2a', { mat: 'satin' }); K.sph(null, lw2(.05, -.545, .07), .014, '#a8221a', { mat: 'bake' });
  K.box(null, lw(.15), [.012, .07, .012], '#3a3a3a', { rot: [0, 0, 20], mat: 'satin' }); K.sph(null, lw2(.16, -.52, .05), .013, '#e8c020', { mat: 'bake' });
  K.cyl(null, [.4, -.7, 0], .018, .56, '#5a5c58', { rot: [0, 0, 8], mat: 'metal' }); const sg = new THREE.LatheGeometry([[0, 0], [.022, 0], [.026, .04], [.022, .1], [.016, .12], [0, .125]].map(([a, b]) => new THREE.Vector2(a, b)), 20); sg.rotateZ(8 * D2R); sg.translate(.36, -.445, 0); K.add(sg, '#1c1c1c', { mat: 'bake', wear: [[.35, -.33, 0, .05, .3]] }); K.box(null, [.36, -.36, .02], [.012, .02, .01], '#a8221a', { mat: 'bake' }); K.lathe(null, [.44, -.98, 0], [[0, 0], [.08, 0], [.05, .08], [.022, .16], [0, .16]], '#8a826e', { mat: 'satin' });
  K.box(null, [.1, -.45, -.4], [.7, .1, .14], '#232323', { mat: 'satin' }); for (let i = 0; i < 3; i++) { K.box(null, [.2 + i * .07, -.38, -.4], [.012, .1, .01], '#333', { rot: [0, 0, -20], mat: 'satin' }); K.sph(null, [.18 + i * .07, -.33, -.4], .018, ['#d8d4c4', '#a8221a', '#1a1a1a'][i], { mat: 'bake' }); }
  K.box(null, [.38, -.4, -.38], [.16, .06, .1], '#8a8676', { mat: 'satin' }); K.box(null, [.1, -.42, .4], [.7, .1, .14], '#232323', { mat: 'satin' }); K.box(null, [.1, -.37, .4], [.3, .02, .1], '#111');
  K.tube([[-.6, .2, .38], [.25, .2, .38]], .012, '#e8f0e0', { n: 4, mat: 'satin' }); K.box(null, [-.17, .2, .395], [.9, .03, .02], '#3a3a32');
  K.box(null, [-.35, -.35, 0], [.1, .55, .44], '#3a3a30', { mat: 'satin' });
  return { rcl, ex: 3.4, ey: 1.32, look: [0, -11.5], fov: 70, tint: [.5, 1.3, .65], levels: { cab: [.8, .07, .03] } };
}
function deckPBM(K) {
  const rcl = .45, C = { pan: '#222222', wall: '#566043', frame: '#1e1e1e', roof: '#4c5440', floor: '#2a2a26', dark: '#141414', side: '#566043' };
  vintageCab(K, rcl, [
    [[-1.4, -1.1, -.66], [-1.4, -.2, -.7], [-1.4, .25, -.64], [-1.4, .4, -.35], [-1.4, .46, rcl]],
    [[-.25, -1.1, -.66], [-.25, -.18, -.7], [-.25, .25, -.64], [-.25, .4, -.35], [-.25, .46, rcl]],
    [[.58, -1.1, -.66], [.58, -.16, -.7], [.55, .28, -.62], [.45, .42, -.32], [.4, .46, rcl]],
    [[.64, -1.1, -.62], [.66, -.16, -.62], [.6, .3, -.55], [.5, .42, -.3], [.42, .46, rcl]],
    [[.92, -1.1, -.32], [.98, -.17, -.32], [.74, .3, -.28], [.56, .42, -.18], [.44, .46, rcl]],
    [[.96, -1.1, -.26], [1.0, -.17, -.25], [.76, .3, -.22], [.58, .42, -.14], [.44, .46, rcl]],
    [[1.0, -1.1, .4], [1.02, -.18, .41], [.78, .3, .41], [.6, .42, .41], [.46, .46, rcl]],
    [[1.0, -1.1, rcl], [1.02, -.18, rcl], [.78, .3, rcl], [.6, .42, rcl], [.46, .46, rcl]]],
  ['wwwr', 'wgfr', 'wffr', 'wggr', 'wffr', 'dggr', 'dffr'], C, { depth: .055, corner: .03, wmat: 'rib', wuv: 1 / .6, wcells: 'wr', fmat: 'ply', bev: [.012, '#4e4e4c'] }); K.mat('rib', liningTex('rib', 9), 'cab');
  outsideNose(K, { prof: [[0, 0], [.4, .55], [1.0, .85], [2.0, 1.05], [3.0, 1.15], [3.4, 1.18]], at: [4.4, -1.3, rcl], sc: [.7, 1], col: '#26324a', metal: .1, rough: .5 });
  K.prism([[.78, -.14], [.82, -.13], [1.0, -.17], [1.0, -.23], [.8, -.185]], -.66, 1.56, '#1a1a1a'); K.tube([[.79, -.137, -.66], [.79, -.137, 1.56]], .012, '#1e1e1e', { n: 2, mat: 'rubber' });
  const pf = frame(.8, 0, 0), cf = frame(.74, 0, 0);
  K.panel(pf, { x0: -.66, x1: 1.56, y0: -.74, y1: -.15 }, (P) => { riveted(P, '#2e2e2e'); P.inset(.45, -.36, .52, .5, '#262626'); P.inset(-.1, -.475, .44, .05, '#1e1e1e'); switches(P, -.1, -.475, .4, .05, 9, 1); for (let i = 0; i < 9; i++) { P.rect(-.28 + i * .045, -.5, .03, .008, '#d8d4c4', .001); } P.rect(-.42, -.26, .06, .03, '#d8d4c4'); P.text('NO SMOKING', -.42, -.26, .005, '#333', 'center', 800); for (let i = 0; i < 6; i++) { P.knob(-.5 + i * .06, -.62, .012, '#888'); P.text(['MIX', 'MIX', 'CARB', 'CARB', 'COWL', 'COWL'][i], -.5 + i * .06, -.595, .0085, '#e0dccc', 'center', 700); } for (let i = 0; i < 9; i++) P.text(['IGN', 'IGN', 'BAT', 'GEN', 'PITOT', 'NAV', 'LDG', 'FORM', 'INST'][i], -.28 + i * .045, -.447, .007, '#e0dccc', 'center', 700); P.shade(.6, .08); }, { depth: .02, legend: true });
  K.box(pf, [.45, -.36, .03], [.52, .5, .06], '#2a2a2a', { mat: 'satin' });
  const G = (m, x, y, d, def) => K.gauge(m, x, y, d, def, { screws: true });
  for (let i = 0; i < 4; i++) G(cf, .27 + i * .12, -.2, i === 3 ? .085 : .1, gStat({ min: i < 1 ? 10 : 0, max: i < 1 ? 60 : 35, labs: i < 1 ? [10, 20, 30, 40, 50, 60] : [0, 5, 10, 15, 20, 25, 30, 35], v: i < 1 ? [34, 33.5] : 23, t: i < 1 ? 'MANIFOLD' : 'R.P.M.' }));
  G(cf, .29, -.34, .1, gDG()); G(cf, .45, -.34, .12, gHorizonV({ bg: '#20242c' })); G(cf, .61, -.34, .08, gStat({ min: 0, max: 10, labs: [], v: 5, t: 'SUCTION' }));
  G(cf, .33, -.48, .08, gStat({ min: 0, max: 100, labs: [0, 50, 100], v: 60, t: 'OIL P' })); G(cf, .45, -.48, .08, gStat({ min: 0, max: 100, labs: [0, 50, 100], v: 62, t: 'OIL P' })); G(cf, .57, -.48, .08, gStat({ min: 0, max: 300, labs: [0, 150, 300], v: 190, t: 'CYL' }));
  const asi = gAsiV({ min: 0, max: 300, labs: [40, 80, 120, 160, 200, 240, 280], minor: 10, major: 40, kt: true, unit: 'KNOTS', z: 200, sw: 320 });
  G(pf, -.14, -.27, .1, asi); G(pf, -.02, -.27, .1, gAltV({})); G(pf, .1, -.278, .07, gStat({ min: -10, max: 10, z: -60, sw: 120, labs: [], v: 0, t: 'PDI' }));
  G(pf, -.14, -.38, .095, gTB()); G(pf, -.02, -.38, .1, gRocV({ max: 6 })); G(pf, -.27, -.27, .08, gClock()); G(pf, -.27, -.38, .07, gStat({ min: 0, max: 10, labs: [], v: 4.5, t: 'SUCTION' }));
  G(pf, 1.0, -.27, .1, asi); G(pf, 1.12, -.27, .1, gAltV({}));
  K.screen(pf, .1, -.212, .13, .036, annunDraw({ kind: 'lamps', n: 3 }), { dyn: true, res: 256, bw: .004, bez: '#222', sig: (st) => (st.warnings || []).join() });
  const qx = .66, qy = .3, qz = .42; K.box(null, [qx, qy, qz], [.26, .07, .2], '#2a2a2a', { mat: 'satin' }); K.box(null, [qx - .131, qy, qz], [.004, .055, .17], '#d8d4c4', { flat: 1 }); K.box(null, [qx - .133, qy, qz], [.002, .012, .12], '#333', { flat: 1 });
  K.box(null, [qx + .05, qy + .08, qz], [.04, .1, .03], '#222', { mat: 'satin' });
  for (const [z, l, c, r, kn] of [[qz - .035, .17, '#121212', .0125, 0], [qz + .035, .17, '#121212', .0125, 0], [qz - .085, .13, '#2a2a2a', .008, '#a8221a'], [qz + .085, .13, '#2a2a2a', .008, '#1a3a8a'], [qz - .12, .11, '#2a2a2a', .007, '#a8221a'], [qz + .12, .11, '#2a2a2a', .007, '#1a3a8a']]) {
    K.box(null, [qx - .04, qy - .035 - l / 2, z], [.012, l, .008], '#3a3a3a', { rot: [0, 0, 8], mat: 'satin' });
    if (kn) K.sph(null, [qx - .052, qy - .04 - l, z], .015, kn, { mat: 'bake' }); else { K.cyl(null, [qx - .052, qy - .035 - l - .06, z], r, .12, c, { mat: 'bake', wear: [[qx - .06, qy - l - .12, z, .04, .25]] }); K.sph(null, [qx - .052, qy - .035 - l - .12, z], r, c, { mat: 'bake' }); }
  }
  for (const z of [0, 2 * rcl]) { K.tube([[.39, -.47, z], [.44, -.5, z], [.5, -.75, z], [.53, -1.1, z]], .03, '#4a5038', { n: 16, rs: 12, mat: 'satin' }); K.cyl(null, [.53, -1.08, z], .07, .05, '#2a2c26', { mat: 'satin' }); wheel(K, [.375, -.47, z], .19, { col: '#151515', spokes: [-90, 90, 180], t: .017, st: .012, hub: .045, hubc: '#1a1a1a', nut: .015, grips: [-90, 90], wear: .4 }); }
  K.box(null, [.55, -.75, rcl], [.35, .3, .5], '#3a3c36', { mat: 'satin' }); const cn = frame(.45, -.6, rcl, 0, 60); K.panel(cn, { x0: -.24, x1: .24, y0: -.15, y1: .15 }, (P) => { riveted(P, '#343432', { rivets: false }); switches(P, 0, .05, .4, .1, 8, 2); for (let i = 0; i < 6; i++) P.knob(-.18 + i * .07, -.08, .014, '#999'); });
  K.box(null, [.25, -.62, -.55], [.6, .12, .16], '#3e4038', { mat: 'satin' }); K.cyl(null, [.3, -.56, -.55], .07, .02, '#121212', { axis: 'z', seg: 28, mat: 'bake' }); K.cyl(null, [.3, -.56, -.552], .072, .006, '#d8d4c4', { axis: 'z', seg: 28 }); for (let i = 0; i < 3; i++) { K.box(null, [.1 + i * .06, -.52, -.55], [.01, .08, .01], '#3a3a3a', { rot: [0, 0, -15], mat: 'satin' }); K.sph(null, [.11 + i * .06, -.48, -.55], .013, ['#1a1a1a', '#a8221a', '#1a1a1a'][i], { mat: 'bake' }); }
  for (const z of [0, 2 * rcl]) K.box(null, [-.3, -.35, z], [.12, .8, .5], '#2c2c2a', { mat: 'satin' });
  return { rcl, ex: 3.6, ey: 1.55, look: [10, -12], fov: 70, tint: [.5, 1.3, .65] };
}


const lerp3 = (a, b, t, up = 0) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t) + up, lerp(a[2], b[2], t)];
const sst = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const hullZ = (h, y) => { const t = Math.abs((y - (h.cy || 0)) / h.b); return t >= 1 ? 0 : h.a * Math.pow(1 - Math.pow(t, h.n || 2), 1 / (h.n || 2)); };
function prof(pts, n = 48) {
  const c = new THREE.SplineCurve(pts.map(([y, z]) => new THREE.Vector2(y, z))), q = c.getSpacedPoints(n), S = c.getLength();
  const at = (s) => { const f = clamp(s / S) * n, i = Math.min(n - 1, Math.floor(f)), t = f - i, a = q[i], b = q[i + 1], dy = b.x - a.x, dz = b.y - a.y, l = Math.hypot(dy, dz) || 1; return { y: lerp(a.x, b.x, t), z: lerp(a.y, b.y, t), ny: dz / l, nz: -dy / l }; };
  return { at, S, pts: q.map((v) => [v.x, v.y]) };
}
function gridGeo(nu, nv, f, uvf, inward) {
  const P = [], U = [], I = [], g = new THREE.BufferGeometry();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) { P.push(...f(i, j)); U.push(...uvf(i, j)); }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) { const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 1, d = c + 1; I.push(a, b, d, a, d, c); }
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setIndex(I); g.computeVertexNormals(); if (inward) orient(g, inward); return g;
}
function orient(g, inward) { const p = g.attributes.position, n = g.attributes.normal; for (let i = 0; i < p.count; i++) { const w = inward(p.getX(i), p.getY(i), p.getZ(i)); if (n.getX(i) * w[0] + n.getY(i) * w[1] + n.getZ(i) * w[2] < 0) n.setXYZ(i, -n.getX(i), -n.getY(i), -n.getZ(i)); } }
function extrudeX(pts, x0, x1, o = {}) {
  const L = [0]; for (let i = 1; i < pts.length; i++) L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const nx = o.nx || 1, su = o.su ?? 1, sv = o.sv ?? 1;
  return gridGeo(nx, pts.length - 1, (i, j) => [lerp(x0, x1, i / nx), pts[j][0], pts[j][1]], (i, j) => [(lerp(x0, x1, i / nx) - (o.u0 ?? 0)) * su, (o.vn ? L[j] / L[L.length - 1] : L[j]) * sv], o.inward);
}
function texC(c, rep) { const t = ctex(c); if (rep) t.wrapS = t.wrapT = THREE.RepeatWrapping; return t; }
function fabric(col, kind, o = {}) {
  const S = 256, c = cv(S, S), g = c.getContext('2d'), base = new THREE.Color(col), hx = (k) => '#' + base.clone().multiplyScalar(k).getHexString(), r = rng(o.seed || 7);
  g.fillStyle = col; g.fillRect(0, 0, S, S);
  if (kind === 'diamond') { const n = o.n || 16, s = S / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) poly(g, [[i * s + s / 2, j * s + s * .12], [i * s + s * .88, j * s + s / 2], [i * s + s / 2, j * s + s * .88], [i * s + s * .12, j * s + s / 2]], (i + j) % 2 ? (o.c2 || hx(1.35)) : hx(.85)); }
  else if (kind === 'check') { const n = o.n || 32, s = S / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if ((i + j) % 2) { g.fillStyle = o.c2 || hx(1.3); g.fillRect(i * s, j * s, s, s); } }
  else if (kind === 'zig') { g.lineWidth = S / 40; for (let j = 0; j < 12; j++) { g.strokeStyle = j % 2 ? (o.c2 || hx(1.4)) : hx(.75); g.beginPath(); for (let i = 0; i <= 12; i++) g.lineTo(i * S / 12, j * S / 12 + (i % 2) * S / 24); g.stroke(); } }
  else if (kind === 'pin') { g.fillStyle = o.c2 || '#8a2a2a'; for (let j = 0; j < 4; j++) g.fillRect(0, j * S / 4 + S / 8, S, S / 110); }
  else if (kind === 'lattice') { g.strokeStyle = o.c2 || hx(1.5); g.lineWidth = S / 64; for (let i = -8; i < 16; i++) { ln(g, i * S / 8, 0, i * S / 8 + S, S, g.lineWidth, g.strokeStyle); ln(g, i * S / 8, S, i * S / 8 + S, 0, g.lineWidth, g.strokeStyle); } }
  else if (kind === 'linen') { g.globalAlpha = .035; for (let i = 0; i < S; i += 2) { g.fillStyle = i % 4 ? '#fff' : '#000'; g.fillRect(0, i, S, 1); g.fillRect(i, 0, 1, S); } g.globalAlpha = 1; }
  else if (kind === 'slip') { g.globalAlpha = .025; for (let i = 0; i < S; i += 3) { g.fillStyle = i % 6 ? '#fff' : '#000'; g.fillRect(0, i, S, 1); g.fillRect(i, 0, 1, S); } g.globalAlpha = 1; for (let i = 0; i < 4; i++) { const x = r() * S, gr = g.createLinearGradient(x - 30, 0, x + 30, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, 'rgba(0,0,0,.07)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - 30, 0, 60, S); } }
  grainOver(g, S, S, .22, 'overlay', 1); grainOver(g, S, S, .08, 'multiply', 3);
  return texC(c, true);
}
function seatRear(st, W = 256, H = 384) {
  const c = cv(W, H), g = c.getContext('2d'), F = st.fabC, pat = g.createPattern(st.fabCanvas, 'repeat');
  pat.setTransform(new DOMMatrix([W / 512, 0, 0, W / 512, 0, 0])); g.fillStyle = pat; g.fillRect(0, 0, W, H);
  const sh = g.createLinearGradient(0, 0, W, 0); sh.addColorStop(0, 'rgba(0,0,0,.35)'); sh.addColorStop(.12, 'rgba(0,0,0,0)'); sh.addColorStop(.88, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.35)'); g.fillStyle = sh; g.fillRect(0, 0, W, H);
  const X = (f) => f * W, Y = (f) => (1 - f) * H, box = (x0, y0, x1, y1, col, r = .02) => { g.fillStyle = col; rr(g, X(x0), Y(y1), X(x1) - X(x0), Y(y0) - Y(y1), W * r); g.fill(); };
  if (st.shell) { box(.02, .0, .98, st.shellH ?? .62, st.shell, .03); g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = W * .006; g.stroke(); }
  if (st.tray) { box(.12, .3, .88, .6, st.tray, .03); g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = W * .008; g.stroke(); const l = g.createLinearGradient(0, Y(.6), 0, Y(.3)); l.addColorStop(0, 'rgba(255,255,255,.18)'); l.addColorStop(1, 'rgba(0,0,0,.12)'); g.fillStyle = l; g.fill(); box(.44, .57, .56, .6, st.latch || '#55595e', .01); if (st.placard) { box(.3, .33, .7, .37, 'rgba(240,240,236,.9)', .005); T(g, 'FASTEN SEAT BELT WHILE SEATED', X(.5), Y(.35), H * .012, '#555', 'center', 600, FNN); } }
  if (st.pocket) { box(.1, .03, .9, .27, st.pocket, .03); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(X(.1), Y(.27), X(.8), H * .02); if (st.net) { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 1; for (let i = 0; i < 30; i++) { ln(g, X(.1 + i * .027), Y(.27), X(.1 + i * .027 + .05), Y(.05), 1, 'rgba(0,0,0,.3)'); } } }
  if (st.screen) { const [x0, y0, x1, y1] = st.screen; box(x0 - .06, y0 - .05, x1 + .06, y1 + .05, st.bezel, .05); g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = W * .006; g.stroke(); box(x0, y0, x1, y1, '#0a0d10', .01); const gr = g.createLinearGradient(X(x0), Y(y1), X(x1), Y(y0)); gr.addColorStop(0, st.scr || '#1a3d5c'); gr.addColorStop(1, '#0a1824'); g.fillStyle = gr; g.fillRect(X(x0) + 3, Y(y1) + 3, X(x1) - X(x0) - 6, Y(y0) - Y(y1) - 6); if (st.map) { const U = (u) => X(lerp(x0, x1, u)), V = (v) => Y(lerp(y0, y1, v)), r = rng(5); g.save(); g.beginPath(); g.rect(X(x0) + 3, Y(y1) + 3, X(x1) - X(x0) - 6, Y(y0) - Y(y1) - 6); g.clip(); g.fillStyle = '#123a66'; g.fill(); g.fillStyle = '#5d7a4a'; for (const [cx, cy, rx, ry] of [[.18, .7, .3, .35], [.9, .35, .35, .45]]) { g.beginPath(); for (let i = 0; i < 24; i++) { const t = i / 24 * TAU, k = .8 + r() * .35; g.lineTo(U(cx + Math.cos(t) * rx * k), V(cy + Math.sin(t) * ry * k)); } g.fill(); } g.strokeStyle = 'rgba(255,255,255,.85)'; g.lineWidth = W * .006; g.setLineDash([W * .012, W * .01]); g.beginPath(); g.moveTo(U(.22), V(.62)); g.quadraticCurveTo(U(.5), V(.95), U(.84), V(.42)); g.stroke(); g.setLineDash([]); g.strokeStyle = '#f4d020'; g.beginPath(); g.moveTo(U(.22), V(.62)); g.quadraticCurveTo(U(.36), V(.8), U(.48), V(.77)); g.stroke(); g.save(); g.translate(U(.48), V(.77)); g.rotate(.25); g.fillStyle = '#f4f0e0'; const a = W * .03; g.beginPath(); g.moveTo(a, 0); g.lineTo(-a * .6, -a * .12); g.lineTo(-a * .3, -a * .9); g.lineTo(-a * .45, -a * .9); g.lineTo(-a, -a * .1); g.lineTo(-a, a * .1); g.lineTo(-a * .45, a * .9); g.lineTo(-a * .3, a * .9); g.lineTo(-a * .6, a * .12); g.fill(); g.restore(); for (const [u, v] of [[.22, .62], [.84, .42]]) circ(g, U(u), V(v), W * .008, '#fff'); g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(X(x0) + 3, Y(y0) - 3 - (Y(y0) - Y(y1)) * .16, X(x1) - X(x0) - 6, (Y(y0) - Y(y1)) * .16); for (let i = 0; i < 3; i++) g.fillRect(U(.08 + i * .3), V(.06), W * .045, H * .006); g.fillStyle = '#e8e8e0'; for (let i = 0; i < 3; i++) g.fillRect(U(.08 + i * .3), V(.06), W * .045, H * .006); g.restore(); } g.fillStyle = 'rgba(255,255,255,.08)'; g.fillRect(X(x0), Y(y1), X(x1) - X(x0), (Y(y0) - Y(y1)) * .35); }
  if (st.cloth) { const y0 = 1 - st.cloth; box(-.02, y0, 1.02, 1.02, '#dedad0', 0); g.fillStyle = 'rgba(0,0,0,.08)'; g.fillRect(0, Y(y0) - 3, W, 3); grainOver(g, W, H * st.cloth, .05, 'multiply', 1); }
  if (st.pin) { g.fillStyle = st.pin; for (const y of [.16, .2]) g.fillRect(0, Y(y), W, 2); }
  const sg = g.createLinearGradient(0, 0, 0, H); sg.addColorStop(0, 'rgba(255,255,255,.14)'); sg.addColorStop(.12, 'rgba(255,255,255,0)'); sg.addColorStop(.8, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = sg; g.fillRect(0, 0, W, H);
  grainOver(g, W, H, .1, 'overlay', 1);
  return ctex(c);
}
function backGeo(st) {
  const w = st.w - .035, h = st.hb, bv = st.bv ?? .03, hw = w / 2 - bv, ht = hw * (st.taper ?? .97), r = Math.max(.012, st.top - bv * .5), y1 = h - bv, hc = st.clothH ? h - st.clothH : null, s = new THREE.Shape();
  s.moveTo(-hw + .03, bv); s.lineTo(hw - .03, bv); s.quadraticCurveTo(hw, bv, hw, bv + .03); if (hc) s.lineTo(lerp(hw, ht, hc / h), hc); s.lineTo(ht, y1 - r); s.quadraticCurveTo(ht, y1, ht - r, y1); s.lineTo(-ht + r, y1); s.quadraticCurveTo(-ht, y1, -ht, y1 - r); if (hc) s.lineTo(-lerp(hw, ht, hc / h), hc); s.lineTo(-hw, bv + .03); s.quadraticCurveTo(-hw, bv, -hw + .03, bv);
  let g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.01, st.t - 2 * bv), bevelEnabled: true, bevelThickness: bv, bevelSize: bv, bevelSegments: st.lod ? 1 : 3, curveSegments: st.lod ? 3 : 6 });
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) + w / 2) / w, uv.getY(i) / h);
  g.rotateY(-Math.PI / 2); g.translate(st.t - bv, 0, 0); if (g.index) g = g.toNonIndexed();
  const P = g.attributes.position, N = g.attributes.normal, cr = st.crown ?? .016, out = [[], [], []];
  for (let t = 0; t < P.count; t += 3) { let my = 1e9, nx = 0; for (let k = 0; k < 3; k++) { my = Math.min(my, P.getY(t + k)); nx += N.getX(t + k) / 3; } out[nx < -.97 ? 1 : hc && my > hc - .001 ? 2 : 0].push(t); }
  const ca = st.rc * D2R, cs = Math.cos(ca), sn = Math.sin(ca);
  return out.map((ix) => { const p = [], n = [], u = []; for (const t of ix) for (let k = 0; k < 3; k++) { const i = t + k, x = P.getX(i), y = P.getY(i), z = P.getZ(i), q = z / (w / 2), d = 2 * cr * q / (w / 2); let nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i) - nx * d; const xx = x - cr * (1 - q * q) * (1 - .4 * y / h), l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
    p.push(xx * cs - y * sn, xx * sn + y * cs + st.y0, z); n.push(nx * cs - ny * sn, nx * sn + ny * cs, nz); u.push(g.attributes.uv.getX(i), g.attributes.uv.getY(i)); }
    const o = new THREE.BufferGeometry(); o.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); o.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3)); o.setAttribute('uv', new THREE.Float32BufferAttribute(u, 2)); return o; });
}
function roundBox(w, h, d, r, seg = 1) { const s = new THREE.Shape(); s.moveTo(-w / 2 + r, -h / 2); s.lineTo(w / 2 - r, -h / 2); s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r); s.lineTo(w / 2, h / 2 - r); s.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2); s.lineTo(-w / 2 + r, h / 2); s.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r); s.lineTo(-w / 2, -h / 2 + r); s.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2); const g = new THREE.ExtrudeGeometry(s, { depth: Math.max(.002, d - 2 * r * .6), bevelEnabled: true, bevelThickness: r * .6, bevelSize: r * .6, bevelSegments: seg, curveSegments: seg }); g.translate(0, 0, -(d - 2 * r * .6) / 2); return g; }
function seatBlocks(C, zi, fl) { const zArm = zi(fl + .62) - .07, lay = C.lay, sw = C.sw, side = (n, s) => Array.from({ length: n }, (_, i) => s * (zArm - sw / 2 - i * sw)), b = [side(lay[0], -1)]; if (lay.length === 3) b.push(Array.from({ length: lay[1] }, (_, i) => (i - (lay[1] - 1) / 2) * sw)); b.push(side(lay[lay.length - 1], 1)); return b; }
function seatBlock(K, st, x0, fl, zs, M, sh, kf = 'cfab', kr = 'crear') {
  const BG = st.geo || (st.geo = backGeo(st)), add = (g, col, key, m, extra = {}) => K.add(g.clone().applyMatrix4(m), col, { mat: key, sh, uvs: 3.2, ...extra, m: M });
  const T4 = (x, y, z) => new THREE.Matrix4().makeTranslation(x, y, z), W = st.w, ah = st.armH ?? .06, ay = st.armY ?? .6, aw = st.armW ?? .05;
  for (const z of zs) {
    const m = T4(x0, fl, z);
    add(BG[0], st.col, kf, m); add(BG[1], '#ffffff', kr, m, { keepUV: true }); if (BG[2].attributes.position.count) add(BG[2], '#f2efe6', 'ccloth', m);
    const cg = st.cg || (st.cg = roundBox(.47, .13, W - .03, .055, st.lod ? 1 : 3)); add(cg, st.col, kf, T4(x0 + .27, fl + .41, z));
    K.box(M, [x0 + .28, fl + .3, z], [.38, .05, W - .1], '#2a2c30', { sh });
  }
  const zl = Math.min(...zs) - W / 2, zr = Math.max(...zs) + W / 2;
  for (let i = 0; i <= zs.length; i++) {
    const z = i === 0 ? zl : i === zs.length ? zr : (zs[i - 1] + zs[i]) / 2, ag = st.ag || (st.ag = roundBox(.42, ah, aw, Math.min(aw, ah) * .45, st.lod ? 1 : 2));
    K.add(ag.clone().applyMatrix4(T4(x0 + .27, fl + ay, z)), st.arm || '#3a3c40', { sh, mat: 'flat', uvs: 3.2, m: M });
    K.box(M, [x0 + .12, fl + .45, z], [.06, .3, aw * .55], st.frame || '#2b2d31', { sh });
    if (st.ashtray) K.box(M, [x0 + .3, fl + ay + ah / 2 + .002, z], [.07, .004, aw * .7], '#a2a4a6', { sh });
    if (st.armBtn) K.box(M, [x0 + .482, fl + ay, z], [.006, .035, aw * .8], '#b8b6ae', { sh });
  }
  K.box(M, [x0 + .3, fl + .3, (zl + zr) / 2], [.05, .04, zr - zl], '#3a3c40', { sh });
  for (const z of [zl + .12, zr - .12]) { K.box(M, [x0 + .08, fl + .14, z], [.04, .28, .04], '#55585c', { sh }); K.box(M, [x0 + .44, fl + .14, z], [.04, .28, .04], '#55585c', { sh }); K.box(M, [x0 + .26, fl + .01, z], [.5, .02, .05], '#6a6d70', { sh }); }
}
function maskGeo(L = .58) {
  const parts = [[], []], Lt = new V3(-.4, .8, .45).normalize();
  const col = (g, c, k = 0, sh = 1) => { g = g.index ? g.toNonIndexed() : g; g.computeVertexNormals(); const n = g.attributes.normal, p = g.attributes.position, a = new Float32Array(n.count * 3), cc = new THREE.Color(c); for (let i = 0; i < n.count; i++) { const d = Math.abs(n.getX(i) * Lt.x + n.getY(i) * Lt.y + n.getZ(i) * Lt.z), f = (.55 + .5 * d) * (sh === 1 ? 1 : lerp(sh, 1, clamp((-p.getX(i) - .01) / .05))); a[i * 3] = cc.r * f; a[i * 3 + 1] = cc.g * f; a[i * 3 + 2] = cc.b * f; } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); parts[k].push(g); };
  col(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0, 0, 0], [.012, -.16, .01], [-.014, -.32, -.004], [.008, -.46, .006], [.016, -L + .01, 0]].map((q) => new V3(...q))), 12, .0045, 4), '#cfe0cc');
  let g = new THREE.LatheGeometry([[.008, 0], [.026, .003], [.04, .022], [.047, .046], [.05, .056], [.046, .06]].map(([a, b]) => new THREE.Vector2(a, b)), 12); g.rotateZ(Math.PI / 2); g.translate(.03, -L - .045, 0); col(g, '#f2c200', 0, .45);
  g = new THREE.TorusGeometry(.049, .0025, 3, 14); g.rotateY(Math.PI / 2); g.rotateZ(.15); g.translate(-.02, -L - .04, 0); col(g, '#f4f2ea');
  g = new THREE.CylinderGeometry(.007, .009, .05, 6, 1, true); g.translate(.02, -L, .0); col(g, '#e8c000');
  g = new THREE.BoxGeometry(.005, L * .92, .003); g.translate(-.004, -L * .46, -.014); col(g, '#e8e2cc');
  g = new THREE.SphereGeometry(.045, 12, 8); g.scale(.3, 1.2, .85); g.translate(.03, -L + .13, .028); col(g, '#f2f4ee', 1);
  return parts.map(merge);
}
function paintTile(W, H, f) { const c = cv(W, H), g = c.getContext('2d'); f(g, W, H); return c; }
function dmask(g, W, H, col, a = .1, q = 8) { g.save(); g.globalAlpha = a; g.strokeStyle = col; g.lineWidth = W * .004; const n = Math.round(H / W * q); for (let j = 0; j <= n; j++) for (let i = 0; i <= q; i++) { const x = (i + (j % 2) * .5) * W / q, y = j * H / n, r = W * .3 / q; g.beginPath(); for (let k = 0; k < 4; k++) { const t = k / 4 * TAU; g.moveTo(x, y); g.bezierCurveTo(x + Math.cos(t - .5) * r, y + Math.sin(t - .5) * r * 1.4, x + Math.cos(t + .5) * r, y + Math.sin(t + .5) * r * 1.4, x, y); } g.stroke(); g.beginPath(); g.ellipse(x + W / q / 2, y + H / n / 2, r * .25, r * .5, 0, 0, TAU); g.stroke(); } g.restore(); }

const CABS = {
  a330: { x: 7.8, wyaw: 79, ed: .22, eh: 1.22, shade: .92, look: [64, -24], fov: 80,  hull: { a: 2.82, b: 2.82 }, th: .11, fl: -.18, P: .533, win: [.235, .315, 3.2], wy: 1.08, rec: [.06, .19, .46, 5, .3], fun: [.065, .045], binY: 1.45, bin: [.6, .42, .06], cbin: true, lay: [2, 4, 2], sw: .457, pitch: .81, era: 2009,
    C: { wall: '#d6d8da', bez: '#dfe0e0', bin: '#e1e3e4', psu: '#c9ccce', ceil: '#e4e6e7', carpet: '#2e3647', riser: '#8d9196' },
    seat: { col: '#33467c', pat: 'diamond', c2: '#42568e', n: 28, hb: .65, t: .12, top: .12, rc: 14, shell: '#c7cacd', tray: '#bfc3c6', placard: true, screen: [.26, .66, .74, .9], bezel: '#d2d5d8', map: true, arm: '#5c6066', armH: .06 } },
  b777: { x: 7.8, wyaw: 79, ed: .22, eh: 1.22, shade: .92, look: [64, -24], fov: 80,  hull: { a: 3.1, b: 3.1 }, th: .12, fl: -.55, P: .53, win: [.26, .38, 2.4], wy: 1.05, rec: [.035, .2, .6, 2.1, .4, .03], fun: [.06, .045, 2.6], binY: 1.47, bin: [.62, .48, .1], cbin: true, lay: [2, 5, 2], sw: .46, pitch: .86, era: 2014, uplight: '#ffdc9a',
    C: { wall: '#d2c9bc', bez: '#d6cfc2', bin: '#e3ded4', psu: '#d4d0c8', ceil: '#e8e2d4', carpet: '#252a42', riser: '#9a9286' },
    seat: { col: '#6b3a7e', pat: 'zig', c2: '#8d5aa0', hb: .66, t: .12, top: .1, rc: 14, shell: '#d6d0c2', shellH: .56, tray: '#c9c4b8', placard: true, pocket: '#5a3468', screen: [.22, .6, .78, .88], bezel: '#2c2926', map: true, arm: '#56525a', armH: .06 }, seat2: { col: '#1b6a62', pat: 'zig', c2: '#2a8a80' } },
  b747: { x: 13.9, wyaw: 106, ed: .25, eh: 1.28, shade: .85, look: [90, -23], fov: 76,  hull: { a: 3.25, b: 3.3, cy: -.05 }, th: .12, fl: -.66, P: .508, win: [.23, .355, 2.05], wy: 1.1, rec: [.08, .165, .66, 7, .22, .1], fun: [.04, .028, .5], binY: 1.47, bin: [.56, .42, 0], cbin: true, lay: [3, 4, 3], sw: .44, pitch: .82, era: 1996,
    C: { wall: '#dcd7cb', bez: '#e0dbcf', bin: '#e8e5de', psu: '#d6d2c8', ceil: '#ece9e2', carpet: '#3a4050', riser: '#8a8a88' },
    seat: { col: '#3e4f80', pat: 'pin', c2: '#8a2a30', hb: .64, t: .13, top: .07, rc: 13, tray: '#b8b2a4', pocket: '#34436c', net: true, clothH: .2, pin: '#8a2a30', arm: '#5a5c62', ashtray: true } },
  b747jal: { x: 13.4, wyaw: 94, ed: .8, eh: 1.27, shade: .85, look: [70, -15], mky: 4, fov: 80,  hull: { a: 3.25, b: 3.3, cy: -.05 }, th: .12, fl: -.66, P: .508, win: [.23, .355, 2.05], wy: 1.1, rec: [.08, .165, .66, 7, .22, .1], fun: [.04, .028, .5], binY: 1.47, bin: [.56, .4, 0], pod: true, lay: [3, 4, 3], sw: .44, pitch: .79, era: 1985,
    C: { wall: '#ddd6c6', bez: '#ded7c6', bin: '#e6e0d2', psu: '#d4cdbd', ceil: '#ece6da', carpet: '#4a3c34', riser: '#8a8278' },
    seat: { col: '#6f9894', pat: 'check', c2: '#7fa8a4', hb: .62, t: .1, top: .06, rc: 12, tray: '#c8bea8', pocket: '#5c807c', net: true, clothH: .18, arm: '#7a7468', ashtray: true } },
  b767: { x: 5.3, wyaw: 79, ed: .22, eh: 1.22, shade: .92, look: [64, -24], fov: 80,  hull: { a: 2.51, b: 2.62, cy: .1 }, th: .1, fl: -.36, P: .508, win: [.235, .32, 4.4], wy: 1.1, rec: [.095, .2, .64, 9, .18, .16], fun: [.035, .03], binY: 1.46, bin: [.56, .42, 0], panels: true, lay: [2, 3, 2], sw: .46, pitch: .8, era: 1999,
    C: { wall: '#d4d0c8', bez: '#d9d5cc', bin: '#d8d5cf', psu: '#cbc7bf', ceil: '#e6e4de', carpet: '#24242a', riser: '#7e7c78' },
    seat: { col: '#3e4770', pat: 'pin', c2: '#7a2a2c', hb: .64, t: .12, top: .07, rc: 13, tray: '#a8a49c', pocket: '#363d64', net: true, clothH: .22, pin: '#8a2a2c', arm: '#55575e' } },
  dc10: { x: 3.6, wyaw: 79, ed: .22, eh: 1.22, shade: .92, look: [64, -24], fov: 80,  hull: { a: 3.01, b: 3.01 }, th: .12, fl: -.3, P: .508, win: [.235, .3, 2.6], wy: 1.08, rec: [0, .2, .6, 4, .3], fun: [.022, .026], binY: 1.47, bin: [.5, .36, 0], open: true, lay: [2, 4, 3], sw: .45, pitch: .86, era: 1979, damask: true,
    C: { wall: '#ddd2b8', bez: '#dcd2b8', bin: '#e4dcc8', psu: '#d2c8b2', ceil: '#ece6d8', carpet: '#352f2a', riser: '#8a8170' },
    seat: { col: '#2d7f88', pat: 'lattice', c2: '#25406a', hb: .68, t: .15, top: .04, rc: 11, pocket: '#256a72', clothH: .22, arm: '#4a4640', armH: .09, armW: .07, ashtray: true, armBtn: true, tray: '#c8bfa8' } },
  lancastrian: { x: -1.9, aft: 1.6, fwd: 2.15, wyaw: 42, ed: .42, look: [28, -6], fov: 76, hull: { a: .9, b: 1.31, n: 2.6 }, th: .05, fl: -0.45, P: .95, win: [.33, .46, 7], wy: 1.0, rec: [0, .2, .3, 4, .3], fun: [.04, .028], lanc: true, lay: [1, 1], sw: .6, pitch: .95, era: 1947,
    C: { wall: '#d8d0bc', bez: '#cfc6b0', ceil: '#e2dccb', carpet: '#2b2823', riser: '#6a6252' },
    seat: { col: '#cfcabb', pat: 'slip', frame: '#262624' } },
};

function holeBay(K, o) {
  const { PR, S, sc, P, a, b, wn, fd, fw, xc, side, N, M, sh } = o, rec = o.rec || (() => 0), map3 = (x, s, off) => { const p = PR.at(s); return [x, p.y + p.ny * off, p.z + p.nz * off]; };
  const fv = o.fv || 0, fwOf = (f) => fw * (1 + fv * Math.pow(Math.abs(Math.sin(f)), 3)), frac = [.33, .66, 1], nRad = 7;
  const angs = []; for (let j = 0; j < N; j++) angs.push(j / N * TAU); const c1 = Math.atan2(S - sc, P / 2), c2 = Math.atan2(sc, P / 2); angs.push(c1, Math.PI - c1, TAU - c2, Math.PI + c2); angs.sort((p, q) => p - q);
  const nr = nRad + frac.length, rows = [], uvs = [];
  for (const f of angs) {
    const cx = Math.cos(f), cy = Math.sin(f), rh = 1 / Math.pow(Math.pow(Math.abs(cx / a), wn) + Math.pow(Math.abs(cy / b), wn), 1 / wn), tx = Math.abs(cx) > 1e-9 ? (P / 2) / Math.abs(cx) : 1e9, ty = cy > 1e-9 ? (S - sc) / cy : cy < -1e-9 ? sc / -cy : 1e9, rr2 = Math.min(tx, ty), fa = fwOf(f), rad = [0, .004, fa * .25, fa * .55, fa * .82, fa, fa + .03], r0 = Math.min(rh + fa + .035, rr2 - .001);
    const rs = [...rad.map((d) => Math.min(rh + d, r0)), ...frac.map((q) => lerp(r0, rr2, q))];
    rows.push(rs.map((r, k) => { const dx = cx * r, ds = cy * r, dd = r - rh, off = rec(dx, ds) - fd * Math.pow(Math.max(0, 1 - dd / fa), 2.2); const p = map3(xc + dx, sc + ds, off); return [p[0], p[1], side * p[2]]; }));
    uvs.push(rs.map((r) => (o.uv ? o.uv(xc + cx * r, sc + cy * r) : [(cx * r) / P + .5, (sc + cy * r) / S])));
  }
  const nf = 6, mk = (k0, k1) => { const P2 = [], U2 = [], I = [], na = angs.length, w = k1 - k0 + 1; for (let j = 0; j < na; j++) for (let k = k0; k <= k1; k++) { P2.push(...rows[j][k]); U2.push(...uvs[j][k]); } for (let j = 0; j < na; j++) for (let k = 0; k < w - 1; k++) { const A = j * w + k, B = ((j + 1) % na) * w + k; I.push(A, B, B + 1, A, B + 1, A + 1); } const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P2, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(U2, 2)); g.setIndex(I); g.computeVertexNormals(); orient(g, o.inward || ((x, y, z) => [0, .3 - y * .1, -z])); return g; };
  K.add(mk(0, nf - 1), '#ffffff', { mat: o.rev || 'crev', keepUV: true, sh: o.shRev || ((n, p) => .95 + .1 * n.y), m: M }); K.add(mk(nf - 1, nr - 1), '#ffffff', { mat: o.wall || 'cwall', keepUV: true, sh, m: M });
  const hole = []; for (let i = 0; i < 40; i++) { const t = i / 40 * TAU, c = Math.cos(t), s = Math.sin(t); hole.push([a * Math.sign(c) * Math.pow(Math.abs(c), 2 / wn), b * Math.sign(s) * Math.pow(Math.abs(s), 2 / wn)]); }
  const gl = new THREE.ShapeGeometry(new THREE.Shape(hole.map(([u, v]) => new THREE.Vector2(u * 1.08 + Math.sign(u) * .006, v * 1.08 + Math.sign(v) * .006)))), gp = gl.attributes.position; for (let i = 0; i < gp.count; i++) { const p = map3(xc + gp.getX(i), sc + gp.getY(i), -fd - .012); gp.setXYZ(i, p[0], p[1], side * p[2]); } gl.computeVertexNormals(); K.add(gl, o.glassCol || '#c8d2d8', { mat: o.glass || 'cglass', flat: 1, m: M });
  return { hole, map3 };
}
function tpl(fn) { const K2 = makeKit(); fn(K2); return [...K2.lists].filter(([, l]) => l.length).map(([k, l]) => [k, merge(l)]); }
function stamp(K, T, dx) { for (const [k, g] of T) { if (!K.lists.has(k)) K.lists.set(k, []); K.lists.get(k).push(g.clone().translate(dx, 0, 0)); } }
function cabin(key) {
  const C = CABS[key] || CABS.a330, K = makeKit(), H = C.hull, fl = C.fl, HC = H, zi = (y) => hullZ(HC, y) - C.th, CC = C.C;
  const yS = fl + (C.binY ?? 1.75), wyc = fl + C.wy;
  const ctrl = C.lanc ? [[fl, zi(fl + .2) - .02], [fl + .25, zi(fl + .3) - .01], [fl + .6, zi(fl + .6)], [fl + 1.0, zi(fl + 1.0)], [fl + 1.25, zi(fl + 1.25)], [fl + 1.4, zi(fl + 1.42) - .01]]
    : [[fl, zi(fl + .3) - .1], [fl + .3, zi(fl + .3) - .07], [fl + .42, zi(fl + .45) - .02], [fl + .7, zi(fl + .7)], [fl + 1.0, zi(fl + 1.0)], [fl + 1.3, zi(fl + 1.3)], [yS, zi(yS)]];
  const PR = prof(ctrl, 40), S = PR.S; let sc = 0; { let best = 9; for (let i = 0; i <= 200; i++) { const s = i / 200 * S, d = Math.abs(PR.at(s).y - wyc); if (d < best) { best = d; sc = s; } } }
  const wc = PR.at(sc), ex = C.x, ey = fl + (C.eh ?? (C.lanc ? 1.05 : 1.2)), ez = zi(wyc) - (C.ed ?? .55), M = new THREE.Matrix4().makeTranslation(-ex, -ey, -ez);
  const sh = (n, p) => { const by = p.y + ey; return (.84 + .14 * n.y - .3 * Math.max(0, -n.x) + .08 * Math.max(0, n.x)) * lerp(.55, 1, sst(fl - .1, fl + 1.0, by)) * (1 - .2 * sst(wyc + .12, yS + .05, by)) * (n.y < -.6 ? .72 : 1); };
  const xA = ex - (C.aft ?? 2.2), xF = ex + (C.fwd ?? 7.2), P = C.P, [ww, wh, wn] = C.win, a = ww / 2, b = wh / 2, [rd, rA, rB, rn, rt, rdy = 0] = C.rec, [fd, fw, fv = 0] = C.fun;
  const recOff = (dx, ds) => { if (!rd) return 0; const q = Math.pow(Math.pow(Math.abs(dx / rA), rn) + Math.pow(Math.abs((ds - rdy) / rB), rn), 1 / rn); return rd * sst(1, 1 + rt, q); };
  const wo = C.wo ?? (zi(wyc) + fd - ez) / Math.tan((C.wyaw ?? 50) * D2R), wx0 = ex + wo + Math.ceil((xA - ex) / P) * P;
  const tileW = 256, tileH = Math.round(256 * S / P);
  const wallC = paintTile(tileW, Math.min(1024, tileH), (g, W, Hh) => {
    const Y = (s) => (1 - s / S) * Hh, X = (x) => (x / P + .5) * W;
    const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, '#' + new THREE.Color(CC.wall).multiplyScalar(.9).getHexString()); gr.addColorStop(.25, CC.wall); gr.addColorStop(1, '#' + new THREE.Color(CC.wall).multiplyScalar(.92).getHexString()); g.fillStyle = gr; g.fillRect(0, 0, W, Hh);
    if (C.damask) dmask(g, W, Hh, '#8a7a52', .1, 6);
    if (C.lanc) { g.fillStyle = 'rgba(80,70,50,.5)'; g.fillRect(0, Y(PR.S * .78), W, 3); }
    const sr = C.lanc ? .22 : .42; g.fillStyle = CC.riser; g.fillRect(0, Y(sr), W, Hh - Y(sr)); if (!C.lanc) { g.fillStyle = 'rgba(0,0,0,.45)'; for (let i = 0; i < 6; i++) g.fillRect(W * (.12 + i * .13), Y(sr * .55), W * .07, (Hh - Y(sr)) * .25); }
    const sg = g.createLinearGradient(0, Y(sr) - 12, 0, Y(sr)); sg.addColorStop(0, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(0,0,0,.18)'); g.fillStyle = sg; g.fillRect(0, Y(sr) - 12, W, 12);
    if (rd) { g.save(); const k = Hh / S; for (const s0 of [-1, 1]) { const lg = g.createLinearGradient(X(s0 * rA * .7), 0, X(s0 * P / 2), 0); lg.addColorStop(0, 'rgba(0,0,0,0)'); lg.addColorStop(1, 'rgba(0,0,0,.07)'); g.fillStyle = lg; g.fillRect(Math.min(X(s0 * rA * .7), X(s0 * P / 2)), Y(sc + rdy + rB), Math.abs(X(s0 * P / 2) - X(s0 * rA * .7)), rB * 2 * k); } g.restore(); }
    if (!C.lanc && !rd) { g.strokeStyle = 'rgba(0,0,0,.12)'; g.lineWidth = 2; ln(g, 1, 0, 1, Y(sr), 2, 'rgba(0,0,0,.12)'); }
    g.save(); g.translate(X(0), Y(sc)); g.scale(W / P, Hh / S); const se = (d) => { g.beginPath(); for (let i = 0; i <= 96; i++) { const f = i / 96 * TAU, c = Math.cos(f), s = Math.sin(f), r = 1 / Math.pow(Math.pow(Math.abs(c / a), wn) + Math.pow(Math.abs(s / b), wn), 1 / wn) + d * (1 + fv * Math.pow(Math.abs(s), 3)); g.lineTo(c * r, -s * r); } g.closePath(); };
    for (let k = 6; k > 0; k--) { se(fw + .004 * k); g.fillStyle = `rgba(0,0,0,${.012 * (7 - k)})`; g.fill(); } se(fw); g.fillStyle = CC.bez; g.fill(); se(fw * .55); g.fillStyle = 'rgba(0,0,0,.04)'; g.fill(); g.restore();
    { const k = Hh / S, gl = g.createRadialGradient(X(0), Y(sc), 0, X(0), Y(sc), .32 * k); gl.addColorStop(0, 'rgba(255,250,240,.1)'); gl.addColorStop(1, 'rgba(255,250,240,0)'); g.fillStyle = gl; g.fillRect(0, 0, W, Hh); }
    if (!C.lanc) { const sg2 = g.createLinearGradient(0, 0, 9, 0); sg2.addColorStop(0, 'rgba(0,0,0,.12)'); sg2.addColorStop(.3, 'rgba(0,0,0,.04)'); sg2.addColorStop(.55, 'rgba(255,255,255,.1)'); sg2.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = sg2; g.fillRect(0, 0, 9, Y(sr)); g.fillStyle = 'rgba(0,0,0,.06)'; g.fillRect(W - 3, 0, 3, Y(sr)); const yj = Y(Math.min(S - .04, sc + b + fw + .1)), jg = g.createLinearGradient(0, yj - 2, 0, yj + 5); jg.addColorStop(0, 'rgba(0,0,0,0)'); jg.addColorStop(.35, 'rgba(0,0,0,.1)'); jg.addColorStop(.65, 'rgba(255,255,255,.12)'); jg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = jg; g.fillRect(0, yj - 2, W, 7); }
    grainOver(g, W, Hh, .018, 'overlay', .6);
  });
  const wallT = texC(wallC); K.mat('cwall', wallT); K.mat('crev', wallT, 'rev'); K.mat('cglass', scratchTex(), 'glass', { opacity: .05, depthWrite: false });
  { const y0 = wyc - b - .03, yb = Math.max(fl - .4, -(HC.b - (HC.cy || 0)) + .02), sk = gridGeo(10, 18, (i, j) => { const y = lerp(y0, yb, Math.pow(j / 18, .8)); return [lerp(xA - 2, xF + 2, i / 10), y, hullZ(HC, y) + .004]; }, (i, j) => [i, j]); sk.applyMatrix4(M); K.outside(sk, new THREE.MeshStandardMaterial({ color: C.skin || '#e8eaea', metalness: C.skinM ?? 0, roughness: C.skinR ?? .4, side: THREE.DoubleSide })); }
  const ring = (K, xc, side, N) => {
    const { hole, map3 } = holeBay(K, { PR, S, sc, P, a, b, wn, fd, fw, fv, xc, side, N, M, sh, rec: recOff, shRev: (n, p) => .8 + .2 * n.y - .22 * Math.max(0, -n.x) + .05 * Math.max(0, n.x) });
    if (!C.lanc) { const cut = b * (side > 0 ? C.shade ?? .55 : .2), ac = a * Math.pow(1 - Math.pow(cut / b, wn), 1 / wn) * 1.12 + .008, shp = [...hole.filter(([u, v]) => v > cut).map(([u, v]) => [u * 1.12 + Math.sign(u) * .008, v * 1.12 + .008]), [-ac, cut], [ac, cut]]; const sg = new THREE.ShapeGeometry(new THREE.Shape(shp.map(([u, v]) => new THREE.Vector2(u, v)))), sp2 = sg.attributes.position; for (let i = 0; i < sp2.count; i++) { const p = map3(xc + sp2.getX(i), sc + sp2.getY(i), -fd + .006); sp2.setXYZ(i, p[0], p[1], side * p[2]); } sg.computeVertexNormals(); K.add(sg, CC.shade || '#d4d0c4', { sh: () => .8, m: M }); const lip = (v0, v1, o0, o1, x0, x1, col, k) => K.add(extrudeX([[v0, o0], [v1, o0], [v1, o1], [v0, o1], [v0, o0]].map(([v, o]) => { const p = map3(0, sc + v, o); return [p[1], side * p[2]]; }), xc + x0, xc + x1, { inward: (x, y, z) => [0, -1, -z] }), col, { sh: (n) => k * (.72 + .22 * n.y), m: M }); lip(cut - .007, cut + .012, -fd + .004, -fd + .013, -ac, ac, CC.shade || '#d4d0c4', 1); lip(cut - .004, cut, -fd + .012, -fd + .0138, -a * .18, a * .18, CC.shade || '#d4d0c4', .78); }
  };
  const RT = [[1, 44], [1, 16], [-1, 10]].map(([sd, n]) => tpl((K2) => ring(K2, 0, sd, n)));
  const n0 = PR.pts.length - 1, offP = (d, side) => PR.pts.map((_, j) => { const p = PR.at(j / n0 * S), o = recOff(P / 2, j / n0 * S - sc) + d; return [p.y + p.ny * o, side * (p.z + p.nz * o)]; });
  const strip = (x, side) => K.add(extrudeX(offP(-.012, side), x - .04, x + .04, { inward: (x, y, z) => [0, 0, -z] }), CC.wall, { sh, m: M });
  const tq = (x) => (Math.abs(x - ex) < 3.2 ? 0 : 1); let xl = wx0; for (let x = wx0; x < xF - P / 2; x += P) { stamp(K, RT[tq(x)], x); stamp(K, RT[2], x); if (x > wx0 && tq(x) !== tq(x - P)) strip(x - P / 2, 1); xl = x; }
  for (const side of [1, -1]) { strip(wx0 - P / 2, side); strip(xl + P / 2, side); for (const [x0, x1] of [[xA, wx0 - P / 2], [xl + P / 2, xF]]) if (x1 - x0 > .01) K.add(extrudeX(offP(0, side), x0, x1, { inward: (x, y, z) => [0, 0, -z], su: 0, sv: 1 / S }), '#ffffff', { mat: 'cwall', keepUV: true, sh, m: M }); }
  const zf = PR.at(0).z;
  const carp = paintTile(512, 512, (g, W, Hh) => { g.fillStyle = CC.carpet; g.fillRect(0, 0, W, Hh); const r = rng(9); g.globalAlpha = .1; for (let i = 0; i < 260; i++) { g.strokeStyle = r() > .5 ? '#fff' : '#000'; g.lineWidth = 1 + r() * 3; g.beginPath(); const x = r() * W, y = r() * Hh; g.arc(x, y, 4 + r() * 18, r() * 6, r() * 6 + 2); g.stroke(); } g.globalAlpha = 1; grainOver(g, W, Hh, .3, 'overlay', 1.5); });
  K.mat('ccarp', texC(carp, true)); K.add(gridGeo(8, 4, (i, j) => [lerp(xA, xF, i / 8), fl, lerp(-zf, zf, j / 4)], (i, j) => [lerp(xA, xF, i / 8) * 1.2, lerp(-zf, zf, j / 4) * 1.2]), '#ffffff', { mat: 'ccarp', keepUV: true, sh: () => .72, m: M });
  const top = PR.at(S), zT = top.z, yT = top.y;
  const ceilC = paintTile(256, 512, (g, W, Hh) => { g.fillStyle = CC.ceil; g.fillRect(0, 0, W, Hh); g.strokeStyle = 'rgba(0,0,0,.1)'; g.lineWidth = 2; ln(g, 0, 1, W, 1, 2, 'rgba(0,0,0,.12)'); grainOver(g, W, Hh, .1, 'overlay', 1); });
  K.mat('cceil', texC(ceilC, true)); K.mat('clamp', null, 'clamp');
  if (!C.lanc) {
    const [bd, bh, bt] = C.bin, binP = [[yT - .03, zT + .03], [yT, zT], [yT + .05, zT - bd * .5], [yT + .09, zT - bd + .05]], doorP = [[yT + .09, zT - bd + .05], [yT + .105, zT - bd + .01], [yT + .15, zT - bd - .005 - bt * .2], [yT + bh * .5, zT - bd - bt * .45], [yT + bh, zT - bd - bt * .1 + .02], [yT + bh + .03, zT - bd + .06]];
    const pitch = C.pitch, xr0 = ex - .1;
    const psuC = paintTile(512, 512, (g, W, Hh) => { const X = (dx) => (dx / pitch) * W, Y = (v) => v / (bd) * Hh; g.fillStyle = CC.psu; g.fillRect(0, 0, W, Hh); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, Y(.02), W, 2); g.fillRect(0, Y(.3), W, 2);
      g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(X(.15), Y(.04), X(.55) - X(.15), Y(.25) - Y(.04)); g.strokeStyle = 'rgba(0,0,0,.3)'; g.lineWidth = 2; g.strokeRect(X(.15), Y(.04), X(.55) - X(.15), Y(.25) - Y(.04));
      for (const [dx, v] of [[.62, .1], [.62, .2]]) { circ(g, X(dx), Y(v), W * .035, '#e8e8e0', '#888', 2); circ(g, X(dx), Y(v), W * .02, '#fffbe8'); }
      for (const [dx, v] of [[.78, .08], [.78, .17], [.78, .26]]) { circ(g, X(dx) + 2, Y(v) + 3, W * .031, 'rgba(0,0,0,.2)'); circ(g, X(dx), Y(v), W * .03, '#b4b0a6', '#77736a', 2); circ(g, X(dx), Y(v), W * .019, '#8e8a81'); circ(g, X(dx), Y(v), W * .008, '#3a3833'); circ(g, X(dx) - W * .008, Y(v) - W * .008, W * .006, 'rgba(255,255,255,.5)'); }
      if (C.era >= 1985) { g.fillStyle = 'rgba(0,0,0,.25)'; rr(g, X(.88) - 2, Y(.06) - 2, X(.11) + 4, Y(.2) - Y(.06) + 4, 5); g.fill(); g.fillStyle = '#8c877c'; rr(g, X(.88), Y(.06), X(.11), Y(.2) - Y(.06), 4); g.fill(); circ(g, X(.935), Y(.1), W * .018, C.era < 1990 ? '#c8c0a8' : '#d8d4c0'); circ(g, X(.935), Y(.17), W * .018, '#d8d4c0'); }
      g.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 0; i < 5; i++) g.fillRect(X(.02), Y(.35 + i * .03), X(.1), 2); grainOver(g, W, Hh, .1, 'overlay', 1); });
    const psuT = texC(psuC, true); K.mat('cpsu', psuT);
    const binC = paintTile(512, 256, (g, W, Hh) => { g.fillStyle = CC.bin; g.fillRect(0, 0, W, Hh); const gr = g.createLinearGradient(0, 0, 0, Hh); gr.addColorStop(0, 'rgba(0,0,0,.08)'); gr.addColorStop(.25, 'rgba(255,255,255,.08)'); gr.addColorStop(.6, 'rgba(0,0,0,0)'); gr.addColorStop(1, 'rgba(0,0,0,.1)'); g.fillStyle = gr; g.fillRect(0, 0, W, Hh); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, 0, 3, Hh); g.fillRect(W - 2, 0, 2, Hh); g.fillStyle = 'rgba(255,255,255,.4)'; g.fillRect(3, 0, 2, Hh);
      g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, W * .44, Hh * .48, W * .12, Hh * .14, 6); g.fill(); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(W * .46, Hh * .53, W * .08, Hh * .03); if (C.era >= 1990) { g.fillStyle = 'rgba(70,70,70,.7)'; for (let i = 0; i < 2; i++) T(g, String(22 + i), W * (.2 + i * .5), Hh * .9, Hh * .07, '#666', 'center', 700); } grainOver(g, W, Hh, .08, 'overlay', 1); });
    const binT = texC(binC, true); K.mat('cbin', binT);
    const doorL = C.era >= 2000 ? 1.6 : 1.5;
    for (const side of [1, -1]) {
      const mir = (pp) => pp.map(([y, z]) => [y, side * z]), inw = (x, y, z) => [0, -1, -z * .3];
      K.add(extrudeX(mir(binP), xA, xF, { nx: 1, u0: xr0 + .3, su: 1 / pitch, sv: 1 / bd, inward: (x, y, z) => [0, -1, 0] }), '#ffffff', { mat: 'cpsu', keepUV: true, sh: () => .82, m: M });
      K.add(extrudeX(mir(doorP), xA, xF, { nx: 1, u0: xr0, su: 1 / doorL, vn: true, inward: (x, y, z) => [0, 0, -z] }), '#ffffff', { mat: 'cbin', keepUV: true, sh: (n) => .88 + .1 * n.y - .04 * Math.abs(n.z), m: M });
    }
    const yC = fl + (C.open ? 2.45 : 2.3), cz = zT - bd + .06, cP = [[yT + bh + .03, cz], [yT + bh + .1, cz - .12], [yC - .06, cz * .55], [yC, 0], [yC - .06, -cz * .55], [yT + bh + .1, -cz + .12], [yT + bh + .03, -cz]];
    K.add(extrudeX(prof(cP, 24).pts, xA, xF, { nx: 1, su: 1, sv: 1, inward: () => [0, -1, 0] }), '#ffffff', { mat: 'cceil', keepUV: true, sh: (n, p) => .84 + .1 * Math.abs(n.z), m: M });
    if (C.uplight || C.open || C.panels || C.pod || C.cbin) { const wl = C.uplight || '#fff4dc'; for (const sd of [1, -1]) K.box(M, [(xA + xF) / 2, yT + bh + .045, sd * (cz - .04)], [xF - xA, .012, .07], wl, { mat: 'clamp', flat: 1 }); }
    if (C.cbin) { const cw = 1.0, cb = yT + .05, ch = .5, cbP = [[cb + ch, cw], [cb + .08, cw + .02], [cb + .02, cw - .03], [cb, cw - .12], [cb, -cw + .12], [cb + .02, -cw + .03], [cb + .08, -cw - .02], [cb + ch, -cw]]; K.add(extrudeX(cbP.slice(0, 3), xA + .5, xF - .5, { u0: xr0, su: 1 / doorL, vn: true, inward: () => [0, 0, -1] }), '#ffffff', { mat: 'cbin', keepUV: true, sh: (n) => .9, m: M }); K.add(extrudeX(cbP.slice(5).map(([y, z]) => [y, z]), xA + .5, xF - .5, { u0: xr0, su: 1 / doorL, vn: true, inward: () => [0, 0, 1] }), '#ffffff', { mat: 'cbin', keepUV: true, sh: (n) => .9, m: M }); K.add(extrudeX(cbP.slice(2, 6), xA + .5, xF - .5, { u0: xr0 + .3, su: 1 / pitch, sv: 1 / bd, inward: () => [0, -1, 0] }), '#ffffff', { mat: 'cpsu', keepUV: true, sh: () => .8, m: M }); for (const xe of [xA + .5, xF - .5]) K.box(M, [xe, cb + ch / 2, 0], [.02, ch, cw * 2], CC.bin, { sh }); }
    if (C.open) for (const sd of [-1, 1]) { K.box(M, [(xA + xF) / 2, yC - .1, sd * .55], [xF - xA - .4, .025, .16], '#fff8e8', { mat: 'clamp', flat: 1 }); K.box(M, [(xA + xF) / 2, yC - .08, sd * .65], [xF - xA - .4, .06, .02], CC.ceil, { sh }); }
    if (C.pod) { K.box(M, [(xA + xF) / 2, yC - .2, 0], [xF - xA - .6, .16, .9], CC.ceil, { sh }); for (const sd of [-1, 1]) K.box(M, [(xA + xF) / 2, yC - .29, sd * .38], [xF - xA - .6, .02, .1], '#fff6e0', { mat: 'clamp', flat: 1 }); }
    if (C.panels) for (let x = xA + 1; x < xF - .5; x += 1.6) { K.box(M, [x, yC - .015, 0], [1.2, .01, 1.0], '#fbf6ea', { mat: 'clamp', flat: 1 }); if (Math.abs(x - ex - 3.4) < .9) { K.box(M, [x + .5, yC - .25, 0], [.06, .3, .1], '#cfccc4', { sh }); K.box(M, [x + .48, yC - .45, 0], [.03, .28, .4], '#2a2a2c', { sh }); } }
    const hangs = [], psuY = (z) => yT + .002 + .09 * clamp((zT - z) / (C.bin[0] - .05));
    const blocks = seatBlocks(C, zi, fl);
    const st = { ...C.seat, w: C.sw, y0: .45, fabCanvas: null }; if (st.clothH) st.cloth = st.clothH / st.hb;
    const fab = fabric(st.col, st.pat, { c2: st.c2, n: st.n }); st.fabCanvas = fab.image; const rear = seatRear(st);
    K.mat('cfab', fab); K.mat('crear', rear); K.mat('ccloth', fabric('#ece9e0', 'linen'));
    let st2 = null; if (C.seat2) { st2 = { ...st, ...C.seat2, geo: null, cg: null, ag: null }; const f2 = fabric(st2.col, st2.pat, { c2: st2.c2 }); st2.fabCanvas = f2.image; K.mat('cfab2', f2); K.mat('crear2', seatRear(st2)); }
    const ssh = (n, p) => { const by = p.y + ey; return (.6 + .3 * Math.max(0, n.x * SL.x + n.y * SL.y + n.z * SL.z) + .08 * n.y) * lerp(.6, 1, sst(fl, fl + .95, by)); };
    const lo = (q) => q && { ...q, geo: null, cg: null, ag: null, lod: 1 }, mkRow = (a, b2) => tpl((K2) => blocks.forEach((zs, bi) => { if (b2 && bi < blocks.length - 1) seatBlock(K2, b2, 0, fl, zs, M, ssh, 'cfab2', 'crear2'); else seatBlock(K2, a, 0, fl, zs, M, ssh); }));
    const ROW = mkRow(st, st2), ROWF = mkRow(lo(st), lo(st2));
    for (let x0 = xr0; x0 < xF - .9; x0 += pitch) {
      stamp(K, x0 - ex < 1.8 ? ROW : ROWF, x0);
      if (C.era >= 1979 && x0 > ex - 1.2 && x0 < ex + 5) { const zs = blocks[blocks.length - 1]; for (const [i, z] of [...zs, zs[zs.length - 1] - C.sw * .6].entries()) { const zz = z + .06 * (1 - (i % 3)); hangs.push([x0 + .62 + (i % 2) * .05, psuY(zz), zz, i]); } if (blocks.length === 3 && (C.cbin || C.pod)) for (const [i, z] of blocks[1].entries()) hangs.push([x0 + .6 + (i % 2) * .05, C.cbin ? yT + .05 : fl + 2.02, z + .05 * (1 - (i % 3)), i + 7]); }
    }
    const ML = clamp(psuY(ez) - ey + .04, .3, .6), [MG, BG] = maskGeo(ML), mm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, side: THREE.DoubleSide }), bm = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .38, depthWrite: false, side: THREE.DoubleSide }), IM = new THREE.InstancedMesh(MG, mm, hangs.length), IB = new THREE.InstancedMesh(BG, bm, hangs.length); IM.renderOrder = 105; IB.renderOrder = 106; for (const q of [IM, IB]) { q.frustumCulled = false; q.position.set(-ex, -ey, -ez); q.visible = false; K.group.add(q); } K.mats.push({ m: mm, kind: 'cab' }, { m: bm, kind: 'cab' });
    const doorG = new THREE.BoxGeometry(.22, .006, .1).translate(0, -.003, -.05).toNonIndexed(), dn = doorG.attributes.normal; doorG.setAttribute('color', new THREE.Float32BufferAttribute(Array.from({ length: dn.count }, (_, i) => { const v = dn.getY(i) > .5 ? .42 : dn.getY(i) < -.5 ? .78 : .6; return [v, v, v]; }).flat(), 3)); const dm = new THREE.MeshBasicMaterial({ color: CC.psu, vertexColors: true, transparent: true }), DM = new THREE.InstancedMesh(doorG, dm, hangs.length); DM.renderOrder = 105; DM.frustumCulled = false; DM.position.copy(IM.position); DM.visible = false; K.group.add(DM); K.mats.push({ m: dm, kind: 'cab' });
    const O = new THREE.Object3D(), ms = { on: false, t0: -1e9, prevT: null };
    const tick = (st0, n, lit, mo) => {
      const on = !!st0.masks, t = nz(st0.timeMs) ? st0.timeMs : 0;
      if (on && !ms.on) ms.t0 = ms.prevT != null && t > ms.prevT && t - ms.prevT < 500 ? t : -1e9; ms.on = on; ms.prevT = t; IM.visible = IB.visible = DM.visible = on; if (!on) return;
      const el = t - ms.t0, p = clamp(el / 650), drop = p < 1 ? 1 - (1 - p) * (1 - p) * Math.abs(Math.cos(p * 7)) : 1;
      hangs.forEach(([x, y, z, i], k) => { const ph = k * 1.7, sw = (1.2 + 6 * (1 - drop) + 3 * Math.exp(-el / 4000)) * D2R; O.position.set(x, y + (ML + .1) * (1 - drop), z); const q = mo ? mo.ph[3] * .655 : t / 900, jx = mo ? clamp(mo.x[2] * 5 + mo.b * .06 * Math.sin(mo.ph[1] + ph), -.6, .6) + mo.sw * .2 * Math.sin(mo.ph[4] * 1.1 + ph * .3) : 0, jz = mo ? clamp(mo.x[1] * .03 + mo.x[3] * 4, -.5, .5) : 0; O.rotation.set(Math.sin(q + ph) * sw + jx, k * .7 - .5, Math.sin(q * .8 + ph * 1.3) * sw * 1.4 + jz); O.updateMatrix(); IM.setMatrixAt(k, O.matrix); IB.setMatrixAt(k, O.matrix); O.position.set(x, y + .002, z + .08); O.rotation.set(-1.25 * Math.min(1, p * 3), 0, 0); O.updateMatrix(); DM.setMatrixAt(k, O.matrix); });
      IM.instanceMatrix.needsUpdate = IB.instanceMatrix.needsUpdate = DM.instanceMatrix.needsUpdate = true;
    };
    const fwdC = paintTile(512, 512, (g, W, Hh) => { g.fillStyle = CC.wall; g.fillRect(0, 0, W, Hh); g.fillStyle = 'rgba(0,0,0,.12)'; g.fillRect(W * .47, 0, 3, Hh); if (C.era < 2005) { g.fillStyle = '#f4f2ec'; g.fillRect(W * .3, Hh * .12, W * .4, Hh * .22); g.strokeStyle = '#999'; g.lineWidth = 3; g.strokeRect(W * .3, Hh * .12, W * .4, Hh * .22); } else { g.fillStyle = '#1a1c1e'; rr(g, W * .4, Hh * .16, W * .2, Hh * .12, 6); g.fill(); g.fillStyle = '#2a5a7c'; g.fillRect(W * .41, Hh * .17, W * .18, Hh * .1); } for (const x of [.15, .8]) { g.fillStyle = 'rgba(0,0,0,.12)'; rr(g, W * (x - .1), Hh * .4, W * .2, Hh * .55, 8); g.fill(); } g.fillStyle = '#2a8a3a'; g.fillRect(W * .44, Hh * .05, W * .12, Hh * .035); T(g, 'EXIT', W * .5, Hh * .068, Hh * .028, '#eaffea', 'center', 800); grainOver(g, W, Hh, .1, 'overlay', 1); });
    K.mat('cbulk', texC(fwdC));
    const yH = (HC.cy || 0) + HC.b - C.th * .4, up = Array.from({ length: 12 }, (_, i) => { const y = lerp(yS, yH, (i + 1) / 13); return [hullZ(HC, y) - C.th * .4, y]; }), sec = [...PR.pts.map(([y, z]) => [z, y]), ...up, [0, yH], ...up.slice().reverse().map(([z, y]) => [-z, y]), ...PR.pts.slice().reverse().map(([y, z]) => [-z, y])];
    for (const xb of [xA, xF]) { const gg = new THREE.ShapeGeometry(new THREE.Shape(sec.map(([z, y]) => new THREE.Vector2(z, y)))), pp = gg.attributes.position, uv = gg.attributes.uv; for (let i = 0; i < pp.count; i++) { const z = pp.getX(i), y = pp.getY(i); uv.setXY(i, z / (2 * zf + .4) + .5, (y - fl) / (yC - fl)); pp.setXYZ(i, xb, y, z); } gg.computeVertexNormals(); K.add(gg, '#ffffff', { mat: 'cbulk', keepUV: true, sh: () => .85, m: M }); }
    const glow = wingGlow(K, [ex, ey, ez], key), fin = finishInterior(K, key, { eye: [ex, ey, ez], rcl: -ez, look: C.look || [26, -11], fov: C.fov || 80, aim: C.wyaw, mky: hangs.length ? C.mky ?? 11 : 0, go: .16, gd: .42, ng: .3, gn: .03, levels: CLV, ctint: [.94, .92, .9], lamp: { p: [0, yS - ey - .03, zi(yS) - ez - .04], s: [.12, 1, 1], c: [3.2, 2.7, 2.05], a: [.85, .88, .95], r: .5 }, tick: (st, n, lit, mo) => { tick(st, n, lit, mo); glow(st, n, lit); } });
    return fin;
  }
  return lancCabin(K, C, { PR, S, sc, ex, ey, ez, M, sh, xA, xF, zi, yT, zT, fl, wx0 });
}
const CLV = { cab: [.86, .05, .01, .3], rev: [.9, .05, .01, .4], clamp: [1.1, .9, .02, .35], glass: [1, .3, .3] };
function armchair(W) {
  const out = [], hw = W / 2 - .06, cap = (r, l, ax) => { const g = new THREE.CapsuleGeometry(r, l, 5, 14); if (ax === 'z') g.rotateX(Math.PI / 2); if (ax === 'x') g.rotateZ(Math.PI / 2); return g; }, rc = 14 * D2R;
  const back = roundBox(.15, .4, hw * 2 - .02, .06, 3); back.translate(.08, .2, 0); back.rotateZ(rc); back.translate(.04, .44, 0); out.push(['fab', back]);
  const roll = cap(.072, hw * 2 - .16, 'z'); roll.translate(.07 - Math.sin(rc) * .42, .44 + Math.cos(rc) * .4 + .02, 0); out.push(['fab', roll]);
  const cush = roundBox(.56, .15, hw * 2 - .03, .065, 3); cush.translate(.42, .4, 0); out.push(['fab', cush]);
  for (const sd of [-1, 1]) {
    const arm = cap(.058, .5, 'x'); arm.translate(.42, .64, sd * hw); out.push(['fab', arm]);
    const side = roundBox(.62, .42, .07, .03, 2); side.translate(.4, .4, sd * hw); out.push(['fab', side]);
    const wing = roundBox(.16, .26, .08, .035, 2); wing.translate(.06, .62, sd * (hw - .01)); wing.rotateZ(rc * .6); out.push(['fab', wing]);
    const tb = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[.74, .6, 0], [.78, .42, 0], [.74, .08, 0], [.6, .03, 0], [.08, .03, 0]].map(([x, y, z]) => new V3(x, y, z + sd * (hw + .045)))), 16, .011, 6); out.push(['frame', tb]);
  }
  for (const x of [.1, .72]) out.push(['frame', new THREE.CylinderGeometry(.01, .01, hw * 2 + .09, 6).rotateX(Math.PI / 2).translate(x, .04, 0)]);
  return out;
}
function lancCabin(K, C, E) {
  const { PR, S, sc, ex, ey, ez, M, sh, xA, xF, zi, yT, zT, fl, wx0 } = E, CC = C.C, yR = fl + 1.69;
  const cove = [[yT, zT], [yT + .04, zT - .08], [yT + .08, zT - .13], [yT + .13, zT - .15], [yT + .16, zT - .155]], arch = [];
  for (let i = 0; i <= 16; i++) { const t = i / 16, a = Math.PI * t; arch.push([lerp(yT + .16, yR, Math.sin(a)), Math.cos(a) * (zT - .155)]); }
  const rc = paintTile(256, 512, (g, W, Hh) => { g.fillStyle = CC.ceil; g.fillRect(0, 0, W, Hh); for (let i = 0; i < 9; i++) { const y = Hh * (.08 + i * .1); const gr = g.createLinearGradient(0, y, 0, y + Hh * .05); gr.addColorStop(0, 'rgba(0,0,0,.08)'); gr.addColorStop(1, 'rgba(255,255,255,.06)'); g.fillStyle = gr; g.fillRect(0, y, W, Hh * .05); } grainOver(g, W, Hh, .1, 'overlay', 1); });
  K.mat('cceil', texC(rc, true)); K.mat('clamp', null, 'clamp');
  for (const sd of [1, -1]) K.add(extrudeX(cove.map(([y, z]) => [y, sd * z]), xA, xF, { su: 0, sv: 1, inward: (x, y, z) => [0, -1, -z] }), CC.wall, { sh: (n) => .78 + .18 * n.y, m: M });
  K.add(extrudeX(arch, xA, xF, { nx: 1, su: .3, sv: 1, inward: () => [0, -1, 0] }), '#ffffff', { mat: 'cceil', keepUV: true, sh: () => .9, m: M });
  for (let x = xA + .6; x < xF; x += 1.4) { K.cyl(M, [x, yR - .02, 0], .06, .03, '#fff6dc', { mat: 'clamp', flat: 1 }); K.cyl(M, [x, yR - .005, 0], .075, .01, '#b8b0a0', { sh }); }
  const curt = paintTile(128, 256, (g, W, Hh) => { g.fillStyle = '#7d8573'; g.fillRect(0, 0, W, Hh); const r = rng(4); for (let i = 0; i < 14; i++) { const x = r() * W, w = 6 + r() * 18, gr = g.createLinearGradient(x - w, 0, x + w, 0); gr.addColorStop(0, 'rgba(0,0,0,0)'); gr.addColorStop(.5, `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},.05)`); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(x - w, 0, w * 2, Hh); } for (let i = 0; i < 30; i++) { g.fillStyle = `rgba(${r() < .5 ? '0,0,0' : '255,255,255'},.025)`; g.fillRect(0, r() * Hh, W, 1); }
    const tg = g.createLinearGradient(0, 0, 0, Hh * .12); tg.addColorStop(0, 'rgba(0,0,0,.28)'); tg.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = tg; g.fillRect(0, 0, W, Hh * .12); g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, Hh * .955, W, Hh * .045); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, Hh * .952, W, 1.5); grainOver(g, W, Hh, .05, 'overlay', 1); });
  K.mat('ccurt', texC(curt));
  const [ww, wh] = C.win, P = C.P;
  for (let xc = wx0; xc < xF - P / 2; xc += P) for (const sd of [1, -1]) {
    const top = PR.at(sc + wh / 2 + .1), rodY = top.y, zr = sd * (top.z - .05);
    K.cyl(M, [xc, rodY, zr], .006, ww + .4, '#8a7a5a', { axis: 'x', sh });
    for (const s of [-1, 1]) { const x0 = xc + s * (ww / 2 + .025), x1 = xc + s * (ww / 2 + .1), nu = 30, nv = 10, hgt = wh + .26, ph = (xc * 7.3 + s) % TAU;
      K.add(gridGeo(nu, nv, (i, j) => { const t = i / nu, v = j / nv, f = Math.cos(t * 2.5 * TAU + v * 1.1 + ph), x = lerp(x0, x1 + s * .014 * v * v, t) - s * .008 * Math.sin(v * Math.PI), y = rodY - v * hgt + (v === 1 ? .005 * f : 0), p = PR.at(Math.max(0, sc + wh / 2 + .1 - v * hgt)); return [x, y, sd * (p.z - .022 - (.004 + .012 * v) * (.5 + .5 * f))]; }, (i, j) => [i / nu, 1 - j / nv], (x, y, z) => [0, 0, -z]), '#ffffff', { mat: 'ccurt', keepUV: true, sh: (n) => .56 + .24 * Math.max(0, -s * n.x * .8 + .35) + .06 * n.y + .07 * (1 - Math.abs(n.z)), m: M }); }
  }
  const blocks = seatBlocks(C, zi, fl), st = C.seat; K.mat('cfab', fabric(st.col, st.pat, { seed: 5 }));
  const ash = (n, p) => { const by = p.y + ey; return (.62 + .3 * Math.max(0, n.x * SL.x + n.y * SL.y + n.z * SL.z) + .06 * n.y) * lerp(.55, 1, sst(fl, fl + .8, by)); }, CH = armchair(C.sw);
  for (let x0 = ex - .22; x0 < xF - 1.6; x0 += C.pitch) for (const zs of blocks) for (const z of zs) for (const [k, g] of CH) K.add(g.clone().translate(x0, fl, z), k === 'frame' ? st.frame : st.col, { mat: k === 'frame' ? 'flat' : 'cfab', uvs: 2.6, sh: ash, m: M });
  for (const zs of blocks) for (const z of zs) for (const [k, g] of CH) K.add(g.clone().rotateY(Math.PI).translate(xF - .06, fl, z), k === 'frame' ? st.frame : st.col, { mat: k === 'frame' ? 'flat' : 'cfab', uvs: 2.6, sh: ash, m: M });
  const zf = PR.at(0).z, sec = [...PR.pts.map(([y, z]) => [z, y]), ...cove.slice(1).map(([y, z]) => [z, y]), ...arch.slice(1, -1).map(([y, z]) => [z, y]), ...cove.slice(1).reverse().map(([y, z]) => [-z, y]), ...PR.pts.slice().reverse().map(([y, z]) => [-z, y])];
  const bk = paintTile(256, 512, (g, W, Hh) => { g.fillStyle = CC.wall; g.fillRect(0, 0, W, Hh); g.fillStyle = '#2a2622'; rr(g, W * .38, Hh * .3, W * .24, Hh * .7, 20); g.fill(); g.fillStyle = '#4a4438'; g.fillRect(W * .43, Hh * .42, W * .14, Hh * .1); for (let i = 0; i < 4; i++) circ(g, W * (.45 + (i % 2) * .1), Hh * (.45 + (i >> 1) * .04), W * .016, '#d8d0b8'); g.strokeStyle = '#8a7a5a'; g.lineWidth = 4; g.strokeRect(W * .37, Hh * .29, W * .26, Hh * .72); grainOver(g, W, Hh, .12, 'overlay', 1); });
  K.mat('cbulk', texC(bk));
  for (const xb of [xA, xF]) { const gg = new THREE.ShapeGeometry(new THREE.Shape(sec.map(([z, y]) => new THREE.Vector2(z, y)))), pp = gg.attributes.position, uv = gg.attributes.uv; for (let i = 0; i < pp.count; i++) { const z = pp.getX(i), y = pp.getY(i); uv.setXY(i, z / (2 * zf + .2) + .5, (y - fl) / (yR - fl)); pp.setXYZ(i, xb, y, z); } gg.computeVertexNormals(); K.add(gg, '#ffffff', { mat: 'cbulk', keepUV: true, sh: () => .85, m: M }); }
  return finishInterior(K, 'lancastrian', { eye: [ex, ey, ez], rcl: -ez, look: C.look || [24, -9], fov: C.fov || 76, aim: C.wyaw, keepProps: true, go: .24, gd: .42, ng: .8, gn: .022, levels: CLV, ctint: [1, .88, .7] });
}

function sheetTex(col, o = {}) {
  const W = o.w || 512, H = o.h || 512, c = cv(W, H), g = c.getContext('2d'), r = rng(o.seed || 3), base = new THREE.Color(col), cs = (k) => '#' + base.clone().multiplyScalar(k).getHexString();
  g.fillStyle = col; g.fillRect(0, 0, W, H); const pw = W / (o.nx || 2), ph = H / (o.ny || 3);
  for (let i = 0; i < (o.nx || 2); i++) for (let j = 0; j < (o.ny || 3); j++) { g.fillStyle = cs(.93 + r() * .14); g.fillRect(i * pw + 1, j * ph + 1, pw - 2, ph - 2); if (o.brush) { g.globalAlpha = typeof o.brush === 'number' ? o.brush : .06; for (let k = 0; k < 40; k++) { g.fillStyle = r() > .5 ? '#fff' : '#000'; g.fillRect(i * pw, j * ph + r() * ph, pw, 1 + r() * 2); } g.globalAlpha = 1; } }
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = 2; for (let i = 0; i <= (o.nx || 2); i++) ln(g, i * pw, 0, i * pw, H, 2, 'rgba(0,0,0,.3)'); for (let j = 0; j <= (o.ny || 3); j++) ln(g, 0, j * ph, W, j * ph, 2, 'rgba(0,0,0,.3)');
  g.setLineDash([.01, o.rp || 9]); g.lineCap = 'round'; g.lineWidth = o.rw || 3.2; g.strokeStyle = o.rc || 'rgba(255,255,255,.45)';
  for (let i = 0; i <= (o.nx || 2); i++) for (const d of [-6, 6]) ln(g, i * pw + d, 0, i * pw + d, H, g.lineWidth, g.strokeStyle);
  for (let j = 0; j <= (o.ny || 3); j++) for (const d of [-6, 6]) ln(g, 0, j * ph + d, W, j * ph + d, g.lineWidth, g.strokeStyle);
  g.strokeStyle = 'rgba(0,0,0,.35)'; g.lineWidth = (o.rw || 3.2) * .6; for (let i = 0; i <= (o.nx || 2); i++) for (const d of [-5, 7]) ln(g, i * pw + d, 1, i * pw + d, H + 1, g.lineWidth, g.strokeStyle); g.setLineDash([]);
  if (o.stain) { g.globalAlpha = .08; for (let k = 0; k < 14; k++) { const x = r() * W, y = r() * H, gr = g.createRadialGradient(x, y, 0, x, y, 30 + r() * 80); gr.addColorStop(0, '#000'); gr.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, W, H); } g.globalAlpha = 1; }
  grainOver(g, W, H, .16, 'overlay', 1); o.after?.(g, W, H); return texC(c, true);
}
function ribs(K, pts, xs, d, w, col, M, sh, o = {}) {
  for (const x of xs) { const rows = []; for (let i = 0; i < pts.length; i++) { const [y, z] = pts[i], [y1, z1] = pts[Math.min(pts.length - 1, i + 1)], [y0, z0] = pts[Math.max(0, i - 1)], ty = y1 - y0, tz = z1 - z0, l = Math.hypot(ty, tz) || 1, ny = tz / l * (o.flip ? -1 : 1), nz = -ty / l * (o.flip ? -1 : 1); rows.push([[x, y, z], [x, y + ny * d, z + nz * d], [x - w, y + ny * d, z + nz * d]]); }
    K.add(gridGeo(2, rows.length - 1, (i, j) => rows[j][i], (i, j) => [i * .05, j * .1]), col, { sh, m: M, mat: o.mat }); }
}
function seamStrip(K, PR, x, side, w, col, M, sh, d = -.012) { const n = PR.pts.length - 1, pts = PR.pts.map((_, j) => { const p = PR.at(j / n * PR.S); return [p.y + p.ny * d, side * (p.z + p.nz * d)]; }); K.add(extrudeX(pts, x - w, x + w, { inward: (x, y, z) => [0, 0, -z] }), col, { sh, m: M }); }
function crownStrip(K, PR, x0, x1, col, M, sh, k = 5) { const t = PR.pts.slice(-k), yc = t[0][0] - .3, out = ([y, z]) => { const l = Math.hypot(y - yc, z) || 1; return [y + (y - yc) / l * .012, z + z / l * .012]; }; K.add(extrudeX([...t.map(([y, z]) => [y, -z]), ...t.slice(0, -1).reverse()].map(out), x0, x1, { inward: () => [0, -1, 0] }), col, { sh, m: M }); }
function secCap(K, PR, x, col, M, sh, o = {}) {
  const g = o.grow ?? .03, n = PR.pts.length - 1, R = PR.pts.map((_, j) => { const p = PR.at(j / n * PR.S); return [p.z - p.nz * g, p.y - p.ny * g]; }), out = [...R, ...R.slice(0, -1).reverse().map(([z, y]) => [-z, y])];
  const s = new THREE.Shape(out.map(([z, y]) => new THREE.Vector2(z, y))); if (o.hole) s.holes.push(new THREE.Path(o.hole.map(([z, y]) => new THREE.Vector2(z, y))));
  const geo = new THREE.ShapeGeometry(s), q = geo.attributes.position; for (let i = 0; i < q.count; i++) q.setXYZ(i, x, q.getY(i), q.getX(i)); geo.computeVertexNormals(); K.add(geo, col, { sh, m: M });
}
const VLV = { cab: [.82, .045, .012, .5], rev: [.9, .045, .012, .55], clamp: [1, .7, .02, .3], glass: [1, .3, .3] };

function electraNav() {
  const K = makeKit(), fl = -.5, E = [-.85, fl + 1.07, .06], M = new THREE.Matrix4().makeTranslation(-E[0], -E[1], -E[2]), xA = -2.3, xF = 3.5;
  const pts = [[fl, .56], [fl + .3, .63], [fl + .7, .68], [fl + 1.0, .64], [fl + 1.22, .5], [fl + 1.33, .32], [fl + 1.395, .17], [fl + 1.415, .07], [fl + 1.42, .0]], PR = prof(pts, 30), S = PR.S;
  const sh = (n, p) => { const by = p.y + E[1]; return (.78 + .2 * n.y + .06 * Math.abs(n.z)) * lerp(.6, 1, sst(fl, fl + .9, by)); };
  const al = sheetTex('#a9adb0', { nx: 2, ny: 2, brush: .02, stain: true, rp: 7, rw: 2.6 }); K.mat('ealu', al); K.mat('erev', al, 'rev'); K.mat('cglass', scratchTex(), 'glass', { opacity: .12, depthWrite: false });
  const sc = (() => { let best = 9, s0 = 0; for (let i = 0; i <= 100; i++) { const s = i / 100 * S, d = Math.abs(PR.at(s).y - (fl + .95)); if (d < best) { best = d; s0 = s; } } return s0; })();
  const uvm = (x, s) => [x * 1.4, s * 1.4];
  const W1 = { a: .25, b: .165, wn: 4.5, fw: .08, xc: -.38 }, { map3: m3 } = holeBay(K, { PR, S, sc, P: .8, ...W1, fd: .07, side: 1, N: 32, M, sh, wall: 'ealu', rev: 'erev', uv: uvm, shRev: () => .9 });
  { const ring = (d, off) => { const q = []; for (let i = 0; i <= 64; i++) { const t = i / 64 * TAU, c = Math.cos(t), sn = Math.sin(t), r = 1 / Math.pow(Math.pow(Math.abs(c / W1.a), W1.wn) + Math.pow(Math.abs(sn / W1.b), W1.wn), 1 / W1.wn) + d; q.push(m3(W1.xc + c * r, sc + sn * r, off)); } return q; };
    K.tube(ring(W1.fw + .006, .004), .012, '#7d8287', { n: 96, rs: 5, closed: true, sh, m: M }); const rv = ring(W1.fw + .03, .002); for (let i = 0; i < 64; i += 1) K.sph(M, rv[i], .004, '#8e9296', { sh, seg: 5 }); }
  holeBay(K, { PR, S, sc: sc + .05, P: .5, a: .13, b: .22, wn: 3, fd: .05, fw: .04, xc: -1.25, side: -1, N: 18, M, sh, wall: 'ealu', rev: 'erev', uv: uvm, shRev: () => .9 });
  for (const [side, segs] of [[1, [[xA, -.78], [.02, xF]]], [-1, [[xA, -1.5], [-1.0, xF]]]]) for (const [x0, x1] of segs) K.add(extrudeX(PR.pts.map(([y, z]) => [y, side * z]), x0, x1, { nx: 4, su: 1.4, sv: 1.4, inward: (x, y, z) => [0, 0, -z] }), '#ffffff', { mat: 'ealu', keepUV: true, sh, m: M });
  for (const [x, side] of [[-.78, 1], [.02, 1], [-1.5, -1], [-1.0, -1]]) seamStrip(K, PR, x, side, .04, '#9a9ea2', M, sh); crownStrip(K, PR, xA, xF, '#9a9ea2', M, sh);
  const fpl = paintTile(256, 512, (g, W, H) => { g.fillStyle = '#5a4026'; g.fillRect(0, 0, W, H); const r = rng(2); for (let i = 0; i < 8; i++) { g.fillStyle = `rgba(${r() > .5 ? '255,220,170' : '0,0,0'},${.04 + r() * .06})`; g.fillRect(i * W / 8, 0, W / 8 - 2, H); } g.fillStyle = '#9a9ea2'; g.fillRect(W * .2, 0, 6, H); g.fillRect(W * .8 - 6, 0, 6, H); grainOver(g, W, H, .3, 'overlay', 2); });
  K.mat('efl', texC(fpl, true)); K.add(gridGeo(6, 2, (i, j) => [lerp(xA, xF, i / 6), fl, lerp(-.68, .68, j / 2)], (i, j) => [lerp(xA, xF, i / 6) * .6, j / 2]), '#ffffff', { mat: 'efl', keepUV: true, sh: () => .7, m: M });
  ribs(K, [...PR.pts, ...PR.pts.slice().reverse().map(([y, z]) => [y, -z])], [-2.0, -1.62, -.9, -.12, .3, .65, 1.0, 1.35, 1.7, 2.05, 2.4], .045, .025, '#b4b8bb', M, sh);
  const tk = sheetTex('#9fa3a5', { nx: 1, ny: 1, rp: 6, rw: 3, after: (g, W, H) => { for (const x of [.2, .5, .8]) { g.fillStyle = '#1a1a1a'; g.fillRect(W * x - 7, 0, 14, H); } for (const [x, y] of [[.35, .3], [.65, .3], [.35, .68], [.65, .68]]) { const gr = g.createRadialGradient(W * x - 6, H * y - 6, 2, W * x, H * y, W * .07); gr.addColorStop(0, '#d4d8da'); gr.addColorStop(.6, '#8a8e90'); gr.addColorStop(1, '#6a6e70'); circ(g, W * x, H * y, W * .065, gr, '#555', 2); circ(g, W * x, H * y, W * .03, null, 'rgba(0,0,0,.4)', 2); } const pg = g.createRadialGradient(W * .5, H * .45, W * .05, W * .5, H * .5, W * .75); pg.addColorStop(0, 'rgba(255,255,255,.14)'); pg.addColorStop(.6, 'rgba(0,0,0,0)'); pg.addColorStop(1, 'rgba(0,0,0,.28)'); g.fillStyle = pg; g.fillRect(0, 0, W, H); const lg = g.createLinearGradient(0, 0, W, 0); lg.addColorStop(0, 'rgba(0,0,0,.3)'); lg.addColorStop(.15, 'rgba(255,255,255,.08)'); lg.addColorStop(.85, 'rgba(255,255,255,.04)'); lg.addColorStop(1, 'rgba(0,0,0,.3)'); g.fillStyle = lg; g.fillRect(0, 0, W, H); } });
  K.mat('etank', tk);
  const tank = (x0, x1, z0, z1, y1) => { const g = roundBox(x1 - x0, y1 - fl, z1 - z0, .05, 2), uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / Math.max(x1 - x0, z1 - z0) + .5, p.getY(i) / (y1 - fl) + .5); g.translate((x0 + x1) / 2, (fl + y1) / 2, (z0 + z1) / 2); K.add(g, '#ffffff', { mat: 'etank', keepUV: true, sh, m: M }); K.cyl(M, [(x0 + x1) / 2, y1 + .04, (z0 + z1) / 2 + (z1 - z0) * .25], .04, .08, '#8a8e90', { sh }); K.cyl(M, [(x0 + x1) / 2, y1 + .02, (z0 + z1) / 2 - (z1 - z0) * .25], .025, .05, '#6a6e70', { sh }); };
  tank(2.6, 3.45, -.6, -.19, fl + 1.32); tank(2.6, 3.45, .19, .6, fl + 1.32);
  for (const [x0, x1] of [[1.8, 2.28], [1.25, 1.73], [.7, 1.18]]) tank(x0, x1, -.56, .56, fl + .92);
  tank(.1, .6, -.56, -.02, fl + .9);
  K.box(M, [1.5, fl + .95, 0], [1.6, .025, .8], '#7a6a4c', { sh }); K.box(M, [2.59, fl + .2, 0], [.08, .4, 1.1], '#8e9296', { sh }); for (const z of [-.35, 0, .35]) K.cyl(M, [2.59, fl + .2, z], .1, .1, '#2a2c2e', { axis: 'x', sh, seg: 12 });
  for (const z of [-.5, .5]) K.tube([[2.4, fl + 1.0, z], [1.6, fl + 1.0, z * .96], [.6, fl + .98, z * .96]], .018, '#b8bcbf', { n: 8, rs: 8, sh, m: M });
  K.tube([[-.4, fl + 1.36, -.42], [1.4, fl + 1.38, -.38], [2.4, fl + 1.38, -.34]], .012, '#c8b278', { n: 6, rs: 6, sh, m: M }); K.box(M, [-.42, fl + 1.33, -.42], [.03, .05, .02], '#888', { sh });
  for (const z of [-.6, .6]) K.tube([[xA + .2, fl + .1, z * .97], [xF - .2, fl + .1, z * .97]], .035, '#9a9ea0', { n: 4, rs: 10, sh, m: M });
  const tb = paintTile(512, 512, (g, W, H) => { g.fillStyle = '#9a7a52'; g.fillRect(0, 0, W, H); const r = rng(6); for (let i = 0; i < 60; i++) { g.strokeStyle = `rgba(${r() > .5 ? '70,45,20' : '220,190,150'},.1)`; g.lineWidth = 1 + r() * 3; g.beginPath(); const y = r() * H; g.moveTo(0, y); g.bezierCurveTo(W * .3, y + (r() - .5) * 30, W * .7, y + (r() - .5) * 30, W, y + (r() - .5) * 20); g.stroke(); } g.fillStyle = '#f0ece0'; g.save(); g.translate(W * .45, H * .5); g.rotate(-.12); g.fillRect(-W * .25, -H * .18, W * .5, H * .36); g.strokeStyle = 'rgba(40,60,120,.5)'; g.lineWidth = 2; for (let i = 0; i < 9; i++) ln(g, -W * .23, -H * .15 + i * H * .035, W * .23, -H * .15 + i * H * .035, 1, 'rgba(60,80,140,.35)'); ln(g, -W * .2, H * .1, W * .2, -H * .12, 3, 'rgba(200,40,30,.6)'); g.restore(); grainOver(g, W, H, .25, 'overlay', 1); });
  K.mat('etable', texC(tb)); const tg = new THREE.BoxGeometry(1.0, .025, .44); tg.translate(-.1, fl + .76, .38); K.add(tg, '#ffffff', { mat: 'etable', sh, keepUV: true, m: M }); K.box(M, [-.1, fl + .7, .17], [1.0, .1, .015], '#5a4a34', { sh }); K.box(M, [-.5, fl + .38, .2], [.035, .74, .035], '#5a5e60', { sh }); K.box(M, [.3, fl + .38, .2], [.035, .74, .035], '#5a5e60', { sh });
  for (let i = 0; i < 3; i++) { K.cyl(M, [.28 - i * .08, fl + .79, .54], .028, .025, '#2a2c2e', { sh, seg: 14 }); K.cyl(M, [.28 - i * .08, fl + .803, .54], .022, .003, '#d8d4c4', { sh, seg: 14 }); }
  K.box(M, [.45, fl + .25, .28], [.32, .5, .4], '#2c2e2a', { sh }); K.box(M, [.45, fl + .52, .28], [.33, .04, .41], '#3a3c38', { sh });
  K.cyl(M, [-.3, fl + .86, .5], .012, .2, '#2a2a2a', { sh }); K.cyl(M, [-.3, fl + .97, .5], .035, .03, '#3a3a3a', { sh }); K.box(M, [-.3, fl + 1.0, .5], [.015, .015, .1], '#111', { sh }); K.cyl(M, [-.3, fl + .955, .5], .042, .006, '#c8c4b4', { sh });
  const ib = frame(.12 - E[0], fl + 1.05 - E[1], .6 - E[2], -90); K.box(ib, [0, 0, -.015], [.12, .3, .03], '#2c2e30', {}); for (let i = 0; i < 3; i++) K.gauge(ib, 0, .09 - i * .09, .07, [gAltV({}), gAsiV({ min: 50, max: 300, labs: [100, 200, 300], z: 210, sw: 300 }), gClock()][i], { screws: false, bez: '#1a1a1a' });
  K.box(M, [3.47, fl + .72, -.42], [.04, 1.44, .36], '#a4a8ab', { sh }); K.box(M, [3.47, fl + .72, .42], [.04, 1.44, .36], '#a4a8ab', { sh }); K.box(M, [3.47, fl + 1.3, 0], [.04, .3, .5], '#a4a8ab', { sh });
  const ck = paintTile(256, 512, (g, W, H) => { const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#d8b878'); gr.addColorStop(.35, '#a87a3a'); gr.addColorStop(.45, '#2a2a2c'); gr.addColorStop(1, '#141416'); g.fillStyle = gr; g.fillRect(0, 0, W, H); for (const x of [.08, .92]) { g.fillStyle = '#6a6c6e'; g.fillRect(W * x - 10, 0, 20, H); } for (let i = 0; i < 12; i++) circ(g, W * (.2 + (i % 4) * .2), H * (.52 + (i / 4 | 0) * .09), W * .06, '#060606', '#6a6a6a', 3); g.fillStyle = '#3a3a3c'; g.fillRect(W * .3, H * .82, W * .4, H * .18); grainOver(g, W, H, .15, 'overlay', 1); });
  K.mat('eck', texC(ck), 'clamp'); K.add(new THREE.PlaneGeometry(.52, 1.2).rotateY(-Math.PI / 2).translate(3.53, fl + .6, 0), '#ffffff', { mat: 'eck', flat: 1, keepUV: true, m: M }); secCap(K, PR, 3.488, '#a4a8ab', M, sh, { hole: [[-.25, fl + .02], [.25, fl + .02], [.25, fl + 1.16], [-.25, fl + 1.16]] });
  K.box(M, [xA, fl + .7, 0], [.03, 1.42, 1.3], '#8a8e92', { sh }); secCap(K, PR, xA - .02, '#8a8e92', M, sh); K.box(M, [-2.0, fl + .25, .3], [.3, .45, .3], '#7a7e80', { sh });
  const seat = new THREE.LatheGeometry([[.0, 0], [.2, .02], [.23, .12], [.24, .45]].map(([a, b]) => new THREE.Vector2(a, b)), 16, Math.PI * .6, Math.PI * 1.1); seat.scale(1, 1, 1.15); seat.rotateY(-Math.PI / 2); seat.translate(-1.0, fl + .42, .2); K.add(seat, '#6e5a3a', { sh, m: M }); K.cyl(M, [-1.02, fl + .2, .2], .025, .42, '#3a3a3a', { sh });
  for (let i = 0; i < 5; i++) { const x = .85 + i * .34, p = PR.at(S * .55); K.box(M, [x, p.y, -p.z + .006], [.12, .12, .006], '#9ea2a5', { sh, rot: [0, 0, 0] }); }
  return finishInterior(K, 'electra', { eye: E, rcl: -E[2], look: [22, -12], fov: 74, go: .12, ng: .3, levels: { ...VLV, cab: [.6, .045, .012, .4] }, ctint: [1, .82, .62] });
}

function b24Waist() {
  const K = makeKit(), fl = -.9, E = [-4.5, fl + 1.52, .25], M = new THREE.Matrix4().makeTranslation(-E[0], -E[1], -E[2]), xA = -2.4, xB = -6.6;
  const pts = [[fl, .78], [fl + .5, .86], [fl + 1.1, .88], [fl + 1.7, .84], [fl + 2.05, .66], [fl + 2.22, .36], [fl + 2.27, 0]], PR = prof(pts, 32), S = PR.S;
  const sh = (n, p) => { const by = p.y + E[1]; return (.8 + .18 * n.y + .05 * Math.abs(n.z)) * lerp(.62, 1, sst(fl, fl + 1.2, by)); };
  const zc = sheetTex('#a3a26e', { nx: 2, ny: 2, rp: 8, rw: 3, rc: 'rgba(255,255,230,.3)', stain: true, brush: .035 }); K.mat('bzc', zc); K.mat('brev', zc, 'rev');
  const sc = (() => { let best = 9, s0 = 0; for (let i = 0; i <= 100; i++) { const s = i / 100 * S, d = Math.abs(PR.at(s).y - (fl + 1.42)); if (d < best) { best = d; s0 = s; } } return s0; })();
  const uvm = (x, s) => [x * 1.2, s * 1.2], ox = -3.72;
  for (const side of [-1, 1]) holeBay(K, { PR, S, sc, P: 1.5, a: .58, b: .43, wn: 5, fd: .05, fw: .05, xc: ox + (side > 0 ? .25 : 0), side, N: 28, M, sh, wall: 'bzc', rev: 'brev', uv: uvm, shRev: () => .95, glass: 'none' });
  K.lists.delete('none');
  for (const side of [-1, 1]) { const o0 = ox + (side > 0 ? .25 : 0); for (const [x0, x1] of [[xB, o0 - .75], [o0 + .75, xA]]) K.add(extrudeX(PR.pts.map(([y, z]) => [y, side * z]), x0, x1, { nx: 4, su: 1.2, sv: 1.2, inward: (x, y, z) => [0, 0, -z] }), '#ffffff', { mat: 'bzc', keepUV: true, sh, m: M }); }
  for (const side of [-1, 1]) for (const e of [-.75, .75]) seamStrip(K, PR, ox + (side > 0 ? .25 : 0) + e, side, .05, '#97966a', M, sh); crownStrip(K, PR, xB, xA, '#97966a', M, sh);
  ribs(K, [...PR.pts, ...PR.pts.slice().reverse().map(([y, z]) => [y, -z])], [-2.55, -4.42, -4.8, -5.18, -5.56, -5.94, -6.32], .06, .04, '#a19f6c', M, sh);
  const slat = paintTile(256, 256, (g, W, H) => { g.fillStyle = '#6a5034'; g.fillRect(0, 0, W, H); for (let i = 0; i < 10; i++) { g.fillStyle = i % 2 ? '#7a5c3c' : '#5e4630'; g.fillRect(0, i * H / 10, W, H / 10 - 3); } g.fillStyle = '#242424'; g.fillRect(W * .3, 0, W * .4, H); grainOver(g, W, H, .3, 'overlay', 2); });
  K.mat('bfl', texC(slat, true)); K.add(gridGeo(6, 2, (i, j) => [lerp(xB, xA, i / 6), fl, lerp(-.9, .9, j / 2)], (i, j) => [lerp(xB, xA, i / 6) * .5, j / 2]), '#ffffff', { mat: 'bfl', keepUV: true, sh: () => .75, m: M });
  for (const side of [-1, 1]) {
    const o0 = ox + (side > 0 ? .25 : 0), zs = side * .84, gx = o0 + .05, gy = fl + 1.16, gz = side * .58, yaw = side * 115;
    K.box(M, [o0, fl + .82, side * .8], [1.04, .5, .03], '#6a4a2c', { sh }); for (let i = 0; i < 7; i++) K.box(M, [o0 - .45 + i * .15, fl + 1.0, side * .82], [.02, .03, .1], '#8e8c62', { sh });
    K.tube([[gx - .05, fl, gz - side * .02], [gx, fl + .6, gz], [gx, gy - .1, gz]], .022, '#7a7440', { n: 8, rs: 8, sh, m: M }); K.tube([[gx - .35, fl, gz - side * .2], [gx, fl + .55, gz]], .015, '#7a7440', { n: 6, rs: 6, sh, m: M });
    const gm = new THREE.Matrix4().makeTranslation(gx, gy, gz).multiply(new THREE.Matrix4().makeRotationY(-yaw * D2R)).multiply(new THREE.Matrix4().makeRotationZ(-6 * D2R)), G = (g, col, o = {}) => K.add(g.applyMatrix4(gm), col, { sh, m: M, ...o });
    const gun = '#2c2924', gl = '#3c3832', B = (w, h, d, x, y, z, col = gun, o) => G(new THREE.BoxGeometry(w, h, d).translate(x, y, z), col, o), C = (r, l, x, y, z, col = gun, ax = 'x', r2 = r) => { const g = new THREE.CylinderGeometry(r2, r, l, 12); if (ax === 'x') g.rotateZ(-Math.PI / 2); if (ax === 'z') g.rotateX(Math.PI / 2); G(g.translate(x, y, z), col); };
    B(.5, .12, .1, -.13, .04, 0); B(.36, .03, .104, -.1, .115, 0, gl); B(.03, .14, .12, -.385, .04, 0); C(.009, .1, -.03, .135, 0, gl, 'z'); B(.012, .045, .012, -.3, .15, 0, '#1a1814'); B(.06, .016, .02, -.06, .06, -side * .068, gl); C(.04, .05, .14, .04, 0, gl);
    for (const s2 of [-1, 1]) G(new THREE.CylinderGeometry(.015, .013, .12, 8).rotateZ(.6).translate(-.43, -.01, s2 * .045), '#3a2618'); B(.03, .03, .05, -.41, .02, 0, '#1a1814');
    B(.32, .03, .13, -.05, -.04, 0, '#7a7440'); B(.08, .18, .05, .02, -.13, 0, '#7a7440'); C(.025, .07, .02, -.06, 0, '#6a6438', 'z');
    const bar = paintTile(512, 112, (g, W, H) => { g.fillStyle = '#4a3a28'; g.fillRect(0, 0, W, H); const sh2 = g.createLinearGradient(0, 0, 0, H); for (const [t, a] of [[0, .25], [.5, 0], [1, .25]]) sh2.addColorStop(t, `rgba(0,0,0,${a})`); for (let i = 0; i < 36; i++) for (let j = 0; j < 6; j++) { const x = (i + .5 + (j % 2) * .5) * W / 36, y = (j + .5) * H / 6; circ(g, x, y + 1, W / 36 * .3, 'rgba(255,230,190,.18)'); circ(g, x, y, W / 36 * .28, '#0c0906'); } g.fillStyle = sh2; g.fillRect(0, 0, W, H); grainOver(g, W, H, .15, 'overlay', 1); });
    if (!K.matFor.has('bbar')) K.mat('bbar', texC(bar)); const bj = new THREE.CylinderGeometry(.032, .032, .95, 18, 1, true), bu = bj.attributes.uv; for (let i = 0; i < bu.count; i++) bu.setXY(i, bu.getY(i), bu.getX(i)); bj.rotateZ(-Math.PI / 2); bj.translate(.62, .04, 0); G(bj, '#ffffff', { mat: 'bbar', keepUV: true });
    C(.012, 1.3, .5, .04, 0, '#1a1612'); C(.03, .08, 1.12, .04, 0, '#1a1612', 'x', .022); C(.036, .03, 1.08, .04, 0, gl); B(.008, .05, .008, 1.08, .085, 0, '#1a1814');
    const fp = new V3(-.1, .1, -side * .07).applyMatrix4(gm), top = [fp.x - .04, fl + 2.0, fp.z - side * .1], cp = [0, .2, .45, .7, 1].map((t) => [lerp(fp.x, top[0], t) + Math.sin(t * Math.PI * 2) * .05, lerp(fp.y, top[1], t), lerp(fp.z, top[2], t)]);
    const ch = paintTile(64, 512, (g, W, H) => { g.fillStyle = '#4a4c4e'; g.fillRect(0, 0, W, H); for (let i = 0; i < 40; i++) { const y = i * H / 40; const gr = g.createLinearGradient(0, y, 0, y + H / 40); gr.addColorStop(0, '#d8dadc'); gr.addColorStop(.5, '#8a8c8e'); gr.addColorStop(1, '#3a3c3e'); g.fillStyle = gr; g.fillRect(W * .14, y + 1, W * .72, H / 40 - 3); g.fillStyle = '#b08a3a'; g.fillRect(W * .42, y + 2, W * .16, H / 40 - 5); } g.fillStyle = '#9a9c9e'; g.fillRect(0, 0, W * .1, H); g.fillRect(W * .9, 0, W * .1, H); });
    if (!K.matFor.has('bchute')) K.mat('bchute', texC(ch)); const cv3 = new THREE.CatmullRomCurve3(cp.map((q) => new V3(...q))), cs = cv3.getPoints(16), cw = .06;
    K.add(gridGeo(1, 16, (i, j) => { const q = cs[j]; return [q.x + (i ? cw : -cw), q.y, q.z]; }, (i, j) => [i, j / 16]), '#ffffff', { mat: 'bchute', flat: .95, keepUV: true, m: M });
    for (const d of [-cw, cw]) K.tube(cs.map((q) => [q.x + d, q.y, q.z - side * .01]), .007, '#8a8c8e', { n: 16, rs: 5, sh, m: M });
    K.box(M, [top[0], fl + 2.08, top[2]], [.22, .18, .2], '#4a4a3c', { sh });
    K.cyl(M, [o0 - .7, fl + .3, side * .7], .085, .5, '#e0a822', { sh, seg: 16 }); K.sph(M, [o0 - .7, fl + .55, side * .7], .085, '#e0a822', { sh, sc: [1, .5, 1] }); K.cyl(M, [o0 - .7, fl + .6, side * .7], .02, .06, '#333', { sh });
    if (!K.matFor.has('bhatch')) K.mat('bhatch', sheetTex('#b4b8b6', { w: 512, h: 384, nx: 2, ny: 1, rp: 7, rw: 3, brush: .04, stain: true, after: (g, W, H) => { g.strokeStyle = 'rgba(0,0,0,.4)'; g.lineWidth = 22; g.strokeRect(11, 11, W - 22, H - 22); g.strokeStyle = 'rgba(255,255,255,.3)'; g.lineWidth = 2; g.strokeRect(23, 23, W - 46, H - 46); for (const [x0, y0, x1, y1] of [[34, 34, W - 34, 34], [34, H - 34, W - 34, H - 34], [34, 34, 34, H - 34], [W - 34, 34, W - 34, H - 34], [W / 2, 34, W / 2, H - 34]]) { const n = Math.round(Math.hypot(x1 - x0, y1 - y0) / 18); for (let i = 0; i <= n; i++) { const x = lerp(x0, x1, i / n), y = lerp(y0, y1, i / n); circ(g, x + 1, y + 1, 3.6, 'rgba(0,0,0,.45)'); circ(g, x, y, 3, '#c8ccca'); circ(g, x - .8, y - .8, 1.3, '#f4f6f4'); } } } }));
    const hd = roundBox(.92, .66, .025, .02, 2), hu = hd.attributes.uv, hp = hd.attributes.position; for (let i = 0; i < hu.count; i++) hu.setXY(i, hp.getX(i) / .92 + .5, hp.getY(i) / .66 + .5);
    hd.rotateX(-Math.PI / 2); hd.applyMatrix4(new THREE.Matrix4().makeRotationX(side * -.42)); hd.translate(o0, fl + 2.1, side * .5); K.add(hd, '#ffffff', { mat: 'bhatch', keepUV: true, sh: () => .84, m: M });
    for (const dx of [-.24, .24]) K.box(M, [o0 + dx, fl + 2.083, side * .5], [.035, .016, .6], '#8e9290', { sh, rot: [side * -24, 0, 0] }); K.box(M, [o0 + .02, fl + 2.08, side * .5], [.2, .014, .05], '#3a3c3a', { sh, rot: [side * -24, 0, 0] });
  }
  secCap(K, PR, xA + .005, '#959468', M, () => .8);
  const aft = paintTile(256, 256, (g, W, H) => { g.fillStyle = '#9d9c6c'; g.fillRect(0, 0, W, H); g.fillStyle = '#2a2a24'; g.fillRect(W * .35, H * .5, W * .3, H * .5); for (const [x, y] of [[.3, .2], [.5, .15], [.7, .22], [.42, .32], [.6, .34]]) circ(g, W * x, H * y, W * .08, '#d8962a', '#7a5a1a', 2); g.fillStyle = '#e8e4d8'; g.fillRect(W * .38, H * .45, W * .24, H * .05); T(g, 'CAUTION DEEP STEP', W * .5, H * .475, H * .028, '#222', 'center', 800); grainOver(g, W, H, .2, 'overlay', 1); });
  K.mat('baft', texC(aft)); K.add(new THREE.PlaneGeometry(1.56, 2.3).rotateY(Math.PI / 2).translate(xB, fl + 1.1, 0), '#ffffff', { mat: 'baft', flat: .85, keepUV: true, m: M }); secCap(K, PR, xB - .01, '#8e8d62', M, () => .8);
  for (const [y, z] of [[fl + 1.75, -.35], [fl + 1.8, 0], [fl + 1.72, .35], [fl + 1.45, -.2], [fl + 1.5, .2]]) K.sph(M, [xB + .25, y, z], .13, '#d8962a', { sh, seg: 14 }); K.box(M, [xB + .35, fl + .2, 0], [.5, .4, 1.2], '#959468', { sh }); K.box(M, [xB + .6, fl + .41, 0], [.02, .02, 1.2], '#2a2a24', { sh });
  const lp = [-4.05, fl + 1.93, -.62]; K.cyl(M, [lp[0], lp[1] + .045, lp[2] - .03], .045, .05, '#3a3a30', { sh, rot: [-30, 0, 0] }); K.cyl(M, [lp[0], lp[1] + .015, lp[2] + .005], .032, .012, '#ff6a50', { mat: 'clamp', flat: 1, rot: [-30, 0, 0] });
  const ext = extClone(K, E, { parts: ['fin'], hull: { part: 'aft', match: 'mid', keep: (v) => v.x < -4.42 } });
  return finishInterior(K, 'b24', { eye: E, rcl: -E[2], look: [-55, -8], fov: 70, tick: ext, levels: { cab: [.82, 1, .5, .5], rev: [.9, 1, .5, .55], clamp: [.9, .4, .02, .3], glass: [1, .3, .3] }, ctint: [1, 1, 1], lamp: { p: lp.map((v, i) => v - E[i]), c: [.1, .025, .016], a: [.005, .006, .009], r: .5 } });
}

let SCR = null;
function scratchTex() { if (SCR) return SCR; const c = cv(256, 256), g = c.getContext('2d'), r = rng(11); g.fillStyle = '#b8bcb4'; g.fillRect(0, 0, 256, 256); g.globalAlpha = .22; g.strokeStyle = '#fff'; for (let i = 0; i < 26; i++) { g.lineWidth = .5 + r() * .6; g.beginPath(); const x = r() * 256, y = r() * 256; g.arc(x, y, 30 + r() * 140, r() * 6, r() * 6 + .3 + r() * .5); g.stroke(); } SCR = ctex(c); SCR.wrapS = SCR.wrapT = THREE.RepeatWrapping; return SCR; }
function extClone(K, E, o) {
  let src = null, pairs = [];
  const sync = (a, b) => a.children.forEach((x, i) => { const y = b.children[i]; if (y) { pairs.push([x, y]); sync(x, y); } });
  const part = (ac, n) => ac.children.find((c) => c.name === n) || ac.getObjectByName(n);
  const build = (ac) => {
    const old = K.group.getObjectByName('ext'); if (old) K.group.remove(old);
    const root = new THREE.Group(); root.name = 'ext'; root.position.set(-E[0], -E[1], -E[2]); pairs = [];
    for (const n of o.parts) { const p = part(ac, n); if (!p) continue; const c = p.clone(); sync(p, c); c.visible = true; c.position.set(0, 0, 0); c.quaternion.identity(); c.scale.set(1, 1, 1); root.add(c); }
    const h = o.hull, mid = h && part(ac, h.part), mats = new Set(); for (const n of [h?.match || o.parts].flat()) part(ac, n)?.traverse((m) => m.isMesh && mats.add(m.material));
    let best = null; mid?.traverse((m) => { if (m.isMesh && mats.has(m.material) && (!best || m.geometry.attributes.position.count > best.geometry.attributes.position.count)) best = m; });
    if (best) {
      const g = best.geometry, Pp = g.attributes.position, I = g.index, n = I ? I.count : Pp.count, s0 = g.drawRange.start, s1 = Math.min(n, s0 + g.drawRange.count), idx = [], v = new V3(); best.updateMatrix();
      for (let t = s0; t + 2 < s1; t += 3) { let ok = true; for (let k = 0; k < 3 && ok; k++) ok = h.keep(v.fromBufferAttribute(Pp, I ? I.getX(t + k) : t + k).applyMatrix4(best.matrix)); if (ok) for (let k = 0; k < 3; k++) idx.push(I ? I.getX(t + k) : t + k); }
      const sg = new THREE.BufferGeometry(); for (const k in g.attributes) sg.setAttribute(k, g.attributes[k]); sg.setIndex(idx); sg.boundingSphere = g.boundingSphere;
      const hm = new THREE.Mesh(sg, best.material); hm.matrixAutoUpdate = false; hm.matrix.copy(best.matrix); hm.renderOrder = best.renderOrder; hm.frustumCulled = false; root.add(hm);
    }
    root.traverse((m) => { if (m.isMesh && m.material.opacity >= 1) m.renderOrder = 105; }); K.group.add(root);
  };
  return () => { const ac = K.group.parent; if (!ac) return; if (ac !== src) { src = ac; build(ac); } for (const [a, b] of pairs) { b.position.copy(a.position); b.quaternion.copy(a.quaternion); b.scale.copy(a.scale); b.visible = a.visible; } };
}

let GLW = null;
function glwTex() { if (GLW) return GLW; const S = 64, c = cv(S, S), g = c.getContext('2d'), gr = g.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2); for (const [o, a] of [[0, 1], [.06, .85], [.16, .32], [.4, .07], [1, 0]]) gr.addColorStop(o, `rgba(255,255,255,${a})`); g.fillStyle = gr; g.fillRect(0, 0, S, S); return (GLW = new THREE.CanvasTexture(c)); }
function wingGlow(K, E, key) {
  let src = null, G = null; const sp = SPECS[key] || {}, two = !!sp.strobe2, rf = (sp.dia || 5) / 2;
  const free = () => { if (!G) return; K.group.remove(G.root); G.root.traverse((x) => { if (x.geometry) x.geometry.dispose(); if (x.material) x.material.dispose(); }); G = null; };
  const build = (ac) => {
    free(); let nav = null, stb = null; ac.updateMatrixWorld(true); const inv = new THREE.Matrix4().copy(ac.matrixWorld).invert(), at = (x) => x.getWorldPosition(new V3()).applyMatrix4(inv);
    ac.traverse((x) => { const u = x.userData; if (!x.isSprite || !u) return; if (u.kind === 'nav' && u.sec > 0) nav = x; if (u.kind === 'strobe' && at(x).z > rf) stb = x; });
    const wings = ac.getObjectByName('wings'); if (!nav || !wings) return;
    const Ln = at(nav), Ls = stb ? at(stb) : null, Ev = new V3(...E), P = [], Cs = [], Cf = [], v = new V3(), d = new V3(), mw = new THREE.Matrix4(), nm = new THREE.Matrix3(), tri = [0, 1, 2].map(() => [new V3(), new V3()]);
    wings.traverse((m) => {
      if (!m.isMesh || !m.visible || m.material.opacity < 1 || m.isInstancedMesh) return; mw.multiplyMatrices(inv, m.matrixWorld); nm.getNormalMatrix(mw);
      const g = m.geometry, pa = g.attributes.position, na = g.attributes.normal, I = g.index, cnt = I ? I.count : pa.count, s0 = g.drawRange.start, s1 = Math.min(cnt, s0 + g.drawRange.count); if (!na) return;
      for (let t = s0; t + 2 < s1; t += 3) {
        let out = 0, dn = 0; for (let k = 0; k < 3; k++) { const i = I ? I.getX(t + k) : t + k; tri[k][0].fromBufferAttribute(pa, i).applyMatrix4(mw); tri[k][1].fromBufferAttribute(na, i).applyMatrix3(nm).normalize(); out += tri[k][0].z > rf * .9 ? 1 : 0; dn += tri[k][1].y < -.35 ? 1 : 0; }
        if (!out || dn === 3) continue;
        for (const [p, n] of tri) {
          d.subVectors(Ln, p); const dn = d.length() || 1, fn = 1 / (1 + (dn / 2.4) ** 2) * (.3 + .7 * Math.max(0, n.dot(d) / dn)), up = Math.max(0, n.y), sp2 = Math.exp(-Math.max(0, p.z - rf) / 3.5) * Math.exp(-Math.abs(p.x - Ev.x) / 9) * (.25 + .75 * up);
          Cs.push(fn * .12 + sp2 * .034 + up * .006, fn * 1.1 + sp2 * .027 + up * .008, fn * .5 + sp2 * .018 + up * .013);
          let ff = 0; if (Ls) { d.subVectors(Ls, p); const ds = d.length() || 1; ff = 1 / (1 + (ds / 9) ** 2) * (.25 + .75 * Math.max(0, n.dot(d) / ds)); } Cf.push(ff, ff, ff * 1.04);
          v.copy(p).addScaledVector(n, .03).sub(Ev); P.push(v.x, v.y, v.z);
        }
      }
    });
    if (!P.length) return;
    const pos = new THREE.Float32BufferAttribute(P, 3), root = new THREE.Group(), mk = (C, ro) => { const g = new THREE.BufferGeometry(); g.setAttribute('position', pos); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); const ms = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: .999, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false })); ms.renderOrder = ro; ms.frustumCulled = false; root.add(ms); return ms; };
    const spr = (p, col, s) => { const o = new THREE.Sprite(new THREE.SpriteMaterial({ map: glwTex(), color: col, blending: THREE.AdditiveBlending, transparent: true, opacity: .999, depthWrite: false, toneMapped: false })); o.position.copy(p).sub(Ev); o.scale.setScalar(s); o.renderOrder = 107; root.add(o); return o; };
    G = { root, st: mk(Cs, 106), fl: Ls ? mk(Cf, 106) : null, sn: spr(Ln, 0x2bff7a, 1.1), ss: Ls ? spr(Ls, 0xf4f8ff, 3.2) : null }; K.group.add(root);
  };
  return (st, n, lit) => {
    const ac = K.group.parent; if (!ac) return; if (ac !== src) { src = ac; build(ac); } if (!G) return;
    const k = lit && n > .02 ? n : 0, w = performance.now() / 1e3, sc = w % 1.2, f1 = (x) => (x < 0 ? 0 : x < .05 ? 1 : x < .09 ? 1 - (x - .05) / .04 : 0), fl = k * Math.max(f1(sc), two ? f1(sc - .14) : 0);
    G.root.visible = k > 0; G.st.material.color.setScalar(k); G.sn.material.opacity = Math.min(.999, k * .9);
    if (G.fl) { G.fl.visible = fl > .01; G.fl.material.color.setScalar(fl * 2.2); G.ss.visible = fl > .01; G.ss.material.opacity = Math.min(.999, fl); }
  };
}

function tbmTurret() {
  const K = makeKit(), C0 = [-.42, 1.18, 0], E = [C0[0] - .02, C0[1] + .26, .08], M = new THREE.Matrix4().makeTranslation(-E[0], -E[1], -E[2]), R = .47, ig = '#697462', od = '#58623f', dk = '#2c3024', gs = '#45473f', gd = '#383a33';
  const sh = (n, p) => (.8 + .2 * n.y) * lerp(.55, 1, sst(-.6, .1, p.y));
  const domeF = new THREE.SphereGeometry(R, 40, 20, 0, TAU, 0, Math.PI / 2 + .05); domeF.translate(...C0); K.add(domeF, '#d8dcc8', { mat: 'tglass', flat: 1, m: M }); K.mat('tglass', scratchTex(), 'tg', { opacity: .08, depthWrite: false }); K.mat('rglass', null, 'cab', { opacity: .16, depthWrite: false });
  const fr = (a, b, w, col) => { const pts = []; for (let i = 0; i <= 24; i++) { const t = lerp(a[0], b[0], i / 24), u = lerp(a[1], b[1], i / 24); pts.push([C0[0] + Math.cos(u) * Math.sin(t) * (R + .005), C0[1] + Math.cos(t) * (R + .005), C0[2] + Math.sin(u) * Math.sin(t) * (R + .005)]); } K.tube(pts, w, col, { n: 30, rs: 6, sh, m: M }); };
  const tor = new THREE.TorusGeometry(R + .01, .035, 8, 40); tor.rotateX(Math.PI / 2); tor.translate(C0[0], C0[1] - .01, C0[2]); K.add(tor, '#3e4436', { sh, m: M });
  for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; K.sph(M, [C0[0] + Math.cos(a) * (R - .012), C0[1] + .012, C0[2] + Math.sin(a) * (R - .012)], .006, '#2a2e26', { sh, seg: 6 }); }
  for (const u of [Math.PI * .5, -Math.PI * .5]) fr([.05, u], [Math.PI / 2, u], .016, '#3e4436'); fr([Math.PI / 2, Math.PI * 1.3], [.03, Math.PI * 1.3], .024, '#3e4436'); fr([.03, Math.PI * .7], [Math.PI / 2, Math.PI * .7], .024, '#3e4436');
  for (const [u0, t0, t1] of [[Math.PI * .5, .45, .95], [-Math.PI * .5, .45, .95]]) { const pts = []; for (let i = 0; i <= 20; i++) { const ang = i / 20 * TAU, tt = lerp(t0, t1, .5 + .5 * Math.sin(ang)), uu = u0 + Math.cos(ang) * .42; pts.push([C0[0] + Math.cos(uu) * Math.sin(tt) * (R + .006), C0[1] + Math.cos(tt) * (R + .006), C0[2] + Math.sin(uu) * Math.sin(tt) * (R + .006)]); } K.tube(pts, .02, '#3e4436', { n: 40, rs: 6, closed: true, sh, m: M }); }
  const bowl = new THREE.SphereGeometry(R, 28, 12, 0, TAU, Math.PI / 2, Math.PI / 2); bowl.translate(...C0); K.add(bowl, ig, { sh: (n, p) => .55 + .25 * (p.y + .9), m: M });
  const gp = new V3(C0[0] - .3, C0[1] + .05, -.21), az = new THREE.Matrix4().makeTranslation(gp.x, gp.y, gp.z).multiply(new THREE.Matrix4().makeRotationY(Math.PI - .17)), gm = az.clone().multiply(new THREE.Matrix4().makeRotationZ(.14));
  const at = (m, x, y, z) => new V3(x, y, z).applyMatrix4(m).toArray(), MT = { mat: 'metal' }, ST = { mat: 'satin' };
  const P = (m, g, col, o = {}) => K.add(g.applyMatrix4(m), col, { sh, m: M, ...o }), bx = (m, p, s, col, o) => P(m, new THREE.BoxGeometry(...s).translate(...p), col, o);
  const cy = (m, p, r, l, col, o = {}) => { const g = new THREE.CylinderGeometry(o.r2 ?? r, r, l, o.seg ?? 16, 1, !!o.open); if (o.ax === 'z') g.rotateX(Math.PI / 2); else if (o.ax !== 'y') g.rotateZ(-Math.PI / 2); return P(m, g.translate(...p), col, o); };
  P(gm, roundBox(.54, .125, .1, .008, 2).translate(-.28, 0, 0), gs, ST); bx(gm, [-.3, .071, 0], [.44, .018, .106], gd, ST); bx(gm, [-.075, .084, 0], [.03, .012, .07], gd, ST);
  bx(gm, [-.565, 0, 0], [.03, .14, .112], gd, ST); cy(gm, [-.6, -.01, 0], .022, .05, '#1e1f1b', MT); bx(gm, [-.47, .1, 0], [.07, .045, .05], '#3a3e32', ST); bx(gm, [.035, 0, 0], [.07, .14, .112], gd, ST);
  cy(gm, [.285, 0, 0], .03, .43, '#4c4e46', MT); for (let i = 0; i < 7; i++) cy(gm, [.12 + i * .055, 0, 0], .0306, .014, '#0e0f0c'); cy(gm, [.51, 0, 0], .034, .03, gd, MT); cy(gm, [.78, 0, 0], .0155, .52, '#3c3d37', MT); cy(gm, [1.07, 0, 0], .02, .07, '#1c1d19', { ...MT, r2: .024 });
  for (let i = 0; i < 8; i++) for (const y of [-.035, .035]) K.sph(M, at(gm, -.5 + i * .055, y, -.051), .0045, '#55574e', { seg: 6, ...MT });
  bx(gm, [-.42, .025, -.058], [.1, .045, .018], '#141511'); bx(gm, [-.42, .05, -.066], [.11, .006, .03], gs, MT); bx(gm, [-.25, 0, .058], [.08, .02, .012], '#1e1f1b', MT);
  bx(gm, [.43, .05, 0], [.008, .04, .008], '#1e1f1b', MT); P(gm, new THREE.TorusGeometry(.03, .0024, 5, 24).rotateY(Math.PI / 2).translate(.43, .1, 0), '#1e1f1b', MT); bx(gm, [.04, .085, 0], [.006, .03, .006], '#1e1f1b', MT); K.sph(M, at(gm, .04, .102, 0), .005, '#1e1f1b', { seg: 8, ...MT });
  for (const s of [-1, 1]) bx(az, [0, -.035, s * .072], [.15, .09, .012], dk, ST); cy(az, [.03, 0, 0], .016, .17, '#3c3e36', { ...MT, ax: 'z' }); bx(az, [0, -.1, 0], [.17, .014, .156], od, ST);
  { const t = at(az, 0, -.1, 0), y0 = C0[1] - .38; K.cyl(M, [t[0], (t[1] + y0) / 2, t[2]], .022, t[1] - y0, od, { sh, ...ST }); K.cyl(M, [t[0], y0 + .01, t[2]], .05, .02, dk, { sh, ...ST }); }
  bx(az, [-.3, -.38, -.03], [.22, .17, .12], '#4e5844', ST); bx(az, [-.3, -.29, -.03], [.225, .012, .125], '#434c3a', ST); bx(az, [-.3, -.33, -.092], [.03, .025, .006], dk, MT);
  { const cc = new THREE.CatmullRomCurve3([[-.42, .01, -.075], [-.43, -.06, -.12], [-.4, -.17, -.125], [-.34, -.25, -.07], [-.3, -.285, -.03]].map((p) => new V3(...p).applyMatrix4(az))), N = 16, L = cc.getLength() / N, ax = new V3(1, 0, 0).transformDirection(az);
    for (let i = 0; i < N; i++) { const p = cc.getPointAt((i + .5) / N), tg = cc.getTangentAt((i + .5) / N), w = ax.clone().addScaledVector(tg, -ax.dot(tg)).normalize(), n = new V3().crossVectors(tg, w), mb = new THREE.Matrix4().makeBasis(w, n, tg).setPosition(p); P(mb, new THREE.BoxGeometry(.07, .02, L * .9), i % 2 ? '#3d4135' : '#31352b', ST); }
    for (const s of [-1, 1]) K.tube(Array.from({ length: 9 }, (_, i) => { const t = i / 8, p = cc.getPointAt(t), tg = cc.getTangentAt(t), w = ax.clone().addScaledVector(tg, -ax.dot(tg)).normalize(); return p.addScaledVector(w, s * .036).toArray(); }), .004, '#272a22', { n: 24, rs: 5, sh, m: M, ...MT }); }
  bx(gm, [-.01, .045, -.1], [.04, .012, .09], dk, ST); bx(gm, [-.01, .057, -.14], [.016, .02, .016], dk, ST); cy(gm, [-.03, .088, -.14], .022, .11, '#3a3c35', ST); cy(gm, [.03, .088, -.14], .024, .012, '#1a1b17', MT); cy(gm, [-.088, .088, -.14], .019, .008, '#55574f', ST); P(gm, new THREE.CircleGeometry(.018, 16).rotateY(Math.PI / 2).translate(.0365, .088, -.14), '#1d2a2c', { flat: 1.2 });
  cy(gm, [-.06, .062, -.14], .012, .03, '#3a3c35', { ...ST, ax: 'y' }); cy(gm, [-.04, .088, -.164], .007, .012, '#8a8676', { ax: 'z', seg: 10 }); K.tube([at(gm, -.06, .046, -.14), at(gm, -.11, .03, -.12), at(gm, -.2, .03, -.065)], .0035, '#151512', { n: 8, rs: 5, sh, m: M });
  { const glm = gm.clone().multiply(new THREE.Matrix4().makeTranslation(-.055, .132, -.14)).multiply(new THREE.Matrix4().makeRotationZ(-Math.PI / 4));
    P(glm, new THREE.PlaneGeometry(.064, .056).rotateY(Math.PI / 2), '#a8c4c0', { mat: 'rglass', flat: 1 }); for (const s of [-1, 1]) { bx(glm, [0, s * .03, 0], [.005, .004, .07], dk, MT); bx(glm, [0, 0, s * .0335], [.005, .06, .004], dk, MT); }
    P(glm, new THREE.TorusGeometry(.011, .001, 4, 28).rotateY(Math.PI / 2).translate(-.003, .003, 0), '#ff9a48', { mat: 'lamp', flat: 1.3 }); P(glm, new THREE.SphereGeometry(.0015, 6, 4).translate(-.003, .003, 0), '#ffb070', { mat: 'lamp', flat: 1.3 }); }
  { const dir = new V3(1, 0, 0).transformDirection(gm), o0 = gp.clone().sub(new V3(...C0)), bq = o0.dot(dir), pc = gp.clone().addScaledVector(dir, -bq + Math.sqrt(bq * bq - o0.lengthSq() + R * R)), pm = new THREE.Matrix4().compose(pc, new THREE.Quaternion().setFromUnitVectors(new V3(0, 0, 1), dir), new V3(1, 1, 1));
    for (const [r, w] of [[.075, .02], [.05, .012]]) P(pm, new THREE.TorusGeometry(r, w, 8, 24), '#3a4034'); P(pm, new THREE.CylinderGeometry(.042, .042, .06, 16, 1, true).rotateX(Math.PI / 2), '#2a2c26'); }
  { const [x, y, z] = E, sx = x - .38, sy = y - .22, sz = z - .02;
    K.box(M, [sx + .08, sy - .06, sz], [.08, .018, .026], od, { sh }); K.cyl(M, [sx + .115, sy - .11, sz], .019, .12, '#1c1c18', { sh, rot: [0, 0, -16], mat: 'rubber' }); K.box(M, [sx + .095, sy - .1, sz], [.012, .028, .01], '#0e0e0e', { sh }); K.cyl(M, [sx + .12, sy - .05, sz + .022], .006, .014, '#6e3a2c', { sh, axis: 'z', seg: 8 });
    K.tube([[sx + .13, sy - .17, sz - .01], [sx + .17, sy - .28, sz - .08], [sx + .22, sy - .38, sz - .13], [sx + .27, sy - .46, sz - .14]], .02, od, { n: 14, rs: 8, sh, m: M });
    K.box(M, [sx + .17, sy - .29, sz - .12], [.045, .075, .04], '#33362b', { sh }); K.cyl(M, [sx + .2, sy - .34, sz - .165], .009, .028, '#1a1a16', { sh, axis: 'z', seg: 8 }); K.box(M, [sx + .145, sy - .22, sz - .045], [.018, .032, .018], '#16160f', { sh });
    K.cyl(M, [sx + .28, sy - .5, sz - .14], .045, .09, od, { sh, seg: 16 }); K.box(M, [sx + .3, sy - .44, sz - .2], [.014, .06, .012], '#1a1a16', { sh, rot: [-25, 0, 0] });
    K.box(M, [x - .16, y - .4, .43], [.02, .12, .02], od, { sh }); K.cyl(M, [x - .16, y - .46, .4], .012, .06, '#1a1a16', { sh, axis: 'z', seg: 8 }); }
  K.add(roundBox(.08, .34, .34, .04, 2).translate(C0[0] + .2, C0[1] - .26, C0[2]), '#4e5642', { sh, m: M }); K.cyl(M, [C0[0] + .25, C0[1] - .45, C0[2]], .02, .4, '#8a8a80', { sh });
  const ext = extClone(K, E, { parts: ['aft', 'fin'], hull: { part: 'mid', match: 'aft', keep: (v) => v.x < C0[0] - R - .03 } });
  return finishInterior(K, 'tbm', { eye: E, rcl: -E[2], look: [172, -14], fov: 80, levels: { ...VLV, tg: [1.1, .25, .2, 1] }, ctint: [.9, 1, .85], tick: ext });
}

const DECKS = { a330: deckA330, b777: deckB777, b767: deckB767, b747: deckB747, b747jal: deckB747, dc10: deckDC10, electra: deckElectra, lancastrian: deckLancastrian, b24: deckB24, tbm: deckTBM, pbm: deckPBM };
const LEVELS = { cab: [.8, .035, .02], gauge: [1, .3, .26], disp: [1, .28, .26], glass: [1, .3, .3], legend: [0, .5, 0, 0], lcd: [1, .65, .55] };

const XL = { g: null, k: 1, c: new THREE.Color(1, 1, 1) }, XS = new WeakSet(), XB = ['blending', 'blendSrc', 'blendDst', 'blendSrcAlpha', 'blendDstAlpha'];
function xl(o) {
  if (XS.has(o)) return; XS.add(o); const b0 = o.onBeforeRender, a0 = o.onAfterRender; let s = null;
  o.onBeforeRender = function (...a) { b0.apply(this, a); const m = o.material, g = XL.g; if (XL.k > .995 || !g?.visible || !g.parent || !m.transparent || m.opacity < 1 || m.userData.lens) return; s = XB.map((k) => m[k]); m.blending = THREE.CustomBlending; m.blendSrc = THREE.ConstantColorFactor; m.blendDst = THREE.OneMinusSrcAlphaFactor; m.blendSrcAlpha = THREE.OneFactor; m.blendDstAlpha = THREE.OneMinusSrcAlphaFactor; m.blendColor.copy(XL.c); };
  o.onAfterRender = function (...a) { if (s) { const m = o.material; XB.forEach((k, i) => (m[k] = s[i])); s = null; } a0.apply(this, a); };
}
function xlHook(ac) { const gs = new Set(), sd = (o) => o.isMesh && o.material?.isMeshStandardMaterial; ac.traverse((o) => o.isMesh && gs.add(o.geometry)); let sc = ac; while (sc.parent) sc = sc.parent; for (const c of [ac, ...sc.children.filter((c) => c !== ac && c.isGroup)]) { let ok = c === ac; if (!ok) c.traverse((o) => (ok ||= sd(o) && gs.has(o.geometry))); if (ok) c.traverse((o) => sd(o) && xl(o)); } }
function xlLight(G, st) {
  let sc = G; while (sc.parent) sc = sc.parent;
  if (XL.sc !== sc) { XL.sc = sc; XL.L = sc.children.filter((o) => o.isDirectionalLight || o.isHemisphereLight); XL.f = sc.children.filter((o) => o.isDirectionalLight)[2]; XL.U = sc.children.find((o) => o.material?.uniforms?.uExpo)?.material.uniforms; }
  let C = 0; for (const l of XL.L) C += l.intensity; const F = XL.f?.intensity ?? 0, e = Math.max(1, XL.U?.uExpo.value ?? 1), fl = clamp((st.flash ?? 0) / 1.5);
  XL.k = C > 1e-4 ? clamp((C - F) / C / Math.sqrt(e) + fl * 1.2) : 1; XL.c.setRGB(XL.k * (1 - .08 * fl), XL.k * (1 - .04 * fl), XL.k); XL.g = G;
}
const sigma = (a) => (a < 36089 ? Math.pow(1 - 6.8756e-6 * Math.max(0, a), 4.2559) : .2971 * Math.exp((36089 - a) / 20806)), HK = ['altFt', 'ias', 'vs', 'pitch', 'roll', 'hdg', 'gs', 'aoa'], REST = { pitch: 0, roll: 0, vs: 0 };
const KN = { altFt: 'alt', ias: 'ias', vs: 'vs', pitch: 'pitch', roll: 'roll', hdg: 'hdg', gs: 'gs', aoa: 'aoa' };
function hold(st, h) {
  const f = st.fail, o = { ...st }, kn = st.known || {}, all = st.unknown === true; o.unk = new Set(); o.unknown = all; if (nz(st.timeMs)) { if (h.t != null && Math.abs(st.timeMs - h.t) > 6e4) for (const k of HK) delete h[k]; h.t = st.timeMs; }
  for (const k of HK) { if (all || kn[KN[k]] === false) { o.unk.add(k); o[k] = null; delete h[k]; } else if (nz(st[k])) h[k] = st[k]; else if (!(f === true || (Array.isArray(f) && f.includes(k)))) o[k] = REST[k] ?? (k === 'ias' && nz(st.gs) && nz(o.altFt) ? st.gs * Math.sqrt(sigma(o.altFt)) : h[k]) ?? null; }
  return o;
}

function finishInterior(K, key, d, extra = {}) {
  K.finish(); const sp = SPECS[key] || SPECS.a330 || { length: 50 }, L = sp.length || 50, base = d.eye || [L / 2 - d.ex, d.ey, -d.rcl], eye = d.cam ? base.map((v, i) => v + d.cam[i]) : base, ya = d.look[0] * D2R, pa = d.look[1] * D2R, LV = { ...LEVELS, ...d.levels };
  K.group.position.set(...base); K.group.name = `interior-${key}`;
  K.group.traverse((o) => { if (o.isMesh) { if (o.renderOrder < 104) o.renderOrder = 105; o.material.transparent = true; } });
  const LU = d.lamp && lamp(K, d.lamp);
  let lastNull = '', hooked = null, xhooked = null; const held = {}, own = new Set(); K.group.traverse((o) => own.add(o));
  const hook = (o, disc) => { const u = o.userData; (u.ints ??= []).push(K.group); if (u.hooked) return; u.hooked = true; let keep = 1; const on = () => u.ints.some((g) => g.visible && g.parent), b0 = o.onBeforeRender, a0 = o.onAfterRender;
    o.onBeforeRender = function (...a) { b0.apply(this, a); if (!on()) return; keep = o.material.opacity; o.material.opacity = disc ? Math.min(keep, .045) : keep < .9 ? .03 : keep; };
    o.onAfterRender = function (...a) { if (on()) o.material.opacity = keep; a0.apply(this, a); }; };
  const hookProps = () => { const ac = K.group.parent; if (!ac || hooked === ac) return; hooked = ac; const discs = []; ac.traverse((o) => { if (o.isMesh && !own.has(o) && o.renderOrder >= 107 && o.geometry.type === 'CircleGeometry' && o.material.transparent && o.material.depthWrite === false) discs.push(o); }); for (const d of discs) { hook(d, true); for (const sib of d.parent.children) if (sib !== d) sib.traverse((b) => { if (b.isMesh && b.renderOrder === 106 && b.material.transparent) hook(b, false); }); } };
  const units = [...K.dyn.map((f) => ({ f, at: -1e9 })), ...K.disp.map((ds) => ({ ds, at: -1e9 }))]; let ui = 0;
  const paint = (u, st, sig) => {
    if (u.f) { if (u.sig === sig) return false; u.sig = sig; u.f(st); return true; }
    const ds = u.ds, dead = st.lights === false && !ds.sb, s = dead ? 'off' : ds.once ? (ds.last === 'off' ? null : ds.last) : ds.sig ? ds.sig(st) + (st.unknown ? '|U' : '') : sig;
    if (s === ds.last) return false; ds.last = s; if (dead) deadDisp(ds); else paintDisp(ds, ds.once ? {} : st); ds.t.needsUpdate = true; return true;
  };
  const redraw = (st, sig, all) => {
    const t0 = performance.now(), N = units.length; let n = 0;
    for (let k = 0; k < N; k++) { const j = (ui + k) % N, u = units[j]; if (!all && t0 - u.at < 66) continue; if (paint(u, st, sig)) { u.at = t0; if (!all && (++n >= 2 || performance.now() - t0 > 2)) { ui = (j + 1) % N; return; } } }
  };
  const update = (st0 = {}) => {
    const st = hold(st0, held), n = clamp(st.night ?? 0), lit = st.lights !== false, fl = clamp((st.flash ?? 0) / 1.5), fb = fl * n * (K.deck ? .12 : .06);
    for (const { m, kind } of K.mats) { if (kind === 'out') continue; const L3 = LV[kind] || LV.cab, v = lerp(lit ? L3[0] : L3[3] ?? L3[0], lit ? L3[1] : L3[2], n) + (kind === 'cab' || kind === 'rev' ? fb : 0); if (kind === 'glass') { if (d.ng) { const c0 = d.gd ?? 1, c1 = (d.gn ?? .06) * (lit ? 1 : .3); m.opacity = lerp(d.go ?? .06, d.ng, n); m.color.setRGB(lerp(c0, c1, n), lerp(c0, c1 * .87, n), lerp(c0, c1 * .67, n)); } else m.opacity = lerp(.05, .012, n); m.opacity *= 1 - .7 * fl; } else if (kind === 'tg') { m.opacity = lerp(.08, .006, n); m.color.setScalar(v); } else if ((kind === 'gauge' || kind === 'legend') && d.tint) m.color.setRGB(...d.tint.map((t) => v * lerp(1, t, n))); else if (d.ctint && kind !== 'gauge') m.color.setRGB(...d.ctint.map((t) => v * lerp(1, t, n))); else m.color.setScalar(v); }
    if (LU) { LU.uLn.value = n; LU.uLc.value.setRGB(...d.lamp.c).multiplyScalar(lit ? 1 : 0); }
    for (const y of K.yokes || []) y.g.rotation.z += ((nz(st.elevL) ? clamp(st.elevL * 1.8, -14, 14) * D2R : 0) - y.g.rotation.z) * (1 - Math.exp(-(st.dt ?? 0) * 9));
    const mo = move(st, I.eye, I.look); d.tick?.(st, n, lit, mo); if (!d.keepProps) hookProps(); const ac = K.group.parent; if (ac && xhooked !== ac) { xhooked = ac; xlHook(ac); } xlLight(K.group, st);
    const sig = sigOf(st) + (lit ? '' : '|off'), nul = [st.ias, st.altFt, st.vs, st.pitch, st.roll, st.hdg].map((v) => +nz(v)).join('') + (st.warnings || []).join() + lit;
    if (st.dt !== 0 || nul !== lastNull) { redraw(st, sig, nul !== lastNull); lastNull = nul; }
  };
  const dispose = () => { for (const t of K.texs) t.dispose(); const ex = K.group.getObjectByName('ext'); if (ex) K.group.remove(ex); K.group.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } else if (o.isSprite) o.material.dispose(); }); };
  redraw({ warnings: [] }, '', true); for (const u of units) { u.at = -1e9; u.sig = undefined; if (u.ds) u.ds.last = null; }
  const clr = new THREE.Mesh(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(9), 3)), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, colorWrite: false, depthWrite: false, depthTest: false }));
  const vw = { asp: 1 }; clr.renderOrder = 103; clr.frustumCulled = false; clr.onBeforeRender = (r, sc, cam) => { vw.asp = cam.aspect || 1; r.state.buffers.depth.setMask(true); r.clearDepth(); }; K.group.add(clr);
  const look = [eye[0] + Math.cos(pa) * Math.cos(ya) * 2, eye[1] + Math.sin(pa) * 2, eye[2] + Math.cos(pa) * Math.sin(ya) * 2], move = mover(eye, ya, pa, d.mo ?? (K.deck ? .55 : 1), vw, d.aim == null ? 0 : (d.aim * D2R - ya) * .5, d.mky);
  const I = { group: K.group, eye: eye.slice(), look: look.slice(), fov: d.fov, near: .04, update, dispose, ...extra };
  return I;
}
function lamp(K, o) {
  const U = { uLp: { value: new V3(...o.p) }, uLs: { value: new V3(...(o.s || [1, 1, 1])) }, uLc: { value: new THREE.Color() }, uLa: { value: new THREE.Color(...o.a) }, uLr: { value: o.r }, uLn: { value: 0 } }, skip = new Set(['out', 'glass', 'gauge', 'disp', 'legend', 'clamp']);
  for (const { m, kind } of K.mats) { if (skip.has(kind) || m.userData.lamp) continue; m.userData.lamp = 1; const prev = m.onBeforeCompile;
    m.onBeforeCompile = (sh, r) => { prev?.call(m, sh, r); Object.assign(sh.uniforms, U);
      sh.vertexShader = 'varying vec3 vLp;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvLp = transformed;');
      sh.fragmentShader = 'varying vec3 vLp; uniform vec3 uLp, uLs, uLc, uLa; uniform float uLr, uLn;\n' + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n{ vec3 q = (vLp - uLp) * uLs / uLr; float f = 1. / (1. + dot(q, q) * (1. + dot(q, q))); diffuseColor.rgb *= mix(vec3(1.), uLa + uLc * f, uLn); }'); };
    m.customProgramCacheKey = () => 'lamp' + m.type; m.needsUpdate = true; }
  return U;
}
function mover(E0, Y0, P0, k, vw, aim, mky = 0) {
  const m = { t: null, mk: 0, fp: 0, fr: 0, fy: 0, sp: 0, sr: 0, sy: 0, az: 0, azs: 0, ag: 0, b: 0, sw: 0, ph: [0, 1.3, 2.1, .7, 4.2], x: [0, 0, 0, 0], u: [0, 0, 0, 0] }, N = (i, f) => Math.sin(m.ph[i]) * .6 + Math.sin(m.ph[i] * f + 1.7) * .4;
  const zero = (st) => { m.x.fill(0); m.u.fill(0); m.fp = m.fr = m.fy = m.sp = m.sr = m.sy = m.az = m.azs = m.ag = 0; m.mk = st.masks ? 1 : 0; };
  return (st, eye, look) => {
    const t = st.timeMs, ds = m.t == null || !nz(t) ? 0 : (t - m.t) / 1000, dw = clamp(st.dt ?? 0, 0, .1);
    if (m.t == null) m.mk = st.masks ? 1 : 0; else m.mk += ((st.masks ? 1 : 0) - m.mk) * (1 - Math.exp(-dw * .7));
    if (nz(t) && ds !== 0 && dw > 0) {
      if (st.cut || ds < 0 || ds > 40) zero(st);
      else {
        const f = 1 - Math.exp(-dw * 3), rt = (a, b, lim) => clamp(nz(a) && nz(b) ? (a - b) / ds : 0, -lim, lim);
        m.fp += (rt(st.pitch, m.p, 20) - m.fp) * f; m.fr += (rt(st.roll, m.r, 40) - m.fr) * f; m.fy += (clamp(nz(st.hdg) && nz(m.h) ? ((st.hdg - m.h + 540) % 360 - 180) / ds : 0, -20, 20) - m.fy) * f;
        const fs = 1 - Math.exp(-dw * .4); m.sp += (m.fp - m.sp) * fs; m.sr += (m.fr - m.sr) * fs; m.sy += (m.fy - m.sy) * fs; m.az += (rt(st.vs, m.v, 6000) / 1930 - m.az) * f; m.azs += (m.az - m.azs) * fs;
        m.ag += (clamp((Math.abs(m.fr) + 2 * Math.abs(m.fp)) / 2.5) - m.ag) * (1 - Math.exp(-dw * .25));
        const stall = Math.max(nz(st.aoa) ? sst(9, 18, Math.abs(st.aoa)) : 0, (st.warnings || []).some((w) => /STALL/i.test(w)) ? .5 : 0);
        m.b += (clamp(Math.max(st.shake || 0, stall * .9, Math.abs(m.az - m.azs) * 3)) - m.b) * (1 - Math.exp(-dw * 2.5));
        m.sw += (clamp(Math.max((st.shake || 0) * .8, m.ag)) - m.sw) * (1 - Math.exp(-dw * .8));
        [6.1, 4.3, 3.1, .27, .19].forEach((hz, i) => (m.ph[i] += dw * TAU * hz * (i < 3 ? .8 + .2 * m.b : 1)));
        const T = [clamp(-(m.fy - m.sy) * .7 - m.fy * .08, -6, 6), clamp(-(m.fp - m.sp) * .9 - m.fp * .12 + m.az * 2, -6, 6), clamp(-(m.fr - m.sr) * .009 - m.fr * .001, -.08, .08), clamp(-m.az * .05, -.06, .06)];
        for (let n = Math.ceil(dw / .012), h = dw / n, j = 0; j < n; j++) for (let i = 0; i < 4; i++) { m.u[i] += (25 * (T[i] - m.x[i]) - 8 * m.u[i]) * h; m.x[i] += m.u[i] * h; }
      }
      m.t = t; m.p = st.pitch; m.r = st.roll; m.h = st.hdg; m.v = st.vs;
    }
    if (m.t == null) m.t = nz(t) ? t : null;
    const b = m.b * k, s = m.sw * k, nar = clamp((1 - vw.asp) / .5), mk = sst(0, 1, m.mk), yaw = Y0 + aim * nar * (1 - mk * nar) - mk * mky * (1 + .4 * nar) * D2R + (m.x[0] * k + b * .1 * N(1, 1.6) + s * 2.2 * Math.sin(m.ph[4])) * D2R, pit = P0 + mk * nar * mky * .55 * D2R + (m.x[1] * k + b * .16 * N(0, 1.6) + s * 1.2 * Math.sin(m.ph[3] * 1.3)) * D2R;
    eye[0] = E0[0]; eye[1] = E0[1] + m.x[3] * k + b * .004 * N(0, 1.7) + s * .025 * Math.sin(m.ph[3]); eye[2] = E0[2] + m.x[2] * k + b * .003 * N(2, 1.4) + s * .05 * Math.sin(m.ph[4] + .6);
    look[0] = eye[0] + Math.cos(pit) * Math.cos(yaw) * 2; look[1] = eye[1] + Math.sin(pit) * 2; look[2] = eye[2] + Math.cos(pit) * Math.sin(yaw) * 2;
    return m;
  };
}
function placeholder(key, id) {
  const K = makeKit(), sp = SPECS[key] || { length: 40, dia: 5 }, L = sp.length || 40, r = (sp.dia || 4) / 2, side = .38, C = '#cfc9bc', D = '#9a958a';
  const wz = side, h = [[-.08, -.2], [.2, .16]], X0 = -1.3, X1 = 1.3, Y0 = -1.15, Y1 = .62, Z0 = -1.4;
  const wall = [[[X0, Y0], [X1, h[0][1]]], [[X0, h[1][1]], [X1, Y1]], [[X0, h[0][1]], [h[0][0], h[1][1]]], [[h[1][0], h[0][1]], [X1, h[1][1]]]];
  for (const [[a0, b0], [a1, b1]] of wall) K.quad([a0, b0, wz], [a1, b0, wz], [a1, b1, wz], [a0, b1, wz], C, { flat: .95 });
  K.cabin({ rcl: 0, cols: [[[h[0][0], h[0][1], wz], [h[0][0], h[1][1], wz]], [[h[1][0], h[0][1], wz], [h[1][0], h[1][1], wz]]], pat: ['g'], col: { f: '#b8b2a4' }, depth: .12, corner: .06, ref: [0, 0, -1], mirror: false });
  K.quad([X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, wz], [X0, Y0, wz], '#3a3a42', { flat: .9 }); K.quad([X0, Y1, Z0], [X1, Y1, Z0], [X1, Y1, wz], [X0, Y1, wz], '#e2ddd2', { flat: .85 });
  for (const x of [X0, X1]) K.quad([x, Y0, Z0], [x, Y1, Z0], [x, Y1, wz], [x, Y0, wz], D, { flat: .8 }); K.quad([X0, Y0, Z0], [X1, Y0, Z0], [X1, Y1, Z0], [X0, Y1, Z0], D, { flat: .75 });
  return finishInterior(K, key, { ex: L / 2 + L * .08, ey: .12, rcl: -(r - side - .12), look: [72, -10], fov: 66 });
}
const CACHE = new Map(); let cacheKey = null;
export function buildInterior(key, perspectiveId) {
  if (!DECKS[key]) key = 'a330';
  const id = perspectiveId || 'captain', ck = `${key}|${id}`;
  if (cacheKey !== key) { for (const v of CACHE.values()) v.dispose?.(); CACHE.clear(); cacheKey = key; }
  if (CACHE.has(ck)) return CACHE.get(ck);
  let I;
  if (id === 'captain' || id === 'pilot') { DECK = true; try { const K = makeKit(); K.deck = true; K.key = key; I = finishInterior(K, key, DECKS[key](K)); } finally { DECK = false; FLOOR = -1.2; } }
  else if (id === 'passenger') I = cabin(key);
  else if (id === 'navigator' && key === 'electra') I = electraNav();
  else if (id === 'waist' && key === 'b24') I = b24Waist();
  else if (id === 'turret' && key === 'tbm') I = tbmTurret();
  else I = placeholder(key, id);
  CACHE.set(ck, I); return I;
}
