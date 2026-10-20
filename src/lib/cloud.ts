import type { User } from '@supabase/supabase-js';
import { parseProject, projectTitle, type ProjectDocument } from '@/schema/project';
import { cloudEnabled, supabase } from '@/lib/supabase';
import { siteRoot } from '@/lib/site';
import { hashPhrase } from '@/lib/unlock';

const BUCKET = 'fotos';

export async function currentUser(): Promise<User | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user;
}

export function accountReturnTo() {
  return `${siteRoot()}/crear?vista=plan`;
}

export function gmailInbox(email: string) {
  const trimmed = email.trim();
  const gmail = /@(gmail|googlemail)\.com$/i.test(trimmed);
  return gmail
    ? `https://mail.google.com/mail/u/?authuser=${encodeURIComponent(trimmed)}#inbox`
    : 'https://mail.google.com/mail/u/0/#inbox';
}

export async function sendMagicLink(email: string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: accountReturnTo() },
  });
  if (error) throw cloudError(error);
}

export async function signInWithGoogle() {
  if (!supabase) throw new Error('Supabase no está configurado.');
  if (!(await googleProviderEnabled())) {
    throw new Error(
      'Google no está activado en este proyecto de Supabase. En Authentication → Providers, enciende Google y pega el Client ID y el Secret de Google Cloud.',
    );
  }
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: accountReturnTo(),
      skipBrowserRedirect: true,
      queryParams: { access_type: 'offline', prompt: 'select_account' },
    },
  });
  if (error) throw cloudError(error);
  if (!data.url) throw new Error('Google no devolvió la dirección de entrada.');
  window.location.assign(data.url);
}

async function googleProviderEnabled() {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return false;
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon } });
    if (!res.ok) return false;
    const json = (await res.json()) as { external?: { google?: boolean } };
    return Boolean(json.external?.google);
  } catch {
    return false;
  }
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

async function ensureProfile(user: User) {
  if (!supabase) return;
  const { error } = await supabase.from('profiles').upsert(
    { id: user.id, display_name: user.email ?? '' },
    { onConflict: 'id' },
  );
  if (error) throw cloudError(error);
}

export async function saveUniverse(doc: ProjectDocument) {
  const user = await currentUser();
  if (!supabase) throw new Error('Supabase no está configurado.');
  if (!user) throw new Error('Entra en la cuenta para guardar.');
  await ensureProfile(user);
  const row = {
    local_id: doc.meta.id,
    owner_id: user.id,
    slug: doc.meta.slug || null,
    title: projectTitle(doc),
    status: doc.meta.status,
    document: doc,
    updated_at: doc.meta.updatedAt,
    published_at: doc.meta.publishedAt ?? null,
    unlock_hash: doc.meta.unlockHash || null,
  };
  const { error } = await supabase.from('universes').upsert(row, { onConflict: 'local_id' });
  if (error && /unlock_hash/.test(error.message)) {
    const { unlock_hash: _hash, ...legacy } = row;
    const retry = await supabase.from('universes').upsert(legacy, { onConflict: 'local_id' });
    if (retry.error) throw cloudError(retry.error);
    return;
  }
  if (error) throw cloudError(error);
}

export async function loadPublished(slug: string): Promise<ProjectDocument | null> {
  if (!supabase || !slug) return null;
  const { data, error } = await supabase
    .from('universes')
    .select('document')
    .eq('slug', slug)
    .eq('status', 'published')
    .maybeSingle();
  if (error || !data?.document) return null;
  try {
    return parseProject(data.document);
  } catch {
    return null;
  }
}

export async function inspectGift(slug: string): Promise<'missing' | 'open' | 'locked'> {
  if (!supabase || !slug) return 'missing';
  const rpc = await supabase.rpc('gift_lock', { p_slug: slug });
  if (!rpc.error && (rpc.data === 'missing' || rpc.data === 'open' || rpc.data === 'locked')) {
    return rpc.data;
  }
  const opened = await loadPublished(slug);
  if (!opened) return 'missing';
  return opened.meta.unlockHash ? 'locked' : 'open';
}

export async function openGift(slug: string, phrase: string): Promise<ProjectDocument> {
  if (!supabase || !slug) throw new Error('No encuentro este regalo.');
  const rpc = await supabase.rpc('open_gift', { p_slug: slug, p_phrase: phrase });
  if (!rpc.error && rpc.data) return parseProject(rpc.data);
  if (rpc.error && String(rpc.error.message).includes('wrong_phrase')) {
    throw new Error('La contraseña no es esa.');
  }
  const opened = await loadPublished(slug);
  if (!opened) throw new Error('Este regalo no está publicado.');
  if (!opened.meta.unlockHash) return opened;
  const hashed = await hashPhrase(phrase);
  if (hashed !== opened.meta.unlockHash) throw new Error('La contraseña no es esa.');
  return opened;
}

export type CloudUniverse = {
  id: string;
  title: string;
  slug: string;
  status: 'draft' | 'published';
  updatedAt: string;
  kind: 'universo' | 'cita';
};

function kindOfId(id: string): 'universo' | 'cita' {
  return id.startsWith('cita_') ? 'cita' : 'universo';
}

export async function listMine(): Promise<CloudUniverse[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('universes')
    .select('local_id, title, slug, status, updated_at')
    .order('updated_at', { ascending: false });
  if (error || !data) return [];
  return data.map((row) => {
    const id = String(row.local_id);
    return {
      id,
      title: String(row.title ?? ''),
      slug: String(row.slug ?? ''),
      status: row.status === 'published' ? 'published' : 'draft',
      updatedAt: String(row.updated_at ?? ''),
      kind: kindOfId(id),
    };
  });
}

export async function loadOwned(localId: string): Promise<ProjectDocument | null> {
  if (!supabase) return null;
  const full = await supabase.from('universes').select('document, unlock_hash').eq('local_id', localId).maybeSingle();
  const row = full.error && /unlock_hash/.test(full.error.message)
    ? await supabase.from('universes').select('document').eq('local_id', localId).maybeSingle()
    : full;
  if (row.error || !row.data?.document) return null;
  try {
    const doc = parseProject(row.data.document);
    const hash = 'unlock_hash' in row.data && typeof row.data.unlock_hash === 'string' ? row.data.unlock_hash : '';
    if (hash) doc.meta.unlockHash = hash;
    return doc;
  } catch {
    return null;
  }
}

export async function deleteCloudUniverse(localId: string) {
  if (!supabase) return;
  const user = await currentUser();
  if (!user) return;
  const { error } = await supabase.from('universes').delete().eq('local_id', localId);
  if (error) throw cloudError(error);
}

export async function putPhoto(dataUrl: string, photoId: string): Promise<string> {
  if (!dataUrl.startsWith('data:')) return dataUrl;
  return putFile(dataUrlToBlob(dataUrl), `${photoId}.jpg`, 'image/jpeg');
}

export async function putAudio(blob: Blob, audioId: string): Promise<string> {
  const ext = blob.type.includes('mp4') || blob.type.includes('aac') ? 'm4a' : blob.type.includes('mpeg') ? 'mp3' : 'webm';
  return putFile(blob, `${audioId}.${ext}`, blob.type || 'audio/webm');
}

async function putFile(blob: Blob, filename: string, contentType: string): Promise<string> {
  const user = await currentUser();
  if (!supabase || !user) throw new Error('Entra en la cuenta para subir archivos.');
  const path = `${user.id}/${filename}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType,
    upsert: true,
  });
  if (error) throw cloudError(error);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export { cloudEnabled };

function cloudError(error: unknown) {
  const record = error && typeof error === 'object' ? (error as { message?: string; code?: string; error_code?: string }) : {};
  const message = record.message || '';
  if (record.code === 'PGRST205') {
    return new Error('Falta la tabla de universos. En el SQL de Supabase hay que ejecutar el archivo de Lumen, no el de Valeria.');
  }
  if (message.includes('provider is not enabled') || message.includes('Unsupported provider')) {
    return new Error(
      'Google no está activado en este proyecto de Supabase. En Authentication → Providers, enciende Google y pega el Client ID y el Secret de Google Cloud.',
    );
  }
  return new Error(message || 'Supabase no lo guardó.');
}

function dataUrlToBlob(dataUrl: string) {
  const [head, body] = dataUrl.split(',');
  const mime = /data:(.*?);/.exec(head ?? '')?.[1] || 'image/jpeg';
  const binary = atob(body ?? '');
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}
