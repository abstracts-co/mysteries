import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';

const T = (s) => Date.parse(s);
const keys = (K) => K.slice(0, -1).map(([u, t, x], i) => ({ ...x, at: u, t: new Date(T(t) + 60 * (i + 1)).toISOString(), rate: (T(K[i + 1][1]) - T(t)) / 1000 / (K[i + 1][0] - u) }));

export const story = { beats: [
  b('2014-03-07T16:41:43Z', 'Kuala Lumpur, about forty minutes after midnight on March eighth, 2014. Malaysia Airlines 370 departs for Beijing with 239 people aboard.', ['Departure recorded'], { v: 'map', then: 1, az: 200, el: 6, zoom: 1.4 }),
  b('2014-03-07T17:07:56Z', 'The crew reports cruising at 35,000 feet. No problem is announced.', ['Cruise level reported again'], { v: 'captain', sfx: 'radio', look: [-16, -19.5, 17], lookAt: .6 }),
  b('2014-03-07T17:19:30Z', 'Controllers hand the flight over to Ho Chi Minh. The captain\'s reply is the last recorded voice transmission from this aircraft. "Good night, Malaysian Three Seven Zero."', ['Last recorded radio acknowledgement'], { v: 'follow', az: 250, el: 3, zoom: 1.9, lead: 10, gap: 2, sfx: 'radio' }),
  b('2014-03-07T17:20:34Z', 'Just over a minute later, near a waypoint called Igari, the last position broadcast goes out. Its symbol soon disappears from the controllers\' screens.', ['Last decoded ADS-B report', 'Secondary radar symbol disappeared'], { v: 'map', frame: [6.98, 103.38, 540e3], lead: 5, gap: 2,
    shots: keys([[0, '2014-03-07T17:20:29Z'], [6.2, '2014-03-07T17:20:35.2Z'], [7.27, '2014-03-07T17:21:13Z'], [9.4, '2014-03-07T17:22:30Z'], [11.98, '2014-03-07T17:22:40Z']]),
     }),
  b('2014-03-07T17:30:33Z', 'But military radar is still watching. The aircraft has turned back across Malaysia, with no further recorded voice transmission.', ['Primary return near Kota Bharu', 'Secondary radar symbol disappeared'], { v: 'map', frame: [6.25, 101.9, 1100e3], lead: 470,
    shots: keys([[0, '2014-03-07T17:22:43Z', { frame: [6.8, 103.15, 620e3] }], [3.5, '2014-03-07T17:27:00Z', { frame: [6.8, 103.15, 620e3] }], [4.6, '2014-03-07T17:28:13Z'], [6.5, '2014-03-07T17:30:20Z'], [9.2, '2014-03-07T17:44:00Z']]) }),
  b('2014-03-07T17:52:27Z', 'Near Penang, the first officer\'s phone registers with the network. There is no call and no message.', ['Phone registered near Penang'], { v: 'map', frame: [5.65, 99.3, 850e3], lead: 387,
    shots: keys([[0, '2014-03-07T17:46:00Z'], [2.3, '2014-03-07T17:52:15Z'], [3.3, '2014-03-07T17:52:45Z'], [7.19, '2014-03-07T18:20:11.5Z']]) }),
  b('2014-03-07T18:22:12Z', 'Northwest of Sumatra, military radar sees it one last time. This is the last position that exists.', ['Last military radar return'], { v: 'map', frame: [5.75, 97.1, 1000e3], lead: 120, gap: 2,
    shots: keys([[0, '2014-03-07T18:20:12Z'], [3.4, '2014-03-07T18:22:02Z'], [4.2, '2014-03-07T18:22:16Z'], [9.48, '2014-03-07T18:25:23.5Z']]) }),
  b('2014-03-07T18:25:27Z', 'Three minutes later, the satellite terminal logs back on, probably after a power interruption. What interrupted the satellite link is unknown.', ['Satellite terminal logged on'], { v: 'follow', az: 225, el: 8, zoom: 1.8, lead: 3 }),
  b('2014-03-07T18:39:52Z', 'The airline calls the aircraft by satellite. The equipment responds. No one picks up.', ['First satellite call went unanswered'], { v: 'follow', lead: 5, gap: 2, sfx: 'radio', shots: [{ at: 0, v: 'map', fit: ['Satellite', 'Ground station'], fitMin: 5800e3 }] }),
  b('2014-03-07T19:41:02Z', 'From here, there is no picture of this flight. There is only a brief automatic signal, about once an hour, which places the aircraft somewhere on a curve. The path you are watching is one published model of where it went, among many.', ['Satellite handshake 2', 'Satellite handshake 3'], { v: 'map', frame: [-7.5, 97.5, 6900e3], lead: 3660,
    shots: keys([[0, '2014-03-07T18:40:02Z'], [4.4, '2014-03-07T19:40:50Z'], [5.4, '2014-03-07T19:41:15Z'], [9.2, '2014-03-07T20:40:50Z'], [10.2, '2014-03-07T20:41:20Z'], [15.51, '2014-03-07T21:27:59.5Z']]),
     }),
  b('2014-03-07T21:30:00Z', 'On the ground, Kuala Lumpur activates its rescue center, hours after the last contact.', ['Rescue coordination centre activated'], { v: 'map', lead: 120, frame: [-5.5, 98.5, 6800e3],
    shots: keys([[0, '2014-03-07T21:28:00Z'], [1.9, '2014-03-07T21:30:00Z'], [6.09, '2014-03-07T21:41:00Z']]) }),
  b('2014-03-07T23:13:58Z', 'A second satellite call goes unanswered.', ['Second satellite call went unanswered'], { v: 'follow', az: 300, el: 8, zoom: 1.9, lead: 2, gap: 1.5, sfx: 'radio' }),
  b('2014-03-08T00:10:59Z', 'Dawn is reaching the southern Indian Ocean. The aircraft answers one more routine satellite check.', ['Sixth arc response received'], { v: 'follow', az: 80, el: 3, zoom: 1.8, lead: 570, shots: [{ at: 2.96, t: '2014-03-08T00:10:57.4Z', az: 70, el: 5, zoom: 1.7 }],
     }),
  b('2014-03-08T00:19:29Z', 'Eight minutes later, it asks to reconnect. Those last transmissions suggest a rapid descent. They do not say when or where it ended. After this, there is nothing.', ['Final log-on request received', 'Last aircraft transmission received'], { v: 'follow', az: 60, el: 20, zoom: 4.5, end: 1, hidePins: ['CSIRO conditional debris origin', 'UGIB last estimated position'],
    shots: [{ at: 'They do not', v: 'map', frame: [-35.3, 93.4, 1900e3], mapSpeed: 1.4 }],
     }),
  b('end', 'In 2015, a wing part washed up on Réunion Island. More debris followed, on shores across the western Indian Ocean. The first seabed search covered over 120,000 square kilometers. Another surveyed over 112,000, partly overlapping it, and further surveys continued in 2026. They have not found the aircraft. Investigators say the turn back was likely made by hand. Who did it, and why, is not known.', ['Flaperon found on Réunion', 'Government-led underwater search suspended', 'Ocean Infinity search ended', 'Search results reported to families', 'Safety report left cause undetermined'], { hidePins: ['CSIRO conditional debris origin', 'UGIB last estimated position'],
    shots: [
      { at: 'Réunion', frame: [-20.5, 54, 3200e3], mapSpeed: 1.3 },
      { at: 'More debris', frame: [-22.5, 51, 6500e3], mapSpeed: 1.1 },
      { at: 'The first seabed', frame: [-37, 92, 2600e3], mapSpeed: 1.1 },
      { at: 'Investigators', frame: [-6, 96, 15000e3], mapSpeed: .9 },
    ],
     }),
] };

const UGIB = (raw) => (raw.perspectives || []).find((p) => p.id === 'ugib')?.track_override?.filter((x) => x.lat != null) || [];
const upTo = (P, a, z) => { const A = T(a), Z = T(z), at = (t) => { for (let i = 0; i < P.length - 1; i++) { const p = P[i], q = P[i + 1], tp = T(p.t_utc), tq = T(q.t_utc); if (t >= tp && t <= tq) { const k = (t - tp) / Math.max(tq - tp, 1); return [p.lat + (q.lat - p.lat) * k, p.lon + (q.lon - p.lon) * k]; } } return t < T(P[0].t_utc) ? [P[0].lat, P[0].lon] : [P.at(-1).lat, P.at(-1).lon]; };
  return [at(A), ...P.filter((p) => T(p.t_utc) > A && T(p.t_utc) < Z).map((p) => [p.lat, p.lon]), at(Z)]; };
const pin = (lat, lon, label, only, o = {}) => ({ points: [[lat, lon]], label, only, kind: 'landmark', ...o });
const MODEL = 'Drawn where the Inmarsat example path (Ashton et al., 2014) places the aircraft at that time. The position is modelled; the signal time is recorded.';

export const direct = {
  places: ['Kuala Lumpur', 'Beijing'],
  futureFrom: 9, pinFrom: { 'kind:debris': 'end' },
  aircraft: 'b777', start: false, end: false, localFrom: 1e9, az: 225, el: 8, routeAlt: 9000e3, fitDest: false, endTitle: 'Not found', planned: false, epilogue: [-22, 85, 11000e3],
  cruiseFt: 35000, cruiseKt: 470,
  pathPersp: 'Inmarsat illustrative path',
  fx: [
        ...['17:20:30.195', '17:20:30.664', '17:20:30.859', '17:20:31.664', '17:20:32.195', '17:20:32.601', '17:20:33.101', '17:20:33.609', '17:20:34.148', '17:20:34.555'].map((t) => ({ type: 'ping', t: `2014-03-07T${t}Z`, text: '', life: 1.1 })),
    { type: 'ill', t: '2014-03-07T17:20:29Z', until: '2014-03-07T17:20:34.6Z' },
    { type: 'ping', t: '2014-03-07T17:52:27Z', text: '', life: 2.2 },
    { type: 'ping', t: '2014-03-07T18:22:12Z', text: '', life: 3 },
    { type: 'link', t: '2014-03-07T18:25:27.421Z', text: 'Log-on request · 18:25:27 · beam schematic', life: 6 },
    { type: 'link', t: '2014-03-07T18:39:52.907Z', text: 'Call not answered · 18:39:52', life: 2.4 },
    { type: 'link', t: '2014-03-07T19:41:02.906Z', text: 'Handshake 2', ping: 1, life: 1.2 },
    { type: 'link', t: '2014-03-07T20:41:04.904Z', text: 'Handshake 3', ping: 1, life: 1.2 },
    { type: 'link', t: '2014-03-07T23:13:58.407Z', text: 'Call not answered · 23:13:58 · beam schematic', life: 1.8 },
    { type: 'link', t: '2014-03-08T00:10:59.928Z', text: 'Handshake 6 · beam schematic', ping: 1, life: 1.6 },
  ],
  env: { layers: [{ base_ft: 2500, top_ft: 5500, cover: .16, density: .35, flat: .5, scale: .05 }], sea: .75, radiusKm: 500, center: [-33, 93], follow: true, nightLights: .3 }, nightExposure: 2.2, fill: .6,
  overlays: (raw) => {
    const rt = raw.route || {}, wp = (rt.planned_waypoints || []).filter((w) => w.lat != null), W = (n) => wp.find((w) => w.name === n);
    const mil = (raw.radar_geometries || []).find((g) => g.label === 'Air Defense Radar Path'), parts = (mil?.geometry?.coordinates || []).filter((p) => p.length > 1 && (p[0][0] !== p.at(-1)[0] || p[0][1] !== p.at(-1)[1])), longest = parts.reduce((a, p) => (p.length > (a?.length || 0) ? p : a), null);
    const U = UGIB(raw), oi = polys(raw, ['oi2018_display'], [.84, .74, 1])[0];
    const ugib = { color: [.86, .86, .92], width: 1.2, opacity: .75, dashed: true, alt: 1200, kind: 'landmark', detail: (raw.perspectives || []).find((p) => p.id === 'ugib')?.ending?.description, sources: ['s20'] };
    const relay = (pts, only, from, draw, color, alt, label) => ({ points: pts, only, from, draw, color, width: 1.4, opacity: .9, alt, label, labelAt: .5, kind: 'signal', detail: 'Schematic signal path. The ground station set up the call through the satellite; the aircraft terminal exchanged signalling but the call was not answered (s5 p.40). Timing of the drawn pulses is schematic.', sources: ['s5'] });
    const PER = [-31.95, 115.86], SAT = [0, 64.5], AC = [7.515, 94.406], GC = [-7.21, 73.61];
    const ARC = { color: [.35, .95, .82], width: 1.6, labelAt: .5, detail: 'Satellite data places the aircraft somewhere on this curve at 00:19:29 UTC. It is a range from the satellite, not a position.', sources: raw.seventh_arc?.sources }, arc = (lo, hi) => (raw.seventh_arc?.geometry?.coordinates || []).filter(([x, y]) => y < hi && y > lo).map(([x, y]) => [y, x]);
    const drift = [[[-28, 74], [-24.5, 66], [-21.3, 57.5]], [[-31, 72], [-25.5, 62], [-19.5, 50.5]], [[-34, 70], [-29.5, 58], [-25.5, 46]]].map((L, i) => ({ points: [...L.slice(0, -1), ...arrow(L.at(-2), L.at(-1), 160)], only: [14], from: 4.6 + i * .25, draw: 2.2, color: [.78, .86, .96], width: .9, opacity: .5, dashed: true, alt: 900, label: i === 1 ? 'More debris · drift, schematic (CSIRO)' : undefined, labelAt: .5, kind: 'landmark', detail: 'Schematic direction only, not a modelled trajectory or a starting point. CSIRO drift studies describe westward drift from the southern search region toward the western Indian Ocean (s6–s9).', sources: ['s6', 's7', 's8', 's9'] }));
    return [
      { points: [rt.from, ...wp, rt.to].filter((w) => w?.lat != null).map((w) => [w.lat, w.lon]), color: [.8, .82, .9], width: 1, opacity: .5, dashed: true, alt: 1500, label: 'Planned route', labelAt: .55, kind: 'landmark', only: [0], detail: rt.notes, sources: rt.sources },
      { points: ['IGARI', 'BITOD', 'TSN'].map(W).filter(Boolean).map((w) => [w.lat, w.lon]), color: [.8, .82, .9], width: 1, opacity: .5, dashed: true, alt: 1500, kind: 'landmark', only: [3, 4], detail: rt.notes, sources: rt.sources },
      W('IGARI') && pin(W('IGARI').lat, W('IGARI').lon, 'IGARI', [3], { from: 2.2, detail: 'Filed waypoint (s1 Table 2.2B). Lumpur Radar instructed the handover to Ho Chi Minh at 17:19:26; the aircraft reached the IGARI area at 17:20:31.', sources: ['s1'] }),
      pin(6.8107, 103.5242, 'Last voice contact', [10], { from: 4.5, detail: 'The captain\'s "Good night Malaysian Three Seven Zero" (ground-recorded radio, s1). No later voice transmission was recorded.', sources: ['s1'] }),
      pin(7.06, 103.39, 'Turn back', [4], { kind: 'trk0', detail: 'Between 17:20:34 and 17:30:33 there is no timed position. The line joins the fixes; military radar positions of the turnback were published without times (s12).', sources: ['s1', 's12', 's17'] }),
      ...parts.map((p) => ({ points: p.map(([x, y]) => [y, x]), color: [.55, 1, .62], width: 1.1, opacity: .85, dashed: true, alt: 1200, only: [4, 5], label: p === longest ? 'Military radar' : undefined, labelAt: .5, kind: 'radar', detail: mil.method, sources: mil.sources })),
      pin(4.9, 101.55, 'Malaysia', [4]),
      pin(5.41, 100.33, 'Penang', [4]),
      pin(6.5992, 96.31222, 'Last radar position', [6], { from: 3.97, kind: 'radar', detail: 'The official report places the last military radar return about 10 nautical miles beyond MEKAR. Published coordinates differ between sources (s1, s12, s13, s20).', sources: ['s1', 's12', 's13', 's20'] }),
      pin(4.1, 96.9, 'Sumatra', [6]),
      pin(4.4, 99.2, 'Strait of Malacca', [6]),
      pin(...SAT, 'Satellite', [8], { kind: 'signal', detail: 'Geostationary satellite over about 64.5°E. It was in a slightly inclined orbit, so its true position moved about 1–1.6° north and south. Drawn at the point beneath it.', sources: ['s4', 's5'] }),
      relay([PER, GC], [8], .5, .45, [.62, .85, 1], 150e3),
      relay([GC, SAT], [8], .95, .4, [.62, .85, 1], 150e3, 'Ground station'),
      relay([SAT, AC], [8], 1.35, .8, [.62, .85, 1], 150e3),
      relay([AC, SAT], [8], 3.6, .55, [.6, 1, .72], 450e3),
      relay([SAT, GC], [8], 4.15, .4, [.6, 1, .72], 450e3),
      relay([GC, PER], [8], 4.55, .45, [.6, 1, .72], 450e3),
      pin(0, 93.7, '19:41', [9], { from: 4.92, kind: 'signal', detail: `Recorded: BTO 11500 µs, BFO 111 Hz (s5). The timing places the aircraft on an arc, not at a point. ${MODEL}`, sources: ['s5', 's4'] }),
      pin(0, 93.7, '19:41', [10], { kind: 'signal', detail: `Recorded: BTO 11500 µs, BFO 111 Hz (s5). ${MODEL}`, sources: ['s5', 's4'] }),
      pin(-7.5, 92.9, '20:41', [9], { from: 9.7, kind: 'signal', detail: `Recorded: BTO 11740 µs, BFO 141 Hz (s5). The timing places the aircraft on an arc, not at a point. ${MODEL}`, sources: ['s5', 's4'] }),
      pin(-7.5, 92.9, '20:41', [10], { kind: 'signal', detail: `Recorded: BTO 11740 µs, BFO 141 Hz (s5). ${MODEL}`, sources: ['s5', 's4'] }),
      { ...ARC, points: arc(-37, 22), only: [9], from: 9.5, draw: 1.2, label: 'Last arc, 00:19', labelAt: .45 },
      pin(-3.705, 93.24, 'One model path', [9], { from: 12.74, kind: 'landmark', detail: 'The authors call it illustrative: many other routes fit the satellite data, and its endpoint is uncertain (s4).', sources: ['s4'] }),
      pin(3.139, 101.687, 'Kuala Lumpur', [10], { from: 1.83, detail: 'Kuala Lumpur\'s rescue coordination centre was activated after the prolonged loss of contact (s1). Placed at city level.', sources: ['s1'] }),
      U.length > 1 && { ...ugib, points: upTo(U, U[0].t_utc, '2014-03-07T21:03:39Z'), only: [9], from: 12.74, draw: .9, },
      U.length > 1 && { ...ugib, points: upTo(U, '2014-03-07T21:03:39Z', '2014-03-07T21:27:30Z'), only: [9], from: 12.74, draw: 2.77 },
      U.length > 1 && { ...ugib, points: upTo(U, U[0].t_utc, '2014-03-07T21:28:00Z'), only: [10], },
      U.length > 1 && { ...ugib, points: upTo(U, '2014-03-07T21:28:00Z', '2014-03-07T21:41:00Z'), only: [10], from: 0, draw: 6.09 },
      U.length > 1 && { ...ugib, points: upTo(U, '2014-03-07T22:41:22Z', U.at(-1).t_utc), only: [13] },
      { ...ARC, points: arc(-44, -26), only: [13], label: 'Last arc, 00:19', labelAt: .4 },
      { ...ARC, points: arc(-46, -20), only: [14], label: 'Seabed search', labelAt: .45 },
      ...[[13, 7.4], [14, 10.6]].flatMap(([k, from]) => [
        pin(-34.7, 93, 'Inmarsat model, 2014', [k], { from, kind: 'search_area', detail: 'Example last-contact position, not a measured crash location or a recommended search hotspot (s4).', sources: ['s4'] }),
        pin(-34.2342, 93.7875, 'UGIB model, 2020', [k], { from, kind: 'search_area', detail: (raw.perspectives || []).find((p) => p.id === 'ugib')?.ending?.description, sources: ['s20'] }),
        pin(-35.6, 92.8, 'CSIRO drift model, 2017', [k], { from, kind: 'search_area', detail: (raw.perspectives || []).find((p) => p.id === 'drift')?.ending?.description, sources: ['s8'] }),
      ]),
      pin(-21.115, 55.536, 'Réunion Island', [14], { from: 2.9 }),
      ...drift,
      oi && { ...oi, only: [14], from: 15.1, draw: 1.6, label: '2018 search', labelAt: .3 },
    ].filter(Boolean);
  },
  buildNote: 'The last automatic position batch was sent at 17:07 UTC, and the last military radar return was at 18:22 UTC. Neither flight recorder has been recovered, and no position exists after that. From 18:25 the orange path is the Inmarsat illustrative reconstruction (Ashton et al., 2014, Table 9), one of many paths that fit the satellite data. The aircraft is drawn at its last reported cruise level because its altitude is unknown; the story stops at the last signal, not at an impact.',
};
