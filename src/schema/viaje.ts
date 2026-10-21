import { isPlanId } from '@/lib/plans';
import { uid } from '@/lib/motion';
import type { Meta } from '@/schema/universe';

/**
 * El viaje: un recorrido en satélite y, después, parada a parada.
 */
export const TRIP_SCHEMA_VERSION = 1 as const;

export type TripIntro = {
  forName: string;
  fromName: string;
  title: string;
  line: string;
  when: string;
};

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
};

export type TripDocument = {
  schemaVersion: typeof TRIP_SCHEMA_VERSION;
  kind: 'viaje';
  meta: Meta;
  intro: TripIntro;
  stops: TripStop[];
};

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
    stops: Array.isArray(raw.stops) && raw.stops.length ? raw.stops.map(normalizeStop) : [createStop()],
  };
}
