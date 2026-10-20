const AUTH_ERROR = 'lumen.authError';

function restoreReturnPath() {
  const stored = sessionStorage.getItem('lumen.path');
  if (!stored) return;
  sessionStorage.removeItem('lumen.path');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  let path = stored;
  if (base && (path === base || path.startsWith(`${base}/`))) path = path.slice(base.length) || '/';
  if (!path.startsWith('/')) path = `/${path}`;
  window.history.replaceState(null, '', `${base}${path}`);
}

function rememberAuthError() {
  const search = new URLSearchParams(window.location.search);
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const code = hash.get('error') || search.get('error') || '';
  const description = hash.get('error_description') || search.get('error_description') || '';
  if (!code && !description) return;
  const text = decodeURIComponent((description || code).replace(/\+/g, ' '));
  sessionStorage.setItem(AUTH_ERROR, text);
  search.delete('error');
  search.delete('error_code');
  search.delete('error_description');
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const nextPath = path === base || path === '/' ? `${base}/crear` : window.location.pathname;
  const query = search.toString();
  window.history.replaceState(null, '', `${nextPath}${query ? `?${query}` : ''}`);
}

try {
  restoreReturnPath();
  rememberAuthError();
} catch {
  /* sigue a la portada */
}

export function takeAuthError() {
  try {
    const value = sessionStorage.getItem(AUTH_ERROR);
    if (value) sessionStorage.removeItem(AUTH_ERROR);
    return value || '';
  } catch {
    return '';
  }
}

export function explainAuthError(raw: string) {
  const text = raw.toLowerCase();
  if (!text) return '';
  if (text.includes('access_denied') || text.includes('access denied')) return 'Has cerrado Google antes de entrar.';
  if (
    text.includes('already registered') ||
    text.includes('already been registered') ||
    text.includes('identity already') ||
    text.includes('email address is already') ||
    text.includes('user already')
  ) {
    return 'Ese Gmail ya tenía cuenta, creada con el enlace del correo. En Supabase, Authentication, activa el enlace automático de identidades con el mismo email. Mientras tanto entra con el enlace del correo.';
  }
  if (text.includes('redirect') || text.includes('not allowed') || text.includes('invalid request')) {
    return 'Google volvió a una dirección que Supabase no acepta. En Authentication → URL Configuration tiene que estar la raíz de Lumen y también /crear.';
  }
  return raw;
}
