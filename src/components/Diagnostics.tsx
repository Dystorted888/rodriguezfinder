import React from 'react';

export default function Diagnostics({ me, geo, heading, groupId }:{
  me:any; geo:any; heading:number|null; groupId:string|null;
}){
  const acc = geo?.accuracy != null ? `${Math.round(geo.accuracy)} m` : '—';
  const spd = geo?.speed != null ? `${(geo.speed).toFixed(2)} m/s` : '—';
  const gpsH = geo?.headingFromGPS != null ? `${Math.round(geo.headingFromGPS)}°` : '—';
  const head = heading != null ? `${Math.round(heading)}°` : '—';
  const ts = geo?.timestamp ? `${Math.round((Date.now()-geo.timestamp)/1000)}s ago` : '—';
  return (
    <div className="fixed bottom-14 left-2 right-2 text-[11px] leading-5 bg-black/60 text-slate-200 p-2 rounded-xl">
      <div>Group: <span className="font-mono">{groupId || '—'}</span></div>
      <div>Me: <span className="font-mono">{me?.name || '—'}</span></div>
      <div>Lat/Lng: <span className="font-mono">{geo ? `${geo.lat.toFixed(6)}, ${geo.lng.toFixed(6)}` : '—'}</span></div>
      <div>Acc: {acc} · Speed: {spd} · GPS°: {gpsH} · Compass°: {head}</div>
      <div>Geo age: {ts}</div>
    </div>
  );
}
