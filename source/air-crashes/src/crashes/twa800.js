import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination, bearing, gcDistance } from '../geo.js';

const JFK = { lat: 40.639447, lon: -73.779317 }, CDG = { lat: 49.00896, lon: 2.554117 };
const toParis = destination(JFK.lat, JFK.lon, bearing(JFK, CDG), 42000), midP = destination(JFK.lat, JFK.lon, bearing(JFK, CDG), 22000), midParis = destination(midP.lat, midP.lon, bearing(JFK, CDG) + 90, 5000), parisKm = Math.round(gcDistance(JFK, CDG) / 10000) * 10;

export const story = { beats: [
  b('1996-07-18T00:19:56.78Z', 'New York, a summer evening, July seventeenth, 1996. After a delay at the gate, TWA 800 lifts off for Paris with 230 people aboard.', ['Aircraft becomes airborne', 'Baggage concern resolved'], {
    v: 'follow', az: 200, el: 4, zoom: 1.8,
    shots: [{ at: 0, v: 'map', frame: [40.70, -73.62, 105e3] }, { at: 'TWA 800', v: 'follow' }],
    captions: [{ text: 'JFK → PARIS · 230 ABOARD', at: 'for Paris', type: true, until: 13.4 }],
  }),
  b('1996-07-18T00:26:24Z', 'The sun has just set. Climbing along the coast of Long Island, the crew is told to hold at 13,000 feet.', ['Clearance amended to thirteen thousand'], {
    v: 'follow', az: 60, el: 4, zoom: 1.6,
    shots: [{ at: 'Climbing along', v: 'map', frame: [40.80, -73.10, 205e3] }],
    captions: [{ text: '20:26 EDT · MAINTAIN 13,000 FT', at: 'the crew', type: true, until: 8.3 }],
  }),
  b('1996-07-18T00:29:15Z', 'The captain notices something on the panel. "Look at that crazy fuel flow indicator there on number four." No link to what follows was ever established.', ['Fuel flow reading questioned'], {
    v: 'captain', look: [28.39, -18.45, 4.6],
    shots: [{ at: 'what follows', look: null }],
    captions: [
      { text: '"Look at that crazy fuel flow indicator there on number four."', who: 'Captain · cockpit voice recorder, 20:29:15 EDT', at: 'Look at' },
      { text: 'No. 4 fuel flow indicator', who: 'Its reading was not recorded; only the remark was', at: 'number four', until: 10 },
    ],
  }),
  b('1996-07-18T00:30:15Z', 'Controllers clear a climb to 15,000 feet. Power comes up. It is the last radio exchange.', ['Climb to fifteen thousand cleared', 'Last radio acknowledgment'], {
    v: 'captain', sfx: 'radio',
    shots: [{ at: 'Power comes', v: 'follow', az: 130, el: 14, zoom: 1.8 }],
    captions: [{ text: 'ATC · CLIMB AND MAINTAIN 15,000', at: .3, type: true, until: 'Power comes' }],
  }),
  b('1996-07-18T00:31:11.96Z', 'Twelve seconds past 8:31. A brief, loud sound, and the recorders stop.', ['Last FDR data word', 'Cockpit recording ends'], {
    v: 'follow', az: 110, el: -3, zoom: 1.4, lead: 1, gap: 1, orbit: 0, push: 0,
    shots: [{ at: 3.88, sfx: 'blast' }],
    captions: [{ text: '20:31:12 EDT · SLOWED ×0.3', at: .2, type: true, until: 3.1 }, { text: 'RECORDING ENDS', at: 'the recorders', type: true, until: 6.9 }],
  }),
  b('1996-07-18T00:31:15Z', 'The explosion began in the fuel tank between the wings. Within about five seconds, the nose of the aircraft separated. Everything you see from here is from models, because no recording exists.', ['Center wing tank explodes', 'Forward fuselage separates'], {
    v: 'follow', az: 80, el: 10, zoom: 2.6, lead: 2,
    shots: [{ at: 'the nose', az: 60, el: 18, zoom: 4.6 }, { at: 'Everything you', az: 115, el: 7, zoom: 4.2 }],
    captions: [{ text: 'CENTER WING TANK · BETWEEN THE WINGS', at: 'The explosion', type: true, until: 'Within' }, { text: 'MODELS FITTED TO RADAR', at: 'Everything you', type: true }],
  }),
  b('1996-07-18T00:31:30Z', 'Without its nose, the rest of the aircraft kept flying. Models show it climbing for a short time, to perhaps 15,000 or 16,000 feet.', ['Main body pitches upward'], {
    v: 'follow', az: 240, el: 13, zoom: 3.2, push: -.9, lead: 6,
    shots: [{ at: .02, az: 240, el: 13, zoom: 3.2, push: -.9 }],
  }),
  b('1996-07-18T00:31:46Z', 'About half a minute after the explosion, the outer wings failed. Burning fuel lit the sky above the water.', ['Outboard wings separate in model', 'Center section fails in model'], {
    v: 'below', lead: 3,
    shots: [{ at: 'Burning fuel', v: 'follow', az: 200, el: -5, zoom: 20, orbit: .6, push: .1 }],
  }),
  b('1996-07-18T00:31:55Z', 'Hundreds of people saw it from the shore, from boats and from the air. A nearby airline captain radioed that he had seen an explosion.', ['Nearby pilot reports explosion'], {
    v: 'follow', az: 302, el: -15, zoom: 55, orbit: 0, push: 0, gap: 2,
    shots: [{ at: .02 }, { at: 'from boats', v: 'follow', az: 66, el: -14, zoom: 50, orbit: 0, push: 0 }, { at: 'from the air', v: 'follow', az: 347, el: 6, zoom: 40, orbit: 0, push: 0 }, { at: 'A nearby', v: 'follow', az: 347, el: 6, zoom: 40, sfx: 'radio', orbit: .5, push: .05 }],
    captions: [{ text: '736 WITNESSES', at: .3, type: true, until: 'from boats' }, { text: '"We just saw an explosion out here."', who: 'Captain of Eastwind 507 (call sign Stinger Bee 507) · radio, 20:31:50 EDT', at: 'A nearby' }],
  }),
  b('1996-07-18T00:32:02Z', 'The main wreckage hit the ocean less than a minute after the explosion. All 230 people aboard died.', ['Main wreckage reaches the ocean'], {
    v: 'below', lead: 2, end: 1,
    shots: [{ at: 'All 230', v: 'follow', az: 200, el: 7, zoom: 46, orbit: .3, push: 0 }],
  }),
  b('end', 'Some witnesses described a streak of light rising, and many people came to believe a missile had been fired. The FBI found no evidence of a crime. The NTSB, working from wreckage rebuilt in a hangar, concluded the tank exploded, probably from excess voltage in fuel gauge wiring, though the source was never found. Petitioners challenged that in 2013. The Board denied the petition. New rules now reduce flammable vapor in fuel tanks.', ['FBI ends active criminal investigation', 'NTSB adopts probable cause', 'Petition seeks reconsideration', 'NTSB denies the petition'], {
    shots: [{ at: 0, frame: [40.69, -72.70, 90e3] }, { at: 'The NTSB,', frame: [40.70, -72.72, 190e3] }, { at: 'New rules', frame: [40.56, -73.15, 330e3] }],
    captions: [
      { text: 'FBI ends active criminal investigation', who: '18 November 1997 · no evidence of a criminal act', at: 'The FBI', until: 'The NTSB,' },
      { text: 'NTSB adopts probable cause', who: '23 August 2000 · center wing tank explosion; ignition source not determined with certainty', at: 'concluded the', until: 'Petitioners' },
      { text: 'Petition seeks reconsideration', who: '19 June 2013 · TWA 800 Project', at: 'Petitioners', until: 'The Board' },
      { text: 'NTSB denies the petition', who: '2 July 2014', at: 'The Board', until: 'New rules' },
      { text: 'Later rules reduce flammable vapor in fuel tanks, including inerting where applicable', who: 'Rulemaking after the investigation', at: 'New rules' },
    ],
  }),
] };

const M = 'modelled', S1 = ['s1'];
export const direct = {
  epilogue: [40.42, -73.15, 330e3], aircraft: 'b747', terrain: 'twa800', lightsUntil: '1996-07-18T00:31:12.5Z', localFrom: '1996-07-18T00:29:30Z', az: 240, el: 8, routeAlt: 700e3, fitDest: false,
  planned: false, witness: [40.7196, -72.6499, 30],
  drop: (p) => !(p.t_utc === '1996-07-18T00:30:21Z' && p.ias_kt === 455),
  add: [
    { t_utc: '1996-07-18T00:30:21Z', alt_ft: 12972, hdg_deg: 82, pitch_deg: 3.6, roll_deg: 0, quality: 'recorded', method: 'Revised FDR table, local row 20:30:21, with its 455 kt airspeed sample left out: the source marks it as an isolated raw anomaly that must not be animated as a real acceleration. Other parameters as recorded.', sources: ['s2'], locator: 'Attachment II, Tabular Data No. 1 revised 22 December 1999, printed p. 40 (PDF p. 41), local row 20:30:21' },
    { t_utc: '1996-07-18T00:31:15Z', alt_ft: 13850, pitch_deg: 8, roll_deg: -12, quality: M, method: 'Schematic through published NTSB model ranges. Several trajectories fit; no unique path or attitude exists.', sources: S1 },
    { t_utc: '1996-07-18T00:31:25Z', pitch_deg: 20, roll_deg: -30, quality: M, method: 'Schematic. AAR p.264: pitched up while rolling left (north), then a descending right turn; radar suggests a north-then-south turn (p.97). Values illustrative.', sources: S1 },
    { t_utc: '1996-07-18T00:31:34Z', lat: 40.6585, lon: -72.648, alt_ft: 16000, pitch_deg: 24, roll_deg: 5, quality: M, method: 'Schematic. NTSB models peak about 15,500–16,700 ft (AAR p.97, fn 551) after a left roll, followed by a right roll into a descending turn (AAR p.264). These values and the time of peak are illustrative.', sources: S1 },
    { t_utc: '1996-07-18T00:31:40Z', alt_ft: 13500, pitch_deg: -12, roll_deg: 50, quality: M, method: 'Schematic. Descending turn to the right after the peak (AAR p.264). Values illustrative.', sources: S1 },
    { t_utc: '1996-07-18T00:31:46Z', alt_ft: 10500, pitch_deg: -25, roll_deg: 60, quality: M, method: 'Schematic. NTSB model assumes outboard wing failure at 34 s. Attitude illustrative.', sources: S1 },
    { t_utc: '1996-07-18T00:32:02Z', lat: 40.666667, lon: -72.633333, alt_ft: 0, pitch_deg: -10, roll_deg: 15, quality: M, method: 'NTSB estimates 47–54 s to main-body water impact; 50 s shown. AAR p.110: aft fuselage struck the water relatively flat, rolled slightly right; values illustrative. Accident reference position, not a surveyed impact point.', sources: S1 },
    ...['00:32:04', '00:32:06'].map((t) => ({ t_utc: `1996-07-18T${t}Z`, lat: 40.667429, lon: -72.631726, alt_ft: -1360, pitch_deg: -10, roll_deg: 15, quality: M, method: 'Illustrative. Holds the drawn wreck at the water for a few seconds so the fire on the water can be shown. Boats and aircraft responded to burning wreckage; the size and place of the fire were not measured.', sources: S1 })),
  ],
  eventTimes: { 'Forward fuselage separates': '1996-07-18T00:31:16Z', 'Main body pitches upward': '1996-07-18T00:31:20Z', 'Main wreckage reaches the ocean': '1996-07-18T00:32:02Z' },
  env: { layers: [{ base_ft: 6100, top_ft: 8500, cover: .3, density: .35, flat: .5, scale: .05 }, { base_ft: 9000, top_ft: 11000, cover: .32, density: .3, flat: .8, scale: .03 }], sea: .28, radiusKm: 240, fogVisKm: 30, fogTopKm: .5, globalClouds: 0 },
  cues: [{ t: '1996-07-18T00:28:00Z', ramp: 90, env: { layers: [{ base_ft: 4600, top_ft: 5900, cover: .24, density: .3, flat: .55, scale: .05 }, { base_ft: 9000, top_ft: 11000, cover: 0, density: .3, flat: .8, scale: .03 }] } }],
  overlays: [
    { points: [[40.758, -73.985]], label: 'New York City', kind: 'landmark', only: [0] },
    { points: arrow([JFK.lat, JFK.lon], [toParis.lat, toParis.lon], 6), color: [.85, .88, .95], width: 1, opacity: .6, only: [0], from: 5.2, draw: 1.4 },
    { points: [[midParis.lat, midParis.lon]], label: `Toward Paris · ${parisKm.toLocaleString('en-US')} km · direction only`, kind: 'landmark', only: [0], from: 6, detail: 'Direction of the great circle from JFK to Paris Charles de Gaulle. The flight did not follow this line; it climbed east along the south shore of Long Island.', sources: ['s1', 's20'] },
    { points: [[40.83, -72.85]], label: 'Long Island', kind: 'landmark', only: [1] },
    { points: [[40.682, -72.665]], label: 'Burning aircraft after nose loss · schematic of NTSB models', kind: 'landmark', only: [10], from: 1, detail: 'The NTSB concluded that the streak most witnesses described was burning fuel from the accident airplane in crippled flight after the nose separated (AAR p.271). The drawn climb is a schematic through the published model ranges.', sources: S1 },
    { points: [[40.6283, -72.68], [40.6283, -72.5939], [40.67, -72.5939], [40.67, -72.68]], closed: true, color: [.75, .82, .95], width: 1.2, only: [10], from: 10.6, draw: 1.2 },
    { points: [[40.605, -72.637]], label: 'Main wreckage on the sea floor · AAR bounds', kind: 'landmark', only: [10], from: 11.4, detail: 'Main wreckage was found on the ocean floor between 40°37′42″ and 40°40′12″ N, 72°40′48″ and 72°35′38″ W (AAR p.4). The box shows those bounds.', sources: S1 },
    { points: [[40.915, -72.79]], label: 'Calverton · reconstruction hangar (area)', kind: 'landmark', only: [10], from: 13.4, detail: 'Recovered wreckage was taken to a leased hangar at Calverton, New York, where the NTSB rebuilt part of the aircraft (AAR §1.12).', sources: S1 },
  ],
  fx: [
    { type: 'tag', t: '1996-07-18T00:26:25.8Z', until: '1996-07-18T00:26:32.8Z', text: 'TWA 800', cls: 'q' },
    { type: 'ping', t: '1996-07-18T00:30:19.2Z', text: 'TWA 800 reads back · its last radio call, 20:30:19 EDT', life: 3 },
    { type: 'flash', t: '1996-07-18T00:31:12Z', power: 1.2 },
    { type: 'fire', t: '1996-07-18T00:31:12Z', until: '1996-07-18T00:31:12.3Z', n: 32, life: .3, size: 1.2, spread: 6, grow: .1, offset: [8, -1, 0] },
    { type: 'tag', t: '1996-07-18T00:31:12Z', until: '1996-07-18T00:31:13Z', at: [40.64855, -72.67223, 4175], text: 'Breakup begins · schematic' },
    { type: 'detach', part: 'nose', t: '1996-07-18T00:31:16Z', vel: [-60, -8, 12], drag: .32, terminal: 95, spin: [-.06, .08, -.32], pivot: [25, 0, 0] },
    { type: 'smoke', t: '1996-07-18T00:31:12Z', until: '1996-07-18T00:31:46Z', n: 420, life: 12, size: 26, grow: .8 },
    { type: 'fire', t: '1996-07-18T00:31:16Z', until: '1996-07-18T00:31:46Z', n: 900, life: 1.1, size: 6, spread: 6, grow: .35, offset: [-22, -3, 0] },
    { type: 'tag', t: '1996-07-18T00:31:31Z', until: '1996-07-18T00:31:36Z', at: [40.6585, -72.648, 4930], text: 'Model peak 15,500–16,700 ft · time illustrative' },
    { type: 'tag', t: '1996-07-18T00:31:43Z', until: '1996-07-18T00:31:45.9Z', text: 'Seen from the water · vantage illustrative', cls: 'q' },
    { type: 'tag', t: '1996-07-18T00:31:55Z', until: '1996-07-18T00:31:56.1Z', text: 'From the shore side · vantage illustrative', cls: 'q' },
    { type: 'tag', t: '1996-07-18T00:31:56.102Z', until: '1996-07-18T00:31:56.592Z', text: 'From the water · vantage illustrative', cls: 'q' },
    { type: 'tag', t: '1996-07-18T00:31:56.593Z', until: '1996-07-18T00:31:58.5Z', text: 'From the air · vantage illustrative', cls: 'q' },
    { type: 'tag', t: '1996-07-18T00:31:46Z', until: '1996-07-18T00:31:47.3Z', text: 'Outer wings fail at 34 s · NTSB model, not drawn' },
    { type: 'tag', t: '1996-07-18T00:31:47.3Z', until: '1996-07-18T00:31:50.5Z', text: 'Burning fuel · timing modelled' },
    { type: 'fire', t: '1996-07-18T00:31:46Z', until: '1996-07-18T00:32:02Z', n: 1800, life: 2.4, size: 13, spread: 60, grow: .5 },
    { type: 'tag', t: '1996-07-18T00:32:01.6Z', until: '1996-07-18T00:32:03.6Z', at: [40.6667, -72.6342, 150], text: 'Impact drawn at 50 s · NTSB estimate 47–54 s' },
    { type: 'flash', t: '1996-07-18T00:32:02Z', power: 2.2 },
    ...['mid', 'aft', 'fin', 'wings'].map((part) => ({ type: 'hide', part, t: '1996-07-18T00:32:02.05Z' })),
    { type: 'fire', t: '1996-07-18T00:32:02Z', until: '1996-07-18T00:32:06Z', n: 1100, life: 3.6, size: 11, spread: 40, grow: .4 },
    { type: 'smoke', t: '1996-07-18T00:32:02.3Z', until: '1996-07-18T00:32:06Z', n: 160, life: 9, size: 30, spread: 60, grow: 1.4 },
    { type: 'tag', t: '1996-07-18T00:32:03.6Z', until: '1996-07-18T00:32:06Z', at: [40.66705, -72.63253, 320], text: 'Fire on the water · Illustrative' },
  ],
  buildNote: 'Everything before 00:31:12 UTC is radar and flight data recorder. Everything after it is a schematic through published NTSB model ranges: no recording, radar altitude or unique trajectory exists for the breakup. The nose and fire effects show the sequence, not measured motion; the outer-wing and centre-section failures are not drawn as separate pieces. Lights go dark when the recorders lost power; the lighting itself was not recorded. The fire on the water after impact is illustrative: burning wreckage was reported, but its extent was not measured. The fire is drawn streaming back from the wing root; its size is illustrative. The low views from the shore side and from the water and the view from the air are camera positions chosen for the picture, not witness positions.',
};
