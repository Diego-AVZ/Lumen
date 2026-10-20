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

export async function pingVisit(
  id: string,
  kind: 'start' | 'pulse' | 'reply' | 'no',
  extra?: { dateId?: string; dateLabel?: string },
) {
  if (!id) return;
  try {
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
