# Air crashes: how it's built

The page is a three.js app with no framework. `build/bundle.mjs` bundles `src/` into `artifact/app.js`.

- `research/<id>.json`: one crash as researched. It holds the track, events, conditions, explanations and sources. Every point and event has a quality: recorded, radar, reported, derived or modelled. `research/verify-<id>.json` are the fact-check reports.
- `build/data.mjs` turns research into `artifact/data/<id>.json`, applying `build/patches.mjs` and the caption files.
- `src/crashes/<id>.js`: one file per crash. `story` is the narration, one beat per line: a time, its text, the events it cites, and its staging (the camera view, cuts within the line, captions and options such as `lapse`, `look` or `bright`). The text and times are fact-checked, so change them only with a source. `direct` sets the aircraft type, weather, effects, map overlays and any added track points, each with its method and source. `STAGING.md` lists every staging option.
- `src/sim.js`: turns the track into smooth positions and attitudes, and maps story time to flight time. Close views play in real time; the gaps between lines become cuts.
- `src/app.js`: the director, camera rigs, effects and interface. `src/world.js` and `src/shaders.js` draw the globe, sky, clouds and ocean. `src/aircraft.js` and `src/interior.js` build each aircraft and its cockpit and cabin.
- Narration audio comes from `build/audio.mjs`, one clip per line in `audio-raw/lines/<id>/`, which isn't in this repository. Then `build/anchors.mjs` finds the pauses in each line and lines them up with its clauses, so cuts and the word highlight follow the voice.

## Run it

```sh
node build/data.mjs && node build/bundle.mjs
node build/serve.mjs . 8043   # then open http://127.0.0.1:8043/artifact/index.html
```

The textures, terrain, data and audio are large, so the post loads them from `https://abstracts-co.github.io/mysteries-data/air-crashes/`. `build/publish.mjs` writes the post (`publish/artifact`), the data host (`publish/data`) and this source.

## Correct or add

To correct a fact, change its research entry, cite the source, and rebuild. To add a crash, add its research JSON, a story in `stories.js`, a block in `direct.js` and its id in `data.mjs`. Never invent a value: leave it null and add it to `unknowns`. Anything drawn for the screen that isn't in the record gets an "Illustrative" label.
