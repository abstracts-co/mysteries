import { destination, bearing } from '../geo.js';
export const b = (t, text, e = [], o = {}) => ({ t, text, e, ...o });
export const lerpLine = (a, b, k = 1, n = 48) => { const P = []; for (let i = 0; i <= n; i++) { const f = 1 - (1 - i / n) ** k, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f; P.push([x, y]); } return P; };
export const backTrack = (lat, lon, hdg, t1, segs, v, q) => {
  const out = []; let p = { lat, lon }, h = hdg, t = Date.parse(t1);
  for (const [dur, turn] of [...segs].reverse()) for (let k = 0; k < dur; k++) { if (t % 10000 === 0) out.push({ t_utc: new Date(t).toISOString(), lat: p.lat, lon: p.lon, ...q }); p = destination(p.lat, p.lon, ((h - turn / dur / 2 + 180) % 360 + 360) % 360, v); h -= turn / dur; t -= 1000; }
  out.push({ t_utc: new Date(t).toISOString(), lat: p.lat, lon: p.lon, ...q }); return out;
};
export const arrow = (a, b, km = 28) => { const s = bearing({ lat: a[0], lon: a[1] }, { lat: b[0], lon: b[1] }), L = destination(b[0], b[1], (s + 160) % 360, km * 1000), R = destination(b[0], b[1], (s + 200) % 360, km * 1000); return [a, b, [L.lat, L.lon], b, [R.lat, R.lon]]; };
export const lop = (lat, lon, b, km) => { const a = destination(lat, lon, b, km * 1000), c = destination(lat, lon, (b + 180) % 360, km * 1000); return [[a.lat, a.lon], [lat, lon], [c.lat, c.lon]]; };
export const polys = (raw, ids, color) => ids.map((id) => raw.search_areas?.find((a) => a.id === id)).filter(Boolean).map((a) => ({ points: (a.geometry.type === 'Polygon' ? a.geometry.coordinates[0] : a.geometry.coordinates).map(([x, y]) => [y, x]), color, width: 1.2, opacity: .7, alt: 800, label: a.label, kind: 'search_area', detail: a.method || a.notes || a.label, sources: a.sources, labelAt: .25 }));
export const NOTE_ATT = 'Attitude and speed come from the flight data recorder where the timeline says Recorded.';
