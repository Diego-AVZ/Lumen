import { isPlanId } from '@/lib/plans';
import { uid } from '@/lib/motion';
import type { Meta } from '@/schema/universe';

/**
 * Una web personalizada: páginas, no un cielo.
 * El documento se guarda igual que el resto, en `universes.document`.
 */
export const WEB_SCHEMA_VERSION = 1 as const;

export type WebTheme = {
  id: string;
  ink: string;
  paper: string;
  gold: string;
};

export type WebIntro = {
  forName: string;
  fromName: string;
  line: string;
};

export type Soundtrack = {
  url: string;
  label: string;
};

export type WebQuiz = {
  question: string;
  answers: string[];
  hint: string;
};

export type TextBlock = {
  id: string;
  type: 'texto';
  kicker: string;
  title: string;
  body: string;
};

export type ImageBlock = {
  id: string;
  type: 'imagen';
  src: string;
  caption: string;
};

export type AudioBlock = {
  id: string;
  type: 'audio';
  url: string;
  label: string;
};

export type SpotifyBlock = {
  id: string;
  type: 'spotify';
  url: string;
  label: string;
};

export type HeartBlock = {
  id: string;
  type: 'corazon';
  line: string;
  taps: number;
  detail: string;
  photo: string;
};

export type PlanSide = {
  title: string;
  body: string;
};

export type ListRound = {
  id: string;
  title: string;
  a: PlanSide;
  b: PlanSide;
};

export type ListBlock = {
  id: string;
  type: 'lista';
  intro: string;
  everyDays: number;
  startsOn: string;
  rounds: ListRound[];
};

export type WebPlace = {
  id: string;
  emoji: string;
  title: string;
  body: string;
  lat: string;
  lng: string;
};

export type MapBlock = {
  id: string;
  type: 'mapa';
  intro: string;
  places: WebPlace[];
};

export type WebBlock = TextBlock | ImageBlock | AudioBlock | SpotifyBlock | HeartBlock | ListBlock | MapBlock;
export type WebBlockType = WebBlock['type'];

export type WebPage = {
  id: string;
  title: string;
  nav: string;
  quiz: WebQuiz;
  blocks: WebBlock[];
};

export type WebDocument = {
  schemaVersion: typeof WEB_SCHEMA_VERSION;
  kind: 'web';
  meta: Meta;
  theme: WebTheme;
  intro: WebIntro;
  soundtrack: Soundtrack;
  pages: WebPage[];
};

export const WEB_THEMES: WebTheme[] = [
  { id: 'lino', ink: '#1b1612', paper: '#f6efe6', gold: '#8a6232' },
  { id: 'noche', ink: '#f3ead8', paper: '#14110e', gold: '#e8b86d' },
  { id: 'vino', ink: '#2a1418', paper: '#f8eef0', gold: '#a24a58' },
  { id: 'mar', ink: '#102028', paper: '#eef3f6', gold: '#3d6d82' },
];

export const WEB_BLOCKS: { type: WebBlockType; name: string; line: string }[] = [
  { type: 'texto', name: 'Texto', line: 'Un título y un párrafo.' },
  { type: 'imagen', name: 'Imagen', line: 'Una foto y una frase debajo.' },
  { type: 'audio', name: 'Audio', line: 'Una nota de voz.' },
  { type: 'spotify', name: 'Spotify', line: 'Una canción, un álbum o una lista.' },
  { type: 'corazon', name: 'Corazón', line: 'Hay que tocarlo para ver el detalle o la foto.' },
  { type: 'lista', name: 'Lista', line: 'Cada cierto tiempo, dos planes. La elección se guarda.' },
  { type: 'mapa', name: 'Mapa', line: 'Sitios, con lo que pasó en cada uno.' },
];

export const CADENCES = [
  { days: 1, label: 'Cada día' },
  { days: 7, label: 'Cada semana' },
  { days: 14, label: 'Cada dos semanas' },
  { days: 30, label: 'Cada mes' },
] as const;

function nowIso() {
  return new Date().toISOString();
}

export function todayIso() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

export function blankQuiz(): WebQuiz {
  return { question: '', answers: [], hint: '' };
}

export function createRound(): ListRound {
  return {
    id: uid('round'),
    title: '',
    a: { title: '', body: '' },
    b: { title: '', body: '' },
  };
}

export function createPlace(): WebPlace {
  return { id: uid('place'), emoji: '⌖', title: '', body: '', lat: '', lng: '' };
}

export function createBlock(type: WebBlockType): WebBlock {
  const id = uid('block');
  switch (type) {
    case 'texto':
      return { id, type, kicker: '', title: '', body: '' };
    case 'imagen':
      return { id, type, src: '', caption: '' };
    case 'audio':
      return { id, type, url: '', label: '' };
    case 'spotify':
      return { id, type, url: '', label: '' };
    case 'corazon':
      return { id, type, line: 'Toca el corazón', taps: 6, detail: '', photo: '' };
    case 'lista':
      return { id, type, intro: '', everyDays: 7, startsOn: todayIso(), rounds: [createRound()] };
    case 'mapa':
      return { id, type, intro: '', places: [createPlace()] };
  }
}

export function createPage(title = 'Nuevo sitio'): WebPage {
  return {
    id: uid('page'),
    title,
    nav: title,
    quiz: blankQuiz(),
    blocks: [createBlock('texto')],
  };
}

export function blankWeb(): WebDocument {
  const stamp = nowIso();
  return {
    schemaVersion: WEB_SCHEMA_VERSION,
    kind: 'web',
    meta: {
      id: uid('web'),
      title: 'Web sin nombre',
      titleTouched: false,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    theme: { ...WEB_THEMES[0] },
    intro: { forName: '', fromName: '', line: '' },
    soundtrack: { url: '', label: '' },
    pages: [createPage('Inicio')],
  };
}

export function sampleWeb(): WebDocument {
  const stamp = nowIso();
  const start = todayIso();
  return {
    schemaVersion: WEB_SCHEMA_VERSION,
    kind: 'web',
    meta: {
      id: 'web_demo',
      title: 'Para Clara',
      titleTouched: true,
      slug: '',
      status: 'draft',
      createdAt: stamp,
      updatedAt: stamp,
    },
    theme: { ...WEB_THEMES[0] },
    intro: {
      forName: 'Clara',
      fromName: 'Alex',
      line: 'No es un cielo. Es un sitio vuestro.',
    },
    soundtrack: { url: '', label: '' },
    pages: [
      {
        id: 'page_inicio',
        title: 'Inicio',
        nav: 'Inicio',
        quiz: blankQuiz(),
        blocks: [
          {
            id: 'block_hola',
            type: 'texto',
            kicker: 'Para leer sentada',
            title: 'Esto cabe en el móvil',
            body: 'Textos, fotos, una canción, un mapa. Y alguna página que no se abre si no sabes la respuesta.',
          },
          {
            id: 'block_heart',
            type: 'corazon',
            line: 'Toca el corazón',
            taps: 6,
            detail: 'La foto de esa tarde sigue aquí. No hacía falta enseñarla antes.',
            photo: '',
          },
        ],
      },
      {
        id: 'page_cafe',
        title: 'El café',
        nav: 'El café',
        quiz: {
          question: '¿Cómo se llama el café?',
          answers: ['el de siempre'],
          hint: 'El que estaba abierto.',
        },
        blocks: [
          {
            id: 'block_cafe',
            type: 'texto',
            kicker: 'Dentro',
            title: 'Pedimos lo mismo',
            body: 'La mesa de la ventana. Tú llegaste antes. Yo no dije que estaba nervioso.',
          },
        ],
      },
      {
        id: 'page_planes',
        title: 'Los planes',
        nav: 'Planes',
        quiz: blankQuiz(),
        blocks: [
          {
            id: 'block_lista',
            type: 'lista',
            intro: 'Cada semana hay dos planes. Eliges uno y se queda.',
            everyDays: 7,
            startsOn: start,
            rounds: [
              {
                id: 'round_ahora',
                title: 'Este finde',
                a: { title: 'La orilla', body: 'Sin prisa, y sin foto.' },
                b: { title: 'El café', body: 'El de siempre, si sigue abierto.' },
              },
              {
                id: 'round_luego',
                title: 'La siguiente',
                a: { title: 'Quedarnos en casa', body: 'Una peli y lo que haya en la nevera.' },
                b: { title: 'Coger el tren', body: 'Ida y vuelta, el mismo día.' },
              },
            ],
          },
        ],
      },
      {
        id: 'page_mapa',
        title: 'Los sitios',
        nav: 'Mapa',
        quiz: blankQuiz(),
        blocks: [
          {
            id: 'block_mapa',
            type: 'mapa',
            intro: 'Dos sitios. Se pueden leer y ver en el mapa.',
            places: [
              { id: 'place_orilla', emoji: '🌊', title: 'La orilla', body: 'Ahí se quedó el silencio bueno.', lat: '36.721', lng: '-4.415' },
              { id: 'place_cafe', emoji: '☕', title: 'El café', body: 'El que estaba abierto.', lat: '40.416', lng: '-3.703' },
            ],
          },
        ],
      },
    ],
  };
}

export function webTitle(doc: WebDocument) {
  if (doc.meta.titleTouched && doc.meta.title.trim()) return doc.meta.title.trim();
  if (doc.intro.forName.trim()) return `Para ${doc.intro.forName.trim()}`;
  return 'Web sin nombre';
}

export function pageLocked(page: WebPage) {
  return Boolean(page.quiz.question.trim() && page.quiz.answers.some((answer) => answer.trim()));
}

export function foldAnswer(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function answerMatches(quiz: WebQuiz, attempt: string) {
  const folded = foldAnswer(attempt);
  if (!folded) return false;
  return quiz.answers.some((answer) => foldAnswer(answer) === folded);
}

function str(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback;
}

function clampInt(value: unknown, fallback: number, min: number, max: number) {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function side(value: unknown): PlanSide {
  const raw = (value ?? {}) as Partial<PlanSide>;
  return { title: str(raw.title), body: str(raw.body) };
}

function normalizeBlock(value: unknown): WebBlock | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<WebBlock>;
  if (!WEB_BLOCKS.some((item) => item.type === raw.type) || !raw.type) return null;
  const fresh = createBlock(raw.type);
  const id = str(raw.id, fresh.id);
  switch (raw.type) {
    case 'texto':
      return { id, type: 'texto', kicker: str(raw.kicker), title: str(raw.title), body: str(raw.body) };
    case 'imagen':
      return { id, type: 'imagen', src: str(raw.src), caption: str(raw.caption) };
    case 'audio':
      return { id, type: 'audio', url: str(raw.url), label: str(raw.label) };
    case 'spotify':
      return { id, type: 'spotify', url: str(raw.url), label: str(raw.label) };
    case 'corazon':
      return {
        id,
        type: 'corazon',
        line: str(raw.line, 'Toca el corazón'),
        taps: clampInt(raw.taps, 6, 1, 12),
        detail: str(raw.detail),
        photo: str(raw.photo),
      };
    case 'lista':
      return {
        id,
        type: 'lista',
        intro: str(raw.intro),
        everyDays: clampInt(raw.everyDays, 7, 1, 366),
        startsOn: /^\d{4}-\d{2}-\d{2}$/.test(str(raw.startsOn)) ? str(raw.startsOn) : todayIso(),
        rounds: Array.isArray(raw.rounds)
          ? raw.rounds.map((round) => {
              const item = (round ?? {}) as Partial<ListRound>;
              return {
                id: str(item.id, uid('round')),
                title: str(item.title),
                a: side(item.a),
                b: side(item.b),
              };
            })
          : [createRound()],
      };
    case 'mapa':
      return {
        id,
        type: 'mapa',
        intro: str(raw.intro),
        places: Array.isArray(raw.places)
          ? raw.places.map((place) => {
              const item = (place ?? {}) as Partial<WebPlace>;
              return {
                id: str(item.id, uid('place')),
                emoji: str(item.emoji, '⌖'),
                title: str(item.title),
                body: str(item.body),
                lat: str(item.lat),
                lng: str(item.lng),
              };
            })
          : [],
      };
  }
}

function normalizePage(value: unknown, index: number): WebPage {
  const raw = (value ?? {}) as Partial<WebPage>;
  const quiz = (raw.quiz ?? {}) as Partial<WebQuiz>;
  const title = str(raw.title, `Sitio ${index + 1}`);
  return {
    id: str(raw.id, uid('page')),
    title,
    nav: str(raw.nav, title),
    quiz: {
      question: str(quiz.question),
      answers: Array.isArray(quiz.answers) ? quiz.answers.map((answer) => str(answer)).slice(0, 12) : [],
      hint: str(quiz.hint),
    },
    blocks: Array.isArray(raw.blocks) ? raw.blocks.map(normalizeBlock).filter((block): block is WebBlock => Boolean(block)) : [],
  };
}

export function parseWeb(input: unknown): WebDocument {
  if (!input || typeof input !== 'object') throw new Error('El archivo no es una web.');
  const raw = input as Partial<WebDocument>;
  if (raw.kind !== 'web') throw new Error('Esto no es una web.');
  const base = blankWeb();
  const meta = { ...base.meta, ...(raw.meta ?? {}) };
  const intro = (raw.intro ?? {}) as Partial<WebIntro>;
  const sound = (raw.soundtrack ?? {}) as Partial<Soundtrack>;
  const themeRaw = (raw.theme ?? {}) as Partial<WebTheme>;
  const known = WEB_THEMES.find((item) => item.id === themeRaw.id);
  const theme = known
    ? { ...known }
    : {
        id: str(themeRaw.id, 'custom'),
        ink: str(themeRaw.ink, WEB_THEMES[0].ink),
        paper: str(themeRaw.paper, WEB_THEMES[0].paper),
        gold: str(themeRaw.gold, WEB_THEMES[0].gold),
      };
  return {
    schemaVersion: WEB_SCHEMA_VERSION,
    kind: 'web',
    meta: {
      ...meta,
      id: str(meta.id) || uid('web'),
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
    theme,
    intro: {
      forName: str(intro.forName),
      fromName: str(intro.fromName),
      line: str(intro.line),
    },
    soundtrack: { url: str(sound.url), label: str(sound.label) },
    pages: Array.isArray(raw.pages) ? raw.pages.map(normalizePage) : [],
  };
}
