// src/service-worker-registration.ts
// For MVP: fully disable PWA SW to avoid stale chunk 404s and caching weirdness.
// This file *unregisters* any previously registered SW in production.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.getRegistrations?.().then((regs) => {
      regs.forEach((r) => r.unregister().catch(() => {}));
    }).catch(() => {});
  });
}
