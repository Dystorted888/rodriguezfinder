import React, { useEffect, useState } from 'react';
import Join from './components/Join';
import Compass from './components/Compass';
import PermissionsGate from './components/PermissionsGate';
import { useStore } from './store';
import { useOrientation } from './hooks/useOrientation';

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
    return <Join onJoined={onJoined}/>;
  }

  return (
    <div className="h-full">
      {hasPermScreen && (
        <PermissionsGate onEnableCompass={async ()=>{ await requestPermission(); setHasPermScreen(false); }} />
      )}
      {!hasPermScreen && <Compass />}
    </div>
  );
}