import { supabase } from '@/lib/supabase';
import type { TripDocument } from '@/schema/viaje';

export type TripNote = {
  id: string;
  body: string;
  at: string;
};

const VISITOR = 'lumen.visitor.v1';

function visitorKey() {
  try {
    const existing = localStorage.getItem(VISITOR);
    if (existing) return existing;
    const next = crypto.randomUUID?.() ?? `v_${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(VISITOR, next);
    return next;
  } catch {
    return 'anon';
  }
}

function storeKey(doc: TripDocument, live: boolean) {
  return `lumen.viaje.notes.v1.${live && doc.meta.slug ? doc.meta.slug : doc.meta.id}`;
}

function readLocal(doc: TripDocument, live: boolean): TripNote[] {
  try {
    const raw = localStorage.getItem(storeKey(doc, live));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((row) => {
        if (!row || typeof row !== 'object') return null;
        const rec = row as Record<string, unknown>;
        if (typeof rec.id !== 'string' || typeof rec.body !== 'string') return null;
        return { id: rec.id, body: rec.body, at: typeof rec.at === 'string' ? rec.at : '' };
      })
      .filter((row): row is TripNote => Boolean(row));
  } catch {
    return [];
  }
}

function writeLocal(doc: TripDocument, live: boolean, notes: TripNote[]) {
  try {
    localStorage.setItem(storeKey(doc, live), JSON.stringify(notes.slice(0, 200)));
  } catch {
    /* ignore quota */
  }
}

function asNotes(raw: unknown): TripNote[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((row) => {
      if (!row || typeof row !== 'object') return null;
      const rec = row as Record<string, unknown>;
      if (typeof rec.body !== 'string' || !rec.body.trim()) return null;
      return {
        id: typeof rec.id === 'string' ? rec.id : crypto.randomUUID?.() ?? `n_${Math.random().toString(36).slice(2)}`,
        body: rec.body.trim(),
        at: typeof rec.at === 'string' ? rec.at : String(rec.created_at || ''),
      };
    })
    .filter((row): row is TripNote => Boolean(row));
}

export function notesAreLive(doc: TripDocument, preview?: boolean) {
  return !preview && doc.meta.status === 'published' && Boolean(doc.meta.slug.trim());
}

export async function listTripNotes(doc: TripDocument, live: boolean): Promise<TripNote[]> {
  if (live && supabase && doc.meta.slug.trim()) {
    const { data, error } = await supabase.rpc('trip_notes_list', { p_slug: doc.meta.slug.trim() });
    if (!error) return asNotes(data);
  }
  return readLocal(doc, live);
}

export async function addTripNote(doc: TripDocument, live: boolean, body: string): Promise<TripNote[]> {
  const text = body.replace(/\s+/g, ' ').trim();
  if (text.length < 2) throw new Error('Escribe un poco más.');
  if (text.length > 280) throw new Error('Que quepa en una frase.');
  if (live && supabase && doc.meta.slug.trim()) {
    const { data, error } = await supabase.rpc('trip_note_add', {
      p_slug: doc.meta.slug.trim(),
      p_body: text,
      p_visitor: visitorKey(),
    });
    if (!error) return asNotes(data);
  }
  const next = [{ id: crypto.randomUUID?.() ?? `n_${Date.now()}`, body: text, at: new Date().toISOString() }, ...readLocal(doc, live)];
  writeLocal(doc, live, next);
  return next;
}
