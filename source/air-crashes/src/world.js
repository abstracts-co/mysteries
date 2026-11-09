import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { R, clamp, dirOf, ecef, latLonOf, lerp, smooth, enu } from './geo.js';
import { gmstDeg, moonDir, sunDir } from './astro.js';
import { makeBlueNoise, makeNoise3D, makePuffTex, makeWaveTex } from './noise3d.js';
import { ACCUM_FRAG, ATMOS_FRAG, BLEND_FRAG, BRIGHT_FRAG, EARTH_FRAG, EARTH_VERT, FINAL_FRAG, FS_VERT, STAR_FRAG, STAR_VERT, TERRAIN_FRAG, TERRAIN_VERT } from './shaders.js';

const FAR = 2e9;
const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
const BRr = [5.8e-3, 13.5e-3, 33.1e-3], BOz = [.65e-3, 1.881e-3, .085e-3], RK = R / 1000;
const chH = (X, h, mu) => { const c = 1.2533 * Math.sqrt(X + h); if (mu >= 0) return c / (c * mu + 1) * Math.exp(-h); const x0 = Math.sqrt(1 - mu * mu) * (X + h), c0 = 1.2533 * Math.sqrt(x0); return 2 * c0 * Math.exp(Math.min(X - x0, 60)) - c / (1 - c * mu) * Math.exp(-h); };
const trans = (h, mu, k) => { h = Math.max(h, 0); const r = 8 * chH(RK / 8, h / 8, mu), m = 1.2 * chH(RK / 1.2, h / 1.2, mu), o = chH(RK / 8, 3.1, mu) * 400 * clamp((42 - h) / 30); return BRr.map((b, i) => Math.exp(-(b * r * 1.04 + 4e-3 * 1.1 * m + BOz[i] * o)) * k); };
function skyRad(o, d, sun, moon, moonI) {
  const b = o.dot(d), r2 = o.lengthSq(), hA = b * b - r2 + 6451 ** 2; if (hA < 0) return [0, 0, 0];
  let t1 = -b + Math.sqrt(hA); const hG = b * b - r2 + RK * RK; if (hG > 0 && -b - Math.sqrt(hG) > 0) t1 = -b - Math.sqrt(hG);
  const t0 = Math.max(-b - Math.sqrt(hA), 0), N = 10, L = t1 - t0, pw = r2 < 6431 ** 2 ? 2 : 1, mu = d.dot(sun), mv = d.dot(moon), hg = (m) => .0796 * (1 - .5776) / Math.pow(Math.max(1.5776 - 1.52 * m, 1e-4), 1.5);
  const pr = .0597 * (1 + mu * mu), pm = hg(mu), prm = .0597 * (1 + mv * mv), pmm = hg(mv), out = [0, 0, 0], nt = [0, 0, 0], od = [0, 0, 0], p = new THREE.Vector3();
  let tp = 0;
  for (let i = 0; i < N; i++) {
    const tn = L * Math.pow((i + 1) / N, pw), ds = tn - tp;
    p.copy(d).multiplyScalar(t0 + (tp + tn) / 2).add(o); tp = tn; const r = p.length(), h = Math.max(r - RK, 0), rr = Math.exp(-h / 8), rm = Math.exp(-h / 1.2), oz = Math.max(0, 1 - Math.abs(h - 25) / 15);
    const mu_ = p.dot(sun) / r, me = mu_ + Math.sqrt(2 * h / RK), ms = me > 0 ? lerp(.2, 1, smooth(me / .6)) : .2 * Math.exp(80 * me), ts = trans(h, mu_, 14), tq = moonI > .001 ? trans(h, p.dot(moon) / r, moonI * .42) : [0, 0, 0], tm = tq[0] * .25 + tq[1] * .6 + tq[2] * .15;
    for (let c = 0; c < 3; c++) { const ext = BRr[c] * rr + 4.4e-3 * rm + BOz[c] * oz, seg = Math.exp(-od[c]) * (1 - Math.exp(-ext * ds)) / Math.max(ext, 1e-7), sc = (rr * BRr[c] + rm * 4e-3) * seg; od[c] += ext * ds; out[c] += (rr * BRr[c] * pr + rm * 4e-3 * pm) * seg * ts[c] + sc * ms * [.42, .5, .62][c]; nt[c] += (rr * BRr[c] * prm + rm * 4e-3 * pmm) * seg * tm + sc * (.008 + moonI * .02); }
  }
  const ln = nt[0] * .05 + nt[1] * .55 + nt[2] * .4, k = 1.6 / (1 + ln / (.002 + moonI * .009));
  return out.map((v, c) => v + lerp(nt[c], ln * [.5, .75, 1.35][c], .7) * k);
}
function transLUT() {
  const W = 128, H = 32, d = new Uint16Array(W * H * 4);
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const mu = (i / (W - 1)) ** 2 * 1.35 - .35, h = (j / (H - 1)) ** 2 * 100, t = trans(h, mu, 1), o = (j * W + i) * 4; for (let c = 0; c < 3; c++) d[o + c] = THREE.DataUtils.toHalfFloat(t[c]); d[o + 3] = 15360; }
  const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat, THREE.HalfFloatType); t.minFilter = t.magFilter = THREE.LinearFilter; t.needsUpdate = true; return t;
}
const fsGeo = () => { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute([-1, -1, 0, 3, -1, 0, -1, 3, 0], 3)); return g; };

const AS = (p) => (globalThis.__ASSETS__ || '') + p;
export class World {
  constructor(canvas, tier) {
    this.tier = tier; this.canvas = canvas;
    const r = this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, logarithmicDepthBuffer: true, powerPreference: 'high-performance', alpha: false, stencil: false, preserveDrawingBuffer: !!tier.shot });
    r.autoClear = false; r.outputColorSpace = THREE.LinearSRGBColorSpace; r.toneMapping = THREE.NoToneMapping;
    if (tier.shadows) { r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap; }
    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(42, 1, .5, FAR); this.scene.add(this.cam);
    this.camEcef = new THREE.Vector3(R * 3, 0, 0);
    this.anchor = new THREE.Vector3();
    this.loader = new THREE.TextureLoader();
    this.time = Date.now(); this.frame = 0; this.simClock = 0; this.movers = [];
    this.U = {
      uSun: { value: new THREE.Vector3(1, 0, 0) }, uMoon: { value: new THREE.Vector3(0, 1, 0) }, uMoonI: { value: 0 },
      uNadir: { value: new THREE.Vector3() }, uE0: { value: new THREE.Vector3() }, uN0: { value: new THREE.Vector3() }, uCamAlt: { value: 0 }, uTime: { value: 0 }, uRange: { value: 1 }, uOceanOff: { value: new THREE.Vector2() }, uSea: { value: .3 }, uGlobalClouds: { value: 1 }, uGlobalCov: { value: 1 }, uNightLights: { value: 1 }, uAlbedoBoost: { value: 1 }, uIce: { value: 0 }, uSkyZ: { value: new THREE.Vector3() }, uSkyH: { value: new THREE.Vector3() }, uAmb: { value: new THREE.Vector3(.1, .14, .22) }, tTrans: { value: transLUT() }, uExpo: { value: 1 }, tWave: { value: null }, uSiteBox: { value: new THREE.Vector4(999, 0, 0, 0) }, tSite: { value: null }, uMapK: { value: 0 }, uVH: { value: 600 }, tPuff: { value: null }, uAE: { value: new THREE.Vector3(0, 1, 0) }, uAN: { value: new THREE.Vector3(0, 0, 1) }, uLp0: { value: new THREE.Vector2() }, uCamK: { value: 0 }, uCamR: { value: R }, uUrban: { value: 1 },
    };
    this.env = { layers: [], fogVis: 0, fogTop: 1, sea: .3, lightning: 0, center: new THREE.Vector3(), radius: 300, historicLights: 1, follow: false };
  }
  async load(onProgress) {
    const names = ['day', 'night', 'relief', 'clouds'], tex = {};
    let done = 0;
    await Promise.all([...names.map((n) => this.tex(AS(`tex/${n}.webp`)).then((t) => { tex[n] = t; onProgress?.(++done / 6); })), this.tex(AS('tex/water.png')).then((t) => { tex.water = t; onProgress?.(++done / 6); }), fetch(AS('tex/stars.txt')).then((r) => r.text()).then((b) => { this.starBuf = Uint8Array.from(atob(b.trim()), (c) => c.charCodeAt(0)).buffer; onProgress?.(++done / 6); })]);
    tex.day.colorSpace = THREE.SRGBColorSpace;
    this.U.tWave.value = makeWaveTex(THREE, this.tier.msaa ? 256 : 192); this.U.tPuff.value = makePuffTex(THREE, 128); this.buildEarth(tex); this.buildSky(); this.buildPasses(); this.buildLights();
  }
  tex(url, mip = true) {
    return new Promise((res, rej) => this.loader.load(url, (t) => {
      t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = this.tier.aniso; t.generateMipmaps = mip; t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter; res(t);
    }, undefined, rej));
  }
  buildEarth(tex) {
    const U = this.U, common = { tDay: { value: tex.day }, tNight: { value: tex.night }, tRelief: { value: tex.relief }, tWater: { value: tex.water }, tClouds: { value: tex.clouds } };
    const mat = (disc) => new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, uniforms: { ...common, ...U, uDisc: { value: disc ? 1 : 0 } }, side: disc ? THREE.DoubleSide : THREE.FrontSide });
    const sg = new THREE.SphereGeometry(R, 256, 128);
    sg.computeBoundingSphere(); this.globe = new THREE.Mesh(sg, mat(false)); this.globe.frustumCulled = false; this.globe.renderOrder = -5; this.scene.add(this.globe);
    const rows = this.tier.discRows, cols = 128, pos = [], idx = [];
    for (let i = 0; i <= rows; i++) for (let j = 0; j <= cols; j++) pos.push((i / rows) ** 3.2, j / cols * Math.PI * 2, 0);
    for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + 1, c = a + cols + 1, d = c + 1; idx.push(a, b, c, b, d, c); }
    const dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dg.setIndex(idx);
    this.disc = new THREE.Mesh(dg, mat(true)); this.disc.frustumCulled = false; this.disc.renderOrder = -5; this.scene.add(this.disc);
    const dm = (disc) => new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: '#include <common>\n#include <logdepthbuf_pars_fragment>\nvoid main(){\n#include <logdepthbuf_fragment>\ngl_FragColor=vec4(0.);\n}', uniforms: { ...U, uDisc: { value: disc ? 1 : 0 } }, side: disc ? THREE.DoubleSide : THREE.FrontSide });
    this.depthEarth = [dm(false), dm(true)];
  }
  buildSky() {
    const view = new DataView(this.starBuf), n = this.starBuf.byteLength / 6, p = [], s = [], c = [];
    const kCol = (k) => { const t = k / 1000; return t < 4 ? [1, .72, .5] : t < 5.5 ? [1, .86, .7] : t < 7 ? [1, .97, .92] : t < 10 ? [.88, .92, 1] : [.72, .82, 1]; };
    for (let i = 0; i < n; i++) {
      const ra = view.getUint16(i * 6, true) / 65535 * Math.PI * 2, dec = view.getInt16(i * 6 + 2, true) / 32767 * Math.PI / 2, mag = view.getUint8(i * 6 + 4) / 30 - 2, k = view.getUint8(i * 6 + 5) * 100;
      p.push(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
      s.push(Math.pow(10, (2.2 - mag) * .19)); c.push(...kCol(k));
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3)); g.setAttribute('aSize', new THREE.Float32BufferAttribute(s, 1)); g.setAttribute('aColor', new THREE.Float32BufferAttribute(c, 3));
    this.starU = { uRot: { value: new THREE.Matrix3() }, uPx: { value: 1.6 }, uDim: { value: 1 } };
    this.stars = new THREE.Points(g, new THREE.ShaderMaterial({ vertexShader: STAR_VERT, fragmentShader: STAR_FRAG, uniforms: this.starU, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false }));
    this.stars.frustumCulled = false; this.stars.renderOrder = -10; this.scene.add(this.stars);
    const moonM = new THREE.ShaderMaterial({ uniforms: { uL: { value: new THREE.Vector3() } }, transparent: false, blending: THREE.AdditiveBlending, depthWrite: false,
      vertexShader: `varying vec2 vU;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ vU=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);
#include <logdepthbuf_vertex>
}`,
      fragmentShader: `varying vec2 vU; uniform vec3 uL;
#include <common>
#include <logdepthbuf_pars_fragment>
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5);} float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
#include <logdepthbuf_fragment>
 float r=length(vU); if(r>1.)discard; vec3 N=vec3(vU,sqrt(1.-r*r)); float l=smoothstep(-.02,.1,dot(N,uL)); float m=.55+.45*n(vU*3.+2.)*n(vU*7.+5.)*1.6; gl_FragColor=vec4(vec3(.98,.96,.9)*l*m*2.2*smoothstep(1.,.97,r),1.); }` });
    this.moon = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), moonM); this.moon.frustumCulled = false; this.moon.renderOrder = -9; this.scene.add(this.moon);
  }
  buildPasses() {
    const noise = makeNoise3D(this.tier.noise);
    this.depthRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.UnsignedByteType, depthBuffer: true, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter });
    this.depthRT.depthTexture = new THREE.DepthTexture(4, 4, THREE.UnsignedIntType); this.depthRT.depthTexture.minFilter = THREE.NearestFilter; this.depthRT.depthTexture.magFilter = THREE.NearestFilter;
    this.depthMat = new THREE.MeshBasicMaterial({ colorWrite: false });
    const hf = { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: false };
    this.atmRT = new THREE.WebGLRenderTarget(4, 4, { ...hf, count: 2, minFilter: THREE.NearestFilter, magFilter: THREE.NearestFilter }); this.acA = new THREE.WebGLRenderTarget(4, 4, hf); this.acB = new THREE.WebGLRenderTarget(4, 4, hf); this.lastDir = new THREE.Vector3(); this.prevInv = new THREE.Matrix3(); this.prevK = new THREE.Vector4(); this.prevCam = new THREE.Vector3();
    this.sceneRT = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, depthBuffer: true, samples: this.tier.msaa });
    this.b1 = new THREE.WebGLRenderTarget(4, 4, hf); this.b2 = new THREE.WebGLRenderTarget(4, 4, hf); this.b3 = new THREE.WebGLRenderTarget(4, 4, hf);
    const fs = (frag, uniforms, extra = {}) => new THREE.ShaderMaterial({ glslVersion: THREE.GLSL3, vertexShader: FS_VERT, fragmentShader: frag, uniforms, depthTest: false, depthWrite: false, ...extra });
    this.atmU = {
      tDepth: { value: this.depthRT.depthTexture }, tNoise: { value: noise }, tBlue: { value: makeBlueNoise(THREE, 64) }, tTrans: this.U.tTrans, uExpo: this.U.uExpo, uMoonS: { value: 0 }, uMapK: this.U.uMapK, uHiFade: { value: 1 }, uGAlb: { value: .06 }, uAmb: this.U.uAmb, uGlowPos: { value: new THREE.Vector3() }, uGlowCol: { value: new THREE.Vector3() }, uProjK: { value: new THREE.Vector4() }, uAS2: { value: new THREE.Vector2(1, 1) }, uCamRot: { value: new THREE.Matrix3() }, uCam: { value: new THREE.Vector3() }, uSun: this.U.uSun, uMoon: this.U.uMoon, uMoonI: this.U.uMoonI, uCenter: { value: new THREE.Vector3() }, uCE: { value: new THREE.Vector3(1, 0, 0) }, uCN: { value: new THREE.Vector3(0, 1, 0) }, uFlashPos: { value: new THREE.Vector3() }, uLogFar: { value: Math.log2(FAR + 1) }, uTime: { value: 0 }, uFrame: { value: 0 }, uCloudRadius: { value: 300 }, uFogVis: { value: 0 }, uFogTop: { value: 1 }, uFlash: { value: 0 }, uNoiseOff: { value: new THREE.Vector3() }, uLayerN: { value: 0 }, uSteps: { value: this.tier.cloudSteps }, uLayers: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) }, uLayerB: { value: [0, 1, 2, 3].map(() => new THREE.Vector4()) },
    };
    this.fs = new THREE.Mesh(fsGeo(), null); this.fs.frustumCulled = false; this.fsScene = new THREE.Scene(); this.fsScene.add(this.fs); this.fsCam = new THREE.Camera();
    this.atmM = fs(ATMOS_FRAG, this.atmU);
    this.accM = fs(ACCUM_FRAG, { tC: { value: this.atmRT.textures[0] }, tD: { value: this.atmRT.textures[1] }, tH: { value: this.acA.texture }, uA: { value: 1 }, uProjK: this.atmU.uProjK, uCamRot: this.atmU.uCamRot, uPrevK: { value: this.prevK }, uPrevInv: { value: this.prevInv }, uDelta: { value: new THREE.Vector3() } });
    this.brightM = fs(BRIGHT_FRAG, { tS: { value: null }, uPx: { value: new THREE.Vector2() }, uK: { value: 1 }, uE: { value: 1 } });
    this.finalM = fs(FINAL_FRAG, { tS: { value: this.sceneRT.texture }, tB1: { value: this.b2.texture }, tB2: { value: this.b3.texture }, uExp: { value: 1 }, uFade: { value: 0 }, uBloom: { value: this.tier.bloom ? 1 : 0 }, uTime: { value: 0 }, uTint: { value: new THREE.Vector3(0, 0, 0) } });
    const blend = new THREE.Mesh(fsGeo(), fs(BLEND_FRAG, { tA: { value: this.acB.texture }, tD: { value: this.depthRT.depthTexture }, uAS: { value: new THREE.Vector2(1, 1) }, uLogFar: { value: Math.log2(FAR + 1) }, tTrans: this.U.tTrans, uProjK: this.atmU.uProjK, uCamRot: this.atmU.uCamRot, uSun: this.U.uSun, uCam: this.atmU.uCam, uSunK: { value: 0 }, uHalo: { value: this.tier.bloom ? .3 : 1 } }, { transparent: true, blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.SrcAlphaFactor, blendSrcAlpha: THREE.ZeroFactor, blendDstAlpha: THREE.OneFactor }));
    blend.frustumCulled = false; blend.renderOrder = 100; this.blend = blend; this.scene.add(blend);
  }
  buildLights() {
    this.sunL = new THREE.DirectionalLight(0xffffff, 3); this.moonL = new THREE.DirectionalLight(0xbcd0ff, 0); this.fill = new THREE.HemisphereLight(0xd0d6de, 0x000000, 0); this.hemi = new THREE.HemisphereLight(0xbfd8ff, 0x445566, .4);
    this.scene.add(this.sunL, this.sunL.target, this.moonL, this.moonL.target, this.fill, this.hemi);
    const s = this.sunL.shadow; s.mapSize.set(1024, 1024); s.bias = -.0005; s.normalBias = .15; s.camera.near = 1; s.camera.far = 800;
    this.pm = new THREE.PMREMGenerator(this.renderer);
    this.fireL = new THREE.PointLight(0xff9a50, 0, 4000, 1.6); this.scene.add(this.fireL);
    const cv = document.createElement('canvas'); cv.width = cv.height = 128; const x = cv.getContext('2d'), im = x.createImageData(128, 128);
    for (let j = 0; j < 128; j++) for (let i = 0; i < 128; i++) { const u = (i - 63.5) / 64, v = (j - 63.5) / 64, r2 = u * u + v * v, a = Math.atan2(v, u), w = 1 + .08 * Math.sin(a * 3 + 1.1) + .05 * Math.sin(a * 7 + 2.3), c = Math.exp(-r2 * 14 * w), g = Math.exp(-r2 * 3.2 * w) * .4 * Math.max(0, 1 - r2), o = (j * 128 + i) * 4; im.data[o] = 255 * Math.min(1, c + g * 1.2); im.data[o + 1] = 255 * Math.min(1, c * .95 + g * .55); im.data[o + 2] = 255 * Math.min(1, c * .8 + g * .18); im.data[o + 3] = 255 * Math.min(1, c + g); }
    x.putImageData(im, 0, 0);
    this.fireball = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    this.fireball.renderOrder = 121; this.fireball.frustumCulled = false; this.fireball.visible = false; this.scene.add(this.fireball);
  }
  setEnvMap(day, night = this.envN ?? 1) {
    this.envDay = day; this.envN = night;
    if (!this.envSc) {
      const m = new THREE.ShaderMaterial({ side: THREE.BackSide, uniforms: { a: { value: new THREE.Color() }, b: { value: new THREE.Color() }, c: { value: new THREE.Color() } }, vertexShader: 'varying vec3 v; void main(){ v=normalize(position); gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }', fragmentShader: 'varying vec3 v; uniform vec3 a,b,c; void main(){ float y=v.y; gl_FragColor=vec4(y>0.?mix(b,a,pow(y,.6)):mix(b,c,pow(-y,.5)),1.); }' });
      this.envSc = new THREE.Scene(); this.envSc.add(new THREE.Mesh(new THREE.SphereGeometry(10, 16, 12), m)); this.envU = m.uniforms;
    }
    const u = this.envU;
    u.a.value.lerpColors(new THREE.Color(.012, .018, .04).multiplyScalar(night), new THREE.Color(.3, .5, .95), day); u.b.value.lerpColors(new THREE.Color(.02, .03, .05).multiplyScalar(night), new THREE.Color(.85, .9, 1), day); u.c.value.lerpColors(new THREE.Color(.004, .006, .012).multiplyScalar(night), new THREE.Color(.12, .15, .2), day);
    const rt = this.pm.fromScene(this.envSc, .02); this.envRT?.dispose(); this.envRT = rt; this.scene.environment = rt.texture;
  }
  resize(w, h, dpr) {
    const r = this.renderer; r.setPixelRatio(1); r.setSize(Math.round(w * dpr), Math.round(h * dpr), false);
    const W = Math.round(w * dpr), H = Math.round(h * dpr); this.W = W; this.H = H; this.cssW = w; this.cssH = h;
    this.cam.aspect = w / h; this.cam.updateProjectionMatrix();
    const q = this.tier.atmScale, aw = Math.max(2, Math.round(W * q)), ah = Math.max(2, Math.round(H * q));
    this.depthRT.setSize(W, H); this.atmRT.setSize(aw, ah); this.acA.setSize(aw, ah); this.acB.setSize(aw, ah); this.sceneRT.setSize(W, H); this.atmU.uAS2.value.set(aw, ah); this.blend.material.uniforms.uAS.value.set(aw, ah);
    this.b1.setSize(W >> 1, H >> 1); this.b2.setSize(W >> 2, H >> 2); this.b3.setSize(W >> 3, H >> 3);
    this.starU.uPx.value = 1.3 * dpr; this.U.uVH.value = H;
    for (const m of this.lineMats ?? []) m.resolution.set(W, H);
  }
  setTime(ms) {
    this.time = ms;
    const s = sunDir(ms), m = moonDir(ms);
    this.U.uSun.value.set(...s.dir); this.U.uMoon.value.set(...m.dir); this.moonPhase = m.phase;
    const g = gmstDeg(ms) * Math.PI / 180, c = Math.cos(g), n = Math.sin(g);
    this.starU.uRot.value.set(c, n, 0, -n, c, 0, 0, 0, 1);
  }
  setEnv(e) {
    Object.assign(this.env, e); if (e.center) { this.terrainN = 0; this.atmU.uNoiseOff.value.set(0, 0, 0); }
    const A = this.atmU;
    A.uLayerN.value = this.env.layers.length;
    this.env.layers.slice(0, 4).forEach((l, i) => {
      A.uLayers.value[i].set(l.base / 1000, l.top / 1000, l.cover, l.density ?? .55);
      A.uLayerB.value[i].set(l.flat ?? 0, l.scale ?? .05, 0, l.drift ?? .0015);
    });
    A.uCloudRadius.value = this.env.radius; A.uFogVis.value = this.env.fogVis; A.uFogTop.value = this.env.fogTop;
    A.uCenter.value.copy(this.env.center).multiplyScalar(1 / 1000);
    this.U.uSea.value = this.env.sea;
  }
  place(o, v) { o.position.subVectors(v, this.camEcef); }
  render(dt, st) {
    const U = this.U, c = this.camEcef, cam = this.cam, alt = c.length() - R;
    this.simClock += dt; this.frame++;
    this.setTime(st.time);
    cam.fov = st.fov; const shift = st.shift ?? 0; if (shift > .001) cam.setViewOffset(this.cssW, this.cssH, 0, shift * this.cssH, this.cssW, this.cssH); else if (cam.view?.enabled) cam.clearViewOffset(); cam.updateProjectionMatrix();
    cam.position.set(0, 0, 0); cam.up.copy(st.up); cam.lookAt(tmp.copy(st.look).sub(c));
    cam.updateMatrixWorld();
    const nad = U.uNadir.value.copy(c).normalize(), E = U.uE0.value.set(0, 0, 1).cross(nad); if (E.lengthSq() < 1e-9) E.set(0, 1, 0); E.normalize();
    const N = U.uN0.value.copy(nad).cross(E).normalize();
    const el0 = c.dot(U.uSun.value) / c.length(), nk0 = 1 - smooth((el0 + .1) / .1);
    const mk0 = st.mapMode ?? smooth((alt - 45e3) / 80e3) * (st.target ? 1 : 1 - smooth((alt - 2.5e6) / 4e6));
    st.exposure = Math.max(st.exposure ?? 1, 1 + 1.2 * (1 - nk0) * (1 - smooth((el0 - .0175) / .035)) * (1 - smooth((alt - 60e3) / 400e3)) * (1 - mk0));
    U.uCamAlt.value = alt; U.uCamK.value = alt * (2 * R + alt); U.uCamR.value = R + alt; U.uTime.value = this.simClock; U.uExpo.value = st.exposure;
    { const t = U.tSite.value; if (t && !t.userData.mip) { t.userData.mip = 1; t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.needsUpdate = true; } }
    U.uRange.value = Math.min(Math.sqrt(2 * R * alt + alt * alt) * 1.08 + 12000, R * 1.5);
    { const lastN = this.lastOff ??= c.clone(); tmp.subVectors(c, lastN); this.lastOff.copy(c);
      const mv = Math.min(tmp.length(), Math.max(dt, .001) * 320), L = tmp.length() || 1; const dE = tmp.dot(E) / L * mv, dN = tmp.dot(N) / L * mv;
      this.oceanOff ??= new THREE.Vector2(); this.oceanOff.x = (this.oceanOff.x + dE) % 60000; this.oceanOff.y = (this.oceanOff.y + dN) % 60000; U.uOceanOff.value.copy(this.oceanOff);
      if (this.env.follow) { this.atmU.uNoiseOff.value.x += dE / 1000; this.atmU.uNoiseOff.value.y += dN / 1000; this.atmU.uCenter.value.copy(c).multiplyScalar(1 / 1000); } }
    U.uUrban.value = this.env.urban ?? smooth((U.uNightLights.value - .08) / .2); U.uGlobalCov.value = this.env.historicLights; U.uGlobalClouds.value = smooth((alt - 230000) / 400000) * this.env.historicLights;
    U.uMapK.value = mk0;
    if (this.anchor.lengthSq() > 1) { const a = tmp2.copy(this.anchor).normalize(); U.uAE.value.set(0, 0, 1).cross(a); if (U.uAE.value.lengthSq() < 1e-9) U.uAE.value.set(0, 1, 0); U.uAE.value.normalize(); U.uAN.value.copy(a).cross(U.uAE.value); } else { U.uAE.value.set(0, 1, 0); U.uAN.value.set(0, 0, 1); }
    U.uLp0.value.set(c.dot(U.uAE.value) / 1000, c.dot(U.uAN.value) / 1000);
    this.useGlobe = alt > 900000;
    this.globe.visible = this.useGlobe; this.disc.visible = !this.useGlobe;
    if (this.useGlobe) { this.globe.position.copy(c).negate(); this.globe.updateMatrixWorld(); }
    const sun = U.uSun.value, moon = U.uMoon.value;
    const elev = nad.dot(sun);
    const moonUp = clamp(nad.dot(moon) * 4 + .2);
    U.uMoonI.value = this.moonPhase * moonUp * (st.moonBoost ?? 1) * .9 + this.moonPhase * .1;
    const dayF = smooth((elev + .06) / .22);
    if (this.frame % 4 === 1 || !this.skyOk) {
      this.skyOk = true; const o = tmp.copy(nad).multiplyScalar(RK + .05), sZ = skyRad(o, nad, sun, moon, U.uMoonI.value), sH = [0, 0, 0], sM = [0, 0, 0];
      for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, d = tmp2.copy(E).multiplyScalar(Math.cos(a) * .978).addScaledVector(N, Math.sin(a) * .978).addScaledVector(nad, .208); const h = skyRad(o, d, sun, moon, U.uMoonI.value); d.addScaledVector(nad, .5).normalize(); const m = skyRad(o, d, sun, moon, U.uMoonI.value); for (let i = 0; i < 3; i++) { sH[i] += h[i] / 6; sM[i] += m[i] / 6; } }
      const fl = [.0009, .0012, .0024];
      U.uSkyZ.value.set(sZ[0] + fl[0], sZ[1] + fl[1], sZ[2] + fl[2]); U.uSkyH.value.set(sH[0] + fl[0], sH[1] + fl[1], sH[2] + fl[2]);
      U.uAmb.value.set(...[0, 1, 2].map((i) => sZ[i] * .25 + sM[i] * .45 + sH[i] * .3 + fl[i]));
      const z = skyRad(tmp.copy(nad).multiplyScalar(RK + Math.max(alt, 0) / 1000), nad, sun, moon, U.uMoonI.value);
      this.starU.uDim.value = clamp(1 - (z[0] * .3 + z[1] * .6 + z[2] * .1) * 130) ** 2 * Math.max(smooth((-elev - .07) / .1), smooth((alt - 60e3) / 100e3));
      let ov = 0; const ctr = tmp2.copy(this.env.center), far = !this.env.follow && ctr.lengthSq() > 1 && ctr.distanceTo(c) > this.env.radius * 700;
      if (!far) for (const l of this.env.layers) if (alt < l.top) ov = Math.max(ov, smooth((l.cover - .5) / .4) * clamp((l.density ?? .55) * 1.6) * (alt > l.base ? smooth((l.top - alt) / 600) : 1));
      this.starU.uDim.value *= 1 - .97 * ov;
      const dE = smooth((elev + .05) / .3), nE = lerp(.2, 1, Math.max(smooth((elev + .21) / .15), clamp(U.uMoonI.value * 2.2))); if (this.envDay == null || ((Math.abs(dE - this.envDay) > .03 || Math.abs(nE - (this.envN ?? 1)) > .05) && this.frame - (this.envF ?? -99) > 30)) { this.envF = this.frame; this.setEnvMap(dE, nE); }
    }
    this.moon.visible = !this.hidden(moon); this.blend.material.uniforms.uSunK.value = 1 - U.uMapK.value;
    this.moon.position.copy(moon).multiplyScalar(1e9); this.moon.scale.setScalar(1e9 * .0093 * 1.6); this.moon.quaternion.copy(cam.quaternion);
    this.moon.material.uniforms.uL.value.copy(sun).applyQuaternion(tmp2.set(0, 0, 0) && cam.quaternion.clone().invert());
    const sL = this.sunL; sL.position.copy(st.target ? tmp.subVectors(st.target, c) : tmp.set(0, 0, 0)).addScaledVector(sun, 400); sL.target.position.copy(st.target ? tmp.subVectors(st.target, c) : tmp.set(0, 0, 0));
    const fog = this.inCloud(st.target);
    sL.intensity = 3.6 * smooth((elev + .02) / .14) * (1 - fog * .85); sL.color.setRGB(1, lerp(.62, .97, smooth(elev / .3)), lerp(.36, .92, smooth(elev / .3)));
    sL.castShadow = this.tier.shadows && sL.intensity > .1;
    if (st.shadowSize) { const sc = sL.shadow.camera, s = st.shadowSize; sc.left = -s; sc.right = s; sc.top = s; sc.bottom = -s; sc.updateProjectionMatrix(); }
    this.moonL.position.copy(moon).multiplyScalar(400); this.moonL.intensity = U.uMoonI.value * .55;
    const tw = smooth((elev + .21) / .15), mI = clamp(U.uMoonI.value * 2.2); this.hemi.position.copy(nad); this.hemi.intensity = (.012 + .048 * Math.max(tw, mI) + dayF * .42) * (1 + fog * .6); this.hemi.groundColor.setRGB(.27, .33, .4).multiplyScalar(.25 + .75 * dayF);
    this.fill.position.copy(st.look).sub(c).normalize().negate(); const dn = this.fill.position.dot(nad); this.fill.position.addScaledVector(nad, .55).normalize();
    this.fill.intensity = (1 - dayF) * (st.fill ?? .35) * .8 * (.05 + .45 * tw + .5 * mI) * (1 - .8 * smooth((dn - .3) / .45)) * lerp(.15, 1, smooth((dn + .5) / .4));
    const A = this.atmU, inside = st.inside ?? cam.near < .3; A.uGAlb.value = U.uIce.value > .5 ? .75 : .07; A.uMoonS.value = U.uMoonI.value * (1 - smooth((elev + .1) / .12));
    A.uCam.value.copy(c).multiplyScalar(1 / 1000); { const m = cam.projectionMatrix.elements; A.uProjK.value.set(1 / m[0], 1 / m[5], m[8], m[9]); } A.uCamRot.value.setFromMatrix4(cam.matrixWorld); A.uTime.value = this.simClock; A.uFrame.value = this.frame % 64;
    { const cu = tmp.copy(A.uCenter.value).normalize(); A.uCE.value.set(0, 0, 1).cross(cu); if (A.uCE.value.lengthSq() < 1e-9) A.uCE.value.set(0, 1, 0); A.uCE.value.normalize(); A.uCN.value.copy(cu).cross(A.uCE.value); }
    A.uLayerN.value = alt > 30000 || U.uMapK.value > .998 ? 0 : this.env.layers.length; this.env.layers.slice(0, 4).forEach((l, i) => { A.uLayerB.value[i].z = (st.time / 1000 * (l.drift ?? .0015)) % 100; }); A.uHiFade.value = (1 - smooth((alt - 16000) / 14000)) * (1 - U.uMapK.value) ** 2;
    const lightning = !!st.flashPos, fl = st.flash ?? 0;
    A.uFlash.value = lightning ? fl : 0; if (st.flashPos) A.uFlashPos.value.copy(st.flashPos).multiplyScalar(1 / 1000);
    this.fireGlow(st, fl, lightning);
    if (this.smokes?.length) { this.smokes = this.smokes.filter((p) => p.parent); for (const p of this.smokes) { const u = p.material.uniforms.uShort; if (u.value < 0) { const b = p.geometry.attributes.aB.array; let s = 0, n = 0; for (let i = 1; i < b.length; i += 3) if (b[i] > 0) { s += b[i]; n++; } if (n) u.value = s / n < 7 ? 1 : 0; } } }
    const r = this.renderer;
    this.blend.visible = false; this.fireball.visible = false;
    cam.layers.set(1); this.scene.overrideMaterial = this.depthMat;
    const shadowAuto = r.shadowMap.autoUpdate; r.shadowMap.autoUpdate = false;
    r.setRenderTarget(this.depthRT); r.clear(); r.render(this.scene, cam);
    this.scene.overrideMaterial = null; cam.layers.set(0);
    { const e = this.useGlobe ? this.globe : this.disc, m = e.material; e.material = this.depthEarth[this.useGlobe ? 0 : 1]; r.render(e, cam); e.material = m; }
    cam.layers.enable(1);
    r.shadowMap.autoUpdate = shadowAuto;
    this.fs.material = this.atmM; r.setRenderTarget(this.atmRT); r.render(this.fsScene, this.fsCam);
    cam.getWorldDirection(tmp); const turn = tmp.distanceTo(this.lastDir); this.lastDir.copy(tmp);
    const am = this.accM.uniforms; am.uDelta.value.subVectors(c, this.prevCam).multiplyScalar(1 / 1000);
    am.uA.value = this.frame < 3 || st.reset ? 1 : clamp(.11 + turn * 4, .11, 1);
    am.tH.value = this.acA.texture; this.fs.material = this.accM; r.setRenderTarget(this.acB); r.render(this.fsScene, this.fsCam);
    this.prevCam.copy(c); this.prevK.copy(A.uProjK.value); this.prevInv.copy(A.uCamRot.value).transpose();
    this.blend.material.uniforms.tA.value = this.acB.texture; [this.acA, this.acB] = [this.acB, this.acA];
    this.blend.visible = true; this.fireball.visible = this.fireK > .01;
    r.setRenderTarget(this.sceneRT); r.setClearColor(0x000000, 1); r.clear();
    r.render(this.scene, cam);
    const ex = st.exposure ?? 1;
    if (this.tier.bloom) {
      const b = this.brightM.uniforms;
      this.fs.material = this.brightM;
      b.tS.value = this.sceneRT.texture; b.uPx.value.set(1 / this.W, 1 / this.H); b.uK.value = 2.4; b.uE.value = ex; r.setRenderTarget(this.b1); r.render(this.fsScene, this.fsCam);
      b.uK.value = 0; b.uE.value = 1;
      b.tS.value = this.b1.texture; b.uPx.value.set(2 / this.W, 2 / this.H); r.setRenderTarget(this.b2); r.render(this.fsScene, this.fsCam);
      b.tS.value = this.b2.texture; b.uPx.value.set(4 / this.W, 4 / this.H); r.setRenderTarget(this.b3); r.render(this.fsScene, this.fsCam);
    }
    const f = this.finalM.uniforms; f.uExp.value = ex; f.uBloom.value = this.tier.bloom ? (inside ? .3 : 1) : 0; f.uFade.value = st.fade ?? 0; f.uTime.value = this.frame % 97; if (st.tint) f.uTint.value.set(...st.tint); else f.uTint.value.set(0, 0, 0);
    this.fs.material = this.finalM; r.setRenderTarget(null); r.render(this.fsScene, this.fsCam);
  }
  inCloud(p) {
    if (!p) return 0; const e = this.env, h = p.length() - R; let k = 0;
    if (!e.follow && tmp2.copy(p).sub(e.center).length() > e.radius * 600) return 0;
    for (const l of e.layers) if (l.cover >= .7 && h > l.base && h < l.top) k = Math.max(k, smooth((h - l.base) / 150) * clamp((l.cover - .6) * 2.5) * clamp((l.density ?? .55) * 1.4) * (1 - .6 * smooth((h - l.top + 400) / 400)));
    return k;
  }
  hidden(dir) {
    const c = this.camEcef, b = c.dot(dir), h = b * b - c.lengthSq() + (R + 20000) ** 2;
    return h > 0 && -b - Math.sqrt(h) > 0;
  }
  fireGlow(st, fl, lightning) {
    let n = 0; const P = tmp2.set(0, 0, 0);
    this.fires = (this.fires || []).filter((p) => p.parent);
    for (const p of this.fires) {
      const T = p.material.uniforms.uT.value, b = p.geometry.attributes.aB.array, x = p.geometry.attributes.position.array;
      for (let i = 0; i < b.length; i += 3) { const age = T - b[i]; if (age >= 0 && age < b[i + 1]) { const k = 1 - age / b[i + 1]; n += k; P.x += x[i] * k; P.y += x[i + 1] * k; P.z += x[i + 2] * k; } }
    }
    if (this.fires.length && st.target) { const T = this.fires[0].material.uniforms.uT.value, lt = this.fireLast; if (lt && T !== lt.T) { tmp.subVectors(st.target, lt.P).multiplyScalar(1 / (T - lt.T)); if (tmp.length() < 400 && T > lt.T) this.fireV.lerp(tmp, .35); } this.fireLast = { T, P: st.target.clone() }; }
    const g = this.atmU.uGlowCol.value, pl = this.fireL;
    if (n > .5) { P.multiplyScalar(1 / n).add(this.anchor); const k = Math.min(n / 60, 6); this.atmU.uGlowPos.value.copy(P).multiplyScalar(1 / 1000); g.set(1, .42, .12).multiplyScalar(k * .02 * (1 + .25 * Math.sin(this.simClock * 23) * Math.sin(this.simClock * 7.3))); pl.position.subVectors(P, this.camEcef); pl.intensity = k * 2e3; }
    else { g.set(0, 0, 0); pl.intensity = 0; }
    this.fireK = !lightning && st.target ? fl : 0;
    if (this.fireK > .01) {
      const k = this.fireK; this.fireball.position.subVectors(st.target, this.camEcef); this.fireball.scale.setScalar(14 + 16 * (1 - Math.min(k / 3, 1))); this.fireball.material.color.setRGB(4.5, 3.4, 2.2).multiplyScalar(Math.min(k, 3) / (1 + (st.exposure ?? 1) * .5));
      pl.position.copy(this.fireball.position); pl.intensity = Math.max(pl.intensity, k * 8e3);
      if (g.x < k * .05) { this.atmU.uGlowPos.value.copy(st.target).multiplyScalar(1 / 1000); g.set(1, .6, .3).multiplyScalar(k * .05); }
    }
  }
  makeLine({ points, colors, width = 2, opacity = 1, dashed = false }) {
    const g = new LineGeometry(), pos = [], col = [];
    points.forEach((p, i) => { pos.push(p.x - this.anchor.x, p.y - this.anchor.y, p.z - this.anchor.z); const c = colors?.[i] || [1, 1, 1]; col.push(c[0], c[1], c[2]); });
    g.setPositions(pos); g.setColors(col);
    const m = new LineMaterial({ vertexColors: true, linewidth: width, transparent: true, opacity, depthWrite: false, dashed, dashSize: dashed ? 22000 : 1, gapSize: dashed ? 16000 : 1, worldUnits: false });
    m.resolution.set(this.W || 1, this.H || 1); (this.lineMats ??= []).push(m);
    const l = new Line2(g, m); l.computeLineDistances(); l.frustumCulled = false; l.renderOrder = 110; this.scene.add(l); this.movers.push(l); l.userData.count = points.length;
    return l;
  }
  removeLine(l) { this.scene.remove(l); l.geometry.dispose(); l.material.dispose(); this.movers = this.movers.filter((m) => m !== l); this.lineMats = this.lineMats.filter((m) => m !== l.material); }
  syncMovers() { for (const m of this.movers) m.position.subVectors(this.anchor, this.camEcef); }
  project(v, out = new THREE.Vector3()) {
    out.subVectors(v, this.camEcef).applyMatrix4(this.cam.matrixWorldInverse);
    const z = out.z; out.applyMatrix4(this.cam.projectionMatrix);
    return { x: (out.x * .5 + .5) * this.cssW, y: (-out.y * .5 + .5) * this.cssH, behind: z > 0 };
  }
  occluded(v) {
    const d = tmp.subVectors(v, this.camEcef), L = d.length(); d.multiplyScalar(1 / L);
    const b = this.camEcef.dot(d), c2 = this.camEcef.lengthSq() - R * R, h = b * b - c2;
    if (h < 0) return false; const t = -b - Math.sqrt(h); return t > 0 && t < L - 2000;
  }
}
export function terrainMaterial(world, map, flat, edge) {
  const g = world.globe.material.uniforms, U = world.U;
  return new THREE.ShaderMaterial({ vertexShader: TERRAIN_VERT, fragmentShader: TERRAIN_FRAG, side: THREE.DoubleSide, alphaToCoverage: !!world.tier.msaa, uniforms: { uA2C: { value: world.tier.msaa ? 1 : 0 }, tMap: { value: map }, tDay: g.tDay, tNight: g.tNight, tTrans: U.tTrans, uSun: U.uSun, uMoon: U.uMoon, uMoonI: U.uMoonI, uNadir: U.uNadir, uSkyH: U.uSkyH, uSkyZ: U.uSkyZ, uNightLights: U.uNightLights, uUrban: U.uUrban, tPuff: U.tPuff, uCamK: U.uCamK, uCamR: U.uCamR, uExpo: U.uExpo, uMapK: U.uMapK, uAE: U.uAE, uAN: U.uAN, uLp0: U.uLp0, uAmb: U.uAmb, tSite: U.tSite, uSiteBox: U.uSiteBox, uCamE: { value: world.camEcef }, uEdge: { value: (edge ?? (world.terrainN++ === 0)) ? 1 : 0 }, uFlat: { value: flat } } });
}
export function makeParticles(world, kind, count) {
  const g = new THREE.BufferGeometry();
  const a = new Float32Array(count * 3), v = new Float32Array(count * 4), b = new Float32Array(count * 3);
  g.setAttribute('position', new THREE.BufferAttribute(a, 3)); g.setAttribute('aVel', new THREE.BufferAttribute(v, 4)); g.setAttribute('aB', new THREE.BufferAttribute(b, 3));
  const fire = kind === 'fire', U = world.U;
  world.fireV ??= new THREE.Vector3();
  const m = new THREE.ShaderMaterial({
    uniforms: { uT: { value: 0 }, uScale: { value: 1 }, uShort: { value: -1 }, uKind: { value: { vapour: 1, dust: 2 }[kind] ?? 0 }, uAmb: U.uAmb, uSun: U.uSun, uCamE: { value: world.camEcef }, uClock: U.uTime, uExpo: U.uExpo, uVH: U.uVH, tN: U.tPuff, uFireV: { value: world.fireV } }, transparent: true, depthWrite: false,
    blending: fire ? THREE.CustomBlending : THREE.NormalBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `attribute vec4 aVel; attribute vec3 aB; uniform float uT,uScale,uClock,uExpo,uVH,uKind,uShort; uniform vec3 uSun,uAmb,uCamE,uFireV; varying vec4 vC; varying vec4 vE; varying vec4 vR; varying vec3 vS;
#include <common>
#include <logdepthbuf_pars_vertex>
void main(){ float age=uT-aB.x, life=aB.y, y=clamp(age/life,0.,1.), sd=fract(sin(dot(aVel.xyz,vec3(12.9,78.2,37.7)))*4375.5);
 vec3 wp=(modelMatrix*vec4(position,1.)).xyz, U=normalize(uCamE+wp);
 float kd=uKind; if(kd<.5&&uShort>.5) kd=length(uCamE+wp)-6371000.>2500.?1.:2.;
 float vap=step(.5,kd)*step(kd,1.5), dust=step(1.5,kd);
 vec3 p=position+aVel.xyz*(1.-exp(-age*.35))/.35*(1.+dust*1.5)+U*age*${fire ? '1.8' : '2.2*(1.-vap*.9)*(1.-dust*.8)'};
 vec4 mv=modelViewMatrix*vec4(p,1.);
 float on=(age<0.||age>life)?0.:1., an=sd*6.28+uClock*(sd-.5)*${fire ? '1.6' : '.25'}, dist=max(-mv.z,1.);
 vR=vec4(cos(an),sin(an),sd,vap); vS=vec3(1.,0.,0.);
 float su=dot(U,uSun); vec3 sunC=mix(vec3(1.,.5,.26),vec3(1.,.96,.9),smoothstep(.04,.4,su))*2.4*smoothstep(-.06,.2,su);
 vec3 amb=mix(uAmb,vec3(dot(uAmb,vec3(.3,.6,.1))),.65);
 ${fire ? `float hot=1.-y, fl=.7+.6*fract(sin(floor(uClock*15.+sd*7.)+sd*91.)*43758.5);
 vec3 c=mix(vec3(.5,.06,.006),mix(vec3(1.,.32,.05),vec3(1.3,.75,.3),smoothstep(.86,1.,hot)),smoothstep(.55,.9,hot));
 vE=vec4(c*smoothstep(0.,.03,y)*(1.-smoothstep(.12,.45,y))*fl*1.5/(1.+uExpo*.8),hot*hot*fl);
 vC=vec4(vec3(.05,.042,.034)+amb*.1+sunC*.012,smoothstep(.12,.34,y)*pow(1.-y,1.3)*.8);
 float sz=aB.z*(.9+1.5*sqrt(y))*(1.+aVel.w*.6)*mix(.42,1.,smoothstep(60.,700.,dist));
 float rp=min(uScale*sz/dist,uVH*.055);
 vec3 sv=(viewMatrix*vec4(uFireV,0.)).xyz*(.08+.3*(1.-y));
 vec3 q1=mv.xyz+sv; vec2 D=(mv.xy/dist-q1.xy/max(-q1.z,1.))*uScale; float Lp=min(length(D),uVH*.1);
 vS=vec3(Lp>.5?D/length(D):vec2(1.,0.),Lp/(2.*rp+Lp));
 gl_PointSize=on*(2.*rp+Lp);` : `vE=vec4(0.);
 float ph=mix(.35,1.8,pow(max(dot(normalize(wp),uSun)*.5+.5,0.),5.));
 vec3 base=vap>.5?vec3(.78,.8,.83):dust>.5?vec3(.52,.44,.34):vec3(.05,.047,.044);
 vC=vec4(base*(amb*2.2+sunC*(vap>.5?.3*ph:dust>.5?.45:.35)+dust*vec3(.011,.0105,.0098)),vap>.5?smoothstep(0.,.06,y)*pow(1.-y,1.6)*.5:dust>.5?smoothstep(0.,.1,y)*pow(1.-y,1.5)*.45:smoothstep(0.,.15,y)*pow(1.-y,2.)*.75);
 float sa=sqrt(max(age,0.)), sz=aB.z*(vap>.5?.25+aVel.w*2.2*sa:dust>.5?.4+aVel.w*1.6*sa:.35+aVel.w*1.1*sa);
 float ps=uScale*sz/dist; if(dust>.5){ vec3 wd=normalize(cross(U,vec3(.3,.2,1.))); vec4 m2=modelViewMatrix*vec4(p+wd*aB.z*1.6,1.); vec2 D=(m2.xy/max(-m2.z,1.)-mv.xy/dist)*uScale; float Lp=length(D), e=1.+min(Lp/max(ps,1.),2.2); vS=vec3(Lp>.5?D/Lp:vec2(1.,0.),e); ps*=e; }
 gl_PointSize=on*min(ps,uVH*.22);`}
 gl_Position=projectionMatrix*mv;
#include <logdepthbuf_vertex>
}`,
    fragmentShader: `varying vec4 vC; varying vec4 vE; varying vec4 vR; varying vec3 vS; uniform sampler2D tN; uniform float uClock;
#include <common>
#include <logdepthbuf_pars_fragment>
void main(){
#include <logdepthbuf_fragment>
 vec2 q=(gl_PointCoord-.5)*vec2(1.,-1.);
 ${fire ? `float h=vS.z*.5, rr=max(.5-h,.02), al_=dot(q,vS.xy), pe=dot(q,vec2(-vS.y,vS.x));
 float ax=clamp(al_/max(h,1e-3),-1.,1.), r=length(vec2(max(abs(al_)-h,0.),pe))/(rr*(1.-.35*max(ax,0.)));
 if(r>1.)discard;
 vec2 nq=vec2(al_/rr*.22,pe/rr*.35)+vR.z*7.+vec2(uClock*.35,0.);
 vec4 nz=texture2D(tN,nq), nz2=texture2D(tN,nq*2.7+.37);
 float n=nz.r*.55+nz2.r*.45;
 float s=(1.-smoothstep(.0,1.,r+(n-.5)*1.1))*(1.-smoothstep(.55,1.,r));
 float dz=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 float al=clamp(vC.a*s+dz*.012,0.,1.), core=pow(s,2.2);
 gl_FragColor=vec4(vE.rgb*(core*(.45+1.1*n)*mix(vec3(1.,.7,.45),vec3(1.),core)+pow(s,6.)*vE.a*2.)+vC.rgb*al,al);` : `float n;
 if(vS.z>1.){ q=vec2(dot(q,vS.xy),dot(q,vec2(-vS.y,vS.x))*vS.z); vec4 a1=texture2D(tN,vec2(q.x*.35,q.y*1.1)+vR.z*7.+vec2(uClock*.05,0.)), a2=texture2D(tN,vec2(q.x*.9,q.y*2.6)+vR.z*3.+.37); n=a1.r*.5+a2.r*.3+a2.g*.2; }
 else { q=mat2(vR.x,-vR.y,vR.y,vR.x)*q; vec4 nz=texture2D(tN,q*.45+vR.z*7.); n=nz.r*.65+nz.g*.35; }
 float r=length(q)*2.; if(r>1.)discard;
 float s=(1.-smoothstep(mix(.35,.12,vR.w),.95,r+(n-.5)*mix(.85,.5,vR.w)))*(1.-smoothstep(.7,1.,r));
 float dz=fract(sin(dot(gl_FragCoord.xy,vec2(12.9898,78.233)))*43758.5453)-.5;
 float al=clamp(vC.a*s+dz*.012,0.,1.);
 gl_FragColor=vec4(vC.rgb*(.8+.4*n),al);`}
}`,
  });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = fire ? 121 : 120; world.scene.add(p); world.movers.push(p);
  if (fire) (world.fires ??= []).push(p); else (world.smokes ??= []).push(p);
  return p;
}
export { Line2, enu, latLonOf, dirOf, ecef };
