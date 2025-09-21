import { useEffect, useRef, useState } from 'react';

export type Geo = {
  lat: number;
  lng: number;
  accuracy?: number;
  headingFromGPS?: number | null; // 0..360, only when moving
  speed?: number | null;          // m/s
  timestamp: number;
} | null;

export function useGeolocation(active: boolean, intervalMs = 5000) {
  const [pos, setPos] = useState<Geo>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (!('geolocation' in navigator)) return;
      navigator.geolocation.getCurrentPosition((p) => {
        const { latitude: lat, longitude: lng, accuracy, heading, speed } = p.coords as any;
        setPos({
          lat, lng,
          accuracy: accuracy ?? undefined,
          headingFromGPS: typeof heading === 'number' && !Number.isNaN(heading) ? (heading + 360) % 360 : null,
          speed: typeof speed === 'number' && !Number.isNaN(speed) ? speed : null,
          timestamp: Date.now()
        });
      }, (err) => {
        console.warn('geo error', err);
      }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 4000 });
    };

    tick();
    timer.current = window.setInterval(tick, intervalMs);

    const onVis = () => {
      if (document.visibilityState === 'visible') {
        if (timer.current) clearInterval(timer.current);
        timer.current = window.setInterval(tick, intervalMs);
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    return () => {
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [active, intervalMs]);

  return pos;
}
