import React from 'react';
import { useOrientation } from '../hooks/useOrientation';

export default function PermissionsGate({ onEnableCompass }: { onEnableCompass: () => Promise<void> }) {
  const { available } = useOrientation();

  return (
    <div className="p-4 space-y-3 text-center">
      <h2 className="text-xl font-semibold">Activer les permissions</h2>
      <p className="text-slate-300">
        J'ai besoin de ta localisation et optionnellement de ton motion sensor pour le compas.
      </p>
      <div className="space-y-2">
        <button
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700"
          onClick={() => navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 2000 })}
        >
          1. Click pour activer la localisation
        </button>

        {available ? (
          <button
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700"
            onClick={onEnableCompass}
          >
            2. Active le compas (Pour IOS, just cliquez ici directement!)
          </button>
        ) : (
          <div className="text-sm text-amber-300">
            Compass not available in this context. Use HTTPS (tunnel or Vercel) to test on Android.
          </div>
        )}
      </div>
    </div>
  );
}
