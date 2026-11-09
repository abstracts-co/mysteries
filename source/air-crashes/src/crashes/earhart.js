import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination, bearing } from '../geo.js';

const H = [0.816667, -176.633333], LAE = [-6.731667, 146.996389], NIKU = [-4.672, -174.526], ITASCA = [.8195, -176.618];
const go = (o, brg, km) => { const p = destination(o[0], o[1], brg, km * 1e3); return [p.lat, p.lon]; };
const circle = (km, a0 = 0, a1 = 360, n = 96) => Array.from({ length: n + 1 }, (_, i) => go(H, a0 + (a1 - a0) * i / n, km));
const GC0 = bearing({ lat: LAE[0], lon: LAE[1] }, { lat: H[0], lon: H[1] });
const P0 = [1.45, -177.0], P1 = go(H, 337, 80);
const T = (s) => new Date(Date.parse('1937-07-02T19:12:00Z') + s * 1000).toISOString();
const LOOP_M = 'Illustrative. No position was ever fixed. The path is drawn 80–100 km from Howland, out of sight of the island, because the crew reported they could not see it.';
const ORBIT_M = 'Schematic. The log says she was circling; no centre, radius, bank angle or direction was recorded.';
const loop = (() => {
  const D = Math.PI / 180, kx = 111.32 * Math.cos(H[0] * D), ky = 110.57, ll = ([x, y]) => [H[0] + y / ky, H[1] + x / kx];
  const U = (b) => [Math.sin(b * D), Math.cos(b * D)], Tn = (b) => [Math.cos(b * D), -Math.sin(b * D)], P = (b, d) => U(b).map((c) => c * d), add = (...v) => v.reduce((a, c) => [a[0] + c[0], a[1] + c[1]]), mul = (v, k) => [v[0] * k, v[1] * k];
  const W = 50, K0 = 780, OD = 600, semi = (b, k) => (f) => add(P(b, 89.5), mul(U(b), -9.5 * k * Math.cos(f * Math.PI)), mul(Tn(b), 9.5 * k * Math.sin(f * Math.PI)));
  const SEG = [[80 * W * D, (f) => P(330 + W * f, 80)], [9.5 * Math.PI, semi(330 + W, 1)], [99 * W * D, (f) => P(330 + W - W * f, 99)], [9.5 * Math.PI, semi(330, -1)], [80 * 7 * D, (f) => P(330 + 7 * f, 80)]];
  const L = SEG.reduce((a, s) => a + s[0], 0), v = L / (3660 - OD), pos = (s) => { for (const [n, f] of SEG) { if (s <= n) return f(s / n); s -= n; } return P(337, 80); };
  const pt = (s, p, method) => ({ t_utc: T(s), lat: ll(p)[0], lon: ll(p)[1], alt_ft: 1000, quality: 'modelled', method, sources: method === ORBIT_M ? ['s2', 's10'] : ['s2', 's7', 's10'] });
  const out = [], bq = 330 + v * K0 / 80 / D, r = v * OD / (2 * Math.PI), Q = pos(v * K0), O = add(Q, mul(U(bq), r));
  for (let k = 60; k < 3660; k += 60) if (k <= K0 || k >= K0 + OD) out.push(pt(k, pos(v * (k <= K0 ? k : k - OD)), LOOP_M));
  for (let k = K0 + 20; k < K0 + OD; k += 20) { const a = 2 * Math.PI * (k - K0) / OD; out.push(pt(k, add(O, mul(U(bq), -r * Math.cos(a)), mul(Tn(bq), r * Math.sin(a))), ORBIT_M)); }
  return out;
})();

export const story = { beats: [
  b('1937-07-02T00:00:00Z', 'Lae, New Guinea, July second, 1937. Amelia Earhart and her navigator, Fred Noonan, take off for Howland Island, a strip of land about two kilometers long, thousands of kilometers away. Only a few legs of a flight around the world remain.', ['Departure from Lae'], { v: 'follow', az: 205, el: 4, zoom: 3, at: '1937-07-02T00:02:30Z', atLead: 0, shots: [{ at: 8.25, v: 'map', t: '1937-07-02T00:02:38.5Z', rate: 2460 }] }),
  b('1937-07-02T07:18:00Z', 'Seven hours out, Lae hears its last report. They are above the clouds.', ['Last report heard at Lae'], { v: 'follow', az: 30, el: 3, zoom: 2.4, sfx: 'radio', shots: [{ at: .3, v: 'follow', az: 30, el: 3, zoom: 2.4 }] }),
  b('1937-07-02T14:15:00Z', 'Through the night, the Coast Guard ship Itasca waits at Howland. Its radio picks up a voice through static, too faint to use.', ['Itasca hears unreadable voice'], { v: 'map', lead: 12062, bright: 3, sfx: 'radio' }),
  b('1937-07-02T17:44:00Z', 'Morning. Earhart asks Itasca for a bearing, and estimates she is 200 miles out. About half an hour later, she says 100 miles. Itasca cannot get a direction on that frequency.', ['Crew asks for radio bearing', 'Another bearing request', 'Itasca explains bearing limitation'], { v: 'follow', az: 200, el: 5, zoom: 3, lead: 1.3, sfx: 'radio', shots: [{ at: .3, v: 'follow', az: 200, el: 5, zoom: 3 }, { at: 3.69, v: 'map', t: '1937-07-02T17:44:02.6Z', rate: 411 }] }),
  b('1937-07-02T19:12:00Z', 'She reports flying at 1,000 feet, and low on fuel. She cannot see the ship.', ['Island remains out of sight', 'Fuel warning differs between logs'], { v: 'follow', az: 190, el: 10, zoom: 2, lead: 960, at: '1937-07-02T19:12:00Z', atLead: 0, gap: 3, sfx: 'radio', captions: [{ text: '…CANNOT SEE U BUT GAS IS RUNNING LOW', who: 'Itasca radio log, 07:42 ship time', at: 1.8, until: 3.8 }], shots: [{ at: .3, v: 'follow', az: 190, el: 10, zoom: 2 }, { at: 4.47, v: 'pilot', look: [0, -2, 44], lookAt: 0 }] }),
  b('1937-07-02T19:30:00Z', 'She hears the ship\'s signals now, but cannot use them to find its direction. The ship is sending smoke, and calling. Neither can find the other.', ['Circling and requesting a signal', 'Signal heard but bearing fails'], { v: 'follow', gap: 3, sfx: 'radio', captions: [{ text: '…UR SIGS BUT UNABLE TO GET A MINIMUM', who: 'Itasca radio log, 08:00 ship time', at: 2, until: 5 }], shots: [{ at: 0, v: 'map', frame: [1.0, -176.75, 700e3] }, { at: 8.14, v: 'follow', az: 200, el: 7, zoom: 4, orbit: 0 }, { at: 8.44, v: 'follow', az: 200, el: 7, zoom: 4, orbit: 0 }] }),
  b('1937-07-02T20:13:00Z', 'Her last clear message is entered in the log. "We are on the line 157 337." She gives no point of reference. Then nothing that can be understood.', ['Final call in the rough log', 'Itasca listens on another frequency'], { v: 'follow', az: 100, el: 6, zoom: 1.5, gap: 3, sfx: 'radio', end: 1, captions: [{ text: 'WE ARE ON THE LINE 157 337', type: true, at: 3.1, until: 7.55 }], shots: [{ at: 7.55, v: 'map', frame: [1.0, -176.7, 900e3] }] }),
  b('end', 'The Navy search found no trace and concluded they were lost at sea. Others believe that line led them to Nikumaroro, 650 kilometers to the southeast, where bones were found in 1940, then lost. Neither idea has been proven. A sonar image in 2024 proved to be rock. A lagoon target in 2026 was judged likely to be tree debris. The aircraft has never been found.', ['The official search ends', 'Bones found on Gardner', 'Sonar target proves to be rock', 'Taraia aircraft claim fails field inspection'], { shots: [{ at: 0, frame: [.9, -177.0, 1000e3] }, { at: 4.08, frame: [-2.0, -175.6, 2400e3], mapSpeed: .8 }, { at: 12.21, frame: [-4.6, -174.6, 700e3] }, { at: 15.05, frame: [-2.0, -175.7, 2700e3], mapSpeed: 2.2 }, { at: 17.08, frame: [.82, -176.63, 1200e3] }, { at: 21.34, frame: [-4.6, -174.55, 600e3] }, { at: 26.05, frame: [-2.0, -175.8, 3000e3] }] }),
] };

const LOW_M = 'Illustrative path. Collopy (s9): the runway ran toward the sea; the aircraft sank to about 5–6 ft above the water and had not climbed above 100 ft before it went out of sight. Track and times not recorded.';
const ITASCA_D = 'The Coast Guard cutter Itasca waited at Howland Island as the radio guard ship, and made smoke that morning. Its exact position is not shown; the label marks Howland.';
export const direct = {
  aircraft: 'electra', start: false, end: false, localFrom: '1937-07-02T19:05:00Z', az: 235, el: 8, routeAlt: 9000e3, fitDest: true, endTitle: 'Not found', navLights: false, cruiseKt: 140, cruiseFt: 10000, planned: true,
  epilogue: [-2.9, -175.6, 2600e3],
  drop: (p) => p.t_utc !== '1937-07-02T07:20Z',
  add: [
    { t_utc: '1937-07-02T00:00:30Z', lat: go(LAE, 140, 1)[0], lon: go(LAE, 140, 1)[1], alt_ft: 10, quality: 'modelled', method: LOW_M, sources: ['s9', 's34'] },
    { t_utc: '1937-07-02T00:03:00Z', lat: go(LAE, 137, 8.8)[0], lon: go(LAE, 137, 8.8)[1], alt_ft: 80, quality: 'modelled', method: LOW_M, sources: ['s9', 's34'] },
    { t_utc: '1937-07-02T00:30:00Z', lat: go(LAE, GC0, 120)[0], lon: go(LAE, GC0, 120)[1], alt_ft: 7000, quality: 'modelled', method: 'Illustrative climb. The first height report is 7,000 ft at 04:18 (s8).', sources: ['s8'] },
    { t_utc: '1937-07-02T10:30:00Z', lat: -1.666667, lon: 166.75, alt_ft: 10000, quality: 'modelled', method: 'Illustrative. Nauru relayed a report of a ship in sight; the position is the Navy’s estimate for that ship. No aircraft position or height was reported.', sources: ['s6'] },
    { t_utc: '1937-07-02T17:45:00Z', lat: .1923, lon: -179.4888, alt_ft: 8000, quality: 'modelled', method: 'Illustrative: placed on the planned great circle at the reported range; the crew gave no bearing and no mile unit.', sources: ['s2', 's10'] },
    { t_utc: '1937-07-02T18:16:00Z', lat: .4633, lon: -178.25, alt_ft: 8000, quality: 'modelled', method: 'Illustrative: placed on the planned great circle at the reported range; the crew gave no bearing and no mile unit.', sources: ['s2', 's10'] },
    { t_utc: '1937-07-02T19:12:00Z', lat: P0[0], lon: P0[1], alt_ft: 1000, quality: 'modelled', method: 'Illustrative: logged 1000 ft and unable to see the island; no position was ever fixed.', sources: ['s6'] },
    ...loop,
    { t_utc: '1937-07-02T20:13:00Z', lat: P1[0], lon: P1[1], alt_ft: 1000, quality: 'modelled', method: 'Illustrative point on the 157/337 line, drawn through Howland, 80 km out. The crew gave no reference point, and the aircraft was never located.', sources: ['s6'] },
  ],
  fx: [
    { type: 'tag', t: '1937-07-02T00:02:30Z', until: '1937-07-02T00:02:34Z', text: 'Leaving Lae, New Guinea · 10:00 local', cls: 'q' },
    { type: 'tag', t: '1937-07-02T00:02:34.2Z', until: '1937-07-02T00:02:38Z', text: 'Height illustrative · Collopy: under 100 ft' },
    { type: 'tag', at: go(LAE, GC0, 2061), t: '1937-07-02T03:12:00Z', until: '1937-07-02T07:17:59Z', text: 'Lae to Howland · about 4,100 km' },
    { type: 'ping', t: '1937-07-02T07:18:01.3Z', text: 'Last report heard at Lae · above cumulus · rings schematic', life: 4 },
    { type: 'tag', t: '1937-07-02T10:54:00Z', until: '1937-07-02T14:12:30Z', text: 'Position illustrative · none reported' },
    { type: 'ping', t: '1937-07-02T14:15:00Z', text: 'Unreadable voice · attributed to the aircraft', life: 4 },
    { type: 'ping', t: '1937-07-02T17:44:00Z', text: 'Asks for a bearing on 3105 kHz', life: 3.5 },
    { type: 'tag', t: '1937-07-02T17:54:00Z', until: '1937-07-02T18:31:30Z', text: 'Position illustrative · drawn on planned route' },
    { type: 'ping', t: '1937-07-02T19:30:00.4Z', text: 'Signals heard · no direction · rings schematic', life: 4.6 },
    { type: 'tag', t: '1937-07-02T19:30:05.1Z', until: '1937-07-02T19:30:08Z', text: 'Position illustrative · out of sight of Howland' },
    { type: 'tag', t: '1937-07-02T20:12:55.1Z', text: 'Position never known · drawn point illustrative', cls: 'q' },
  ],
  env: { layers: [{ base_ft: 2500, top_ft: 6500, cover: .55, density: .6, flat: .2, scale: .05 }], sea: .4, radiusKm: 340, center: [.6, -176.6], follow: true, nightLights: 0, globalClouds: .4 },
  overlays: () => [
    { points: [ITASCA], only: [3], from: 10.7, label: 'Itasca: no bearing on 3105 kHz', kind: 'landmark', detail: 'At 18:48 UTC Itasca radioed that it could not take a bearing on 3105 kHz and asked for 500 kHz, or whether Earhart wanted to take a bearing on the ship. The log gives no answer. The label marks Howland, not the ship’s exact position.', sources: ['s2', 's10'] },
    { points: [ITASCA], only: [5], from: 5.8, label: 'Itasca making smoke, calling', kind: 'landmark', detail: 'Itasca made smoke that morning and kept transmitting. When and how much smoke was made is not recorded. The label marks Howland, not the ship’s exact position.', sources: ['s7', 's2'] },
    { points: [ITASCA], only: [6], from: 10.5, label: 'Itasca on 6210 kHz · no reply', kind: 'landmark', detail: 'Itasca kept calling, listened on 6210 kHz and tried to keep Earhart on 3105 kHz. No further intelligible reply appears in these entries.', sources: ['s3', 's10'] },
    { points: [ITASCA], only: [2, 3, 5, 6], label: 'Itasca waits at Howland', kind: 'landmark', detail: ITASCA_D, sources: ['s7'] },
    ...[[322, 370, 3.9, 'About 200 miles · unit not stated · no direction', '17:45 UTC: the crew estimated about 200 miles out, with no bearing. The mile unit was not stated, so the band runs from 322 km (statute) to 370 km (nautical).'], [161, 185, 8.37, 'About 100 miles · no direction', '18:16 UTC: the crew estimated about 100 miles out, again with no bearing. The band runs from 161 km (statute) to 185 km (nautical).']].flatMap(([a, c, from, label, detail]) => [
      { points: circle(a), closed: true, dashed: true, color: [1, .86, .55], width: 0, opacity: 1, alt: 1500, only: [3], from, draw: 1, sources: ['s2', 's10'] },
      { points: circle(c), closed: true, dashed: true, color: [1, .86, .55], width: 0, opacity: 1, alt: 1500, only: [3], from, draw: 1, label, labelAt: .055, kind: 'landmark', detail, sources: ['s2', 's10'] },
    ]),
    { points: lop(H[0], H[1], 157, 520), color: [.5, .78, 1], width: 1.4, opacity: .85, only: [6, 7], label: 'Drawn through Howland · no reference point', labelAt: .45, detail: 'The crew reported flying on this line. They did not say what it passes through, so it is drawn through Howland, their destination.', sources: ['s6'] },
    ...[67, 247].map((brg, i) => { const c = go(H, brg, 120); return { points: lop(c[0], c[1], 157, 520), color: [.5, .78, 1], width: 0, opacity: .8, dashed: true, only: [6], from: 8.1, draw: .8, ...(i ? {} : { label: 'Same line, elsewhere · Illustrative', labelAt: .55 }), detail: 'The same 157/337 bearing drawn 120 km either side of Howland. Without a reference point, the line could lie anywhere across its width.', sources: ['s6'] }; }),
    { points: [H, go(H, 157, 660)], color: [1, .72, .42], width: 1.2, opacity: .85, dashed: true, only: [7], from: 5.84, draw: 2.7, label: 'Line extended southeast · hypothesis', labelAt: .5, kind: 'landmark', detail: 'The 157/337 line extended southeast. It passes about 20 km from Nikumaroro, 654 km from Howland. That the crew followed it there is a hypothesis, not a finding.', sources: ['s16', 's18'] },
    { points: [H], only: [7], label: 'Navy search · lost at sea · no position', kind: 'landmark', detail: 'The Navy search ended on July 18 after 1,654 aircraft hours. It found no trace and inferred the fliers were lost at sea; it fixed no position.', sources: ['s6'] },
    { points: circle(161, 0, 360, 72), closed: true, color: [.86, .88, .95], width: 1, opacity: .5, dashed: true, only: [7], from: 17.3, draw: 1, label: 'Sonar target 2024 · rock · about 100 mi out · ring schematic', labelAt: 0, kind: 'landmark', detail: 'Deep Sea Vision publicized a 2023 sonar target in January 2024, about 100 miles from Howland Island; no direction or position was published. In November 2024 it reported the target was a natural rock formation. The ring only shows that distance and is schematic.', sources: ['s21', 's22'] },
    { points: [[-4.665, -174.52]], only: [7], from: 21.4, label: 'Taraia lagoon target 2026 · likely tree debris · place approximate', kind: 'landmark', detail: 'Inspected in October 2026 and reported as likely large trees with a carbonate coating. No survey coordinate was published; the label sits on the island.', sources: ['s24'] },
    { points: [NIKU], only: [7], from: 12.5, label: 'Bones (1940) · since lost · identity unresolved', kind: 'landmark', detail: 'In 1940 colonial officials investigated a partial skeleton found on Gardner, now Nikumaroro. The bones are lost; the find spot and identity were never established.', sources: ['s15', 's13', 's14'] },
  ],
  viewPaths: { [`nikumaroro`]: [[.816667, -176.633333], [-4.672, -174.526]] },
  buildNote: 'There is no recorder or radar. The positions after 07:20 UTC are illustrative: the crew gave distances and one line, never a position. The takeoff path and climb are illustrative, after Collopy’s account of a low departure over the sea. The 17:45 and 18:16 points are placed at the reported ranges on the planned great circle. After 19:12 the path is a schematic search pattern 80–100 km from Howland, with one 10-minute circle for the logged circling. Radio rings and range bands are schematic. Radio contacts near Howland are from the Itasca logs; the Lae reports are from Chater and Collopy; the 10:30 Nauru report is a relayed account preserved in later records. Howland is too small to show in the base imagery.',
};
