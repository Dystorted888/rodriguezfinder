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

// -------- helpers --------
function smoothLL(prev: {lat:number,lng:number}|null, next: {lat:number,lng:number}, alpha = 0.25) {
  if (!prev) return next;
  const jump = haversine(prev, next);
  if (jump > 100) return next; // reset on big jumps
  return {
    lat: prev.lat + alpha * (next.lat - prev.lat),
    lng: prev.lng + alpha * (next.lng - prev.lng),
  };
}
// faster scalar smoothing so meters react quickly
function smoothScalar(prev: number | null, next: number, alpha = 0.65) {
  if (prev == null) return next;
  return prev + alpha * (next - prev);
}
// angle smoothing with deadband & slew-limit (very steady)
function smoothAngle(prev: number | null, next: number, alpha = 0.55, dead = 6, maxStep = 5) {
  if (prev == null) return next;
  let d = next - prev;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  if (Math.abs(d) < dead) return prev;                          // ignore micro-jitter
  const step = Math.sign(d) * Math.min(Math.abs(d), maxStep);   // glide towards target
  const blended = prev + alpha * step;
  return (blended + 360) % 360;
}
function roundDisplay(m: number) {
  if (m < 10) return (Math.round(m * 10) / 10);  // 0.1 m resolution under 10 m
  if (m < 100) return Math.round(m / 5) * 5;     // 5 m steps 10–100 m
  return Math.round(m / 10) * 10;                // 10 m steps beyond
}
function fmtLastSeen(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return mm ? `${mm}m${ss.toString().padStart(2,'0')}s` : `${ss}s`;
}
// circular variance to judge heading stability
function circularVariance(samples: number[]) {
  if (samples.length === 0) return Infinity;
  const toRad = (d:number)=>d*Math.PI/180;
  let sumSin=0, sumCos=0;
  for(const a of samples){
    const r = toRad(a);
    sumCos += Math.cos(r);
    sumSin += Math.sin(r);
  }
  const R = Math.sqrt(sumCos*sumCos + sumSin*sumSin) / samples.length; // 0..1
  return 1 - R; // 0 stable … 1 very noisy
}

// -------- optional cues (vibration + quiet audio ticks) --------
function useCues(enabled: boolean, distanceM: number | null) {
  const audioCtxRef = useRef<AudioContext|null>(null);
  const beepRef = useRef<{osc: OscillatorNode, gain: GainNode} | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || distanceM == null) return;

    // Create ctx lazily
    if (!audioCtxRef.current) {
      try { audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)(); }
      catch { /* ignore */ }
    }
    const ctx = audioCtxRef.current;

    function pulseOnce() {
      // haptic (if supported)
      try { navigator.vibrate?.(30); } catch {}
      // tiny beep (if audio allowed)
      if (ctx) {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = 880; // A5
        gain.gain.value = 0.02;    // quiet
        osc.connect(gain).connect(ctx.destination);
        osc.start();
        setTimeout(() => { try { osc.stop(); } catch {} }, 60);
      }
    }

    // Rate based on distance: closer => faster pulses
    const d = Math.max(0.5, Math.min(distanceM, 80)); // clamp 0.5..80
    const interval = d < 3 ? 300 : d < 10 ? 500 : d < 25 ? 900 : 1400;

    pulseOnce();
    timerRef.current = window.setInterval(pulseOnce, interval);

    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = null; };
  }, [enabled, distanceM]);
}

export default function Compass() {
  const { groupId, me, members, locations, setMembers, setLocations } = useStore();
  const { heading: deviceHeading, requestPermission } = useOrientation();
  const geo = useGeolocation(true);
  useWakeLock(true);

  const [focused, setFocused] = useState<string | null>(null);
  const [flip, setFlip] = useState(false);
  const [cuesOn, setCuesOn] = useState(false); // vibration + quiet tick when locked

  // heartbeat/throttle for writes (keep arrows alive)
  const lastWriteRef = useRef(0);
  const lastSentRef = useRef<{lat:number,lng:number,acc?:number}|null>(null);

  // smoothing refs
  const mySmoothRef = useRef<{lat:number,lng:number}|null>(null);
  const friendSmoothRef = useRef<Record<string,{lat:number,lng:number}>>({});
  const distSmoothRef = useRef<Record<string, number | null>>({});
  const distWindowRef = useRef<Record<string, number[]>>({});
  const angleSmoothRef = useRef<Record<string, number | null>>({});

  // heading stability buffer (last ~12 samples)
  const headingBufRef = useRef<number[]>([]);
  useEffect(()=>{
    if (deviceHeading == null) return;
    const buf = headingBufRef.current;
    buf.push(deviceHeading);
    if (buf.length > 12) buf.shift();
  },[deviceHeading]);

  // subscribe to members & locations
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

  // write my location (heartbeat every 15s even if stationary; motion writes >=2.5s)
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

    const dueHeartbeat = (now - last) >= 15000;
    const dueMotion    = (now - last) >= 2500 && (moved >= 3 || accImproved);

    if (!dueHeartbeat && !dueMotion) return;

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

  // compute others with better distance & bearing stability
  const others = useMemo(() => {
    if (!me || !geo) return [] as any[];

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

        // smooth friend lat/lng
        const prev = friendSmoothRef.current[uid] ?? null;
        const theirSm = smoothLL(prev, theirRaw, 0.35);
        friendSmoothRef.current[uid] = theirSm;

        // raw metrics
        const rawDist = haversine(mySm, theirSm);
        const bRaw = bearing(mySm, theirSm);
        const bear = Number.isFinite(bRaw) ? bRaw : 0;
        const age = Date.now() - (loc.updatedAt || 0);
        const theirAcc = typeof loc.accuracy === 'number' ? loc.accuracy : undefined;
        const myAcc = geo.accuracy ?? undefined;

        // LOWER correction for accuracy bubble so close-range isn't stuck at 1 m
        const sigma = Math.hypot(myAcc ?? 20, theirAcc ?? 20);
        const corrected = Math.max(0, rawDist - 0.2 * sigma); // ← was 0.3..0.6; now gentler

        // median-of-3 for spike rejection (short window -> responsive)
        const arr = distWindowRef.current[uid] ?? [];
        arr.push(corrected);
        if (arr.length > 3) arr.shift();
        distWindowRef.current[uid] = arr.slice();
        const median = [...arr].sort((a,b)=>a-b)[Math.floor(arr.length/2)];

        // EMA on top (fast)
        const prevD = distSmoothRef.current[uid] ?? null;
        const dispD = smoothScalar(prevD, median, 0.65);
        distSmoothRef.current[uid] = dispD;

        return {
          uid, member,
          distDisp: dispD,
          bear, age,
          accuracy: theirAcc,
          myAcc: myAcc
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distDisp - b.distDisp);
  }, [me, geo, locations, members]);

  // heading stability & choice
  const stableHeading = (() => {
    const h = deviceHeading;
    const buf = headingBufRef.current;
    const varH = (buf.length >= 6) ? circularVariance(buf) : 0;
    const compassStable = h != null && varH < 0.12; // tighter threshold
    const gpsOk = (geo?.speed ?? 0) > 0.3 && (geo?.headingFromGPS != null);

    if (compassStable) return h!;
    if (gpsOk) return geo!.headingFromGPS!;
    return null; // freeze rotation if no stable heading
  })();

  // per-friend rotation; freeze when unstable
  const getRot = (uid: string, b: number) => {
    const eff = stableHeading;
    if (eff == null) return angleSmoothRef.current[uid] ?? 0; // freeze
    let r = (b - eff + 360) % 360;
    if (flip) r = (360 - r) % 360;

    const prev = angleSmoothRef.current[uid] ?? null;
    const sm = smoothAngle(prev, r, 0.55, 6, 5);
    angleSmoothRef.current[uid] = sm;
    return sm ?? r;
  };

  const headingUnstable = stableHeading == null;

  // cues (vibration/audio) only when a friend is locked
  const lockedFriend = focused
    ? others.find(o => o.uid === focused) || null
    : null;
  useCues(cuesOn && !!lockedFriend, lockedFriend?.distDisp ?? null);

  const formatDist = (m: number) => {
    const rounded = roundDisplay(m);
    if (rounded < 10) return `${rounded.toFixed(1)} m`;
    if (rounded < 1000) return `${Math.round(rounded)} m`;
    return `${(rounded/1000).toFixed(1)} km`;
  };

  const headingStatus = stableHeading != null
    ? `Heading: ${Math.round(stableHeading)}°`
    : (geo?.speed && geo.speed > 0.3 && geo?.headingFromGPS != null)
      ? `GPS course: ${Math.round(geo.headingFromGPS!)}°`
      : 'Heading: hold steady';

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

      {headingUnstable && (
        <div className="text-center text-xs text-amber-300 mb-2">
          Hold phone flat/steady or walk a few meters to stabilize direction.
        </div>
      )}

      <div className="flex-1 grid place-items-center">
        <div className="relative w-[320px] h-[320px] rounded-full border border-slate-700">
          {/* N marker */}
          <div className="absolute left-1/2 -translate-x-1/2 -top-5 text-slate-400">N</div>

          {others.map(o => {
            // lock view: when locked, only show that friend’s arrow
            if (focused && o.uid !== focused) return null;

            const hide = o.age > 300_000; // hide after 5 min
            if (hide) return null;

            const displayDist = Math.max(0, o.distDisp ?? 0);
            const rot = getRot(o.uid, o.bear);
            const old = o.age > 30_000;
            const veryOld = o.age > 120_000;

            return (
              <div key={o.uid} className="absolute left-1/2 top-1/2" style={{ transform: `translate(-50%,-50%) rotate(${rot}deg)` }}>
                <svg width="300" height="300" viewBox="0 0 300 300" style={{ opacity: old ? 0.75 : 0.95 }}>
                  <line x1="150" y1="150" x2="150" y2="28" stroke={o.member.color} strokeWidth="6" strokeDasharray={veryOld ? '4,6' : undefined} />
                  <polygon points="150,12 162,32 138,32" fill={o.member.color} />
                </svg>
                <div className="absolute -top-10 left-1/2 -translate-x-1/2 text-sm" style={{ color: o.member.color }}>
                  <div className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur">
                    {o.member.name} · {formatDist(displayDist)}
                    {o.accuracy ? ` · ±${Math.max(3, Math.round(Math.min(15, 0.5 * Math.hypot(o.myAcc ?? 20, o.accuracy))))}m` : ''}
                    {o.age > 15_000 ? ` · last ${fmtLastSeen(o.age)} ago` : ''}
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

      <div className="flex items-center justify-between py-2 gap-2">
        <div className="flex gap-2 overflow-x-auto">
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

        {/* Cues toggle only visible when locked */}
        {focused && (
          <label className="text-xs flex items-center gap-2 shrink-0">
            <input type="checkbox" checked={cuesOn} onChange={e => setCuesOn(e.target.checked)} />
            Cues (vibrate/tick)
          </label>
        )}
      </div>
    </div>
  );
}
