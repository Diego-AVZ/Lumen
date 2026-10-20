export function siteBase() {
  return import.meta.env.BASE_URL.replace(/\/$/, '');
}

export function siteRoot() {
  return `${typeof window === 'undefined' ? '' : window.location.origin}${siteBase()}`;
}
