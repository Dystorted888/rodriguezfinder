import React, { useEffect, useState } from 'react';
import Join from './components/Join';
import Compass from './components/Compass';
import PermissionsGate from './components/PermissionsGate';
import { useStore } from './store';
import { useOrientation } from './hooks/useOrientation';
import VersionBadge from './components/VersionBadge';
import { ensureAnonAuth } from './firebase';

const STORAGE_ME = 'fc.me';
const STORAGE_GROUP = 'fc.group';

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
        await ensureAnonAuth();
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

  // Resume last session if no hash
  useEffect(() => {
    if (parseHash()) return;
    const last = localStorage.getItem(STORAGE_GROUP);
    if (last) {
      history.replaceState(null,'',`#/${last}`);
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

  // 👇 NEW: Quit group
  const quitGroup = () => {
    const gid = parseHash() || localStorage.getItem(STORAGE_GROUP);
    if (gid) {
      localStorage.removeItem(`${STORAGE_ME}.${gid}`);
    }
    localStorage.removeItem(STORAGE_GROUP);
    // keep generic fc.me so the user’s name/color can prefill next time
    setMe(null);
    setGroup(null);
    history.replaceState(null,'','#/'); // go back to root
  };

  return (
    <div className="h-full">
      {!groupId ? (
        <Join onJoined={onJoined}/>
      ) : needsPerm ? (
        <PermissionsGate onEnableCompass={async ()=>{ await requestPermission(); setNeedsPerm(false); }} />
      ) : (
        <Compass onQuit={quitGroup} />
      )}
      <VersionBadge />
    </div>
  );
}
