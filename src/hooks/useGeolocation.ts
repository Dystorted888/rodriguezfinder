import { useEffect, useRef, useState } from 'react';

export type Geo = {
  lat: number;
  lng: number;
  accuracy?: number;
  headingFromGPS?: number | null; // 0..360, only when moving
  speed?: number | null;          // m/s
  timestamp: number;
} | null;

export function useGeolocation(active: boolean) {
  const [pos, setPos] = useState<Geo>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    if (!('geolocation' in navigator)) return;

    watchId.current = navigator.geolocation.watchPosition((p) => {
      const { latitude: lat, longitude: lng, accuracy, heading, speed } = p.coords as any;
      setPos({
        lat, lng,
        accuracy: typeof accuracy === 'number' ? accuracy : undefined,
        headingFromGPS: typeof heading === 'number' && !Number.isNaN(heading) ? (heading + 360) % 360 : null,
        speed: typeof speed === 'number' && !Number.isNaN(speed) ? speed : null,
        timestamp: Date.now()
      });
    }, (err) => {
      console.warn('geo error', err);
    }, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 7000
    });

    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [active]);

  return pos;
}
