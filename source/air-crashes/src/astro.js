import { D2R, R2D } from './geo.js';
const jd = (t) => t / 86400000 + 2440587.5;
const norm = (x) => ((x % 360) + 360) % 360;
export function gmstDeg(t) {
  const d = jd(t) - 2451545.0, T = d / 36525;
  return norm(280.46061837 + 360.98564736629 * d + 0.000387933 * T * T);
}
const eqToDir = (ra, dec, gmst) => {
  const h = (ra - gmst) * D2R, c = Math.cos(dec * D2R);
  return [c * Math.cos(h), c * Math.sin(h), Math.sin(dec * D2R)];
};
function eclToEq(lam, bet, eps) {
  const l = lam * D2R, b = bet * D2R, e = eps * D2R;
  const ra = Math.atan2(Math.sin(l) * Math.cos(e) - Math.tan(b) * Math.sin(e), Math.cos(l)) * R2D;
  const dec = Math.asin(Math.sin(b) * Math.cos(e) + Math.cos(b) * Math.sin(e) * Math.sin(l)) * R2D;
  return [norm(ra), dec];
}
export function sunDir(t) {
  const d = jd(t) - 2451545.0, g = norm(357.529 + 0.98560028 * d) * D2R, q = norm(280.459 + 0.98564736 * d);
  const lam = q + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g), eps = 23.439 - 0.00000036 * d;
  const [ra, dec] = eclToEq(lam, 0, eps);
  return { dir: eqToDir(ra, dec, gmstDeg(t)), lam };
}
export function moonDir(t) {
  const d = jd(t) - 2451545.0, T = d / 36525;
  const Lp = norm(218.316 + 481267.8813 * T), M = norm(134.963 + 477198.8676 * T) * D2R, Ms = norm(357.529 + 35999.05 * T) * D2R;
  const D = norm(297.85 + 445267.1115 * T) * D2R, F = norm(93.272 + 483202.0175 * T) * D2R;
  const lam = Lp + 6.289 * Math.sin(M) + 1.274 * Math.sin(2 * D - M) + 0.658 * Math.sin(2 * D) + 0.214 * Math.sin(2 * M) - 0.186 * Math.sin(Ms) - 0.114 * Math.sin(2 * F);
  const bet = 5.128 * Math.sin(F) + 0.28 * Math.sin(M + F) + 0.277 * Math.sin(M - F) + 0.173 * Math.sin(2 * D - F);
  const eps = 23.439 - 0.013 * T, [ra, dec] = eclToEq(lam, bet, eps);
  const sun = sunDir(t).lam, elong = Math.acos(Math.cos((lam - sun) * D2R) * Math.cos(bet * D2R));
  return { dir: eqToDir(ra, dec, gmstDeg(t)), phase: (1 - Math.cos(elong)) / 2 };
}
export function subsolar(t) { const [x, y, z] = sunDir(t).dir; return { lat: Math.asin(z) * R2D, lon: Math.atan2(y, x) * R2D }; }
