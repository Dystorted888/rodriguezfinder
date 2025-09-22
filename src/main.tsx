import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './service-worker-registration';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

if (import.meta.env.DEV) {
  window.addEventListener('error', (e) => {
    console.error('Global error:', e.error || e.message);
    alert('Error: ' + (e.error?.message || e.message)); // temporary to see it on phone
  });
  window.addEventListener('unhandledrejection', (e: any) => {
    console.error('Unhandled rejection:', e.reason);
    alert('Promise error: ' + (e.reason?.message || String(e.reason)));
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);