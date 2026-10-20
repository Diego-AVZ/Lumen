import { supabase } from '@/lib/supabase';

const VISITOR = 'lumen.visitor.v1';

export type VisitReply = {
  at: string;
  answer: 'yes';
  dateId: string;
  dateLabel: string;
};

export type VisitStat = {
  opens: number;
  lastAt: string;
  lastMs: number;
  noTries?: number;
  reply?: VisitReply;
};

type TrackState = {
  opens?: number;
  lastAt?: string;
  lastMs?: number;
  noTries?: number;
  startedAt?: string;
  reply?: VisitReply;
};

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

function asTrack(state: unknown): TrackState {
  if (!state || typeof state !== 'object') return {};
  const rec = state as Record<string, unknown>;
  if (rec.track && typeof rec.track === 'object') return rec.track as TrackState;
  if (typeof rec.opens === 'number' || rec.reply || rec.lastAt) return rec as TrackState;
  return {};
}

function applyKind(track: TrackState, kind: 'start' | 'pulse' | 'reply' | 'no', extra?: { dateId?: string; dateLabel?: string }): TrackState {
  const now = new Date().toISOString();
  const next: TrackState = { ...track, lastAt: now };
  if (kind === 'start') {
    next.opens = (track.opens ?? 0) + 1;
    next.startedAt = now;
    next.lastMs = 0;
  } else if (kind === 'pulse' && track.startedAt) {
    next.lastMs = Math.max(0, Date.now() - new Date(track.startedAt).getTime());
  } else if (kind === 'no') {
    next.noTries = (track.noTries ?? 0) + 1;
  } else if (kind === 'reply') {
    next.reply = {
      at: now,
      answer: 'yes',
      dateId: extra?.dateId ?? '',
      dateLabel: extra?.dateLabel ?? '',
    };
  }
  return next;
}

async function pingCloud(
  id: string,
  kind: 'start' | 'pulse' | 'reply' | 'no',
  extra?: { dateId?: string; dateLabel?: string },
) {
  if (!supabase) return false;
  const visitor = visitorKey().slice(0, 80);
  const found = await supabase.from('universes').select('id').eq('local_id', id).maybeSingle();
  if (found.error || !found.data?.id) return false;
  const universeId = found.data.id as string;
  const existing = await supabase
    .from('universe_visits')
    .select('state')
    .eq('universe_id', universeId)
    .eq('visitor_key', visitor)
    .maybeSingle();
  const blob =
    existing.data?.state && typeof existing.data.state === 'object'
      ? (existing.data.state as Record<string, unknown>)
      : {};
  const state = { ...blob, track: applyKind(asTrack(blob), kind, extra) };
  const written = await supabase.from('universe_visits').upsert(
    {
      universe_id: universeId,
      visitor_key: visitor,
      state,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'universe_id,visitor_key' },
  );
  return !written.error;
}

function mergeStat(into: VisitStat, track: TrackState): VisitStat {
  const next: VisitStat = {
    opens: into.opens + (track.opens ?? 0),
    lastAt: into.lastAt,
    lastMs: Math.max(into.lastMs, track.lastMs ?? 0),
    noTries: (into.noTries ?? 0) + (track.noTries ?? 0),
    reply: into.reply,
  };
  if (track.lastAt && track.lastAt > (next.lastAt || '')) {
    next.lastAt = track.lastAt;
    next.lastMs = Math.max(next.lastMs, track.lastMs ?? 0);
  }
  if (track.reply && (!next.reply || track.reply.at > next.reply.at)) next.reply = track.reply;
  return next;
}

async function loadCloudStats(): Promise<Record<string, VisitStat> | null> {
  if (!supabase) return null;
  const unis = await supabase.from('universes').select('id, local_id');
  if (unis.error || !unis.data?.length) return unis.error ? null : {};
  const byUuid = new Map(unis.data.map((row) => [String(row.id), String(row.local_id)]));
  const visits = await supabase.from('universe_visits').select('universe_id, state').in('universe_id', [...byUuid.keys()]);
  if (visits.error) return null;
  const stats: Record<string, VisitStat> = {};
  for (const row of visits.data ?? []) {
    const localId = byUuid.get(String(row.universe_id));
    if (!localId) continue;
    const empty: VisitStat = { opens: 0, lastAt: '', lastMs: 0, noTries: 0 };
    stats[localId] = mergeStat(stats[localId] ?? empty, asTrack(row.state));
  }
  return stats;
}

export async function pingVisit(
  id: string,
  kind: 'start' | 'pulse' | 'reply' | 'no',
  extra?: { dateId?: string; dateLabel?: string },
) {
  if (!id) return;
  try {
    if (await pingCloud(id, kind, extra)) return;
    if (!import.meta.env.DEV) return;
    await fetch(`/api/visits/${encodeURIComponent(id)}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ visitor: visitorKey(), kind, ...extra }),
      keepalive: true,
    });
  } catch {
    /* el regalo se abre igual */
  }
}

export async function loadVisitStats(): Promise<Record<string, VisitStat>> {
  try {
    const cloud = await loadCloudStats();
    if (cloud) return cloud;
    if (!import.meta.env.DEV) return {};
    const res = await fetch('/api/visits', { cache: 'no-store' });
    if (!res.ok) return {};
    const data = (await res.json()) as Record<string, VisitStat>;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

export function ago(iso?: string) {
  if (!iso) return 'Todavía no';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'Todavía no';
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 20) return 'Ahora mismo';
  if (seconds < 60) return `Hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  const days = Math.round(hours / 24);
  return `Hace ${days} día${days === 1 ? '' : 's'}`;
}

export function clock(iso?: string) {
  if (!iso) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('es', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function lasted(ms?: number) {
  if (!ms || ms < 5000) return '—';
  const minutes = Math.round(ms / 60000);
  if (minutes < 1) return `${Math.round(ms / 1000)} s`;
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}
