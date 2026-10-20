import { uid } from '@/lib/motion';
import {
  THEMES,
  blankDocument,
  createBeat,
  createListItem,
  createStar,
  type UniverseDocument,
} from '@/schema/universe';

export type EasyAnswers = {
  forName: string;
  fromName: string;
  metWhen: string;
  metWhere: string;
  metWhat: string;
  memoryTitle: string;
  memoryWhat: string;
  letter: string;
  wish: string;
  themeId: string;
};

export const EMPTY_EASY: EasyAnswers = {
  forName: '',
  fromName: '',
  metWhen: '',
  metWhere: '',
  metWhat: '',
  memoryTitle: '',
  memoryWhat: '',
  letter: '',
  wish: '',
  themeId: 'noche',
};

export function documentFromEasy(answers: EasyAnswers): UniverseDocument {
  const doc = blankDocument();
  const forName = answers.forName.trim();
  const fromName = answers.fromName.trim();
  const theme = THEMES.find((item) => item.id === answers.themeId) ?? THEMES[0];

  doc.theme = { ...theme };
  doc.intro.forName = forName;
  doc.intro.fromName = fromName;
  doc.intro.skyTitle = forName;
  const where = answers.metWhere.trim();
  doc.intro.dedication = where
    ? (where.toLowerCase().startsWith('en ') || where.toLowerCase().startsWith('desde ')
        ? where
        : `desde ${where}`)
    : 'por si un día quieres volver a estos días';
  doc.meta.title = forName ? `Para ${forName}` : 'Universo sin nombre';
  doc.meta.titleTouched = Boolean(forName);

  const historia = createStar('historia', 0);
  if (historia.type === 'historia') {
    historia.beats = [
      {
        ...createBeat(0),
        emoji: '✨',
        title: 'Cuando os conocisteis',
        date: answers.metWhen.trim() || 'el comienzo',
        lead: answers.metWhat.trim(),
        quote: answers.metWhere.trim() ? `Allí: ${answers.metWhere.trim()}` : '',
        slides: answers.metWhere.trim()
          ? [
              {
                id: uid('slide'),
                kicker: '01',
                title: answers.metWhere.trim(),
                body: answers.metWhat.trim(),
              },
            ]
          : [],
      },
      {
        ...createBeat(1),
        emoji: '🌙',
        title: answers.memoryTitle.trim() || 'Un momento',
        date: '',
        lead: answers.memoryWhat.trim(),
        quote: '',
        track: '',
        slides: [],
      },
    ];
  }

  const carta = createStar('carta', 1);
  if (carta.type === 'carta') {
    carta.headline = forName ? `Para ${forName}` : 'Para ti';
    carta.body = answers.letter.trim();
    carta.signoff = fromName;
    carta.kickerText = 'para leer despacio';
  }

  const lista = createStar('lista', 2);
  if (lista.type === 'lista') {
    lista.intro = 'Cosas que aún queréis vivir';
    const wish = answers.wish.trim();
    lista.items = [
      {
        ...createListItem(),
        emoji: '✦',
        title: wish || 'Un deseo',
        body: wish,
        state: 'abierto',
      },
    ];
  }

  doc.stars = [historia, carta, lista];
  return doc;
}
