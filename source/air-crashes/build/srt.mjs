import { writeFileSync } from 'node:fs';
const { STORIES } = await import('../src/stories.js');
const out = new URL('../narration/', import.meta.url).pathname;
const ts = (s) => { const ms = Math.round(s * 1000), h = Math.floor(ms / 3600000), m = Math.floor(ms / 60000) % 60, sec = Math.floor(ms / 1000) % 60; return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(ms % 1000).padStart(3, '0')}`; };
const split = (t) => {
  if (t.length <= 420) return [t];
  const parts = t.match(/[^.!?]+[.!?]+["”]?\s*/g) || [t]; const out = []; let cur = '';
  for (const p of parts) { if ((cur + p).length > 400 && cur) { out.push(cur.trim()); cur = ''; } cur += p; }
  if (cur.trim()) out.push(cur.trim()); return out;
};
let t = 2, n = 0, srt = ''; const map = [];
for (const [id, st] of Object.entries(STORIES)) {
  const crashStart = t;
  st.beats.forEach((b, bi) => {
    split(b.text).forEach((txt, pi) => {
      const est = txt.split(/\s+/).length / 2.3 + .8, slot = Math.ceil(est * 1.6 + 2.5);
      n++; srt += `${n}\n${ts(t)} --> ${ts(t + slot - .5)}\n${txt}\n\n`;
      map.push({ cue: n, id, beat: bi, part: pi, start: +(t - crashStart).toFixed(3), abs: t, slot, chars: txt.length });
      t += slot;
    });
  });
  map.push({ id, crashStart, crashEnd: t }); t += 10;
}
writeFileSync(`${out}all.srt`, srt); writeFileSync(`${out}cues.json`, JSON.stringify(map, null, 1));
const cues = map.filter((x) => x.cue);
console.log('cues', cues.length, 'max chars', Math.max(...cues.map((x) => x.chars)), 'timeline', (t / 60).toFixed(1), 'min');
