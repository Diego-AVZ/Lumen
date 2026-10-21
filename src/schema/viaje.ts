import { isPlanId } from '@/lib/plans';
import { uid } from '@/lib/motion';
import { parseAttachment, type Attachment } from '@/schema/attach';
import { parseWhen, prettyWhen } from '@/schema/cita';
import type { Meta } from '@/schema/universe';

/**
 * El viaje: un recorrido en satélite y, después, parada a parada.
 */
export const TRIP_SCHEMA_VERSION = 1 as const;

export type TripCurrency = 'EUR' | 'USD';

export type TripIntro = {
  forName: string;
  fromName: string;
  title: string;
  line: string;
  when: string;
};

export type TripBudget = {
  currency: TripCurrency;
  people: string;
  total: string;
  each: string;
  extra: string;
  note: string;
};

export const TRIP_LOOKS = [
  { id: 'lino', name: 'Lino', map: '#122018', sheet: '#f6efe6', ink: '#1b1612', accent: '#8a6232', soft: '#e4d3b8' },
  { id: 'noche', name: 'Noche', map: '#0c0b0a', sheet: '#1c1714', ink: '#f6efe6', accent: '#e8b86d', soft: '#3a3028' },
  { id: 'mar', name: 'Mar', map: '#07141c', sheet: '#e7eef2', ink: '#071018', accent: '#3d6d86', soft: '#c5d5de' },
  { id: 'rosa', name: 'Rosa', map: '#1a1014', sheet: '#f8efe8', ink: '#2a1614', accent: '#a24b4b', soft: '#f0d2c8' },
] as const;

export type TripLookId = (typeof TRIP_LOOKS)[number]['id'];

export function tripLook(id: string) {
  return TRIP_LOOKS.find((look) => look.id === id) ?? TRIP_LOOKS[0];
}

export function sealIsOpen(opensAt: string) {
  const date = parseWhen(opensAt);
  return Boolean(date && date.getTime() <= Date.now());
}

export function sealOpensLabel(opensAt: string) {
  return prettyWhen(opensAt) || 'el día que elijas';
}

/** Sobre de cita colocado en un punto. Se abre en opensAt. */
export type StopSeal = Attachment & { opensAt: string };

export type TripStop = {
  id: string;
  title: string;
  body: string;
  photo: string;
  lat: string;
  lng: string;
  /** Tiempo en esta parada. Vacío: no se enseña. */
  stay: string;
  sleep: string;
  eat: string;
  arrive: string;
  note: string;
  todo: string[];
  /** Estimado de esta parada. Vacío: no se enseña. */
  cost: string;
  seal: StopSeal | null;
};

export type TripDocument = {
  schemaVersion: typeof TRIP_SCHEMA_VERSION;
  kind: 'viaje';
  meta: Meta;
  intro: TripIntro;
  budget: TripBudget;
  look: TripLookId;
  stops: TripStop[];
};

export const TRIP_SLIDE = '__slide__';

export function blankBudget(): TripBudget {
  return { currency: 'EUR', people: '', total: '', each: '', extra: '', note: '' };
}

function nowIso() {
  return new Date().toISOString();
}

export function createStop(): TripStop {
  return {
    id: uid('stop'),
    title: '',
    body: '',
    photo: '',
    lat: '',
    lng: '',
    stay: '',
    sleep: '',
    eat: '',
    arrive: '',
    note: '',
    todo: [],
    cost: '',
    seal: null,
  };
}

export function blankTrip(): TripDocument {
  const stamp = nowIso();
  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    kind: 'viaje',
    meta: {
      id: uid('viaje'),
      title: 'Viaje sin nombre',
      titleTouched: false,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    intro: { forName: '', fromName: '', title: '', line: '', when: '' },
    budget: blankBudget(),
    look: 'lino',
    stops: [createStop()],
  };
}

export function sampleTrip(): TripDocument {
  const stamp = nowIso();
  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    kind: 'viaje',
    meta: {
      id: 'viaje_demo',
      title: 'Para Clara',
      titleTouched: true,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    intro: {
      forName: 'Clara',
      fromName: 'Alex',
      title: 'La costa',
      line: 'Primero el mapa entero. Luego, cada parada.',
      when: 'Cuatro días, sin prisa',
    },
    budget: {
      currency: 'EUR',
      people: '2',
      total: '',
      each: '',
      extra: '60',
      note: 'El extra es el coche. Lo demás, por parada.',
    },
    look: 'lino',
    stops: [
      {
        id: 'stop_malaga',
        title: 'Málaga',
        body: 'Llegamos por la tarde. El puerto está cerca y no hace falta un plan más largo.',
        photo: '',
        lat: '36.721',
        lng: '-4.421',
        stay: 'Una tarde',
        sleep: '',
        eat: 'El café de la esquina',
        arrive: 'En tren, sin maletas de más',
        note: '',
        todo: ['Dejar las cosas', 'Caminar hasta el puerto'],
        cost: '40',
        seal: null,
      },
      {
        id: 'stop_nerja',
        title: 'Nerja',
        body: 'La cala, por la mañana. A las cinco no hay nada que hacer, y está bien que sea así.',
        photo: '',
        lat: '36.747',
        lng: '-3.879',
        stay: 'Dos días',
        sleep: 'La casa blanca',
        eat: 'Donde haya pescado',
        arrive: '',
        note: 'Si hace viento, la cala de al lado.',
        todo: ['Bajar a la cala', 'No reservar la tarde'],
        cost: '180',
        seal: null,
      },
      {
        id: 'stop_frigiliana',
        title: 'Frigiliana',
        body: 'Un pueblo blanco encima del mar. Se sube a comer y se baja.',
        photo: '',
        lat: '36.791',
        lng: '-3.896',
        stay: 'Una comida',
        sleep: '',
        eat: 'En la plaza',
        arrive: 'En coche, veinte minutos',
        note: '',
        todo: ['Perderse por las calles'],
        cost: '35',
        seal: null,
      },
      {
        id: 'stop_granada',
        title: 'Granada',
        body: 'La última noche. Subimos cuando baje el sol, sin cola y sin prisa.',
        photo: '',
        lat: '37.177',
        lng: '-3.599',
        stay: 'Una noche',
        sleep: 'Cerca de la cuesta',
        eat: '',
        arrive: '',
        note: 'La vuelta es al día siguiente, tarde.',
        todo: ['Subir al atardecer'],
        cost: '90',
        seal: null,
      },
    ],
  };
}

export function tripTitle(doc: TripDocument) {
  if (doc.meta.titleTouched && doc.meta.title.trim()) return doc.meta.title.trim();
  if (doc.intro.forName.trim()) return `Para ${doc.intro.forName.trim()}`;
  return 'Viaje sin nombre';
}

export function tripHeadline(doc: TripDocument) {
  if (doc.intro.title.trim()) return doc.intro.title.trim();
  if (doc.intro.forName.trim()) return `Para ${doc.intro.forName.trim()}`;
  return 'El viaje';
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeStop(value: unknown): TripStop {
  const raw = (value ?? {}) as Partial<TripStop>;
  return {
    id: str(raw.id, uid('stop')),
    title: str(raw.title),
    body: str(raw.body),
    photo: str(raw.photo),
    lat: str(raw.lat),
    lng: str(raw.lng),
    stay: str(raw.stay),
    sleep: str(raw.sleep),
    eat: str(raw.eat),
    arrive: str(raw.arrive),
    note: str(raw.note),
    todo: Array.isArray(raw.todo) ? raw.todo.map((item) => str(item)).slice(0, 12) : [],
    cost: str(raw.cost),
    seal: parseSeal(raw.seal),
  };
}

function parseSeal(value: unknown): TripStop['seal'] {
  const link = parseAttachment(value, 'cita');
  if (!link) return null;
  const raw = value as { opensAt?: unknown };
  return { ...link, opensAt: typeof raw.opensAt === 'string' ? raw.opensAt : '' };
}

function normalizeBudget(value: unknown): TripBudget {
  const raw = (value ?? {}) as Partial<TripBudget>;
  return {
    currency: raw.currency === 'USD' ? 'USD' : 'EUR',
    people: str(raw.people),
    total: str(raw.total),
    each: str(raw.each),
    extra: str(raw.extra),
    note: str(raw.note),
  };
}

export function parseTrip(input: unknown): TripDocument {
  if (!input || typeof input !== 'object') throw new Error('El archivo no es un viaje.');
  const raw = input as Partial<TripDocument>;
  if (raw.kind !== 'viaje') throw new Error('Esto no es un viaje.');
  const base = blankTrip();
  const meta = { ...base.meta, ...(raw.meta ?? {}) };
  const intro = (raw.intro ?? {}) as Partial<TripIntro>;
  return {
    schemaVersion: TRIP_SCHEMA_VERSION,
    kind: 'viaje',
    meta: {
      ...meta,
      id: str(meta.id) || uid('viaje'),
      title: str(meta.title, base.meta.title),
      titleTouched: Boolean(meta.titleTouched),
      slug: str(meta.slug),
      status: meta.status === 'published' ? 'published' : 'draft',
      createdAt: str(meta.createdAt, base.meta.createdAt),
      updatedAt: str(meta.updatedAt, base.meta.updatedAt),
      unlockHash: str(meta.unlockHash) || undefined,
      plan: isPlanId(meta.plan) ? meta.plan : undefined,
      purchaseId: str(meta.purchaseId) || undefined,
    },
    intro: {
      forName: str(intro.forName),
      fromName: str(intro.fromName),
      title: str(intro.title),
      line: str(intro.line),
      when: str(intro.when),
    },
    budget: normalizeBudget(raw.budget),
    look: tripLook(str((raw as { look?: unknown }).look)).id,
    stops: Array.isArray(raw.stops) && raw.stops.length ? raw.stops.map(normalizeStop) : [createStop()],
  };
}
