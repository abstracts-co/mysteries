import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';

const SOLUCH = [31.672222, 20.243056], BENINA = [32.097, 20.269], BAIL = [26.9, 24.133333], TURN = [40.0, 15.2], NAPLES = [40.84, 14.26], COAST = [31.56, 25.15];
const dst = (p, brg, km) => { const q = destination(p[0], p[1], brg, km * 1000); return [q.lat, q.lon]; };
const THOUGHT = [.62, .82, 1], PROBABLY = [1, .68, .32];
const CREW = 'Crew’s belief: over the sea, inbound 150°', ARMY = 'Later investigators · past the station, outbound 150°', BEN = 'Benina radio station · approximate';

export const story = { beats: [
  b('1943-04-04T13:10:00Z', 'Libya, April fourth, 1943. A new American bomber called Lady Be Good takes off on its first mission, to bomb Naples. Nine men are aboard. Blowing sand breaks up the formation.', ['Lady Be Good takes off', 'Formation separates'], { v: 'follow', az: 195, el: 2, zoom: 2.4, gap: 3, shots: [
    { at: 0, v: 'map', fit: ['Soluch landing-ground vicinity', 'Naples harbor · target (s1)'], fitPlane: false },
    { at: 2.6, v: 'follow', az: 240, el: 4, zoom: 1.5, orbit: 1.6 },
    { at: 3.0, v: 'follow', az: 240, el: 4, zoom: 1.5, orbit: 1.6 },
    { at: 8.3, v: 'follow', az: 150, el: 3, zoom: 1.8, orbit: -1.2 },
    { at: 11.95, v: 'follow', az: 192, el: 9, zoom: 2.4, orbit: .5, push: .1 },
  ] }),
  b('1943-04-04T18:52:00Z', 'Alone, the crew turns for home after dark, and releases its bombs. Where they fell isn\'t known.', ['Return turn is logged', 'Engineer records bomb release'], { v: 'follow', lapse: 1, lead: 1200, az: 110, el: -10, zoom: 1.7, shots: [
    { at: 0, v: 'map', fit: ['Soluch landing-ground vicinity', 'Naples harbor · target (s1)'], fitPlane: false },
    { at: 3.8, v: 'follow', lapse: 0, bright: 5, az: 110, el: -10, zoom: 1.7, t: '1943-04-04T20:00:00Z', tLead: .2 },
  ], captions: [{ text: '“Things pretty well mixed up – Got lost returning”', who: 'Copilot’s diary, April 4 (s4)', at: .8, until: 3.5 }] }),
  b('1943-04-04T21:30:00Z', 'The crew reports its direction finder isn\'t working, and asks for a radio bearing. Later investigators suggested they mistook which side of the station they were on.', ['Crew requests radio help'], { v: 'pilot', sfx: 'radio', shots: [
    { at: 0, v: 'pilot' },
    { at: 3.45, v: 'follow', az: 150, el: 7, zoom: 1.6, bright: 5 },
    { at: 5.95, v: 'map', fit: [CREW, ARMY, BEN], fitPlane: false, fitMin: 600e3 },
  ] }),
  b('1943-04-04T22:05:00Z', 'Around midnight, men near the base hear a bomber pass overhead, and fire flares. It was probably this one. Investigators believed they flew on into the Sahara, mistaking the desert for the sea.', ['Aircraft is heard near base'], { v: 'below', gap: 3, lead: 3.5, shots: [
    { at: 0, v: 'below', bright: 2.5 },
    { at: 7.45, v: 'map' },
  ] }),
  b('1943-04-04T23:55:00Z', 'Two hours later, the fuel runs out.', ['Fuel becomes depleted'], { v: 'follow', az: 345, el: 5, zoom: .65, bright: 4, lead: 3, gap: 2 }),
  b('1943-04-05T00:10:00Z', 'They jump into the dark and land in desert, not water. Eight of the nine find each other.', ['Crew bails out', 'Eight men begin walking'], { v: 'follow', az: 150, el: 12, zoom: 1.6, bright: 3, shots: [
    { at: 0, v: 'follow', az: 150, el: 12, zoom: 1.6 },
    { at: 4.6, v: 'above', zoom: 16 },
  ], captions: [{ text: '“Can’t find John, all others present”', who: 'Copilot’s diary, April 4 (s4) · John Woravka, bombardier', at: 4.7, pos: 'top' }] }),
  b('1943-04-05T00:22:00Z', 'The empty bomber flies on, and comes down on a gravel plain, largely intact.', ['Uncrewed bomber strikes desert'], { v: 'map', gap: 2, lead: 80, end: 1, bright: 3, shots: [
    { at: 0, v: 'follow', az: 95, el: 2, zoom: 1.3, t: '1943-04-05T00:20:40.5Z' },
    { at: 1.9, v: 'follow', az: 35, el: 1, zoom: 1.7, t: '1943-04-05T00:21:35Z', tLead: 1.2 },
    { at: 4.08, v: 'follow', az: 120, el: 6, zoom: 1.1, t: '1943-04-05T00:21:57.4Z' },
  ] }),
  b('end', 'They may have thought the coast was close. It was hundreds of kilometers away. They walked north with half a canteen of water, sharing it by the capful, and left arrows made of parachutes behind them. Diaries record the days. Five stopped at the dunes. Three went on, for help. Oil surveyors found the bomber in 1958. Later searches found the crew\'s trail, and remains and diaries followed in 1960.', ['Eight men begin walking', 'Three continue for help', 'Copilot makes final entry', 'Oil surveyors reach the wreck', 'Boots reveal the northward trail'], { shots: [
    { at: 0, fit: ['Survivors assembly area', 'Mediterranean coast (nearest point)'], fitPlane: false },
    { at: 5.5, frame: [26.95, 24.02, 205e3], mapSpeed: 1.6 },
    { at: 15.6, fit: ['Northern parachute arrow', 'Five-person final camp', 'Gunner Shelley recovery area'], fitPlane: false },
    { at: 20.2, frame: [27.25, 23.8, 900e3] },
    { at: 26.6, frame: [28.6, 24.1, 2200e3], mapSpeed: .7 },
  ], captions: [
    { text: '“1/2 canteen of water, 1 cap full per day”', who: 'Copilot’s diary, April 5 (s4, s6)', at: 6.9, until: 10.3 },
    { text: 'April 5–12 (last entry)', type: true, at: 13.5, until: 15.5 },
  ] }),
] };

export const direct = {
  pinFrom: { 'Hypothesized unidentified-burial region': 999 },
  aircraft: 'b24', terrain: 'ladybegood', start: false, end: false, localFrom: '1943-04-04T23:35:00Z', az: 225, el: 7, routeAlt: 4200e3, fitDest: false, navLights: false, planned: false, cruiseKt: 170, gsLead: 170,
  epilogue: [27.3, 23.6, 600e3], nightExposure: 4, insideUntil: '1943-04-05T00:10:00Z',
  clockApprox: true,
  nightTag: 'Heard, not seen · identity inferred (s13) · position modelled',
  add: [
    { t_utc: '1943-04-04T13:10:00Z', lat: 31.672222, lon: 20.243056, alt_ft: 300, quality: 'modelled', method: 'Illustrative clock. The engineer’s diary gives takeoff at 3:10 on an unspecified clock; two hours are subtracted for this timeline. That is an assumption, not a verified conversion.', sources: ['s6'] },
    { t_utc: '1943-04-04T15:30:00Z', lat: 35.1, lon: 18.2, alt_ft: 12000, quality: 'modelled', method: 'Illustrative. Straight line toward Naples; no position is recorded.', sources: ['s1'] },
    { t_utc: '1943-04-04T18:52:00Z', lat: 40.0, lon: 15.2, alt_ft: 24000, quality: 'modelled', method: 'Illustrative. A later transcription reports a navigator’s log entry of a 140-degree course at 20:52 on an unspecified clock. The aircraft may not have reached Naples itself; the group bombed at 23,500–25,000 ft.', sources: ['s13', 's1'] },
    { t_utc: '1943-04-04T22:05:00Z', lat: 31.672222, lon: 20.243056, alt_ft: 9000, quality: 'modelled', method: 'Illustrative. Witnesses heard a bomber near Soluch around midnight on their clocks and thought it was probably this one. No fix exists; the time and height are placeholders.', sources: ['s13'] },
    { t_utc: '1943-04-04T23:07:30Z', lat: 29.286, lon: 22.188, alt_ft: 6250, quality: 'modelled', method: 'Illustrative midpoint on a straight line from the Soluch vicinity to the modelled bailout position. No position fixes exist.', sources: ['s13', 's7'] },
    { t_utc: '1943-04-05T00:10:00Z', lat: 26.9, lon: 24.133333, alt_ft: 3500, quality: 'modelled', method: 'Illustrative. This is the bombardier’s recovery position, used as the start of a later simulator study, with that study’s height. It is not an observed exit point. Diaries give 2:00 to 2:10 on an unspecified clock.', sources: ['s10', 's12', 's4', 's6'] },
    { t_utc: '1943-04-05T00:20:00Z', alt_ft: 1700, pitch_deg: -1, quality: 'modelled', method: 'Illustrative descent. With the crew gone and fuel exhausted, the bomber came down on its own; its path, speed and attitude are unknown.', sources: ['s7'] },
    { t_utc: '1943-04-05T00:21:00Z', alt_ft: 1150, pitch_deg: -3, quality: 'modelled', method: 'Illustrative descent. With the crew gone and fuel exhausted, the bomber came down on its own; its path, speed and attitude are unknown.', sources: ['s7'] },
    { t_utc: '1943-04-05T00:21:35Z', lat: 26.71780, lon: 24.02712, alt_ft: 894, pitch_deg: 1, roll_deg: 0, gs_kt: 70, quality: 'modelled', method: 'Illustrative first ground contact, placed about 700 yards before the wreck to match the published ground skid. The time and speed of contact are unknown.', sources: ['s7', 's10'] },
    { t_utc: '1943-04-05T00:21:48Z', lat: 26.71389, lon: 24.02486, alt_ft: 894, pitch_deg: 1, roll_deg: 0, gs_kt: 25, quality: 'modelled', method: 'Illustrative point in the belly skid to the wreck position.', sources: ['s7', 's10'] },
    { t_utc: '1943-04-05T00:22:00Z', lat: 26.712694, lon: 24.024167, alt_ft: 895, gs_kt: 0, quality: 'modelled', method: 'The wreck is a published historical astro-fix. The time and height of impact are unknown and are placeholders.', sources: ['s9', 's10'] },
  ],
  fx: [
    { type: 'gearDown', t: '1943-04-04T13:10:00Z', until: '1943-04-04T13:10:08.6Z' },
    { type: 'tag', t: '1943-04-04T13:10:05.5Z', until: '1943-04-04T13:10:08.2Z', text: 'Lady Be Good', cls: 'q' },
    { type: 'tag', t: '1943-04-04T13:10:10.4Z', until: '1943-04-04T13:10:11.8Z', text: 'Target: Naples harbor (s1)', cls: 'q' },
    { type: 'tag', t: '1943-04-04T13:10:11.95Z', until: '1943-04-04T13:10:14.2Z', text: 'Other B-24s ahead · positions illustrative' },
    { type: 'bombs', t: '1943-04-04T20:00:00Z', n: 10, every: .45, text: 'Bomb release · where they fell is unknown · Illustrative' },
    { type: 'ping', t: '1943-04-04T21:30:03.6Z', text: 'Bearing request · time illustrative', life: 2.6 },
    { type: 'flare', t: '1943-04-04T22:05:00.6Z', at: [31.672222, 20.243056], n: 2, every: 2.4, rise: 160, life: 6 },
    { type: 'engineOut', engine: 3, t: '1943-04-04T23:54:58.6Z', rpm: 0, spin: 1.8 },
    { type: 'engineOut', engine: 1, t: '1943-04-04T23:59:00Z', rpm: 0, spin: 1 },
    { type: 'engineOut', engine: 0, t: '1943-04-05T00:06:00Z', rpm: 0, spin: 1 },
    { type: 'tag', t: '1943-04-04T23:54:59.9Z', until: '1943-04-04T23:55:01.8Z', text: 'Feathered in turn (s19) · Illustrative' },
    { type: 'chutes', t: '1943-04-05T00:10:00Z', n: 8, partial: 0, every: 1.2, sink: 5.5 },
    { type: 'tag', t: '1943-04-05T00:10:04.6Z', until: '1943-04-05T00:10:07.2Z', at: [26.89554, 24.12915, 30], text: '8 of 9 met here · place approximate (s11)' },
    { type: 'tag', t: '1943-04-05T00:20:40Z', until: '1943-04-05T00:21:57Z', text: 'Descent and touchdown · Illustrative' },
    { type: 'smoke', t: '1943-04-05T00:21:35Z', until: '1943-04-05T00:22:00Z', n: 450, life: 6, size: 16, spread: 30, grow: .6, offset: [0, -2, 0] },
  ],
  eventTimes: { 'Lady Be Good takes off': '1943-04-04T13:10:00Z', 'Formation separates': '1943-04-04T13:10:14Z', 'Return turn is logged': '1943-04-04T18:52:00Z', 'Engineer records bomb release': '1943-04-04T20:00:00Z', 'Crew requests radio help': '1943-04-04T21:30:00Z', 'Aircraft is heard near base': '1943-04-04T22:05:00Z', 'Benghazi call may go unanswered': '1943-04-04T22:15:00Z', 'Fuel becomes depleted': '1943-04-04T23:55:00Z', 'Crew bails out': '1943-04-05T00:10:00Z', 'Uncrewed bomber strikes desert': '1943-04-05T00:22:00Z' },
  env: { layers: [], radiusKm: 600, center: [29.5, 21.5], follow: true, nightLights: 0, globalClouds: 0, fogVisKm: 0, fogTopKm: 1.5, fogTint: [.92, .68, .42] },
  formation: [[450, 10, -150], [650, 20, 140], [900, 30, -60], [1200, 40, 190]], formationUntil: '1943-04-04T13:10:19.4Z',
  formationDrift: { t: '1943-04-04T13:10:14.2Z', v: [[2, 0, -3], [3, 1, 3], [1, 0, -4], [4, 1, 4]] },
  cues: [
    { t: '1943-04-04T13:10:14.2Z', ramp: 4, env: { fogVisKm: .8 }, tag: 'Blowing sand · Illustrative', tagUntil: '1943-04-04T13:10:21Z' },
    { t: '1943-04-04T13:40:00Z', ramp: 1200, env: { fogVisKm: 0 } },
    { t: '1943-04-04T19:00:00Z', ramp: 1800, env: { layers: [{ base_ft: 5000, top_ft: 8000, cover: .55, density: .5, flat: .85, scale: .025 }] } },
    { t: '1943-04-04T21:25:00Z', ramp: 1500, env: { layers: [] } },
  ],
  overlays: (raw) => {
    const E = raw.evidence_points || [], at = (n) => { const e = E.find((x) => x.label === n); return e ? [e.lat, e.lon] : null; };
    const walk = ['Survivors assembly area', 'Flight boots', 'Southern parachute arrow', 'Parachute arrow two', 'Arrow with named harness', 'Parachute arrow four', 'Arrow near flight helmets', 'Arrow near harness section', 'Northern parachute arrow', 'Five-person final camp'].map(at).filter(Boolean);
    const camp = at('Five-person final camp'), ends = ['Flight engineer recovery area', 'Gunner Shelley recovery area'].map(at).filter(Boolean), asm = at('Survivors assembly area') || BAIL;
    const onPath = [30.24, 21.41];
    return [
      { points: [NAPLES], label: 'Naples harbor · target (s1)', kind: 'landmark', only: [0, 1], detail: 'Mission 109’s objective was Naples harbor (s1). The city is marked; the exact aimpoint was not recovered, and whether Lady Be Good reached it is unknown.', sources: ['s1'] },
      { points: arrow(TURN, dst(TURN, 140, 150), 22), color: THOUGHT, width: 1.6, opacity: .95, alt: 300, only: [1], from: .6, draw: 1.2, label: 'Logged course 140° · later transcription, clock unknown (s13)', kind: 'landmark', detail: 'A later transcription reports a navigator’s log entry of a 140-degree departure course. The original sheet was not obtained; its clock and reference are unknown. The turn position drawn here is illustrative.', sources: ['s13'] },
      { points: lop(BENINA[0], BENINA[1], 150, 170), color: [.85, .87, .9], width: 1, opacity: .75, alt: 300, dashed: true, only: [2], from: 6.6, draw: 1.2, label: 'Schematic · not to time or scale', labelAt: .35, kind: 'landmark', detail: 'Army reconstruction quoted by the QM Foundation (s7); a radio direction-finding study discusses it (s18). Whether the bearing came from onboard or ground direction finding is not established. Distances are illustrative.', sources: ['s7', 's18'] },
      { points: [BENINA], label: BEN, kind: 'landmark', only: [2], from: 6.6, detail: 'The wartime Benina field is the site of today’s Benina airport; the station position is approximate. The quoted Army reconstruction gives a 330-degree bearing from Benina (s7).', sources: ['s7'] },
      { points: arrow(dst(BENINA, 330, 140), dst(BENINA, 330, 60), 18), color: THOUGHT, width: 2, opacity: .95, alt: 300, only: [2], from: 7.2, draw: 1.1, labelAt: .35, label: CREW, kind: 'landmark', detail: 'Schematic. Position and distance illustrative (s7).', sources: ['s7'] },
      { points: arrow(dst(BENINA, 150, 60), dst(BENINA, 150, 140), 18), color: PROBABLY, width: 2, opacity: .95, alt: 300, only: [2], from: 8.4, draw: 1.1, labelAt: .35, label: ARMY, kind: 'landmark', detail: 'Schematic. Position and distance illustrative. Army reconstruction quoted by the QM Foundation (s7).', sources: ['s7'] },
      { points: lerpLine(SOLUCH, BAIL, 1, 24), color: PROBABLY, width: 1.6, opacity: .9, alt: 300, dashed: true, only: [3], from: 7.6, draw: 2.2, label: 'Modelled continuation · no fixes', kind: 'landmark', detail: 'No position fixes exist between the base and the bailout area. The line joins the Soluch vicinity to the modelled bailout position.', sources: ['s13', 's10'] },
      { points: [[33.3, 19.4]], label: 'Mediterranean', kind: 'landmark', only: [3], from: 7.6, detail: 'The sea the crew expected to be over.', sources: [] },
      { points: [[29.2, 22.4]], label: 'The desert they probably took for sea · Illustrative', kind: 'landmark', only: [3], from: 11.0, detail: 'Investigators believed the crew flew on over the desert, mistaking it for the sea (s3). The extent shown is illustrative.', sources: ['s3'] },
      { points: arrow(onPath, dst(onPath, 150, 90), 18), color: PROBABLY, width: 1.8, opacity: .95, alt: 300, only: [3], from: 8.6, draw: .8, label: '~150° course · Army reconstruction (s7)', kind: 'landmark', detail: 'The quoted Army reconstruction has the bomber holding about 150 degrees past the base (s7). Arrow placement schematic.', sources: ['s7'] },
      { points: [asm, COAST], color: THOUGHT, width: 1.4, opacity: .9, alt: 300, dashed: true, only: [7], from: 2.4, draw: 2.2, label: 'Nearest coast ≈ 530 km · measured on this map (derived)', labelAt: .6, kind: 'landmark', detail: 'Great-circle distance from the modelled assembly area to the nearest Mediterranean coast, measured on this map. Derived, not from a source.', sources: [] },
      { points: [COAST], label: 'Mediterranean coast (nearest point)', kind: 'landmark', only: [7], detail: 'Nearest coast to the assembly area, measured on this map.', sources: [] },
      { points: walk, color: [1, .8, .5], width: 1.8, opacity: .9, alt: 300, only: [7], from: 5.6, draw: 5, label: 'The walk of eight', labelAt: .72, kind: 'landmark', detail: 'Reconstructed from published recovery positions and markers. Several, including the assembly area and parachute arrows, are interpretive placements, not surveyed points.', sources: ['s10', 's11'] },
      { points: [[27.80, 23.60]], label: 'Remains and diaries · found 1960', kind: 'landmark', only: [7], from: 26.0, detail: 'Five crew members were found in February 1960; Shelley and the engineer in May 1960 (s7, s10).', sources: ['s7', 's10'] },
      { points: [camp], label: 'Five stopped · dune edge, Calanscio Sand Sea', kind: 'landmark', only: [7], from: 15.7, detail: 'The copilot records reaching dunes on April 8 (s4). The five-person camp lies at the dune edge (s10, s7). Label placement approximate.', sources: ['s4', 's10', 's7'] },
      ...ends.map((e, i) => ({ points: [camp, e], color: [1, .8, .5], width: 1.2, opacity: .8, alt: 300, dashed: true, only: [7], from: 17.9, draw: 2, ...(i ? { label: 'Three went on · Moore never found', labelAt: .6 } : {}), kind: 'landmark', detail: 'The engineer and two gunners went on for help (s4, s6). The third, gunner Vernon Moore, was never found; no position is shown for him.', sources: ['s10', 's7', 's4', 's6'] })),
      { points: [[26.70, 24.05]], label: 'Oil surveyors · sighted 1958 (date disputed)', kind: 'landmark', only: [7], from: 20.3, detail: 'Oil-survey crews sighted the wreck from the air in 1958; accounts give May, June or November (s13, s18). Ground visit February 1959 (s10, s23).', sources: ['s13', 's18', 's10'] },
      { points: [at('Flight boots') || [26.98603, 24.06306]], label: 'Later searches · trail found 1959', kind: 'landmark', only: [7], from: 23.7, detail: 'Searchers found flight boots and then parachute arrows in 1959 (s19, s9).', sources: ['s19', 's9'] },
    ];
  },
  buildNote: 'No recorder or radar exists. Crew diaries give times on an unknown clock, so the clock shown is illustrative: two hours are subtracted as an assumption, and radio events are spaced for pacing. The Soluch vicinity and wreck are approximate historical fixes, and the ground trail is reconstructed from published recovery positions and interpretive markers. Every airborne point is a labelled estimate. The parachutes and flares, where shown, are illustrative: their timing and paths are not recorded, and the number of flares is not known. Sand and dust were reported at the field; the blowing sand, its timing and the positions of the other bombers drawn at takeoff are illustrative. A museum account says the return was flown above cloud; the cloud drawn below the bomber on the night return has an illustrative height and extent. The engine stops follow the record that three propellers were feathered in turn and No. 4 was left running; their order and times are illustrative. The radio-bearing diagram is schematic, after the Army reconstruction. Terrain and imagery are modern.',
};
