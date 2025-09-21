import React from 'react';

const COLORS = [
  '#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899','#eab308','#10b981','#38bdf8','#60a5fa'
];

export default function ColorPicker({ value, onChange }:{ value:string, onChange:(c:string)=>void }){
  return (
    <div className="grid grid-cols-6 gap-2">
      {COLORS.map(c => (
        <button key={c} className="aspect-square rounded-full border-2" style={{ background: c, borderColor: value===c? 'white':'transparent' }} onClick={() => onChange(c)} />
      ))}
    </div>
  );
}