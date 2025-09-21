// src/utils/geo.ts
export function toRad(d: number) { return d * Math.PI / 180; }
export function toDeg(r: number) { return r * 180 / Math.PI; }

/**
 * Initial bearing (forward azimuth) from `from` to `to`, degrees clockwise from true North (0..360).
 * This is the standard great-circle formula.
 */
export function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const φ1 = toRad(from.lat);
  const φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return (toDeg(θ) + 360) % 360;
}

/** Haversine distance in meters */
export function haversine(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const R = 6371000;
  const φ1 = toRad(from.lat), φ2 = toRad(to.lat);
  const Δφ = φ2 - φ1, Δλ = toRad(to.lng - from.lng);
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
