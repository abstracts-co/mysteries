import { PATCH } from './patches.mjs';
import { readFileSync, writeFileSync, copyFileSync, existsSync, mkdirSync } from 'node:fs';
const ROOT = new URL('..', import.meta.url).pathname, A = `${ROOT}artifact/data`, R = `${ROOT}research`;
mkdirSync(A, { recursive: true });
const META = {
  mh370: { short: 'Malaysia Airlines 370', place: 'Indian Ocean, never found', status: 'unsolved', line: 'Turned back, flew seven more hours, vanished', lat: -34.7, lon: 93 },
  earhart: { short: 'Amelia Earhart', place: 'Central Pacific, never found', status: 'unsolved', line: 'Lost near Howland Island in 1937', lat: .816667, lon: -176.633333 },
  flight19: { short: 'Flight 19', place: 'Atlantic off Florida, never found', status: 'unsolved', line: 'Five Navy bombers and a rescue plane' },
  twa800: { short: 'TWA 800', place: 'Atlantic off Long Island', status: 'explained', line: 'A fuel tank explosion, and the theories it left' },
  egyptair990: { short: 'EgyptAir 990', place: 'Atlantic off Nantucket', status: 'disputed', line: 'Two countries, two conclusions' },
  airnz901: { short: 'Air New Zealand 901', place: 'Mount Erebus, Antarctica', status: 'disputed', line: 'A changed waypoint and a whiteout' },
  af447: { short: 'Air France 447', place: 'Equatorial Atlantic', status: 'explained', line: 'Iced probes, then a stall from 38,000 ft' },
  jal123: { short: 'Japan Air Lines 123', place: 'Osutaka ridge, Japan', status: 'explained', line: '32 minutes after losing its hydraulics and much of its fin' },
  stardust: { short: 'Star Dust', place: 'Tupungato, Andes', status: 'explained', line: 'STENDEC, and a glacier that kept it 50 years' },
  ladybegood: { short: 'Lady Be Good', place: 'Libyan Desert', status: 'explained', line: 'Flew past its base into the Sahara' },
};
const fmtDate = (s) => new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
const ND = { ladybegood: '1943-04-04' };
const dec = (s) => (s || '').replace(/\s+/g, ' ').trim();
const index = []; let md = '# Air crashes\n\nAn interactive globe of air accidents and disappearances. Choose a crash from the plane icon to replay it where it happened, with the conditions, explanations and sources.\n';
for (const [id, m] of Object.entries(META)) {
  if (!existsSync(`${R}/${id}.json`)) continue;
  const d = JSON.parse(readFileSync(`${R}/${id}.json`, 'utf8'));
  if (id === 'jal123' && existsSync(`${R}/jal123-gap.json`)) { const g = JSON.parse(readFileSync(`${R}/jal123-gap.json`, 'utf8')); d.track = [...d.track, ...g.track]; }
  const last = d.track.filter((p) => p.lat != null).at(-1);
  const lat = m.lat ?? d.site?.lat ?? last?.lat ?? d.route?.to?.lat, lon = m.lon ?? d.site?.lon ?? last?.lon ?? d.route?.to?.lon;
  const when = d.date_utc || ND[id] || d.track.find((p) => p.t_utc)?.t_utc;
  index.push({ id, short: m.short, year: new Date(when).getUTCFullYear(), place: m.place, status: m.status, lat, lon, datePlace: `${fmtDate(when)} · ${m.place}`, line: m.line });
  PATCH[id]?.(d);
  const capF = `${R}/caption-${id}.json`;
  if (existsSync(capF)) { const c = JSON.parse(readFileSync(capF, 'utf8')); for (const e of c.events || []) if (d.events[e.i]) d.events[e.i].caption = e.c; for (const n of c.numbers || []) if (d.numbers?.[n.i]) { d.numbers[n.i].label = n.label; d.numbers[n.i].value = n.value; } if (c.one_line) d.one_line = c.one_line; if (c.status_why) d.status_why = c.status_why; }
  if (id === 'mh370') { const ov = d.perspectives.find((p) => /Inmarsat/.test(p.label)); d.track = [...d.track.filter((p) => p.lat != null && p.t_utc <= '2014-03-07T18:22:13Z'), ...d.track.filter((p) => p.lat == null && p.t_utc <= '2014-03-07T18:22:13Z'), ...ov.track_override.filter((p) => p.t_utc !== '2014-03-07T18:25:27Z' || true)]; }
  writeFileSync(`${A}/${id}.json`, JSON.stringify(d));
  md += `\n## ${m.short}, ${fmtDate(when)}\n\n${dec(d.one_line)} ${dec(d.status_why)}\n\n`;
  if (d.people) md += `Aboard: ${d.people.aboard}. Died: ${d.people.died}.\n\n`;
  const P = d.perspectives || [];
  if (P.length) { md += `### Explanations\n\n`; for (const p of P) md += `**${dec(p.label)}** (${dec(p.standing)}; ${dec(p.held_by)}). ${dec(p.claim)}\n\n`; }
  md += `### What happened\n\n`; for (const e of d.events || []) md += `- ${(e.t_utc || '').slice(0, 19).replace('T', ' ')} ${dec(e.title)}: ${dec(e.detail)}\n`;
  if (d.unknowns?.length) { md += `\n### Not known\n\n`; for (const u of d.unknowns) md += `- ${dec(u)}\n`; }
  md += `\n### Sources\n\n`; for (const s of d.sources || []) md += `- [${dec(s.title)}](${s.url})${s.publisher ? `, ${dec(s.publisher)}` : ''}${s.year ? `, ${s.year}` : ''}\n`;
}
index.sort((a, b) => ['unsolved', 'disputed', 'explained'].indexOf(a.status) - ['unsolved', 'disputed', 'explained'].indexOf(b.status) || a.year - b.year < 0 ? 1 : -1);
writeFileSync(`${A}/index.json`, JSON.stringify(index));
writeFileSync(`${ROOT}artifact/content.md`, md);
console.log(index.map((c) => c.id).join(','), 'content.md', (md.length / 1024 | 0) + 'KB');
