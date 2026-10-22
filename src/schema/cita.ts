import { uid } from '@/lib/motion';
import { isPlanId } from '@/lib/plans';
import { parseAttachment, type Attachment } from '@/schema/attach';
import type { Meta } from '@/schema/universe';

export const CITA_PHRASES = [
  '¿Quieres venir conmigo a cenar?',
  '¿Te apetece un café, sin prisa?',
  '¿Salimos el sábado?',
  '¿Me dejas invitarte a algo?',
  '¿Vienes al cine conmigo?',
  '¿Hacemos un plan, tú y yo?',
];

export const CITA_SEALS = [
  { id: 'heart', label: 'Corazón' },
  { id: 'star', label: 'Estrella' },
  { id: 'bear', label: 'Osito' },
  { id: 'dog', label: 'Salchicha' },
] as const;

export type CitaSeal = (typeof CITA_SEALS)[number]['id'];

export const CITA_EYEBROWS = ['Una cita', 'Un plan', 'Una quedada', 'Un café', 'Una salida'] as const;

export function citaEyebrowText(doc: { eyebrow: string; fromName: string }) {
  const raw = doc.eyebrow.trim();
  if (!raw || raw === 'cita') return 'Una cita';
  if (raw === 'from') return doc.fromName.trim() ? `De ${doc.fromName.trim()}` : 'De quien invita';
  if (raw === 'plan') return 'Un plan';
  if (raw === 'quedada') return 'Una quedada';
  if (raw === 'cafe') return 'Un café';
  if (raw === 'salida') return 'Una salida';
  return raw.slice(0, 42);
}

export function isCitaSeal(value: string): value is CitaSeal {
  return CITA_SEALS.some((item) => item.id === value);
}

export type DateOption = {
  id: string;
  label: string;
  when: string;
};

/** Un plan o un sitio para elegir, cuando el sí ya está claro. */
export type CitaVale = {
  id: string;
  title: string;
  line: string;
};

export type DateAskDocument = {
  schemaVersion: 1;
  kind: 'cita';
  meta: Meta;
  forName: string;
  fromName: string;
  question: string;
  letter: string;
  seal: CitaSeal;
  eyebrow: string;
  envelope: string;
  dates: DateOption[];
  vales: CitaVale[];
  /** Viaje publicado que se abre desde el sobre. */
  trip: Attachment | null;
};

function nowIso() {
  return new Date().toISOString();
}

export function blankCita(): DateAskDocument {
  const stamp = nowIso();
  return {
    schemaVersion: 1,
    kind: 'cita',
    meta: {
      id: uid('cita'),
      title: 'Pedir cita',
      titleTouched: false,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    forName: '',
    fromName: '',
    question: CITA_PHRASES[0],
    letter: 'No hace falta que sea perfecto. Solo quiero verte.',
    seal: 'heart',
    eyebrow: 'Una cita',
    envelope: '',
    vales: [],
    trip: null,
    dates: nearbySlots()
      .slice(0, 2)
      .map((slot) => ({ id: uid('when'), label: slot.label, when: slot.when })),
  };
}

export function citaTitle(doc: DateAskDocument) {
  if (doc.meta.titleTouched && doc.meta.title.trim()) return doc.meta.title.trim();
  if (doc.forName.trim()) return `Cita para ${doc.forName.trim()}`;
  return doc.meta.title.trim() || 'Pedir cita';
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

export function parseCita(input: unknown): DateAskDocument {
  if (!input || typeof input !== 'object') throw new Error('Eso no es una cita.');
  const raw = input as Partial<DateAskDocument>;
  const meta = (raw.meta ?? {}) as Partial<Meta>;
  const stamp = nowIso();
  const dates = Array.isArray(raw.dates) && raw.dates.length ? raw.dates : [{ id: 'when_1', label: 'Cuando quieras', when: '' }];
  return {
    schemaVersion: 1,
    kind: 'cita',
    meta: {
      id: str(meta.id) || uid('cita'),
      title: str(meta.title, 'Pedir cita'),
      titleTouched: Boolean(meta.titleTouched),
      slug: str(meta.slug),
      status: meta.status === 'published' ? 'published' : 'draft',
      createdAt: str(meta.createdAt, stamp),
      updatedAt: str(meta.updatedAt, stamp),
      unlockHash: str(meta.unlockHash) || undefined,
      plan: isPlanId(meta.plan) ? meta.plan : undefined,
      purchaseId: str(meta.purchaseId) || undefined,
    },
    forName: str(raw.forName),
    fromName: str(raw.fromName),
    question: str(raw.question, CITA_PHRASES[0]),
    letter: str(raw.letter, 'No hace falta que sea perfecto. Solo quiero verte.'),
    seal: (() => {
      const seal = str(raw.seal);
      return isCitaSeal(seal) ? seal : 'heart';
    })(),
    eyebrow: citaEyebrowText({ eyebrow: str(raw.eyebrow), fromName: str(raw.fromName) }),
    envelope: str(raw.envelope).slice(0, 42),
    vales: Array.isArray(raw.vales)
      ? raw.vales.slice(0, 2).map((item) => ({
          id: str(item?.id) || uid('vale'),
          title: str(item?.title).slice(0, 48),
          line: str(item?.line).slice(0, 90),
        }))
      : [],
    trip: parseAttachment(raw.trip, 'viaje'),
    dates: dates.map((item) => ({
      id: str(item?.id) || uid('when'),
      label: str(item?.label),
      when: str(item?.when),
    })),
  };
}

export function prettyWhen(when: string) {
  if (!when) return '';
  const date = parseWhen(when);
  if (!date) return '';
  const text = new Intl.DateTimeFormat('es', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatDateOption(option: DateOption) {
  const when = prettyWhen(option.when);
  if (when) return when;
  return option.label.trim() || 'Un día';
}

export function parseWhen(value: string) {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(match[4] || 20), Number(match[5] || 0));
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInput(value: string) {
  const date = parseWhen(value);
  if (!date) return '';
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function toTimeInput(value: string) {
  const date = parseWhen(value);
  if (!date) return '';
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDateTime(day: string, time: string) {
  if (!day) return '';
  return `${day}T${time || '20:00'}`;
}

function pad(n: number) {
  return String(n).padStart(2, '0');
}

export function nearbySlots(from = new Date()) {
  const hours = [12, 14, 17, 19, 20, 21];
  const slots: { when: string; label: string }[] = [];
  for (let day = 0; day < 10 && slots.length < 6; day += 1) {
    const date = new Date(from);
    date.setDate(from.getDate() + day);
    for (const hour of hours) {
      date.setHours(hour, 0, 0, 0);
      if (date.getTime() <= from.getTime() + 30 * 60000) continue;
      const when = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(hour)}:00`;
      slots.push({ when, label: prettyWhen(when) });
      if (slots.length >= 6) break;
    }
  }
  return slots;
}
