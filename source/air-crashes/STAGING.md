# Staging reference

Each crash lives in one file: `src/crashes/<id>.js`, exporting `story` (beats, built with `b(t, text, events, options)`) and `direct` (staging and modelled data). Helpers from `src/crashes/util.js`: `b`, `lerpLine`, `backTrack`, `arrow(a, b, km)` (an arrow from [lat, lon] a to b, barbs follow the shaft bearing), `lop`, `polys`. `destination(lat, lon, bearingDeg, metres)` comes from `../geo.js`.

Everything in BRIEF.md still works. New since the review:

## Beat options (stories)

- `shots: [{ at, ...staging, t?, tLead?, rate? }]` cuts within one narration line.
  - `at` is seconds into the beat, or a word anchor string such as `'Blowing sand'` (the first word sequence in the line that starts with those words; time is estimated from character weights over the narration length).
  - Staging keys a shot can override: `v`, `az`, `el`, `zoom`, `tight`, `frame`, `fit`, `bright`, `look`, `lookAt`, `sfx`, `orbit` (follow camera drift in °/s, default 1.1), `push` (follow zoom-in over the shot, default .07), `mapSpeed` (map camera easing, default 1.1).
  - A shot with `t` (ISO) jumps flight time forward to `t - tLead` at that moment (forward only, inside this beat's window, so give the beat a `lead` if a shot needs an earlier time). The jump becomes a dissolve, or a fade through black with "X later" when it is 10 minutes or more. `rate` sets flight seconds per story second after the jump (default 1).
  - Camera-only shots (no `t`) cut straight. A cut into or out of an inside view or `below` gets a short dip.
  - In the end beat (`t: 'end'`), shots with `frame` or `fit` move the end map camera.
- `frame: [lat, lon, altitudeMetres]` sets the map camera exactly. `fit: ['pin label', ...]` frames those labelled pins (plus the aircraft unless `fitPlane: false`; `fitMin` minimum altitude). `tight: metres` frames this beat's track.
- `captions: [{ text, at, until?, who?, type? }]` timed captions within a beat. `type: true` types tokens one by one (for codes like 'S T E N D E C'). Otherwise the text fades in as a quote card, with `who` as a small attribution line ("Copilot's diary, April 4"). `at`/`until` take seconds or word anchors. The old `caption`/`capAt` still works.
- `bright: k`, `look: [yaw, pitch, fov]` (+ `lookAt` seconds after the shot starts), `lapse: 1`, `at`/`atLead`, `lead`, `gap` as before.

## direct options

- Weather cues: `cues: [{ t, ramp, env: { layers?, sea?, fogVisKm?, fogTint? }, tag?, tagUntil? }]`. `fogVisKm` is ground-fog visibility (0 = none; blends smoothly), `fogTint: [r, g, b]` tints the fog (sand ≈ [.86, .70, .50]). Base values: `env.fogVisKm`, `env.fogTopKm`, `env.fogTint`. A cue `tag` shows a label on the aircraft from `t` until `tagUntil`.
- `formation: [[ahead, up, right] metres]` extra aircraft of the same type; `formationDrift: { t, v: [[ahead, up, right] m/s per member] }` makes them drift apart from `t`; `formationUntil` hides them. Formation members are drawn opaque, so fog hides them by distance.
- fx `engineOut` with `engine: i` (0-based index into the aircraft's engines array, in the order the model builds them) stops that engine's propeller at `t`: `{ type: 'engineOut', engine: 2, t, rpm: 0, spin: .7 }` (`spin` = how fast it spins down). Several entries stop engines one by one. Without `engine` the old whole-aircraft behaviour applies. Lady Be Good's old `ENGINE_OUT` entry in app.js is ignored once any per-engine entry exists. To find which index is which engine, read the aircraft's `engines` spec in `src/aircraft.js` (left-to-right order differs per type).
- fx `tag` without `at` pins its label to the aircraft: `{ type: 'tag', t, until, text, cls? }` (`cls` 'q modelled' default; 'q' for neutral).
- fx `ping`: an expanding ring at the aircraft with a label, for a radio call or a signal: `{ type: 'ping', t, text, life }` (`life` in story seconds, default 6). MH370's `links`/`link` beams still work.
- `nightTag`: replaces the 'Night · lights only' label for the ground camera at night.
- Overlays: one point (`points: [[lat, lon]]`) makes a label only, no line. `from` (seconds into the beat in `only[0]`) and `draw` (seconds to grow) reveal a line and its label during that beat; `only` is required with `from`.

## More options

- Beat or shot: `hidePins: ['label', ...]` hides those map pins; `noTrack: true` hides the drawn path and the aircraft marker (for schematic map diagrams); `nightTag` overrides the night label for that beat or shot.
- Captions: `pos: 'top'` puts a caption card at the top; `style: 'fact'` uses plain text for statements that are not quotations.
- direct: `pinFrom: { 'label' | 'kind:debris': beatIndex | 'end' }` shows a data pin only from that beat; `future: false` or `futureFrom: beat` hides the dim future path; `endRest: true` for a track that ends at rest on the ground (no impact cut); `apOff` (ISO) turns the autopilot annunciators off at that time; `sel: [{ t, spd, hdg, alt, vs, baro }]` gives recorded selector values (otherwise the windows show dashes).
- fx `noTrail` `{ t, until }` hides the flight-path trail in that window.
- Chips appear on their own: "Time-lapse ×N" when flight time runs faster than 1.5×, "Slow motion ×N" below 0.67×, "Night · brightened" with `bright`, and "X later" on cuts of 10 minutes or more.
- Word anchors use the pauses measured in the narration audio (`build/anchors.mjs`), so a cut at `'Blowing sand'` lands on the spoken words.

## Check your staging

- `node build/storypass.mjs` (with `IDS=<id>`) captures three frames per beat. Read each frame next to its line.
- `node build/ratechk2.mjs` lists any close view that plays faster than 1.7× (time cuts show as one-off spikes).
- Keep 30 fps on a laptop GPU: prefer cuts, camera moves, labels and modest particle counts.
