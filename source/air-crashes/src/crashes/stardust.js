import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';

const NB = ' ';
const JIAAC = [-33.3575, -69.728889], SCTI = [-33.493611, -70.697778], TUP = [-33.358, -69.771], AC = [-33.336, -69.679];
const FC = [[-32.3, -70.6], [-32.3, -69.0], [-34.0, -69.0], [-34.0, -70.6]];
const L_FC = 'Route forecast · snowstorms, passes in cloud, schematic', L_TUP = 'Mount Tupungato · about 6,570 m', L_AC = 'The aircraft · position modelled', L_THOUGHT = 'They thought they were near Santiago · from their ETA';
const L_WIND = 'Incorrect speed calculation · headwind ≥100 kt, schematic', L_BAD = 'Bad weather · forecast: snowstorms in the Andes';
const L_OP = 'The operator · Los Cerrillos, Santiago', A_FC = 'anchor forecast NW', A_ANDES = ['anchor andes NW', 'anchor andes SE'], A_B5 = 'anchor b5 east', A_B6 = 'anchor b6 east', A_UP = ['anchor end NW', 'anchor end SE low'], A_DOWN = ['anchor end NW high', 'anchor end SE'];
const arc = (a, c, k, n = 18) => Array.from({ length: n + 1 }, (_, i) => { const t = i / n, o = 4 * t * (1 - t) * k; return [a[0] + (c[0] - a[0]) * t - (c[1] - a[1]) * o, a[1] + (c[1] - a[1]) * t + (c[0] - a[0]) * o]; });
const anchor = (label, p) => ({ points: [p], only: [-1], kind: 'anchor', label });
const L_WRECK = 'JIAAC wreckage-area coordinate';

export const story = { beats: [
  b('1947-08-02T13:46:00Z', 'Buenos Aires, August second, 1947. The airliner Star Dust leaves for Santiago, with six passengers and five crew. Forecasts warn of snowstorms and cloud over the Andes.', ['Departure from Morón', 'Route forecast issued'], {
    v: 'follow', az: 110, el: 4, zoom: 1.3,
    shots: [{ at: 8.5, v: 'map', fit: ['Buenos Aires', 'Santiago', A_FC], fitPlane: false, mapSpeed: 1.6 }, { at: 11.3, v: 'map', fit: A_ANDES, fitPlane: false, mapSpeed: 1.3 }],
  }),
  b('1947-08-02T16:00:00Z', 'The crew reports its position by Morse code, flying at 10,000 feet. There is no radar, and no recorder. These reports are nearly all that survive.', ['Second preserved position report'], {
    v: 'map', sfx: 'morse',
    shots: [{ at: 8.0, fit: ['15:07', '16:00 reported position', '17:00'], fitPlane: false, mapSpeed: 1.8 }],
  }),
  b('1947-08-02T17:00:00Z', 'Near Mendoza, they report climbing toward 24,000 feet to cross the mountains.', ['Climb reported near Mendoza'], { v: 'map', lead: 1800 }),
  b('1947-08-02T17:33:00Z', 'They revise their arrival to 17:45. Investigators later inferred they were in cloud. No position was reported.', ['Arrival estimate revised'], {
    v: 'captain', sfx: 'morse', lead: 1980, at: '1947-08-02T17:33:00Z', atLead: 1,
  }),
  b('1947-08-02T17:41:00Z', 'Four minutes before they expect to land, the Santiago operator receives the last message. It ends with one word. S, T, E, N, D, E, C.', ['Final message received'], {
    v: 'captain', gap: 2, caption: 'S T E N D E C', capAt: 'S, T, E',
    shots: [{ at: 2.6, sfx: 'stendec' }],
  }),
  b('1947-08-02T17:42:30Z', 'Reception is strong and clear, but fast. The operator asks them to repeat it. The aircraft sends the same word twice more. No one has ever established what it means.', ['Operator requests clarification', 'Later message claims remain unconfirmed'], {
    v: 'map', fit: [L_OP, A_B5], fitPlane: false, fitMin: 150e3, gap: 1,
    shots: [{ at: 0, t: '1947-08-02T17:42:30.9Z', rate: 1 }, { at: 9.4, hidePins: [L_OP] }, { at: 11.7, v: 'follow', az: 150, el: 6, zoom: 1.6 }],
  }),
  b('1947-08-02T17:45:00Z', 'Star Dust was still in cloud when it struck Mount Tupungato. All eleven aboard died. They were not where they thought they were.', ['Collision with Tupungato'], {
    v: 'follow', az: 150, el: 6, zoom: 1.6, end: 1, lead: 4.3, gap: 1.5,
    shots: [
      { at: 0, t: '1947-08-02T17:44:55.9Z', rate: 1 },
      { at: 1.25, v: 'map', fit: [L_TUP, L_WRECK], fitPlane: false, fitMin: 115e3, mapSpeed: 2.2, lapse: 1 },
      { at: 6.9, v: 'map', fit: [A_B6, L_THOUGHT], fitPlane: false, mapSpeed: 1.6, lapse: 1 },
    ],
  }),
  b('end', 'Searches found nothing, and the aircraft became a legend. In 1998, climbers found an engine on the glacier. The ice had carried the wreckage downhill, for more than fifty years. Argentine investigators concluded an incorrect speed calculation and bad weather led the crew to descend too early. The final word is still unexplained.', ['Ground and air searches begin', 'Climbers find engine remains', 'Glacier movement explains concealment', 'Argentine findings publicly announced'], {
    lapse: 1,
    shots: [
      { at: 0, frame: [-33.36, -69.78, 120e3] },
      { at: 4.7, frame: [-33.378, -69.742, 34e3], mapSpeed: 1.5 },
      { at: 13.6, fit: A_UP, fitPlane: false, mapSpeed: 1.5 },
      { at: 21.9, fit: A_DOWN, fitPlane: false, mapSpeed: 1.6 },
    ],
  }),
] };

export const direct = {
  places: ['Buenos Aires', 'Santiago'],
  planned: false,
  pinFrom: { [L_WRECK]: 6, 'Alternative published recovery marker': 999, SCTI: 999, SADM: 999, '15:07 reported position': 1, '16:00 reported position': 1, '17:00 reported position': 1 },
  overlays: () => {
    const ice0 = destination(JIAAC[0], JIAAC[1], 240, 2400), ice1 = destination(JIAAC[0], JIAAC[1], 240, 900), wind0 = destination(-33.36, -69.42, 68, 1), wind1 = destination(-33.36, -69.42, 68, 38000);
    const b5e = destination(AC[0], AC[1], 90, 12000), b6e = destination(TUP[0], TUP[1], 90, 6000);
    const ring = Array.from({ length: 24 }, (_, i) => { const p = destination(JIAAC[0], JIAAC[1], i * 15, 800); return [p.lat, p.lon]; });
    return [
      { points: FC, closed: true, color: [1, .8, .5], width: 1.2, opacity: .85, dashed: true, alt: 7000, only: [0], label: L_FC, labelAt: .35, kind: 'landmark', detail: 'UK report §3(e): "Snow storms in the Andes Mountains with moderate to intense turbulence", passes in cloud, conditions in the passes "unfit for visual contact or instrument flying". JIAAC p. 19 reproduces the forecast. The forecast gives no outline, so this area is schematic.', sources: ['s1', 's2'] },
      { points: [[-33.916667, -62.55]], alt: 500, only: [1], from: 8.0, label: '15:07', kind: 'landmark', detail: 'Crew report at 10,000 ft (UK and Argentine reports). Not independently fixed by radar.', sources: ['s1', 's2'] },
      { points: [[-32.833333, -68.5]], alt: 1500, only: [1], from: 8.0, label: '17:00', kind: 'landmark', detail: 'Crew report at 20,000 ft, climbing toward 24,000 ft. The last preserved report containing coordinates.', sources: ['s1', 's2'] },
      { points: [[-34.6037, -58.3816]], alt: 200, only: [0], label: 'Buenos Aires', kind: 'landmark', detail: 'Geography for reference. Star Dust left from Morón, in Greater Buenos Aires.', sources: ['s2'] },
      { points: [[-32.833333, -68.5]], alt: 1500, only: [2], label: 'Mendoza', kind: 'landmark', detail: 'Crew report at 20,000 ft, climbing toward 24,000 ft (JIAAC 3.1.14). Whether and when 24,000 ft was reached is not known.', sources: ['s1', 's2'] },
      { points: [TUP], alt: 6560, only: [2], label: 'Tupungato', kind: 'landmark', detail: 'Published heights differ (6,570–6,635 m). Geography for reference, not a point on the flight path.', sources: ['s2', 's3'] },
      { points: [TUP], alt: 6560, only: [6], label: L_TUP, kind: 'landmark', detail: 'Published heights differ (6,570–6,635 m). Geography for reference, not a point on the flight path.', sources: ['s2', 's3'] },
      { points: [[-33.4489, -70.6693]], alt: 1200, only: [0, 1], label: 'Santiago', kind: 'landmark', detail: 'Geography for reference. Star Dust was bound for Los Cerrillos airport.', sources: ['s2'] },
      { points: [SCTI], alt: 1200, only: [5], label: L_OP, kind: 'landmark', detail: 'Los Cerrillos airport, Santiago, where the radio operator received the messages. The station position is approximate.', sources: ['s1', 's2'] },
      { points: [AC], alt: 5200, only: [5], label: L_AC, kind: 'landmark', detail: 'Where the drawn track puts the aircraft at 17:42. No position was reported after 17:00; this point is modelled on the straight line to the wreck area.', sources: ['s2'] },
      { points: arc(AC, SCTI, .1), color: [.6, .85, 1], width: 1.6, opacity: .95, alt: 7200, only: [5], from: .5, draw: 1.2, kind: 'landmark', detail: 'UK report p. 4: reception at Santiago was loud and clear but very fast. The arc is schematic; it shows who sent the message, not a radio path.', sources: ['s1', 's2'] },
      { points: arc(SCTI, AC, .1), color: [1, .82, .55], width: 1.6, opacity: .95, alt: 7200, only: [5], from: 4.2, draw: 1.1, kind: 'landmark', detail: 'UK report p. 4: not understanding STENDEC, the operator queried it. No times are recorded for the exchange; the arc is schematic and the station position approximate.', sources: ['s1', 's2'] },
      { points: arc(AC, SCTI, .2), color: [.6, .85, 1], width: 1.6, opacity: .95, alt: 7200, only: [5], from: 6.9, draw: 1.2, kind: 'landmark', detail: 'UK report p. 4: the aircraft repeated STENDEC twice in succession. The report gives no separate times; the arc is schematic.', sources: ['s1', 's2'] },
      { points: [JIAAC], alt: 4600, only: [6], from: 3.9, label: 'Tupungato', kind: 'wreckage', detail: 'JIAAC gives 17:45 as a nominal time; the UK inquiry gives only 17:41–17:45. The marker is the wreckage-area coordinate (JIAAC §1.10). Ice moved the wreckage, and the original impact was probably higher up; the exact point is not known.', sources: ['s1', 's2', 's3'] },
      { points: [SCTI], alt: 1200, only: [6], from: 7.3, label: L_THOUGHT, kind: 'landmark', detail: 'At 17:41 the crew gave an arrival at Santiago of 17:45, four minutes away. Only the ETA was reported; where they believed they were is inferred from it.', sources: ['s1', 's2'] },
      { points: [JIAAC, SCTI], color: [1, .8, .5], width: 1.4, opacity: .9, dashed: true, alt: 7200, only: [6], from: 7.0, draw: 1.2, kind: 'landmark', detail: 'JIAAC §3.1.19: the aircraft was 47.5 NM or more from Los Cerrillos airport, east of the main ridge.', sources: ['s2'] },
      { points: ring, closed: true, color: [1, .55, .4], width: 2, opacity: 1, alt: 5000, only: [7], from: 4.9, draw: .8, kind: 'wreckage' },
      { points: arrow([ice0.lat, ice0.lon], [ice1.lat, ice1.lon], .35), color: [.15, .55, 1], width: 2.6, opacity: 1, alt: 5300, only: [7], from: 9.3, draw: .9, label: 'Glacier flow', labelAt: .35, kind: 'landmark', detail: 'Direction only, along the debris fan (210°–244°, JIAAC §1.12) and the local slope, ending at the wreckage area. The original impact was higher up; its point, the path and the rate of ice flow are not known.', sources: ['s2', 's3'] },
      { points: arrow([wind0.lat, wind0.lon], [wind1.lat, wind1.lon], 8), color: [.25, .65, 1], width: 2.4, opacity: 1, alt: 7500, only: [7], from: 14.4, draw: 1, label: L_WIND, labelAt: .5, kind: 'landmark', detail: 'JIAAC §2.4 models a headwind component of at least 100 kt, against the 40–45 kt the crew allowed for. The arrow shows direction only; no complete wind vector exists.', sources: ['s2'] },
      { points: [JIAAC, SCTI], color: [1, .8, .5], width: 1.4, opacity: .9, dashed: true, alt: 7200, only: [7], from: 16.2, draw: 1.2, label: 'Where the crew thought they were', labelAt: .6, kind: 'landmark', detail: 'Schematic. At 17:41 the crew gave an arrival at Santiago of 17:45. JIAAC: the aircraft was 47.5 NM or more from Los Cerrillos, east of the main ridge.', sources: ['s1', 's2'] },
      { points: [[-33.1, -70.25]], alt: 7000, only: [7], from: 18.4, label: L_BAD, kind: 'landmark', detail: 'UK report §3(e) and JIAAC p. 19: snowstorms, passes in cloud, moderate to intense turbulence. The forecast gives no outline; the marker only names the crossing.', sources: ['s1', 's2'] },
      anchor(A_FC, FC[0]), anchor(A_ANDES[0], [-31.9, -71.0]), anchor(A_ANDES[1], [-34.4, -67.8]), anchor(A_B5, [b5e.lat, b5e.lon]), anchor(A_B6, [b6e.lat, b6e.lon]),
      anchor(A_UP[0], [-32.95, -70.9]), anchor(A_UP[1], [-34.05, -68.9]), anchor(A_DOWN[0], [-32.5, -70.9]), anchor(A_DOWN[1], [-33.62, -68.9]),
    ];
  },
  fx: [
    { type: 'ping', t: '1947-08-02T16:00:00Z', text: '', life: 5 },
    { type: 'ping', t: '1947-08-02T17:42:31.3Z', text: '', life: 3 },
    { type: 'ping', t: '1947-08-02T17:42:37.8Z', text: '', life: 1.6 },
    { type: 'ping', t: '1947-08-02T17:42:39.1Z', text: '', life: 2.4 },
  ],
  shake: [['1947-08-02T17:30:00Z', '1947-08-02T17:45:00Z', .3]],
  epilogue: [-33.36, -69.78, 120e3], epilogueEnv: { layers: [], fogVisKm: 0 }, aircraft: 'lancastrian', terrain: 'stardust', localFrom: '1947-08-02T17:20:00Z', az: 230, el: 8, routeAlt: 1500e3, navLights: false, fitDest: false, cruiseKt: 190, climbFpm: 340,
  add: [
    { t_utc: '1947-08-02T13:46:00Z', lat: -34.679167, lon: -58.643611, alt_ft: 98, quality: 'derived', method: 'The departure time and airport are reported. The coordinates and elevation are later airport-reference data, shown as a starting point.', sources: ['s2', 's12', 's13'] },
    { t_utc: '1947-08-02T17:13:00Z', alt_ft: 24000, quality: 'modelled', method: 'Illustrative. At 17:00 the crew reported 20,000 ft and climbing to 24,000 ft (JIAAC 3.1.14); whether and when it was reached is not known. The NOVA reconstruction has the aircraft at 24,000 ft before the descent.', sources: ['s1', 's2', 's3'] },
    { t_utc: '1947-08-02T17:28:00Z', alt_ft: 24000, quality: 'modelled', method: 'Illustrative start of descent. JIAAC infers the aircraft was descending in cloud by 17:33; NOVA’s narration starts the descent after the 17:45 ETA call. When the descent began is not known.', sources: ['s2', 's3'] },
    { t_utc: '1947-08-02T17:33:00Z', lat: -33.25, lon: -69.48, alt_ft: 21500, quality: 'modelled', method: 'JIAAC places the aircraft about 14 NM short of impact, descending in cloud at this time. Position is interpolated on the straight line to the wreck area; altitude is illustrative.', sources: ['s2'] },
    { t_utc: '1947-08-02T17:42:25Z', alt_ft: 16300, quality: 'modelled', method: 'Illustrative height on the straight line to the wreck area, kept above the ridge that the line crosses here. No height or position was reported.', sources: ['s2'] },
    { t_utc: '1947-08-02T17:45:00Z', lat: -33.3575, lon: -69.728889, alt_ft: 14900, quality: 'modelled', method: 'Illustrative endpoint. Debris was recovered at 4,408–4,654 m, but wreckage moved within the glacier; a glaciologist’s reconstruction puts the original collision higher up. The exact point and height are not known.', sources: ['s2', 's3'] },
  ],
  env: { layers: [{ base_ft: 10500, top_ft: 23000, cover: 1.25, density: .75, flat: .85, scale: .02 }], radiusKm: 130, fogVisKm: 30, fogTopKm: 2, center: [-33.3, -69.6], nightLights: 0, globalClouds: 0 },
  buildNote: 'There is no recorder or radar. The path joins three radio position reports and the wreck area. The early-descent scenario follows the inquiry, but the plotted heights and endpoint are illustrative. Terrain and imagery are modern. Snow is painted on above about 2,700 m to suggest August, midwinter there; its true extent in 1947 is not known.',
};
