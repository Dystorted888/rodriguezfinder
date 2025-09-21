export function toRad(d: number) { return d * Math.PI / 180; }
export function toDeg(r: number) { return r * 180 / Math.PI; }

export function bearing(from: {lat:number,lng:number}, to: {lat:number,lng:number}) {
  const φ1 = toRad(from.lat), φ2 = toRad(to.lat);
  const Δλ = toRad(to.lng - from.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1)*Math.cos(φ2)*Math.cos(Δλ) + Math.sin(φ1)*Math.sin(φ2);
  return (toDeg(Math.atan2(y, x)) + 360) % 360;
}

export function haversine(from: {lat:number,lng:number}, to: {lat:number,lng:number}) {
  const R = 6371000;
  const φ1 = toRad(from.lat), φ2 = toRad(to.lat);
  const Δφ = φ2 - φ1, Δλ = toRad(to.lng - from.lng);
  const a = Math.sin(Δφ/2)**2 + Math.cos(φ1)*Math.cos(φ2)*Math.sin(Δλ/2)**2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}