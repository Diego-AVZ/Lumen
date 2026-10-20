import type { CloudUniverse } from '@/lib/cloud';
import { supabase } from '@/lib/supabase';
import { isMood, isSpan, type MoodId, type SpanId } from '@/schema/deseos';
import { parseProject, type ProjectDocument } from '@/schema/project';

export type Wish = {
  id: string;
  title: string;
  note: string;
  span: SpanId;
  moods: MoodId[];
  enjoyedAt: string | null;
  createdAt: string;
  rank: number;
  author: string;
  mine: boolean;
};

export type WishDraw = {
  round: string;
  wishId: string;
  at: string;
};

function explain(error: { message?: string; code?: string } | null) {
  const message = error?.message || '';
  if (error?.code === 'PGRST202' || error?.code === 'PGRST205' || /wish_board|wish_add|wish_spin|schema cache/i.test(message)) {
    return 'Falta el SQL de la lista de deseos. Está al final de schema.sql, en el bloque de wishes.';
  }
  return message || 'La lista no respondió.';
}

function asWish(raw: unknown, userId: string): Wish | null {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!row || typeof row.id !== 'string' || typeof row.title !== 'string') return null;
  const span = String(row.span || '');
  if (!isSpan(span)) return null;
  const moods = Array.isArray(row.moods) ? row.moods.map(String).filter(isMood) : [];
  return {
    id: row.id,
    title: row.title,
    note: String(row.note || ''),
    span,
    moods,
    enjoyedAt: row.enjoyed_at ? String(row.enjoyed_at) : null,
    createdAt: String(row.created_at || ''),
    rank: Number(row.rank) || 0,
    author: String(row.author || ''),
    mine: String(row.author_id || '') === userId,
  };
}

async function userId() {
  if (!supabase) return '';
  const { data } = await supabase.auth.getSession();
  return data.session?.user.id ?? '';
}

export async function loadBoard(projectId: string): Promise<{ wishes: Wish[]; draws: WishDraw[] }> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc('wish_board', { p_project: projectId });
  if (error) throw new Error(explain(error));
  const uid = await userId();
  const body = (data && typeof data === 'object' ? data : {}) as { items?: unknown; draws?: unknown };
  const wishes = Array.isArray(body.items) ? body.items.map((row) => asWish(row, uid)).filter((row): row is Wish => Boolean(row)) : [];
  const draws = Array.isArray(body.draws)
    ? body.draws
        .map((row) => {
          const rec = row as Record<string, unknown>;
          if (!rec || typeof rec.wish_id !== 'string') return null;
          return { round: String(rec.round_key || ''), wishId: rec.wish_id, at: String(rec.created_at || '') };
        })
        .filter((row): row is WishDraw => Boolean(row))
    : [];
  return { wishes, draws };
}

export async function addWish(projectId: string, input: { title: string; note: string; span: SpanId; moods: MoodId[] }) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.rpc('wish_add', {
    p_project: projectId,
    p_title: input.title,
    p_note: input.note,
    p_span: input.span,
    p_moods: input.moods,
  });
  if (error) throw new Error(explain(error));
}

export async function enjoyWish(projectId: string, wishId: string, enjoyed: boolean) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.rpc('wish_enjoy', { p_project: projectId, p_id: wishId, p_enjoyed: enjoyed });
  if (error) throw new Error(explain(error));
}

export async function moveWish(projectId: string, wishId: string, dir: -1 | 1) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { error } = await supabase.rpc('wish_move', { p_project: projectId, p_id: wishId, p_dir: dir });
  if (error) throw new Error(explain(error));
}

export async function spinWish(projectId: string, span: SpanId, moods: MoodId[]): Promise<{ wish: Wish; fresh: boolean }> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc('wish_spin', { p_project: projectId, p_span: span, p_moods: moods });
  if (error) throw new Error(explain(error));
  const body = (data && typeof data === 'object' ? data : {}) as { fresh?: boolean; wish?: unknown };
  const uid = await userId();
  const wish = asWish(body.wish, uid);
  if (!wish) throw new Error('La ruleta no devolvió un plan.');
  return { wish, fresh: Boolean(body.fresh) };
}

export async function openWishProject(projectId: string): Promise<ProjectDocument | null> {
  if (!supabase || !projectId) return null;
  const { data, error } = await supabase.rpc('wish_open', { p_project: projectId });
  if (error || !data) return null;
  try {
    return parseProject(data);
  } catch {
    return null;
  }
}

export async function listPartnerBoards(): Promise<CloudUniverse[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('wish_mine');
  if (error || !Array.isArray(data)) return [];
  return data.map((row) => {
    const rec = row as Record<string, unknown>;
    return {
      id: String(rec.id || ''),
      title: String(rec.title || 'Lista de deseos'),
      slug: String(rec.slug || ''),
      status: rec.status === 'published' ? 'published' : 'draft',
      updatedAt: String(rec.updatedAt || ''),
      kind: 'deseos',
    } satisfies CloudUniverse;
  }).filter((row) => row.id);
}
