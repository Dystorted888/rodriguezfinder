import React from 'react';
import { AVATAR_IDS, AvatarId, AvatarIcon, avatarLabel } from '../avatars';

type Props = {
  value: AvatarId | null;
  onChange: (id: AvatarId) => void;
  disabled?: boolean;
};

export default function AvatarPicker({ value, onChange, disabled }: Props) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {AVATAR_IDS.map((id) => {
        const selected = value === id;
        return (
          <button
            key={id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(id)}
            className={`p-2 rounded-2xl bg-slate-800 hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-500 transition
              ${selected ? 'ring-2 ring-offset-2 ring-offset-slate-900 ring-blue-500' : ''}`}
            aria-pressed={selected}
            aria-label={avatarLabel(id)}
            title={avatarLabel(id)}
          >
            <AvatarIcon id={id} size={52} />
            <div className="mt-1 text-[11px] text-slate-300 truncate">{avatarLabel(id)}</div>
          </button>
        );
      })}
    </div>
  );
}
