import { useEffect, useRef, useState } from 'react';

// Low-pass filter so heading doesn't jitter
function smooth(prev: number | null, next: number, alpha = 0.2) {
  if (prev == null) return next;
  let d = next - prev;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return (prev + alpha * d + 360) % 360;
}

function screenAngle(): number {
  const so = (screen as any).orientation?.angle;
  const legacy = (window as any).orientation;
  const a = typeof so === 'number' ? so : (typeof legacy === 'number' ? legacy : 0);
  const n = ((Math.round(a / 90) * 90) % 360 + 360) % 360;
  return n;
}

export function useOrientation() {
  const [heading, setHeading] = useState<number | null>(null); // 0..360 (0=N)
  const [available, setAvailable] = useState<boolean>(false);
  const last = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const gotAbs = useRef(false);

  useEffect(() => {
    const has = typeof window !== 'undefined' && 'DeviceOrientationEvent' in window;
    setAvailable(has);
    if (!has) return;

    const update = (alpha: number | null | undefined, webkit: number | undefined) => {
      let h: number | null = null;
      if (typeof webkit === 'number') {
        // iOS gives compass degrees clockwise from North
        h = webkit;
      } else if (typeof alpha === 'number') {
        // Generic: convert device alpha to compass-like, then correct for screen orientation
        const base = (360 - alpha) % 360;
        h = (base + screenAngle()) % 360;
      }
      if (h != null) {
        const s = smooth(last.current, (h + 360) % 360, 0.18);
        last.current = s;
        if (raf.current) cancelAnimationFrame(raf.current);
        raf.current = requestAnimationFrame(() => setHeading(s));
      }
    };

    const onAbs = (ev: any) => { gotAbs.current = true; update(ev.alpha, ev.webkitCompassHeading); };
    const onRel = (ev: any) => { if (!gotAbs.current) update(ev.alpha, ev.webkitCompassHeading); };

    window.addEventListener('deviceorientationabsolute', onAbs as any, true);
    window.addEventListener('deviceorientation', onRel as any, true);

    const onSO = () => {
      // Nudge to recalc after rotation
      if (last.current != null) setHeading(((last.current + 0.001) + 360) % 360);
    };
    window.addEventListener('orientationchange', onSO);

    return () => {
      window.removeEventListener('deviceorientationabsolute', onAbs as any, true);
      window.removeEventListener('deviceorientation', onRel as any, true);
      window.removeEventListener('orientationchange', onSO);
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  // iOS needs a user gesture
  const requestPermission = async () => {
    const anyDO: any = (window as any).DeviceOrientationEvent;
    if (anyDO?.requestPermission) {
      try {
        const state = await anyDO.requestPermission();
        if (state !== 'granted') throw new Error('Motion permission denied');
      } catch (e) {
        console.warn('Orientation permission error', e);
      }
    }
  };

  return { heading, available, requestPermission };
}
