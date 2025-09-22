import React, { useEffect, useState } from 'react';
import Join from './components/Join';
import Compass from './components/Compass';
import PermissionsGate from './components/PermissionsGate';
import { useStore } from './store';
import { useOrientation } from './hooks/useOrientation';
import ErrorBoundary from './components/ErrorBoundary'; 
import VersionBadge from './components/VersionBadge';

export default function App(){
  const { groupId, setGroup, setMe } = useStore();
  const { requestPermission } = useOrientation();
  const [hasPermScreen, setHasPermScreen] = useState(true);

  useEffect(()=>{
    // Support deep link like https://host/#/ABC123
    const m = location.hash.match(/#\/(\w+)/);
    if (m) setGroup(m[1]);
  },[setGroup]);

  const onJoined = (gid:string, me:any) => {
    setGroup(gid); setMe(me); setHasPermScreen(true);
    history.replaceState(null,'',`#/${gid}`);
  };

  if(!groupId){
    return (
      <ErrorBoundary resetKeys={['nogroup']}>
        <Join onJoined={onJoined}/>
      </ErrorBoundary>
    );
  }

  return (
    <div className="h-full">
      <ErrorBoundary resetKeys={[groupId, hasPermScreen]}>
        {hasPermScreen ? (
          <PermissionsGate onEnableCompass={async ()=>{ await requestPermission(); setHasPermScreen(false); }} />
        ) : (
          <Compass />
        )}
      </ErrorBoundary>
    </div>
  );
  <VersionBadge />
}
