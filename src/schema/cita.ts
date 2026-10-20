import { uid } from '@/lib/motion';
import type { Meta } from '@/schema/universe';

export const CITA_PHRASES = [
  '¿Quieres venir conmigo a cenar?',
  '¿Te apetece un café, sin prisa?',
  '¿Salimos el sábado?',
  '¿Me dejas invitarte a algo?',
  '¿Vienes al cine conmigo?',
  '¿Hacemos un plan, tú y yo?',
];

export type DateOption = {
  id: string;
  label: string;
  when: string;
};

export type DateAskDocument = {
  schemaVersion: 1;
  kind: 'cita';
  meta: Meta;
  forName: string;
  fromName: string;
  question: string;
  letter: string;
  dates: DateOption[];
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
    dates: [
      { id: uid('when'), label: 'Viernes por la noche', when: '' },
      { id: uid('when'), label: 'Sábado a media tarde', when: '' },
    ],
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
    },
    forName: str(raw.forName),
    fromName: str(raw.fromName),
    question: str(raw.question, CITA_PHRASES[0]),
    letter: str(raw.letter, 'No hace falta que sea perfecto. Solo quiero verte.'),
    dates: dates.map((item) => ({
      id: str(item?.id) || uid('when'),
      label: str(item?.label),
      when: str(item?.when),
    })),
  };
}

export function formatDateOption(option: DateOption) {
  if (option.when) {
    const date = new Date(option.when);
    if (!Number.isNaN(date.getTime())) {
      const when = new Intl.DateTimeFormat('es', {
        weekday: 'long',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
      return option.label.trim() ? `${option.label} · ${when}` : when;
    }
  }
  return option.label.trim() || 'Un día';
}
