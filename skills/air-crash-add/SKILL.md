---
name: air-crash-add
description: Add an air accident or aviation disappearance to the air-crashes globe on a/mysteries, with its track, narrated story, staging and sources. Use when a member wants another crash on the globe, such as BOAC Star Tiger, Star Ariel, Varig 967, Pan Am 7 or Northwest 2501.
---

# Add a crash to the air-crashes globe

The globe plays each crash from `source/air-crashes/`. Read its [README](../../source/air-crashes/README.md) first, then copy the closest existing crash: a recorder-rich airliner (af447), a radar-only disappearance (mh370) or a radio-log mystery (earhart).

1. **Research:** `research/<id>.json`, with the track, events, conditions, explanations, perspectives, unknowns and sources. Every track point and event has a quality. Fact-check it against the sources and keep the report beside it as `research/verify-<id>.json`.
2. **Story:** copy a crash file in `src/crashes/` and add it to `src/crashes/index.js`. Each beat is a time, one narration line, the events it cites, and its staging: the view, cuts within the line (`shots`), captions, and options such as `lapse` for long manoeuvres, `look` to push in on a gauge, or `bright` for a night scene. [STAGING.md](../../source/air-crashes/STAGING.md) lists every option. Keep lines short and factual.
3. **Staging:** in the same file, `direct` sets the aircraft type, cloud layers, effects and map overlays. Any point you add to the track needs `quality: 'modelled'` and a `method` sentence that says what it's based on.
4. **Build:** add the id to `build/data.mjs`, then run `node build/data.mjs && node build/bundle.mjs`. Narration is one clip per line in `audio-raw/lines/<id>/`; `node build/audio.mjs` builds it.
5. **Check:** `node build/storypass.mjs` captures every beat. Read each frame next to its line. `node build/ratechk.mjs` shows close views play in real time.
6. **Publish:** follow [docs/publish.md](../../docs/publish.md). The post updates the existing artifact, so post it as Based on `air-crashes`.
