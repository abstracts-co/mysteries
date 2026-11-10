import { b, lerpLine, backTrack, arrow, lop, polys, NOTE_ATT } from './util.js';
import { destination } from '../geo.js';

const T = (s) => `1999-10-31T${s}Z`;
const LEVEL = [40.3934, -71.2182], CAIRO = destination(LEVEL[0], LEVEL[1], 59.1, 380e3);
const PINS = ['Bottom of dive ≈16,000 ft · 06:50:38 · NTSB estimate', 'Top of climb ≈25,000 ft · 06:51:15 · NTSB estimate', 'Eastern debris field'];
const HEAD = arrow(LEVEL, [CAIRO.lat, CAIRO.lon], 32);

export const story = { beats: [
  b('1999-10-31T06:38:00.98Z', 'New York, 1:20 in the morning, October thirty-first, 1999. EgyptAir 990 leaves for Cairo with 217 people aboard. Its crew includes a relief first officer, for the long crossing.', ['Airborne recorder signal', 'First officer change'], { v: 'map', then: 1, az: 215, el: 7, zoom: 1.4,
    shots: [{ at: 8.15, v: 'follow', az: 215, el: 7, zoom: 1.4, bright: 1 }],
     }),
  b('1999-10-31T06:44:27Z', 'It levels off at cruising height, over the dark Atlantic. The relief first officer has taken the right seat.', ['Cruise level reached', 'First officer change'], { v: 'captain', lead: 2, gap: 1.2, look: [-6, -14, 36], lookAt: .3,
    shots: [{ at: 3, look: null }],
     }),
  b('1999-10-31T06:48:03Z', 'The captain says he will be away for a moment, and leaves the cockpit.', ['Captain announces short absence', 'Cockpit door sound'], { v: 'captain', gap: 1.2,
    shots: [{ at: 'and leaves', t: T('06:48:18.55'), tLead: 1 }],
     }),
  b('1999-10-31T06:49:44Z', 'The autopilot disengages. No warning sounds. The relief first officer repeats a quiet phrase. "I rely on God."', ['Autopilot engagement signal changes', 'Relief officer repeats phrase'], { v: 'follow', az: 35, el: 2, zoom: .95, gap: 2,
    shots: [{ at: 4.6, az: 72, el: 5, zoom: 1.8, push: 0 }],
     }),
  b('1999-10-31T06:49:53Z', 'The engine power levers move to idle. Both tail controls move down, and the nose starts to drop.', ['Throttles move toward idle', 'Initial nose-down movement'], { v: 'captain', lead: 2,
    shots: [{ at: 3.7, v: 'follow', az: 150, el: 0, zoom: .6, push: .04, orbit: .4 }],
     }),
  b('1999-10-31T06:50:06Z', 'The captain\'s voice is recorded as he comes back. "What\'s happening? What\'s happening?"', ['Captain asks about the upset'], { v: 'captain', gap: 1,
     }),
  b('1999-10-31T06:50:14Z', 'The nose is about 40 degrees below level. The aircraft is falling at an estimated 39,000 feet a minute, and nearing the speed of sound.', ['Lowest recorded pitch sample', 'Maximum descent rate estimate', 'Peak Mach estimate'], { v: 'follow', az: 150, el: 2, zoom: 1, orbit: 0,
    shots: [{ at: 3, v: 'captain' }],
     }),
  b('1999-10-31T06:50:21Z', 'Now the two tail controls split. The left moves to raise the nose, the right to push it down. Fuel to both engines is cut off. Who moved those controls is not recorded.', ['Elevator split begins', 'Right engine fuel cutoff signal', 'Left engine fuel cutoff signal'], { v: 'follow', az: 158, el: 14, zoom: .7, gap: 2,
    shots: [{ at: 9.25, v: 'captain' }],
     }),
  b('1999-10-31T06:50:32Z', 'The captain calls out. "Pull with me."', ['Captain calls for shared pull'], { v: 'captain', gap: 1,
     }),
  b('1999-10-31T06:50:36.64Z', 'With the engines stopped, the recorders lose power. From here, only radar remains.', ['Flight data recording ends', 'Cockpit voice recording ends'], { v: 'captain', gap: 1.2,
    shots: [{ at: 3.95, v: 'map', fit: PINS, fitMin: 75e3, lapse: 1 }],
     }),
  b('1999-10-31T06:51:15Z', 'Radar suggests the aircraft climbed back to about 25,000 feet and turned. Then it descended again.', ['Climb ends approximately'], { v: 'map', fit: PINS, fitMin: 75e3, lapse: 1, lead: 31,
     }),
  b('1999-10-31T06:52:30Z', 'It struck the ocean at about this time. All 217 people aboard died.', ['Estimated ocean impact'], { v: 'follow', az: 180, el: 2, zoom: 1.4, orbit: 0, end: 1,
     }),
  b('end', 'The two countries read the same recorders and reached different conclusions. The United States blamed the relief first officer\'s control movements, and did not determine why he made them. Egypt rejected a deliberate act, left the cause unresolved, and considered an elevator defect likely. The words on the recording do not settle it.', ['NTSB adopts probable cause', 'Egyptian report records unresolved cause', 'Relief officer repeats phrase'], {
    shots: [{ at: 0, frame: [39.8, -71.65, 900e3] }],
     }),
] };

export const direct = {
  places: ['New York', 'Cairo'],
  aircraft: 'b767', planned: false, lightsUntil: '1999-10-31T06:50:38.47Z', tailView: { side: 8, up: 3, dist: .7, lift: 0 }, start: false, end: { lat: 40.3475, lon: -69.75666666666666 }, endAlt: 0, localFrom: '1999-10-31T06:47:30Z', az: 200, el: 7, routeAlt: 900e3, fitDest: false, elevScale: 3,
  drop: (p) => !(p.quality === 'radar' && p.t_utc < '1999-10-31T06:50:37'),
  add: [
    { t_utc: '1999-10-31T06:44:27Z', pressure_alt_ft: 32992, quality: 'derived', method: 'FDR and radar indicate the level-off at FL330 at 01:44:27 EST. The tabulated FDR rows are a minute apart; this point stops straight-line interpolation from climbing past the recorded level-off. 32,992 ft is the recorded cruise pressure-altitude value from 06:45:00.98 onward.', sources: ['s1', 's3'] },
    { t_utc: '1999-10-31T06:52:30Z', alt_ft: 0, quality: 'modelled', method: 'NTSB reconstruction estimates impact around this time; not a recorded impact.', sources: ['s1'] },
  ],
  fx: [
    { type: 'engineOut', engine: 0, t: T('06:50:20.98'), rpm: .5, spin: .12 },
    { type: 'engineOut', engine: 1, t: T('06:50:21.98'), rpm: .5, spin: .12 },
    { type: 'ill', t: T('06:50:21.2'), until: T('06:50:22.7') },
    { type: 'noTrail', t: T('06:52:15'), until: T('06:52:31') },
  ],
  overlays: [
    { points: HEAD.slice(0, 2), dashed: true, only: [0], color: [.8, .82, .9], width: 1.4, alt: 1500, sources: ['s11', 's8', 's1'] },
    { points: HEAD.slice(2), only: [0], color: [.8, .82, .9], width: 1.4, alt: 1500, sources: ['s11', 's8', 's1'] },
    { points: [[CAIRO.lat, CAIRO.lon]], only: [0], label: 'To Cairo', kind: 'landmark', detail: 'Schematic direction only, on the initial great-circle bearing toward Cairo from the drawn position at about 06:44. The filed oceanic route (direct DOVEY, then North Atlantic Track Zulu) is not drawn; its 1999 coordinates were not verified.', sources: ['s11', 's8', 's1'] },
    { points: [[40.5495, -70.0611]], alt: 4877, only: [9, 10], label: PINS[0], kind: 'radar', detail: 'Radar and performance analysis indicate the first dive bottomed near 16,000 ft MSL. The horizontal position is dead-reckoned.', sources: ['s1'] },
    { points: [[40.5089, -69.9350]], alt: 7620, only: [10], from: 2.2, label: PINS[1], kind: 'radar', detail: 'Primary radar and performance analysis indicate a climb to about 25,000 ft MSL, with a turn toward about 140 degrees. The horizontal position is dead-reckoned.', sources: ['s1'] },
  ],
  env: { layers: [{ base_ft: 14000, top_ft: 19000, cover: .7, density: .3, flat: .8, scale: .03 }], sea: .2, radiusKm: 240, globalClouds: 0 }, nightExposure: 3.4, fill: .55,
  buildNote: 'Pitch, roll, airspeed, pressure altitude and both elevators are from the flight data recorder to 06:50:36. After that the climb, turn and second descent come from the NTSB reconstruction from primary radar. Positions are dead-reckoned back from the debris field. The tail surfaces are drawn with their movement exaggerated three times so the split can be seen; the numbers are the recorded ones. The captain\'s control wheel is drawn following the recorded left elevator; column positions and forces were not recorded. The engine spool-down after the fuel cutoffs is illustrative; the final recorded N2 was about 52–53%. The cockpit going dark when the recorders lose power is illustrative. Cloud shapes are generated: satellite analysis showed a cloud band over the area with tops near 19,000 ft (s5), and a later search crew over the last known position reported overcast with some view below (s8); bases and exact coverage are unknown, and the sea state was not recorded. The night is brightened to show the aircraft.',
};
