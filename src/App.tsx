import React, { useEffect, useState } from 'react';
import Join from './components/Join';
import Compass from './components/Compass';
import PermissionsGate from './components/PermissionsGate';
import VersionBadge from './components/VersionBadge';
import { useStore } from './store';
import { useOrientation } from './hooks/useOrientation';
import { ensureAnonAuth } from './firebase';

const STORAGE_ME = 'fc.me';
const STORAGE_GROUP = 'fc.group';

function parseHash(): string | null {
  const m = location.hash.match(/#\/([\w-]+)/);
  return m ? m[1] : null;
}

export default function App() {
  const { groupId, me, setGroup, setMe } = useStore();
  const { requestPermission } = useOrientation();
  const [needsPerm, setNeedsPerm] = useState(true);

  // Keep store in sync with URL hash and localStorage
  useEffect(() => {
    const setFromHash = async () => {
      const gid = parseHash();
      if (!gid) return;

      setGroup(gid);
      localStorage.setItem(STORAGE_GROUP, gid);

      await ensureAnonAuth();

      // Prefer per-group saved identity
      const rawGroupMe = localStorage.getItem(`${STORAGE_ME}.${gid}`);
      const rawGenericMe = localStorage.getItem(STORAGE_ME);
      const raw = rawGroupMe || rawGenericMe;
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (parsed?.uid && parsed?.name && parsed?.color) {
            setMe(parsed);
          }
        } catch {}
      }
    };

    setFromHash();
    const onHash = () => setFromHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [setGroup, setMe]);

  // If no hash, resume last group
  useEffect(() => {
    if (parseHash()) return;
    const last = localStorage.getItem(STORAGE_GROUP);
    if (last) history.replaceState(null, '', `#/${last}`);
  }, []);

  const onJoined = (gid: string, meObj: any) => {
    setGroup(gid);
    setMe(meObj);
    localStorage.setItem(`${STORAGE_ME}.${gid}`, JSON.stringify(meObj));
    localStorage.setItem(STORAGE_ME, JSON.stringify(meObj));
    localStorage.setItem(STORAGE_GROUP, gid);
    history.replaceState(null, '', `#/${gid}`);
    setNeedsPerm(true);
  };

  // Quit group clears only the session binding to the group; keeps generic fc.me
  const quitGroup = () => {
    const gid = parseHash() || localStorage.getItem(STORAGE_GROUP);
    if (gid) localStorage.removeItem(`${STORAGE_ME}.${gid}`);
    localStorage.removeItem(STORAGE_GROUP);
    setMe(null);
    setGroup(null);
    history.replaceState(null, '', '#/');
  };

  const deepLinkedGroup = parseHash();
  const havePerGroupIdentity =
    !!(deepLinkedGroup && localStorage.getItem(`${STORAGE_ME}.${deepLinkedGroup}`));

  // If deep-linked into a group without a saved identity, force Join in "join" mode.
  if (!me && deepLinkedGroup && !havePerGroupIdentity) {
    return (
      <>
        <Join
          onJoined={onJoined}
          initialGroupId={deepLinkedGroup}
          forceJoin
        />
        <VersionBadge />
      </>
    );
  }

  return (
    <div className="h-full">
      {!groupId ? (
        <>
          <Join onJoined={onJoined} />
          <VersionBadge />
        </>
      ) : !me ? (
        <>
          <Join onJoined={onJoined} initialGroupId={groupId} forceJoin />
          <VersionBadge />
        </>
      ) : needsPerm ? (
        <>
          <PermissionsGate
            onEnableCompass={async () => {
              await requestPermission();
              setNeedsPerm(false);
            }}
          />
          <VersionBadge />
        </>
      ) : (
        <>
          <Compass onQuit={quitGroup} />
          <VersionBadge />
        </>
      )}
    </div>
  );
}
