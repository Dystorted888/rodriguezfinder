import React, { useEffect, useMemo, useState } from 'react';
import QRCode from 'qrcode';
import { ensureAnonAuth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ColorPicker from './ColorPicker';
import AvatarPicker from './AvatarPicker';
import type { AvatarId } from '../avatars';

function randomId(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function uniqueColor(existing: string[]) {
  const palette = ['#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899','#eab308','#10b981','#38bdf8','#60a5fa'];
  for (const c of palette) { if (!existing.includes(c)) return c; }
  return palette[Math.floor(Math.random() * palette.length)];
}

export default function Join({
  onJoined
}: {
  onJoined: (groupId: string, me: { uid: string, name: string, color: string, avatarId: AvatarId }) => void
}) {
  const [mode, setMode] = useState<'create'|'join'>(location.hash.includes('create') ? 'create' : 'join');
  const [groupId, setGroupId] = useState<string>('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [avatarId, setAvatarId] = useState<AvatarId | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  useEffect(() => {
    if (mode === 'create' && groupId) {
      const url = `${location.origin}/#/${groupId}`;
      QRCode.toDataURL(url, { width: 240 }).then(setQrDataUrl);
    } else setQrDataUrl(null);
  }, [mode, groupId]);

  const disabledJoin = useMemo(() => {
    return !groupId.trim() || !name.trim() || !avatarId;
  }, [groupId, name, avatarId]);

  const createGroup = async () => {
    await ensureAnonAuth();
    const id = randomId();
    setGroupId(id);
    await setDoc(doc(db, 'groups', id), { createdAt: Date.now() }, { merge: true });
    setColor(uniqueColor([]));
  };

  const joinGroup = async () => {
    const uid = await ensureAnonAuth();
    if (!groupId || !avatarId) return;

    const memberRef = doc(db, 'groups', groupId.trim(), 'members', uid);
    const me = {
      uid,
      name: name.trim(),
      color,
      avatarId
    };

    await setDoc(memberRef, me, { merge: true });
    onJoined(groupId.trim(), me);
  };

  const shareGroupLink = async () => {
    if (!groupId) return;
    const url = `${location.origin}/#/${groupId}`;
    try {
      await (navigator as any).share?.({ title: 'Join my Rodriguez Finder', text: `Group ${groupId}`, url })
        ?? navigator.clipboard.writeText(url);
      alert('Invite link shared/copied!');
    } catch {}
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Rodriguez Finder</h1>

      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-2xl ${mode==='create'?'bg-slate-700':'bg-slate-800'}`}
          onClick={()=>setMode('create')}
        >Créer un groupe</button>
        <button
          className={`flex-1 py-2 rounded-2xl ${mode==='join'?'bg-slate-700':'bg-slate-800'}`}
          onClick={()=>setMode('join')}
        >Rejoindre</button>
      </div>

      {mode==='create' && (
        <div className="space-y-3">
          {!groupId ? (
            <button className="w-full py-3 rounded-2xl bg-blue-600" onClick={createGroup}>
              Générer un code
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-300">Partage ce code ou QR :</p>
              <div className="flex items-center justify-center text-3xl font-mono tracking-widest">{groupId}</div>
              {qrDataUrl && <img src={qrDataUrl} alt="QR pour rejoindre" className="mx-auto" />}
              <button className="text-xs underline mx-auto block" onClick={shareGroupLink}>Partager</button>

              <div className="space-y-3">
                <label className="text-sm text-slate-300">Ton pseudo</label>
                <input
                  value={name}
                  onChange={e=>setName(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-800 outline-none"
                  placeholder="Alex"
                />

                <label className="text-sm text-slate-300">Ta couleur</label>
                <ColorPicker value={color} onChange={setColor} />

                <label className="text-sm text-slate-300">Ton avatar</label>
                <AvatarPicker value={avatarId} onChange={setAvatarId} />

                <button
                  className={`w-full py-3 rounded-2xl mt-2 ${disabledJoin ? 'bg-slate-700 opacity-60' : 'bg-green-600'}`}
                  disabled={disabledJoin}
                  onClick={joinGroup}
                >
                  Rejoindre mon groupe
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {mode==='join' && (
        <div className="space-y-3">
          <label className="text-sm text-slate-300">Code du groupe</label>
          <input
            value={groupId}
            onChange={e=>setGroupId(e.target.value.toUpperCase())}
            className="w-full p-3 rounded-2xl bg-slate-800 outline-none"
            placeholder="ex: 7K3QX2"
          />

          <label className="text-sm text-slate-300">Ton pseudo</label>
          <input
            value={name}
            onChange={e=>setName(e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-800 outline-none"
            placeholder="Alex"
          />

          <label className="text-sm text-slate-300">Ta couleur</label>
          <ColorPicker value={color} onChange={setColor} />

          <label className="text-sm text-slate-300">Ton avatar</label>
          <AvatarPicker value={avatarId} onChange={setAvatarId} />

          <button
            className={`w-full py-3 rounded-2xl mt-2 ${disabledJoin ? 'bg-slate-700 opacity-60' : 'bg-green-600'}`}
            disabled={disabledJoin}
            onClick={joinGroup}
          >
            Rejoindre
          </button>
        </div>
      )}
    </div>
  );
}
