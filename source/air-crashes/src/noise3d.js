import { Data3DTexture, LinearFilter, LinearMipmapLinearFilter, RGBAFormat, RepeatWrapping, UnsignedByteType } from 'three';
export function makeNoise3D(size = 64) {
  const data = new Uint8Array(size * size * size * 4);
  const pts = (n, seed) => {
    let s = seed; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    const a = new Float32Array(n * n * n * 3);
    for (let i = 0; i < a.length; i++) a[i] = rnd();
    return a;
  };
  const worley = (x, y, z, n, p) => {
    const xf = x * n, yf = y * n, zf = z * n, xi = Math.floor(xf), yi = Math.floor(yf), zi = Math.floor(zf);
    let m = 9;
    for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const cx = (xi + i + n) % n, cy = (yi + j + n) % n, cz = (zi + k + n) % n, id = (cx + cy * n + cz * n * n) * 3;
      const dx = xi + i + p[id] - xf, dy = yi + j + p[id + 1] - yf, dz = zi + k + p[id + 2] - zf, d = dx * dx + dy * dy + dz * dz;
      if (d < m) m = d;
    }
    return 1 - Math.min(1, Math.sqrt(m));
  };
  const lat = (n, seed) => { const a = pts(n, seed); return a; };
  const vn = (x, y, z, n, p) => {
    const xf = x * n, yf = y * n, zf = z * n, xi = Math.floor(xf), yi = Math.floor(yf), zi = Math.floor(zf);
    const u = xf - xi, v = yf - yi, w = zf - zi, f = (t) => t * t * (3 - 2 * t), fu = f(u), fv = f(v), fw = f(w);
    const g = (a, b, c) => p[(((a % n) + n) % n + ((b % n) + n) % n * n + ((c % n) + n) % n * n * n) * 3];
    const m = (a, b, t) => a + (b - a) * t;
    return m(m(m(g(xi, yi, zi), g(xi + 1, yi, zi), fu), m(g(xi, yi + 1, zi), g(xi + 1, yi + 1, zi), fu), fv), m(m(g(xi, yi, zi + 1), g(xi + 1, yi, zi + 1), fu), m(g(xi, yi + 1, zi + 1), g(xi + 1, yi + 1, zi + 1), fu), fv), fw);
  };
  const w1 = pts(5, 11), w2 = pts(10, 23), w3 = pts(20, 37), v1 = lat(4, 47), v2 = lat(8, 59), v3 = lat(16, 71), lowv = lat(3, 97), low6 = lat(6, 113), low2 = pts(6, 101);
  let k = 0;
  for (let z = 0; z < size; z++) for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const X = x / size, Y = y / size, Z = z / size;
    const wf = worley(X, Y, Z, 5, w1) * .625 + worley(X, Y, Z, 10, w2) * .25 + worley(X, Y, Z, 20, w3) * .125;
    const pf = vn(X, Y, Z, 4, v1) * .55 + vn(X, Y, Z, 8, v2) * .3 + vn(X, Y, Z, 16, v3) * .15;
    const pw = Math.min(1, Math.max(0, (pf - (1 - wf)) / (1 - (1 - wf) + 1e-3) * .55 + wf * .6));
    data[k++] = pw * 255;
    data[k++] = wf * 255;
    data[k++] = Math.min(255, (vn(X, Y, Z, 3, lowv) * .68 + vn(X, Y, Z, 6, low6) * .32) * 255 * 1.05);
    data[k++] = worley(X, Y, Z, 6, low2) * 255;
  }
  const t = new Data3DTexture(data, size, size, size);
  t.format = RGBAFormat; t.type = UnsignedByteType; t.minFilter = LinearMipmapLinearFilter; t.magFilter = LinearFilter;
  t.wrapS = t.wrapT = t.wrapR = RepeatWrapping; t.generateMipmaps = true; t.needsUpdate = true; t.unpackAlignment = 1;
  return t;
}

export function makeWaveTex(THREE, size = 256) {
  let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const K = [];
  for (let kx = -40; kx <= 40; kx++) for (let ky = -40; ky <= 40; ky++) {
    const k = Math.hypot(kx, ky); if (k < 1 || k > 40) continue;
    const dir = (kx * .82 + ky * .57) / k, spread = Math.pow(Math.max(0, .45 + .55 * dir), 2.5);
    const a = Math.pow(k, -1.75) * spread * (.65 + rnd() * .7) * Math.exp(-Math.pow(1.4 / k, 2) * .4);
    if (a < 2.5e-4) continue;
    K.push([kx, ky, a, rnd() * 6.2832]);
  }
  K.sort((p, q) => q[2] - p[2]); K.length = Math.min(K.length, size > 200 ? 420 : 240);
  const N = size, hx = new Float32Array(N * N), hy = new Float32Array(N * N), h = new Float32Array(N * N), lap = new Float32Array(N * N);
  const cosT = new Float32Array(N * 2), sinT = new Float32Array(N * 2);
  for (const [kx, ky, a, ph] of K) {
    const wx = 2 * Math.PI * kx / N, wy = 2 * Math.PI * ky / N;
    for (let x = 0; x < N; x++) { cosT[x] = Math.cos(wx * x + ph); sinT[x] = Math.sin(wx * x + ph); }
    const cy = new Float32Array(N), sy = new Float32Array(N);
    for (let y = 0; y < N; y++) { cy[y] = Math.cos(wy * y); sy[y] = Math.sin(wy * y); }
    const kk = (kx * kx + ky * ky);
    for (let y = 0, i = 0; y < N; y++) for (let x = 0; x < N; x++, i++) {
      const c = cosT[x] * cy[y] - sinT[x] * sy[y], s = sinT[x] * cy[y] + cosT[x] * sy[y];
      h[i] += a * c; hx[i] -= a * kx * s; hy[i] -= a * ky * s; lap[i] -= a * kk * c;
    }
  }
  const norm = (arr) => { let m = 1e-6; for (let i = 0; i < arr.length; i++) m = Math.max(m, Math.abs(arr[i])); return m; };
  const nS = Math.max(norm(hx), norm(hy)), nH = norm(h), nL = norm(lap), d = new Uint8Array(N * N * 4);
  for (let i = 0; i < N * N; i++) {
    d[i * 4] = (hx[i] / nS * .5 + .5) * 255; d[i * 4 + 1] = (hy[i] / nS * .5 + .5) * 255;
    d[i * 4 + 2] = Math.min(255, Math.max(0, -lap[i] / nL * .9 + .45) * 255 * (h[i] > 0 ? 1 : .55)); d[i * 4 + 3] = (h[i] / nH * .5 + .5) * 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.anisotropy = 8; t.needsUpdate = true;
  return t;
}

export function makeBlueNoise(THREE, N = 64) {
  const n = N * N, R = 5, ker = [], E = new Float32Array(n), on = new Uint8Array(n), rank = new Uint16Array(n);
  for (let y = -R; y <= R; y++) for (let x = -R; x <= R; x++) ker.push(x, y, Math.exp(-(x * x + y * y) / 4.5));
  const add = (i, s) => { const x = i % N, y = (i / N) | 0; for (let k = 0; k < ker.length; k += 3) E[((y + ker[k + 1] + N) % N) * N + (x + ker[k] + N) % N] += s * ker[k + 2]; };
  const pick = (want) => { let b = want ? -1 : 1e9, bi = 0; for (let i = 0; i < n; i++) if (on[i] === want && (want ? E[i] > b : E[i] < b)) { b = E[i]; bi = i; } return bi; };
  let seed = 3; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const m = n / 10 | 0; for (let c = 0; c < m;) { const i = rnd() * n | 0; if (!on[i]) { on[i] = 1; add(i, 1); c++; } }
  for (let g = 0; g < n; g++) { const t = pick(1); on[t] = 0; add(t, -1); const v = pick(0); on[v] = 1; add(v, 1); if (v === t) break; }
  const on0 = on.slice(), E0 = E.slice();
  for (let r = m - 1; r >= 0; r--) { const t = pick(1); on[t] = 0; add(t, -1); rank[t] = r; }
  on.set(on0); E.set(E0);
  for (let r = m; r < n; r++) { const v = pick(0); on[v] = 1; add(v, 1); rank[v] = r; }
  const d = new Uint8Array(n); for (let i = 0; i < n; i++) d[i] = rank[i] * 256 / n;
  const t = new THREE.DataTexture(d, N, N, THREE.RedFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
}

export function makePuffTex(THREE, N = 128) {
  let seed = 19; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const d = new Uint8Array(N * N * 4), oct = [[6, .55], [12, .3], [24, .15]].map(([c, w]) => { const p = new Float32Array(c * c * 2); for (let i = 0; i < p.length; i++) p[i] = rnd(); return [c, w, p]; });
  const vn = [[4, .5], [8, .3], [16, .2]].map(([c, w]) => { const p = new Float32Array(c * c); for (let i = 0; i < p.length; i++) p[i] = rnd(); return [c, w, p]; });
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    let wv = 0, pv = 0;
    for (const [c, w, p] of oct) { const fx = x / N * c, fy = y / N * c, ix = Math.floor(fx), iy = Math.floor(fy); let m = 9; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const cx = (ix + i + c) % c, cy = (iy + j + c) % c, k = (cy * c + cx) * 2, dx = ix + i + p[k] - fx, dy = iy + j + p[k + 1] - fy; m = Math.min(m, dx * dx + dy * dy); } wv += w * (1 - Math.min(1, Math.sqrt(m))); }
    for (const [c, w, p] of vn) { const fx = x / N * c, fy = y / N * c, ix = Math.floor(fx), iy = Math.floor(fy), u = sm(fx - ix), v = sm(fy - iy), g = (a, b) => p[((b % c) * c + (a % c))]; pv += w * ((g(ix, iy) * (1 - u) + g(ix + 1, iy) * u) * (1 - v) + (g(ix, iy + 1) * (1 - u) + g(ix + 1, iy + 1) * u) * v); }
    const o = (y * N + x) * 4; d[o] = Math.min(255, wv * 1.25 * 255); d[o + 1] = pv * 255; d[o + 2] = 0; d[o + 3] = 255;
  }
  const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return t;
}
