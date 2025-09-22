import React, { useEffect, useState } from 'react';
import Join from './components/Join';
import Compass from './components/Compass';
import PermissionsGate from './components/PermissionsGate';
import { useStore } from './store';
import { useOrientation } from './hooks/useOrientation';
import VersionBadge from './components/VersionBadge';
import { ensureAnonAuth } from './firebase';

const STORAGE_ME = 'fc.me';       // stores { uid, name, color }
const STORAGE_GROUP = 'fc.group'; // stores last groupId

function parseHash(): string | null {
  const m = location.hash.match(/#\/([\w-]+)/);
  return m ? m[1] : null;
}

export default function App(){
  const { groupId, setGroup, setMe } = useStore();
  const { requestPermission } = useOrientation();
  const [needsPerm, setNeedsPerm] = useState(true);

  // On first load & on hash change, set group; restore me if we have it
  useEffect(() => {
    const setFromHash = async () => {
      const gid = parseHash();
      if (gid) {
        setGroup(gid);
        localStorage.setItem(STORAGE_GROUP, gid);
        // ensure auth exists for writes
        await ensureAnonAuth();
        // restore identity if present
        const raw = localStorage.getItem(`${STORAGE_ME}.${gid}`) || localStorage.getItem(STORAGE_ME);
        if (raw) {
          try {
            const me = JSON.parse(raw);
            if (me?.uid && me?.name && me?.color) setMe(me);
          } catch {}
        }
      }
    };
    setFromHash();

    const onHash = () => setFromHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setGroup, setMe]);

  // Also try to resume last session if there is no hash (e.g., user opened root)
  useEffect(() => {
    if (parseHash()) return;
    const last = localStorage.getItem(STORAGE_GROUP);
    if (last) {
      history.replaceState(null,'',`#/${last}`);
      // the effect above will catch and restore
    }
  }, []);

  const onJoined = (gid:string, me:any) => {
    setGroup(gid);
    setMe(me);
    localStorage.setItem(`${STORAGE_ME}.${gid}`, JSON.stringify(me));
    localStorage.setItem(STORAGE_ME, JSON.stringify(me));
    localStorage.setItem(STORAGE_GROUP, gid);
    history.replaceState(null,'',`#/${gid}`);
    setNeedsPerm(true);
  };

  return (
    <div className="h-full">
      {!groupId ? (
        <Join onJoined={onJoined}/>
      ) : needsPerm ? (
        <PermissionsGate onEnableCompass={async ()=>{ await requestPermission(); setNeedsPerm(false); }} />
      ) : (
        <Compass />
      )}
      <VersionBadge />
    </div>
  );
}
