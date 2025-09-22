import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'node:child_process';

function getCommit() {
  try {
    const fromVercel = process.env.VERCEL_GIT_COMMIT_SHA;
    if (fromVercel) return fromVercel.slice(0, 7);
    return execSync('git rev-parse --short HEAD').toString().trim();
  } catch {
    return 'dev';
  }
}

function getPkgVersion() {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const pkg = require('./package.json');
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

export default defineConfig({
  plugins: [react()],
  define: {
    __APP_VERSION__: JSON.stringify(getPkgVersion()),
    __APP_COMMIT__: JSON.stringify(getCommit()),
    __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
});
