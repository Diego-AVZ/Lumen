export async function hashPhrase(phrase: string) {
  const bytes = new TextEncoder().encode(phrase);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

const remember = (slug: string) => `lumen.unlock.${slug}`;

export function rememberedPhrase(slug: string) {
  try {
    return sessionStorage.getItem(remember(slug)) ?? '';
  } catch {
    return '';
  }
}

export function rememberPhrase(slug: string, phrase: string) {
  try {
    sessionStorage.setItem(remember(slug), phrase);
  } catch {
    /* el regalo se abre igual */
  }
}
