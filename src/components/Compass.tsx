import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store';
import { useOrientation } from '../hooks/useOrientation';
import { useGeolocation } from '../hooks/useGeolocation';
import { bearing, haversine } from '../utils/geo';

function useWakeLock(active: boolean) {
  useEffect(() => {
    let lock: any = null;
    (async () => {
      try { if ('wakeLock' in navigator && active) lock = await (navigator as any).wakeLock.request('screen'); } catch {}
    })();
    return () => { try { lock?.release?.(); } catch {} };
  }, [active]);
}

export default function Compass() {
  const { groupId, me, members, locations, setMembers, setLocations } = useStore();
  const { heading: deviceHeading, requestPermission } = useOrientation();
  const geo = useGeolocation(true, 2500);
  useWakeLock(true);

  const [focused, setFocused] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);

  // subscribe members & locations
  useEffect(() => {
    if (!groupId) return;
    const unsubMembers = onSnapshot(collection(db, 'groups', groupId, 'members'), snap => {
      const m: any = {}; snap.forEach(d => m[d.id] = d.data()); setMembers(m);
    });
    const unsubLoc = onSnapshot(collection(db, 'groups', groupId, 'locations'), snap => {
      const l: any = {}; snap.forEach(d => l[d.id] = d.data()); setLocations(l);
    });
    return () => { unsubMembers(); unsubLoc(); };
  }, [groupId, setMembers, setLocations]);

  // write my location (on geo change)
  useEffect(() => {
    if (!groupId || !me || !geo) return;
    const myRef = doc(db, 'groups', groupId, 'locations', me.uid);
    const expireAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    setDoc(myRef, {
      lat: geo.lat, lng: geo.lng,
      accuracy: geo.accuracy ?? null,
      updatedAt: Date.now(),
      expireAt
    }, { merge: true });
  }, [groupId, me, geo]);

  // compute others
  const others = useMemo(() => {
    if (!me || !geo) return [] as any[];
    return Object.entries(locations)
      .filter(([uid]) => uid !== me.uid)
      .map(([uid, loc]: any) => {
        const member = (members as any)[uid];
        if (!member || !loc) return null;

        const my = { lat: Number(geo.lat), lng: Number(geo.lng) };
        const their = { lat: Number(loc.lat), lng: Number(loc.lng) };
        if (!Number.isFinite(their.lat) || !Number.isFinite(their.lng)) return null;

        const dist = haversine(my, their);
        const bRaw = bearing(my, their);
        const bear = Number.isFinite(bRaw) ? bRaw : 0;
        const age = Date.now() - (loc.updatedAt || 0);
        const acc = typeof loc.accuracy === 'number' ? loc.accuracy : undefined;

        return { uid, member, dist, bear, age, accuracy: acc };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.dist - b.dist);
  }, [me, geo, locations, members]);

  // relative rotation
  const rel = (b: number) => {
    const gpsHeading = (geo?.speed && geo.speed > 0.5) ? (geo.headingFromGPS ?? null) : null;
    const effective = deviceHeading ?? gpsHeading;
    if (effective == null) return null;
    let r = (b - effective + 360) % 360;
    if (flip) r = (360 - r) % 360;
    return r;
  };

  const formatDist = (m: number) => (m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);

  const headingStatus = deviceHeading != null
    ? `Compass: ${Math.round(deviceHeading)}°`
    : (geo?.speed && geo.speed > 0.5 && geo?.headingFromGPS != null)
      ? `GPS course: ${Math.round(geo.headingFromGPS!)}°`
      : 'Heading: —';

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-slate-400">
          Group: <span className="font-mono">{groupId}</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{headingStatus}</span>
          <button className="text-sm underline" onClick={requestPermission}>Re-enable compass</button>
          <label className="text-xs flex items-center gap-1">
            <input type="checkbox" checked={flip} onChange={e => setFlip(e.target.checked)} />
            Flip
          </label>
        </div>
      </div>

      <div className="flex-1 grid place-items-center">
        <div className="relative w-[320px] h-[320px] rounded-full border border-slate-700">
          {/* N marker */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 text-slate-400">N</div>

          {others.map(o => {
            if (focused && o.uid !== focused) return null;

            // 30s stale policy + accuracy gating
            const tooOld = o.age > 30_000;               // ← changed from 15s to 30s
            const veryOld = o.age > 60_000;
            const tooInaccurate = (o.accuracy ?? 0) > 100;
            if (tooOld || tooInaccurate) return null;

            // Snap-to-zero UX (optional, helps at very close range)
            const myAcc = geo?.accuracy ?? 0;
            const nearThreshold = Math.max(8, myAcc, o.accuracy ?? 0);
            const displayDist = o.dist < nearThreshold ? 0 : o.dist;

            const angle = rel(o.bear);
            const rot = angle == null ? 0 : angle;
            const opacity = displayDist === 0 ? 0.5 : 0.9;
            const dash = veryOld ? '4,6' : undefined;

            return (
              <div key={o.uid} className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) rotate(${rot}deg)` }}>
                <svg width="300" height="300" viewBox="0 0 300 300" style={{ opacity }}>
                  {/* main shaft: 12 o'clock line; container rotates */}
                  <line x1="150" y1="150" x2="150" y2="28" stroke={o.member.color} strokeWidth="6" strokeDasharray={dash} />
                  {/* arrowhead polygon (no <defs>/<marker>) */}
                  <polygon points="150,12 162,32 138,32" fill={o.member.color} />
                </svg>

                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm" style={{ color: o.member.color }}>
                  <div className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur">
                    {o.member.name} · {displayDist === 0 ? '≈0 m' : formatDist(displayDist)}
                    {o.accuracy ? ` · ±${Math.round(o.accuracy)}m` : ''}
                  </div>
                </div>
              </div>
            );
          })}

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-slate-800 grid place-items-center border border-slate-600">
            You
          </div>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto py-2">
        {others.map(o => (
          <button
            key={o.uid}
            onClick={() => setFocused(focused === o.uid ? null : o.uid)}
            className="px-3 py-2 rounded-2xl bg-slate-800 text-sm"
            style={{ border: focused === o.uid ? `2px solid ${o.member.color}` : '2px solid transparent' }}
          >
            <span className="inline-block w-3 h-3 rounded-full mr-2" style={{ background: o.member.color }} />
            {o.member.name}
          </button>
        ))}
      </div>
    </div>
  );
}
