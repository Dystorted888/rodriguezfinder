import React from 'react';
import { APP_VERSION, APP_COMMIT, BUILD_TIME } from '../version';

export default function VersionBadge() {
  return (
    <div className="fixed bottom-2 left-1/2 -translate-x-1/2 text-[11px] text-slate-400 bg-black/40 px-2 py-1 rounded-full pointer-events-none">
      v{APP_VERSION} · {APP_COMMIT} · {new Date(BUILD_TIME).toLocaleString()}
    </div>
  );
}
