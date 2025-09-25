import React, { useEffect, useMemo, useState } from 'react';
import Join from './components/Join';
import Compass from './components/Compass';
import { useStore } from './store';

// Small hash-router utils
function parseHash() {
  // Examples:
  //   "#/"                 -> { path: "/" }
  //   "#/AB12CD"           -> { path: "/:gid", gid: "AB12CD" }
  //   "#/join?gid=AB12CD"  -> { path: "/join", gid: "AB12CD" }
  const raw = (location.hash || '#/').replace(/^#/, '');
  const [pathPart, queryPart] = raw.split('?');
  const path = pathPart || '/';
  const params = new URLSearchParams(queryPart || '');
  const gidFromPath = /^\/([A-Z0-9]{4,12})$/.exec(path)?.[1] || null;
  const gidFromQuery = params.get('gid');
  const gid = gidFromPath || gidFromQuery || null;
  return { path, gid, params };
}

const STORAGE_GROUP = 'fc.group';
const STORAGE_ME = 'fc.me'; // me stored under fc.me.<gid>

export default function App() {
  const { groupId, me, setGroup, setMe } = useStore();
  const [route, setRoute] = useState<'join' | 'compass'>('join');
  const [prefillGid, setPrefillGid] = useState<string | null>(null);

  // Boot-time route resolution
  useEffect(() => {
    const { gid, path } = parseHash();

    // If a deep link to a group is opened…
    if (gid) {
      // Try loading saved profile for this group
      const savedMeStr = localStorage.getItem(`${STORAGE_ME}.${gid}`);
      const savedMe = savedMeStr ? safeParse(savedMeStr) : null;

      if (savedMe) {
        // We have a profile for this group → go straight to compass
        localStorage.setItem(STORAGE_GROUP, gid);
        setGroup(gid);
        setMe(savedMe);
        setRoute('compass');
      } else {
        // No profile for this group → force Join flow, prefill group code
        setPrefillGid(gid);
        setGroup(null);
        setMe(null);
        // Normalize hash to /join?gid=...
        location.replace(`#/join?gid=${gid}`);
        setRoute('join');
      }
      return;
    }

    // No gid in URL: fall back to last group if we also have a profile
    const lastGid = localStorage.getItem(STORAGE_GROUP);
    if (lastGid) {
      const savedMeStr = localStorage.getItem(`${STORAGE_ME}.${lastGid}`);
      const savedMe = savedMeStr ? safeParse(savedMeStr) : null;
      if (savedMe) {
        setGroup(lastGid);
        setMe(savedMe);
        setRoute('compass');
        // Normalize hash
        if (!location.hash.startsWith(`#/${lastGid}`)) {
          location.replace(`#/${lastGid}`);
        }
        return;
      }
    }

    // Default: Join page
    setRoute('join');
    if (!location.hash || location.hash === '#') location.replace('#/');
  }, [setGroup, setMe]);

  // Keep hash changes in sync (e.g., Android back/forward)
  useEffect(() => {
    const onHash = () => {
      const { gid, path } = parseHash();
      if (gid) {
        const savedMeStr = localStorage.getItem(`${STORAGE_ME}.${gid}`);
        const savedMe = savedMeStr ? safeParse(savedMeStr) : null;
        if (savedMe) {
          setGroup(gid);
          setMe(savedMe);
          setRoute('compass');
        } else {
          setGroup(null);
          setMe(null);
          setPrefillGid(gid);
          setRoute('join');
        }
      } else if (path.startsWith('/join')) {
        setRoute('join');
      }
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setGroup, setMe]);

  const handleJoined = (gid: string, newMe: any) => {
    // Persist and go to compass
    localStorage.setItem(STORAGE_GROUP, gid);
    localStorage.setItem(`${STORAGE_ME}.${gid}`, JSON.stringify(newMe));
    setGroup(gid);
    setMe(newMe);
    location.replace(`#/${gid}`);
    setRoute('compass');
  };

  const onQuit = () => {
    const gid = groupId || localStorage.getItem(STORAGE_GROUP);
    if (gid) localStorage.removeItem(`${STORAGE_ME}.${gid}`);
    localStorage.removeItem(STORAGE_GROUP);
    setMe(null);
    setGroup(null);
    location.replace('#/'); // back to join
    setRoute('join');
  };

  if (route === 'compass' && groupId && me) {
    return <Compass onQuit={onQuit} />;
  }

  // (route === 'join')
  return (
    <Join
      onJoined={handleJoined}
      prefillGroupId={prefillGid || undefined}
    />
  );
}

function safeParse(s: string) {
  try { return JSON.parse(s); } catch { return null; }
}
