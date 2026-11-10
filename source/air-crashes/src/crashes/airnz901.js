import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';
const NZ_ORBIT = { quality: 'modelled', method: 'Schematic. The recorder gives the times and turn directions: a right descending orbit from 00:32:05, then a second orbit to the left from 00:38:23, broken by a letdown on grid heading 180° (north, away from Ross Island) before the left turn resumed and the Hallett–McMurdo track was recaptured at 00:44:40. The orbit positions and sizes were not published. This pattern is drawn at about 300 kt and ends at the recapture point, worked back from the impact at 257 kt.', sources: ['s3', 's4'] };
const HALLETT = [-72.333333, 170.216667], DAILEY = [-77.883333, 164.8], TACAN = [-77.878333, 166.966667], LATER = [1, 2, 3, 4, 5, 6, 7, 8];
const BRIEFED = { color: [.62, .86, 1], width: 1.5, opacity: .9, dashed: true, alt: 600, kind: 'satellite', detail: 'At the briefing the last waypoint lay near the Dailey Islands, west of Ross Island, so the crew expected a track down McMurdo Sound. Drawn as a great circle from the Cape Hallett point; it is an expected route, not a flown track.', sources: ['s5'] };
const PROG = { color: [1, .6, .5], width: 1.5, opacity: .9, alt: 4000, kind: 'landmark', detail: 'In the early hours before departure the last waypoint was moved east, from 164°48′E to 166°58′E, near the McMurdo TACAN. The computer track from Cape Hallett then ran over Ross Island and Mount Erebus. The crew were not told. Drawn as a great circle, as the inertial navigation flew it, and 4,000 m up so the island’s terrain does not hide it on the map.', sources: ['s5', 's6'] };
const SHIFT = { points: [DAILEY, ...[.25, .5, .75].map((f) => [DAILEY[0] + (TACAN[0] - DAILEY[0]) * f, DAILEY[1] + (TACAN[1] - DAILEY[1]) * f]), ...arrow(DAILEY, TACAN, 5).slice(1)], color: [1, .84, .55], width: 1.8, opacity: .95, alt: 900, labelAt: .4, label: 'Waypoint moved 27 nm east', kind: 'landmark', detail: 'Mahon dates the change to about 01:40 NZDT on 28 November, before the 08:17 departure. The longitude changed from 164°48′E to 166°58′E, about 27 nautical miles east. The crew were not told.', sources: ['s1', 's5', 's13'] };
const SHIFT_FIT = { fit: ['Western waypoint near Dailey Islands', 'Revised McMurdo TACAN waypoint', 'Initial impact on the ice slope'], fitPlane: false, fitMin: 240e3 };
const oval = (c, ew, ns, n = 36) => Array.from({ length: n }, (_, i) => { const a = i * 2 * Math.PI / n, p = destination(c[0], c[1], 90, ew * 1000 * Math.sin(a)), q = destination(p.lat, p.lon, 0, ns * 1000 * Math.cos(a)); return [q.lat, q.lon]; });
const PROG_LBL = [-77.7128, 167.1059], CLIFF = [-77.4121, 167.4682];
// Alternating inside views keeps the screen dipped to black while the cockpit look zoom settles, so the glareshield selector windows never show.
const DARK = (n, from = 0) => Array.from({ length: n }, (_, i) => ({ at: from + i * .2, v: i % 2 ? 'captain' : 'passenger' }));
const LOW = (cover, x = {}) => ({ base_ft: 2000, top_ft: 7500, cover, density: .9, flat: 1, scale: .018, ...x }), UPPER = { base_ft: 16000, top_ft: 21000, cover: .6, density: .25, flat: 1, scale: .012 };

export const story = { beats: [
  b('1979-11-27T19:17:00Z', 'Auckland, the morning of November twenty-eighth, 1979. 257 people board a sightseeing flight to Antarctica and back. Before it leaves, the last waypoint in its route is moved east. The crew are not told.', ['Departure from Auckland', 'Destination waypoint changed'], { v: 'follow', az: 215, el: 7, zoom: 1.5, dwell: 0, shots: [
    { at: 'sightseeing', v: 'map', frame: [-60, 172, 10500e3] },
    { at: 'Before it leaves', v: 'map', ...SHIFT_FIT, mapSpeed: 1.5 },
  ] }),
  b('1979-11-28T00:18:05Z', 'Five hours later, near McMurdo, a forecaster reports low cloud around 2,000 feet. The captain plans to go lower, to show the passengers the ice.', ['Low overcast reported', 'Earlier descent proposed'], { v: 'passenger', shots: [
    { at: 0, v: 'map', frame: [-76.99, 167.8, 850e3], mapSpeed: 2.6 },
    { at: 'reports', v: 'passenger', sfx: 'radio', look: [0, 8, 60], lookAt: 1.2 },
    { at: 'The captain', t: '1979-11-28T00:18:29Z', tLead: 1.2, sfx: 'radio', look: [0, 8, 60], lookAt: -2 },
  ] }),
  b('1979-11-28T00:31:01Z', 'The captain sees a break in the cloud, and circles down through it, twice.', ['Captain proposed an orbit', 'First descending orbit began'], { v: 'map', gap: 3, lapse: 1, frame: [-77.05, 167.3, 150e3] }),
  b('1979-11-28T00:44:40Z', 'The autopilot picks up the programmed route again. Because of the changed waypoint, that line now leads to the northern slopes of Mount Erebus.', ['Revised track recaptured'], { v: 'map', lapse: 1, shots: [
    { at: 0, frame: [-77.12, 167.55, 75e3] },
    { at: 'Because', ...SHIFT_FIT },
    { at: 'northern slopes', fit: ['Initial impact on the ice slope', 'Mount Erebus'], fitMin: 70e3, mapSpeed: 1.6 },
  ] }),
  b('1979-11-28T00:48:23Z', 'They settle at 1,500 feet. White ground, white cloud. In this light, a rising snow slope and a far horizon can look the same.', ['Altitude hold at 1515 feet'], { v: 'captain', gap: 3, look: [-10, 12.5, 22], lookAt: -2, shots: [...DARK(10), ...DARK(2, 13.72)] }),
  b('1979-11-28T00:49:30Z', 'The captain decides to leave. "We\'re twenty six miles north. We\'ll have to climb out of this."', ['Captain decided to climb away'], { v: 'captain', gap: 1, look: [-10, 13, 24], lookAt: -2, shots: [...DARK(6), ...DARK(2, 6.81)] }),
  b('1979-11-28T00:49:39Z', 'They cross the coast. The ground starts to rise.', ['Aircraft crossed coastal ice cliff'], { v: 'map', lapse: 1, frame: [-77.46, 167.46, 55e3], lead: 1.5, gap: 1.2 }),
  b('1979-11-28T00:49:43Z', 'Six and a half seconds before impact, the ground warning sounds.', ['Ground proximity warning began'], { v: 'captain', sfx: 'gpws', end: 1, gap: 3.8, lead: 0, look: [-10, 13.5, 22], lookAt: -2, shots: DARK(10) }),
  b('end', 'All 257 aboard died. The first investigation mainly blamed the decision to fly low. A Royal Commission then blamed the route change and the airline\'s procedures, and cleared the crew. The airline apologized for its treatment of families in 2009. In 2019, the government and the airline apologized again.', ['Chippindale report submitted', 'Royal Commission reported', 'Government and airline apologised'], { shots: [
    { at: 0, fit: ['Initial impact on the ice slope', 'Mount Erebus'], fitPlane: false, fitMin: 70e3 },
    { at: 'The first investigation', fit: ['Initial impact on the ice slope'], fitPlane: false, fitMin: 70e3 },
    { at: 'A Royal Commission', ...SHIFT_FIT },
    { at: 'In 2019', fit: ['Initial impact on the ice slope', 'Mount Erebus'], fitPlane: false, fitMin: 60e3, mapSpeed: .35 },
  ] }),
] };

export const direct = {
  places: ['Auckland', 'Christchurch'],
  epilogue: [-77.45, 167.0, 270e3], aircraft: 'dc10', terrain: 'airnz901', endAlt: 1467, localFrom: '1979-11-28T00:43:00Z', az: 215, el: 6, routeAlt: 5200e3, fitDest: false, terrainFlat: .92, planned: false,
  prefix: { from: '1979-11-27T19:17:00Z', until: '1979-11-28T00:17:13Z', points: [{ lat: -50.7, lon: 166.166667 }, { lat: -55, lon: 165.466667 }, { lat: -60, lon: 164.533333 }, { lat: -66.75, lon: 163 }, { lat: -72.333333, lon: 170.216667 }, { lat: -75.51138, lon: 168.65497, skip: true }].map((p) => ({ ...p, alt_ft: 33000, method: 'Flight-plan point, timed at a constant speed from departure to the 00:17:13 position. Height is the recorded cruise level, FL330, assumed for the whole cruise.' })) },
  add: [
    { t_utc: '1979-11-28T00:17:13Z', lat: -75.51138, lon: 168.65497, pressure_alt_ft: 33000, quality: 'derived', method: 'The recorder analysis puts the aircraft about 144 miles north of McMurdo. It is placed on the Hallett–McMurdo track, taking the miles as nautical. FL330 is the recorded cruise level, a pressure level.', sources: ['s3', 's4'], locator: 'Annex C p. 41; Annex D p. 75' },
    { t_utc: '1979-11-28T00:18:44Z', pressure_alt_ft: 33000, quality: 'derived', method: 'The recorder analysis dates the start of the descent from cruise FL330 to this second.', sources: ['s4'], locator: 'Annex D p. 75' },
    { t_utc: '1979-11-28T00:25:10Z', pressure_alt_ft: 18000, quality: 'recorded', method: 'Automatic level-off at FL180. This is a pressure level; height above sea level is not established.', sources: ['s4'], locator: 'Annex D p. 75' },
    { t_utc: '1979-11-28T00:32:04Z', pressure_alt_ft: 18000, quality: 'derived', method: 'Held at FL180 from the automatic level-off until the descending orbit began at 00:32:05.', sources: ['s4'], locator: 'Annex D pp. 75–76' },
    ...['1979-11-28T00:48:48Z', '1979-11-28T00:49:33Z', '1979-11-28T00:49:39Z'].map((t_utc) => ({ t_utc, pitch_deg: 5, quality: 'derived', method: 'Annex D gives a level-flight attitude of about 5° nose-up until the pull-up in the last seconds.', sources: ['s4'], locator: 'Annex D pp. 77–78' })),
    ...backTrack(-77.05716, 167.62205, 189.5, '1979-11-28T00:44:40Z', [[322, 360], [56, 0], [218, -178], [48, 0], [111, -182]], 155, NZ_ORBIT),
  ],
  overlays: () => [
    { ...BRIEFED, points: [HALLETT, DAILEY] },
    { ...BRIEFED, points: [[-77.3348, 165.5499]], label: 'Briefed route' },
    { ...PROG, points: [HALLETT, TACAN], only: [0], from: 14.4, draw: 1.6 },
    { ...PROG, points: [PROG_LBL], label: 'Programmed route', only: [0], from: 14.6 },
    { ...PROG, points: [HALLETT, TACAN], only: LATER },
    { ...PROG, points: [PROG_LBL], label: 'Programmed route', only: LATER },
    { ...SHIFT, only: [0], from: 14.4, draw: 1.2 },
    { ...SHIFT, only: [3], from: 3.1, draw: 1, label: 'Waypoint moved 27 nm east' },
    { ...SHIFT, only: [8], from: 6.4, draw: 1.2, label: 'Waypoint moved 27 nm east' },
    { points: oval([-77.02, 167.3], 23, 25), closed: true, only: [2], color: [.92, .96, 1], width: 1.4, opacity: .85, alt: 2300, kind: 'landmark', detail: 'From passenger photographs, the report places the break the aircraft descended through just north of Beaufort Island (1.17.45), and says the descending turns were made before the aircraft crossed the coast of Ross Island east of Beaufort Island (1.17.43). At 00:31:08 the captain said “it’s clear out here if we get down” (Annex C p. 51). The size and shape of the break were not recorded and the orbit positions drawn are schematic, so this area is drawn to take in both the reported break and the schematic orbits.', sources: ['s1', 's3'] },
    { points: [[-76.933, 166.933]], only: [2], alt: 300, label: 'Beaufort Island', kind: 'landmark', detail: 'Beaufort Island, north of Ross Island. Geography for reference; the report places the cloud break just north of it (1.17.45).', sources: ['s1'] },
    { points: [[-77.3235, 167.5398], [-77.425, 167.458333]], only: [8], from: 1.9, draw: 1.2, color: [1, 1, 1], width: 2, opacity: .95, alt: 460, kind: 'landmark', detail: 'Altitude hold was annunciated at 1,515 ft at 00:48:23 and held, with small deviations, to the impact (Annex D p. 77).', sources: ['s4'] },
    { points: [[-77.5282, 167.0705], [-77.5282, 167.0705]], color: [1, 1, 1], width: 0, opacity: 0, alt: 3130, label: 'Mount Erebus', labelAt: 0, kind: 'landmark', detail: 'Summit of Mount Erebus, placed at the highest point of the elevation data used for the terrain here (Terrain Tiles). That data is coarse: it puts the summit about 3,130 m high and about 2 km west of the surveyed 3,794 m peak. Geography for reference, not a point on the flight path.', sources: [] },
  ],
  fx: [
  ],
  env: { layers: [LOW(.25), { ...UPPER, cover: .3 }], sea: .1, ice: true, fogTopKm: 3, radiusKm: 420, center: [-77.0, 167.4], follow: true, globalClouds: 0 },
  cues: [
    { t: '1979-11-28T00:21:00Z', ramp: 120, env: { layers: [LOW(.72), UPPER] } },
    { t: '1979-11-28T00:30:00Z', ramp: 60, env: { layers: [LOW(.45, { flat: .5 }), UPPER] } },
    { t: '1979-11-28T00:44:50Z', ramp: 90, env: { layers: [LOW(.72), UPPER] } },
    { t: '1979-11-28T00:47:30Z', ramp: 45, env: { layers: [LOW(1, { density: .95 }), { ...UPPER, cover: 1 }], fogVisKm: 60 } },
  ],
  buildNote: 'Positions in the last two minutes are estimates, worked back from the reported impact position at a constant 257 kt along the wreckage alignment of about 190 degrees. They are not published, time-tagged positions. The 00:17 position is the recorder analysis’s “about 144 miles north of McMurdo”, placed on the programmed track. The two orbits (00:32–00:42) are a schematic: their times and turn directions are recorded, but their coordinates were not published. Earlier points are flight-plan points; altitude reports are kept. Pitch is held at the 5° level-flight attitude Annex D gives until the pull-up. The briefed and programmed routes are drawn as great circles from Cape Hallett; the programmed one is drawn 4,000 m up so Ross Island’s terrain does not hide it on the map. The coastal ice cliff is placed 11 seconds back along the final track from the impact (Annex D); its position was not published. The terrain is modern elevation data painted white; it is not imagery from 1979. Cloud shapes are generated. North of Franklin Island, at 00:18, the low layer is drawn broken; photographs show continuous cloud from about Franklin Island (report 1.17.45). During the orbits the low layer is drawn broken again: the report places the break the aircraft descended through just north of Beaufort Island (1.17.45). The area drawn there is illustrative: it takes in that position and the schematic orbits, because neither the size of the break nor the orbit positions were recorded. From 00:47:30 the low layer is drawn as a full overcast with a base near 2,000 ft and clear air beneath it (report 1.17.43–45). The upper layer is drawn closed as well (the impact-site record lists upper and mountain cap cloud), and a light haze fades the far horizon; visibility was reported as about 40 miles (1.7.3). That elevation data is coarse over Antarctica: at the reported impact position it is several hundred metres lower than the recorded height, so the drawn slope rises about 2 km further on and the aircraft ends above it. It also puts Mount Erebus about 3,130 m high and about 2 km west of its surveyed 3,794 m summit.',
};
