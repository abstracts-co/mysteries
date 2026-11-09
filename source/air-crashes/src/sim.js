import { R, clamp, destination, gcDistance, lerp, smooth, shortAngle, D2R, R2D, bearing } from './geo.js';

const FT = .3048, KT = .514444;
export const prefixTrack = (raw, firstUtc, startUtc, wps) => {
  const P = [{ ...raw.route.from }, ...wps], T = Date.parse(startUtc), T1 = Date.parse(firstUtc), a = P.map((p, i) => (i ? gcDistance(P[i - 1], p) : 0));
  const tot = a.reduce((x, y) => x + y, 0), gs = tot / ((T1 - T) / 1000) / KT; let acc = 0;
  return P.map((p, i) => { acc += a[i]; return p.skip ? null : { t_utc: new Date(T + (T1 - T) * acc / tot * .999).toISOString(), lat: p.lat, lon: p.lon, alt_ft: i ? p.alt_ft ?? 35000 : (p.elev_ft ?? 0), gs_kt: i ? gs : null, quality: 'derived', method: p.method || 'Flight-plan point, timed at constant speed between departure and the first recorded point.', sources: p.sources || raw.route.sources || [] }; }).filter(Boolean);
};
const pt = (s) => { const m = Date.parse(s); return Number.isFinite(m) ? m / 1000 : null; };
const num = (x) => (typeof x === 'number' && Number.isFinite(x) ? x : null);

const weak = (...q) => (q.some((x) => !x || x === 'modelled') ? 'modelled' : 'derived');
const firstNum = (...a) => { for (const x of a) if (num(x) != null) return x; return null; };
function altOf(p) {
  if (num(p.alt_ft) != null) return p.alt_ft;
  if (num(p.pressure_alt_ft) != null) return p.pressure_alt_ft;
  if (num(p.radio_alt_ft) != null) return p.radio_alt_ft;
  return null;
}

function fillSeries(pts, key, { fallback, angle, gap = Infinity, hold = Infinity, lead } = {}) {
  const n = pts.length, prev = [], next = [];
  for (let i = 0, k = -1; i < n; i++) { if (pts[i][key] != null) k = i; prev[i] = k; }
  for (let i = n - 1, k = -1; i >= 0; i--) { if (pts[i][key] != null) k = i; next[i] = k; }
  if (!n || prev[n - 1] < 0) { if (fallback != null) pts.forEach((p) => { p[key] = fallback; }); return; }
  pts.forEach((p, i) => {
    if (p[key] != null) return;
    const A = pts[prev[i]], B = pts[next[i]];
    if (A && B && B.t - A.t <= gap) {
      const t = (p.t - A.t) / Math.max(B.t - A.t, 1e-6);
      p[key] = angle ? (A[key] + shortAngle(A[key], B[key]) * t + 360) % 360 : lerp(A[key], B[key], t);
    } else {
      const da = A ? p.t - A.t : Infinity, db = B ? B.t - p.t : Infinity;
      if (!A && lead != null) p[key] = lead; else if (Math.min(da, db) <= hold) p[key] = (da <= db ? A : B)[key];
    }
  });
}

function blendDerived(pts, key, dkey, known) {
  const K = pts.filter((p) => p[known]);
  pts.forEach((p) => {
    p[key + 'W'] = 1; if (p[key] != null) return;
    let near = null, d = Infinity;
    for (const q of K) { const x = Math.abs(q.t - p.t); if (x < d) { d = x; near = q; } }
    p[key + 'W'] = near ? 1 - smooth(d / 3) : 0; p[key] = near ? lerp(near[key], p[dkey] ?? 0, smooth(d / 3)) : p[dkey] ?? 0;
  });
}

function fillPositions(pts, start, end) {
  const anchors = [];
  pts.forEach((p, i) => { if (p.lat != null && p.lon != null) anchors.push(i); });
  const last = pts.length - 1;
  if (anchors[anchors.length - 1] !== last && end) { pts[last].lat = end.lat; pts[last].lon = end.lon; pts[last].posQ = 'derived'; anchors.push(last); }
  if (!anchors.length) return;
  if (anchors[0] !== 0) {
    if (start) { pts[0].lat = start.lat; pts[0].lon = start.lon; pts[0].posQ = 'derived'; anchors.unshift(0); }
    else {
      for (let i = anchors[0] - 1; i >= 0; i--) { const n = pts[i + 1], p = pts[i], v = (p.gs + n.gs) * .5 * KT * (n.t - p.t), h = (p.hdg + shortAngle(p.hdg, n.hdg) * .5 + 180) % 360, q = destination(n.lat, n.lon, h, v); p.lat = q.lat; p.lon = q.lon; p.posQ = weak(n.posQ); }
    }
  }
  if (anchors[anchors.length - 1] !== last) {
    {
      const li = anchors[anchors.length - 1];
      for (let i = li + 1; i <= last; i++) { const a = pts[i - 1], p = pts[i], d = (p.gs ?? p.tas ?? 120) * KT * (p.t - a.t), q = destination(a.lat, a.lon, p.hdg ?? 0, d); p.lat = q.lat; p.lon = q.lon; p.posQ = weak(a.posQ); }
    }
  }
  for (let k = 0; k < anchors.length - 1; k++) {
    const ia = anchors[k], ib = anchors[k + 1]; if (ib - ia < 2) continue;
    const A = pts[ia], B = pts[ib];
    const canDR = pts.slice(ia, ib + 1).filter((p) => p.hdgKnown).length > (ib - ia + 1) * .4;
    if (canDR) {
      let e = 0, n = 0; const xy = [[0, 0]];
      for (let i = ia + 1; i <= ib; i++) { const dt = pts[i].t - pts[i - 1].t, v = (pts[i].gs + pts[i - 1].gs) * .5 * KT * dt, h = pts[i - 1].hdg * D2R + shortAngle(pts[i - 1].hdg, pts[i].hdg) * .5 * D2R; e += Math.sin(h) * v; n += Math.cos(h) * v; xy.push([e, n]); }
      const tb = bearing(A, B) * D2R, td = gcDistance(A, B), te = Math.sin(tb) * td, tn = Math.cos(tb) * td, ex = te - e, ey = tn - n, c = Math.cos(A.lat * D2R);
      for (let i = ia + 1; i < ib; i++) { const f = (pts[i].t - A.t) / (B.t - A.t), x = xy[i - ia][0] + ex * f, y = xy[i - ia][1] + ey * f; pts[i].lat = A.lat + y / R * R2D; pts[i].lon = A.lon + x / (R * c) * R2D; pts[i].posQ = weak(A.posQ); }
    } else {
      let tot = 0; const acc = [0];
      for (let i = ia + 1; i <= ib; i++) { const v = (pts[i].gs + pts[i - 1].gs) * .5; tot += Math.max(v, 30) * (pts[i].t - pts[i - 1].t); acc.push(tot); }
      const td = gcDistance(A, B), b0 = bearing(A, B);
      if (A.hdgKnown && B.hdgKnown && tot > td * 1.4 && B.t - A.t < 900 && bend(pts, ia, ib, b0, td)) continue;
      for (let i = ia + 1; i < ib; i++) { const q = destination(A.lat, A.lon, b0, td * acc[i - ia] / tot); pts[i].lat = q.lat; pts[i].lon = q.lon; pts[i].posQ = weak(A.posQ, B.posQ); }
    }
  }
}

function bend(pts, ia, ib, b0, td) {
  const A = pts[ia], B = pts[ib], n = ib - ia, sg = [], h = [], f = [], S = (x, k) => Math.sin(Math.PI * k * x), bias = (b, x) => b[0] * S(x, 1) + b[1] * S(x, 2);
  for (let i = ia + 1; i <= ib; i++) { const a = pts[i - 1], p = pts[i]; sg.push(Math.max((a.gs + p.gs) * .5, 30) * KT * (p.t - a.t)); h.push((a.hdg + shortAngle(a.hdg, p.hdg) * .5) * D2R); f.push(((a.t + p.t) / 2 - A.t) / (B.t - A.t)); }
  const go = (b, k = n) => { let e = 0, m = 0; for (let j = 0; j < k; j++) { const a = h[j] + bias(b, f[j]); e += Math.sin(a) * sg[j]; m += Math.cos(a) * sg[j]; } return [e, m]; };
  const T = [Math.sin(b0 * D2R) * td, Math.cos(b0 * D2R) * td], miss = (E) => Math.hypot(T[0] - E[0], T[1] - E[1]);
  let b = [0, 0], E = go(b);
  for (let k = 0; k < 80 && miss(E) > 5; k++) {
    const J = [0, 1].map((j) => { const c = [...b]; c[j] += 1e-4; const Q = go(c); return [(Q[0] - E[0]) / 1e-4, (Q[1] - E[1]) / 1e-4]; });
    const det = J[0][0] * J[1][1] - J[1][0] * J[0][1], r0 = T[0] - E[0], r1 = T[1] - E[1]; if (Math.abs(det) < 1e-6) return false;
    let x = (r0 * J[1][1] - r1 * J[1][0]) / det, y = (J[0][0] * r1 - J[0][1] * r0) / det; const m = Math.hypot(x, y); if (m > .4) { x *= .4 / m; y *= .4 / m; }
    b = [b[0] + x, b[1] + y]; E = go(b);
  }
  if (miss(E) > Math.max(50, td * .02) || Math.hypot(...b) > 2.4) return false;
  const c = Math.cos(A.lat * D2R);
  for (let i = ia + 1; i < ib; i++) {
    const P = go(b, i - ia), x = (pts[i].t - A.t) / (B.t - A.t), p = pts[i];
    p.lat = A.lat + (P[1] + (T[1] - E[1]) * x) / R * R2D; p.lon = A.lon + (P[0] + (T[0] - E[0]) * x) / (R * c) * R2D; p.posQ = 'modelled';
    if (!p.hdgKnown) { p.hdg = ((p.hdg + bias(b, x) * R2D) % 360 + 360) % 360; p.bent = true; }
  }
  return true;
}

function hermite(a, b, ma, mb, t, h) {
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * a + (t3 - 2 * t2 + t) * h * ma + (-2 * t3 + 3 * t2) * b + (t3 - t2) * h * mb;
}

export function normalise(raw, direct = {}) {
  const src = Object.fromEntries((raw.sources || []).map((s, i) => [s.id, { ...s, n: i + 1 }]));
  let trackRaw = [...(direct.track || raw.track), ...(direct.add || [])];
  if (direct.drop) trackRaw = trackRaw.filter(direct.drop);
  const ALT0 = direct.fromT ? Date.parse(direct.fromT) / 1000 : null;
  let pts = trackRaw.map((p) => ({
    t: pt(p.t_utc), lat: num(p.lat), lon: num(p.lon), alt: altOf(p), ias: firstNum(p.ias_kt, p.cas_kt, p.computed_airspeed_kt), gs: num(p.gs_kt), mach: num(p.mach), hdg: firstNum(p.hdg_deg, p.ground_track_deg), vs: num(p.vs_fpm), pitch: num(p.pitch_deg), roll: num(p.roll_deg), aoa: firstNum(p.aoa_deg, p.vane_aoa_deg), elevL: num(p.elevator_left_deg), elevR: num(p.elevator_right_deg), q: p.quality, pq: num(p.lat) != null ? p.quality : null, sources: p.sources || [], locator: p.locator, note: p.method, radio: num(p.radio_alt_ft), bad: /^erroneous/i.test(p.airspeed_status || ''),
  })).filter((p) => p.t != null && (ALT0 == null || p.t >= ALT0) && [p.lat, p.alt, p.ias, p.gs, p.hdg, p.pitch, p.roll].some((x) => x != null)).sort((a, b) => a.t - b.t);
  const merged = [];
  for (const p of pts) {
    const l = merged[merged.length - 1];
    if (l && Math.abs(l.t - p.t) < .01) { for (const k of Object.keys(p)) if (l[k] == null) l[k] = p[k]; } else merged.push(p);
  }
  pts = merged;
  for (let i = 0; i < pts.length; i++) {
    const c = pts[i], rad = (p) => p.q === 'radar' && p.lat != null;
    if (!rad(c)) continue;
    let j = i + 1; while (j < pts.length && pts[j].t - c.t < 2 && rad(pts[j])) j++;
    if (j - i < 2) continue;
    const g = pts.slice(i, j), m = (k) => g.reduce((x, p) => x + p[k], 0) / g.length, o = { ...c, t: m('t'), lat: m('lat'), lon: m('lon') };
    for (const p of g) for (const k of Object.keys(p)) o[k] ??= p[k];
    pts.splice(i, j - i, o);
  }
  const RQ = /^(recorded|radar|reported)$/, rate = (direct.climbFpm ?? 1000) / 60, hold = [];
  pts.filter((p) => p.alt != null && RQ.test(p.q) && p.vs == null).forEach((B, i, K) => {
    const A = K[i - 1], d = A && Math.abs(B.alt - A.alt), T = A && B.t - A.t;
    if (A && T >= 1200 && d >= 1000) hold.push({ ...Object.fromEntries(Object.keys(A).map((k) => [k, null])), t: Math.max(A.t + T * .25, B.t - d / rate), alt: A.alt, held: true, q: 'derived', sources: [], note: 'Held at the last reported level; the change is drawn just before the next report.' });
  });
  const D0 = raw.route?.from, A0 = pts.find((p) => p.alt != null), B0 = A0 && pts.find((p) => p.alt != null && p.t > A0.t);
  if (B0 && D0?.lat != null && A0.lat != null && gcDistance(A0, D0) < 15000 && B0.t - A0.t >= 1200 && B0.alt - A0.alt >= 1000) hold.push({ ...Object.fromEntries(Object.keys(A0).map((k) => [k, null])), t: Math.min(A0.t + (B0.alt - A0.alt) / rate, B0.t - 60), alt: B0.alt, held: true, q: weak(A0.q, B0.q), sources: [], note: 'Climb drawn at a typical rate after departure, then held to the next report.' });
  if (hold.length) pts = [...pts, ...hold].sort((a, b) => a.t - b.t);
  const recT = pts.filter((p) => p.q === 'recorded' && p.alt != null).map((p) => p.t);
  pts.forEach((p) => { if (p.q === 'modelled' && p.alt != null && recT.some((t) => t < p.t && p.t - t < 5) && recT.some((t) => t > p.t && t - p.t < 5)) p.alt = null; });
  pts.forEach((p) => { p.hdgKnown = p.hdg != null; p.gsKnown = p.gs != null; p.posQ = p.lat != null ? p.pq ?? p.q : null; p.pitchKnown = p.pitch != null; p.rollKnown = p.roll != null; p.altKnown = p.alt != null && !p.held; p.iasKnown = p.ias != null; p.aoaKnown = p.aoa != null; p.vsKnown = p.vs != null; });
  pts.forEach((p) => { if (p.gs == null && p.ias != null && p.alt != null && !p.bad) p.gs = p.ias * Math.sqrt(Math.exp(p.alt / 29000)); });
  fillSeries(pts, 'gs', { fallback: direct.cruiseKt ?? 300, lead: direct.gsLead }); fillSeries(pts, 'hdg', { angle: true });
  const hasHdg = pts.some((p) => p.hdg != null);
  pts.forEach((p) => { p.hdg ??= 0; });
  if (direct.endAlt != null) { pts[pts.length - 1].alt = direct.endAlt; pts[pts.length - 1].altKnown = false; }
  const dep = raw.route?.from, k0 = pts.findIndex((p) => p.alt != null);
  if (k0 > 0 && dep?.elev_ft != null && pts[0].lat != null && gcDistance(pts[0], dep) < 15000) {
    for (let i = 0; i < k0; i++) { const x = (pts[i].t - pts[0].t) / Math.max(pts[k0].t - pts[0].t, 1); pts[i].alt = dep.elev_ft + (pts[k0].alt - dep.elev_ft) * (1 - (1 - x) ** 2); }
  }
  fillSeries(pts, 'alt', { fallback: direct.cruiseFt ?? 10000 }); fillSeries(pts, 'ias', { gap: 180, hold: 8 });
  for (const [k, W] of Object.entries(direct.unknown || {})) for (const [a, b] of W) { const A = pt(a), B = pt(b); pts.forEach((p) => { if (p.t > A && p.t < B && !p[k + 'Known']) p[k] = null; }); }
  const start = direct.start === false ? null : (direct.start || (raw.route?.from?.lat != null ? raw.route.from : null));
  const end = direct.end === false ? null : (direct.end || (raw.site?.lat != null ? raw.site : null));
  fillPositions(pts, start, end);
  const out = pts.filter((p) => p.lat != null), n = out.length;
  const win = (i, span, dist) => {
    let a = i, b = i;
    while ((out[b].t - out[a].t < span || gcDistance(out[a], out[b]) < dist) && (a > 0 || b < n - 1)) { if (b === n - 1 || (a > 0 && out[i].t - out[a - 1].t <= out[b + 1].t - out[i].t)) a--; else b++; }
    return [out[a], out[b]];
  };
  const slopes = (key, angle) => out.map((p, i) => {
    const a = out[Math.max(i - 1, 0)], b = out[Math.min(i + 1, out.length - 1)], dt = Math.max(b.t - a.t, 1e-3);
    if (angle) return shortAngle(a[key], b[key]) / dt;
    const m1 = (p[key] - a[key]) / Math.max(p.t - a.t, 1e-3), m2 = (b[key] - p[key]) / Math.max(b.t - p.t, 1e-3);
    if (i === 0) return m2; if (i === out.length - 1) return m1;
    return m1 * m2 <= 0 ? 0 : 2 * m1 * m2 / (m1 + m2);
  });
  const SLA = slopes('alt'), kh = out.filter((p) => p.hdgKnown).map((p) => p.t);
  for (let i = 0; i < n; i++) {
    const p = out[i]; if (p.hdgKnown || p.bent || kh.some((t) => Math.abs(t - p.t) <= 8)) continue;
    const [a, b] = win(i, 20, 3000); if (gcDistance(a, b) > 30) p.hdg = bearing(a, b);
  }
  for (let i = 0; i < n; i++) {
    const p = out[i], [a, b] = win(i, 20, 3000), dt = Math.max(b.t - a.t, .1), speed = gcDistance(a, b) / dt, vv = SLA[i] * FT;
    if (!p.gsKnown && a !== b && dt < 120 && [a, b].every((q) => q.posQ === 'radar' || q.posQ === 'recorded')) p.gs = speed / KT;
    if (!p.vsKnown) p.vs = SLA[i] * 60;
    p.dPitch = clamp(Math.atan2(vv, Math.max(speed, 40)) * R2D + 2, -40, 25);
    p.dRoll = clamp(Math.atan(speed * shortAngle(a.hdg, b.hdg) / dt * D2R / 9.8) * R2D, -35, 35);
  }
  const AG = direct.attGap ?? 75;
  fillSeries(out, 'pitch', { gap: AG, hold: 0 }); fillSeries(out, 'roll', { gap: AG, hold: 0 }); fillSeries(out, 'aoa', { gap: AG, hold: 5 }); fillSeries(out, 'elevL', { gap: 10, hold: 0 }); fillSeries(out, 'elevR', { gap: 10, hold: 0 });
  blendDerived(out, 'pitch', 'dPitch', 'pitchKnown'); blendDerived(out, 'roll', 'dRoll', 'rollKnown');
  for (let i = 1; i < out.length; i++) out[i].lon = out[i - 1].lon + shortAngle(out[i - 1].lon, out[i].lon);
  const t0 = out[0].t, t1 = out[out.length - 1].t;
  out.forEach((p) => { p.rt = p.t - t0; });
  const SL = { lat: slopes('lat'), lon: slopes('lon'), alt: SLA }, LONG = direct.longGap ?? 60;
  for (const k of ['pitch', 'roll', 'gs', 'ias', 'aoa', 'vs']) SL[k] = slopes(k).map((v) => (Number.isFinite(v) ? v : null));
  SL.hdg = slopes('hdg', true).map((v) => (Number.isFinite(v) ? v : null));
  const VL = out.map((p) => { const v = p.gs * KT / R * R2D, h = p.hdg * D2R; return [v * Math.cos(h), v * Math.sin(h) / Math.max(Math.cos(p.lat * D2R), .05)]; });
  const CK = out.map((a, i) => { const b = out[i + 1], c = Math.cos(a.lat * D2R); if (!b || b.rt - a.rt <= LONG) return 1; const r = (b.rt - a.rt) * Math.max(...[VL[i], VL[i + 1]].map((v) => Math.hypot(v[0], v[1] * c))) / Math.max(Math.hypot(b.lat - a.lat, (b.lon - a.lon) * c), 1e-9); return r > 2.5 ? 1.5 / r : 1; });
  const posAt = (i, rt) => {
    const a = out[i], b = out[i + 1] ?? a, h = Math.max(b.rt - a.rt, 1e-6), f = clamp((rt - a.rt) / h), L = h > LONG, k = CK[i];
    return [hermite(a.lat, b.lat, L ? VL[i][0] * k : SL.lat[i], L ? (VL[i + 1]?.[0] ?? 0) * k : SL.lat[i + 1] ?? 0, f, h), hermite(a.lon, b.lon, L ? VL[i][1] * k : SL.lon[i], L ? (VL[i + 1]?.[1] ?? 0) * k : SL.lon[i + 1] ?? 0, f, h)];
  };
  const tanHdg = (i, rt) => {
    const a = out[i], b = out[i + 1] ?? a, p = posAt(i, clamp(rt - .5, a.rt, b.rt)), q = posAt(i, clamp(rt + .5, a.rt, b.rt)), dy = q[0] - p[0], dx = (q[1] - p[1]) * Math.cos(p[0] * D2R);
    return Math.hypot(dx, dy) < 1e-9 ? null : (Math.atan2(dx, dy) * R2D + 360) % 360;
  };
  const lastIdx = { i: 0 };
  function locate(t) {
    let i = lastIdx.i; if (i >= out.length - 1 || out[i].rt > t) i = 0;
    while (i < out.length - 2 && out[i + 1].rt <= t) i++;
    lastIdx.i = i; return i;
  }
  const ET = direct.eventTimes || {};
  const events = (direct.events || raw.events || []).map((e) => { const tu = ET[e.title] || e.t_utc; return { ...e, t_utc: tu, t: pt(tu), est: !!ET[e.title] }; }).filter((e) => e.t != null && e.t <= t1 + 1 && e.t >= t0 - 1).map((e) => ({ ...e, rt: Math.max(0, e.t - t0) })).sort((a, b) => a.rt - b.rt);
  const after = (direct.events || raw.events || []).map((e) => ({ ...e, t: pt(e.t_utc) })).filter((e) => e.t == null || e.t > t1 + 1).filter((e) => !(direct.eventTimes && direct.eventTimes[e.title]));
  const before = (raw.events || []).map((e) => ({ ...e, t: pt(e.t_utc) })).filter((e) => e.t != null && e.t < t0 - 1);
  const stops = [...new Set([0, ...events.map((e) => e.rt), t1 - t0])].sort((a, b) => a - b);
  const pace = direct.pace || {};
  const mt = [0], ms = [0];
  for (let i = 1; i < stops.length; i++) {
    const G = stops[i] - stops[i - 1];
    const dur = G < 1 ? Math.max(G * 2, pace.min ?? 2.2) : clamp(3.2 + Math.sqrt(G) * .42, pace.min ?? 3.4, pace.max ?? 15);
    mt.push(stops[i]); ms.push(ms[i - 1] + dur);
  }
  const storyLen = ms[ms.length - 1];
  const realOf = (s) => {
    s = clamp(s, 0, storyLen); let i = 0; while (i < ms.length - 2 && ms[i + 1] <= s) i++;
    return lerp(mt[i], mt[i + 1], (s - ms[i]) / Math.max(ms[i + 1] - ms[i], 1e-6));
  };
  const storyOf = (t) => {
    t = clamp(t, 0, t1 - t0); let i = 0; while (i < mt.length - 2 && mt[i + 1] <= t) i++;
    return lerp(ms[i], ms[i + 1], (t - mt[i]) / Math.max(mt[i + 1] - mt[i], 1e-6));
  };
  const sample = (rt) => {
    rt = clamp(rt, 0, t1 - t0);
    const i = locate(rt), a = out[i], b = out[i + 1] ?? a, h = Math.max(b.rt - a.rt, 1e-6), f = clamp((rt - a.rt) / h), e = f * f * (3 - 2 * f), L = h > LONG;
    const [lat, lon] = posAt(i, rt);
    const s = (k) => (SL[k] && SL[k][i] != null && SL[k][i + 1] != null && !L ? hermite(a[k], b[k], SL[k][i], SL[k][i + 1], f, h) : a[k] + (b[k] - a[k]) * e), both = (k) => (a[k] != null && b[k] != null ? s(k) : a[k] != null && rt - a.rt < 3 ? a[k] : b[k] != null && b.rt - rt < 3 ? b[k] : null);
    const altAt = (x) => hermite(a.alt, b.alt, SL.alt[i], SL.alt[i + 1] ?? 0, x, h), f0 = Math.max(f - .002, 0), f1 = Math.min(f + .002, 1), va = (altAt(f1) - altAt(f0)) / Math.max((f1 - f0) * h, 1e-6);
    const pitch = lerp(clamp(Math.atan2(va * FT, Math.max(s('gs') * KT, 40)) * R2D + 2, -40, 25), s('pitch'), lerp(a.pitchW, b.pitchW, e)), vs = a.vsKnown && b.vsKnown ? s('vs') : a.vsKnown && f < .5 ? a.vs : b.vsKnown && f >= .5 ? b.vs : va * 60;
    let hdg = (a.hdg + (SL.hdg[i] != null && SL.hdg[i + 1] != null && !L ? hermite(0, shortAngle(a.hdg, b.hdg), SL.hdg[i], SL.hdg[i + 1], f, h) : shortAngle(a.hdg, b.hdg) * e) + 360) % 360, roll = s('roll');
    if (L) {
      const th = tanHdg(i, rt), h1 = tanHdg(i, rt - 2), h2 = tanHdg(i, rt + 2);
      if (th != null) hdg = th;
      if (h1 != null && h2 != null) roll = lerp(roll, clamp(Math.atan(s('gs') * KT * shortAngle(h1, h2) / 4 * D2R / 9.8) * R2D, -35, 35), smooth(Math.min(rt - a.rt, b.rt - rt) / 8));
    }
    const posQ = f < 1e-3 ? a.posQ : b.posQ === 'modelled' ? 'modelled' : L && /^(radar|recorded|reported)$/.test(a.posQ) ? 'derived' : a.posQ;
    return { lat, lon: ((lon + 540) % 360 + 360) % 360 - 180, altFt: Math.max(altAt(f), 0), alt: Math.max(altAt(f), 0) * FT, hdg, pitch, roll, aoa: both('aoa'), ias: a.ias != null && b.ias != null ? s('ias') : null, gs: s('gs'), vs, q: a.q, posQ, elevL: both('elevL'), elevR: both('elevR'), known: { pitch: a.pitchKnown, roll: a.rollKnown && !L, aoa: a.aoaKnown, ias: a.iasKnown, alt: a.altKnown, vs: a.vsKnown }, sources: a.sources };
  };
  return { raw, direct, src, pts: out, events, after, before, t0, t1, dur: t1 - t0, storyLen, realOf, storyOf, sample, stops: ms, hasHdg };
}

export function attachStory(sim, story, timing) {
  const est = (b) => b.text.split(/\s+/).length / 2.45 + .35;
  const beats = story.beats.map((b, i) => {
    const seg = timing?.beats?.[i];
    const rt = b.t === 'end' ? sim.dur : clamp(Date.parse(b.t) / 1000 - sim.t0, 0, sim.dur);
    const a0 = seg?.start ?? null, narr = seg ? seg.end - seg.start : est(b);
    const events = (b.e || []).map((n) => sim.raw.events?.find((x) => x.title === n)).filter(Boolean);
    return { ...b, rt, a0, narr, anchors: seg?.anchors, len: narr + (b.gap ?? .45), events, sources: [...new Set(events.flatMap((e) => e.sources || []))], quality: events[0]?.quality, est: (b.e || []).some((n) => sim.direct.eventTimes?.[n]) };
  });
  let c = 0; for (const b of beats) { b.s = c; c += b.len; }
  const len = c, flightEnd = beats.findIndex((b) => b.t === 'end');
  const lastFlight = flightEnd < 0 ? beats.length - 1 : flightEnd - 1, F = beats.slice(0, lastFlight + 1), Z = F[lastFlight];
  F.forEach((B, i) => { B.r0 = B.lead ? Math.max(B.rt - B.lead, i ? F[i - 1].rt : 0) : B.rt; });
  if (Z && Z.lead == null && sim.dur - Z.rt < Math.max(Z.len, 8)) Z.r0 = Math.max(sim.dur - Math.max(Z.len, 8), lastFlight ? (F[lastFlight - 1].rt + Z.rt) / 2 : 0);
  const RT = story.maxRate ?? 1.6;
  F.forEach((B, i) => {
    B.r1 = i < lastFlight ? F[i + 1].r0 : sim.dur; const S = Math.max(B.r1 - B.r0, 0);
    if (i === lastFlight) {
      B.uEnd = sim.direct.endTitle ? 1 : clamp((B.len - 1.3) / B.len, .5, 1); const L = B.len * B.uEnd;
      if (B.v === 'map' || S <= L * RT) { B.w0 = B.r0; B.rate = S / L; } else { B.rate = 1; B.w0 = B.shots?.some((x) => x.t) ? Math.min(B.r0, sim.dur - L) : sim.dur - L; }
      return;
    }
    B.w0 = B.r0; B.rate = B.v === 'map' || B.lapse || S <= B.len * RT ? S / B.len : 1;
    if (B.at && B.rate === 1) B.w0 = clamp(Date.parse(B.at) / 1000 - sim.t0 - (B.atLead ?? 2), B.r0, B.r1 - B.len);
    if (B.v === 'map' && B.then) { B.sw = Math.max(3.5, B.len * .45); const tail = Math.min(B.len - B.sw, S); B.rate = (S - tail) / B.sw; B.rate2 = 1; }
  });
  const wordTimes = (B) => {
    if (B._wt) return B._wt;
    const T = B.text.split(/\s+/), C = [0]; for (const w of T) C.push(C[C.length - 1] + w.length + 1.5);
    const W = C[C.length - 1], A = B.anchors?.length > 1 ? B.anchors : [[0, 0], [1, B.narr]];
    const at = (c) => { let k = 1; while (k < A.length - 1 && A[k][0] < c) k++; const [c0, t0] = A[k - 1], [c1, t1] = A[k]; return c1 > c0 ? t0 + (t1 - t0) * clamp((c - c0) / (c1 - c0)) : t1; };
    return (B._wt = T.map((_, k) => at(C[k] / W)));
  };
  const wordAt = (B, at) => {
    if (typeof at === 'number') return at;
    const T = B.text.split(/\s+/), N = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, ''), A = String(at).split(/\s+/).map(N), i = T.findIndex((_, k) => A.every((a, j) => N(T[k + j] || '').startsWith(a)));
    return i < 0 ? 0 : wordTimes(B)[i];
  };
  sim.wordAt = wordAt; sim.wordTimes = wordTimes;
  beats.forEach((B) => { if (B.shots) B.shots = B.shots.map((x) => ({ ...x, u: clamp(wordAt(B, x.at ?? 0), 0, B.len) })).sort((a, b) => a.u - b.u); });
  F.forEach((B) => {
    if (!B.shots) return;
    const cap = B === Z ? sim.dur : B.r1, segs = [{ u: 0, w: B.w0, rate: B.rate }];
    for (const x of B.shots) if (x.t) { const P = segs[segs.length - 1], now = P.w + P.rate * (x.u - P.u), w = Math.min(Date.parse(x.t) / 1000 - sim.t0 - (x.tLead ?? 0), cap); if (w > now + .05) segs.push({ u: x.u, w, rate: x.rate ?? 1 }); }
    if (segs.length > 1) B.segs = segs;
  });
  const endOf = (P) => { if (!P.segs) return Math.min(P.w0 + P.rate * P.len, P.r1); const g = P.segs[P.segs.length - 1]; return Math.min(g.w + g.rate * (P.len - g.u), P.r1); };
  const cuts = [];
  F.forEach((B, i) => {
    if (i) { const end = endOf(F[i - 1]); if (B.w0 - end > 1) cuts.push({ s: B.s, skip: B.w0 - end, from: end, to: B.w0 }); }
    if (B.segs) for (let k = 1; k < B.segs.length; k++) { const P = B.segs[k - 1], g = B.segs[k], end = P.w + P.rate * (g.u - P.u); if (g.w - end > 1) cuts.push({ s: B.s + g.u, skip: g.w - end, from: end, to: g.w }); }
  });
  sim.cuts = cuts;
  sim.beats = beats; sim.storyLen = len; sim.flightEndS = Z.s + Z.len;
  sim.beatAt = (s) => { let k = 0; for (let i = 0; i < beats.length; i++) if (beats[i].s <= s + 1e-6) k = i; return k; };
  sim.realOf = (s) => {
    s = clamp(s, 0, len); const i = sim.beatAt(s), B = beats[i]; if (i > lastFlight) return sim.dur;
    const u = s - B.s;
    if (B.segs) { let g = B.segs[0]; for (const x of B.segs) if (x.u <= u) g = x; return Math.min(g.w + g.rate * (u - g.u), i === lastFlight ? sim.dur : B.r1); }
    if (B.sw != null && u > B.sw) return Math.min(B.w0 + B.rate * B.sw + (u - B.sw), B.r1);
    return Math.min(B.w0 + B.rate * u, i === lastFlight ? sim.dur : B.r1);
  };
  sim.rateAt = (s) => {
    s = clamp(s, 0, len); const i = sim.beatAt(s), B = beats[i]; if (i > lastFlight) return 0;
    const u = s - B.s; if (B.segs) { let g = B.segs[0]; for (const x of B.segs) if (x.u <= u) g = x; return g.rate; }
    return B.sw != null && u > B.sw ? 1 : B.rate;
  };
  sim.storyOf = (t) => {
    t = clamp(t, 0, sim.dur); let i = 0; for (let k = 0; k <= lastFlight; k++) if (F[k].w0 <= t) i = k;
    const B = F[i];
    if (B.segs) { let lo = 0, hi = B.len; for (let k = 0; k < 32; k++) { const m = (lo + hi) / 2; if (sim.realOf(B.s + m) < t) lo = m; else hi = m; } return B.s + hi; }
    if (B.sw != null && t > B.w0 + B.rate * B.sw) return B.s + Math.min(B.sw + t - B.w0 - B.rate * B.sw, B.len);
    return B.s + (B.rate > 0 ? Math.min((t - B.w0) / B.rate, B.len) : 0);
  };
  sim.audioPos = (s) => { const i = sim.beatAt(s), B = beats[i]; if (B.a0 == null) return null; const f = s - B.s; return f <= B.narr ? B.a0 + f : null; };
}

export function pathSamples(sim, n = 600) {
  const a = [];
  for (let i = 0; i <= n; i++) a.push(sim.sample(sim.dur * i / n));
  return a;
}
