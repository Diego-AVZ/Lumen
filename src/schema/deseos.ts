import { uid } from '@/lib/motion';
import type { Meta } from '@/schema/universe';

export const SPANS = [
  { id: 'tarde', label: 'Una tarde', line: 'Cabe antes de que se haga de noche' },
  { id: 'dia', label: 'Un día', line: 'De sol a sol' },
  { id: 'finde', label: 'Fin de semana', line: 'Salís y volvéis' },
  { id: 'vacaciones', label: 'Vacaciones', line: 'Más de un finde' },
] as const;

export const MOODS = [
  { id: 'tranquilo', label: 'Tranquilo' },
  { id: 'aventura', label: 'Aventura' },
  { id: 'viaje', label: 'Viaje' },
  { id: 'casa', label: 'En casa' },
  { id: 'comida', label: 'Para comer' },
] as const;

export const CADENCES = [
  { days: 1, label: 'Cada día' },
  { days: 7, label: 'Cada semana' },
  { days: 14, label: 'Cada dos semanas' },
  { days: 30, label: 'Cada mes' },
] as const;

export type SpanId = (typeof SPANS)[number]['id'];
export type MoodId = (typeof MOODS)[number]['id'];

export type DeseosDocument = {
  schemaVersion: 1;
  kind: 'deseos';
  meta: Meta;
  listName: string;
  ownerName: string;
  partnerEmail: string;
  everyDays: number;
  maintainDays: number;
  maintainedUntil?: string;
};

function nowIso() {
  return new Date().toISOString();
}

export function blankDeseos(): DeseosDocument {
  const stamp = nowIso();
  return {
    schemaVersion: 1,
    kind: 'deseos',
    meta: {
      id: uid('deseos'),
      title: 'Lista de deseos',
      titleTouched: false,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    listName: '',
    ownerName: '',
    partnerEmail: '',
    everyDays: 7,
    maintainDays: 30,
  };
}

export function deseosTitle(doc: DeseosDocument) {
  if (doc.meta.titleTouched && doc.meta.title.trim()) return doc.meta.title.trim();
  if (doc.listName.trim()) return doc.listName.trim();
  return 'Lista de deseos';
}

export function spanLabel(id: string) {
  return SPANS.find((item) => item.id === id)?.label ?? id;
}

export function moodLabel(id: string) {
  return MOODS.find((item) => item.id === id)?.label ?? id;
}

export function isSpan(value: string): value is SpanId {
  return SPANS.some((item) => item.id === value);
}

export function isMood(value: string): value is MoodId {
  return MOODS.some((item) => item.id === value);
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function parseDeseos(input: unknown): DeseosDocument {
  if (!input || typeof input !== 'object') throw new Error('Eso no es una lista de deseos.');
  const raw = input as Partial<DeseosDocument>;
  const meta = (raw.meta ?? {}) as Partial<Meta>;
  const stamp = nowIso();
  const every = Number(raw.everyDays);
  const maintain = Number(raw.maintainDays);
  return {
    schemaVersion: 1,
    kind: 'deseos',
    meta: {
      id: str(meta.id) || uid('deseos'),
      title: str(meta.title, 'Lista de deseos'),
      titleTouched: Boolean(meta.titleTouched),
      slug: str(meta.slug),
      status: meta.status === 'published' ? 'published' : 'draft',
      createdAt: str(meta.createdAt, stamp),
      updatedAt: str(meta.updatedAt, stamp),
      publishedAt: meta.publishedAt ? str(meta.publishedAt) : undefined,
      unlockHash: meta.unlockHash ? str(meta.unlockHash) : undefined,
      plan: meta.plan,
      purchaseId: meta.purchaseId ? str(meta.purchaseId) : undefined,
    },
    listName: str(raw.listName),
    ownerName: str(raw.ownerName),
    partnerEmail: str(raw.partnerEmail).trim().toLowerCase(),
    everyDays: CADENCES.some((item) => item.days === every) ? every : 7,
    maintainDays: maintain >= 7 && maintain <= 365 ? maintain : 30,
    maintainedUntil: raw.maintainedUntil ? str(raw.maintainedUntil) : undefined,
  };
}

export function maintenanceOpen(doc: DeseosDocument, now = Date.now()) {
  if (!doc.maintainedUntil) return true;
  const until = Date.parse(doc.maintainedUntil);
  return Number.isFinite(until) && until > now;
}

export function extendMaintenance(doc: DeseosDocument, now = Date.now()) {
  const days = doc.maintainDays || 30;
  const current = doc.maintainedUntil ? Date.parse(doc.maintainedUntil) : 0;
  const base = Number.isFinite(current) && current > now ? current : now;
  return { ...doc, maintainedUntil: new Date(base + days * 86400000).toISOString() };
}
