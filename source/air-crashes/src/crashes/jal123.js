import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';
const JAL_REC = 'Schematic recovery. Section 3.1.7.4 and Attachment 5 describe the nose coming back up at about 18:56:17 JST, at about 5,000–5,500 ft, then the descent stopping under about 3 g from 18:56:18 to 18:56:23.5, when the right wing struck trees. These heights and attitudes are drawn between those descriptions; they are not recorder values.';
const T = (s) => `1985-08-12T09:${s}Z`;
const CVR = 'CVR (s1 Att. 6)';
const AFTER = [[34.806, 139.051], [34.776, 138.953], [34.773, 138.848], [34.819, 138.764], [34.871, 138.691], [34.902, 138.601], [34.917, 138.509], [34.933, 138.422], [34.961, 138.345], [34.995, 138.269], [35.041, 138.207], [35.114, 138.195], [35.173, 138.232], [35.237, 138.263], [35.304, 138.268], [35.37, 138.292], [35.416, 138.358], [35.431, 138.441], [35.433, 138.524], [35.444, 138.607], [35.471, 138.684], [35.509, 138.756], [35.559, 138.81], [35.609, 138.861], [35.642, 138.921], [35.644, 138.994], [35.597, 139.042], [35.549, 139.007], [35.567, 138.94], [35.618, 138.93], [35.661, 138.965], [35.672, 139.03], [35.669, 139.095], [35.682, 139.15], [35.719, 139.173], [35.764, 139.17], [35.798, 139.138], [35.822, 139.096], [35.84, 139.062], [35.857, 139.012], [35.864, 138.962], [35.868, 138.906], [35.881, 138.855], [35.9, 138.808], [35.934, 138.768], [35.968, 138.734], [35.992, 138.686], [35.997, 138.684], [36.002, 138.685], [36.009, 138.688], [36.015, 138.692], [36.018, 138.699], [36.019, 138.706], [36.019, 138.712], [36.018, 138.717], [36.016, 138.723], [36.012, 138.726], [36.005, 138.726], [36.001, 138.722], [35.998, 138.713], [35.999, 138.701], [36.001, 138.695]];

export const story = { beats: [
  b('1985-08-12T09:13:00Z', 'Tokyo, August twelfth, 1985. Japan Air Lines 123 takes off for Osaka with 524 people. Seven years earlier, this aircraft struck its tail on landing. The repair to its rear pressure wall was done incorrectly, and inspectors missed it.', ['Aircraft lifts off', 'Earlier tail strike', 'Boeing repairs the aircraft'], {
    v: 'map', then: 1, fit: ['HND/RJTT', 'ITM/RJOO'], fitMin: 520e3, az: 158, el: 9, zoom: .95,
     }),
  b('1985-08-12T09:24:35Z', 'Twelve minutes in, at 24,000 feet, a loud sound. The pressure wall has failed. Air bursts into the tail, and tears away much of the fin and the hydraulic power that moves the controls.', ['Loud sound and structural failure'], {
    v: 'follow', az: 158, el: 9, zoom: .95, gap: 2, lead: 3.3,
    shots: [
      { at: 3.0, t: T('24:35.4'), rate: .25, sfx: 'blast', az: 166, el: 15, zoom: .7, orbit: 2.2, push: 0 },
      { at: 10.4, t: T('24:37.4'), rate: 1, az: 120, el: 14, zoom: 1.1, push: .1 },
    ] }),
  b('1985-08-12T09:25:21Z', 'The captain asks to return to Tokyo.', ['Crew requests return to Haneda'], {
    v: 'follow', az: 32, el: 5, zoom: 1.35, gap: 2.2, sfx: 'radio',
     }),
  b('1985-08-12T09:26:00Z', 'The aircraft begins to climb and fall, and to sway from side to side. The controls cannot stop it. In the cabin, the oxygen masks are down.', ['Large oscillations develop'], {
    v: 'follow', az: 180, el: 3, zoom: 1.05, masks: 1, gap: 3,
    shots: [
      { at: .05, t: T('26:00.2'), rate: 11.6, az: 235, el: 0 },
      { at: 'In the cabin', t: T('27:32'), rate: 1, v: 'passenger', look: [-40, -6, 62], lookAt: .2 },
    ] }),
  b('1985-08-12T09:28:35Z', 'The captain tells controllers the aircraft cannot be controlled.', ['Crew reports loss of control'], {
    v: 'map', lapse: 1, gap: 2.2, frame: [35.16, 138.99, 640e3],
     }),
  b('1985-08-12T09:39:32Z', 'The crew has little left to work with but engine power. The landing gear comes down.', ['Main landing gear extends'], { v: 'follow', az: 205, el: -6, zoom: 1.05, lead: 4.5, gap: 2.5 }),
  b('1985-08-12T09:42:26Z', 'The sun has set. Power comes back, and the aircraft descends faster, over the mountains.', ['Local sunset', 'Engine power is reduced'], { v: 'follow', az: 185, el: 28, zoom: 1.3, lead: 1.8, gap: 1.5,
    shots: [{ at: 'over the', az: 165, el: 10, zoom: 1.6 }] }),
  b('1985-08-12T09:49:42Z', 'Speed falls as low as 108 knots.', ['Minimum calibrated airspeed recorded'], { v: 'follow', az: 270, el: -3, zoom: 1.25, lead: 2.2, gap: 1.2 }),
  b('1985-08-12T09:54:25Z', 'The crew asks where they are. Controllers tell them Tokyo and the American base at Yokota are both ready.', ['Crew asks its position', 'Haneda and Yokota offered'], {
    v: 'map', lapse: 1, gap: 1.5, frame: [35.41, 139.25, 520e3],
     }),
  b('1985-08-12T09:55:57Z', 'The nose drops into a steep descent.', ['Steep descent develops'], { v: 'follow', az: 270, el: 2, zoom: 1.6, bright: 1.4, gap: 8.5 }),
  b('1985-08-12T09:56:17Z', 'A ground warning. Engine power comes up, and the descent briefly stops. Then the right wing strikes trees on a ridge.', ['Ground warning and recovery attempt', 'Right wing contacts trees'], {
    v: 'follow', az: 150, el: 3, zoom: 1.6, bright: 1.3, sfx: 'gpws', lead: 3, gap: 1.2, end: 1,
    shots: [{ at: 'Then the right', az: 200, el: 2, zoom: 1.15, bright: 1.6, push: .1 }, { at: 8.74, v: 'map', frame: [35.394, 139.118, 600e3], bright: 0 }] }),
  b('end', 'It stayed in the air for 32 minutes after the failure. 520 people died, the most ever in a single aircraft accident. Rescuers did not reach the site until the next morning, and found four survivors, all seated in the rear of the cabin. Afterward, the 747 tail and hydraulic systems were changed to protect against a failure like this.', ['Survivors are found', 'Final report is published'], {
    shots: [{ at: '520 people', frame: [35.915, 138.69, 80e3], mapSpeed: .7 }] }),
] };

export const direct = {
  places: ['Tokyo', 'Osaka'],
  pinFrom: { 'Main crash ridge': 'end' },
  aircraft: 'b747jal', terrain: 'jal123', endAlt: 5135, end: { lat: 36.0015, lon: 138.6938 }, localFrom: '1985-08-12T09:24:10Z', az: 210, el: 8, routeAlt: 600e3, fitDest: false, planned: false,
  env: { layers: [{ base_ft: 3200, top_ft: 6000, cover: .18, density: .5, flat: .2, scale: .05 }, { base_ft: 7500, top_ft: 9500, cover: .26, density: .3, flat: .8, scale: .03 }, { base_ft: 26000, top_ft: 30000, cover: .5, density: .08, flat: 1, scale: .012 }], sea: .3, radiusKm: 280, center: [35.8, 138.9] },
  shake: [['1985-08-12T09:26:00Z', '1985-08-12T09:56:30Z', .3]],
  add: [
    { t_utc: '1985-08-12T09:56:14Z', alt_ft: 6300, pitch_deg: -20, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
    { t_utc: '1985-08-12T09:56:17.5Z', alt_ft: 5350, pitch_deg: -4, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
    { t_utc: '1985-08-12T09:56:20.5Z', alt_ft: 5250, pitch_deg: 6, roll_deg: 30, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
    { t_utc: '1985-08-12T09:56:23.5Z', alt_ft: 5300, pitch_deg: 5, roll_deg: 40, quality: 'modelled', method: JAL_REC, sources: ['s1'] },
  ],
  unknown: { ias: [['1985-08-12T09:56:00Z', '1985-08-12T09:56:27.25Z']] },
  fx: [
    { type: 'smoke', t: T('24:35.5'), until: T('24:36.2'), n: 100, life: .25, size: 8, spread: 5, grow: 1.6, offset: [-30, 4, 0] },
    { type: 'detach', part: 'finUpper', t: T('24:36.2'), vel: [-30, 6, 0], drag: .5, terminal: 40, spin: [.7, .5, .4], pivot: [-30, 8, 0] },
    { type: 'ill', t: T('24:35.4'), until: T('24:37.4') },
    { type: 'ping', t: T('25:21'), text: '', life: 4 },
    { type: 'gearDown', t: T('39:32') },
    { type: 'ill', t: T('39:32.5'), until: T('39:37') },
    { type: 'smoke', t: T('56:25.2'), until: T('56:25.9'), n: 160, life: 4.5, size: 18, spread: 10, grow: 1.2, offset: [0, -19, 7] },
    { type: 'ill', t: T('56:25.2'), until: T('56:27.3') },
  ],
  overlays: () => {
    const v0 = [34.7717, 138.8555], v1 = destination(v0[0], v0[1], 83, 50000);
    return [
      { points: arrow(v0, [v1.lat, v1.lon], 5), only: [4], color: [.62, .86, 1], width: 1.6, opacity: .9, alt: 3000, kind: 'landmark', detail: 'Tokyo Control gave a right turn to heading 090 (magnetic), a radar vector toward Oshima, at 18:25:50 JST and repeated it at 18:28:31 (s1 §2.1). Drawn from the dead-reckoned position at 09:25:52 UTC along about 083° true; the aircraft did not follow it.', sources: ['s1'] },
      { points: [[34.735, 139.395]], only: [4], label: 'Izu Oshima', kind: 'landmark' },
      { points: [[35.3606, 138.7274]], only: [4], label: 'Mount Fuji', kind: 'landmark' },
      { points: [[36.147, 139.389]], only: [8], label: 'Kumagaya', kind: 'landmark' },
      { points: AFTER, only: [11], from: .3, draw: 3.5, color: [1, .95, .84], width: 3.2, opacity: 1, alt: 2500, detail: 'The drawn path from the pressure-wall failure at 09:24:35 UTC to the final recorder reading at 09:56:27 UTC. Positions before 09:46 are dead-reckoned and approximate.', sources: ['s1', 's4'] },
    ];
  },
  buildNote: 'Altitude, speed and attitude are recorder values where the timeline says Recorded, and read from the report’s plots where it says Derived. Positions after 09:46 follow the report’s gridded flight-path figure. Before that the report has only a schematic map, so the path is dead-reckoned from recorded headings and is approximate. The tail shows the upper fin separating; the report describes portions of the fin separating and part remaining until the final terrain contacts. The record names only the main gear extending; the nose gear is drawn down with it, and its position is not recorded. The failure plays in slow motion; the burst of escaping air drawn at the tail is illustrative. The radar-vector arrow is schematic. The oscillation time-lapse joins attitudes read from the plots every 30 seconds, so it sways more slowly than the real Dutch roll, which reached about ±40° (s1). Terrain is modern. In this terrain the drawn path first meets a ridge at the reported height about two seconds after the recorded first tree contact at 09:56:23.5, so the contact is drawn there; the dust is illustrative.',
};
