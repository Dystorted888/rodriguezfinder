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
  const lastTick = useRef<number>(0);

  const startWatch = () => {
    if (!('geolocation' in navigator)) return;
    try {
      watchId.current = navigator.geolocation.watchPosition((p) => {
        const { latitude: lat, longitude: lng, accuracy, heading, speed } = p.coords as any;
        lastTick.current = Date.now();
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
        maximumAge: 1000,    // allow 1s cached fixes for smoothness
        timeout: 8000
      });
    } catch {}
  };

  const stopWatch = () => {
    if (watchId.current != null) {
      try { navigator.geolocation.clearWatch(watchId.current); } catch {}
      watchId.current = null;
    }
  };

  useEffect(() => {
    if (!active) return;
    startWatch();

    const onVis = () => {
      // restart when tab becomes visible
      if (document.visibilityState === 'visible') {
        stopWatch();
        startWatch();
      }
    };
    document.addEventListener('visibilitychange', onVis);

    // safety: if no updates for 20s, restart
    const interval = window.setInterval(() => {
      if (lastTick.current && Date.now() - lastTick.current > 20_000) {
        stopWatch();
        startWatch();
      }
    }, 10_000);

    return () => {
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(interval);
      stopWatch();
    };
  }, [active]);

  return pos;
}
