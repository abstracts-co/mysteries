import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, writeFileSync, statSync, rmSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname, RAW = `${ROOT}audio-raw`, OUT = `${ROOT}artifact/audio`, TMP = `${RAW}/tmp`;
mkdirSync(`${OUT}/sfx`, { recursive: true }); mkdirSync(TMP, { recursive: true });
const ff = (a) => execFileSync('nice', ['ffmpeg', '-y', '-loglevel', 'error', ...a]);
const dur = (f) => +execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString();
const { STORIES } = await import('../src/stories.js');
const TRIM = 'silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.05,areverse,silenceremove=start_periods=1:start_threshold=-50dB:start_silence=0.12,areverse';
const gap = (t, f) => ff(['-f', 'lavfi', '-t', String(t), '-i', 'anullsrc=r=24000:cl=mono', f]);
for (const id of Object.keys(STORIES)) {
  const dir = `${RAW}/lines/${id}`; if (!existsSync(dir)) { console.log('missing', id); continue; }
  const files = readdirSync(dir).filter((f) => f.endsWith('.wav')).sort();
  const parts = [], beats = []; let t = 0, k = 0;
  for (const f of files) {
    const [b, p] = f.replace('.wav', '').split('-').map(Number);
    const tf = `${TMP}/${id}-${k++}.wav`;
    ff(['-i', `${dir}/${f}`, '-af', `${TRIM},afade=t=in:d=0.015,areverse,afade=t=in:d=0.05,areverse`, '-ac', '1', '-ar', '24000', tf]);
    if (p > 0) { const g = `${TMP}/${id}-g${k}.wav`; gap(.32, g); parts.push(g); t += .32; }
    if (p === 0) beats[b] = { start: +t.toFixed(3) };
    parts.push(tf); t += dur(tf); beats[b].end = +t.toFixed(3);
  }
  const list = `${TMP}/${id}.txt`; writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  const out = `${OUT}/${id}.mp3`;
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-af', 'highpass=f=70,lowpass=f=10000,acompressor=threshold=-18dB:ratio=2.5:attack=8:release=120,loudnorm=I=-17:TP=-1.5:LRA=7', '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', '32k', out]);
  const n = STORIES[id].beats.length;
  if (beats.filter(Boolean).length !== n) console.log('BEAT MISMATCH', id, beats.filter(Boolean).length, n);
  writeFileSync(`${OUT}/${id}.json`, JSON.stringify({ dur: +dur(out).toFixed(3), beats }));
  console.log(id, `${dur(out).toFixed(1)}s`, `${statSync(out).size >> 10}KB`, 'beats', beats.filter(Boolean).length + '/' + n);
}
const SFX = `${RAW}/sfx`;
if (existsSync(SFX)) for (const f of readdirSync(SFX)) {
  const n = f.replace(/\.[^.]+$/, ''), loop = ['jet_cabin', 'jet_engine', 'prop_engine', 'wind', 'ocean', 'rumble'].includes(n), out = `${OUT}/sfx/${n}.mp3`;
  const d = dur(`${SFX}/${f}`), L = Math.min(d - .2, loop ? 10 : 6);
  const af = loop ? `atrim=0:${L},asetpts=PTS-STARTPTS,afade=t=in:d=0.4,afade=t=out:st=${L - .6}:d=0.6,loudnorm=I=-22:TP=-3` : `silenceremove=start_periods=1:start_threshold=-45dB,atrim=0:${L},afade=t=out:st=${Math.max(L - .5, 0)}:d=0.5,loudnorm=I=-20:TP=-2`;
  ff(['-i', `${SFX}/${f}`, '-af', af, '-ac', '1', '-ar', '22050', '-c:a', 'libmp3lame', '-b:a', loop ? '32k' : '40k', out]);
  console.log('sfx', n, `${dur(out).toFixed(1)}s`, `${statSync(out).size >> 10}KB`);
}
rmSync(TMP, { recursive: true, force: true });
