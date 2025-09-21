import { useEffect, useRef, useState } from 'react';

export function useOrientation() {
  const [heading, setHeading] = useState<number | null>(null); // 0..360
  const [available, setAvailable] = useState<boolean>(false);
  const permissionAsked = useRef(false);

  useEffect(() => {
    const hasDO = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    setAvailable(hasDO);

    if (!hasDO) {
      // No API in this context (e.g., Android over HTTP IP) -> leave heading null.
      return;
    }

    const handler = (ev: DeviceOrientationEvent & { webkitCompassHeading?: number }) => {
      let h: number | null = null;
      if (typeof ev.webkitCompassHeading === 'number') {
        // iOS gives degrees from north
        h = ev.webkitCompassHeading;
      } else if (typeof ev.alpha === 'number') {
        // On some Android builds, we only get a useful value if absolute is true
        if ((ev as any).absolute) h = (360 - ev.alpha);
      }
      if (h !== null) setHeading((h + 360) % 360);
    };

    // If iOS-style permission API exists, we’ll request it from a user gesture later.
    // Otherwise, try to attach immediately (Android/others).
    // @ts-ignore
    if (typeof (window as any).DeviceOrientationEvent?.requestPermission !== 'function') {
      window.addEventListener('deviceorientation', handler, true);
      return () => window.removeEventListener('deviceorientation', handler, true);
    }
  }, []);

  const requestPermission = async () => {
    const hasDO = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    if (!hasDO) return; // nothing to do

    // @ts-ignore
    const req = (window as any).DeviceOrientationEvent?.requestPermission;
    if (typeof req === 'function') {
      permissionAsked.current = true;
      try {
        const state = await req();
        if (state !== 'granted') throw new Error('Motion permission denied');
        window.addEventListener('deviceorientation', (ev: any) => {
          const h = ev?.webkitCompassHeading ?? (ev?.absolute ? (360 - ev.alpha) : null);
          if (h != null) setHeading((h + 360) % 360);
        }, true);
      } catch (e) {
        console.warn('Orientation permission error', e);
      }
    } else {
      // Non-iOS: nothing special to request; listener already attached if available.
      return;
    }
  };

  return { heading, requestPermission, available };
}
