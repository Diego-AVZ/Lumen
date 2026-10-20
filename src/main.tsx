import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/fraunces/latin-400-italic.css';
import '@fontsource/fraunces/latin-600-italic.css';
import '@fontsource/outfit/latin-300.css';
import '@fontsource/outfit/latin-400.css';
import '@fontsource/outfit/latin-500.css';
import '@fontsource/outfit/latin-600.css';
import App from './App';
import './index.css';

try {
  const stored = sessionStorage.getItem('lumen.path');
  if (stored) {
    sessionStorage.removeItem('lumen.path');
    const base = import.meta.env.BASE_URL.replace(/\/$/, '');
    let path = stored;
    if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length) || '/';
    if (!path.startsWith('/')) path = `/${path}`;
    window.history.replaceState(null, '', `${base}${path}`);
  }
} catch {
  /* el router entra en la portada */
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
