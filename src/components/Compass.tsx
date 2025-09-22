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

// simple EMA for lat/lng; resets on large jumps (>100 m)
function smoothLL(prev: {lat:number,lng:number}|null, next: {lat:number,lng:number}, alpha = 0.25) {
  if (!prev) return next;
  const jump = haversine(prev, next);
  if (jump > 100) return next; // reset on big jumps
  return {
    lat: prev.lat + alpha * (next.lat - prev.lat),
    lng: prev.lng + alpha * (next.lng - prev.lng),
  };
}

export default function Compass() {
  const { groupId, me, members, locations, setMembers, setLocations } = useStore();
  const { heading: deviceHeading, requestPermission } = useOrientation();
  const geo = useGeolocation(true); // watchPosition
  useWakeLock(true);

  const [focused, setFocused] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);

  // throttled Firestore writes
  const lastWriteRef = useRef(0);
  const lastSentRef = useRef<{lat:number,lng:number,acc?:number}|null>(null);

  // smoothing refs
  const mySmoothRef = useRef<{lat:number,lng:number}|null>(null);
  const friendSmoothRef = useRef<Record<string,{lat:number,lng:number}>>({});

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

  // write my location (throttled; only on movement or accuracy improvement)
  useEffect(() => {
    if (!groupId || !me || !geo) return;
    const now = Date.now();
    const last = lastWriteRef.current;
    const moved = lastSentRef.current
      ? haversine({lat: geo.lat, lng: geo.lng}, {lat: lastSentRef.current.lat, lng: lastSentRef.current.lng})
      : Infinity;
    const accImproved = lastSentRef.current?.acc != null && geo.accuracy != null
      ? (lastSentRef.current.acc - geo.accuracy) > 5
      : true;

    if (now - last < 2500) return;
    if (moved < 3 && !accImproved) return;

    lastWriteRef.current = now;
    lastSentRef.current = { lat: geo.lat, lng: geo.lng, acc: geo.accuracy ?? undefined };

    const myRef = doc(db, 'groups', groupId, 'locations', me.uid);
    const expireAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    setDoc(myRef, {
      lat: geo.lat, lng: geo.lng,
      accuracy: geo.accuracy ?? null,
      updatedAt: Date.now(),
      expireAt
    }, { merge: true });
  }, [groupId, me, geo]);

  // build friend list with smoothing + safe math
  const others = useMemo(() => {
    if (!me || !geo) return [] as any[];

    // smooth my own position for rendering stability
    const myRaw = { lat: Number(geo.lat), lng: Number(geo.lng) };
    mySmoothRef.current = smoothLL(mySmoothRef.current, myRaw, 0.25);
    const mySm = mySmoothRef.current ?? myRaw;

    return Object.entries(locations)
      .filter(([uid]) => uid !== me.uid)
      .map(([uid, loc]: any) => {
        const member = (members as any)[uid];
        if (!member || !loc) return null;

        const theirRaw = { lat: Number(loc.lat), lng: Number(loc.lng) };
        if (!Number.isFinite(theirRaw.lat) || !Number.isFinite(theirRaw.lng)) return null;

        // smooth friend
        const prev = friendSmoothRef.current[uid] ?? null;
        const theirSm = smoothLL(prev, theirRaw, 0.35);
        friendSmoothRef.current[uid] = theirSm;

        const dist = haversine(mySm, theirSm);
        const bRaw = bearing(mySm, theirSm);
        const bear = Number.isFinite(bRaw) ? bRaw : 0;
        const age = Date.now() - (loc.updatedAt || 0);
        const acc = typeof loc.accuracy === 'number' ? loc.accuracy : undefined;

        return { uid, member, dist, bear, age, accuracy: acc, myAcc: geo.accuracy ?? 0 };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.dist - b.dist);
  }, [me, geo, locations, members]);

  // relative rotation toward bearing `b`
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

            // accuracy/age gating
            const tooOld = o.age > 30_000;               // hide after 30s
            const veryOld = o.age > 60_000;
            const tooInaccurate = (o.accuracy ?? 0) > 150;
            if (tooOld || tooInaccurate) return null;

            // gentle snap only when extremely close AND both accuracies are decent
            const bothDecent = (o.myAcc ?? 99) < 12 && (o.accuracy ?? 99) < 12;
            const nearThreshold = bothDecent ? 3 : 0; // meters
            const displayDist = o.dist < nearThreshold ? 0 : o.dist;

            const angle = rel(o.bear);
            const rot = angle == null ? 0 : angle;
            const opacity = displayDist === 0 ? 0.6 : 0.95;
            const dash = veryOld ? '4,6' : undefined;

            return (
              <div key={o.uid} className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) rotate(${rot}deg)` }}>
                <svg width="300" height="300" viewBox="0 0 300 300" style={{ opacity }}>
                  {/* main shaft: 12 o'clock line (container rotates) */}
                  <line x1="150" y1="150" x2="150" y2="28" stroke={o.member.color} strokeWidth="6" strokeDasharray={dash} />
                  {/* arrowhead polygon (NO <defs>/<marker>): fixes removeChild error */}
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
