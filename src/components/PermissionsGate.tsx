import React from 'react';
import { useOrientation } from '../hooks/useOrientation';

export default function PermissionsGate({ onEnableCompass }: { onEnableCompass: () => Promise<void> }) {
  const { available } = useOrientation();

  return (
    <div className="p-4 space-y-3 text-center">
      <h2 className="text-xl font-semibold">Enable permissions</h2>
      <p className="text-slate-300">
        We need your location and (optionally) motion sensor for the compass.
      </p>
      <div className="space-y-2">
        <button
          className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700"
          onClick={() => navigator.geolocation.getCurrentPosition(() => {}, () => {}, { timeout: 2000 })}
        >
          Enable Location
        </button>

        {available ? (
          <button
            className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700"
            onClick={onEnableCompass}
          >
            Enable Compass (iOS requires a tap)
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
