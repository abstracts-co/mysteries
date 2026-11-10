import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';

const RIO = 'Rio de Janeiro · took off 19:29 local (22:29 UTC)', PARIS = 'Paris · destination';
const LATER = ['BEA accident and wreckage reference', 'Last transmitted ACARS position', 'Centre of initial search circle'];

export const story = { beats: [
  b('2009-06-01T00:09:14Z', 'Rio de Janeiro. The evening of May thirty-first, 2009. Air France 447 leaves for Paris with 228 people aboard.', ['Departure from Rio'], { v: 'map', shots: [{ at: 0, fit: [RIO, PARIS] }, { at: 'Paris', mapSpeed: .8 }] }),
  b('2009-06-01T01:35:15Z', 'Three hours out over the Atlantic, the crew reports its position. Soon after, the aircraft passes the edge of radar coverage.', ['Oceanic position report', 'Last recorded radar point'], { v: 'map', sfx: 'radio', mapSpeed: .45, hidePins: LATER }),
  b('2009-06-01T02:01:58Z', 'Ahead is the band of storms that circles the equator. The captain goes to rest. Two copilots now have the controls.', ['Captain leaves for rest'], { v: 'map', frame: [1.0, -30.75, 2.54e6], hidePins: LATER }),
  b('2009-06-01T02:06:00Z', 'The flying copilot warns the cabin crew. More turbulence is coming.', ['Cabin crew warned of turbulence'], { v: 'passenger', at: '2009-06-01T02:06:05Z', atLead: 1 }),
  b('2009-06-01T02:08:12Z', 'They turn left, probably to avoid weather on the radar.', ['Heading change begins'], { v: 'map', frame: [2.875, -30.62, 90e3], lapse: 1 }),
  b('2009-06-01T02:10:05Z', 'Ten minutes past two. The autopilot disconnects. Ice crystals have most likely blocked the speed sensors, and the speed readings no longer agree.', ['Autopilot disconnects'], { v: 'captain', lead: 1, gap: 1.5, look: [-18, -19, 23], lookAt: .6, shots: [{ at: 1.8, sfx: 'alarm', lookAt: 0 }] }),
  b('2009-06-01T02:10:08Z', 'The flight-control mode changes, and the automatic protection against a stall is gone. The flying copilot pulls the nose up.', ['Alternate flight-control law', 'Autothrust disconnects'], { v: 'follow', az: 150, el: 4, zoom: 1.25, orbit: 0, push: 0, shots: [{ at: 2.4, sfx: 'stall' }, { at: 'The flying', az: 90, el: 0, zoom: 1.6, orbit: .3, push: .05 }] }),
  b('2009-06-01T02:10:26Z', 'The aircraft climbs at nearly 7,000 feet a minute.', ['Climb rate reaches maximum'], { v: 'follow', az: 100, el: -6, zoom: 1.7 }),
  b('2009-06-01T02:10:36Z', 'Within half a minute, the left speed display is reliable again. Nobody calls for the procedure written for lost speed readings.', ['Left-side speed recovers', 'Crew identifies missing speeds'], { v: 'captain', lead: 3, look: [-19, -19, 27], lookAt: .3 }),
  b('2009-06-01T02:10:51Z', 'The stall warning sounds continuously now. The nose stays up.', ['Continuous stall warning starts'], { v: 'captain', gap: 5, sfx: 'stall', look: [-12, -12, 30], lookAt: .3, shots: [{ at: 6.1, sfx: 'alarm', lookAt: 0 }] }),
  b('2009-06-01T02:11:10Z', 'At about 38,000 feet the climb ends. The wings can no longer provide enough lift, and the aircraft begins to descend with its nose still raised.', ['Highest recorded pressure altitude'], { v: 'follow', az: 270, el: 0, zoom: 2.2, orbit: .3, push: 0, gap: 3, shots: [{ at: 2.41, sfx: 'stall', az: 270.24 }, { at: 8.51, sfx: 'stall', az: 271.59 }] }),
  b('2009-06-01T02:11:42Z', 'The captain returns to the cockpit. The crew does not agree on what is happening.', ['Captain returns'], { v: 'follow', az: 30, el: 14, zoom: 2.1, orbit: .4, push: 0, shots: [{ at: 1.75, sfx: 'stall', az: 30.15 }] }),
  b('2009-06-01T02:11:45Z', 'Then the stall warning goes silent, because the system rejects its readings when measured speed falls too low. The silence does not mean recovery.', ['Stall warning becomes silent'], { v: 'follow', gap: 4, shots: [{ at: 0, v: 'captain', look: [-11, -16, 19], lookAt: .2 }, { at: 'The silence', v: 'follow', az: 120, el: 8, zoom: 2.2 }] }),
  b('2009-06-01T02:13:32Z', 'Ten thousand feet. Both copilots are now moving their controls at once, one mostly nose down, the other mostly alternating.', ['Passing near ten thousand feet', 'Overlapping control inputs'], { v: 'captain', lead: 1.5, gap: 3, look: [-12, -18, 18], lookAt: .2, shots: [{ at: 'Both copilots', t: '2009-06-01T02:13:40Z', tLead: 1, lookAt: 0 }] }),
  b('2009-06-01T02:14:17Z', 'About 2,000 feet above the sea, the ground warnings begin.', ['Ground-proximity warnings begin'], { v: 'follow', az: 60, el: -2, zoom: 1.3, gap: 2, sfx: 'gpws', lead: 1.5 }),
  b('2009-06-01T02:14:28Z', 'The recording ends. The aircraft struck the ocean in one piece, nose up, falling at nearly 11,000 feet a minute.', ['Recording ends near ocean impact'], { v: 'follow', az: 60, el: -2, zoom: 1.3, end: 1, lead: 6.6, shots: [{ at: .05, t: '2009-06-01T02:14:28.4Z', v: 'captain' }, { at: .6, v: 'follow' }] }),
  b('end', 'It took about two years to find the wreckage, 3,900 meters down. The recorders helped investigators trace confusion, an unrecognized stall, and the likely icing of speed sensors. Speed probes were replaced, and pilot training changed. In 2026, a Paris appeal court convicted Airbus and Air France of involuntary homicide. Airbus has said it will seek a further review.', ['Main wreckage located', 'BEA final report published', 'Appeal court convicts both companies', 'Airbus announces cassation appeal'], { shots: [{ at: 0, frame: [3.0, -30.6, 350e3], mapSpeed: .8 }] }),
] };

const FIX = new Set(['2009-06-01T00:09:14Z', '2009-06-01T02:10:09Z', '2009-06-01T02:10:11Z', '2009-06-01T02:10:17Z']);
const T = (s) => `2009-06-01T${s}Z`;
const circle = (lat, lon, km) => { const c = []; for (let i = 0; i <= 72; i++) { const q = destination(lat, lon, i * 5, km * 1000); c.push([q.lat, q.lon]); } return c; };
const ahead = (lat, lon, brg, km) => { const q = destination(lat, lon, brg, km * 1000); return [q.lat, q.lon]; };
const parallel = (lat, lon0, lon1) => { const p = []; for (let x = lon0; x <= lon1 + 1e-9; x += .5) p.push([lat, x]); return p; };

export const direct = {
  places: ['Rio de Janeiro', 'Paris'],
  apOff: '2009-06-01T02:10:05Z',
  aircraft: 'a330', start: false, localFrom: '2009-06-01T02:06:00Z', az: 205, el: 8, routeAlt: 3600e3, fitDest: false, planned: false,
  drop: (p) => p.fix || !FIX.has(p.t_utc),
  add: [
    { fix: true, t_utc: T('00:09:14'), ias_kt: 275, gs_kt: 481, mach: .8, hdg_deg: 24, pitch_deg: 2.8, roll_deg: -.4, aoa_deg: 2.8, pressure_alt_ft: 34992, airspeed_status: 'normal cruise display', quality: 'recorded', method: 'Recorded cruise values (Appendix 2 p.1). The recorded magnetic heading of 47° is converted to true (24°) with the modelled 2009 magnetic declination of about −23° here (NOAA model), so that the drawn path runs on its true course.', sources: ['s2'] },
    { t_utc: T('02:08:12'), hdg_deg: 29.8, quality: 'modelled', method: 'Heading before the left deviation: the recorded 35.5° magnetic at 02:10:00 plus the about 12° deviation BEA describes (synopsis p.17, §1.1 p.22), converted to true with about −17.7° declination. The turn starts at the recorded switch to heading mode.', sources: ['s1', 's2'] },
    { t_utc: T('02:08:45'), hdg_deg: 17.8, quality: 'modelled', method: 'End of the left turn, timed by this reconstruction: the recorded 35.5° magnetic, converted to true with about −17.7° declination.', sources: ['s1', 's2'] },
    { t_utc: T('02:09:59'), hdg_deg: 17.8, quality: 'modelled', method: 'True course held after the turn. From 02:10:00 the recorded magnetic headings are drawn unconverted, so the instruments show the recorded values.', sources: ['s2'] },
    { fix: true, t_utc: T('02:10:09'), ias_kt: 52, isis_cas_kt: 270, airspeed_status: 'erroneous PFD speed; ISIS temporarily near 270 kt', quality: 'recorded', method: 'Recorded left display speed 52 kt and standby 270 kt. The recorded pressure altitude of 34,664 ft here is an air-data error (s1 §1.6.9.6.3), so it is left out of the drawn altitude.', sources: ['s2'] },
    { t_utc: '2009-06-01T02:10:04.9Z', ias_kt: 282, airspeed_status: 'before abrupt air-data failure', quality: 'derived', method: 'Recorded 282 kt at 02:10:00, held until the autopilot disconnection.', sources: ['s2'] },
    { t_utc: '2009-06-01T02:10:05.1Z', ias_kt: 52, airspeed_status: 'erroneous PFD speed', quality: 'derived', method: 'BEA: the airspeed indications became inconsistent at the autopilot disconnection, with a sharp fall on the left display. The first recorded erroneous value (52 kt at 02:10:09) is shown from here; the exact shape of the fall is not recorded.', sources: ['s1', 's2'] },
    { fix: true, t_utc: T('02:10:17'), ias_kt: 80, isis_cas_kt: 92, airspeed_status: 'erroneous air data', quality: 'recorded', method: 'Recorded left display speed 80 kt and standby 92 kt, both erroneous. The recorded pressure altitude of 34,976 ft here comes from the same air-data error as at 02:10:09 and 02:10:11 (s1 §1.6.9.6.3), while the recorded vertical speed reached +5,200 ft/min by 02:10:18, so it is left out of the drawn altitude.', sources: ['s1', 's2'] },
    { t_utc: T('02:10:34'), ias_kt: 105, airspeed_status: 'erroneous air data', quality: 'recorded', method: 'Start of the 105 to 223 kt change listed at 02:10:34 (Appendix 2 p.3).', sources: ['s2'] },
  ],
  unknown: { ias: [[T('02:11:41'), T('02:12:42')]] },
  shake: [[T('02:00:00'), T('02:10:05'), .2], [T('02:10:54.5'), T('02:12:57'), .25]],
  epilogue: [3.0, -30.6, 350e3],
  env: { layers: [{ base_ft: 3000, top_ft: 8000, cover: .5, density: .5, flat: .8, scale: .06 }, { base_ft: 3000, top_ft: 52000, cover: .5, density: .95, flat: 0, scale: .14 }], sea: .55, radiusKm: 200, center: [2.85, -30.62] },
  nightExposure: 3.6,
  fx: [
    { type: 'ill', t: T('02:08:12'), until: T('02:09:35') },
    { type: 'ping', t: T('01:35:15'), text: '', life: 4.5 },
  ],
  overlays: (r) => [
    { points: [[r.route.from.lat, r.route.from.lon]], label: RIO, kind: 'landmark', only: [0], detail: 'Departure 22:29 UTC on 31 May 2009, 19:29 local time in Rio de Janeiro, with 228 people aboard (BEA final report §1.1).', sources: ['s1', 's8'] },
    { points: [[r.route.from.lat, r.route.from.lon], [-11.2023, -37.8265]], color: [.72, .74, .78], width: 1, opacity: .55, dashed: true, alt: 10700, only: [0], kind: 'landmark', detail: 'Schematic connector. AF447 took off from Rio de Janeiro at 22:29 UTC; the first flight-recorder point used here is at 00:09:14 UTC, about 1 h 40 min later. The route flown in between is not drawn.', sources: ['s1', 's2'] },
    { points: [[r.route.to.lat, r.route.to.lon]], label: PARIS, kind: 'landmark', only: [0], detail: 'Paris Charles de Gaulle, the planned destination.', sources: ['s8'] },
    { points: [[.581, -31.897]], label: 'Last radar point', kind: 'radar', only: [1], from: 4.7, detail: 'Radar showed the aircraft passing SALPU at about 01:49, at the limit of coverage. No coordinate for that radar point was transcribed, so the pin sits on the modelled path at 01:49 (BEA final report §1.9.1, §1.18.5.2).', sources: ['s1'] },
    { points: circle(2.85, -30.62, 200), closed: true, color: [1, .72, .45], width: 1.4, opacity: .9, dashed: true, alt: 12000, only: [2], label: 'Storms', labelAt: 0, kind: 'landmark', detail: 'Approximate. The BEA weather analysis describes a cluster of thunderstorms on the route about 400 km across east to west, with some cloud tops near 50,000 ft in the satellite analysis. This circle is drawn by this reconstruction, not a measured edge. Storm shapes in the 3D view are generated.', sources: ['s1', 's5'] },
    ...[.3, 4].map((lat) => ({ points: parallel(lat, -46, -15), color: [.62, .78, 1], width: 0, opacity: .4, alt: 12000, only: [2], from: .6, draw: 1.4 })),
    ...Array.from({ length: 24 }, (_, i) => ({ points: [[.3, -46 + i * 1.33], [4, -44.9 + i * 1.33]], color: [.62, .78, 1], width: 0, opacity: .09, alt: 12000, only: [2], from: .6, draw: 1.4 })),
    { points: [[2.7601, -30.6689], ahead(2.7601, -30.6689, 29.8, 26)], color: [.62, .68, .82], width: 1, opacity: .6, alt: 10700, only: [4] },
    { points: circle(2.98, -30.59, 74.08), closed: true, color: [.55, .8, 1], width: 1.2, opacity: .8, dashed: true, alt: 0, only: [16], label: 'First search area', labelAt: .75, kind: 'search_area', detail: 'BEA considered a 40 NM radius around the last transmitted position; towed pinger locators swept it in 2009 (Metron search analysis).', sources: ['s12', 's1'] },
    { points: [[3.06583333, -30.56166667]], label: 'Wreckage, found 2011', kind: 'wreckage', only: [16], detail: 'BEA accident and wreckage reference, about 3,900 m deep on the abyssal plain. BEA sources give 2 April and 3 April 2011 for the discovery.', sources: ['s1', 's6'] },
  ],
  buildNote: 'Attitude, speed and pressure altitude are from the flight data recorder. BEA publishes a plotted final path, but no table of coordinates was obtained. Positions shown are a modelled reconstruction between the last automatic position report and the wreckage area. Recorded headings are magnetic; for the cruise and the left turn they are converted to true with modelled 2009 declination (NOAA), and positions remain modelled. This dataset has heading and groundspeed only at the start and end of the upset; between them the speed is estimated from the recorded airspeed, and interpolated across the seconds when that airspeed was erroneous. The drawn path keeps that speed and is bent into a turn so that it ends at the wreckage area, with heading treated as ground track. Three pressure-altitude readings at 02:10:09, 02:10:11 and 02:10:17, taken while the speed readings were erroneous, are air-data errors and are left out of the drawn altitude. The drawn path ends at the last recorded pressure altitude (204 ft); no sea-level point is added. Storm shapes are generated; BEA reports storm cells and cloud tops, not their exact outlines. No lightning is shown: none was recorded at this aircraft.',
};
