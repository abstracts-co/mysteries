import { Vector3 } from 'three';
export const R = 6371000, D2R = Math.PI / 180, R2D = 180 / Math.PI;
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, t) => a + (b - a) * t;
export const smooth = (x) => { x = clamp(x); return x * x * (3 - 2 * x); };
export function dirOf(lat, lon, v = new Vector3()) {
  const p = lat * D2R, l = lon * D2R, c = Math.cos(p);
  return v.set(c * Math.cos(l), c * Math.sin(l), Math.sin(p));
}
export function ecef(lat, lon, alt = 0, v = new Vector3()) { return dirOf(lat, lon, v).multiplyScalar(R + alt); }
export function latLonOf(v) { const r = v.length(); return { lat: Math.asin(v.z / r) * R2D, lon: Math.atan2(v.y, v.x) * R2D, alt: r - R }; }
export function enu(lat, lon) {
  const up = dirOf(lat, lon), east = new Vector3(0, 0, 1).cross(up);
  if (east.lengthSq() < 1e-9) east.set(0, 1, 0);
  east.normalize();
  return { east, north: up.clone().cross(east).normalize(), up };
}
export function headingVector(lat, lon, hdg, pitch = 0, v = new Vector3()) {
  const { east, north, up } = enu(lat, lon), h = hdg * D2R, p = pitch * D2R;
  return v.copy(north).multiplyScalar(Math.cos(h) * Math.cos(p)).addScaledVector(east, Math.sin(h) * Math.cos(p)).addScaledVector(up, Math.sin(p));
}
export function gcDistance(a, b) {
  const p1 = a.lat * D2R, p2 = b.lat * D2R, dp = p2 - p1, dl = (b.lon - a.lon) * D2R;
  const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
export function bearing(a, b) {
  const p1 = a.lat * D2R, p2 = b.lat * D2R, dl = (b.lon - a.lon) * D2R;
  return (Math.atan2(Math.sin(dl) * Math.cos(p2), Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl)) * R2D + 360) % 360;
}
export function destination(lat, lon, brg, dist) {
  const d = dist / R, b = brg * D2R, p = lat * D2R, l = lon * D2R;
  const p2 = Math.asin(Math.sin(p) * Math.cos(d) + Math.cos(p) * Math.sin(d) * Math.cos(b));
  const l2 = l + Math.atan2(Math.sin(b) * Math.sin(d) * Math.cos(p), Math.cos(d) - Math.sin(p) * Math.sin(p2));
  return { lat: p2 * R2D, lon: ((l2 * R2D + 540) % 360) - 180 };
}
export function shortAngle(a, b) { return ((b - a + 540) % 360) - 180; }
