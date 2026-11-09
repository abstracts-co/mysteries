import { destination } from './geo.js';
const lerpLine = (a, b, k = 1, n = 48) => { const P = []; for (let i = 0; i <= n; i++) { const f = 1 - (1 - i / n) ** k, x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f; P.push([x, y]); } return P; };
const backTrack = (lat, lon, hdg, t1, segs, v, q) => {
  const out = []; let p = { lat, lon }, h = hdg, t = Date.parse(t1);
  for (const [dur, turn] of [...segs].reverse()) for (let k = 0; k < dur; k++) { if (t % 10000 === 0) out.push({ t_utc: new Date(t).toISOString(), lat: p.lat, lon: p.lon, ...q }); p = destination(p.lat, p.lon, ((h - turn / dur / 2 + 180) % 360 + 360) % 360, v); h -= turn / dur; t -= 1000; }
  out.push({ t_utc: new Date(t).toISOString(), lat: p.lat, lon: p.lon, ...q }); return out;
};
const NZ_ORBIT = { quality: 'modelled', method: 'Schematic. The recorder gives the times and turn directions: a right descending orbit from 00:32:05, then a second orbit to the left from 00:38:23, broken by a letdown on grid heading 180° (north, away from Ross Island) before the left turn resumed and the Hallett–McMurdo track was recaptured at 00:44:40. The orbit positions and sizes were not published. This pattern is drawn at about 300 kt and ends at the recapture point, worked back from the impact at 257 kt.', sources: ['s3', 's4'] };
const arrow = (a, b, km = 28) => { const L = destination(b[0], b[1], 160, km * 1000), R = destination(b[0], b[1], 200, km * 1000); return [a, b, [L.lat, L.lon], b, [R.lat, R.lon]]; };
const F19_LEGS = (() => { const M = 'Schematic. The leader said they would try northeast, then east, then west, until they reached land. No times or positions exist for these legs; their lengths are illustrative.', out = []; let p = { lat: 28.28, lon: -78.49 }, t = Date.parse('1945-12-05T22:15:00Z');
  out.push({ t_utc: new Date(t).toISOString(), ...p, alt_ft: 3000, quality: 'modelled', method: M, sources: ['s1'] });
  for (const [brg, min] of [[45, 4], [90, 4], [270, 6]]) { p = destination(p.lat, p.lon, brg, min * 60 * 130 * .5144); t += min * 60000; out.push({ t_utc: new Date(t).toISOString(), lat: p.lat, lon: p.lon, alt_ft: 3000, quality: 'modelled', method: M, sources: ['s1'] }); }
  return out; })();
const lop = (lat, lon, b, km) => { const a = destination(lat, lon, b, km * 1000), c = destination(lat, lon, (b + 180) % 360, km * 1000); return [[a.lat, a.lon], [lat, lon], [c.lat, c.lon]]; };
const polys = (raw, ids, color) => ids.map((id) => raw.search_areas?.find((a) => a.id === id)).filter(Boolean).map((a) => ({ points: (a.geometry.type === 'Polygon' ? a.geometry.coordinates[0] : a.geometry.coordinates).map(([x, y]) => [y, x]), color, width: 1.2, opacity: .7, alt: 800, label: a.label, kind: 'search_area', detail: a.method || a.notes || a.label, sources: a.sources, labelAt: .25 }));
const NOTE_ATT = 'Attitude and speed come from the flight data recorder where the timeline says Recorded.';
const JAL_REC = 'Schematic recovery. Section 3.1.7.4 and Attachment 5 describe the nose coming back up at about 18:56:17 JST, at about 5,000–5,500 ft, then the descent stopping under about 3 g from 18:56:18 to 18:56:23.5, when the right wing struck trees. These heights and attitudes are drawn between those descriptions; they are not recorder values.';
export const DIRECT = {
  af447: {
    aircraft: 'a330', start: false, endAlt: 0, localFrom: '2009-06-01T02:06:00Z', az: 205, el: 8, routeAlt: 3600e3, fitDest: false,
    env: { layers: [{ base_ft: 3000, top_ft: 8000, cover: .5, density: .5, flat: .8, scale: .06 }, { base_ft: 3000, top_ft: 56000, cover: .5, density: .95, flat: 0, scale: .14 }], sea: .55, radiusKm: 110, center: [2.85, -30.62] },
    lightning: [6600, 8000], lightningRate: .35, nightExposure: 3.6,
    overlays: () => { const c = []; for (let i = 0; i <= 72; i++) { const q = destination(2.85, -30.62, i * 5, 110000); c.push([q.lat, q.lon]); } return [{ points: c, color: [1, .72, .45], width: 1.4, opacity: .9, dashed: true, alt: 12000, only: [2], label: 'Storm cluster on the route · approximate', labelAt: .12, kind: 'landmark', detail: 'Approximate. The BEA weather analysis found a cluster of thunderstorms near the equator on the route. This circle is the storm area drawn in this reconstruction, not a measured edge.', sources: ['s1'] }]; },
    buildNote: 'Attitude, speed and pressure altitude are from the flight data recorder. BEA publishes a plotted final path, but no table of coordinates was obtained. Positions shown are a modelled reconstruction between the last automatic position report and the wreckage area. This dataset has heading and groundspeed only at the start and end of the upset; between them the speed is estimated from the recorded airspeed, and interpolated across the seconds when that airspeed was erroneous. The drawn path keeps that speed and is bent into a turn so that it ends at the wreckage area, with heading treated as ground track. Storm shapes are generated; BEA reports storm cells and cloud tops, not their exact outlines. Lightning is shown as an effect: no flash was recorded at this aircraft.',
  },
  twa800: {
    epilogue: [40.42, -73.15, 330e3], aircraft: 'b747', terrain: 'twa800', lightsUntil: '1996-07-18T00:31:12Z', localFrom: '1996-07-18T00:29:30Z', az: 240, el: 8, routeAlt: 700e3, fitDest: false,
    planned: false, witness: [40.7196, -72.6499, 30],
    add: [
      { t_utc: '1996-07-18T00:31:15Z', alt_ft: 13850, pitch_deg: 8, roll_deg: -12, quality: 'modelled', method: 'Schematic through published NTSB model ranges. Several trajectories fit; no unique path or attitude exists.', sources: ['s1'] },
      { t_utc: '1996-07-18T00:31:34Z', lat: 40.6585, lon: -72.648, alt_ft: 15500, pitch_deg: 24, roll_deg: 50, quality: 'modelled', method: 'Schematic. NTSB models peak about 15,000–16,000 ft and show a left roll followed by a right roll and descending turn (figure 28a). These values and the time of peak are illustrative.', sources: ['s1'] },
      { t_utc: '1996-07-18T00:31:46Z', alt_ft: 10500, pitch_deg: -25, roll_deg: 90, quality: 'modelled', method: 'Schematic. NTSB model assumes outboard wing failure at 34 s.', sources: ['s1'] },
      { t_utc: '1996-07-18T00:32:02Z', lat: 40.666667, lon: -72.633333, alt_ft: 0, pitch_deg: -70, roll_deg: 110, quality: 'modelled', method: 'NTSB estimates 47–54 s to main-body water impact; 50 s shown. Accident reference position, not a surveyed impact point.', sources: ['s1'] },
      ...['00:32:04', '00:32:06'].map((t) => ({ t_utc: `1996-07-18T${t}Z`, lat: 40.667429, lon: -72.631726, alt_ft: -1360, pitch_deg: -70, roll_deg: 110, quality: 'modelled', method: 'Illustrative. Holds the drawn wreck at the water for a few seconds so the fire on the water can be shown. Boats and aircraft responded to burning wreckage; the size and place of the fire were not measured.', sources: ['s1'] })),
    ],
    eventTimes: { 'Forward fuselage separates': '1996-07-18T00:31:16Z', 'Main body pitches upward': '1996-07-18T00:31:20Z', 'Main wreckage reaches the ocean': '1996-07-18T00:32:02Z' },
    env: { layers: [{ base_ft: 6100, top_ft: 8500, cover: .3, density: .35, flat: .5, scale: .05 }, { base_ft: 9000, top_ft: 11000, cover: .32, density: .3, flat: .8, scale: .03 }], sea: .28, radiusKm: 240, fogVisKm: 30, fogTopKm: .5, globalClouds: 0 },
    fx: [
      { type: 'flash', t: '1996-07-18T00:31:12Z', power: 3 },
      { type: 'detach', part: 'nose', t: '1996-07-18T00:31:16Z', vel: [-60, -8, 12], drag: .32, terminal: 95, spin: [-.06, .08, -.32], pivot: [25, 0, 0] },
      { type: 'smoke', t: '1996-07-18T00:31:12Z', until: '1996-07-18T00:31:46Z', n: 420, life: 12, size: 26, grow: .8 },
      { type: 'fire', t: '1996-07-18T00:31:16Z', until: '1996-07-18T00:31:46Z', n: 900, life: 1.1, size: 7, spread: 6, grow: .35 },
      { type: 'detach', part: 'wings', t: '1996-07-18T00:31:46Z', vel: [-30, 8, 0], drag: .4, terminal: 72, spin: [.6, .1, .2] },
      { type: 'fire', t: '1996-07-18T00:31:46Z', until: '1996-07-18T00:32:02Z', n: 1800, life: 2.4, size: 13, spread: 60, grow: .5 },
      { type: 'flash', t: '1996-07-18T00:32:02Z', power: 2.2 },
      ...['mid', 'aft', 'fin'].map((part) => ({ type: 'hide', part, t: '1996-07-18T00:32:02.05Z' })),
      { type: 'fire', t: '1996-07-18T00:32:02Z', until: '1996-07-18T00:32:06Z', n: 1100, life: 3.6, size: 11, spread: 40, grow: .4 },
      { type: 'smoke', t: '1996-07-18T00:32:02.3Z', until: '1996-07-18T00:32:06Z', n: 160, life: 9, size: 30, spread: 60, grow: 1.4 },
      { type: 'tag', t: '1996-07-18T00:32:02.5Z', until: '1996-07-18T00:32:06Z', at: [40.66705, -72.63253, 40], text: 'Fire on the water · Illustrative' },
    ],
    buildNote: 'Everything before 00:31:12 UTC is radar and flight data recorder. Everything after it is a schematic through published NTSB model ranges: no recording, radar altitude or unique trajectory exists for the breakup. The nose, wing and fire effects show the sequence, not measured motion. The fire on the water after impact is illustrative: burning wreckage was reported, but its extent was not measured.',
  },
  egyptair990: {
    aircraft: 'b767', planned: false, lightsUntil: '1999-10-31T06:50:37Z', tailView: { side: 8, up: 3, dist: .7, lift: 0 }, start: false, end: { lat: 40.3475, lon: -69.75666666666666 }, endAlt: 0, localFrom: '1999-10-31T06:47:30Z', az: 200, el: 7, routeAlt: 900e3, fitDest: false, elevScale: 3,
    drop: (p) => !(p.quality === 'radar' && p.t_utc < '1999-10-31T06:50:37'),
    add: [{ t_utc: '1999-10-31T06:52:30Z', alt_ft: 0, quality: 'modelled', method: 'NTSB reconstruction estimates impact around this time; not a recorded impact.', sources: ['s1'] }],
    env: { layers: [{ base_ft: 14000, top_ft: 22000, cover: .3, density: .3, flat: .8, scale: .03 }], sea: .4, radiusKm: 240, globalClouds: 0 }, nightExposure: 3.4, fill: .55,
    buildNote: 'Pitch, roll, airspeed, pressure altitude and both elevators are from the flight data recorder to 06:50:36. After that the climb, turn and second descent come from the NTSB reconstruction from primary radar. Positions are dead-reckoned back from the debris field. The tail surfaces are drawn with their movement exaggerated three times so the split can be seen; the numbers are the recorded ones.',
  },
  airnz901: {
    epilogue: [-77.45, 167.0, 270e3], aircraft: 'dc10', terrain: 'airnz901', endAlt: 1467, localFrom: '1979-11-28T00:43:00Z', az: 215, el: 6, routeAlt: 5200e3, fitDest: false, terrainFlat: .92,
    prefix: { from: '1979-11-27T19:17:00Z', until: '1979-11-28T00:17:13Z', points: [{ lat: -50.7, lon: 166.166667 }, { lat: -55, lon: 165.466667 }, { lat: -60, lon: 164.533333 }, { lat: -66.75, lon: 163 }, { lat: -72.333333, lon: 170.216667 }, { lat: -75.51138, lon: 168.65497, skip: true }].map((p) => ({ ...p, alt_ft: 33000, method: 'Flight-plan point, timed at a constant speed from departure to the 00:17:13 position. Height is the recorded cruise level, FL330, assumed for the whole cruise.' })) },
    add: [
      { t_utc: '1979-11-28T00:17:13Z', lat: -75.51138, lon: 168.65497, pressure_alt_ft: 33000, quality: 'derived', method: 'The recorder analysis puts the aircraft about 144 miles north of McMurdo. It is placed on the Hallett–McMurdo track, taking the miles as nautical. FL330 is the recorded cruise level, a pressure level.', sources: ['s3', 's4'], locator: 'Annex C p. 41; Annex D p. 75' },
      { t_utc: '1979-11-28T00:18:44Z', pressure_alt_ft: 33000, quality: 'derived', method: 'The recorder analysis dates the start of the descent from cruise FL330 to this second.', sources: ['s4'], locator: 'Annex D p. 75' },
      { t_utc: '1979-11-28T00:25:10Z', pressure_alt_ft: 18000, quality: 'recorded', method: 'Automatic level-off at FL180. This is a pressure level; height above sea level is not established.', sources: ['s4'], locator: 'Annex D p. 75' },
      { t_utc: '1979-11-28T00:32:04Z', pressure_alt_ft: 18000, quality: 'derived', method: 'Held at FL180 from the automatic level-off until the descending orbit began at 00:32:05.', sources: ['s4'], locator: 'Annex D pp. 75–76' },
      ...backTrack(-77.05716, 167.62205, 189.5, '1979-11-28T00:44:40Z', [[322, 360], [56, 0], [218, -178], [48, 0], [111, -182]], 155, NZ_ORBIT),
    ],
    overlays: () => [
      { points: lerpLine([-72.333333, 170.216667], [-77.883333, 164.8], 2), color: [.62, .86, 1], width: 1.5, opacity: .9, dashed: true, alt: 600, label: 'Route the crew were briefed on', labelAt: .55, kind: 'satellite', detail: 'At the briefing the last waypoint lay near the Dailey Islands, west of Ross Island, so the crew expected a track down McMurdo Sound. Drawn straight from the Cape Hallett point; it is an expected route, not a flown track.', sources: ['s5'] },
      { points: lerpLine([-72.333333, 170.216667], [-77.878333, 166.966667], 2), color: [1, .6, .5], width: 1.5, opacity: .9, alt: 600, label: 'Programmed route after the change', labelAt: .65, kind: 'wreckage', detail: 'In the early hours before departure the last waypoint was moved east, from 164°48′E to 166°58′E, near the McMurdo TACAN. The computer track from Cape Hallett then ran over Ross Island and Mount Erebus. The crew were not told.', sources: ['s5', 's6'] },
      { points: [[-77.5282, 167.0705], [-77.5282, 167.0705]], color: [1, 1, 1], width: 0, opacity: 0, alt: 3130, label: 'Mount Erebus', labelAt: 0, kind: 'landmark', detail: 'Summit of Mount Erebus, placed at the highest point of the elevation data used for the terrain here (Terrain Tiles). Geography for reference, not a point on the flight path.', sources: [] },
    ],
    env: { layers: [{ base_ft: 2000, top_ft: 7500, cover: .72, density: .9, flat: 1, scale: .018 }, { base_ft: 16000, top_ft: 21000, cover: .6, density: .25, flat: 1, scale: .012 }], sea: .1, ice: true, radiusKm: 420, center: [-77.0, 167.4], follow: true, globalClouds: 0 },
    cues: [
      { t: '1979-11-28T00:30:00Z', ramp: 60, env: { layers: [{ base_ft: 2000, top_ft: 7500, cover: .45, density: .9, flat: .5, scale: .018 }, { base_ft: 16000, top_ft: 21000, cover: .6, density: .25, flat: 1, scale: .012 }] } },
      { t: '1979-11-28T00:44:50Z', ramp: 90, env: { layers: [{ base_ft: 2000, top_ft: 7500, cover: .72, density: .9, flat: 1, scale: .018 }, { base_ft: 16000, top_ft: 21000, cover: .6, density: .25, flat: 1, scale: .012 }] } },
    ],
    buildNote: 'Positions in the last two minutes are estimates, worked back from the reported impact position at a constant 257 kt along the wreckage alignment of about 190 degrees. They are not published, time-tagged positions. The 00:17 position is the recorder analysis’s “about 144 miles north of McMurdo”, placed on the programmed track. The two orbits (00:32–00:42) are a schematic: their times and turn directions are recorded, but their coordinates were not published. Earlier points are flight-plan points; altitude reports are kept. The terrain is modern elevation data painted white; it is not imagery from 1979. Cloud shapes are generated. During the orbits the low layer is drawn broken, to show the break the captain described; where that break was, and how large, is not known. That elevation data is coarse over Antarctica: at the reported impact position it is several hundred metres lower than the recorded height, so the drawn slope rises about 2 km further on and the aircraft ends above it.',
  },
  stardust: {
    overlays: () => [{ points: [[-33.3575, -69.728889], [-33.493611, -70.697778]], color: [1, .8, .5], width: 1.4, opacity: .9, dashed: true, alt: 4600, only: [7], label: 'Reported: four minutes from Santiago', labelAt: .55, kind: 'landmark', detail: 'Schematic. At 17:41 the crew gave an arrival at Santiago of 17:45, which would put them close to the airport. The wreck lies east of the main ridge, on Tupungato.', sources: ['s2'] }],
    epilogue: [-33.37, -69.75, 70e3], epilogueEnv: { layers: [], fogVisKm: 0 }, aircraft: 'lancastrian', terrain: 'stardust', localFrom: '1947-08-02T17:20:00Z', az: 230, el: 8, routeAlt: 1500e3, navLights: false, fitDest: false, cruiseKt: 190, climbFpm: 700,
    add: [
      { t_utc: '1947-08-02T13:46:00Z', lat: -34.679167, lon: -58.643611, alt_ft: 98, quality: 'derived', method: 'The departure time and airport are reported. The coordinates and elevation are later airport-reference data, shown as a starting point.', sources: ['s2', 's12', 's13'] },
      { t_utc: '1947-08-02T17:33:00Z', lat: -33.25, lon: -69.48, alt_ft: 17000, quality: 'modelled', method: 'JIAAC places the aircraft about 14 NM short of impact, descending in cloud at this time. Position is interpolated on the straight line to the wreck area; altitude is illustrative.', sources: ['s2'] },
      { t_utc: '1947-08-02T17:42:25Z', alt_ft: 16300, quality: 'modelled', method: 'Illustrative height on the straight line to the wreck area, kept above the ridge that the line crosses here. No height or position was reported.', sources: ['s2'] },
      { t_utc: '1947-08-02T17:45:00Z', lat: -33.3575, lon: -69.728889, alt_ft: 14900, quality: 'modelled', method: 'Illustrative endpoint. Debris was recovered at 4,408–4,654 m, but wreckage moved within the glacier; a glaciologist’s reconstruction puts the original collision higher up. The exact point and height are not known.', sources: ['s2', 's3'] },
    ],
    cues: [{ t: '1947-08-02T17:44:53Z', ramp: 4, env: { layers: [] }, tag: 'Cloud removed to show the mountain · Illustrative' }],
    env: { layers: [{ base_ft: 10500, top_ft: 23000, cover: 1.25, density: .75, flat: .85, scale: .02 }], radiusKm: 260, fogVisKm: 30, fogTopKm: 2, center: [-33.3, -69.6], nightLights: 0, globalClouds: 0 },
    buildNote: 'There is no recorder or radar. The path joins three radio position reports and the wreck area. The early-descent scenario follows the inquiry, but the plotted heights and endpoint are illustrative. Terrain and imagery are modern. Snow is painted on above about 2,700 m to suggest August, midwinter there; its true extent in 1947 is not known.',
  },
  jal123: {
    aircraft: 'b747jal', terrain: 'jal123', endAlt: 5135, end: { lat: 36.0015, lon: 138.6938 }, localFrom: '1985-08-12T09:24:10Z', az: 210, el: 8, routeAlt: 600e3, fitDest: false,
    env: { layers: [{ base_ft: 3200, top_ft: 6000, cover: .18, density: .5, flat: .2, scale: .05 }, { base_ft: 7500, top_ft: 9500, cover: .26, density: .3, flat: .8, scale: .03 }, { base_ft: 26000, top_ft: 30000, cover: .5, density: .08, flat: 1, scale: .012 }], sea: .3, radiusKm: 280, center: [35.8, 138.9] },
    add: [
      { t_utc: '1985-08-12T09:56:14Z', alt_ft: 6300, pitch_deg: -20, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
      { t_utc: '1985-08-12T09:56:17.5Z', alt_ft: 5350, pitch_deg: -4, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
      { t_utc: '1985-08-12T09:56:20.5Z', alt_ft: 5250, pitch_deg: 6, roll_deg: 30, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
      { t_utc: '1985-08-12T09:56:23.5Z', alt_ft: 5300, pitch_deg: 5, roll_deg: 40, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
    ],
    unknown: { ias: [['1985-08-12T09:56:00Z', '1985-08-12T09:56:27.25Z']] },
    fx: [{ type: 'detach', part: 'finUpper', t: '1985-08-12T09:24:35Z', vel: [-30, 6, 0], drag: .5, terminal: 40, spin: [.7, .5, .4], pivot: [-30, 8, 0] }, { type: 'smoke', t: '1985-08-12T09:24:35Z', until: '1985-08-12T09:24:42Z', n: 260, life: 5, size: 26, grow: 1.1 }, { type: 'gearDown', t: '1985-08-12T09:39:32Z' }, { type: 'smoke', t: '1985-08-12T09:56:25.2Z', until: '1985-08-12T09:56:27.25Z', n: 200, life: 5.5, size: 24, spread: 36, grow: 1.5 }],
    buildNote: 'Altitude, speed and attitude are recorder values where the timeline says Recorded, and read from the report’s plots where it says Derived. Positions after 09:46 follow the report’s gridded flight-path figure. Before that the report has only a schematic map, so the path is dead-reckoned from recorded headings and is approximate. The tail shows the upper fin separating; the report describes portions of the fin separating and part remaining until the final terrain contacts. Terrain is modern. In this terrain the drawn path first meets a ridge at the reported height about two seconds after the recorded first tree contact at 09:56:23.5, so the contact is drawn there; the dust is illustrative.',
  },
  earhart: {
    aircraft: 'electra', start: false, end: false, localFrom: '1937-07-02T19:05:00Z', az: 235, el: 8, routeAlt: 9000e3, fitDest: true, endTitle: 'Not found', navLights: false, cruiseKt: 140, cruiseFt: 10000, planned: true,
    epilogue: [-2.9, -175.6, 2600e3],
    add: [
      { t_utc: '1937-07-02T10:30:00Z', lat: -1.666667, lon: 166.75, alt_ft: 10000, quality: 'modelled', method: 'Illustrative. Nauru relayed a report of a ship in sight; the position is the Navy’s estimate for that ship. No aircraft position or height was reported.', sources: ['s6'] },
      { t_utc: '1937-07-02T17:45:00Z', lat: 0.1, lon: 179.7, alt_ft: 8000, quality: 'modelled', method: 'Illustrative: the crew radioed about 200 miles out, with no bearing. The true position is unknown.', sources: ['s6'] },
      { t_utc: '1937-07-02T19:12:00Z', lat: 1.45, lon: -177.0, alt_ft: 1000, quality: 'modelled', method: 'Illustrative: logged 1000 ft and unable to see the island; no position was ever fixed.', sources: ['s6'] },
      { t_utc: '1937-07-02T20:13:00Z', lat: 0.2, lon: -176.37, alt_ft: 1000, quality: 'modelled', method: 'Illustrative point on the 157/337 line, drawn through Howland. The crew gave no reference point, and the aircraft was never located.', sources: ['s6'] },
    ],
    env: { layers: [{ base_ft: 2500, top_ft: 6500, cover: .55, density: .6, flat: .2, scale: .05 }], sea: .4, radiusKm: 340, center: [.6, -176.6], follow: true, nightLights: 0, globalClouds: .4 },
    overlays: () => [{ points: [[.8195, -176.618], [.8195, -176.618]], width: 0, opacity: 0, color: [1, 1, 1], alt: 0, label: 'Itasca waits at Howland', labelAt: 0, kind: 'landmark', detail: 'The Coast Guard cutter Itasca waited at Howland Island as the radio guard ship, and made smoke that morning. Its exact position is not shown; the label marks Howland.', sources: ['s7'] }, { points: lop(.816667, -176.633333, 157, 520), color: [.5, .78, 1], width: 1.4, opacity: .85, label: '157/337 line', labelAt: .15, detail: 'The crew reported flying on this line. They did not say what it passes through, so it is drawn through Howland, their destination.', sources: ['s6'] }],
    viewPaths: { [`nikumaroro`]: [[.816667, -176.633333], [-4.672, -174.526]] },
    buildNote: 'There is no recorder or radar. The positions after 07:20 UTC are illustrative: the crew gave distances and one line, never a position. Radio contacts near Howland are from the Itasca logs; the Lae reports are from Chater and Collopy; the 10:30 Nauru report is a relayed account preserved in later records. Howland is too small to show in the base imagery.',
  },
  flight19: {
    aircraft: 'tbm', terrain: 'flight19', start: false, end: false, localFrom: '1945-12-05T22:30:00Z', az: 215, el: 9, routeAlt: 1700e3, fitDest: false, endTitle: 'Not found', navLights: false, cruiseKt: 130, cruiseFt: 3500, planned: true,
    formation: [[-18, 3, -24], [-18, 3, 24], [-36, 6, -48], [-36, 6, 48]], epilogue: [28.6, -79.4, 900e3], nightExposure: 9, fill: 1,
    add: [
      { t_utc: '1945-12-05T19:50:00Z', lat: 26.03, lon: -79.08, alt_ft: 2500, quality: 'modelled', method: 'Planned first leg of Navigation Problem No. 1, assuming the Board’s miles are nautical. The time and height are illustrative; the actual position is not recorded.', sources: ['s1'] },
      { t_utc: '1945-12-05T20:25:00Z', lat: 26.01, lon: -77.84, alt_ft: 3500, quality: 'modelled', method: 'Planned turn point east of the Bahamas, assuming nautical miles. The time and height are illustrative; the actual position is not recorded.', sources: ['s1'] },
      { t_utc: '1945-12-05T21:25:00Z', lat: 26.9, lon: -77.75, alt_ft: 3500, quality: 'modelled', method: 'Illustrative. The leader reported a small island; rescuers suspected the Bahama Bank. No island was identified.', sources: ['s1'] },
      ...F19_LEGS,
      { t_utc: '1945-12-05T22:50:00Z', lat: 29.25, lon: -79, alt_ft: 2500, quality: 'modelled', method: 'Centre of the HF/DF area, which the Board gave as within 100 miles of 29°15′N 79°00′W. It is an area, not a position.', sources: ['s1'] },
      { t_utc: '1945-12-06T00:04:00Z', lat: 29.5, lon: -79.9, alt_ft: 1000, quality: 'modelled', method: 'Illustrative. The last logged call gives no position, and no wreck has been confirmed. The Board presumed loss at sea.', sources: ['s1'] },
    ],
    env: { layers: [{ base_ft: 4000, top_ft: 7000, cover: .3, density: .55, flat: .3, scale: .04 }, { base_ft: 10000, top_ft: 11500, cover: .15, density: .25, flat: .85, scale: .025 }], sea: .75, radiusKm: 400, center: [29.2, -79.3], follow: true, nightLights: 0, globalClouds: 0 },
    cues: [
      { t: '1945-12-05T22:29:00Z', ramp: 1500, env: { layers: [{ base_ft: 3000, top_ft: 7500, cover: .7, density: .7, flat: .4, scale: .035 }, { base_ft: 10000, top_ft: 11500, cover: .3, density: .3, flat: .85, scale: .025 }], sea: .9 } },
      { t: '1945-12-05T23:30:00Z', ramp: 1800, env: { layers: [{ base_ft: 1500, top_ft: 6000, cover: .95, density: .85, flat: .7, scale: .03 }], sea: 1 } },
    ],
    fx: [{ type: 'tag', t: '1945-12-05T21:25:00Z', until: '1945-12-05T21:26:00Z', at: [26.9242, -77.7239, 25], text: 'Island · Illustrative' }],
    overlays: () => { const c = []; for (let i = 0; i <= 72; i++) { const q = destination(29.25, -79, i * 5, 185200); c.push([q.lat, q.lon]); } return [{ points: c, color: [.5, .78, 1], width: 1.4, opacity: .8, label: 'HF/DF area, 22:50 UTC', labelAt: .1, detail: 'Radio direction finding gave an approximate area within 100 miles of this centre. It is drawn assuming nautical miles; the records say only miles. It is the last position estimate that exists, and it is not a guaranteed boundary.', sources: ['s1'] },
      { points: arrow([24.72, -81.05], [26.35, -81.05]), color: [1, .8, .5], width: 1.6, opacity: .95, alt: 900, only: [2], label: 'If over the Keys, north reaches Florida', labelAt: .4, kind: 'landmark', detail: 'Schematic. The leader believed he was over the Florida Keys. From there, flying north brings you to the Florida mainland.', sources: ['s1'] },
      { points: arrow([26.9, -77.75], [28.9, -77.75]), color: [.6, .85, 1], width: 1.6, opacity: .95, alt: 900, only: [2], label: 'Over the Bahamas, north is open sea', labelAt: .4, kind: 'landmark', detail: 'Schematic. From the planned route near the Bahamas, flying north leads away from land, over the Atlantic.', sources: ['s1'] }]; },
    buildNote: 'No recorder, radar track or wreck exists. Radio traffic and its times come from the Navy Board’s logs. The planned legs come from the Board’s courses and distances, and the HF/DF circle from its evaluated area; both assume nautical miles. Every point on the flown path, with its time and height, is a labelled estimate. Headings the crew reported are shown as events. The small island drawn near the 21:25 point is illustrative: the leader reported passing one, but it was never identified, so its shape, size and place are invented.',
  },
  ladybegood: {
    aircraft: 'b24', terrain: 'ladybegood', start: false, end: false, localFrom: '1943-04-04T23:35:00Z', az: 225, el: 7, routeAlt: 4200e3, fitDest: false, navLights: false, planned: false, cruiseKt: 170, gsLead: 170,
    epilogue: [27.3, 23.6, 600e3], nightExposure: 4, insideUntil: '1943-04-05T00:10:00Z',
    clockApprox: true,
    add: [
      { t_utc: '1943-04-04T13:10:00Z', lat: 31.672222, lon: 20.243056, alt_ft: 300, quality: 'modelled', method: 'Illustrative clock. The engineer’s diary gives takeoff at 3:10 on an unspecified clock; two hours are subtracted for this timeline. That is an assumption, not a verified conversion.', sources: ['s6'] },
      { t_utc: '1943-04-04T15:30:00Z', lat: 35.1, lon: 18.2, alt_ft: 12000, quality: 'modelled', method: 'Illustrative. Straight line toward Naples; no position is recorded.', sources: ['s1'] },
      { t_utc: '1943-04-04T18:52:00Z', lat: 40.0, lon: 15.2, alt_ft: 24000, quality: 'modelled', method: 'Illustrative. A later transcription reports a navigator’s log entry of a 140-degree course at 20:52 on an unspecified clock. The aircraft may not have reached Naples itself; the group bombed at 23,500–25,000 ft.', sources: ['s13', 's1'] },
      { t_utc: '1943-04-04T22:05:00Z', lat: 31.672222, lon: 20.243056, alt_ft: 9000, quality: 'modelled', method: 'Illustrative. Witnesses heard a bomber near Soluch around midnight on their clocks and thought it was probably this one. No fix exists; the time and height are placeholders.', sources: ['s13'] },
      { t_utc: '1943-04-05T00:10:00Z', lat: 26.9, lon: 24.133333, alt_ft: 3500, quality: 'modelled', method: 'Illustrative. This is the bombardier’s recovery position, used as the start of a later simulator study, with that study’s height. It is not an observed exit point. Diaries give 2:00 to 2:10 on an unspecified clock.', sources: ['s10', 's12', 's4', 's6'] },
      { t_utc: '1943-04-05T00:20:00Z', alt_ft: 1700, pitch_deg: -1, quality: 'modelled', method: 'Illustrative descent. With the crew gone and fuel exhausted, the bomber came down on its own; its path, speed and attitude are unknown.', sources: ['s7'] },
      { t_utc: '1943-04-05T00:21:00Z', alt_ft: 1150, pitch_deg: -3, quality: 'modelled', method: 'Illustrative descent. With the crew gone and fuel exhausted, the bomber came down on its own; its path, speed and attitude are unknown.', sources: ['s7'] },
      { t_utc: '1943-04-05T00:21:35Z', lat: 26.71780, lon: 24.02712, alt_ft: 894, pitch_deg: 1, roll_deg: 0, gs_kt: 70, quality: 'modelled', method: 'Illustrative first ground contact, placed about 700 yards before the wreck to match the published ground skid. The time and speed of contact are unknown.', sources: ['s7', 's10'] },
      { t_utc: '1943-04-05T00:21:48Z', lat: 26.71389, lon: 24.02486, alt_ft: 894, pitch_deg: 1, roll_deg: 0, gs_kt: 25, quality: 'modelled', method: 'Illustrative point in the belly skid to the wreck position.', sources: ['s7', 's10'] },
      { t_utc: '1943-04-05T00:22:00Z', lat: 26.712694, lon: 24.024167, alt_ft: 895, gs_kt: 0, quality: 'modelled', method: 'The wreck is a published historical astro-fix. The time and height of impact are unknown and are placeholders.', sources: ['s9', 's10'] },
    ],
    fx: [
      { type: 'smoke', t: '1943-04-04T13:10:00Z', until: '1943-04-04T13:10:07Z', n: 700, life: 5.8, size: 30, spread: 260, grow: .8 },
      { type: 'smoke', t: '1943-04-05T00:21:35Z', until: '1943-04-05T00:22:00Z', n: 60, life: 5, size: 5, spread: 12, grow: .8 },
      { type: 'flare', t: '1943-04-04T22:05:06Z', at: [31.672222, 20.243056], n: 3, every: 4, rise: 300, life: 7 },
      { type: 'chutes', t: '1943-04-05T00:10:00Z', n: 9, partial: 1, every: 1.2, sink: 5.5 },
      { type: 'bombs', t: '1943-04-04T20:00:00Z', n: 10, every: .45, text: 'Bomb release · Illustrative' },
    ],
    eventTimes: { 'Lady Be Good takes off': '1943-04-04T13:10:00Z', 'Formation separates': '1943-04-04T14:20:00Z', 'Return turn is logged': '1943-04-04T18:52:00Z', 'Engineer records bomb release': '1943-04-04T20:00:00Z', 'Crew requests radio help': '1943-04-04T21:30:00Z', 'Aircraft is heard near base': '1943-04-04T22:05:00Z', 'Benghazi call may go unanswered': '1943-04-04T22:15:00Z', 'Fuel becomes depleted': '1943-04-04T23:55:00Z', 'Crew bails out': '1943-04-05T00:10:00Z', 'Uncrewed bomber strikes desert': '1943-04-05T00:22:00Z' },
    env: { layers: [], radiusKm: 600, center: [29.5, 21.5], follow: true, nightLights: 0, globalClouds: 0 },
    formation: [[-34, 3, -36], [-34, 3, 36], [-68, 6, -72], [-68, 6, 72]], formationUntil: '1943-04-04T14:20:00Z',
    cues: [
      { t: '1943-04-04T19:00:00Z', ramp: 1800, env: { layers: [{ base_ft: 5000, top_ft: 8000, cover: .55, density: .5, flat: .85, scale: .025 }] } },
      { t: '1943-04-04T21:25:00Z', ramp: 1500, env: { layers: [] } },
    ],
    overlays: (raw) => {
      const E = raw.evidence_points || [], at = (n) => { const e = E.find((x) => x.label === n); return e ? [e.lat, e.lon] : null; };
      const walk = ['Survivors assembly area', 'Flight boots', 'Southern parachute arrow', 'Parachute arrow two', 'Arrow with named harness', 'Parachute arrow four', 'Arrow near flight helmets', 'Arrow near harness section', 'Northern parachute arrow', 'Five-person final camp'].map(at).filter(Boolean);
      const camp = at('Five-person final camp'), ends = ['Flight engineer recovery area', 'Gunner Shelley recovery area'].map(at).filter(Boolean);
      return [
        { points: walk, color: [1, .8, .5], width: 1.8, opacity: .9, alt: 300, label: 'The walk of eight', labelAt: .72, kind: 'landmark', detail: 'Reconstructed from published recovery positions and markers. Several, including the assembly area and parachute arrows, are interpretive placements, not surveyed points.', sources: ['s10', 's11'] },
        ...ends.map((e) => ({ points: [camp, e], color: [1, .8, .5], width: 1.2, opacity: .7, alt: 300, dashed: true, sources: ['s10', 's7'] })),
      ];
    },
    buildNote: 'No recorder or radar exists. Crew diaries give times on an unknown clock, so the clock shown is illustrative: two hours are subtracted as an assumption, and radio events are spaced for pacing. The Soluch vicinity and wreck are approximate historical fixes, and the ground trail is reconstructed from published recovery positions and interpretive markers. Every airborne point is a labelled estimate. The parachutes and flares, where shown, are illustrative: their timing and paths are not recorded, and the number of flares is not known. Sand and dust were reported at the field; the blowing sand drawn at takeoff is illustrative. A museum account says the return was flown above cloud; the cloud drawn below the bomber on the night return has an illustrative height and extent. Terrain and imagery are modern.',
  },
  mh370: {
    aircraft: 'b777', start: false, end: false, localFrom: 1e9, az: 225, el: 8, routeAlt: 9000e3, fitDest: false, endTitle: 'Not found', planned: false, epilogue: [-22, 85, 11000e3],
    cruiseFt: 35000, cruiseKt: 470,
    pathPersp: 'Inmarsat illustrative path',
    fx: [{ type: 'links' }, { type: 'link', t: '2014-03-08T00:10:59Z', text: 'Satellite handshake' }],
    env: { layers: [{ base_ft: 2500, top_ft: 5500, cover: .16, density: .35, flat: .5, scale: .05 }], sea: .75, radiusKm: 500, center: [-33, 93], follow: true, nightLights: .3 }, nightExposure: 2.2, fill: .6,
    overlays: (raw) => [
      { points: (raw.seventh_arc?.geometry?.coordinates || []).filter(([x, y]) => y < 12 && y > -48).map(([x, y]) => [y, x]), color: [.5, .78, 1], width: 1.6, label: 'Seventh arc', labelAt: .72, detail: 'Satellite data places the aircraft somewhere on this curve at 00:19:29 UTC. It is a range from the satellite, not a position.', sources: raw.seventh_arc?.sources },
      ...polys(raw, ['wide_2014', 'oi2018_display'], [.84, .74, 1]),
    ],
    buildNote: 'The last automatic position batch was sent at 17:07 UTC, and the last military radar return was at 18:22 UTC. Neither flight recorder has been recovered, and no position exists after that. From 18:25 the orange path is the Inmarsat illustrative reconstruction (Ashton et al., 2014, Table 9), one of many paths that fit the satellite data. The aircraft is drawn at its last reported cruise level because its altitude is unknown; the story stops at the last signal, not at an impact.',
  },
};
