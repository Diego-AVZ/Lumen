import { clamp, shade, uid } from '@/lib/motion';

/**
 * Contrato del universo.
 * Este objeto es el documento entero: se guarda en localStorage,
 * se exporta como JSON y, más adelante, vive en `universes.document` (jsonb).
 * Ver `supabase/schema.sql`.
 */
export const SCHEMA_VERSION = 1 as const;

export const WORLD = { width: 2400, height: 2500 };
export const TITLE_AT = { x: 1180, y: 1080 };

export type StarType = 'historia' | 'lista' | 'carta' | 'notas' | 'archivo' | 'secreto' | 'lugares';

export type Theme = {
  id: string;
  ink: string;
  paper: string;
  gold: string;
  dust: string;
  skyFrom: string;
  skyMid: string;
  skyTo: string;
};

export type Gate = {
  enabled: boolean;
  phrase: string;
  eyebrow: string;
  line: string;
};

export type Intro = {
  forName: string;
  fromName: string;
  dedication: string;
  motto: string;
  cta: string;
  skyTitle: string;
};

export type Meta = {
  id: string;
  title: string;
  titleTouched: boolean;
  slug: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  unlockHash?: string;
};

export type StorySlide = {
  id: string;
  kicker: string;
  title: string;
  body: string;
};

export type StoryBeat = {
  id: string;
  index: string;
  emoji: string;
  title: string;
  date: string;
  lead: string;
  quote: string;
  track: string;
  voiceUrl: string;
  slides: StorySlide[];
};

export type ListOption = {
  id: string;
  emoji: string;
  title: string;
  body: string;
};

export type ListItem = {
  id: string;
  emoji: string;
  title: string;
  when: string;
  /** Día en que la estrella fugaz cae, YYYY-MM-DD. */
  fallsOn: string;
  body: string;
  state: 'abierto' | 'pronto' | 'vivido';
  options: ListOption[];
};

export type Soundtrack = {
  url: string;
  label: string;
};

export type NoteCard = {
  id: string;
  emoji: string;
  title: string;
  text: string;
};

export type Photo = {
  id: string;
  src: string;
  caption: string;
};

export type SecretEntry = {
  id: string;
  title: string;
  body: string;
};

export type Place = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  lat: string;
  lng: string;
};

type StarBase = {
  id: string;
  type: StarType;
  x: number;
  y: number;
  kicker: string;
  label: string;
  glyph: string;
};

export type HistoriaStar = StarBase & { type: 'historia'; beats: StoryBeat[] };
export type ListaStar = StarBase & { type: 'lista'; intro: string; items: ListItem[] };
export type CartaStar = StarBase & { type: 'carta'; kickerText: string; headline: string; body: string; signoff: string; voiceUrl: string };
export type NotasStar = StarBase & { type: 'notas'; cards: NoteCard[] };
export type ArchivoStar = StarBase & { type: 'archivo'; photos: Photo[] };
export type SecretoStar = StarBase & { type: 'secreto'; phrase: string; hint: string; entries: SecretEntry[] };
export type LugaresStar = StarBase & { type: 'lugares'; intro: string; places: Place[] };

export type Star = HistoriaStar | ListaStar | CartaStar | NotasStar | ArchivoStar | SecretoStar | LugaresStar;

export type UniverseDocument = {
  schemaVersion: typeof SCHEMA_VERSION;
  meta: Meta;
  theme: Theme;
  gate: Gate;
  intro: Intro;
  soundtrack: Soundtrack;
  stars: Star[];
};

export const STAR_TYPES: { type: StarType; glyph: string; name: string; line: string }[] = [
  { type: 'historia', glyph: '✦', name: 'Historia', line: 'Capítulos que se deslizan, como quien recuerda.' },
  { type: 'lista', glyph: '▴', name: 'Lista', line: 'Estrellas fugaces que caen el día que tú eliges.' },
  { type: 'carta', glyph: '—', name: 'Carta', line: 'Una página para leer despacio, al final o al principio.' },
  { type: 'notas', glyph: '🌿', name: 'Notas', line: 'Tarjetas pequeñas para días concretos.' },
  { type: 'archivo', glyph: '◎', name: 'Archivo', line: 'Polaroids. Una foto y una frase debajo.' },
  { type: 'secreto', glyph: '◈', name: 'Secreto', line: 'No se abre sin una frase que solo esa persona sabe.' },
  { type: 'lugares', glyph: '⌖', name: 'Lugares', line: 'Sitios en un mapa, con lo que pasó allí.' },
];

export const THEMES: Theme[] = [
  {
    id: 'noche',
    ink: '#0c0b0a',
    paper: '#f3ead8',
    gold: '#e8b86d',
    dust: '#c9a08a',
    skyFrom: '#1c1714',
    skyMid: '#0c0b0a',
    skyTo: '#070606',
  },
  {
    id: 'alba',
    ink: '#1a120e',
    paper: '#f8efe4',
    gold: '#e7a15a',
    dust: '#d4a574',
    skyFrom: '#3a2418',
    skyMid: '#1a120e',
    skyTo: '#0d0907',
  },
  {
    id: 'mar',
    ink: '#071018',
    paper: '#e7eef2',
    gold: '#9ec4d4',
    dust: '#9bb0b8',
    skyFrom: '#143044',
    skyMid: '#071018',
    skyTo: '#04080c',
  },
  {
    id: 'bosque',
    ink: '#0c1210',
    paper: '#e7f0e4',
    gold: '#d2b85a',
    dust: '#9aaf96',
    skyFrom: '#163028',
    skyMid: '#0c1210',
    skyTo: '#060908',
  },
  {
    id: 'vino',
    ink: '#140c10',
    paper: '#f6e8ea',
    gold: '#e0a0a8',
    dust: '#c49aa2',
    skyFrom: '#3a1824',
    skyMid: '#140c10',
    skyTo: '#090608',
  },
];

export function themeFromColors(ink: string, paper: string, gold: string): Theme {
  return {
    id: 'custom',
    ink,
    paper,
    gold,
    dust: shade(paper, -28),
    skyFrom: shade(ink, 22),
    skyMid: ink,
    skyTo: shade(ink, -10),
  };
}

export function placeStar(index: number) {
  const angle = -Math.PI * 0.95 + index * 0.72;
  const radius = 480 + (index % 4) * 78;
  return {
    x: Math.round(clamp(TITLE_AT.x + Math.cos(angle) * radius, 260, WORLD.width - 260)),
    y: Math.round(clamp(TITLE_AT.y + Math.sin(angle) * radius * 0.78, 240, WORLD.height - 260)),
  };
}

function nowIso() {
  return new Date().toISOString();
}

export function blankDocument(): UniverseDocument {
  const stamp = nowIso();
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      id: uid('uni'),
      title: 'Universo sin nombre',
      titleTouched: false,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    theme: { ...THEMES[0] },
    gate: {
      enabled: false,
      phrase: '',
      eyebrow: '',
      line: 'Esto no es para cualquiera.',
    },
    intro: {
      forName: '',
      fromName: '',
      dedication: '',
      motto: 'Recuerda. Vive. Explora.',
      cta: 'Explorar mi universo',
      skyTitle: '',
    },
    soundtrack: { url: '', label: '' },
    stars: [],
  };
}

export function createBeat(n: number): StoryBeat {
  return {
    id: uid('beat'),
    index: String(n + 1).padStart(2, '0'),
    emoji: '✦',
    title: n === 0 ? 'El comienzo' : 'Otro día',
    date: '',
    lead: '',
    quote: '',
    track: '',
    voiceUrl: '',
    slides: [],
  };
}

export function createSlide(n: number): StorySlide {
  return { id: uid('slide'), kicker: String(n + 1).padStart(2, '0'), title: '', body: '' };
}

export function createListItem(): ListItem {
  return {
    id: uid('item'),
    emoji: '✦',
    title: '',
    when: '',
    fallsOn: '',
    body: '',
    state: 'abierto',
    options: [],
  };
}

export function createStar(type: StarType, index: number): Star {
  const info = STAR_TYPES.find((s) => s.type === type)!;
  const pos = placeStar(index);
  const base = {
    id: uid('star'),
    x: pos.x,
    y: pos.y,
    kicker: String(index + 1).padStart(2, '0'),
    label: info.name,
    glyph: info.glyph,
  };
  switch (type) {
    case 'historia':
      return { ...base, type, beats: [createBeat(0)] };
    case 'lista':
      return { ...base, type, intro: '', items: [createListItem()] };
    case 'carta':
      return { ...base, type, kickerText: 'para leer despacio', headline: '', body: '', signoff: '', voiceUrl: '' };
    case 'notas':
      return { ...base, type, cards: [{ id: uid('note'), emoji: '🌿', title: '', text: '' }] };
    case 'archivo':
      return { ...base, type, photos: [] };
    case 'secreto':
      return { ...base, type, phrase: '', hint: 'Solo tú sabes esto.', entries: [{ id: uid('sec'), title: '', body: '' }] };
    case 'lugares':
      return {
        ...base,
        type,
        intro: '',
        places: [{ id: uid('place'), emoji: '⌖', title: '', body: '', lat: '', lng: '' }],
      };
  }
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function normalizeTheme(value: unknown): Theme {
  const raw = (value ?? {}) as Partial<Theme>;
  const known = THEMES.find((t) => t.id === raw.id);
  if (known && !raw.ink) return { ...known };
  const ink = str(raw.ink, THEMES[0].ink);
  const paper = str(raw.paper, THEMES[0].paper);
  const gold = str(raw.gold, THEMES[0].gold);
  const preset = THEMES.find((t) => t.id === raw.id && t.ink === ink);
  if (preset) return { ...preset };
  return {
    id: str(raw.id, 'custom'),
    ink,
    paper,
    gold,
    dust: str(raw.dust, shade(paper, -28)),
    skyFrom: str(raw.skyFrom, shade(ink, 22)),
    skyMid: str(raw.skyMid, ink),
    skyTo: str(raw.skyTo, shade(ink, -10)),
  };
}

function normalizeStar(value: unknown, index: number): Star | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<Star>;
  const type = STAR_TYPES.some((s) => s.type === raw.type) ? raw.type! : null;
  if (!type) return null;
  const fresh = createStar(type, index);
  const pos = placeStar(index);
  return {
    ...fresh,
    ...raw,
    id: str(raw.id, fresh.id),
    type,
    x: typeof raw.x === 'number' ? raw.x : pos.x,
    y: typeof raw.y === 'number' ? raw.y : pos.y,
    kicker: str(raw.kicker, fresh.kicker),
    label: str(raw.label, fresh.label),
    glyph: str(raw.glyph, fresh.glyph),
  } as Star;
}

export function parseDocument(input: unknown): UniverseDocument {
  if (!input || typeof input !== 'object') throw new Error('El archivo no es un universo.');
  const raw = input as Partial<UniverseDocument>;
  if (!Array.isArray(raw.stars)) throw new Error('A este archivo le faltan las estrellas.');
  const base = blankDocument();
  const meta = { ...base.meta, ...(raw.meta ?? {}) };
  if (!meta.id) meta.id = base.meta.id;
  const stars = raw.stars
    .map((star, i) => normalizeStar(star, i))
    .filter((star): star is Star => Boolean(star))
    .map((star) => hydrateStar(star));
  return {
    schemaVersion: SCHEMA_VERSION,
    meta: {
      ...meta,
      title: str(meta.title, base.meta.title),
      titleTouched: Boolean(meta.titleTouched),
      slug: str(meta.slug),
      status: meta.status === 'published' ? 'published' : 'draft',
      createdAt: str(meta.createdAt, base.meta.createdAt),
      updatedAt: str(meta.updatedAt, base.meta.updatedAt),
      unlockHash: str(meta.unlockHash) || undefined,
    },
    theme: normalizeTheme(raw.theme),
    gate: {
      enabled: Boolean(raw.gate?.enabled),
      phrase: str(raw.gate?.phrase),
      eyebrow: str(raw.gate?.eyebrow),
      line: str(raw.gate?.line, base.gate.line),
    },
    intro: {
      forName: str(raw.intro?.forName),
      fromName: str(raw.intro?.fromName),
      dedication: str(raw.intro?.dedication),
      motto: str(raw.intro?.motto, base.intro.motto),
      cta: str(raw.intro?.cta, base.intro.cta),
      skyTitle: str(raw.intro?.skyTitle),
    },
    soundtrack: {
      url: str(raw.soundtrack?.url),
      label: str(raw.soundtrack?.label),
    },
    stars,
  };
}

function hydrateStar(star: Star): Star {
  if (star.type === 'historia') {
    return {
      ...star,
      beats: (star.beats ?? []).map((beat, i) => ({
        id: str(beat?.id, uid('beat')),
        index: str(beat?.index, String(i + 1).padStart(2, '0')),
        emoji: str(beat?.emoji, '✦'),
        title: str(beat?.title),
        date: str(beat?.date),
        lead: str(beat?.lead),
        quote: str(beat?.quote),
        track: str(beat?.track),
        voiceUrl: str(beat?.voiceUrl),
        slides: (beat?.slides ?? []).map((slide, j) => ({
          id: str(slide?.id, uid('slide')),
          kicker: str(slide?.kicker, String(j + 1).padStart(2, '0')),
          title: str(slide?.title),
          body: str(slide?.body),
        })),
      })),
    };
  }
  if (star.type === 'lista') {
    return {
      ...star,
      intro: str(star.intro),
      items: (star.items ?? []).map((item) => ({
        id: str(item?.id, uid('item')),
        emoji: str(item?.emoji, '✦'),
        title: str(item?.title),
        when: str(item?.when),
        fallsOn: str(item?.fallsOn),
        body: str(item?.body),
        state: item?.state === 'pronto' || item?.state === 'vivido' ? item.state : 'abierto',
        options: (item?.options ?? []).slice(0, 2).map((opt) => ({
          id: str(opt?.id, uid('opt')),
          emoji: str(opt?.emoji, '✦'),
          title: str(opt?.title),
          body: str(opt?.body),
        })),
      })),
    };
  }
  if (star.type === 'carta') {
    return {
      ...star,
      kickerText: str(star.kickerText),
      headline: str(star.headline),
      body: str(star.body),
      signoff: str(star.signoff),
      voiceUrl: str(star.voiceUrl),
    };
  }
  if (star.type === 'notas') {
    return {
      ...star,
      cards: (star.cards ?? []).map((card) => ({
        id: str(card?.id, uid('note')),
        emoji: str(card?.emoji, '🌿'),
        title: str(card?.title),
        text: str(card?.text),
      })),
    };
  }
  if (star.type === 'archivo') {
    return {
      ...star,
      photos: (star.photos ?? []).map((photo) => ({
        id: str(photo?.id, uid('photo')),
        src: str(photo?.src),
        caption: str(photo?.caption),
      })),
    };
  }
  if (star.type === 'secreto') {
    return {
      ...star,
      phrase: str(star.phrase),
      hint: str(star.hint),
      entries: (star.entries ?? []).map((entry) => ({
        id: str(entry?.id, uid('sec')),
        title: str(entry?.title),
        body: str(entry?.body),
      })),
    };
  }
  return {
    ...star,
    intro: str(star.intro),
    places: (star.places ?? []).map((place) => ({
      id: str(place?.id, uid('place')),
      emoji: str(place?.emoji, '⌖'),
      title: str(place?.title),
      body: str(place?.body),
      lat: str(place?.lat),
      lng: str(place?.lng),
    })),
  };
}

export function skyName(doc: UniverseDocument) {
  return doc.intro.skyTitle.trim() || doc.intro.forName.trim() || '…';
}

export function displayTitle(doc: UniverseDocument) {
  if (doc.meta.titleTouched && doc.meta.title.trim()) return doc.meta.title.trim();
  if (doc.intro.forName.trim()) return `Para ${doc.intro.forName.trim()}`;
  return doc.meta.title.trim() || 'Universo sin nombre';
}
