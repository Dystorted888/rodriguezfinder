// src/components/Compass.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useStore } from '../store';
import { useOrientation } from '../hooks/useOrientation';
import { useGeolocation } from '../hooks/useGeolocation';
import { bearing, haversine } from '../utils/geo';
import { CFG } from '../config';
import Diagnostics from './Diagnostics';
import { AvatarIcon } from '../avatars';

function useWakeLock(active: boolean) {
  useEffect(() => {
    let lock: any = null;
    (async () => {
      try {
        if ('wakeLock' in navigator && active) {
          lock = await (navigator as any).wakeLock.request('screen');
        }
      } catch {}
    })();
    return () => { try { lock?.release?.(); } catch {} };
  }, [active]);
}

// ---------- helpers ----------
function smoothLL(
  prev: { lat: number; lng: number } | null,
  next: { lat: number; lng: number },
  alpha = 0.25
) {
  if (!prev) return next;
  const jump = haversine(prev, next);
  if (jump > 100) return next; // reset on big jumps
  return {
    lat: prev.lat + alpha * (next.lat - prev.lat),
    lng: prev.lng + alpha * (next.lng - prev.lng),
  };
}
function smoothScalar(prev: number | null, next: number, alpha: number) {
  if (prev == null) return next;
  return prev + alpha * (next - prev);
}
function smoothAngle(
  prev: number | null,
  next: number,
  alpha: number,
  dead: number,
  maxStep: number
) {
  if (prev == null) return next;
  let d = next - prev;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  if (Math.abs(d) < dead) return prev; // deadband
  const step = Math.sign(d) * Math.min(Math.abs(d), maxStep); // slew limit
  const blended = prev + alpha * step;
  return (blended + 360) % 360;
}
function roundDisplay(m: number) {
  if (m < 10) return Math.round(m * 10) / 10;
  if (m < 100) return Math.round(m / 5) * 5;
  return Math.round(m / 10) * 10;
}
function fmtLastSeen(ms: number) {
  const s = Math.floor(ms / 1000);
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return mm ? `${mm}m${ss.toString().padStart(2, '0')}s` : `${ss}s`;
}
function circularVariance(samples: number[]) {
  if (samples.length === 0) return Infinity;
  const toRad = (d: number) => (d * Math.PI) / 180;
  let sumSin = 0,
    sumCos = 0;
  for (const a of samples) {
    const r = toRad(a);
    sumCos += Math.cos(r);
    sumSin += Math.sin(r);
  }
  const R = Math.sqrt(sumCos * sumCos + sumSin * sumSin) / samples.length; // 0..1
  return 1 - R; // 0 stable … 1 noisy
}

// ---- vibration cues (Android; iOS Safari does not support) ----
function useVibrateCues(enabled: boolean, distanceM: number | null) {
  const timerRef = useRef<number | null>(null);
  const warnedRef = useRef(false);

  useEffect(() => {
    if (!enabled || distanceM == null) {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
      return;
    }
    const canVibrate = typeof navigator.vibrate === 'function';
    if (!canVibrate) {
      if (!warnedRef.current) {
        warnedRef.current = true;
        console.warn('Vibration not supported on this device/browser.');
      }
      return;
    }

    const d = Math.max(0.5, Math.min(distanceM, 150));
    const pulse = d <= 2 ? 65 : d <= 5 ? 50 : 35;

    let interval: number;
    if (d > 100) interval = 2400;
    else if (d > 50) interval = 1800;
    else if (d > 25) interval = 1200;
    else if (d > 10) interval = 700;
    else if (d > 5) interval = 400;
    else if (d > 2) interval = 230;
    else interval = 130;

    const doVibe = () => {
      if (d <= 5) navigator.vibrate?.([pulse, 90, pulse]); // double-tap when close
      else navigator.vibrate?.(pulse);
    };

    doVibe();
    timerRef.current = window.setInterval(doVibe, interval);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [enabled, distanceM]);
}

export default function Compass({ onQuit }: { onQuit?: () => void }) {
  const {
    groupId,
    me,
    members,
    locations,
    setMembers,
    setLocations,
    setGroup,
    setMe,
  } = useStore();
  const { heading: deviceHeading, requestPermission } = useOrientation();
  const geo = useGeolocation(true);
  useWakeLock(true);

  const [focused, setFocused] = useState<string | null>(null);
  const [cuesOn, setCuesOn] = useState(false);
  const [showDiag, setShowDiag] = useState(false);

  // Local fallback quit if parent didn't pass onQuit
  const STORAGE_GROUP = 'fc.group';
  const STORAGE_ME = 'fc.me';
  const quit = onQuit ?? (() => {
    const gid = groupId || localStorage.getItem(STORAGE_GROUP);
    if (gid) localStorage.removeItem(`${STORAGE_ME}.${gid}`);
    localStorage.removeItem(STORAGE_GROUP);
    setMe(null);
    setGroup(null);
    history.replaceState(null, '', '#/');
  });

  // long-press on "N" toggles diagnostics
  const pressT = useRef<number>(0);
  const onNDown = () => { pressT.current = Date.now(); };
  const onNUp = () => { if (Date.now() - pressT.current > 500) setShowDiag(v => !v); };

  // Firestore writes (heartbeat + motion)
  const lastWriteRef = useRef(0);
  const lastSentRef = useRef<{ lat: number; lng: number; acc?: number } | null>(null);

  // smoothing refs
  const mySmoothRef = useRef<{ lat: number; lng: number } | null>(null);
  const friendSmoothRef = useRef<Record<string, { lat: number; lng: number }>>({});
  const distSmoothRef = useRef<Record<string, number | null>>({});
  const distWindowRef = useRef<Record<string, number[]>>({});
  const angleSmoothRef = useRef<Record<string, number | null>>({});
  const lastGoodRef = useRef<Record<string, { pos: { lat: number; lng: number }; t: number }>>({});

  // heading stability buffer
  const headingBufRef = useRef<number[]>([]);
  useEffect(() => {
    if (deviceHeading == null) return;
    const buf = headingBufRef.current;
    buf.push(deviceHeading);
    if (buf.length > 12) buf.shift();
  }, [deviceHeading]);

  // subscribe to members & locations
  useEffect(() => {
    if (!groupId) return;
    const unsubMembers = onSnapshot(collection(db, 'groups', groupId, 'members'), (snap) => {
      const m: any = {};
      snap.forEach((d) => (m[d.id] = d.data()));
      setMembers(m);
    });
    const unsubLoc = onSnapshot(collection(db, 'groups', groupId, 'locations'), (snap) => {
      const l: any = {};
      snap.forEach((d) => (l[d.id] = d.data()));
      setLocations(l);
    });
    return () => { unsubMembers(); unsubLoc(); };
  }, [groupId, setMembers, setLocations]);

  // write my location (heartbeat every 15s; motion ≥ 2.5s)
  useEffect(() => {
    if (!groupId || !me || !geo) return;
    const now = Date.now();
    const last = lastWriteRef.current;
    const moved = lastSentRef.current
      ? haversine({ lat: geo.lat, lng: geo.lng }, { lat: lastSentRef.current.lat, lng: lastSentRef.current.lng })
      : Infinity;
    const accImproved =
      lastSentRef.current?.acc != null && geo.accuracy != null
        ? lastSentRef.current.acc - geo.accuracy > 5
        : true;

    const dueHeartbeat = now - last >= CFG.heartbeatMs;
    const dueMotion = now - last >= CFG.motionWriteMinMs && (moved >= CFG.minMoveForWriteM || accImproved);

    if (!dueHeartbeat && !dueMotion) return;

    lastWriteRef.current = now;
    lastSentRef.current = { lat: geo.lat, lng: geo.lng, acc: geo.accuracy ?? undefined };

    const myRef = doc(db, 'groups', groupId, 'locations', me!.uid);
    const expireAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
    setDoc(myRef, { lat: geo.lat, lng: geo.lng, accuracy: geo.accuracy ?? null, updatedAt: Date.now(), expireAt }, { merge: true });
  }, [groupId, me, geo]);

  // compute others (distance & bearing)
  const others = useMemo(() => {
    if (!me || !geo) return [] as any[];

    const myRaw = { lat: Number(geo.lat), lng: Number(geo.lng) };
    mySmoothRef.current = smoothLL(mySmoothRef.current, myRaw, 0.25);
    const mySm = mySmoothRef.current ?? myRaw;

    const iAmStill = (geo?.speed ?? 0) < 0.5;

    return Object.entries(locations)
      .filter(([uid]) => uid !== me.uid)
      .map(([uid, loc]: any) => {
        const member = (members as any)[uid];
        if (!member || !loc) return null;

        let theirRaw = { lat: Number(loc.lat), lng: Number(loc.lng) };
        if (!Number.isFinite(theirRaw.lat) || !Number.isFinite(theirRaw.lng)) return null;

        const age = Date.now() - (loc.updatedAt || 0);
        const acc = typeof loc.accuracy === 'number' ? (loc.accuracy as number) : undefined;

        // reject very inaccurate fresh fixes
        if (acc != null && acc > 120 && age < 8000) {
          const lastGood = lastGoodRef.current[uid];
          if (lastGood) theirRaw = lastGood.pos;
        }

        const lastGood = lastGoodRef.current[uid];
        if (lastGood) {
          const jump = haversine(lastGood.pos, theirRaw);
          if (jump > 60 && age < 6000) {
            theirRaw = lastGood.pos;
          }
        }

        const prev = friendSmoothRef.current[uid] ?? null;
        const theirSm = smoothLL(prev, theirRaw, 0.35);
        friendSmoothRef.current[uid] = theirSm;

        if ((acc ?? 50) < 80 || age > 10000) {
          lastGoodRef.current[uid] = { pos: theirSm, t: Date.now() };
        }

        const rawDist = haversine(mySm, theirSm);
        const bRaw = bearing(mySm, theirSm);
        const bear = Number.isFinite(bRaw) ? bRaw : 0;

        const sigma = Math.hypot(geo.accuracy ?? 20, acc ?? 20);
        const corrected = Math.max(0, rawDist - CFG.accuracySubtractK * sigma);

        const arr = distWindowRef.current[uid] ?? [];
        arr.push(corrected);
        if (arr.length > CFG.distMedianWindow) arr.shift();
        distWindowRef.current[uid] = arr.slice();
        const median = [...arr].sort((a, b) => a - b)[Math.floor(arr.length / 2)];

        const alpha = iAmStill ? Math.min(CFG.distEmaAlpha, 0.45) : Math.max(CFG.distEmaAlpha, 0.65);
        const prevD = distSmoothRef.current[uid] ?? null;
        const dispD = smoothScalar(prevD, median, alpha);
        distSmoothRef.current[uid] = dispD;

        return { uid, member, distDisp: dispD, bear, age, accuracy: acc, myAcc: geo.accuracy ?? undefined };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => a.distDisp - b.distDisp);
  }, [me, geo, locations, members]);

  // heading stability / selection
  const headingBuf = headingBufRef.current;
  const varH = headingBuf.length >= 6 ? circularVariance(headingBuf) : 0;
  const compassStable = deviceHeading != null && varH < CFG.headingVarianceStable;
  const gpsOk = (geo?.speed ?? 0) > CFG.gpsCourseMinSpeed && geo?.headingFromGPS != null;
  const stableHeading = compassStable ? (deviceHeading as number) : gpsOk ? (geo!.headingFromGPS as number) : null;

  const unstableSinceRef = useRef<number | null>(null);
  if (stableHeading == null) {
    if (unstableSinceRef.current == null) unstableSinceRef.current = Date.now();
  } else {
    unstableSinceRef.current = null;
  }
  const showHint = unstableSinceRef.current != null && Date.now() - unstableSinceRef.current > CFG.unstableFreezeMs;

  // rotation with adaptive smoothing
  const getRot = (uid: string, b: number) => {
    if (stableHeading == null) return angleSmoothRef.current[uid] ?? 0; // freeze if unstable
    let r = (b - stableHeading + 360) % 360;

    const fast = (geo?.speed ?? 0) > 1.0;
    const dead = fast ? CFG.angleDeadbandDeg - 2 : CFG.angleDeadbandDeg;
    const step = fast ? CFG.angleMaxStepDeg + 2 : CFG.angleMaxStepDeg;
    const alpha = fast ? CFG.angleAlpha + 0.1 : CFG.angleAlpha;

    const prev = angleSmoothRef.current[uid] ?? null;
    const sm = smoothAngle(prev, r, alpha, Math.max(2, dead), Math.max(4, step));
    angleSmoothRef.current[uid] = sm;
    return sm ?? r;
  };

  // left/right hint when heading unstable
  const hintFor = (b: number) => {
    if (stableHeading == null) return 'Maintenez';
    let diff = (b - stableHeading + 540) % 360 - 180; // -180..180
    if (Math.abs(diff) < 8) return 'Devant';
    return diff > 0 ? 'Tournez à droite' : 'Tournez à gauche';
  };

  const lockedFriend = focused ? others.find((o) => o.uid === focused) || null : null;
  useVibrateCues(cuesOn && !!lockedFriend, lockedFriend?.distDisp ?? null);
  const vibrateUnsupported = typeof navigator.vibrate !== 'function';

  const formatDist = (m: number) => {
    const x = roundDisplay(m);
    if (x < 10) return `${x.toFixed(1)} m`;
    if (x < 1000) return `${Math.round(x)} m`;
    return `${(x / 1000).toFixed(1)} km`;
  };

  const headingStatus =
    stableHeading != null
      ? `Heading: ${Math.round(stableHeading)}°`
      : geo?.speed && geo.speed > CFG.gpsCourseMinSpeed && geo?.headingFromGPS != null
      ? `GPS course: ${Math.round(geo.headingFromGPS!)}°`
      : 'Heading: hold steady';

  const shareGroup = async () => {
    if (!groupId) return;
    const url = `${location.origin}/#/${groupId}`;
    try {
      await (navigator as any).share?.({ title: 'Join my Rodriguez Finder', text: `Group ${groupId}`, url }) ??
        navigator.clipboard.writeText(url);
      alert('Invite link shared/copied!');
    } catch {}
  };

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="text-sm text-slate-400">
          Group: <span className="font-mono">{groupId}</span>
          <button className="ml-2 text-xs underline" onClick={shareGroup}>Share</button>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 hidden sm:inline">{headingStatus}</span>
          <button className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700" onClick={requestPermission}>
            Re-enable compass
          </button>
          <button className="text-xs px-2 py-1 rounded-lg bg-red-600 hover:bg-red-500" onClick={quit} aria-label="Quit group">
            Quitter le groupe
          </button>
        </div>
      </div>

      {stableHeading == null && (
        <div className="text-center text-xs text-amber-300 mb-2">
          {showHint
            ? 'Le compas a trop de bruit - utilisez gauche/droite près de la flèche.'
            : 'Gardez votre téléphone à plat/immobile ou marchez quelques mètres pour stabiliser la direction.'}
        </div>
      )}

      <div className="flex-1 grid place-items-center">
        <div className="relative w-[320px] h-[320px] rounded-full border border-slate-700">
          {/* N marker with diagnostics long-press */}
          <div
            className="absolute left-1/2 -translate-x-1/2 -top-5 text-slate-400 select-none"
            onMouseDown={onNDown} onMouseUp={onNUp} onTouchStart={onNDown} onTouchEnd={onNUp}
          >N</div>

          {others.map((o) => {
            if (focused && o.uid !== focused) return null;
            const hide = o.age > CFG.hideAfterMs; if (hide) return null;

            const displayDist = Math.max(0, o.distDisp ?? 0);
            const rot = getRot(o.uid, o.bear);
            const old = o.age > CFG.fadeOldMs;
            const veryOld = o.age > CFG.dashVeryOldMs;

            const showDirText = stableHeading == null && showHint;
            const dirText = showDirText ? hintFor(o.bear) : null;

            return (
              <div
                key={o.uid}
                className="absolute left-1/2 top-1/2"
                style={{ transform: `translate(-50%,-50%) rotate(${rot}deg)` }}
              >
                <svg width="300" height="300" viewBox="0 0 300 300" style={{ opacity: old ? 0.75 : 0.95 }}>
                  <line x1="150" y1="150" x2="150" y2="28" stroke={o.member.color} strokeWidth="6" strokeDasharray={veryOld ? '4,6' : undefined} />
                  <polygon points="150,12 162,32 138,32" fill={o.member.color} />
                </svg>

				{/* Friend label — minimal */}
<div
  className="absolute -top-12 left-1/2 -translate-x-1/2 text-sm"
  style={{ color: o.member.color }}
>
  <div className="px-2 py-0.5 rounded-full bg-black/40 backdrop-blur flex items-center gap-1">
    {o.member.avatarId && (
      <span
        className="inline-flex items-center justify-center rounded-full bg-slate-900/50"
        style={{ width: 18, height: 18 }}
      >
        <AvatarIcon id={o.member.avatarId} size={18} />
      </span>
    )}
    <span>{o.member.name}</span>
    <span>· {formatDist(displayDist)}</span>
    {o.age > 15_000 ? <span> · last {fmtLastSeen(o.age)} ago</span> : null}
  </div>
</div>
</div>
            );
          })}

          {/* Center: YOU avatar badge */}
          <div
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full grid place-items-center border"
            style={{
              width: 76,
              height: 76,
              borderColor: me?.color || '#475569',
              boxShadow: '0 0 0 2px rgba(0,0,0,0.4)',
              background: '#0f172a'
            }}
          >
            {me?.avatarId ? (
              <AvatarIcon id={me.avatarId} size={56} />
            ) : (
              <div className="text-xs text-slate-300">You</div>
            )}
          </div>
        </div>
      </div>

			  {/* bottom chips + vibration toggle */}
		<div className="flex items-center justify-between py-2 gap-2">
		  <div className="flex gap-2 overflow-x-auto">
			{others.map((o) => (
			  <button
				key={o.uid}
				onClick={() => setFocused(focused === o.uid ? null : o.uid)}
				className="px-3 py-2 rounded-2xl bg-slate-800 text-sm flex items-center gap-2"
				style={{ border: focused === o.uid ? `2px solid ${o.member.color}` : '2px solid transparent' }}
			  >
				{o.member.avatarId && (
				  <span
					className="inline-flex items-center justify-center rounded-full bg-slate-900/50"
					style={{ width: 18, height: 18 }}
				  >
					<AvatarIcon id={o.member.avatarId} size={18} />
				  </span>
				)}
				<span className="inline-block w-3 h-3 rounded-full" style={{ background: o.member.color }} />
				{o.member.name}
			  </button>
			))}
		  </div>

		  {focused ? (
			<div className="flex items-center gap-2 shrink-0">
			  <label className="text-xs flex items-center gap-2">
				<input
				  type="checkbox"
				  checked={cuesOn}
				  onChange={(e) => setCuesOn(e.target.checked)}
				/>
				Vibration
			  </label>
			  {cuesOn && typeof navigator.vibrate !== 'function' && (
				<span className="text-[11px] text-slate-400">
				  (vibration non supportée)
				</span>
			  )}
			</div>
		  ) : null}
		</div>

      {showDiag && <Diagnostics me={me} geo={geo} heading={deviceHeading ?? null} groupId={groupId} />}
    </div>
  );
}
