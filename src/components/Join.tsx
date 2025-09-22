import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { ensureAnonAuth } from '../firebase';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import ColorPicker from './ColorPicker';

const STORAGE_ME = 'fc.me';

function randomId(len = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function uniqueColor(existing: string[]) {
  const palette = ['#ef4444','#f97316','#f59e0b','#22c55e','#06b6d4','#3b82f6','#a855f7','#ec4899','#eab308','#10b981','#38bdf8','#60a5fa'];
  for (const c of palette) { if (!existing.includes(c)) return c; }
  return palette[Math.floor(Math.random() * palette.length)];
}

async function dataUrlToFile(dataUrl: string, filename: string): Promise<File> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  return new File([blob], filename, { type: blob.type || 'image/png' });
}

export default function Join({
  onJoined,
}: {
  onJoined: (groupId: string, me: { uid: string; name: string; color: string }) => void;
}) {
  const [mode, setMode] = useState<'create' | 'join'>(location.hash.includes('create') ? 'create' : 'join');
  const [groupId, setGroupId] = useState<string>('');
  const [name, setName] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (mode === 'create' && groupId) {
      const url = `${location.origin}/#/${groupId}`;
      QRCode.toDataURL(url, { width: 512, margin: 1 }).then(setQrDataUrl).catch(() => setQrDataUrl(null));
    } else {
      setQrDataUrl(null);
    }
  }, [mode, groupId]);

  const createGroup = async () => {
    await ensureAnonAuth();
    const id = randomId();
    setGroupId(id);
    await setDoc(doc(db, 'groups', id), { createdAt: Date.now() }, { merge: true });
    setColor(uniqueColor([]));
  };

  const joinGroup = async () => {
    const uid = await ensureAnonAuth();
    const gid = groupId.trim().toUpperCase();
    if (!gid) return;

    const memberRef = doc(db, 'groups', gid, 'members', uid);
    const me = { uid, name: (name || `Friend-${uid.slice(-4)}`).trim(), color };

    await setDoc(memberRef, me, { merge: true });
    // persist identity (generic + per-group)
    localStorage.setItem(STORAGE_ME, JSON.stringify(me));
    localStorage.setItem(`${STORAGE_ME}.${gid}`, JSON.stringify(me));

    onJoined(gid, me);
  };

  const shareInvite = async () => {
    if (!groupId) return;
    const url = `${location.origin}/#/${groupId}`;
    setSharing(true);
    try {
      // Prefer sharing the QR image if we have it
      if (qrDataUrl) {
        const file = await dataUrlToFile(qrDataUrl, `friend-compass-${groupId}.png`);
        const canShareFile = (navigator as any).canShare && (navigator as any).canShare({ files: [file] });
        if (canShareFile) {
          await (navigator as any).share({
            title: 'Join my Friend Compass group',
            text: `Scan or open link to join. Group: ${groupId}`,
            files: [file],
          });
          setSharing(false);
          return;
        }
      }
      // Fallback: share link via Web Share or copy to clipboard
      if ((navigator as any).share) {
        await (navigator as any).share({
          title: 'Join my Friend Compass group',
          text: `Group: ${groupId}`,
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);
        alert('Invite link copied to clipboard!');
      }
    } catch {
      // Final fallback: open QR in new tab for manual save
      if (qrDataUrl) {
        const a = document.createElement('a');
        a.href = qrDataUrl;
        a.download = `friend-compass-${groupId}.png`;
        a.target = '_blank';
        a.click();
      }
    } finally {
      setSharing(false);
    }
  };

  const copyCode = async () => {
    if (!groupId) return;
    try {
      await navigator.clipboard.writeText(groupId);
      alert('Group code copied!');
    } catch {}
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">Friend Compass</h1>

      <div className="flex gap-2">
        <button
          className={`flex-1 py-2 rounded-2xl ${mode === 'create' ? 'bg-slate-700' : 'bg-slate-800'}`}
          onClick={() => setMode('create')}
        >
          Create group
        </button>
        <button
          className={`flex-1 py-2 rounded-2xl ${mode === 'join' ? 'bg-slate-700' : 'bg-slate-800'}`}
          onClick={() => setMode('join')}
        >
          Join group
        </button>
      </div>

      {mode === 'create' && (
        <div className="space-y-3">
          {!groupId ? (
            <button className="w-full py-3 rounded-2xl bg-blue-600" onClick={createGroup}>
              Generate code
            </button>
          ) : (
            <div className="space-y-3">
              <p className="text-slate-300">Share this code or QR:</p>

              <div className="flex items-center justify-center text-3xl font-mono tracking-widest">
                {groupId}
              </div>
              <div className="flex items-center justify-center gap-3">
                <button className="px-3 py-1.5 rounded-xl bg-slate-800 text-sm" onClick={copyCode}>
                  Copy code
                </button>
                <button
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-sm"
                  onClick={shareInvite}
                  disabled={sharing}
                >
                  {sharing ? 'Sharing…' : 'Share invite (QR)'}
                </button>
              </div>

              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="QR to join"
                  className="mx-auto rounded-xl border border-slate-700"
                />
              )}

              <div className="space-y-2">
                <label className="text-sm text-slate-300">Your display name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full p-3 rounded-2xl bg-slate-800 outline-none"
                  placeholder="Alex"
                />
                <label className="text-sm text-slate-300">Your color</label>
                <ColorPicker value={color} onChange={setColor} />
                <button className="w-full py-3 rounded-2xl bg-green-600 mt-2" onClick={joinGroup}>
                  Join my group
                </button>
              </div>

              <div className="pt-1 text-xs text-slate-400 text-center">
                Link:{' '}
                <span className="underline break-all">{`${location.origin}/#/${groupId}`}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {mode === 'join' && (
        <div className="space-y-3">
          <label className="text-sm text-slate-300">Group code</label>
          <input
            value={groupId}
            onChange={(e) => setGroupId(e.target.value.toUpperCase())}
            className="w-full p-3 rounded-2xl bg-slate-800 outline-none"
            placeholder="e.g., 7K3QX2"
            autoCapitalize="characters"
          />
          <label className="text-sm text-slate-300">Your display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-3 rounded-2xl bg-slate-800 outline-none"
            placeholder="Alex"
          />
          <label className="text-sm text-slate-300">Your color</label>
          <ColorPicker value={color} onChange={setColor} />
          <button className="w-full py-3 rounded-2xl bg-green-600 mt-2" onClick={joinGroup}>
            Join
          </button>
        </div>
      )}
    </div>
  );
}
