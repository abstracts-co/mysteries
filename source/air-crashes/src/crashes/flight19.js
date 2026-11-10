import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';
const T = (iso, s = 0) => new Date(Date.parse(iso) + s * 1000).toISOString();
const NARR = [15.43, 7.366, 13.324, 3.768, 8.563, 5.628, 11.24, 4.492, 8.928, 27.605];
const wt = (i, p) => { const W = story.beats[i].text.split(/\s+/), N = (x) => x.toLowerCase().replace(/[^a-z0-9']/g, ''), A = p.split(/\s+/).map(N), k = W.findIndex((_, j) => A.every((a, m) => N(W[j + m] || '').startsWith(a))); let acc = 0, tot = 0; W.forEach((x, j) => { if (j < k) acc += x.length + 1.5; tot += x.length + 1.5; }); return NARR[i] * acc / tot; };
const F19_ISLE = (() => { const M = 'Illustrative. The leader reported passing a small island at 21:25 and seeing no other land. No island was identified, and this path over the drawn island is invented to show the report.', c = [26.9242, -77.7239], at = (s) => { const p = destination(c[0], c[1], 345, s * 67); return { lat: p.lat, lon: p.lon }; };
  return [[-67, '21:24:00'], [-7, '21:25:00'], [53, '21:26:00']].map(([s, t]) => ({ t_utc: `1945-12-05T${t}Z`, ...at(s), alt_ft: 3500, quality: 'modelled', method: M, sources: ['s2'] })); })();
const F19_LEGS = (() => { const M = 'Schematic. Headings and times come from the radio logs: 030 reported at 21:45, an order for 090 at 22:07, 270 reported at 22:15, and 270 still held when a turn back east was proposed at 23:04. Positions, leg lengths and turn shapes are illustrative.', out = [], marks = {}, v = 130 * .5144;
  let p = { lat: 27.55, lon: -78.1 }, h = 30, t = Date.parse('1945-12-05T21:45:00Z');
  const plan = [[30, '22:07:00', 0], [90, '22:07:20', 3], [90, '22:13:00', 0], [270, '22:15:00', -1.5], [270, '23:04:00', 0]];
  const emit = () => { const s = (t - Date.parse('1945-12-05T22:15:00Z')) / 1000; out.push({ t_utc: new Date(t).toISOString(), lat: p.lat, lon: p.lon, alt_ft: s > 0 ? 3000 - 500 * s / 2100 : 3000, quality: 'modelled', method: M, sources: ['s2', 's3', 's1'] }); };
  emit(); marks.ne = [p.lat, p.lon];
  for (const [hd, until, rate] of plan) { const end = Date.parse(`1945-12-05T${until}Z`); while (t < end) { if (rate) h = (h + rate * 10 + 360) % 360; p = destination(p.lat, p.lon, h, v * 10); t += 10000; if (rate || (t / 1000) % 30 === 0 || t >= end) emit(); if (t === Date.parse('1945-12-05T22:16:00Z')) marks.w2 = [p.lat, p.lon]; } h = hd; if (until === '22:07:00') marks.e = [p.lat, p.lon]; if (until === '22:15:00') marks.w = [p.lat, p.lon]; }
  return { out, marks }; })();

export const story = { beats: [
  b('1945-12-05T19:10:00Z', 'Fort Lauderdale, Florida, December fifth, 1945. Five Navy Avengers leave for a routine training flight, with fourteen men aboard. Their route is a triangle out over the Bahamas.', ['Five Avengers depart'], { v: 'follow', az: 135, el: 16, zoom: 3.4, shots: [{ at: 0, v: 'map', frame: [26.25, -79.75, 900e3] }, { at: 'Five Navy', v: 'follow' }, { at: 'Their route', v: 'map', frame: [26.5, -79.05, 640e3], t: T('1945-12-05T19:10:00Z', 12.9), rate: 500 }] }),
  b('1945-12-05T20:40:00Z', 'After the turn, another instructor overhears them. They are talking about their compasses, and about being lost.', ['Navigation doubt is overheard'], { v: 'follow', az: 150, el: 9, zoom: 3.4, sfx: 'radio', shots: [{ at: 'They are talking', v: 'pilot', look: [0, -7, 14], lookAt: 1.1 }] }),
  b('1945-12-05T20:45:00Z', 'The flight leader reports both his compasses out. He believes he is over the Florida Keys. If so, north would lead home. If he is really over the Bahamas, north leads out to sea.', ['Leader reports compass trouble', 'Northward advice depends on location'], { v: 'map', sfx: 'radio', frame: [26.55, -79.6, 1250e3] }),
  b('1945-12-05T21:25:00Z', 'He passes a small island, with no other land in sight.', ['Small island passes below'], { v: 'above', zoom: 9, gap: 2, shots: [{ at: 'land in', v: 'follow', az: 60, el: 6, zoom: 3.4 }] }),
  b('1945-12-05T22:15:00Z', 'They try northeast, then east, then west. He says they will fly west until they reach land, or run out of fuel.', ['Leader reports northeast heading', 'Eastward turn is ordered', 'Westward flight is reported', 'Leader plans to continue west'], { v: 'map', sfx: 'radio', lapse: 1, lead: 480, frame: [28.05, -78.3, 560e3], shots: [{ at: 'reach land', frame: [28.15, -79.25, 820e3] }] }),
  b('1945-12-05T22:29:00Z', 'The sun sets at Fort Lauderdale. Weather over the sea is getting worse.', ['Sunset at Fort Lauderdale', 'Search aircraft reports rough conditions'], { v: 'follow', az: 100, el: 8, zoom: 3.4, gap: 2, shots: [{ at: 'Weather over', az: 100, el: 8, zoom: 3.2, t: '1945-12-05T22:34:00Z' }] }),
  b('1945-12-05T22:50:00Z', 'Radio stations finally place them within about 100 miles of a point off northern Florida. The estimate reaches the base, but it is never broadcast to the flight.', ['Broad HF/DF area is evaluated', 'Evaluated area reaches base'], { v: 'map', frame: [28.0, -79.45, 1600e3] }),
  b('1945-12-05T23:02:00Z', 'Earlier, a warning was relayed that they might soon have to land on the water.', ['Possible ditching warning is relayed'], { v: 'follow', az: 165, el: 7, zoom: 3.2, sfx: 'radio', bright: 3, gap: 3 }),
  b('1945-12-06T00:04:00Z', 'Just after seven in the evening, one pilot calls the leader. There is no answer. It is the last call anyone logged.', ['Last logged call receives no answer'], { v: 'follow', az: 150, el: 7, zoom: 3.2, sfx: 'radio', bright: 3, end: 1, gap: 4, shots: [{ at: 'It is the last', v: 'map', frame: [29.1, -79.7, 750e3] }] }),
  b('end', 'A Mariner search plane took off with thirteen men. Twenty-three minutes later, a passing tanker saw flames on the sea. The Navy first blamed the flight leader, then withdrew that, and recorded the cause as unknown. No trace of any of the six aircraft has been confirmed. The Bermuda Triangle story came later. The records describe a lost formation, rough seas, and radio trouble.', ['Training 49 departs Banana River', 'Tanker sees flames at sea', 'Correction board rejects blame', 'Anniversary review reports no confirmed trace'], {
    shots: [{ at: 0, frame: [28.75, -80.15, 620e3] }, { at: 'The Navy', frame: [26.55, -79.3, 2000e3] }, { at: 'The Bermuda', frame: [27.2, -72.5, 3800e3] }, { at: 'The records', frame: [27.6, -79.4, 1500e3] }],
     }),
] };

const L = F19_LEGS.marks;
export const direct = {
  places: ['Fort Lauderdale', 'Fort Lauderdale'],
  aircraft: 'tbm', terrain: 'flight19', start: false, end: false, localFrom: '1945-12-05T22:30:00Z', az: 215, el: 9, routeAlt: 1700e3, fitDest: false, endTitle: 'Not found', navLights: false, cruiseKt: 130, cruiseFt: 3500, planned: true,
  formation: [[-18, 3, -24], [-18, 3, 24], [-36, 6, -48], [-36, 6, 48]], epilogue: [28.6, -79.4, 900e3], nightExposure: 7, fill: 1,
  add: [
    { t_utc: '1945-12-05T19:50:00Z', lat: 26.03, lon: -79.08, alt_ft: 2500, quality: 'modelled', method: 'Planned first leg of Navigation Problem No. 1, assuming the Board’s miles are nautical. The time and height are illustrative; the actual position is not recorded.', sources: ['s1'] },
    { t_utc: '1945-12-05T20:25:00Z', lat: 26.01, lon: -77.84, alt_ft: 3500, quality: 'modelled', method: 'Planned turn point east of the Bahamas, assuming nautical miles. The time and height are illustrative; the actual position is not recorded.', sources: ['s1'] },
    ...F19_ISLE,
    ...F19_LEGS.out,
    { t_utc: '1945-12-06T00:04:14Z', lat: 29.5, lon: -79.9, alt_ft: 1000, quality: 'modelled', method: 'Illustrative. The last logged call, at 00:04 UTC, gives no position. The Board left the courses after 23:07 UTC undetermined, and no wreck has been confirmed. The Board presumed loss at sea.', sources: ['s1'] },
  ],
  env: { layers: [{ base_ft: 4000, top_ft: 7000, cover: .3, density: .55, flat: .3, scale: .04 }, { base_ft: 10000, top_ft: 11500, cover: .15, density: .25, flat: .85, scale: .025 }], sea: .75, fogTint: [.82, .88, .97], radiusKm: 400, center: [29.2, -79.3], follow: true, nightLights: 0, globalClouds: 0 },
  cues: [
    { t: '1945-12-05T22:29:05Z', ramp: 270, env: { layers: [{ base_ft: 4000, top_ft: 7500, cover: .72, density: .78, flat: .4, scale: .035 }, { base_ft: 10000, top_ft: 11500, cover: .35, density: .3, flat: .85, scale: .025 }], sea: .92 } },
    { t: '1945-12-05T23:30:00Z', ramp: 1800, env: { layers: [{ base_ft: 1500, top_ft: 6000, cover: .95, density: .85, flat: .7, scale: .03 }], sea: 1 } },
  ],
  fx: [
    { type: 'ping', t: '1945-12-05T20:40:00.300Z', text: '', life: 3.2 },
    { type: 'ill', t: '1945-12-05T20:40:00.400Z', until: '1945-12-05T20:40:03.100Z' },
    { type: 'ping', t: '1945-12-05T20:45:10Z', text: '', life: 4 },
    { type: 'ill', t: '1945-12-05T20:57:00Z', until: '1945-12-05T21:24:50Z' },
    { type: 'ill', t: '1945-12-05T21:25:00Z', until: '1945-12-05T21:26:00Z' },
    { type: 'ill', t: '1945-12-05T22:07:00Z', until: '1945-12-05T22:14:30Z' },
    { type: 'ill', t: '1945-12-05T22:50:30Z', until: '1945-12-05T23:01:50Z' },
    { type: 'ping', t: '1945-12-05T23:02:00.300Z', text: '', life: 1.3 },
    { type: 'ill', t: '1945-12-06T00:04:00.500Z', until: '1945-12-06T00:04:05Z' },
    { type: 'ill', t: '1945-12-06T00:04:05Z', until: '1945-12-06T00:04:06.700Z' },
    { type: 'ill', t: '1945-12-06T00:04:10.800Z', until: '1945-12-06T00:04:14Z' },
  ],
  overlays: (raw) => {
    const E = raw.evidence_points || [], ev = (n) => E.find((e) => e.label === n), pin = (e, only, from, label, kind) => ({ points: [[e.lat, e.lon]], label, kind: kind || e.kind, detail: e.detail, sources: e.sources, only, from });
    raw.evidence_points = []; raw.route.from = { ...raw.route.from, code: 'NAS Fort Lauderdale' }; raw.route.to = { ...raw.route.to, lat: null };
    const base = [raw.route.from.lat, raw.route.from.lon], plan = [base, ...raw.route.planned_waypoints.map((w) => [w.lat, w.lon])];
    const circ = []; for (let i = 0; i <= 72; i++) { const q = destination(29.25, -79, i * 5, 185200); circ.push([q.lat, q.lon]); }
    const hfdf = { points: circ, color: [.5, .78, 1], width: 1.4, opacity: .85, labelAt: .1, kind: 'signal', detail: 'Radio direction finding gave an approximate area within 100 miles of this centre. It is drawn assuming nautical miles; the records say only miles. The centre is not an aircraft position, and the circle is not a guaranteed boundary.', sources: ['s1', 's5'] };
    const stub = destination(base[0], base[1], 12, 150e3);
    return [
      { ...hfdf, only: [6], from: wt(6, 'within about'), draw: 1.4, label: 'Radio fix: within 100 miles' },
      { points: plan, color: [.85, .88, .95], width: 2, opacity: .9, dashed: true, only: [0], from: wt(0, 'Their route'), draw: 1.6, label: 'Planned route', labelAt: .62, kind: 'landmark', detail: 'Courses and distances from Board finding 2, with the distances read as nautical miles (the record says only miles), so the triangle does not quite close. No position of the flight itself was recorded.', sources: ['s1'] },
      { points: plan, color: [.85, .88, .95], width: 2, opacity: .8, dashed: true, only: [2] },
      { points: [[24.85, -80.75]], only: [2], from: wt(2, 'Florida Keys'), label: 'Florida Keys', kind: 'landmark', detail: 'The leader said he believed he was over the Keys. That was a belief, not a position fix.', sources: ['s1', 's2'] },
      { points: arrow([24.72, -81.05], [26.35, -81.05]), color: [1, .8, .5], width: 1.6, opacity: .95, alt: 900, only: [2], from: wt(2, 'If so'), draw: 1.2, label: 'North leads home', labelAt: .4, kind: 'landmark', detail: 'Schematic. From the Florida Keys, flying north brings you to the Florida mainland.', sources: ['s1'] },
      { points: arrow([26.95, -77.4], [28.2, -77.4]), color: [.6, .85, 1], width: 1.6, opacity: .95, alt: 900, only: [2], from: wt(2, 'If he is really'), draw: 1.2, label: 'North leads out to sea', labelAt: .5, kind: 'landmark', detail: 'Schematic. From the planned route near the Bahamas, flying north leads away from land, over the Atlantic. Their actual position is unknown.', sources: ['s1'] },
      { points: [L.ne], only: [4], from: .3, label: 'Northeast', kind: 'signal', detail: 'The leader reported heading 030 at 21:45 UTC. True or magnetic reference is not stated; the position is schematic.', sources: ['s2', 's3'] },
      { points: [L.e], only: [4], from: wt(4, 'then east'), label: 'East', kind: 'signal', detail: 'An intercepted order at 22:07 UTC called for 090 for ten minutes. Whether the flight followed it is unknown; the position is schematic.', sources: ['s2'] },
      { points: [L.w], only: [4], from: wt(4, 'then west'), label: 'West', kind: 'signal', detail: 'The leader reported flying 270 at 22:15 UTC. True or magnetic reference is not stated; the position is schematic.', sources: ['s2', 's3'] },
      { points: arrow([L.w2[0] + .3, L.w2[1] - .1], [L.w2[0] + .3, -80.35], 14), color: [1, .8, .5], width: 1.4, opacity: .9, alt: 900, dashed: true, only: [4], from: wt(4, 'west until'), draw: 1.5 },
      { points: [[L.w2[0] + .3, L.w2[1] - .1]], only: [4], from: wt(4, 'west until'), kind: 'landmark', detail: 'At 22:16 UTC the leader said he would hold 270 until reaching land or running out of fuel (s2). The arrow starts from a modelled position, so where it meets the coast is illustrative.', sources: ['s2'] },
      { points: [base, [stub.lat, stub.lon]], color: [1, .62, .5], width: 1.4, opacity: .9, alt: 900, dashed: true, only: [6], from: wt(6, 'never broadcast'), draw: 1, kind: 'signal', detail: 'The Board found that the estimate was not broadcast blindly to Flight 19. The line is schematic: it shows a message that was never sent.', sources: ['s1'] },
      { ...pin(ev('NAS Banana River station reference'), [9], wt(9, 'Mariner'), 'Mariner search plane · Training 49 · departs ~00:27 UTC', 'landmark'), detail: 'Training 49, a PBM-5 Mariner with thirteen aboard, left NAS Banana River at about 00:27 UTC. The pin is the station’s weather-station coordinate; the seaplane launch point is not fixed.', sources: ['s1', 's18'] },
      pin(ev('Gaines Mills flame and explosion report'), [9], wt(9, 'flames'), 'Gaines Mills tanker: flames · 00:50 UTC · approx. · Board: probably Training 49'),
      { points: [[32.3, -64.8]], only: [9], from: wt(9, 'The Bermuda'), label: 'Bermuda', kind: 'landmark', detail: 'Reference only. No official boundary of the “Bermuda Triangle” exists, so none is drawn.', sources: ['s11'] },
      { ...pin(ev('Rescue search reference point'), [9], wt(9, 'rough seas'), 'Rough seas · very rough water seen by a search pilot, ~01:15 UTC, after the last call', 'landmark'), detail: 'Training 32 reached the 29°N 79°W search area at about 01:15 UTC, after the last Flight 19 call, and found low overcast, showers, turbulent air and very rough water. The point is a rounded search reference, not a Flight 19 position.', sources: ['s1'] },
    ];
  },
  buildNote: 'No recorder, radar track or wreck exists. Radio traffic and its times come from the Navy Board’s logs. The planned legs come from the Board’s courses and distances, and the HF/DF circle from its evaluated area; both assume nautical miles. Every point on the flown path, with its time and height, is a labelled estimate. The northeast, east and west legs are drawn at their logged times as schematic lines; their positions and lengths are invented. The small island drawn near the 21:25 point is illustrative: the leader reported passing one, but it was never identified, so its shape, size and place are invented. Haze, cloud and sea state follow the station and search reports in kind, not in detail.',
};
