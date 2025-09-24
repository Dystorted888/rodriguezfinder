import React from 'react';
import { AVATAR_IDS, AvatarId, AvatarIcon, avatarLabel } from '../avatars';

export default function AvatarPicker({
  value,
  onChange,
}: {
  value: AvatarId | null;
  onChange: (id: AvatarId) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-4 gap-3">
        {AVATAR_IDS.map((id) => {
          const selected = value === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={`rounded-2xl p-2 bg-slate-800/70 hover:bg-slate-800 border ${
                selected ? 'border-blue-400 ring-2 ring-blue-400/40' : 'border-slate-700'
              } flex flex-col items-center gap-1`}
              aria-pressed={selected}
              aria-label={avatarLabel(id)}
            >
              <div className="rounded-xl bg-slate-900/40 p-1">
                <AvatarIcon id={id} size={44} />
              </div>
              <div className="text-[11px] leading-none text-slate-300 line-clamp-1">
                {avatarLabel(id)}
              </div>
            </button>
          );
        })}
      </div>
      {value && (
        <div className="text-xs text-slate-400">
          Sélectionné : <span className="text-slate-200">{avatarLabel(value)}</span>
        </div>
      )}
    </div>
  );
}
