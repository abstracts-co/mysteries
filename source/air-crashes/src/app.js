import * as THREE from 'three';
import { World, makeParticles, terrainMaterial } from './world.js';
import * as AC from './aircraft.js';
import { buildInterior } from './interior.js';
import { attachStory, normalise, pathSamples, prefixTrack } from './sim.js';
import { STORIES } from './stories.js';
import { Sound } from './audio.js';
import { R, clamp, dirOf, ecef, enu, headingVector, latLonOf, lerp, smooth, D2R, shortAngle, gcDistance, bearing, destination } from './geo.js';
import { subsolar } from './astro.js';
import { DIRECT } from './direct.js';

const $ = (s) => document.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const stage = $('#stage'), canvas = $('#gl'), pinsEl = $('#pins'), mark = $('#mark');
const embedded = window.parent !== window;
let layout = embedded ? 'content' : 'viewport';
const mobile = /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.maxTouchPoints > 1 && innerWidth < 900);
const q = new URLSearchParams(location.search);
const tier = mobile || q.get('tier') === 'low'
  ? { msaa: 0, shadows: false, bloom: false, aniso: 4, noise: 48, atmScale: .34, cloudSteps: 26, discRows: 96, maxDpr: 1.5 }
  : { msaa: 4, shadows: true, bloom: true, aniso: 8, noise: 64, atmScale: .5, cloudSteps: 46, discRows: 160, maxDpr: 1.5 };
tier.shot = q.has('shot');
if (q.has('clean')) document.documentElement.classList.add('clean', q.get('clean') === '2' ? 'pinned' : 'nopins');
let dpr = Math.min(devicePixelRatio || 1, tier.maxDpr);
let world, index = [], crash = null, mode = 'home';
const G = { lat: 12, lon: -35, alt: 18000e3, vLat: 0, vLon: 0, spin: true };
const cam = { p: new THREE.Vector3(R * 4, 0, 0), l: new THREE.Vector3(), u: new THREE.Vector3(0, 0, 1), fov: 34, rig: 'globe', from: null, t: 1, dur: 1, az: 0, el: 0, zoom: 1, hdg: 0, user: false };
const pins = [];
let playing = false, story = 0, speed = 1, rt = 0, last = 0, fadeOut = 0, flash = 0, flashAt = -1, ended = false, lastEv = -1, autoRig = true;
const SPEEDS = [1, 1.5, 2];
const sound = new Sound();
const { buildAircraft } = AC; const PERSPECTIVES = AC.PERSPECTIVES || {};
let manualView = false, curView = 'follow', fadeDip = 0, epiDone = false, lastBeat = -1, masks = false, smoothRt = null;
const v1 = new THREE.Vector3(), v2 = new THREE.Vector3(), v3 = new THREE.Vector3();

function setLayout() {
  document.body.classList.toggle('wide', layout === 'viewport' && innerWidth >= 1000);
  document.body.classList.toggle('vp', layout === 'viewport' && innerWidth < 1000);
  size();
}
function size() {
  const w = stage.clientWidth || innerWidth;
  let h;
  if (layout === 'viewport') h = innerHeight;
  else { h = Math.round(clamp(w * (w < 480 ? 1.42 : 1.12), 440, 760)); stage.style.height = `${h}px`; }
  if (layout === 'viewport') stage.style.height = '';
  if (world?.finalM) world.resize(w, stage.clientHeight || h, dpr);
  drawTimeline(true);
  postHeight();
}
function postHeight() { if (layout === 'content' && embedded) parent.postMessage({ abstractsHeight: Math.ceil(document.body.getBoundingClientRect().height) }, '*'); }
addEventListener('message', (e) => {
  if (e.source !== parent || e.data?.abstractsLayout !== 'viewport') return;
  layout = 'viewport'; setLayout(); parent.postMessage({ abstractsLayout: 'viewport' }, '*');
});
if (embedded) parent.postMessage({ abstractsLayout: 'request' }, '*');
new ResizeObserver(() => size()).observe(stage);
new ResizeObserver(postHeight).observe(document.body);
addEventListener('resize', setLayout);

const AS = (p) => (globalThis.__ASSETS__ || '') + p;
async function boot() {
  try {
    const u = $('#load u');
    world = new World(canvas, tier);
    index = await (await fetch(AS('data/index.json'))).json();
    await world.load((p) => { u.style.width = `${p * 100}%`; });
    world.setEnv({ layers: [] });
    world.setEnvMap(1);
    setLayout();
    renderMenu(); renderPins(); renderHome();
    const ss = subsolar(Date.now()); G.lon = ss.lon - 30; G.lat = 14;
    world.setTime(Date.now());
    $('#load').style.opacity = 0; setTimeout(() => $('#load').remove(), 700);
    requestAnimationFrame(frame);
    const open = q.get('open') || location.hash.slice(1);
    if (open && index.some((c) => c.id === open)) openCrash(open, q);
  } catch (e) {
    console.error(e);
    const er = $('#err'); er.style.display = 'grid'; er.textContent = /webgl/i.test(String(e)) ? 'This needs WebGL 2.' : 'Could not load.';
  }
}

function renderMenu() {
  $('#menu').innerHTML = index.map((c) => `<button class="row${crash?.id === c.id ? ' cur' : ''}" role="menuitem" data-id="${c.id}"><b><i class="st ${c.status}"></i>${esc(c.short)}</b><i>${c.year}</i><span>${esc(c.place)}<em class="${c.status}">${c.status[0].toUpperCase() + c.status.slice(1)}</em></span></button>`).join('');
}
function renderPins() {
  pinsEl.querySelectorAll('.pin').forEach((n) => n.remove()); pins.length = 0;
  for (const c of index) {
    const b = document.createElement('button'); b.className = `pin ${c.status}`; b.setAttribute('aria-label', c.short); b.innerHTML = `<span>${esc(c.short)}</span>`; b.onclick = () => openCrash(c.id);
    pinsEl.append(b); pins.push({ el: b, v: ecef(c.lat, c.lon, 0), c });
  }
}
$('#planes').onclick = (e) => { e.stopPropagation(); const m = $('#menu'), o = m.classList.toggle('open'); $('#planes').classList.toggle('on', o); $('#planes').setAttribute('aria-expanded', o); };
$('#menu').onclick = (e) => { const r = e.target.closest('.row'); if (!r) return; closeMenu(); openCrash(r.dataset.id); };
const closeMenu = () => { $('#menu').classList.remove('open'); $('#planes').classList.remove('on'); $('#planes').setAttribute('aria-expanded', false); };
stage.addEventListener('pointerdown', (e) => { if (!e.target.closest('#menu,#planes')) closeMenu(); });
addEventListener('keydown', (e) => { if (crash && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && e.target.id !== 'tl' && !/INPUT|TEXTAREA/.test(e.target.tagName)) { const B = crash.sim.beats, i = crash.sim.beatAt(story); seekStory(B[clamp(i + (e.key === 'ArrowRight' ? 1 : -1), 0, B.length - 1)].s); e.preventDefault(); }
  if (e.key === 'Escape') closeMenu(); if (e.key === ' ' && crash && e.target.tagName !== 'BUTTON') { e.preventDefault(); $('#pp').click(); } });
if (matchMedia('(prefers-reduced-motion:reduce)').matches) G.spin = false;
$('#back').onclick = () => goHome();

function renderHome() {
  $('#who').innerHTML = '';
  $('#more').innerHTML = `<h2>Crashes</h2>${index.map((c) => `<button class="tline" data-id="${c.id}"><time>${c.year}</time><b><i class="st ${c.status}"></i>${esc(c.short)}</b><p>${esc(c.line)}</p></button>`).join('')}${creditsHtml()}`;
  $('#more').querySelectorAll('[data-id]').forEach((b) => { b.onclick = () => { openCrash(b.dataset.id); stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  postHeight();
}
function creditsHtml() {
  return `<h2>Map and sky data</h2><div class="src" style="display:block;border:0;color:var(--mid)">Earth: <a target="_blank" rel="noopener" href="https://visibleearth.nasa.gov/collection/1484/blue-marble">NASA Blue Marble</a>, <a target="_blank" rel="noopener" href="https://earthobservatory.nasa.gov/features/NightLights">VIIRS Black Marble</a>, through <a target="_blank" rel="noopener" href="https://earthdata.nasa.gov/gibs">NASA GIBS</a>. Elevation: <a target="_blank" rel="noopener" href="https://registry.opendata.aws/terrain-tiles/">Terrain Tiles</a>. Local imagery: <a target="_blank" rel="noopener" href="https://s2maps.eu">Sentinel-2 cloudless 2016 by EOX</a> (Contains modified Copernicus Sentinel data 2016). Stars: <a target="_blank" rel="noopener" href="http://tdc-www.harvard.edu/catalogs/bsc5.html">Yale Bright Star Catalog</a>. The sun, moon and stars are computed for each date and time.</div>`;
}

function goHome() {
  mode = 'home'; playing = false; clearCrash(); crash = null; mark.style.display = 'none'; autoRig = true; sound.quiet(); manualView = false; curView = 'follow'; world.cam.near = .5; world.cam.updateProjectionMatrix(); $('#eyes').classList.remove('open');
  $('#hud').hidden = true; $('#rail').hidden = true; $('#back').hidden = true; $('#fade').classList.remove('show', 'soft'); document.body.classList.remove('ended', 'epi'); $('#info').style.display = 'none';
  const ll = latLonOf(cam.p); G.lat = clamp(ll.lat, -80, 80); G.lon = ll.lon; G.alt = 18000e3; G.spin = true;
  setRig('globe', 3.2); renderMenu(); renderHome(); pinsEl.style.opacity = 1; mark.style.opacity = 1;
  world.setEnv({ layers: [], fogVis: 0, sea: .3, historicLights: 1 }); world.setEnvMap(1);
}

function clearCrash() {
  if (!crash) return;
  crash.ac?.group.parent?.remove(crash.ac.group);
  for (const w of crash.wing || []) w.a.group.parent?.remove(w.a.group);
  for (const l of crash.lines ?? []) world.removeLine(l);
  if (crash.trail) world.removeLine(crash.trail);
  for (const p of crash.parts ?? []) { world.scene.remove(p); p.geometry.dispose(); p.material.dispose(); world.movers = world.movers.filter((m) => m !== p); }
  for (const t of crash.terrain ?? []) { world.scene.remove(t); t.geometry.dispose(); t.material.uniforms?.tMap?.value?.dispose(); t.material.dispose(); }
  for (const d of crash.detached ?? []) d.parent?.remove(d);
  crash.chuteX?.items[0]?.o.traverse((o) => { o.geometry?.dispose(); o.material?.dispose(); });
  for (const id of ['lapse', 'cap', 'aoa']) document.getElementById(id).style.opacity = 0;
  pinsEl.querySelectorAll('.ev').forEach((n) => n.remove()); $('#ptag').style.opacity = 0; $('#ftag').style.opacity = 0;
}

async function openCrash(id, opts) {
  sound.unlock();
  closeMenu(); $('#info').style.display = 'none'; $('#eyes').classList.remove('open');
  const meta = index.find((c) => c.id === id); if (!meta) return;
  clearCrash(); playing = false; ended = false; epiDone = false; manualView = false; lastBeat = -1; masks = false; smoothRt = null;
  $('#fade').classList.remove('show', 'soft'); $('#fade').innerHTML = ''; document.body.classList.remove('ended', 'epi');
  $('#who').innerHTML = `<b>${esc(meta.short)}</b><span>${esc(meta.datePlace)}</span>`;
  const raw = await (await fetch(AS(`data/${id}.json`))).json();
  const direct = { ...(DIRECT[id] || {}) };
  if (direct.prefix) direct.add = [...(direct.add || []), ...prefixTrack(raw, direct.prefix.until, direct.prefix.from, direct.prefix.points)];
  const sim = normalise(raw, direct);
  const timing = await sound.story(id);
  attachStory(sim, STORIES[id], timing);
  crash = { id, raw, direct, sim, meta, lines: [], parts: [], terrain: [], detached: [], evs: [], view: raw.perspectives?.[0]?.id, interiors: {} };
  crash.kn = fieldIndex(); crash.insideEnd = insideLimits(); crash.size = Math.max(0, ...(direct.formation || []).map((o) => Math.hypot(...o) * .4));
  mode = 'crash'; G.spin = false;
  const endP = sim.pts.at(-1);
  world.anchor.copy(ecef(raw.site?.lat ?? endP.lat, raw.site?.lon ?? endP.lon, 0));
  const ac = buildAircraft(direct.aircraft || 'a330', raw.aircraft?.registration); crash.ac = ac; crash.size = Math.max(crash.size, ac.spec.length);
  ac.group.updateMatrixWorld(true);
  const ep = (ac.parts.elev || []).map((g) => g.getWorldPosition(new THREE.Vector3())).filter((v) => v.lengthSq() > 1);
  crash.tail = ep.length ? ep.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / ep.length) : new THREE.Vector3(-ac.spec.length * .44, ac.spec.dia * .5, 0);
  { const bx = new THREE.Box3(); for (const g of ac.parts.elev || []) bx.expandByObject(g); crash.stab = bx.isEmpty() ? ac.spec.span * .36 : clamp((bx.max.z - bx.min.z) * 1.1, ac.spec.span * .25, ac.spec.span * .5); }
  crash.bb = new THREE.Box3().setFromObject(ac.group);
  world.scene.add(ac.group);
  crash.nearMode = null;
  crash.wing = (direct.formation || []).map((o) => { const a = buildAircraft(direct.aircraft, null); world.scene.add(a.group); a.setLights(false); return { a, o }; });
  buildLines(); buildViews(); buildFx(); buildEv();
  applyEnv(); await loadTerrain();
  { const e = sim.sample(sim.dur), g = groundAt(e.lat, e.lon), a = destination(e.lat, e.lon, e.hdg, 250), hit = !direct.endTitle && (direct.endAlt != null || (e.alt - g < 80 && (e.vs < -1500 || groundAt(a.lat, a.lon) > e.alt - 30)));
    crash.hitS = hit ? sim.storyOf(sim.dur) : null; crash.seaHit = hit && g < 1; crash.lastI = sim.beats.findIndex((b) => b.t === 'end') - 1; crash.altUnknown = !crash.kn.alt.length || crash.kn.alt.at(-1)[0] < sim.dur - 600; crash.ghost = 0; }
  renderHud(); renderMore(); renderMenu();
  story = 0; rt = 0; speed = 1; $('#spd').textContent = '1×';
  $('#hud').hidden = false; $('#rail').hidden = false; $('#back').hidden = false;
  const fit = routeFit(); crash.fit = fit;
  const s0 = sim.sample(0), og = fitFrame([dirOf(s0.lat, s0.lon), ...thin(crash.pathPts, 80).map((p) => dirOf(p.lat, p.lon)), ...(crash.ovPts || [])], 1500e3), oa = clamp(Math.max(og.alt * 1.06, fit.alt * 1.2), 4500e3, 13000e3), o = ecef(og.lat, og.lon, oa);
  const night = nightAt(0), keep = !night && frames && cam.p.length() - R > 2e6;
  if (frames && !keep && (cam.p.length() - R < 2e6 || cam.p.clone().normalize().angleTo(o.clone().normalize()) > .35)) fadeDip = .8;
  G.lat = og.lat; G.lon = og.lon; G.alt = oa; G.spin = false; G.vLat = G.vLon = 0;
  if (!keep) cam.p.copy(o); cam.l.set(0, 0, 0); cam.u.set(0, 0, 1); cam.fov = 34; cam.rig = 'globe'; cam.t = 1; shiftK = 0; camCut = 2;
  const first = sim.beats[0]; cam.az = first.az ?? direct.az ?? 215; cam.el = first.el ?? direct.el ?? 8; cam.zoom = first.zoom ?? 1.3;
  curView = 'follow'; if (night) xfReq = { rig: 'follow', at: clk + 1.5 }; else setRig('follow', 4.4); updateRailOn();
  const t = $('#title'); t.innerHTML = `<b>${esc(meta.short)}</b><span>${esc(meta.datePlace)}</span>`; if (!tier.shot) { t.classList.add('show'); setTimeout(() => t.classList.remove('show'), 2600); }
  if (opts?.get?.('t')) { story = sim.storyOf(+opts.get('t')); rt = sim.realOf(story); }
  crash.startAt = performance.now() + 2600;
  if (!opts?.get?.('paused')) playing = true; setPP();
  drawTimeline(true);
  postHeight();
}

let srC;
function safeRect() {
  if (srC) return srC;
  const W = world.cssW || stage.clientWidth, H = world.cssH || stage.clientHeight, st = stage.getBoundingClientRect().top, hud = !$('#hud').hidden;
  const end = document.body.classList.contains('ended') ? ($('#fade b')?.getBoundingClientRect().top ?? H + st) - st : H, card = hud ? Math.min(...['#views', '#card'].map((q) => $(q).getBoundingClientRect()).filter((b) => b.height > 0).map((b) => b.top)) - st : H;
  const r = { W, H, x0: 18, x1: W - ($('#rail').hidden ? 18 : 66), y0: 74, y1: clamp(Math.min(end, card) - 18, H * .42, H - 70) };
  if (srC === null) srC = r;
  return r;
}
const shiftOf = (S) => clamp((S.H / 2 - (S.y0 + S.y1) / 2) / S.H, 0, .2);
const fv1 = new THREE.Vector3(), fv2 = new THREE.Vector3(), fv3 = new THREE.Vector3();
function fitFrame(dirs, minAlt = 150e3, fix = null) {
  const S = safeRect(), { W, H } = S, asp = W / H, tv = Math.tan(17 * D2R), sh = shiftOf(S) * H, xc = fv1, yc = fv2, d = fv3;
  const c = fix ? fix.clone() : dirs.reduce((a, v) => a.add(v), new THREE.Vector3()).normalize();
  const box = (alt) => {
    xc.set(0, 0, 1).cross(c); if (xc.lengthSq() < 1e-8) xc.set(0, 1, 0); xc.normalize(); yc.crossVectors(c, xc);
    const D = R + alt, hz = R / D + .004, b = [1e9, -1e9, 1e9, -1e9];
    for (const v of dirs) {
      if (v.dot(c) < hz) return null;
      d.copy(v).multiplyScalar(R).addScaledVector(c, -D); const z = -d.dot(c), x = (1 + d.dot(xc) / (z * tv * asp)) * W / 2, y = (1 - d.dot(yc) / (z * tv)) * H / 2 - sh;
      b[0] = Math.min(b[0], x); b[1] = Math.max(b[1], x); b[2] = Math.min(b[2], y); b[3] = Math.max(b[3], y);
    }
    return b;
  };
  const search = () => { let lo = Math.log(minAlt), hi = Math.log(40000e3); const ok = (b) => b && (fix ? b[0] >= S.x0 && b[1] <= S.x1 && b[2] >= S.y0 && b[3] <= S.y1 : b[1] - b[0] <= S.x1 - S.x0 && b[3] - b[2] <= S.y1 - S.y0); if (ok(box(minAlt))) return minAlt; for (let k = 0; k < 24; k++) { const m = (lo + hi) / 2; if (ok(box(Math.exp(m)))) hi = m; else lo = m; } return Math.exp(hi); };
  let alt = minAlt;
  for (let it = 0; it < (fix ? 0 : 5); it++) {
    alt = search(); const b = box(alt); if (!b) break;
    const k = alt * 2 * tv / H / R, dx = (b[0] + b[1] - S.x0 - S.x1) / 2, dy = (b[2] + b[3] - S.y0 - S.y1) / 2;
    if (Math.abs(dx) < 2 && Math.abs(dy) < 2) break;
    c.addScaledVector(xc, dx * k).addScaledVector(yc, -dy * k).normalize();
  }
  alt = search();
  const ll = latLonOf(c); return { lat: ll.lat, lon: ll.lon, alt };
}
const thin = (list, n = 160) => list.filter((_, i) => i % Math.max(1, Math.ceil(list.length / n)) === 0 || i === list.length - 1);
function designedFrame(f) {
  const asp = world.cam.aspect || 1; if (asp >= .97) return f;
  const D = R + f[2], sn = D / R * Math.sin(17 * D2R), phi = (sn < 1 ? Math.asin(sn) - 17 * D2R : Math.acos(R / D)) * .86;
  const c = dirOf(f[0], f[1]), e = new THREE.Vector3(0, 0, 1).cross(c).normalize(), n = c.clone().cross(e), dirs = [c.clone()];
  for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; dirs.push(c.clone().multiplyScalar(Math.cos(phi)).addScaledVector(e, Math.sin(phi) * Math.cos(a)).addScaledVector(n, Math.sin(phi) * Math.sin(a))); }
  const r = fitFrame(dirs, f[2]); return [r.lat, r.lon, r.alt];
}
function routeFit() {
  const r = crash.raw, list = thin(crash.pathPts || crash.sim.pts), vs = list.map((p) => dirOf(p.lat, p.lon));
  if (r.route?.to?.lat != null && crash.direct.fitDest !== false) vs.push(dirOf(r.route.to.lat, r.route.to.lon));
  if (crash.s) vs.push(dirOf(crash.s.lat, crash.s.lon));
  const g = fitFrame(vs, 180e3), ra = crash.direct.routeAlt;
  g.alt = ra ? Math.max(g.alt, designedFrame([g.lat, g.lon, ra])[2]) : Math.min(g.alt * 1.08, 20000e3);
  return g;
}

const Q_COL = { recorded: [.5, 1, .85], radar: [.5, .78, 1], reported: [.86, .86, .95], derived: [.84, .74, 1], modelled: [1, .72, .42] }, LIN = {};
const toLine = (c) => { const l = c[0] * .3 + c[1] * .59 + c[2] * .11; return c.map((x) => { const y = Math.min(clamp(l + (x - l) * 1.3) ** 2.2, .96), A = y * 2.43 - 2.51, B = y * .59 - .03; return (-B - Math.sqrt(B * B - .56 * A * y)) / (2 * A); }); };
const lineCol = (q) => (LIN[q] ??= toLine(Q_COL[q] || Q_COL.reported));
const qOf = (p) => (p.posQ === 'derived' ? 'derived' : Q_COL[p.posQ] ? p.posQ : Q_COL[p.q] ? p.q : 'reported');
const lay = (L) => (L || []).map((l) => ({ base: l.base_ft * .3048, top: l.top_ft * .3048, cover: l.cover, density: l.density, flat: l.flat, scale: l.scale, drift: l.drift }));
function gcLine(list, alt, step = 50000) {
  const P = [];
  for (let i = 0; i < list.length - 1; i++) { const a = list[i], b = list[i + 1], d = gcDistance(a, b), br = bearing(a, b), n = Math.max(1, Math.ceil(d / step)); for (let k = i ? 1 : 0; k <= n; k++) { const q = destination(a.lat, a.lon, br, d * k / n); P.push(ecef(q.lat, q.lon, lerp(a.h ?? alt, b.h ?? alt, k / n))); } }
  return P;
}
const LF = { b: { value: -1e4 }, w: { value: 30 } };
function hudFade(m) {
  m.onBeforeCompile = (sh) => { sh.uniforms.uFB = LF.b; sh.uniforms.uFW = LF.w; sh.fragmentShader = 'uniform float uFB, uFW;\n' + sh.fragmentShader.replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', 'gl_FragColor = vec4( diffuseColor.rgb, alpha * mix( .16, 1., smoothstep( uFB, uFB + uFW, gl_FragCoord.y ) ) );'); };
  m.customProgramCacheKey = () => 'hudline'; m.needsUpdate = true;
}
function addLine(o, P, cols) { const l = world.makeLine({ points: P, colors: cols, width: o.width, opacity: o.opacity, dashed: o.dashed }); hudFade(l.material); l.userData.op = o.opacity; if (o.order) l.renderOrder = o.order; crash.lines.push(l); return l; }
function buildLines() {
  const s = crash.sim, ps = pathSamples(s, 900);
  const pts = ps.map((p) => ecef(p.lat, p.lon, p.alt)), cols = ps.map((p) => lineCol(qOf(p)));
  crash.pathPts = ps;
  crash.fut = addLine({ width: 1.4, opacity: .6 }, pts, cols.map((c) => c.map((x) => x * .3)));
  crash.past = addLine({ width: 2.8, opacity: 1 }, pts, cols);
  const r = crash.raw;
  const wp = [r.route?.from, ...(r.route?.planned_waypoints || []).filter((w) => w.lat != null), r.route?.to].filter((w) => w && w.lat != null);
  const planned = wp.length >= 2 && crash.direct.planned !== false;
  crash.ovLines = [];
  if (planned) { const P = gcLine(wp, 2000, 60000); addLine({ width: 1, opacity: .4, dashed: true }, P, P.map(() => [.8, .82, .9])); crash.ovLines.push(thin(P, 80)); }
  const f0 = ps[0], dep = r.route?.from;
  if (dep?.lat != null && gcDistance(dep, f0) > 40000) {
    if (!planned) { const P = gcLine([dep, f0], 1800); addLine({ width: 1, opacity: .3, dashed: true }, P, P.map(() => [.7, .72, .78])); }
    crash.evs.push({ v: ecef(f0.lat, f0.lon, 0), label: 'Drawn path begins', kind: 'trk0', detail: 'No positions are drawn between the departure airport and this point. How this was built, below, explains where the drawn positions come from.', sources: [], always: true });
  }
  const ov = typeof crash.direct.overlays === 'function' ? crash.direct.overlays(r) : (crash.direct.overlays || []);
  for (const o of ov) {
    const L = o.points.map(([lat, lon]) => ({ lat, lon })); if (o.closed) L.push(L[0]);
    const P = gcLine(L, o.alt ?? 1500), c0 = o.color || [.5, .78, 1]; (crash.ovPts ??= []).push(...thin(P, 48).map((v) => v.clone().normalize())); if (o.width !== 0) crash.ovLines.push(thin(P, 60));
    const c = toLine(c0.map((x) => lerp(x, 1, .12))), w = (o.width ?? 1.4) + .5;
    const la = addLine({ width: w + 2.6, opacity: .34 * (o.opacity ?? .8), dashed: !!o.dashed, order: 109 }, P, P.map(() => [0, .02, .06])), lb = addLine({ width: w, opacity: Math.min(1, (o.opacity ?? .8) * 1.15), dashed: !!o.dashed }, P, P.map(() => c));
    if (o.only) { for (const l of [la, lb]) { l.userData.only = o.only; l.visible = false; } (crash.ovOnly ??= []).push({ only: o.only, pts: thin(P, 24).map((v) => v.clone().normalize()) }); }
    const at = o.closed ? o.labelAt ?? .5 : clamp(o.labelAt ?? .5, .35, .72);
    if (o.label) crash.evs.push({ v: P[Math.min(P.length - 1, Math.floor(P.length * at))], label: o.label, kind: o.kind || 'satellite', detail: o.detail, sources: o.sources, always: true, only: o.only });
  }
}
function buildViews() {
  crash.viewLines = {};
  for (const p of crash.raw.perspectives || []) {
    const vp = crash.direct.viewPaths?.[p.id];
    const pts = vp ? vp.map(([lat, lon]) => ({ lat, lon })) : (p.track_override || []).filter((x) => x.lat != null && x.lon != null);
    if (pts.length < 2) continue;
    const P = gcLine(pts.map((x) => ({ lat: x.lat, lon: x.lon, h: (x.alt_ft ?? 35000) * .3048 })), 0);
    const l = addLine({ width: 1.6, opacity: .9 }, P, P.map(() => [1, .72, .42])); l.visible = false; crash.viewLines[p.id] = l;
  }
}
function buildFx() {
  const fx = crash.direct.fx || [], s = crash.sim;
  const links = fx.some((f) => f.type === 'links') ? (crash.raw.events || []).filter((e) => e.t_utc && /satellite|log-on/i.test(e.title)).map((e) => ({ type: 'link', t: e.t_utc, text: e.title, ping: /handshake/i.test(e.title) })) : [];
  crash.fx = [...fx.filter((f) => f.type !== 'links'), ...links].map((f) => ({ ...f, loc: f.at, at: f.t ? (Date.parse(f.t) / 1000 - s.t0) : f.rt, to: f.until != null ? Date.parse(f.until) / 1000 - s.t0 : null }));
  crash.fx3 = [];
  for (const f of crash.fx) {
    if (f.type === 'link') { crash.fx3.push(buildLink(f)); continue; }
    if (f.type === 'bombs') { crash.fx3.push(buildBombs(f)); continue; }
    if (f.type === 'flare' || f.type === 'chutes') { f.s0 = s.storyOf(f.at); f.k0 = clamp(Math.min(s.realOf(f.s0 + .5) - f.at, f.at - s.realOf(f.s0 - .5)) / .5, .5, 2); crash.fx3.push(f.type === 'flare' ? buildFlares(f) : buildChutes(f)); continue; }
    if (f.type !== 'fire' && f.type !== 'smoke') continue;
    const n = f.n ?? 700, p = makeParticles(world, f.type, n), pos = p.geometry.attributes.position.array, vel = p.geometry.attributes.aVel.array, b = p.geometry.attributes.aB.array;
    const to = f.until != null ? (Date.parse(f.until) / 1000 - s.t0) : s.dur;
    const smk = f.type === 'smoke', o = f.offset;
    for (let i = 0; i < n; i++) {
      const t = f.at + (to - f.at) * (i + Math.random()) / n, q = s.sample(t), v = ecef(q.lat, q.lon, q.alt), r = (k) => (Math.random() - .5) * k;
      if (o) { const up = dirOf(q.lat, q.lon), F = headingVector(q.lat, q.lon, q.hdg, q.pitch), Rt = v3.crossVectors(F, up).normalize(), U = v2.crossVectors(Rt, F).normalize(); v.addScaledVector(F, o[0]).addScaledVector(U, o[1]).addScaledVector(Rt, o[2]); }
      pos[i * 3] = v.x - world.anchor.x + r(f.spread ?? 14); pos[i * 3 + 1] = v.y - world.anchor.y + r(f.spread ?? 14); pos[i * 3 + 2] = v.z - world.anchor.z + r(f.spread ?? 14);
      vel[i * 4] = r(3); vel[i * 4 + 1] = r(3); vel[i * 4 + 2] = r(3); vel[i * 4 + 3] = (f.grow ?? .5) * (smk ? .75 + Math.random() * .6 : 1);
      b[i * 3] = t; b[i * 3 + 1] = (f.life ?? (f.type === 'fire' ? 3 : 24)) * (smk ? .7 + Math.random() * .6 : 1); b[i * 3 + 2] = (f.size ?? (f.type === 'fire' ? 26 : 40)) * (smk ? .6 + Math.random() * .8 : 1);
    }
    p.geometry.attributes.position.needsUpdate = true; crash.parts.push(p);
  }
}
const FLARE_V = `attribute vec4 aF; uniform float uT,uScale,uRise,uLift,uK; uniform vec3 uUp,uE,uN; varying float vI;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ float age=uT-aF.x-aF.z*.085, y=age/aF.y, on=step(0.,age)*step(age,aF.y);
 float tr=min(age/2.4,1.), h=max(uRise*(1.-(1.-tr)*(1.-tr))-max(age-2.4,0.)*6.,0.), an=aF.w*6.283;
 vec3 p=position+uUp*(uLift+2.+h)+(uE*cos(an)+uN*sin(an))*(30.+40.*fract(aF.w*7.1))*tr;
 vec4 mv=modelViewMatrix*vec4(p,1.); gl_Position=projectionMatrix*mv;
 float fl=.8+.2*sin(uK*37.+aF.w*91.)*sin(uK*23.+aF.w*13.);
 vI=on*smoothstep(0.,.05,y)*(1.-smoothstep(.7,1.,y))*fl*(aF.z>.5?(1.-aF.z/9.)*.45*(1.-tr*.6):1.);
 gl_PointSize=on*clamp(uScale*(aF.z>.5?10.:90.)/max(-mv.z,1.),3.,240.);
#include <logdepthbuf_vertex>
}`;
const FLARE_F = `varying float vI; uniform float uB;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
 float r=length(gl_PointCoord-.5)*2.; if(r>1.)discard;
 gl_FragColor=vec4(vec3(1.,.82,.6)*(exp(-r*r*500.)*9.+exp(-r*14.)*1.6+exp(-r*4.)*.22*(1.-r))*vI*uB,1.);
}`;
const GLOW_V = `varying vec2 vU;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`;
const GLOW_F = `varying vec2 vU; uniform float uI,uH,uRad;
#include <common>
float hash12(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
 vec2 q=vU*uRad/34.; float d=length(vU)*uRad, h=max(uH,40.), n=0.;
 for(int k=0;k<2;k++){ vec2 i=floor(q), f=fract(q); f=f*f*(3.-2.*f); n+=mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+1.),f.x),f.y)*(k==0?.65:.35); q*=3.1; }
 float e=uI*pow(h*h/(h*h+d*d),1.15)*(1.-smoothstep(.7,1.,length(vU)))*(.55+.9*n);
 gl_FragColor=vec4(vec3(1.,.55,.26)*e,1.);
}`;
const fl3 = (age, life) => { const y = age / life; return age < 0 || age > life ? 0 : smooth(y / .05) * (1 - smooth((y - .7) / .3)); };
function buildFlares(f) {
  const n = f.n ?? 3, K = 9, a = new Float32Array(n * K * 4), pos = new Float32Array(n * K * 3), g = new THREE.BufferGeometry(), site = ecef(f.loc[0], f.loc[1], 0).sub(world.anchor), { east, north, up } = enu(f.loc[0], f.loc[1]);
  for (let i = 0; i < n * K; i++) { a.set([Math.floor(i / K) * (f.every ?? 4), f.life ?? 7, i % K, (Math.floor(i / K) * .6180339 + .21) % 1], i * 4); site.toArray(pos, i * 3); }
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aF', new THREE.BufferAttribute(a, 4));
  const m = new THREE.ShaderMaterial({ uniforms: { uT: { value: -1e3 }, uScale: { value: 1 }, uRise: { value: f.rise ?? 300 }, uLift: { value: 0 }, uUp: { value: up }, uE: { value: east }, uN: { value: north }, uB: { value: 1 }, uK: { value: 0 } }, vertexShader: FLARE_V, fragmentShader: FLARE_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const o = new THREE.Points(g, m); o.frustumCulled = false; o.renderOrder = 122; world.scene.add(o); world.movers.push(o); crash.parts.push(o);
  const rad = 2600, gg = new THREE.CircleGeometry(rad, 72).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), up)).translate(site.x, site.y, site.z);
  const gm = new THREE.ShaderMaterial({ uniforms: { uI: { value: 0 }, uH: { value: 300 }, uRad: { value: rad } }, vertexShader: GLOW_V, fragmentShader: GLOW_F, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const gl = new THREE.Mesh(gg, gm); gl.frustumCulled = false; gl.renderOrder = 121; world.scene.add(gl); world.movers.push(gl); crash.parts.push(gl);
  return (crash.flare = { f, o, gl, up, kind: 'flare', end: (n - 1) * (f.every ?? 4) + (f.life ?? 7) });
}
function buildChutes(f) {
  const n = f.n ?? 9, gC = new THREE.SphereGeometry(4.2, 18, 6, 0, Math.PI * 2, 0, Math.PI * .46).scale(1, .5, 1).translate(0, 6.3, 0), gB = new THREE.CylinderGeometry(.26, .2, 1.75, 6).translate(0, -.95, 0), rim = [];
  for (let k = 0; k < 12; k++) { const a = k * Math.PI / 6; rim.push(Math.cos(a) * 4.17, 6.55, Math.sin(a) * 4.17, 0, 0, 0); }
  const gL = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(rim, 3));
  const mC = new THREE.MeshStandardMaterial({ color: 0xeeeae0, roughness: .92, side: THREE.DoubleSide, emissive: 0x15151a }), mB = new THREE.MeshStandardMaterial({ color: 0x3a3628, roughness: 1 }), mL = new THREE.LineBasicMaterial({ color: 0x4a4740, transparent: true, opacity: .55 });
  const items = [];
  for (let i = 0; i < n; i++) { const o = new THREE.Group(), cg = new THREE.Group(); cg.add(new THREE.Mesh(gC, mC), new THREE.LineSegments(gL, mL)); o.add(cg, new THREE.Mesh(gB, mB)); o.visible = false; world.scene.add(o); crash.detached.push(o); items.push({ o, cg, t: i * (f.every ?? 1.2), part: i >= n - (f.partial ?? 0), side: (i % 2 ? 1 : -1) * (3 + i * 1.6) }); }
  return (crash.chuteX = { f, items, kind: 'chutes', C: new THREE.Vector3(), n: 0, last: (n - 1) * (f.every ?? 1.2) });
}
const Y1 = new THREE.Vector3(0, 1, 0), X1 = new THREE.Vector3(1, 0, 0), Z1 = new THREE.Vector3(0, 0, 1), fxP = new THREE.Vector3(), fxD = new THREE.Vector3();
function buildBombs(f) {
  const g = new THREE.CylinderGeometry(.22, .22, 1.7, 10).rotateZ(Math.PI / 2), m = new THREE.MeshStandardMaterial({ color: 0x4b5045, roughness: .55, metalness: .4 }), items = [];
  for (let i = 0; i < (f.n ?? 10); i++) { const o = new THREE.Mesh(g, m); o.visible = false; world.scene.add(o); crash.detached.push(o); items.push({ o, t: i * (f.every ?? .4), side: (i % 2 ? 1 : -1) * .35 }); }
  return { f, items, kind: 'bombs' };
}
function buildLink(f) {
  const mk = (geo) => { const o = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0x9fdcff, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false })); o.visible = false; o.frustumCulled = false; o.renderOrder = 120; o.userData.fxOnly = true; world.scene.add(o); crash.detached.push(o); return o; };
  return { f, kind: 'link', beam: mk(new THREE.CylinderGeometry(70, 1.5, 30000, 16, 1, true).translate(0, 15000, 0)), ring: mk(new THREE.RingGeometry(.9, 1, 96)), s0: crash.sim.storyOf(f.at), life: f.ping ? 3 : 6 };
}
const SAT = ecef(0, 64.5, 35786e3);
function updateFx() {
  const live = story < crash.sim.flightEndS, S = crash.sim, a = crash.s.alt, Ls = world.env.layers.filter((l) => l.cover >= .3); crash.ftag = null;
  if (cam.rig === 'below' && crash.pos) {
    if (crash.deckK) crash.ftag = { t: Ls.some((l) => a > l.base && a < l.top) ? 'In cloud' : Ls.some((l) => l.top < a) ? 'Above the cloud' : 'Hidden by cloud', c: 'q', P: fxP.copy(crash.pos) };
    else if (crash.nightB) crash.ftag = { t: 'Night · lights only', c: 'q', P: fxP.copy(crash.pos) };
  }
  if ((crash.ghost || 0) > .15 && crash.altUnknown) crash.ftag = { t: 'Altitude unknown', c: 'q', P: fxP.copy(crash.pos), gap: 18 };
  for (const X of crash.fx3 || []) {
    const f = X.f, c = live ? Math.min(rt - f.at, (story - f.s0) * f.k0) : -1e3;
    if (X.kind === 'bombs') {
      let first = null;
      for (const it of X.items) {
        const tau = rt - f.at - it.t; it.o.visible = live && tau >= 0 && tau < 45 && cur.p.length() - R < 400e3;
        if (!it.o.visible) continue;
        if (!it.E) { const q = S.sample(f.at + it.t); it.E = ecef(q.lat, q.lon, q.alt - 2.5); it.up = dirOf(q.lat, q.lon); it.fw = headingVector(q.lat, q.lon, q.hdg, 0); it.rg = new THREE.Vector3().crossVectors(it.fw, it.up); it.v = (q.gs ?? 150) * .5144; }
        const kd = .03, h = it.v * (1 - Math.exp(-kd * tau)) / kd, P = fxP.copy(it.E).addScaledVector(it.fw, h).addScaledVector(it.rg, it.side).addScaledVector(it.up, -4.9 * tau * tau), ll = latLonOf(P);
        if (ll.alt < groundAt(ll.lat, ll.lon)) { it.o.visible = false; continue; }
        world.place(it.o, P); it.o.quaternion.setFromUnitVectors(X1, fxD.copy(it.fw).multiplyScalar(it.v * Math.exp(-kd * tau)).addScaledVector(it.up, -9.8 * tau).normalize());
        first ??= P.clone();
      }
      const c = rt - f.at; if (first && c > .4 && c < 14) crash.ftag = { t: f.text || 'Bomb release · Illustrative', c: 'q modelled', P: fxP.copy(first) };
      continue;
    }
    if (X.kind === 'link') {
      const age = story - X.s0, k = live && age >= -.05 && age < X.life ? smooth((age + .05) / .35) * (1 - smooth((age - X.life + 1.2) / 1.2)) : 0, ca = cur.p.length() - R;
      X.beam.visible = k > 0 && ca < 400e3 && !isInside(cam.rig); X.ring.visible = k > 0 && ca > 250e3;
      if (!k) continue;
      const P = crash.posVis ?? crash.pos, d = fxD.subVectors(SAT, P).normalize();
      if (X.beam.visible) { world.place(X.beam, P); X.beam.quaternion.setFromUnitVectors(Y1, d); X.beam.material.opacity = .32 * k * (.65 + .35 * Math.sin(clk * 7)); }
      if (X.ring.visible) { const u = dirOf(crash.s.lat, crash.s.lon), ph = (age / 1.1) % 1; world.place(X.ring, P); X.ring.quaternion.setFromUnitVectors(Z1, u); X.ring.scale.setScalar(ca * (.012 + .05 * ph)); X.ring.material.opacity = .9 * k * (1 - ph); }
      if (k > .3 && !isInside(cam.rig)) crash.ftag = { t: f.text, c: 'q', P: fxP.copy(P).addScaledVector(d, ca < 400e3 ? 45 : 0) };
      continue;
    }
    if (X.kind === 'flare') {
      const u = X.o.material.uniforms, lift = groundAt(f.loc[0], f.loc[1]); u.uT.value = c; u.uLift.value = lift; u.uK.value = clk; u.uB.value = 1.5 / (crash.expo || 1); u.uScale.value = world.H / (2 * Math.tan(cur.fov * D2R / 2));
      let I = 0, H = 0; for (let j = 0; j < (f.n ?? 3); j++) { const age = c - j * (f.every ?? 4), k = fl3(age, f.life ?? 7), tr = Math.min(Math.max(age, 0) / 2.4, 1); I += k; H += k * Math.max((f.rise ?? 300) * (1 - (1 - tr) ** 2) - Math.max(age - 2.4, 0) * 6, 0); }
      const gu = X.gl.material.uniforms; gu.uI.value = I * (.9 + .1 * Math.sin(clk * 31) * Math.sin(clk * 17)) * 1.3 / (crash.expo || 1); gu.uH.value = I > .01 ? H / I + 2 : 300; X.gl.visible = I > .005; X.gl.position.addScaledVector(X.up, lift + .6);
      crash.flareC = c > 0 && c < X.end ? c : null;
      if (c > .3 && c < X.end - 1.5) crash.ftag = { t: 'Flares · Illustrative', c: 'q modelled', P: fxP.copy(ecef(f.loc[0], f.loc[1], lift + (f.rise ?? 300) * .55)) };
      continue;
    }
    const C = X.C.set(0, 0, 0), high = cur.p.length() - R < 400e3; let n = 0;
    for (const it of X.items) {
      const tau = c - it.t; it.o.visible = high && tau >= 0;
      if (!it.o.visible) continue;
      if (!it.E) { const q = S.sample(f.at + it.t); it.E = ecef(q.lat, q.lon, q.alt - 3); it.up = dirOf(q.lat, q.lon); it.fw = headingVector(q.lat, q.lon, q.hdg, 0); it.rg = new THREE.Vector3().crossVectors(it.fw, it.up); it.v = (q.gs ?? 150) * .5144; }
      const to = 2.6, op = smooth((tau - 2.1) / 1.2) * (it.part ? .3 : 1), sink = it.part ? 19 : f.sink ?? 5.5, ff = (t) => 50 * (t - (1 - Math.exp(-t * .196)) / .196), vo = 50 * (1 - Math.exp(-to * .196));
      const z = tau < to ? ff(tau) : ff(to) + sink * (tau - to) + (vo - sink) * .8 * (1 - Math.exp(-(tau - to) / .8));
      const P = fxP.copy(it.E).addScaledVector(it.fw, it.v * 1.4 * (1 - Math.exp(-tau / 1.4))).addScaledVector(it.rg, it.side * Math.min(tau / 3, 1)).addScaledVector(it.up, -z);
      const ll = latLonOf(P), gh = groundAt(ll.lat, ll.lon), land = ll.alt < gh + 1;
      if (land) P.addScaledVector(it.up, gh + 1 - ll.alt);
      world.place(it.o, P); it.o.quaternion.setFromUnitVectors(Y1, it.up); it.o.rotateX(Math.sin(tau * 1.3 + it.side) * .09 * op); it.o.rotateZ(Math.sin(tau * 1.1 + it.side * 2) * .07 * op);
      const sx = land ? 1.25 : .1 + .9 * op; it.cg.scale.set(sx, land ? .1 : .3 + .7 * smooth(op * 1.6), sx);
      if (it === X.items[0]) (X.P0 ??= new THREE.Vector3()).copy(P);
      C.add(P); n++;
    }
    X.n = n; if (n) C.multiplyScalar(1 / n);
    X.active = n > 0 && c > .6 && c < X.last + 30 && S.beatAt(story) === S.beatAt(f.s0);
    if (n && c > 2.5 && c < X.last + 8) crash.ftag = { t: 'Parachutes · Illustrative', c: 'q modelled', P: fxP.copy(C) };
  }
  for (const c of crash.cues || []) if (c.tag && live && rt > c.at) crash.ftag = { t: c.tag, c: 'q modelled', P: fxP.copy(crash.pos) };
  for (const f of crash.fx || []) if (live && f.type === 'tag' && Array.isArray(f.loc) && rt >= f.at && (f.to == null || rt <= f.to)) crash.ftag = { t: f.text, c: 'q modelled', P: fxP.copy(ecef(f.loc[0], f.loc[1], f.loc[2] ?? 0)) };
}
function showFtag(dt) {
  const el = $('#ftag'), T = crash?.ftag, pr = T && world.project(T.P), S = T && safeRect(), on = T && !pr.behind && fadeOut < .02 && pr.x > 0 && pr.x < S.W && pr.y > 0 && pr.y < S.H;
  crash.ftagO = (crash.ftagO || 0) + ((on ? 1 : 0) - (crash.ftagO || 0)) * (1 - Math.exp(-dt * 5));
  el.style.opacity = crash.ftagO < .01 ? 0 : crash.ftagO;
  if (!on) return;
  if (el.textContent !== T.t) { el.textContent = T.t; el.className = T.c; crash.ftagW = el.offsetWidth; }
  const w = crash.ftagW || el.offsetWidth || 120, g = T.gap ?? 14;
  let x = pr.x + g, y = pr.y;
  if (x + w > S.x1) x = pr.x - g - w;
  if (x < S.x0) { x = clamp(pr.x - w / 2, S.x0, S.x1 - w); y = pr.y + (pr.y + 30 > S.y1 ? -g - 8 : g + 6); }
  el.style.transform = `translate(${x}px,${clamp(y, S.y0 + 8, S.y1 - 10)}px)`;
}
function buildEv() {
  const r = crash.raw, S = crash.sim;
  for (const e of r.evidence_points || []) if (e.lat != null && e.lon != null) crash.evs.push({ v: ecef(e.lat, e.lon, 0), label: e.label, kind: e.kind, detail: e.detail, sources: e.sources, date: e.date });
  for (const w of r.route ? [r.route.from, r.route.to] : []) if (w?.lat != null && (w.code || w.name)) crash.evs.push({ v: ecef(w.lat, w.lon, 0), label: w.code || w.name, kind: 'landmark', always: true, detail: w.name });
  S.beats.forEach((B, i) => {
    if (B.v !== 'map') return;
    for (const e of B.events) {
      const t = Date.parse(e.t_utc) / 1000 - S.t0, fix = S.pts.some((p) => Math.abs(p.rt - t) < 90 && /^(radar|recorded|reported)$/.test(p.posQ || ''));
      if (!fix || t < 0 || t > S.dur || crash.evs.some((x) => x.trk === i && x.label === e.title)) continue;
      const q = S.sample(t); crash.evs.push({ v: ecef(q.lat, q.lon, 0), label: e.title, kind: 'trk', detail: e.detail, sources: e.sources, trk: i });
    }
  });
  const rank = (e) => (e.trk != null ? -1 : { wreckage: 0, landmark: 1, radar: 2, signal: 2, debris: 4 }[e.kind] ?? 3);
  crash.evs.sort((a, b) => rank(a) - rank(b));
  crash.evs.forEach((e) => {
    const b = document.createElement('button'); b.className = `ev ${e.kind || ''}`; b.textContent = e.label; b.onclick = (ev) => { ev.stopPropagation(); showInfo(e); };
    pinsEl.append(b); e.el = b; e.labelW = b.offsetWidth || null; b.style.display = 'none';
  });
}
function showInfo(e) {
  const i = $('#info');
  i.innerHTML = `<button class="x" aria-label="Close">✕</button><b>${esc(e.label)}</b>${e.date ? `<span style="color:var(--mid);font-size:12px">${esc(e.date)}</span>` : ''}<div>${esc(e.detail || '')}</div><div class="meta">${cites(e.sources)}</div>`;
  i.style.display = 'block'; i.querySelector('.x').onclick = () => { i.style.display = 'none'; };
}
function applyEnv() {
  const d = crash.direct.env || {}, r = crash.raw, c = dirOf(r.site?.lat ?? 0, r.site?.lon ?? 0);
  const center = d.center ? ecef(d.center[0], d.center[1], 0) : c.multiplyScalar(R);
  crash.envBase = { layers: lay(d.layers), sea: d.sea ?? .4, fogVis: d.fogVisKm ?? 0 }; crash.epiEnv = false; crash.cues = (crash.direct.cues || []).map((c) => ({ at: atT(c.t), tag: c.tag, ramp: c.ramp ?? 600, env: { layers: c.env?.layers ? lay(c.env.layers) : null, sea: c.env?.sea } })).sort((a, b) => a.at - b.at); crash.cueKey = '';
  world.setEnv({ layers: lay(d.layers), fogVis: d.fogVisKm ?? 0, fogTop: d.fogTopKm ?? 1, sea: d.sea ?? .4, center, radius: d.radiusKm ?? 260, historicLights: d.globalClouds ?? 1, follow: !!d.follow });
  const yr = new Date(crash.sim.t0 * 1000).getUTCFullYear();
  world.U.uNightLights.value = d.nightLights ?? (yr < 1960 ? .06 : yr < 1990 ? .35 : yr < 2005 ? .7 : 1); world.U.uIce.value = d.ice ? 1 : 0;
  world.U.uSiteBox.value.set(999, 0, 0, 0);
  const noon = world.U.uSun.value.clone();
  const sim = crash.sim; world.setTime(sim.t0 * 1000 + sim.dur * 1000);
  const end = sim.sample(sim.dur), up = dirOf(end.lat, end.lon);
  world.setEnvMap(smooth((up.dot(world.U.uSun.value) + .05) / .3));
  void noon;
}
function cueEnv() {
  const C = crash.cues; if (!C?.length || crash.epiEnv) return;
  let e = crash.envBase, key = '';
  for (const c of C) {
    const k = smooth((rt - c.at) / c.ramp); key += k.toFixed(3); if (k <= 0) break;
    const A = e.layers, B = c.env.layers ?? A, n = Math.max(A.length, B.length), L = [];
    for (let i = 0; i < n; i++) { const a = A[i] ?? { ...B[i], cover: 0 }, b = B[i] ?? { ...a, cover: 0 }, o = {}; for (const f of ['base', 'top', 'cover', 'density', 'flat', 'scale']) o[f] = lerp(a[f] ?? .55, b[f] ?? .55, k); o.drift = b.drift ?? a.drift; L.push(o); }
    e = { layers: L, sea: lerp(e.sea, c.env.sea ?? e.sea, k) };
  }
  if (key !== crash.cueKey) { crash.cueKey = key; world.setEnv({ layers: e.layers.filter((l) => l.cover > .005), sea: e.sea }); }
}
function cloudClear(s) {
  const A = world.atmU, dk = crash.diveK || 0, k = Math.min(crash.clearK ?? 1, 1 - .8 * dk), ca = cur.p.length() - R;
  world.env.layers.slice(0, 4).forEach((l, i) => { A.uLayers.value[i].w = (l.density ?? .55) * (k < 1 && ca > l.base && ca < l.top && s.alt > l.base && s.alt < l.top ? k : 1) * (dk > 0 && ca > l.top && s.alt > l.top - 60 ? 1 - .95 * dk : 1); });
}
async function loadTerrain() {
  const id = crash.direct.terrain; if (!id) return;
  const meta = await (await fetch(AS(`sites/${id}.json`))).json();
  const anc = world.anchor.clone();
  const parts = [meta.outer, meta.inner].filter(Boolean);
  if (meta.water) { const wt = await new Promise((res) => new THREE.TextureLoader().load(AS(`sites/${meta.water}`), res)); wt.generateMipmaps = false; wt.minFilter = THREE.LinearFilter; world.U.tSite.value = wt; world.U.uSiteBox.value.set(meta.outer.w, meta.outer.s, meta.outer.e, meta.outer.n); }
  for (const L of parts) {
    const [img, col] = await Promise.all([bitmap(AS(`sites/${L.h}`)), new Promise((res) => new THREE.TextureLoader().load(AS(`sites/${L.c}`), res))]);
    col.colorSpace = THREE.SRGBColorSpace; col.anisotropy = tier.aniso;
    const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height; const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(img, 0, 0); const px = x.getImageData(0, 0, img.width, img.height).data;
    const W = img.width, H = img.height, grid = L === meta.inner ? (mobile ? 200 : 360) : (mobile ? 180 : 300);
    const pos = [], uv = [], idx = [];
    const hAt = (u, v) => { const X = u * (W - 1), Y = v * (H - 1), xi = Math.floor(X), yi = Math.floor(Y), fx = X - xi, fy = Y - yi, g = (a, b) => { const k = (Math.min(b, H - 1) * W + Math.min(a, W - 1)) * 4; return px[k] * 256 + px[k + 1] + L.hOff; }; return lerp(lerp(g(xi, yi), g(xi + 1, yi), fx), lerp(g(xi, yi + 1), g(xi + 1, yi + 1), fx), fy); };
    const inner = L === meta.outer ? meta.inner : null, hMap = [];
    for (let j = 0; j <= grid; j++) for (let i = 0; i <= grid; i++) {
      const u = i / grid, v = j / grid, lon = lerp(L.w, L.e, u), lat = lerp(L.n, L.s, v);
      let h = hAt(u, v);
      const edge = Math.min(u, 1 - u, v, 1 - v);
      if (L === meta.outer) h *= smooth(edge / .06);
      else if (edge === 0) h -= 80;
      if (h < 0) h = meta.keepBelow ? h : 0;
      hMap.push(h);
      const p = ecef(lat, lon, Math.max(h, 0) + (L === meta.inner ? 0 : -6)).sub(anc); pos.push(p.x, p.y, p.z); uv.push(u, 1 - v);
    }
    const st = crash.raw.site, PB = L === meta.inner && st?.lat > L.s && st.lat < L.n && st.lon > L.w && st.lon < L.e && hAt((st.lon - L.w) / (L.e - L.w), (L.n - st.lat) / (L.n - L.s)) > 20 ? (() => { const dl = 2000 / 111320, dn = dl / Math.cos(st.lat * D2R); return { w: st.lon - dn, e: st.lon + dn, s: st.lat - dl, n: st.lat + dl }; })() : null;
    const inPB = (i, j) => PB && [[i, j], [i + 1, j], [i, j + 1], [i + 1, j + 1]].every(([a, b]) => { const lo = lerp(L.w, L.e, a / grid), la = lerp(L.n, L.s, b / grid); return lo > PB.w && lo < PB.e && la > PB.s && la < PB.n; });
    for (let j = 0; j < grid; j++) for (let i = 0; i < grid; i++) {
      const a = j * (grid + 1) + i, b = a + 1, c = a + grid + 1, d = c + 1;
      if (inPB(i, j)) continue;
      if (!meta.keepBelow) { const P = (k) => pos[k * 3 + 0] !== undefined && hMap[k] <= .4; if (P(a) && P(b) && P(c) && P(d)) continue; }
      if (inner) { const lon = lerp(L.w, L.e, (i + .5) / grid), lat = lerp(L.n, L.s, (j + .5) / grid); if (lon > inner.w + .004 && lon < inner.e - .004 && lat > inner.s + .004 && lat < inner.n - .004) continue; }
      idx.push(a, b, c, b, d, c);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
    const m = terrainMaterial(world, col, crash.direct.terrainFlat ?? 0, L === meta.outer);
    const mesh = new THREE.Mesh(g, m); mesh.frustumCulled = false; mesh.layers.enable(1); mesh.receiveShadow = false; world.scene.add(mesh); crash.terrain.push(mesh);
    mesh.userData.anchor = anc;
    crash.hAt = crash.hAt || []; crash.hAt.push({ L, hAt });
    if (PB) sitePatch(PB, L, px, W, H, col, anc);
  }
}
const vn2 = (x, y) => { const h = (a, b) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); }, xi = Math.floor(x), yi = Math.floor(y), fx = x - xi, fy = y - yi, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(h(xi, yi), h(xi + 1, yi), u), lerp(h(xi, yi + 1), h(xi + 1, yi + 1), u), v) * 2 - 1; };
function sitePatch(PB, L, px, W, H, col, anc) {
  const gq = (a, b) => { const k = (clamp(b, 0, H - 1) * W + clamp(a, 0, W - 1)) * 4; return px[k] * 256 + px[k + 1] + L.hOff; }, cr = (p0, p1, p2, p3, t) => p1 + .5 * t * (p2 - p0 + t * (2 * p0 - 5 * p1 + 4 * p2 - p3 + t * (3 * (p1 - p2) + p3 - p0)));
  const hB = (u, v) => { const X = u * (W - 1), Y = v * (H - 1), xi = Math.floor(X), yi = Math.floor(Y), fx = X - xi, row = (y) => cr(gq(xi - 1, y), gq(xi, y), gq(xi + 1, y), gq(xi + 2, y), fx); return cr(row(yi - 1), row(yi), row(yi + 1), row(yi + 2), Y - yi); };
  const im = col.image, N = 96, cv = document.createElement('canvas'); cv.width = cv.height = N; const x = cv.getContext('2d', { willReadFrequently: true }), iw = im.width, ih = im.height;
  x.drawImage(im, (PB.w - L.w) / (L.e - L.w) * iw, (L.n - PB.n) / (L.n - L.s) * ih, (PB.e - PB.w) / (L.e - L.w) * iw, (PB.n - PB.s) / (L.n - L.s) * ih, 0, 0, N, N); const cd = x.getImageData(0, 0, N, N).data;
  const forest = (u, v) => { const k = (Math.min(N - 1, Math.floor(v * N)) * N + Math.min(N - 1, Math.floor(u * N))) * 4, r = cd[k], g = cd[k + 1], b = cd[k + 2], lum = r * .3 + g * .59 + b * .11; return clamp((g - Math.max(r, b * .9) - 2) / 10) * clamp((135 - lum) / 45); };
  const G = mobile ? 80 : 120, pos = [], uv = [], idx = [], hm = [], mx = (PB.e - PB.w) * 111320 * Math.cos((PB.n + PB.s) / 2 * D2R) / G, my = (PB.n - PB.s) * 111320 / G;
  for (let j = 0; j <= G; j++) for (let i = 0; i <= G; i++) {
    const lon = lerp(PB.w, PB.e, i / G), lat = lerp(PB.n, PB.s, j / G), u = (lon - L.w) / (L.e - L.w), v = (L.n - lat) / (L.n - L.s), X = i * mx, Y = j * my, e = Math.min(i, G - i, j, G - j), k = smooth(e / 8);
    let h = hB(u, v) + k * (vn2(X / 260, Y / 260) * 6 + vn2(X / 90, Y / 90) * 2.2);
    h += k * forest(i / G, j / G) * (15 + vn2(X / 46 + 7, Y / 46) * 6 + vn2(X / 21, Y / 21 + 3) * 3.5);
    h = e === 0 ? h - 30 : h + 2 * k; hm.push(h);
    const p = ecef(lat, lon, Math.max(h, 0)).sub(anc); pos.push(p.x, p.y, p.z); uv.push(u, 1 - v);
  }
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) { const a = j * (G + 1) + i, b = a + 1, c = a + G + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  const mesh = new THREE.Mesh(g, terrainMaterial(world, col, crash.direct.terrainFlat ?? 0, false)); mesh.frustumCulled = false; mesh.layers.enable(1); world.scene.add(mesh); crash.terrain.push(mesh); mesh.userData.anchor = anc;
  crash.hAt.push({ L: PB, hAt: (u, v) => { const X = clamp(u) * G, Y = clamp(v) * G, i = Math.min(Math.floor(X), G - 1), j = Math.min(Math.floor(Y), G - 1), fx = X - i, fy = Y - j, q = (a, b) => hm[b * (G + 1) + a]; return lerp(lerp(q(i, j), q(i + 1, j), fx), lerp(q(i, j + 1), q(i + 1, j + 1), fx), fy); } });
}
const bitmap = (u) => fetch(u).then((r) => r.blob()).then((b) => createImageBitmap(b, { colorSpaceConversion: 'none', premultiplyAlpha: 'none' }));
function groundAt(lat, lon) {
  if (!crash?.hAt) return 0;
  for (let i = crash.hAt.length - 1; i >= 0; i--) { const { L, hAt } = crash.hAt[i]; if (lon > L.w && lon < L.e && lat > L.s && lat < L.n) return Math.max(hAt((lon - L.w) / (L.e - L.w), (L.n - lat) / (L.n - L.s)), 0); }
  return 0;
}

const EYE = '<svg viewBox="0 0 24 24"><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
const MAPI = '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>';
const insideIds = () => (crash ? PERSPECTIVES[crash.direct.aircraft] || [] : []);
function viewList() { return [{ id: 'story', label: 'Follow the story' }, { id: 'follow', label: 'Outside' }, ...insideIds(), { id: 'below', label: 'From the ground' }, { id: 'above', label: 'From above' }]; }
const viewOk = (id) => (isInside(id) ? insideOk(id) : id !== 'below' || !crash?.s || !!crash.direct.witness || !overcast(crash.s));
function renderEyes() { $('#eyes').innerHTML = viewList().map((v) => `<button role="menuitem" data-v="${v.id}" class="${(v.id === 'story' ? !manualView : manualView && v.id === curView) ? 'on' : ''}"${viewOk(v.id) ? '' : ' disabled'}>${esc(v.label)}</button>`).join(''); }
function renderHud() {
  const r = crash.raw;
  $('#rail').innerHTML = `<button class="ic" id="mapb" aria-label="Map" title="Map">${MAPI}</button><button class="ic" id="eyeb" aria-label="Choose a view" title="View">${EYE}</button>`;
  $('#mapb').onclick = () => { manualView = true; if (cam.rig !== 'route') { const f = routeFit(); G.lat = f.lat; G.lon = f.lon; G.alt = f.alt; crash.mapT = null; } pickView('map'); };
  $('#eyeb').onclick = (e) => { e.stopPropagation(); renderEyes(); $('#eyes').classList.toggle('open'); };
  $('#eyes').onclick = (e) => { const b = e.target.closest('button'); if (!b || b.disabled) return; $('#eyes').classList.remove('open'); if (b.dataset.v === 'story') { manualView = false; lastBeat = -1; return; } manualView = true; pickView(b.dataset.v); };
  const P = r.perspectives || [];
  $('#views').innerHTML = P.length > 1 ? P.map((p) => `<button data-v="${esc(p.id)}" class="${p.id === crash.view ? 'on' : ''}">${esc(p.label)}</button>`).join('') : '';
  $('#views').querySelectorAll('button').forEach((b) => { b.onclick = () => { crash.view = b.dataset.v; $('#views').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); showPerspective(); }; });
  lastEv = -2; updateCard(true);
}
function resolveView(v) {
  if (v === 'captain' || v === 'pilot' || v === 'passenger' || v === 'navigator' || v === 'waist' || v === 'turret') {
    const L = insideIds().filter((x) => insideOk(x.id)); if (L.some((x) => x.id === v)) return v;
    if (v === 'captain') return L.find((x) => x.id === 'pilot')?.id ?? 'follow';
    if (v === 'pilot') return L.find((x) => x.id === 'captain')?.id ?? 'follow';
    return L[1]?.id ?? L[0]?.id ?? 'follow';
  }
  return v || 'follow';
}
const isInside = (v) => insideIds().some((x) => x.id === v);
function pickView(v, cut = true) {
  v = resolveView(v);
  const was = curView; curView = v;
  const rig = v === 'map' ? 'route' : v;
  if (rig !== cam.rig) {
    if (cut && (isInside(v) || isInside(cam.rig) || cam.rig === 'below' || v === 'below')) { fadeDip = 1; setRig(rig, .001); }
    else if (crash && (cam.rig === 'route' || cam.rig === 'globe') && rig !== 'route' && nightAt(rt)) { if (xfReq?.rig !== rig) xfReq = { rig, at: clk }; }
    else setRig(rig, v === 'map' || was === 'map' ? 2 : 1.6);
  }
  updateRailOn();
}
function updateRailOn() { $('#mapb')?.classList.toggle('on', cam.rig === 'route'); $('#eyeb')?.classList.toggle('on', manualView && cam.rig !== 'route'); }
function showPerspective() {
  const p = (crash.raw.perspectives || []).find((x) => x.id === crash.view); if (!p) return;
  crash.showView = performance.now() + 14000;
  const c = $('#card');
  c.innerHTML = `<h3>${esc(p.label)}</h3><small>${esc(p.held_by)} · ${esc(p.standing)}</small><p>${esc(p.claim)}</p><div class="meta">${cites([...(p.evidence_for || []), ...(p.evidence_against || [])].flatMap((e) => e.sources || []))}</div>`;
  if (p.ending?.lat != null) { const e = crash.evs.find((x) => x.persp === p.id); if (!e) { const n = { v: ecef(p.ending.lat, p.ending.lon, 0), label: p.label, kind: 'search_area', detail: p.ending.description, sources: [], persp: p.id, always: true }; const b = document.createElement('button'); b.className = 'ev search_area'; b.textContent = n.label; b.onclick = (ev) => { ev.stopPropagation(); showInfo(n); }; pinsEl.append(b); n.el = b; crash.evs.push(n); } }
}
function cites(list) {
  const seen = new Set();
  return (list || []).filter((s) => !seen.has(s) && seen.add(s)).map((id) => { const s = crash?.sim.src[id]; return s ? `<a class="cite" target="_blank" rel="noopener" href="${esc(s.url)}" title="${esc(s.publisher || '')}: ${esc(s.title)}">${s.n}</a>` : ''; }).join('');
}
const QL = { recorded: 'Recorded', radar: 'Radar', reported: 'Reported', derived: 'Derived', modelled: 'Modelled' };
function updateCard(force) {
  if (!crash) return;
  if (crash.showView && performance.now() < crash.showView && !force) return;
  const S = crash.sim, i = S.beatAt(story);
  if (i === lastEv && !force) return;
  lastEv = i; crash.showView = 0;
  const e = S.beats[i], c = $('#card');
  const words = e.text.split(/\s+/); crash.wordsN = words.length; crash.wordsAt = -1; crash.wordsW = []; let acc = 0; for (const w of words) { acc += w.length + 1.5; crash.wordsW.push(acc); } crash.wordsW = crash.wordsW.map((v) => v / acc);
  c.innerHTML = `<p>${words.map((w) => `<span>${esc(w)}</span>`).join(' ')}</p><div class="meta">${e.quality ? `<span class="q ${e.quality}">${QL[e.quality] || ''}</span>` : ''}${e.est ? '<span>Time estimated</span>' : ''}${cites(e.sources)}</div>`;
}
const QR = { recorded: 0, radar: 1, reported: 2, derived: 3, modelled: 4 };
function fieldIndex() {
  const S = crash.sim, d = crash.direct, K = {}, P = S.pts, fix = (p) => p && (p.posQ === 'radar' || p.posQ === 'recorded');
  for (const f of ['alt', 'ias', 'pitch', 'roll', 'aoa']) K[f] = P.filter((p) => p[f + 'Known']).map((p) => [p.rt, p.q]);
  const z = P.at(-1); if (d.endAlt != null && !z.altKnown && K.alt.length && K.alt.at(-1)[0] < z.rt) K.alt.push([z.rt, z.q === 'modelled' ? 'modelled' : 'derived']);
  K.gs = P.map((p, i) => (p.gsKnown ? [p.rt, p.q] : p.iasKnown && p.altKnown ? [p.rt, 'derived'] : fix(p) && [P[i - 1], P[i + 1]].some((n) => fix(n) && Math.abs(n.rt - p.rt) < 120) ? [p.rt, 'derived'] : null)).filter(Boolean);
  let tr = [...(d.track || crash.raw.track || []), ...(d.add || [])]; if (d.drop) tr = tr.filter(d.drop);
  K.elev = tr.filter((p) => typeof p.elevator_left_deg === 'number').map((p) => [Date.parse(p.t_utc) / 1000 - S.t0, p.quality]).sort((a, b) => a[0] - b[0]);
  return K;
}
function fieldQ(f, t, long) {
  const A = crash.kn?.[f]; if (!A?.length) return null;
  let lo = 0, hi = A.length - 1;
  if (t < A[0][0] - 1 || t > A[hi][0] + 1) return null;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (A[m][0] <= t) lo = m; else hi = m - 1; }
  const a = A[lo], b = A[lo + 1];
  if (Math.abs(t - a[0]) < 1 || !b) return a[1];
  const w = (QR[a[1]] ?? 2) >= (QR[b[1]] ?? 2) ? a[1] : b[1];
  if (b[0] - a[0] > 180) return w === 'modelled' ? w : !long && b[0] - a[0] > 1200 ? 'none' : 'gap';
  return w;
}
const anchorQ = (p) => (p.posQ && !(p.posQ === 'derived' && p.q && p.q !== 'derived') ? p.posQ : null);
function trackGs(t) {
  const S = crash.sim, P = S.pts, t0 = Math.max(t - 45, 0), t1 = Math.min(t + 45, S.dur);
  if (t1 - t0 < 5) return null;
  let i = P.length - 1; while (i > 0 && (P[i].rt > t0 || !anchorQ(P[i]))) i--;
  let j = 0; while (j < P.length - 1 && (P[j].rt < t1 || !anchorQ(P[j]))) j++;
  for (let k = i; k <= j; k++) { const q = anchorQ(P[k]); if (q && !/^(recorded|radar|reported|derived)$/.test(q)) return null; }
  if (!anchorQ(P[i]) || !anchorQ(P[j])) return null;
  let d = 0, a = S.sample(t0); for (let k = 1; k <= 12; k++) { const b = S.sample(t0 + (t1 - t0) * k / 12); d += gcDistance(a, b); a = b; }
  return [d / (t1 - t0) / .5144, 'derived'];
}
function fmt(n, d = 0) { return n == null || !Number.isFinite(n) ? '–' : (+n.toFixed(d) || 0).toLocaleString('en-US', { maximumFractionDigits: d }); }
const QC = (q) => (q === 'modelled' ? 'md' : q === 'gap' || q === 'derived' ? 'dr' : '');
function updateIns(s) {
  const epi = story >= crash.sim.flightEndS - .05; document.body.classList.toggle('epi', epi);
  const t = rt, K = crash.kn, d = crash.direct;
  const cell = (l, q, v, step, unit, sign, ap) => {
    if (q == null || q === 'none' || v == null || !Number.isFinite(v)) return `<div class="in"><label>${l}</label><b class="na">–</b></div>`;
    const md = q === 'modelled' || ap, x = (md ? Math.round(v / step) * step : Math.round(v)) || 0;
    return `<div class="in"><label>${l}</label><b class="${QC(q)}">${md ? '~' : ''}${sign && x > 0 ? '+' : ''}${fmt(x)}${unit}</b></div>`;
  };
  const dep = t < 900 && s.alt - groundAt(s.lat, s.lon) < 914, qi = fieldQ('ias', t), tg = !K.gs.length && !dep ? trackGs(t) : null, qg = K.gs.length ? fieldQ('gs', t, 1) : tg?.[1] ?? null;
  const spd = qi != null && qi !== 'none' ? cell('SPD', qi, s.ias, 10, ' kt') : cell('GS', qg, tg ? tg[0] : s.gs, 10, ' kt', 0, !!tg);
  let fourth;
  if (K.elev.length) { const q = fieldQ('elev', t); fourth = q == null || q === 'none' || s.elevL == null ? cell('ELEV L/R', 'none') : `<div class="in"><label>ELEV L/R</label><b class="${QC(q)}">${s.elevL > 0 ? '+' : ''}${fmt(s.elevL, 1)}/${s.elevR > 0 ? '+' : ''}${fmt(s.elevR, 1)}°</b></div>`; }
  else if (K.aoa.length) fourth = cell('AOA', fieldQ('aoa', t), s.aoa, 5, '°');
  else fourth = cell('ROLL', fieldQ('roll', t), s.roll, 5, '°');
  const html = cell('ALT', fieldQ('alt', t, 1), s.altFt, 500, ' ft') + spd + cell('PITCH', fieldQ('pitch', t), s.pitch, 5, '°', true) + fourth;
  if (html !== crash.insHtml) { $('#ins').innerHTML = html; crash.insHtml = html; }
  const fs = cam.rig === 'below' && crash.wit?.flare && crash.flareC != null, dd = new Date((crash.sim.t0 + (fs ? crash.flare.f.at + crash.flareC : rt)) * 1000), ap = d.clockApprox || fs, ck = `${ap ? '~' : ''}${dd.toISOString().slice(11, ap ? 16 : 19)}<small>UTC</small>`;
  $('#ins').style.visibility = fs ? 'hidden' : '';
  if (ck !== crash.clockHtml) { $('#clock').innerHTML = ck; crash.clockHtml = ck; }
}
function setPP() { $('#pp').innerHTML = playing ? '<svg viewBox="0 0 24 24"><path d="M7 5v14M17 5v14" stroke-width="3"/></svg>' : '<svg viewBox="0 0 24 24"><path d="M7 4l13 8-13 8z" fill="currentColor"/></svg>'; $('#pp').setAttribute('aria-label', playing ? 'Pause' : 'Play'); document.body.classList.toggle('paused', !playing); }
$('#pp').onclick = () => { $('#fade').classList.remove('soft'); document.body.classList.remove('ended'); if (ended) { autoRig = true; seekStory(0); } playing = !playing; setPP(); };
$('#snd').onclick = () => { sound.unlock(); sound.setMuted(!sound.muted); $('#snd').style.opacity = sound.muted ? .45 : 1; $('#snd').setAttribute('aria-label', sound.muted ? 'Sound off' : 'Sound on'); };
$('#spd').onclick = () => { speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length]; $('#spd').textContent = `${speed}×`; };
let tlDrawn = -1, tlAt = 0;
function drawTimeline(force) {
  const cv = $('#tl canvas'); if (!crash || !cv) return;
  const w = cv.clientWidth, h = cv.clientHeight; if (!w) return;
  const f = crash.sim.storyLen ? story / crash.sim.storyLen : 0;
  const tn = performance.now(); if (!force && (Math.abs(f - tlDrawn) < .001 || tn - (tlAt || 0) < 100)) return; tlDrawn = f; tlAt = tn;
  const d = Math.min(devicePixelRatio || 1, 2); if (cv.width !== Math.round(w * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
  const x = cv.getContext('2d'); x.setTransform(d, 0, 0, d, 0, 0); x.clearRect(0, 0, w, h);
  const S = crash.sim, N = Math.floor(w); if (!crash.prof || crash.prof.length !== N + 1) { crash.prof = []; let mx = 1; for (let i = 0; i <= N; i++) { const q = S.sample(S.realOf(S.storyLen * i / N)); crash.prof.push(q); mx = Math.max(mx, q.altFt); } crash.profMax = mx; }
  const Y = (a) => h - 8 - (a / crash.profMax) * (h - 18);
  const px = f * w;
  const pathTo = (a, b) => { x.beginPath(); x.moveTo(a, h - 6); for (let i = Math.floor(a); i <= Math.ceil(b) && i <= N; i++) x.lineTo(i, Y(crash.prof[i].altFt)); x.lineTo(b, h - 6); x.closePath(); };
  x.fillStyle = 'rgba(255,255,255,.08)'; pathTo(0, w); x.fill();
  for (let i = 0; i <= Math.min(px, N); i++) { const q = crash.prof[i], c = Q_COL[qOf(q)] || Q_COL.reported, y = Y(q.altFt); x.fillStyle = `rgba(${c.map((v) => Math.round(v * 255)).join(',')},.42)`; x.fillRect(i, y, 1, h - 6 - y); }
  x.fillStyle = 'rgba(255,255,255,.6)'; for (const e of S.beats) { const ex = e.s / S.storyLen * w; x.fillRect(ex, h - 6, 1, 4); }
  x.fillStyle = '#fff'; x.fillRect(px - 1, 2, 2, h - 6);
}
{
  const tl = $('#tl'); let dragging = false;
  const seek = (e) => { const b = tl.getBoundingClientRect(); seekStory(clamp((e.clientX - b.left) / b.width) * crash.sim.storyLen); };
  tl.addEventListener('pointerdown', (e) => { dragging = true; tl.setPointerCapture(e.pointerId); seek(e); });
  const tip = document.createElement('div'); tip.id = 'tltip'; tl.append(tip);
  tl.addEventListener('pointermove', (e) => {
    if (dragging) { seek(e); return; } if (!crash || e.pointerType !== 'mouse') return;
    const b = tl.getBoundingClientRect(), f = clamp((e.clientX - b.left) / b.width), S = crash.sim, B = S.beats[S.beatAt(f * S.storyLen)], d = new Date((S.t0 + S.realOf(f * S.storyLen)) * 1000);
    tip.textContent = `${B.t === 'end' ? 'Afterward' : d.toISOString().slice(11, 16) + ' UTC'} · ${B.text.split(/\s+/).slice(0, 9).join(' ')}…`; tip.style.left = `${clamp(e.clientX - b.left, 90, b.width - 90)}px`; tip.classList.add('on');
  });
  tl.addEventListener('pointerleave', () => tip.classList.remove('on'));
  tl.addEventListener('pointerup', () => { dragging = false; });
  tl.addEventListener('keydown', (e) => { if (!crash) return; const d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0; if (d) { const B = crash.sim.beats, i = crash.sim.beatAt(story); seekStory(B[clamp(i + d, 0, B.length - 1)].s); e.preventDefault(); } });
}
function seekStory(s) { story = s; xfReq = null; xfK = 0; camCut = 2; ended = false; epiDone = false; smoothRt = null; lastBeat = -1; $('#fade').classList.remove('show', 'soft'); $('#fade').innerHTML = ''; document.body.classList.remove('ended'); fadeOut = 0; crash.startAt = 0; }

function renderMore() {
  const r = crash.raw, S = crash.sim, m = $('#more');
  const stamp = (e) => { const d = new Date(e.t * 1000); return e.t_utc?.length > 11 && e.t > S.t0 - 86400 && e.t < S.t1 + 86400 ? d.toISOString().slice(11, 19) : e.t_utc?.slice(0, 10); };
  const P = r.perspectives || [];
  const all = [...S.before, ...S.events, ...S.after];
  m.innerHTML = `<div id="lead">${esc(r.one_line)}</div><div class="sub"><i class="st ${crash.meta.status}"></i>${esc(r.status_why || '')}</div>
  ${r.numbers?.length ? `<h2>Numbers</h2>${r.numbers.slice(0, 8).map((n) => `<div class="kv"><span>${esc(n.label)}</span><b>${esc(n.value)} ${cites(n.sources)}</b></div>`).join('')}` : ''}
  ${P.length ? `<h2>Explanations</h2>${P.map((p) => `<div class="view"><h4>${esc(p.label)}</h4><small>${esc(p.held_by)} · ${esc(p.standing)}</small><p>${esc(p.claim)}</p>${p.evidence_for?.length ? `<ul class="ul for">${p.evidence_for.map((e) => `<li>${esc(e.text)} ${cites(e.sources)}</li>`).join('')}</ul>` : ''}${p.evidence_against?.length ? `<ul class="ul against">${p.evidence_against.map((e) => `<li>${esc(e.text)} ${cites(e.sources)}</li>`).join('')}</ul>` : ''}</div>`).join('')}` : ''}
  <h2>Timeline</h2>${all.map((e) => `<button class="tline" ${e.rt != null ? `data-rt="${e.rt}"` : ''}><time>${esc(stamp(e) || '')}</time><b>${esc(e.title)}</b><p>${esc(e.detail || '')}${e.quote ? ` <em>“${esc(e.quote)}”</em>` : ''} <span class="q ${e.quality}">${QL[e.quality] || ''}</span> ${cites(e.sources)}</p></button>`).join('')}
  ${(r.environment || []).length ? `<h2>Conditions</h2>${r.environment.map((e) => `<div class="tline" style="display:block"><b>${esc(e.place || '')}</b> <span style="color:var(--mid)">${esc((e.t_utc || '').slice(0, 16).replace('T', ' '))}</span><p>${esc(e.notes || '')} ${cites(e.sources)}</p></div>`).join('')}` : ''}
  ${r.witnesses?.length ? `<h2>Witnesses</h2>${r.witnesses.map((w) => `<div class="tline" style="display:block"><b>${esc(w.who)}</b><p>${esc(w.said)} ${cites(w.sources)}</p></div>`).join('')}` : ''}
  ${r.why_it_matters ? `<h2>What changed</h2><p style="margin:0">${esc(r.why_it_matters)}</p>` : ''}
  ${r.conflicts?.length ? `<h2>Where sources disagree</h2>${r.conflicts.map((c) => `<div class="tline" style="display:block"><b>${esc(c.about)}</b><p>${esc(c.a)} / ${esc(c.b)} ${cites(c.sources)}</p></div>`).join('')}` : ''}
  ${r.unknowns?.length ? `<h2>Not known</h2><ul class="un">${r.unknowns.map((u) => `<li>${esc(u)}</li>`).join('')}</ul>` : ''}
  <h2>How this was built</h2><p style="margin:0;color:#d6dae0;font-size:13.5px"><span class="q recorded">Recorded</span> · <span class="q radar">Radar</span> · <span class="q reported">Reported</span> · <span class="q derived">Derived</span> · <span class="q modelled">Modelled</span>. Every event carries one of these. ${esc(crash.direct.buildNote || '')} Cloud shapes and waves are generated; heights, layers and visibility come from the sources where they exist. Aircraft are drawn to type dimensions.</p>
  <h2>Sources</h2>${(r.sources || []).map((s, i) => `<div class="src"><b>${i + 1}</b><div><a target="_blank" rel="noopener" href="${esc(s.url)}">${esc(s.title)}</a><span>${esc([s.publisher, s.year].filter(Boolean).join(', '))}</span></div></div>`).join('')}
  ${creditsHtml()}`;
  m.querySelectorAll('.tline[data-rt]').forEach((b) => { b.onclick = (e) => { if (e.target.closest('a')) return; seekStory(S.storyOf(+b.dataset.rt)); stage.scrollIntoView({ behavior: 'smooth', block: 'start' }); }; });
  postHeight();
}
function endCard() {
  const r = crash.raw, f = $('#fade'), died = r.people?.died;
  f.classList.add('soft'); document.body.classList.add('ended'); $('#eyes').classList.remove('open');
  f.innerHTML = `${crash.direct.endTitle ? `<b>${esc(crash.direct.endTitle)}</b>` : `<b>${died ?? ''}</b>`}<p>${esc(r.memorial_note || '')}</p><div><button id="again">Watch again</button><button id="home">Globe</button></div>`;
  f.classList.add('show');
  f.querySelector('#again').onclick = () => { seekStory(0); playing = true; setPP(); };
  f.querySelector('#home').onclick = () => { fadeOut = 0; goHome(); };
}

const xf = $('#xf'); let xfReq = null, xfK = 0;
const nightAt = (t) => { const q = crash.sim.sample(t), ss = subsolar((crash.sim.t0 + t) * 1000); return dirOf(q.lat, q.lon).dot(dirOf(ss.lat, ss.lon)) < -.1; };
function dissolve(dt) {
  if (xfReq && clk >= xfReq.at && crash) {
    const g = world.renderer.domElement; if (xf.width !== g.width || xf.height !== g.height) { xf.width = g.width; xf.height = g.height; }
    xf.getContext('2d').drawImage(g, 0, 0); xfK = 1;
    const r = xfReq.rig; setRig(r, .001); if (r === 'follow' && !manualView) snapCam(crash.sim.beats[crash.sim.beatAt(story)]); updateRailOn();
  } else if (crash?.snap) {
    crash.snap = false; const g = world.renderer.domElement; if (xf.width !== g.width || xf.height !== g.height) { xf.width = g.width; xf.height = g.height; }
    xf.getContext('2d').drawImage(g, 0, 0); xfK = 1;
  } else if (xfK > 0) xfK = Math.max(0, xfK - dt / .9);
  const o = xfK > 0 && crash ? smooth(xfK).toFixed(3) : '0'; if (xf.style.opacity !== o) xf.style.opacity = o;
}
function setRig(name, dur) {
  xfReq = null;
  if (dur < .01) camCut = 2;
  const l = cam.l.clone();
  if (cam.t < 1 && cam.from) { const d = v3.subVectors(cam.l, cam.p).normalize(), b = cam.p.dot(d), h = b * b - cam.p.lengthSq() + R * R, k = h > 0 ? -b - Math.sqrt(h) : -1; l.copy(cam.p).addScaledVector(d, k > 0 ? k : cam.p.length()); }
  cam.from = { p: cam.p.clone(), l, u: cam.u.clone(), fov: cam.fov, rig: cam.rig, A: crash?.pos?.clone(), mk: world?.U.uMapK.value ?? 0 };
  if (crash) crash.wit = null;
  cam.rig = name; cam.t = 0; cam.dur = dur; cam.hdgInit = false; cam.gap = null;
}
const tmpQ = new THREE.Vector3();
const overcast = (s) => world.env.layers.some((l) => (l.cover >= .85 || (l.cover >= .7 && (l.density ?? .55) >= .6) || l.cover * (l.density ?? .55) >= .55) && s.alt > l.base);
const cloudCap = (s, L) => (world.env.layers.some((l) => l.cover >= .75 && (l.density ?? .55) >= .45 && s.alt > l.base && s.alt < l.top) ? Math.max(L * 1.25, 48) : Infinity);
const sm = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const wv = new THREE.Vector3(), wt = [0, 1, 2].map(() => new THREE.Vector3()), NZ = [new Float32Array(4), new Float32Array(4)], cv = { q: new THREE.Vector3(), c: new THREE.Vector3(), e: new THREE.Vector3(), n: new THREE.Vector3(), p: new THREE.Vector3() };
function nz3(x, y, z, o) {
  const T = world.atmU.tNoise.value.image, n = T.width, D = T.data, m = (k) => ((k % n) + n) % n;
  x = x * n - .5; y = y * n - .5; z = z * n - .5;
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi; o.fill(0);
  for (let k = 0; k < 8; k++) {
    const a = k & 1, b = (k >> 1) & 1, c = k >> 2, w = (a ? fx : 1 - fx) * (b ? fy : 1 - fy) * (c ? fz : 1 - fz), i = (m(xi + a) + m(yi + b) * n + m(zi + c) * n * n) * 4;
    o[0] += D[i] * w; o[1] += D[i + 1] * w; o[2] += D[i + 2] * w; o[3] += D[i + 3] * w;
  }
  for (let c = 0; c < 4; c++) o[c] /= 255;
  return o;
}
const cloudC = (P) => (world.env.follow ? P : world.env.center);
function cloudAt(P, C) {
  const A = world.atmU, h = (P.length() - R) / 1000, q = cv.q.subVectors(P, C).multiplyScalar(.001), qd = q.length(), rad = A.uCloudRadius.value, region = 1 - sm(rad * .5, rad * .97, qd);
  if (region <= 0) return 0;
  const cu = cv.c.copy(C).normalize(), E = cv.e.set(0, 0, 1).cross(cu); if (E.lengthSq() < 1e-9) E.set(0, 1, 0); E.normalize();
  const N = cv.n.crossVectors(cu, E), qx = q.dot(E) + A.uNoiseOff.value.x, qy = q.dot(N) + A.uNoiseOff.value.y;
  let out = 0;
  for (let i = 0; i < Math.min(world.env.layers.length, 4); i++) {
    const a = A.uLayers.value[i], b = A.uLayerB.value[i], th = a.y - a.x;
    if (h < a.x - .2 || h >= a.y) continue;
    const fl = sm(.45, .95, b.x), wx = qx * b.y + b.z, wy = qy * b.y + b.z, wz = h * b.y;
    const lo = nz3(wx * .27 + .084 + i * .31, wy * .27 + .179 + i * .17, wz * .27 + .963 + i * .53, NZ[0]);
    const cov = (a.z + .3 * sm(5, 9, th) * (1 - sm(rad * .1, rad * .5, qd))) * region, u = sm(.28, .72, lo[2] * .62 + lo[3] * .46);
    const c = clamp(cov * (.72 + .4 * cov * cov) + .05 + (u - .5) * .5), tp = clamp(.3 + lo[3] * .75 + u * .25, .35, 1);
    if (c < .02) continue;
    const z = nz3(wx, wy, wz * lerp(clamp(.25 / (th * b.y), .12, .6), 1, fl), NZ[1]);
    const bs = (z[2] - .48) * Math.min(.4, th * .2) * (1 - fl), fr = (h - a.x - bs) / (th - bs);
    if (fr <= 0 || fr >= 1) continue;
    const gb = sm(0, lerp(.06, .22, fl), fr), cc = clamp(c * gb * lerp(1 - sm(tp * .3, tp, fr), sm(1, .7, fr), fl)), base = clamp((z[0] * .8 + z[1] * .3 - .07) / .6);
    const dn = Math.max(clamp((base - (1 - cc)) / Math.max(cc * .8, .15)), sm(.98, 1.2, a.z) * fl * gb * sm(1, .85, fr) * (.6 + .4 * base));
    out = Math.max(out, clamp((dn - .15) / .85) * Math.sqrt(a.w));
  }
  return out;
}
function cloudTau(Pa, Pb, C, n = 20) {
  const Ls = world.env.layers; if (!Ls.length || !world.atmU) return 0;
  let lo = 1e9, hi = -1e9; for (const l of Ls) { lo = Math.min(lo, l.base); hi = Math.max(hi, l.top); }
  const ha = Pa.length() - R, hb = Pb.length() - R; let t0 = 0, t1 = 1;
  if (Math.abs(hb - ha) > 1) { const ta = (lo - 250 - ha) / (hb - ha), tb = (hi - ha) / (hb - ha); t0 = clamp(Math.min(ta, tb)); t1 = clamp(Math.max(ta, tb)); } else if (ha < lo - 250 || ha > hi) return 0;
  if (t1 <= t0) return 0;
  const ds = Pa.distanceTo(Pb) * (t1 - t0) / 1000 / n; let tau = 0;
  for (let k = 0; k < n; k++) tau += cloudAt(cv.p.copy(Pa).lerp(Pb, t0 + (t1 - t0) * (k + .5) / n), C) * 22 * ds;
  return tau;
}
function terrainNeed(p, A, n = 48) {
  let need = 0;
  if (!crash.hAt) return 0;
  for (let k = 1; k < n; k++) { const m = v3.copy(p).lerp(A, k / n), ll = latLonOf(m), gh = groundAt(ll.lat, ll.lon) + 30; if (ll.alt < gh) need = Math.max(need, (gh - ll.alt) / (1 - k / n)); }
  return need;
}
function witness(s, A, dt) {
  const dw = crash.direct.witness;
  if (dw) { const p = ecef(dw[0], dw[1], (dw[2] ?? 6) + groundAt(dw[0], dw[1])); if (p.distanceTo(A) < 40000) return { p, up: dirOf(dw[0], dw[1]), fixed: 1 }; }
  const F = crash.flare;
  if (F) {
    const c = Math.min(rt - F.f.at, (story - F.f.s0) * F.f.k0);
    if (c > .2 && c < F.end && story < crash.sim.flightEndS) {
      if (!F.w) { const f = F.f, q = crash.sim.sample(f.at), b = destination(f.loc[0], f.loc[1], (q.hdg + 200) % 360, 1500), g = groundAt(b.lat, b.lon), up = dirOf(b.lat, b.lon); F.w = { p: ecef(b.lat, b.lon, g + 12), up, flare: 1, l: ecef(f.loc[0], f.loc[1], groundAt(f.loc[0], f.loc[1]) + (f.rise ?? 300) * .62) }; }
      if (crash.wit !== F.w) { if (crash.wit) fadeDip = 1; crash.wit = F.w; }
      return F.w;
    }
  }
  const W = crash.wit?.flare ? null : crash.wit, ff = Math.abs(crash.rtV || 0) > 4;
  if (W) {
    W.hold += dt;
    if (ff && W.lastA) { wv.subVectors(A, W.lastA); wv.addScaledVector(W.up, -wv.dot(W.up)); if (wv.lengthSq() < 4e10) { W.p.add(wv); const ll = latLonOf(W.p); dirOf(ll.lat, ll.lon, W.up); W.p.addScaledVector(W.up, groundAt(ll.lat, ll.lon) + 3 + W.lift - ll.alt); } }
    (W.lastA ??= new THREE.Vector3()).copy(A);
    const d = W.p.distanceTo(A), ang = v3.subVectors(A, W.p).normalize().angleTo(W.los), geo = d < W.d * 2.4 && d > W.d * .4 && ang < 62 * D2R;
    if ((W.k = (W.k + 1) % 3) === 0) W.blk = terrainNeed(W.p, A) > 0 || (!W.deck && cloudTau(W.p, A, cloudC(W.p), 14) > 2.2);
    W.bt = W.blk ? W.bt + dt * 3 : Math.min(W.bt, 0);
    if (W.hold < (ff ? 3 : 1.2) || (geo && W.bt < (ff ? 1.5 : .3))) return W;
  }
  const L = crash.size, g0 = groundAt(s.lat, s.lon), agl = Math.max(s.alt - g0, 0), sun = world.U.uSun.value, up0 = dirOf(s.lat, s.lon), sunEl = up0.dot(sun);
  const sf = crash.hAt && crash.sim.sample(Math.min(rt + 3 * Math.max(Math.abs(crash.rtV || 0), 1), crash.sim.dur)), Af = sf && ecef(sf.lat, sf.lon, sf.alt);
  const lead = clamp((s.gs ?? 150) * .5144 * Math.abs(crash.rtV || 0) * 1.4, 0, 6000), cen = lead > 20 ? destination(s.lat, s.lon, s.hdg, lead) : s, cands = [];
  for (const el of [50, 36, 64, 24]) for (const off of [80, -80, 110, -110, 50, -50, 140, -140, 20, -20, 165, -165]) {
    const D = Math.max(agl / Math.sin(el * D2R), L * 26), dh = Math.sqrt(Math.max(D * D - agl * agl, (L * 8) ** 2));
    const q = destination(cen.lat, cen.lon, (s.hdg + off + 360) % 360, dh), g = groundAt(q.lat, q.lon), p = ecef(q.lat, q.lon, g + 3), need = Math.max(terrainNeed(p, A), Af ? terrainNeed(p, Af) : 0);
    const up = dirOf(q.lat, q.lon); if (need) p.addScaledVector(up, need + 50);
    const los = wt[0].subVectors(A, p).normalize(), tau = cloudTau(p, A, cloudC(p)), sa = los.angleTo(sun) / D2R, hz = Math.acos(clamp(wt[1].copy(los).addScaledVector(up, -los.dot(up)).normalize().dot(wt[2].copy(sun).addScaledVector(up, -sun.dot(up)).normalize()), -1, 1)) / D2R;
    const lit = sunEl > .17 ? (sa < 42 ? (42 - sa) / 42 * 3 : 0) : sunEl > -.08 ? -.7 * clamp(1 - hz / 75) + Math.abs(el - 30) / 60 : 0;
    cands.push({ p, up, tau, lift: need ? need + 50 : 0, side: Math.sign(off), score: Math.min(tau, 6) * 2 + (need ? .6 + need / 400 : 0) + lit + Math.abs(el - 46) / 70 + Math.abs(Math.cos(off * D2R)) * .35 + (W && Math.sign(off) !== W.side ? .25 : 0) });
  }
  cands.sort((a, b) => a.score - b.score);
  for (const c of cands.slice(0, 8)) {
    const L0 = wt[0].subVectors(A, c.p).normalize(), sx = wt[1].crossVectors(L0, c.up).normalize(), sy = wt[2].crossVectors(sx, L0), C = cloudC(c.p);
    let mn = 1, mx = 0, sum = 0;
    for (const [a, b] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) { const T = Math.exp(-cloudTau(c.p, wv.copy(L0).addScaledVector(sx, a * .2).addScaledVector(sy, b * .2).normalize().multiplyScalar(25000).add(c.p), C, 16)); mn = Math.min(mn, T); mx = Math.max(mx, T); sum += T; }
    c.mean = sum / 5; c.score += (1 - (mx - mn)) * 1.2 + (c.mean < .15 ? .6 : 0);
  }
  const best = cands.slice(0, 8).reduce((a, b) => (b.score < a.score ? b : a));
  if (W && W.blk && best.tau > 2.2 && terrainNeed(best.p, A) === 0 && !W.deck) { W.bt = -1.5; return W; }
  if (W && clk - W.at > 1 && !(ff && W.beat === lastBeat)) fadeDip = 1;
  const los = v3.subVectors(A, best.p).normalize().clone(), d = best.p.distanceTo(A);
  return (crash.wit = { p: best.p, up: best.up, d, los, at: clk, hold: 0, k: 0, bt: 0, blk: false, side: best.side, deck: best.tau > 1.4, lift: best.lift, beat: lastBeat });
}
function diveGap(T) {
  const Ls = world.env.layers, ll = latLonOf(T); if (!Ls.length) return {};
  const top = Math.max(...Ls.map((l) => l.top)), lo = Math.min(...Ls.map((l) => l.base)), { east, north, up } = enu(ll.lat, ll.lon), above = ll.alt > top; if (above && !world.env.follow) return {};
  const col = (h, o) => (above ? cloudTau(wv.copy(T).addScaledVector(h, o).addScaledVector(up, top + 60 - ll.alt), wt[0].copy(T).addScaledVector(h, o).addScaledVector(up, lo - 60 - ll.alt), T, 14) : cloudTau(wv.copy(T).addScaledVector(h, o), wt[0].copy(T).addScaledVector(h, o).addScaledVector(up, top + 80 - ll.alt), T, 24));
  if (world.env.follow) {
    const O = world.atmU.uNoiseOff.value, o0 = O.clone(); let best = null;
    for (let r = 0; r <= 15 && !(best?.t < .05); r += 1.5) for (let k = 0; k < (r ? 8 : 1); k++) {
      O.set(o0.x + r * Math.cos(k * Math.PI / 4), o0.y + r * Math.sin(k * Math.PI / 4), o0.z);
      let t = col(east, 0); for (const o of [300, -300, 650, -650]) t += col(east, o) + col(north, o); if (!above) t += cloudTau(crash.pos, wt[1].subVectors(T, crash.pos).normalize().multiplyScalar(1500).add(crash.pos), T, 16); if (!best || t < best.t) best = { t, x: O.x, y: O.y };
    }
    O.set(best.x, best.y, o0.z); return {};
  }
  let best = null;
  for (const th of [0, 30, 50]) for (let k = 0; k < (th ? 8 : 1); k++) {
    const h = wt[1].copy(east).multiplyScalar(Math.cos(k * Math.PI / 4)).addScaledVector(north, Math.sin(k * Math.PI / 4)), d = wt[2].copy(up).multiplyScalar(Math.cos(th * D2R)).addScaledVector(h, Math.sin(th * D2R));
    const t = cloudTau(T, wv.copy(T).addScaledVector(d, (top + 80 - ll.alt) / Math.cos(th * D2R)), cloudC(T), 28) + th * .004;
    if (!best || t < best.t) best = { t, h: h.clone(), tan: Math.tan(th * D2R) };
  }
  return best;
}
function rigTarget(s, dt, out) {
  const rig = cam.rig; if (crash) crash.clearK = 1;
  if (rig === 'globe' || rig === 'route') {
    out.p.copy(ecef(G.lat, G.lon, G.alt)); out.u.set(0, 0, 1); out.fov = 34; out.l.set(0, 0, 0);
    return;
  }
  const A = ecef(s.lat, s.lon, s.alt, v1), { east, north, up } = enu(s.lat, s.lon);
  if (!cam.hdgInit) { cam.hdg = s.hdg; cam.hdgInit = true; }
  cam.hdg = (cam.hdg + shortAngle(cam.hdg, s.hdg) * (1 - Math.exp(-dt * .45)) + 360) % 360;
  const L = crash.ac.spec.length, W = Math.max(L, crash.ac.spec.span), T = performance.now() / 1000, hand = (crash.direct.handheld ?? 1), asp = world.cam.aspect || 1, pf = asp < .85 ? (.85 / asp) ** .8 : 1;
  const nz = (f, o) => Math.sin(T * f + o) * .6 + Math.sin(T * f * 2.3 + o * 1.7) * .4, wfit = (fov, m) => W * m / Math.tan(Math.atan(Math.tan(fov * D2R / 2) * asp));
  if (rig === 'follow') {
    const gk = crash.ghost || 0, h = (cam.hdg + cam.az + nz(.13, 1) * 1.6 * hand) * D2R, el = (cam.el + 14 * gk + nz(.17, 2) * .9 * hand) * D2R, cap = cloudCap(s, L) * (asp < .85 ? Math.min(pf, 1.5) : 1);
    const fit = wfit(38, .64), dist = Math.min(Math.max((L * 2.3 + 14) * cam.zoom * Math.sqrt(pf), asp < .85 ? fit * Math.min(cam.zoom, 1) : 0), Math.max(cap, fit)) * (1 + 1.3 * gk);
    crash.clearK = cap < Infinity && dist > cap ? clamp((cap / dist) ** 2, .1, 1) : 1;
    v2.copy(north).multiplyScalar(Math.cos(h) * Math.cos(el)).addScaledVector(east, Math.sin(h) * Math.cos(el)).addScaledVector(up, Math.sin(el)).multiplyScalar(dist);
    const drt = rt - (cam.lastRt ?? rt); cam.lastRt = rt;
    if (cam.altS == null || Math.abs(drt) > 20 || Math.abs(s.alt - cam.altS) > dist * 4) cam.altS = s.alt; else if (drt > 0) cam.altS += (s.alt - cam.altS) * (1 - Math.exp(-drt / 1.8));
    const lag = clamp(cam.altS - s.alt, -dist * .45, dist * .45);
    out.p.copy(A).add(v2).addScaledVector(up, lag); out.l.copy(A).addScaledVector(up, lag * .4); out.u.copy(up); out.fov = 38;
    if (crash.bb && crash.bodyF) {
      const S = safeRect(), k = S.H / 2 / Math.tan(19 * D2R), fw = fz.f.subVectors(out.l, out.p).normalize(), rx = fz.r.crossVectors(fw, out.u).normalize(), uy = fz.u.crossVectors(rx, fw), b = crash.bb, hy = (S.y1 - S.y0) / 2 - 10, hx = (S.x1 - S.x0) / 2 - 6;
      let m = 0; const cx = (b.max.x + b.min.x) / 2, lx = b.max.x - b.min.x;
      for (const [x, y, z] of [[b.max.x, 0, 0], [b.min.x, 0, 0], [b.min.x + lx * .08, b.max.y, 0], [cx, b.min.y, 0], [cx - lx * .1, 0, b.max.z], [cx - lx * .1, 0, b.min.z]]) {
        fz.p.copy(A).addScaledVector(crash.bodyF, x).addScaledVector(crash.bodyU, y).addScaledVector(crash.bodyR, z).sub(out.p);
        const d = Math.max(fz.p.dot(fw), 1); m = Math.max(m, Math.abs(fz.p.dot(uy)) / d * k / hy, Math.abs(fz.p.dot(rx)) / d * k / hx);
      }
      const want = manualView ? 1 : Math.max(1, m * 1.05); crash.fitK = camCut > 0 || crash.fitK == null ? want : crash.fitK + (want - crash.fitK) * (1 - Math.exp(-dt * (want > crash.fitK ? 3 : .8)));
      if (crash.fitK > 1.001) out.p.sub(A).multiplyScalar(crash.fitK).add(A);
    }
    const fk = crash.focusK || 0;
    if (fk > .002 && crash.bodyF) {
      const TL = crash.tail, F = crash.bodyF, U = crash.bodyU, Rr = crash.bodyR, e = smooth(fk), hs = crash.stab, d = Math.max(hs * 1.45, hs * .66 / Math.tan(Math.atan(Math.tan(22 * D2R) * asp)));
      const Tp = v3.copy(A).addScaledVector(F, TL.x).addScaledVector(U, TL.y).addScaledVector(Rr, TL.z), ce = Math.cos(14 * D2R);
      tq.b.copy(F).multiplyScalar(-ce * Math.cos(22 * D2R)).addScaledVector(Rr, ce * Math.sin(22 * D2R)).addScaledVector(U, Math.sin(14 * D2R));
      const L0 = tq.a.subVectors(out.p, Tp).length();
      slerpDir(tq.a.normalize(), tq.b, e, tmpQ).multiplyScalar(Math.exp(lerp(Math.log(L0), Math.log(d), e))).add(Tp);
      out.p.copy(tmpQ); out.l.lerp(Tp.addScaledVector(U, hs * .2).addScaledVector(F, hs * .1), e); out.u.lerp(U, e).normalize(); out.fov = lerp(38, 44, e);
    }
    const ck = smooth(crash.chuteK || 0), X = crash.chuteX;
    if (ck > .002 && X?.n) { const i0 = X.items[0]; out.p.lerp(tq.o.copy(X.P0).addScaledVector(i0.rg, 60).addScaledVector(i0.up, 16).addScaledVector(i0.fw, -120), ck); out.l.lerp(tq.b.copy(X.C).lerp(X.P0, .25), ck); out.fov = lerp(out.fov, asp < .85 ? 52 : 44, ck); }
    const ll = latLonOf(out.p), minA = groundAt(ll.lat, ll.lon) + 8; if (ll.alt < minA) out.p.addScaledVector(up, minA - ll.alt);
    out.u.addScaledVector(v3.crossVectors(up, v2).normalize(), nz(.09, 3) * .006 * hand).normalize();
    const bk = shakeAt(); if (bk) { const t = rt * 6.3; out.p.addScaledVector(up, (Math.sin(t * 1.7) * .6 + Math.sin(t * 3.1 + 1) * .4) * bk * dist * .012).addScaledVector(east, Math.sin(t * 1.3 + 2) * bk * dist * .008); }
  } else if (rig === 'above') {
    const dist = Math.min(Math.max((L * 3 + 20) * clamp(cam.zoom, .6, 80), asp < .85 ? wfit(42, .62) : 0), cloudCap(s, L)), lapUp = !manualView && crash.sim.beats[crash.sim.beatAt(story)]?.lapse, hv = lapUp ? v2.copy(north) : v2.copy(north).multiplyScalar(Math.cos(cam.hdg * D2R)).addScaledVector(east, Math.sin(cam.hdg * D2R));
    let dz = dist * .94, back = dist * .34;
    for (const ly of world.env.layers) if (ly.cover >= .45 && s.alt < ly.base && s.alt + dz > ly.base - 40) { const cap = Math.max(ly.base - 40 - s.alt, dist * .12); if (cap < dz) { const d2 = Math.min(dist, Math.max(cap / Math.sin(28 * D2R), L * 1.6)); dz = Math.min(cap, d2 * .94); back = Math.sqrt(Math.max(d2 * d2 - dz * dz, 0)); } }
    out.p.copy(A).addScaledVector(up, dz).addScaledVector(hv, -back); out.l.copy(A).addScaledVector(hv, dist * .06); out.u.copy(hv); out.fov = 42;
  } else if (rig === 'below') {
    const w = witness(s, A, dt), d = w.p.distanceTo(A), size = 2 * Math.atan(crash.size / 2 / d) / D2R;
    crash.nightB = !w.fixed && !w.flare && up.dot(world.U.uSun.value) < -.1 && !burning();
    const wide = w.flare ? (asp < .85 ? 54 : 42) : w.deck || crash.nightB ? (asp < .85 ? 56 : 44) : (asp < .85 ? 42 : 34);
    let fov = w.fixed ? 2 * Math.atan((crash.size * 5) / d) / D2R : w.flare ? wide : clamp(size / (.15 * Math.min(asp, 1)), 1.2, wide);
    out.p.copy(w.p); out.u.copy(w.up); out.l.copy(w.flare ? w.l : A); crash.deckK = 0;
    if (!w.fixed && !w.flare && (w.deck || crash.nightB || fov >= wide)) {
      fov = wide; crash.deckK = w.deck ? 1 : 0;
      const S = safeRect(), t = Math.tan(fov * D2R / 2), yc = S.H * (.5 - shiftK), hz = v2.subVectors(A, w.p), ae = Math.asin(clamp(hz.dot(w.up) / d)); hz.addScaledVector(w.up, -hz.dot(w.up)).normalize();
      const e = Math.max(ae - Math.atan((yc - lerp(S.y0, S.y1, .36)) / (S.H / 2) * t), Math.atan((S.H - yc) / (S.H / 2) * t) - 3 * D2R);
      out.l.copy(w.p).addScaledVector(hz, Math.cos(e) * 1000).addScaledVector(w.up, Math.sin(e) * 1000);
    }
    const j = out.l.distanceTo(out.p) * Math.tan(fov * D2R / 2) * (w.flare ? .006 : .014) * hand; out.l.addScaledVector(east, nz(.23, 6) * j).addScaledVector(north, nz(.19, 7) * j);
    out.fov = clamp(fov / Math.min(cam.zoom, 1), 1.2, 70);
  } else {
    const I = crash.interior; const b = crash.bodyF, bu = crash.bodyU, br = crash.bodyR;
    const eye = I?.eye ?? [L * .42, crash.ac.spec.dia * .2, -.5], look = I?.look ?? [eye[0] + 1, eye[1], eye[2]];
    out.p.copy(crash.posVis ?? A).addScaledVector(b, eye[0]).addScaledVector(bu, eye[1]).addScaledVector(br, eye[2]);
    tmpQ.set(0, 0, 0).addScaledVector(b, look[0] - eye[0]).addScaledVector(bu, look[1] - eye[1]).addScaledVector(br, look[2] - eye[2]).normalize();
    const lk = smooth(crash.lookK || 0), LB = crash.lookB || [0, 0, 62];
    const yaw = ((crash.lookYaw ?? 0) + LB[0] * lk) * D2R + nz(.21, 4) * .006 * hand, pitch = ((crash.lookPitch ?? 0) + LB[1] * lk) * D2R + nz(.27, 5) * .004 * hand;
    tmpQ.applyAxisAngle(bu, -yaw); const rgt = v3.crossVectors(tmpQ, bu).normalize(); tmpQ.applyAxisAngle(rgt, pitch);
    out.l.copy(out.p).addScaledVector(tmpQ, 300); out.u.copy(bu);
    const vf = (I?.fov ?? 62) * D2R, hf = 2 * Math.atan(Math.tan(vf / 2) * 1.35), asp = world.cam.aspect || 1;
    out.fov = lerp(clamp(2 * Math.atan(Math.tan(hf / 2) / asp) / D2R, I?.fov ?? 62, 100), LB[2] * Math.max(1, .9 / asp), lk);
  }
}
const fz = { f: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), p: new THREE.Vector3() };
const prevCam = new THREE.Vector3(), cur = { p: new THREE.Vector3(), l: new THREE.Vector3(), u: new THREE.Vector3(), fov: 34 };
const tq = { a: new THREE.Vector3(), b: new THREE.Vector3(), l: new THREE.Vector3(), f: new THREE.Vector3(), h: new THREE.Vector3(), r: new THREE.Vector3(), u: new THREE.Vector3(), m: new THREE.Matrix4(), o: new THREE.Vector3(), qa: new THREE.Quaternion(), qb: new THREE.Quaternion() };
function slerpDir(a, b, t, out) {
  const om = Math.acos(clamp(a.dot(b), -1, 1));
  if (om < 1e-6) return out.copy(b);
  if (om > Math.PI - 1e-3) { tq.r.set(0, 0, 1).cross(a); if (tq.r.lengthSq() < 1e-8) tq.r.set(0, 1, 0); return out.copy(a).applyAxisAngle(tq.r.normalize(), om * t); }
  const sn = Math.sin(om); return out.copy(a).multiplyScalar(Math.sin((1 - t) * om) / sn).addScaledVector(b, Math.sin(t * om) / sn).normalize();
}
function lookQ(p, l, u, hp, hl, out) {
  const f = tq.f.subVectors(l, p).normalize(), r = tq.r.copy(hp).normalize(), h = tq.h.subVectors(hl, hp);
  h.addScaledVector(r, -h.dot(r)); if (h.lengthSq() > 1e-9) h.normalize();
  const up = tq.u.copy(u).addScaledVector(f, -f.dot(u)).addScaledVector(h.addScaledVector(f, -f.dot(h)), .15);
  if (up.lengthSq() < 1e-12) up.set(0, 0, 1).addScaledVector(f, -f.z);
  tq.m.lookAt(tq.o.set(0, 0, 0), f, up.normalize()); return out.setFromRotationMatrix(tq.m);
}

const TRN = 40;
function trailMat(m) {
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('gl_FragColor = vec4( diffuseColor.rgb, alpha );', 'float fa = max( max( vColor.r, vColor.g ), vColor.b ); gl_FragColor = vec4( diffuseColor.rgb / max( fa, 1e-4 ), alpha * min( fa, 1.0 ) );'); };
  m.customProgramCacheKey = () => 'trail'; m.needsUpdate = true;
}
function updateTrail(s, dt) {
  const S = crash.sim, L = crash.ac.spec.length, A = crash.pos, tag = $('#ptag'), epi = story >= S.flightEndS - .3;
  const q1 = S.sample(Math.max(rt - 1, 0)), v = Math.max(ecef(q1.lat, q1.lon, q1.alt, v3).distanceTo(A), 15);
  const gsM = (s.gs ?? 200) * .5144, vsM = (s.vs ?? 0) * .00508, gam = Math.atan2(vsM, Math.max(gsM, 1)) / D2R, dev = Math.abs(gam - (s.pitch ?? gam)), far = cur.p.distanceTo(A);
  const burn = burning(2);
  const want = (cam.rig === 'follow' || cam.rig === 'above') && cam.t >= 1 && !epi && !ended && !burn && !(crash.ghost > .01) && fadeOut < .02 && (crash.focusK || 0) < .2 && (crash.chuteK || 0) < .05 && far > L * 1.1 && (dev > 7 || Math.abs(s.vs ?? 0) > 4500) ? 1 : 0;
  crash.trailK = (crash.trailK || 0) + (want - (crash.trailK || 0)) * (1 - Math.exp(-dt * 1.6));
  let l = crash.trail;
  const hideTag = (k) => { crash.tagO = k ? 0 : (crash.tagO || 0) * Math.exp(-dt * 8); tag.style.opacity = crash.tagO < .01 ? 0 : crash.tagO; };
  if (crash.trailK < .01 || fadeOut > .02 || ended || epi) { if (l) l.visible = false; if (crash.trailK < .01) crash.tagT = 0; hideTag(fadeOut > .02 || ended || epi); return; }
  if (!l) {
    l = crash.trail = world.makeLine({ points: Array.from({ length: TRN }, (_, i) => new THREE.Vector3(i, 0, 0)), colors: [], width: mobile ? 2 : 2.4, opacity: .78 }); l.geometry.attributes.instanceStart.data.setUsage(THREE.DynamicDrawUsage); l.geometry.attributes.instanceColorStart.data.setUsage(THREE.DynamicDrawUsage);
    world.movers = world.movers.filter((m) => m !== l); trailMat(l.material); l.renderOrder = 100; crash.trailBuf = { p: new Float32Array(TRN * 3), c: new Float32Array(TRN * 3) };
  }
  const t0 = 0, span = Math.min(L * 4.6 / v, 14), { p, c } = crash.trailBuf, SR = safeRect();
  const qa = fieldQ('alt', rt, 1), qs = fieldQ('ias', rt) ?? fieldQ('gs', rt, 1), q0 = qa === 'modelled' || qs == null || qs === 'none' || qs === 'modelled' || s.posQ === 'modelled' ? 'modelled' : 'derived', col = Q_COL[q0];
  let cut = false, mid = null; const d0 = tmpQ.set(0, 0, 0), P = v2, Pp = wv.set(0, 0, 0), TL = crash.tail, Tw = wt[2].set(0, 0, 0);
  if (crash.bodyF) Tw.addScaledVector(crash.bodyF, TL.x).addScaledVector(crash.bodyU, TL.y).addScaledVector(crash.bodyR, TL.z);
  for (let i = 0; i < TRN; i++) {
    const q = S.sample(Math.max(rt - t0 - span * i / (TRN - 1), 0)); ecef(q.lat, q.lon, q.alt, P).sub(A).addScaledVector(Tw, 1 - i / (TRN - 1));
    if (i) { const dd = v3.subVectors(Pp, P); if (dd.lengthSq() > 1e-4) { dd.normalize(); if (d0.lengthSq() < .5) d0.copy(dd); else if (dd.dot(d0) < .4) cut = true; } }
    Pp.copy(P);
    const u = i / (TRN - 1), pr = world.project(v3.copy(P).add(A)), scr = pr.behind ? 0 : sm(SR.y0, SR.y0 + 46, pr.y) * (1 - sm(SR.y1 - 34, SR.y1, pr.y)) * (pr.y < 170 ? 1 - sm(SR.x1 - 14, SR.x1 + 6, pr.x) : 1);
    const f = cut ? 0 : smooth((P.length() - L) / L) * (1 - u) ** 1.3 * crash.trailK * scr * (i % 2 ? q0 === 'modelled' ? .12 : u > .45 ? .4 : 1 : 1);
    if (i === 24 && f > .12) mid = pr;
    p[i * 3] = P.x; p[i * 3 + 1] = P.y; p[i * 3 + 2] = P.z; c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = f;
  }
  const g = l.geometry, P2 = g.attributes.instanceStart.data, C2 = g.attributes.instanceColorStart.data;
  for (let i = 0; i < TRN - 1; i++) for (let k = 0; k < 6; k++) { P2.array[i * 6 + k] = p[i * 3 + k]; C2.array[i * 6 + k] = c[i * 3 + k % 3]; }
  P2.needsUpdate = true; C2.needsUpdate = true; l.visible = true; l.position.subVectors(A, world.camEcef);
  l.material.color.setRGB(...lineCol(q0)).multiplyScalar((q0 === 'modelled' ? .7 : .9) / (crash.expo || 1));
  crash.tagT = (crash.tagT ?? 0) + (crash.trailK > .6 ? dt : 0);
  const pa = world.project(A), ra = L * .62 / Math.max(far, 1) * SR.H / 2 / Math.tan(cur.fov * D2R / 2), tw = 22 * 6, lft = mid && pa.x > mid.x;
  const tx = mid ? (lft ? mid.x - tw - 10 : mid.x + 10) : 0, on = !!mid && crash.tagT < 7 && tx > SR.x0 && tx + tw < SR.x1 && mid.y > SR.y0 + 10 && mid.y < SR.y1 - 20 && !(tx < pa.x + ra + 8 && tx + tw > pa.x - ra - 8 && Math.abs(mid.y - pa.y) < ra * .55 + 16);
  crash.tagO = (crash.tagO || 0) + ((on ? clamp(Math.min(crash.trailK, (7 - crash.tagT) / 1.5)) : 0) - (crash.tagO || 0)) * (1 - Math.exp(-dt * 6));
  tag.style.opacity = crash.tagO < .01 ? 0 : crash.tagO;
  if (on) { tag.className = `q ${q0}`; tag.innerHTML = `Flight path · ${QL[q0]}`; tag.style.transform = `translate(${lft ? mid.x - tw - 20 : mid.x}px,${mid.y}px)`; }
}
function poseAircraft(s0, dt) {
  const T = turbAt(rt, shakeAt()), s = T ? { ...s0, pitch: s0.pitch + T.p, roll: s0.roll + T.r, hdg: s0.hdg + T.y } : s0;
  const ac = crash.ac, A = ecef(s.lat, s.lon, s.alt);
  const up = dirOf(s.lat, s.lon), f = headingVector(s.lat, s.lon, s.hdg, s.pitch), r = new THREE.Vector3().crossVectors(f, up).normalize(), u = new THREE.Vector3().crossVectors(r, f).normalize();
  const ph = s.roll * D2R, r2 = r.clone().multiplyScalar(Math.cos(ph)).addScaledVector(u, -Math.sin(ph)), u2 = u.clone().multiplyScalar(Math.cos(ph)).addScaledVector(r, Math.sin(ph));
  crash.bodyF = f; crash.bodyU = u2; crash.bodyR = r2;
  const m = new THREE.Matrix4().makeBasis(f, u2, r2);
  ac.group.quaternion.setFromRotationMatrix(m);
  const PV = T ? A.clone().addScaledVector(up, T.h) : A;
  world.place(ac.group, PV);
  crash.pos = A; crash.posVis = PV;
  for (const w of crash.wing || []) { w.a.group.quaternion.copy(ac.group.quaternion); w.a.group.position.copy(ac.group.position).addScaledVector(f, w.o[0]).addScaledVector(u2, w.o[1]).addScaledVector(r2, w.o[2]); w.a.tick(playing ? dt * speed : 0, { up: dirOf(s.lat, s.lon), gear: 0 }); }
  syncInterior(s);
  const a = cur.p.length() - R;
  const low = a < 500e3;
  const fu = crash.direct.formationUntil; ac.group.visible = low; for (const w of crash.wing || []) w.a.group.visible = low && cam.rig !== 'cockpit' && !(fu && rt > atT(fu));
  const far = !low || (cam.rig === 'above' && cur.p.distanceTo(A) > crash.ac.spec.length * 45) || (cam.t < 1 && (a > 30e3 || cam.from?.rig === 'route') && cur.p.distanceTo(A) > crash.ac.spec.length * 90) || (cam.rig === 'below' && (crash.deckK > 0 || crash.nightB));
  mark.style.display = far ? 'block' : 'none';
  crash.markP = null;
  if (far) { const pr = world.project(A); const occ = world.occluded(A); mark.style.display = occ || pr.behind ? 'none' : 'block'; const ang = screenHeading(s, A); mark.style.transform = `translate(${pr.x}px,${pr.y}px) rotate(${ang}deg)`; if (!occ && !pr.behind) crash.markP = { x: pr.x, y: pr.y }; }
  const sunEl = up.dot(world.U.uSun.value);
  const nt = 1 - smooth((sunEl + .03) / .12), off = powerOff(), dark = off || cabinDark();
  ac.setNight(dark ? nt + 1e-4 : nt);
  if (dark) { crash.cabMats ??= cabinMats(ac); for (const m of crash.cabMats) m.emissiveIntensity = 0; }
  ac.setLights(rt < crash.sim.dur - .01 && (crash.direct.navLights !== false) && !isInside(cam.rig) && !off && (crash.ghost || 0) < .2);
  const dtr = Math.max(dt * Math.max(speed, .5), .001), rollRate = clamp((s.roll - (crash.lastRoll ?? s.roll)) / dtr, -30, 30), yawRate = clamp(shortAngle(crash.lastHdg ?? s.hdg, s.hdg) / dtr, -12, 12); crash.lastRoll = s.roll; crash.lastHdg = s.hdg;
  crash.ctl = crash.ctl || { a: 0, r: 0, g: 0 }; const K = 1 - Math.exp(-dt * 3); crash.ctl.a += (rollRate * .9 - crash.ctl.a) * K; crash.ctl.r += (yawRate * 1.6 - crash.ctl.r) * K;
  const gearTarget = crash.fx?.some((f) => f.type === 'gearDown' && rt >= f.at && (f.until == null || rt < f.until)) ? 1 : 0; crash.ctl.g += (gearTarget - crash.ctl.g) * (1 - Math.exp(-dt * .6));
  const opts = { aileron: clamp(crash.ctl.a, -20, 20), rudder: clamp(crash.ctl.r, -18, 18), gear: crash.ctl.g, flaps: 0, spoilers: 0 };
  if (s.elevL != null) { opts.elevL = s.elevL * (crash.direct.elevScale ?? 2.2); opts.elevR = (s.elevR ?? s.elevL) * (crash.direct.elevScale ?? 2.2); }
  opts.up = up;
  const eo = crash.engOut !== undefined ? crash.engOut : (crash.engOut = (() => { const f = crash.fx?.find((x) => x.type === 'engineOut'), E = ENGINE_OUT[crash.id]; return f ? { at: f.at, rpm: f.rpm ?? .25 } : E ? { at: atT(E[0]), rpm: E[1] } : null; })());
  const rpmT = !eo || rt < eo.at ? 1 : s.alt - groundAt(s.lat, s.lon) < 6 ? 0 : eo.rpm;
  crash.ctl.rpm = crash.ctl.rpm == null || Math.abs(rt - (crash.rpmRt ?? rt)) > 60 ? rpmT : crash.ctl.rpm + (rpmT - crash.ctl.rpm) * (1 - Math.exp(-dt * Math.max(speed, 1) * .7)); crash.rpmRt = rt; opts.rpm = crash.ctl.rpm;
  ac.tick(playing ? dt * speed : 0, opts);
  for (const f2 of crash.fx || []) {
    if (f2.type === 'hide') { const p = ac.parts[f2.part]; if (p) p.visible = rt < f2.at; }
    if (f2.type === 'detach') applyDetach(f2, ac);
    if (f2.type === 'flash' && rt >= f2.at && rt < f2.at + (f2.dur ?? 1.2) && flashAt !== f2.at) { flash = f2.power ?? 4; flashAt = f2.at; }
  }
  if (crash.direct.lightning && rt > crash.direct.lightning[0] && rt < crash.direct.lightning[1] && playing && Math.random() < dt * (crash.direct.lightningRate ?? .5)) { flash = Math.max(flash, .6 + Math.random() * 1.5); const b = (s.hdg + Math.random() * 360) % 360, d = 6000 + Math.random() * 38000, q = destination(s.lat, s.lon, b, d); crash.flashPos = ecef(q.lat, q.lon, 7000 + Math.random() * 7000); }
}
const burning = (m = 0) => crash.fx?.some((f) => f.type === 'fire' && rt > f.at - m && rt < (f.to ?? crash.sim.dur) + (f.life ?? 3) + m);
function ghostAc(k) {
  k = Math.round(k * 50) / 50; if (crash.ghost === k || (!k && !crash.ghost)) return; crash.ghost = k;
  for (const g of [crash.ac.group, ...(crash.wing || []).map((w) => w.a.group)]) for (const c of g.children) if (!c.userData.interior) c.traverse((o) => { const m = o.material; if (!o.isMesh || !m) return; for (const x of Array.isArray(m) ? m : [m]) { const u = x.userData; u.op0 ??= x.opacity; u.tr0 ??= x.transparent; u.dw0 ??= x.depthWrite; x.opacity = u.op0 * (1 - k); x.transparent = k > 0 || (u.op0 < 1 ? u.tr0 : !!crash.nearMode); x.depthWrite = k < .4 && u.dw0; } });
}
const atT = (x) => (typeof x === 'number' ? x : Date.parse(x) / 1000 - crash.sim.t0);
const powerOff = () => crash.direct.lightsUntil != null && rt > atT(crash.direct.lightsUntil);
const cabinDark = () => crash.direct.cabinDarkFrom != null && rt > atT(crash.direct.cabinDarkFrom);
const cabinMats = (ac) => { const M = new Set(); ac.group.traverse((o) => { const m = o.material; if (o.isMesh && m?.emissive && !m.userData?.lens && m.emissive.getHex() === 0xffffff && m.emissiveMap) M.add(m); }); return [...M]; };
const ENGINE_OUT = { ladybegood: ['1943-04-04T23:55:00Z', .25] };
const SHAKE = { af447: [['2009-06-01T02:00:00Z', '2009-06-01T02:10:05Z', .2]], jal123: [['1985-08-12T09:26:00Z', '1985-08-12T09:56:30Z', .5]] };
function cutDips() {
  const S = crash.sim, B = S.beats, d = S.cuts.map((c) => ({ s: c.s, skip: c.skip, dip: c.skip >= 600 }));
  for (let i = 1; i < B.length && B[i].t !== 'end'; i++) {
    const a = resolveView(B[i - 1].v || 'follow'), b = resolveView(B[i].v || 'follow');
    if (a === b || ![a, b].some((v) => isInside(v) || v === 'below')) continue;
    const c = d.find((x) => x.s === B[i].s); if (c) c.view = c.dip = true; else d.push({ s: B[i].s, view: true, dip: true });
  }
  return d;
}
const skipEl = document.getElementById('skip');
function cutFade(dt) {
  crash.dips ??= cutDips(); let k = 0;
  for (const c of crash.dips) {
    if (!c.dip || (manualView && !c.skip)) continue;
    const w = 1 - smooth((Math.abs(story - c.s) - .05) / .4); if (w > k) k = w;
  }
  crash.cutK = playing ? k : 0;
  if (playing) for (const c of crash.dips) if (!c.dip && c.s > story && c.s <= story + dt * speed * 1.6) crash.snap = true;
  const cur = crash.dips.find((c) => c.dip && c.skip >= 600 && story >= c.s - .3 && story < c.s + 2.2);
  if (cur) { const t = fmtSkip(cur.skip); if (skipEl.textContent !== t) skipEl.textContent = t; }
  const o = cur && playing ? Math.min(smooth((story - cur.s + .3) / .3), 1 - smooth((story - cur.s - 1.4) / .8)) : 0;
  if (skipEl.style.opacity !== o.toFixed(2)) skipEl.style.opacity = o.toFixed(2);
}
const fmtSkip = (x) => { const h = Math.floor(x / 3600), m = Math.round((x % 3600) / 60); return `${h ? `${h} h ` : ''}${h && !m ? '' : `${m || 1} min `}later`; };
const TURB = [[.19, 1.3, .7, 1], [.43, .4, .55, 2.1], [.83, 2.2, .3, 4.3], [1.37, 5.1, .18, .6]];
function turbAt(t, k) {
  if (!k) return null; const n = (j) => { let v = 0; for (const [f, p, a, q] of TURB) v += a * Math.sin(Math.PI * 2 * f * t * (1 + j * .137) + p * (j + 1) + q * j); return v / 1.73; };
  return { p: k * 1.3 * n(0), r: k * 2.8 * n(1), y: k * .7 * n(2), h: k * 4 * n(3) };
}
function shakeAt() { let k = 0; for (const [a, b, v] of crash.direct.shake ?? SHAKE[crash.id] ?? []) { const x = atT(a), y = atT(b); if (rt > x && rt < y) k = Math.max(k, v * smooth((rt - x) / 4) * smooth((y - rt) / 4)); } return k; }
function syncInterior(s) {
  const ac = crash.ac, inside = isInside(cam.rig);
  for (const [k, I] of Object.entries(crash.interiors)) if (I?.group) I.group.visible = inside && k === cam.rig;
  for (const n of ['nose', 'mid', 'aft', 'fin']) if (ac.parts[n]) ac.parts[n].visible = !inside;
  world.cam.near = inside ? (crash.interiors[cam.rig]?.near ?? .04) : .5;
  if (!inside) { crash.interior = null; return; }
  if (!(cam.rig in crash.interiors)) {
    let I = null; try { I = buildInterior(crash.direct.aircraft, cam.rig); } catch (e) { console.error(e); }
    crash.interiors[cam.rig] = I;
    if (I?.group) { I.group.userData.interior = true; I.group.traverse((m) => { if (!m.isMesh) return; m.userData.int = true; if (m.material.opacity >= .99 && m.material.depthWrite !== false && m.material.colorWrite !== false) m.layers.enable(1); }); ac.group.add(I.group); crash.nearMode = null; }
  }
  const I = crash.interior = crash.interiors[cam.rig];
  const qAlt = fieldQ('alt', rt, 1);
  I?.update?.({ unknown: (qAlt == null || qAlt === 'none') && s.posQ === 'modelled', altFt: s.known?.alt === false && crash.direct.instrAltNull ? null : s.altFt, ias: s.ias, gs: s.gs, vs: s.vs, pitch: s.pitch, roll: s.roll, hdg: s.hdg, aoa: s.aoa, elevL: s.elevL, timeMs: world.time, night: 1 - smooth((dirOf(s.lat, s.lon).dot(world.U.uSun.value) + .03) / .12), masks, lights: !cabinDark() && !powerOff(), shake: shakeAt(), warnings: crash.warn || [] });
}
function setPlaneMode(near) {
  if (crash.nearMode === near) return; crash.nearMode = near;
  const groups = [crash.ac.group, ...crash.detached, ...(crash.wing || []).map((w) => w.a.group), ...Object.values(crash.ac.parts).filter((p) => p?.isGroup)];
  for (const g of groups) g.traverse((o) => {
    if (!o.isMesh || o.material.opacity < 1 || o.userData.int) return;
    o.material.transparent = near; o.renderOrder = near ? 105 : 0;
    if (near) o.layers.disable(1); else o.layers.enable(1);
  });
}
function screenHeading(s, A) {
  const q = destination(s.lat, s.lon, s.hdg, 60000), B = ecef(q.lat, q.lon, s.alt), a = world.project(A), b = world.project(B);
  return Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI + 90;
}
const m4 = new THREE.Matrix4(), m5 = new THREE.Matrix4();
function applyDetach(f, ac) {
  const part = ac.parts[f.part]; if (!part) return;
  if (rt < f.at) { if (part.parent !== ac.group) { ac.group.add(part); part.matrixAutoUpdate = true; part.position.set(0, 0, 0); part.quaternion.identity(); } return; }
  if (part.parent !== world.scene) { world.scene.add(part); if (!crash.detached.includes(part)) crash.detached.push(part); part.matrixAutoUpdate = false; }
  const s0 = crash.sim.sample(f.at), A0 = ecef(s0.lat, s0.lon, s0.alt), up = dirOf(s0.lat, s0.lon), fw = headingVector(s0.lat, s0.lon, s0.hdg, s0.pitch), r = new THREE.Vector3().crossVectors(fw, up).normalize(), u = new THREE.Vector3().crossVectors(r, fw).normalize();
  const tau = rt - f.at, v = f.vel || [0, 0, 0], sp = s0.gs * .5144, k = f.drag ?? .08, decay = (1 - Math.exp(-k * tau)) / k, term = f.terminal ?? 70;
  const fall = term * (tau - (1 - Math.exp(-tau * 9.8 / term)) * term / 9.8);
  const P = A0.clone().addScaledVector(fw, (sp + v[0]) * decay).addScaledVector(u, v[1] * decay).addScaledVector(r, v[2] * decay).addScaledVector(up, -fall);
  const ll = latLonOf(P); const g = groundAt(ll.lat, ll.lon); if (ll.alt < g) P.addScaledVector(up, g - ll.alt);
  const piv = new THREE.Vector3(...(f.pivot || [0, 0, 0])), spin = f.spin || [0, 0, 0];
  m4.makeBasis(fw, u, r).setPosition(P.clone().sub(world.camEcef));
  const qs = new THREE.Quaternion().setFromEuler(new THREE.Euler(spin[0] * tau, spin[1] * tau, spin[2] * tau));
  m5.compose(piv, qs, new THREE.Vector3(1, 1, 1)); m4.multiply(m5); m5.makeTranslation(-piv.x, -piv.y, -piv.z); m4.multiply(m5);
  part.matrix.copy(m4); part.matrixWorldNeedsUpdate = true;
}

let lastT = 0, slow = 0, fast = 0, trackPtsDrawn = -1, shiftK = 0, camCut = 2, clk = 0;
let frames = 0;
function frame(now) {
  requestAnimationFrame(frame); frames++;
  if (document.hidden || !visible) { lastT = now; return; }
  const dt = Math.min((now - lastT) / 1000 || .016, .1); lastT = now;
  if (!window.__stepped) tick(dt, now);
  adapt(dt);
}
function tick(dt, now) {
  srC = null;
  let s = null; clk += dt;
  if (mode === 'crash' && crash) {
    if (playing && now > (crash.startAt || 0)) {
      story += dt * speed;
      if (story >= crash.sim.storyLen) { story = crash.sim.storyLen; if (!ended) { ended = 2; playing = false; setPP(); endCard(); } }
    }
    const pr = rt; rt = crash.sim.realOf(story); smoothRt = rt;
    if (Math.abs(rt - pr) > 5 + dt * 4) camCut = 2; else crash.rtV = lerp(crash.rtV ?? 0, (rt - pr) / Math.max(dt, 1e-3), 1 - Math.exp(-dt * 3));
    cutFade(dt);
    s = crash.sim.sample(rt);
    runStory(dt);
    { const Z = crash.sim.beats[crash.lastI]; ghostAc(crash.direct.endTitle && Z && !isInside(cam.rig) ? smooth((story - Z.s - Z.len * .42) / (Z.len * .38)) : 0); }
    world.setTime((crash.sim.t0 + rt) * 1000);
  } else {
    world.setTime(Date.now());
    if (G.spin && !drag) G.lon = ((G.lon + dt * 1.7) + 540) % 360 - 180;
  }
  if (!drag) { G.lat = clamp(G.lat + G.vLat * dt, -86, 86); G.lon = ((G.lon + G.vLon * dt) + 540) % 360 - 180; const d = Math.exp(-dt * 2.6); G.vLat *= d; G.vLon *= d; }
  if (s) {
    crash.s = s;
    if (!viewOk(cam.rig)) { pickView('follow'); if (!manualView) snapCam(crash.sim.beats[crash.sim.beatAt(story)]); }
    const q = crash.kn.elev.length && s.elevL != null && Math.abs(s.elevL - s.elevR) > 1.2 ? fieldQ('elev', rt) : null, on = q && q !== 'none' && !manualView && cam.rig === 'follow' ? 1 : 0;
    crash.focusK = (crash.focusK || 0) + clamp(on - (crash.focusK || 0), -dt / 1.4, dt / 1.4);
    poseAircraft(s, dt);
  }
  const tgt = { p: new THREE.Vector3(), l: new THREE.Vector3(), u: new THREE.Vector3(), fov: 34 };
  rigTarget(s, dt, tgt);
  cam.t = Math.min(cam.t + dt / cam.dur, 1);
  if (cam.t < 1 && cam.from) {
    const F = cam.from, x = cam.t, io = (v) => (v < .5 ? 4 * v * v * v : 1 - (-2 * v + 2) ** 3 / 2);
    const a0 = F.p.length() - R, a1 = tgt.p.length() - R, hi = Math.max(a0, a1) > 5e4, orbit = !hi && s && F.A && F.p.distanceTo(F.A) < 4000 && tgt.p.distanceTo(crash.pos) < 4000;
    let ed = io(x), ea = ed, lb = smooth((ed - .06) / .5);
    if (hi && a0 > a1) { ed = smooth(x / .5); ea = io(clamp((x - .12) / .88)); lb = smooth(x / .45); } else if (hi) { ea = 1 - (1 - clamp(x / .85)) ** 3; ed = smooth((x - .2) / .7); lb = smooth((x - .06) / .55); }
    const lA = orbit ? tq.l.copy(F.l).sub(F.A).add(crash.pos) : tq.l.copy(F.l);
    if (orbit) {
      const L0 = tq.a.subVectors(F.p, F.A).length(), L1 = tq.b.subVectors(tgt.p, crash.pos).length();
      slerpDir(tq.a.normalize(), tq.b.normalize(), ed, cur.p).multiplyScalar(Math.exp(lerp(Math.log(L0), Math.log(L1), ea))).add(crash.pos);
    } else {
      const om = tq.a.copy(F.p).normalize().angleTo(tq.b.copy(tgt.p).normalize()), hump = hi ? 0 : Math.sin(ed * Math.PI) * clamp(om * 3.5, 0, 2.2);
      slerpDir(tq.a, tq.b, ed, cur.p).multiplyScalar(R + Math.exp(lerp(Math.log(Math.max(a0, 2)), Math.log(Math.max(a1, 2)), ea) + hump));
      if (hi && a0 > a1 && s) {
        cam.gap ??= diveGap(tgt.p); if (cam.gap.tan) { const ac = cur.p.length() - R; cur.p.addScaledVector(cam.gap.h, Math.max(ac - a1, 0) * cam.gap.tan * (1 - smooth((ac - 20e3) / 40e3))); }
        const rel = wv.subVectors(cur.p, crash.pos), dist = rel.length(), d1 = tgt.p.distanceTo(crash.pos), u = smooth(Math.log(Math.max(dist / d1, 1)) / Math.log(16));
        if (u < 1) { slerpDir(wt[0].subVectors(tgt.p, crash.pos).normalize(), rel.normalize(), u, wt[1]); cur.p.copy(crash.pos).addScaledVector(wt[1], dist); }
      }
    }
    lookQ(cur.p, lA, F.u, F.p, F.l, tq.qa); lookQ(cur.p, tgt.l, tgt.u, tgt.p, tgt.l, tq.qb); tq.qa.slerp(tq.qb, lb);
    cur.l.set(0, 0, -1).applyQuaternion(tq.qa).multiplyScalar(1000).add(cur.p); cur.u.set(0, 1, 0).applyQuaternion(tq.qa); cur.fov = lerp(F.fov, tgt.fov, lb);
  } else { cur.p.copy(tgt.p); cur.l.copy(tgt.l); cur.u.copy(tgt.u); cur.fov = tgt.fov; }
  cam.p.copy(cur.p); cam.l.copy(cur.l); cam.u.copy(cur.u); cam.fov = cur.fov;
  world.camEcef.copy(cur.p);
  if (s) { setPlaneMode(cur.p.distanceTo(crash.pos) < 2500); poseAircraft(s, 0); }
  if (s) updateTrail(s, dt);
  if (crash) showFtag(dt);
  const camAlt = cur.p.length() - R;
  const tLim = cam.t < 1 && cam.from && (cam.rig === 'route' || cam.from.rig === 'route') ? 40e3 : Math.max(380e3, crash?.epiAlt ?? 0);
  for (const p of crash?.terrain ?? []) { p.position.subVectors(p.userData.anchor, world.camEcef); p.visible = camAlt < tLim; }
  world.syncMovers();
  for (const p of crash?.parts ?? []) { const u = p.material.uniforms; if (u.uT) { u.uT.value = rt; u.uScale.value = world.H / (2 * Math.tan(cur.fov * D2R / 2)); } }
  if (s) { updateFx(); const X = crash.chuteX; crash.chuteK = clamp((crash.chuteK || 0) + clamp((X?.active && !manualView && cam.rig === 'follow' ? 1 : 0) - (crash.chuteK || 0), -dt / .5, dt / 1.8)); }
  if (crash) {
    const k0 = story - crash.sim.flightEndS; fadeOut = k0 < -1.2 ? 0 : k0 < -.2 ? smooth(k0 + 1.2) : k0 < 1.2 ? 1 : 1 - smooth((k0 - 1.2) / 1.8);
    crash.cut = crash.hitS != null && story >= crash.hitS - .02 && k0 < 1.2 && (crash.cut || isInside(cam.rig) || cur.p.distanceTo(crash.pos) < 3000);
    if (crash.cut) fadeOut = Math.max(fadeOut, clamp((story - crash.hitS + .02) / .07));
  } else fadeOut = Math.max(0, fadeOut - dt * 2);
  flash *= Math.exp(-dt * 6.5);
  fadeDip = Math.max(0, fadeDip - dt / .55);
  const fadeNow = Math.max(fadeOut, fadeDip > .5 ? 1 : fadeDip * 2, crash?.cutK ?? 0);
  if (crash?.past) {
    const bi = crash.sim.beatAt(story), lap = !manualView && crash.sim.beats[bi]?.lapse && cam.t >= 1, tr = cam.t < 1, lo = tr ? 150e3 : 35e3, hi = tr ? 450e3 : 100e3, want = lap ? 1 : smooth((camAlt - lo) / (hi - lo));
    crash.lineK = crash.lineK == null || fadeNow > .98 ? want : crash.lineK + (want - crash.lineK) * (1 - Math.exp(-dt * (want < crash.lineK ? 16 : 7)));
    const k = crash.lineK ** 2, epi = story >= crash.sim.flightEndS - .05;
    for (const l of crash.lines) { l.visible = k > .01 && (!l.userData.only || l.userData.only.includes(bi)); l.material.opacity = (l.userData.op ?? 1) * k; }
    crash.past.material.opacity *= epi ? .62 : 1; crash.past.material.color.setScalar(1 / (crash.expo || 1)); crash.fut.material.color.setScalar(1 / (crash.expo || 1));
    for (const [id, l] of Object.entries(crash.viewLines)) l.visible = k > .01 && id === crash.view;
    const idx = Math.round(rt / crash.sim.dur * 900); if (idx !== trackPtsDrawn) { crash.past.geometry.instanceCount = Math.max(idx, 0); trackPtsDrawn = idx; }
  }
  const alt = cur.p.length() - R, nad = v1.copy(cur.p).normalize(), elev = nad.dot(world.U.uSun.value);
  const nightK = (1 - smooth((elev + .1) / .1)) * smooth(1 - (alt - 2e5) / 2.4e6);
  const expo = lerp(1, lerp(crash?.direct?.nightExposure ?? 3.6, 1.5, smooth((alt - 60e3) / 500e3)), nightK) * (crash?.brightK ?? 1); if (crash) crash.expo = expo;
  const shadowSize = crash ? crash.ac.spec.span * .9 : 50, inside = isInside(cam.rig), shW = mode === 'crash' && !inside ? shiftOf(safeRect()) : 0;
  shiftK = fadeDip > .5 ? shW : shiftK + (shW - shiftK) * (1 - Math.exp(-dt * 2.5));
  if (crash) { crash.fadeNow = fadeNow; crash.diveK = cam.t < 1 && cam.from?.rig === 'route' && cam.rig !== 'route' ? smooth(cam.t / .3) : (crash.diveK || 0) * Math.exp(-dt / 1.6); if (s) { cueEnv(); cloudClear(s); } }
  const fastCam = cam.t < 1 && cur.p.distanceTo(prevCam) > Math.max(camAlt, 30) * .04; prevCam.copy(cur.p);
  const F = cam.from, mapMode = crash && cam.t < 1 && F && (cam.rig === 'route' ? F.rig !== 'route' : F.mk > .01) ? Math.max(cam.rig === 'route' ? Math.max(F.mk, smooth(cam.t / .15)) : F.mk * (1 - smooth((cam.t - .5) / .4)), smooth((camAlt - 45e3) / 80e3)) : undefined;
  if (world.finalM) world.atmU.uSteps.value = crash && isInside(cam.rig) ? Math.max(12, Math.round(qSteps * .5)) : qSteps;
  world.render(dt, { time: world.time, up: cur.u, look: cur.l, fov: cur.fov, exposure: expo, mapMode, fade: fadeNow, flash, flashPos: crash?.flashPos, target: crash?.pos, shadowSize, inside, reset: camCut > 0 || fadeNow > .97 || fastCam, fill: inside ? 0 : crash?.direct?.fill ?? .9, shift: shiftK }); camCut = Math.max(0, camCut - 1);
  updatePins(); dissolve(dt);
  if (s) { updateCard(); updateIns(s); updateAoa(s, dt); drawTimeline(); soundFrame(s, dt, now); }
  srC = undefined;
}
function runStory(dt) {
  const S = crash.sim, i = S.beatAt(story), B = S.beats[i];
  if (i !== lastBeat) {
    const fwd = i === lastBeat + 1, prevRig = cam.rig, first = lastBeat < 0; lastBeat = i;
    if (B.masks) masks = true; else if (!fwd) masks = S.beats.slice(0, i + 1).some((x) => x.masks);
    updateCard();
    if ((crash.chuteK || 0) > .3) { crash.chuteK = 0; fadeDip = 1; camCut = 2; }
    const EE = crash.direct.epilogueEnv;
    if (EE && (B.t === 'end') !== crash.epiEnv) { crash.epiEnv = B.t === 'end'; const e = crash.epiEnv ? { layers: lay(EE.layers), fogVis: EE.fogVisKm ?? 0 } : crash.envBase; world.setEnv({ layers: e.layers, fogVis: e.fogVis }); crash.cueKey = ''; }
    { const txt = `${B.text} ${B.events.map((e) => `${e.title} ${e.detail || ''}`).join(' ')}`.toLowerCase(); crash.refs = crash.evs.filter((e) => { const w = (e.label || '').toLowerCase().split(/\s+/); return e.trk == null && w.length > 1 && w[0].length > 2 && w[1].length > 2 && txt.includes(`${w[0]} ${w[1]}`); }); }
    if (B.t === 'end') {
      const e = epilogueFrame(); crash.epiAlt = crash.direct.epilogue?.[2] < 400e3 && e[2] < 400e3 ? e[2] * 1.15 : 0;
      crash.mapT = { lat: e[0], lon: e[1], alt: e[2] };
      manualView = false; curView = 'map'; if (cam.rig !== 'route') { G.lat = e[0]; G.lon = e[1]; G.alt = e[2]; fadeDip = 1; setRig('route', .001); } updateRailOn();
    } else if (!manualView) {
      if (B.v === 'map') { crash.mapT = mapFrame(i); if (prevRig !== 'route') Object.assign(G, crash.mapT); }
      const midMove = !first && cam.rig === 'follow' && cam.t < 1;
      pickView(B.v || 'follow');
      if ((crash.cutK || 0) > .5) fadeDip = 0;
      if (cam.rig === 'follow' && (prevRig !== 'follow' || !fwd)) snapCam(B);
      else if (cam.rig === 'follow' && B.sfx === 'blast') { setRig('follow', .001); snapCam(B); crash.rtV = 0; }
      if (midMove && cam.rig === 'follow' && cam.t < 1) cam.dur = Math.min(cam.dur, .6 / Math.max(1 - cam.t, .05));
    }
    for (const l of crash.lines) if (l.userData.only) l.visible = l.userData.only.includes(i);
    if (cam.rig === 'above' && !manualView) { cam.zoom = B.zoom ?? 1.2; cam.hdgInit = false; }
    if ($('#eyes').classList.contains('open')) renderEyes();
    if (fwd && B.sfx && playing) fireSfx(B.sfx);
    crash.warn = B.sfx === 'stall' ? ['STALL'] : B.sfx === 'gpws' ? ['PULL UP'] : (crash.warn && !fwd ? [] : crash.warn);
  }
  if (!manualView && B.then && B.v === 'map' && cam.rig === 'route' && !xfReq && story - B.s > (B.sw ?? Math.max(3.5, B.len * .45))) { pickView('follow'); snapCam(B); }
  if (cam.rig === 'route' && crash.mapT && (!manualView || B.t === 'end') && !drag) {
    const T = crash.mapT, k = 1 - Math.exp(-dt * 1.1);
    G.lat += (T.lat - G.lat) * k; G.lon = ((G.lon + shortAngle(G.lon, T.lon) * k) + 540) % 360 - 180; G.alt = Math.exp(lerp(Math.log(G.alt), Math.log(T.alt), k));
  }
  storyOverlays(B, dt);
  if (B.t !== 'end' && !manualView && cam.rig === 'follow') {
    const w = 1.25, d = (x, v) => v + (w * w * x - 2 * w * v) * dt;
    cam.va = d(shortAngle(cam.az, (B.az ?? crash.direct.az ?? 215) + (story - B.s) * 1.1), cam.va || 0); cam.az += cam.va * dt;
    cam.ve = d((crash.seaHit && i === crash.lastI && story > crash.hitS - 3.4 ? Math.max(B.el ?? 8, 6) : B.el ?? 8) - cam.el, cam.ve || 0); cam.el += cam.ve * dt;
    const lz = Math.log(cam.zoom); cam.vz = d(Math.log((B.zoom ?? 1.2) * (1 - .07 * smooth((story - B.s) / B.len))) - lz, cam.vz || 0); cam.zoom = Math.exp(lz + cam.vz * dt);
  }
}
const aoaEl = document.getElementById('aoa'), aoaN = aoaEl.querySelector('.n'), aoaP = aoaEl.querySelector('.p'), aoaT = aoaEl.querySelectorAll('text');
function updateAoa(s, dt) {
  const gs = (s.gs ?? 0) * .5144, path = Math.atan2((s.vs ?? 0) * .00508, Math.max(gs, 1)) / D2R, d = s.pitch - path;
  const on = !ended && !isInside(cam.rig) && cam.rig !== 'route' && fieldQ('pitch', rt) === 'recorded' && gs > 15 && Math.abs(d) > 12;
  crash.aoaK = clamp((crash.aoaK || 0) + (on ? dt / .6 : -dt / .8), 0, 1);
  const o = smooth(crash.aoaK).toFixed(2); if (aoaEl.style.opacity !== o) aoaEl.style.opacity = o;
  if (crash.aoaK <= 0) return;
  aoaN.setAttribute('transform', `rotate(${(-s.pitch).toFixed(1)} 64 44)`); aoaP.setAttribute('transform', `rotate(${(-path).toFixed(1)} 64 44)`);
  const f = (x) => `${x >= 0 ? '+' : '−'}${Math.abs(Math.round(x))}°`; aoaT[0].textContent = `Nose ${f(s.pitch)}`; aoaT[1].textContent = `Moving ${f(path)}`;
}
const lapseEl = document.getElementById('lapse'), capEl = document.getElementById('cap');
function speakWords(B) {
  const W = crash.wordsW; if (!W) return;
  const u = B.a0 != null || B.narr ? (story - B.s) / Math.max(B.narr, .1) : 1, n = u >= 1 ? W.length : W.findIndex((v) => v > u);
  if (n === crash.wordsAt) return; crash.wordsAt = n;
  const sp = $('#card p')?.children; if (!sp) return; for (let i = 0; i < sp.length; i++) sp[i].classList.toggle('on', i <= n - 1 || u >= 1);
}
function storyOverlays(B, dt) {
  speakWords(B);
  crash.brightK = lerp(crash.brightK ?? 1, !manualView && B.bright ? B.bright : 1, 1 - Math.exp(-dt * 2.5));
  const lt = !manualView && B.lapse && B.t !== 'end' && B.rate > 1.5 ? `Time-lapse ×${Math.round(B.rate)}` : !manualView && B.bright ? 'Night · brightened to show the aircraft' : '';
  if (lt && lapseEl.textContent !== lt) lapseEl.textContent = lt;
  lapseEl.style.opacity = lt ? '1' : '0';
  let ct = '', co = 0;
  if (B.caption) { const L = B.caption.split(' '), u = story - B.s - (B.capAt ?? 0), n = clamp(Math.floor(u / .42) + 1, 0, L.length); ct = L.slice(0, n).join(' '); co = n ? 1 - smooth((story - B.s - B.len + 1.4) / 1) : 0; }
  if (capEl.textContent !== ct) capEl.textContent = ct;
  capEl.style.opacity = co.toFixed(2);
  const want = !manualView && B.look && isInside(cam.rig) && story - B.s > 1.1 && story - B.s < B.len - .6 ? 1 : 0; if (B.look) crash.lookB = B.look;
  crash.lookK = clamp((crash.lookK || 0) + (want ? dt / 1.8 : -dt / 1.1), 0, 1);
}
function snapCam(B) { cam.az = B.az ?? crash.direct.az ?? 215; cam.el = B.el ?? 8; cam.zoom = B.zoom ?? 1.2; cam.va = cam.ve = cam.vz = 0; cam.altS = null; }
function mapFrame(i) {
  const S = crash.sim, B = S.beats[i], nx = S.beats[i + 1], r0 = B.r0 ?? B.rt, r1 = B.r1 ?? (nx && nx.t !== 'end' ? nx.r0 ?? nx.rt : S.dur), vs = [];
  for (let k = 0; k <= 24; k++) { const q = S.sample(lerp(r0, r1, k / 24)); vs.push(dirOf(q.lat, q.lon)); }
  if (B.tight) return fitFrame(vs, B.tight);
  const trk = vs.slice(), near = (v) => trk.some((t) => t.angleTo(v) < 320e3 / R), r = crash.raw;
  for (const m of crash.evs) { const v = m.v.clone().normalize(); if (m.trk === i || crash.refs?.includes(m) || ((m.kind === 'landmark' || m.kind === 'signal') && near(v))) vs.push(v); }
  for (const v of crash.ovPts || []) if (near(v)) vs.push(v);
  for (const o of crash.ovOnly || []) if (o.only.includes(i)) vs.push(...o.pts);
  if (r.route?.to?.lat != null && crash.direct.fitDest !== false) vs.push(dirOf(r.route.to.lat, r.route.to.lon));
  return fitFrame(vs, 700e3);
}
function epilogueFrame() {
  const d = crash.direct.epilogue;
  if (d) {
    const f = [...designedFrame(d)], c = dirOf(f[0], f[1]), asp = world.cam.aspect || 1, ha = Math.atan(Math.tan(17 * D2R) * Math.max(asp, 1)), sn = (R + f[2]) / R * Math.sin(ha), ph = sn < 1 ? Math.asin(sn) - ha : Math.acos(R / (R + f[2]));
    const near = (crash.ovPts || []).filter((v) => v.angleTo(c) < ph * 1.4);
    if (near.length) f[2] = Math.max(f[2], fitFrame([c, ...near], f[2], c).alt);
    return f;
  }
  const r = crash.raw, vs = thin(crash.pathPts).map((p) => dirOf(p.lat, p.lon));
  if (r.site?.lat != null) vs.push(dirOf(r.site.lat, r.site.lon));
  if (r.route?.from?.lat != null) vs.push(dirOf(r.route.from.lat, r.route.from.lon));
  if (r.route?.to?.lat != null && crash.direct.fitDest !== false) vs.push(dirOf(r.route.to.lat, r.route.to.lon));
  const g = fitFrame(vs, 300e3), ra = crash.direct.routeAlt;
  return [g.lat, g.lon, clamp(Math.max(g.alt * 1.06, ra ? designedFrame([g.lat, g.lon, ra])[2] : 0), 300e3, 12000e3)];
}
function insideLimits() {
  const d = crash.direct, S = crash.sim, at = (x) => (typeof x === 'number' ? x : Date.parse(x) / 1000 - S.t0), out = {};
  if (d.insideUntil) { if (typeof d.insideUntil === 'object') for (const [k, v] of Object.entries(d.insideUntil)) out[k] = at(v); else out['*'] = at(d.insideUntil); return out; }
  const fx = d.fx || [], nose = fx.find((f) => f.type === 'detach' && f.part === 'nose');
  if (nose) { const tn = at(nose.t ?? nose.rt); out['*'] = Math.min(tn, ...fx.filter((f) => f.type === 'flash').map((f) => at(f.t ?? f.rt)).filter((x) => x <= tn)); }
  return out;
}
const insideOk = (id) => { const L = crash?.insideEnd || {}, e = L[id] ?? L['*']; return (e == null || rt < e - .05) && story < (crash?.sim.flightEndS ?? 1e9); };
function fireSfx(n) {
  if (n === 'stall' || n === 'gpws') { sound.shot('alarm', .55); return; }
  if (n === 'stendec') { sound.shot('morse', .6); return; }
  sound.shot(n, n === 'blast' ? .95 : .55);
}
function soundFrame(s, dt, now) {
  const S = crash.sim, active = now > (crash.startAt || 0);
  sound.sync(active ? S.audioPos(story) : null, playing, speed);
  const inside = isInside(cam.rig), flying = story < S.flightEndS && !crash.cut, jet = crash.ac.spec.engineKind == null, hi = clamp((s.gs ?? 300) / 480), out = cam.rig === 'route' ? 0 : 1, epi = flying ? 1 : 0;
  sound.mix({
    jet_engine: (jet ? (inside ? .1 : .34) : 0) * out * epi, prop_engine: (jet ? 0 : (inside ? .5 : .4)) * out * epi * (crash.ctl?.rpm ?? 1) ** .8, jet_cabin: (jet && inside ? .5 : 0) * out * epi,
    wind: (inside ? .07 : .26 + hi * .24) * out * epi, ocean: (!crash.terrain?.length && s.alt < 900 ? .5 : 0) * out,
    rumble: clamp(Math.abs(s.vs ?? 0) / 18000) * .6 * out * epi, rate: .85 + hi * .3,
  });
  const lightningNow = crash.direct.lightning && flash > .9 && s.alt > 2000; if (lightningNow && !crash.thLock && playing) { sound.shot('thunder', .35); crash.thLock = now + 6000; } if (crash.thLock && now > crash.thLock) crash.thLock = 0;
}
function updatePins() {
  const a = world.camEcef.length() - R;
  const showHome = mode === 'home' || (cam.rig === 'globe' && cam.t < .5);
  const taken = [];
  for (const p of pins) {
    const vis = mode === 'home' && !world.occluded(p.v);
    p.el.style.display = vis ? 'grid' : 'none';
    if (vis) { const q = world.project(p.v); p.el.style.transform = `translate(${q.x}px,${q.y}px)`; p.el.classList.toggle('lf', q.x > world.cssW - 120); p.el.style.visibility = q.x < 8 || q.x > world.cssW - 8 ? 'hidden' : 'visible'; const hit = taken.some((t) => Math.abs(t.y - q.y) < 16 && Math.abs(t.x - q.x) < 110); p.el.classList.toggle('nolabel', hit); if (!hit) taken.push(q); }
  }
  if (crash) {
    const show = (a > 45e3 && (cam.rig === 'route' || a > 80e3)) || ended, bi = crash.sim.beatAt(story), sb = stage.getBoundingClientRect(), st = sb.top, W = world.cssW;
    const vw = $('#views').getBoundingClientRect(), rr = $('#rail').hidden ? null : $('#rail').getBoundingClientRect(), wb = $('#who').getBoundingClientRect();
    const bot = (ended ? ($('#fade b')?.getBoundingClientRect().top ?? world.cssH + st) : Math.min($('#card').getBoundingClientRect().top, vw.height > 0 ? vw.top : 1e9)) - st - 10;
    const k = world.H / (world.cssH || 1); LF.b.value = (world.cssH - bot - 4) * k; LF.w.value = 34 * k;
    const top = Math.max(46, wb.bottom - st + 8), railL = rr ? rr.left - sb.left - 6 : W - 6, railB = rr ? rr.bottom - st + 8 : -1, narrow = W < 520;
    const placed = [], dots = [], fd = crash.fadeNow ?? 0, op = fd > .5 ? 0 : 1 - fd * 2, list = crash.refs?.length ? [...crash.refs, ...crash.evs.filter((e) => !crash.refs.includes(e))] : crash.evs;
    pinsEl.style.opacity = op; mark.style.opacity = op;
    const items = [], pth = [];
    for (const e of list) {
      let vis = show && op > 0 && (!e.only || e.only.includes(bi)) && !world.occluded(e.v);
      if (e.trk != null) vis = vis && cam.rig === 'route' && !ended && e.trk <= bi && bi - e.trk <= 2 && crash.sim.beats[bi].t !== 'end';
      const q = vis ? world.project(e.v) : null, ref = crash.refs?.includes(e);
      const on = vis && !q.behind && q.x > 8 && q.x < W - 8 && q.y > top && q.y < bot && !(q.x > railL - 4 && q.y < railB) && (ref || !dots.some((d) => !d.ref && Math.abs(d.x - q.x) < 8 && Math.abs(d.y - q.y) < 8));
      e.el.style.display = on ? 'block' : 'none';
      if (!on) continue;
      q.ref = ref; dots.push(q); items.push([e, q, ref]);
    }
    if (items.length && cam.rig === 'route') for (const L of crash.scrLines ??= [thin(crash.pathPts, 240).map((p) => ecef(p.lat, p.lon, p.alt)), ...crash.ovLines]) { let a = null; for (const v of L) { const q = world.occluded(v) ? null : world.project(v); if (q?.behind) { a = null; continue; } if (a && q && Math.abs(q.x - a.x) + Math.abs(q.y - a.y) < 2000) pth.push([a.x, a.y, q.x, q.y]); a = q && { x: q.x, y: q.y }; } }
    const ov = (a, b) => a[0] < b[0] + b[2] && b[0] < a[0] + a[2] && a[1] < b[1] + b[3] && b[1] < a[1] + a[3], M = crash.markP;
    const cross = (r) => { let n = 0; for (const [ax, ay, bx, by] of pth) { if (Math.max(ax, bx) < r[0] || Math.min(ax, bx) > r[0] + r[2] || Math.max(ay, by) < r[1] - 2 || Math.min(ay, by) > r[1] + r[3] + 2) continue; let t0 = 0, t1 = 1, ok = true; const dx = bx - ax, dy = by - ay; for (const [pp, qq] of [[-dx, ax - r[0]], [dx, r[0] + r[2] - ax], [-dy, ay - r[1] + 2], [dy, r[1] + r[3] + 2 - ay]]) { if (!pp) { if (qq < 0) ok = false; } else { const t = qq / pp; if (pp < 0) t0 = Math.max(t0, t); else t1 = Math.min(t1, t); } } if (ok && t0 <= t1) n++; } return n; };
    for (const [e, q, ref] of items) {
      const cur = e.trk === bi; e.el.classList.toggle('cur', cur);
      if (cur && !e.labelWc) { e.el.classList.remove('dot', 'up', 'dn', 'lf'); e.labelWc = e.el.offsetWidth; }
      const W0 = cur ? e.labelWc || 90 : (e.labelW ||= e.el.offsetWidth || 90), Wu = W0 - 13, xr = q.y < railB + 10 ? railL : W - 6;
      let best = null;
      if (!((narrow && e.kind === 'trk0') || (e.trk != null && !cur && !ref))) for (const m of ['r', 'l', 'u', 'd']) {
        const ux = clamp(q.x - Wu / 2, 4, xr - Wu), rc = m === 'r' ? [q.x + 10, q.y - 8, W0 - 16, 16] : m === 'l' ? [q.x - W0 + 6, q.y - 8, W0 - 16, 16] : [ux, m === 'u' ? q.y - 28 : q.y + 10, Wu, 17];
        if ((m === 'u' || m === 'd') && (ux > q.x - 12 || ux + Wu < q.x + 12)) continue;
        if (rc[0] < 4 || rc[0] + rc[2] > xr || rc[1] < top - 6 || rc[1] + rc[3] > bot + 4 || (M && ov(Math.abs(M.x - q.x) + Math.abs(M.y - q.y) < 20 ? [M.x - 8, M.y - 8, 16, 16] : cur || ref ? [M.x - 15, M.y - 15, 30, 30] : [M.x - 27, M.y - 27, 54, 54], rc)) || placed.some((p) => ov(p, rc)) || dots.some((d) => d !== q && ov([d.x - 5, d.y - 5, 10, 10], rc))) continue;
        const pen = cross(rc) * 2 + (m === 'r' ? 0 : m === 'l' ? .5 : 1);
        if (!best || pen < best.pen) best = { m, rc, pen, ux };
        if (pen < 1) break;
      }
      if (best && best.pen >= 2 && !cur && !ref) best = null;
      if (best) placed.push(best.rc);
      const m = best?.m; e.el.classList.toggle('dot', !best); e.el.classList.toggle('lf', m === 'l'); e.el.classList.toggle('up', m === 'u'); e.el.classList.toggle('dn', m === 'd');
      if (e.el.style.maxWidth) e.el.style.maxWidth = '';
      const ud = m === 'u' || m === 'd'; e.el.style.setProperty('--mx', ud ? `${q.x - best.ux}px` : '50%');
      e.el.style.transform = `translate(${m === 'l' ? q.x - W0 + 11.5 : ud ? best.ux : q.x}px,${m === 'u' ? q.y - 27.5 : m === 'd' ? q.y - 7.5 : q.y}px)`;
    }
  }
  void showHome;
}
const LADDER = [{}, { bloom: false }, { steps: 32, atm: .42 }, { steps: 24, atm: .38 }, { steps: 18, atm: .34 }, { dpr: .85 }, { steps: 14, dpr: .75 }, { dpr: .65 }, { dpr: .55, atm: .3 }];
let qLevel = 0, qAcc = 0, qN = 0, qHold = 0;
window.__setQ = (l) => { qLevel = l; applyQ(); }; window.__q = () => qLevel;
const base = { bloom: tier.bloom, shadows: tier.shadows, steps: tier.cloudSteps, atm: tier.atmScale };
function applyQ() {
  const q = Object.assign({}, ...LADDER.slice(0, qLevel + 1));
  world.tier.bloom = base.bloom && q.bloom !== false; world.finalM.uniforms.uBloom.value = world.tier.bloom ? 1 : 0;
  world.tier.shadows = base.shadows && q.shadows !== false;
  qSteps = Math.min(base.steps, q.steps ?? base.steps); world.atmU.uSteps.value = qSteps;
  world.tier.atmScale = Math.min(base.atm, q.atm ?? base.atm);
  dpr = Math.min(devicePixelRatio || 1, tier.maxDpr) * (q.dpr ?? 1);
  size();
}
function adapt(dt) {
  if (window.__stepped || !world?.finalM || document.hidden) return;
  if (dt > .25) return;
  qAcc += dt; qN++; qHold = Math.max(0, qHold - dt); qLock = Math.max(0, qLock - dt); qSinceUp += dt;
  if (qAcc < .6 || qHold > 0) return;
  const ms = qAcc / qN * 1000; qAcc = 0; qN = 0;
  if (ms > 31 && qLevel < LADDER.length - 1) { if (qSinceUp < 4) qLock = 20; qLevel++; applyQ(); qHold = .5; qUp = 0; }
  else if (ms < 21 && qLock === 0) { qUp += .6; if (qUp >= 3 && qLevel > 0) { qLevel--; applyQ(); qHold = 1; qUp = 0; qSinceUp = 0; } }
  else qUp = 0;
}
let qLock = 0, qSinceUp = 99, qSteps = tier.cloudSteps;
let qUp = 0;
let visible = true;
new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(stage);

let drag = null, ptrs = new Map(), pinch = 0;
canvas.addEventListener('pointerdown', (e) => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); drag = { x: e.clientX, y: e.clientY, t: performance.now() }; G.vLat = G.vLon = 0; if (mode === 'home') G.spin = false; if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = Math.hypot(a[0] - b[0], a[1] - b[1]); } });
canvas.addEventListener('pointermove', (e) => {
  if (!ptrs.has(e.pointerId)) return; ptrs.set(e.pointerId, [e.clientX, e.clientY]);
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) zoomBy(pinch / d); pinch = d; return; }
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY;
  if (cam.rig === 'globe' || cam.rig === 'route') {
    const k = (G.alt / R) * (34 * D2R) / (stage.clientHeight) / D2R * 1.05;
    G.lon = ((G.lon - dx * k / Math.max(Math.cos(G.lat * D2R), .2)) + 540) % 360 - 180; G.lat = clamp(G.lat + dy * k, -86, 86); if (crash) crash.mapT = null;
    const dtm = Math.max(performance.now() - drag.t, 8); drag.t = performance.now();
    G.vLon = -dx * k / (dtm / 1000) * .55; G.vLat = dy * k / (dtm / 1000) * .55;
  } else if (isInside(cam.rig)) { crash.lookYaw = clamp((crash.lookYaw ?? 0) + dx * .28, -85, 85); crash.lookPitch = clamp((crash.lookPitch ?? 0) + dy * .2, -45, 45); }
  else { manualView = true; updateRailOn(); cam.az = (cam.az + dx * .32) % 360; cam.el = clamp(cam.el + dy * .24, -82, 82); }
});
const up = (e) => { ptrs.delete(e.pointerId); if (!ptrs.size) drag = null; pinch = 0; };
canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
function zoomBy(k) { if (cam.rig === 'globe' || cam.rig === 'route') { G.alt = clamp(G.alt * k, 120e3, 40000e3); if (crash) crash.mapT = null; } else cam.zoom = clamp(cam.zoom * k, .28, 40); }
canvas.addEventListener('wheel', (e) => { if (layout === 'content' && !e.ctrlKey) return; e.preventDefault(); zoomBy(Math.exp(e.deltaY * .0012)); }, { passive: false });

window.__mysteries = {
  world: () => world, sound: () => sound,
  open: (id, o = {}) => openCrash(id, new URLSearchParams(o)), step(n, dt = 1 / 30) { window.__stepped = true; for (let i = 0; i < n; i++) tick(dt, performance.now() + 1e7); },
  seek(rtv) { seekStory(crash.sim.storyOf(rtv)); }, seekS(s) { seekStory(s); }, rig(name, o = {}) { manualView = true; camCut = 2; Object.assign(cam, o); curView = name; cam.rig = name === 'map' ? 'route' : name; cam.t = 1; cam.hdgInit = false; cam.from = null; cam.altS = null; if (crash) crash.wit = null; updateRailOn(); }, story() { manualView = false; lastBeat = -1; }, play() { playing = true; setPP(); crash && (crash.startAt = 0); }, live() { window.__stepped = false; }, beats: () => crash?.sim.beats, probe: () => { const P = crash?.pos && world.project(crash.pos); return { rt, story, rig: cam.rig, ct: cam.t, cam: cam.p.toArray(), fade: crash?.cutK ?? 0, dip: fadeDip, px: P && [P.x, P.y, P.behind], att: crash?.s && [crash.s.pitch, crash.s.roll, crash.s.hdg] }; }, crash: () => crash, state: () => ({ fadeDip, mode, rt, story, rig: cam.rig, len: crash?.sim.storyLen, dur: crash?.sim.dur, ended }), pause() { playing = false; setPP(); }, sim: () => crash?.sim, G,
};
boot();
