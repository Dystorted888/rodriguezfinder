import { useEffect, useRef, useState } from 'react';

type Geo = { lat: number; lng: number; accuracy?: number; timestamp: number } | null;

export function useGeolocation(active: boolean, intervalMs = 5000) {
  const [pos, setPos] = useState<Geo>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!active) return;
    const tick = () => {
      if (!('geolocation' in navigator)) return;
      navigator.geolocation.getCurrentPosition((p) => {
        const { latitude: lat, longitude: lng, accuracy } = p.coords;
        setPos({ lat, lng, accuracy, timestamp: Date.now() });
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