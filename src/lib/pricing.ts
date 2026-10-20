import { CITA_PHRASES, type DateAskDocument } from '@/schema/cita';
import type { DeseosDocument } from '@/schema/deseos';
import { isCita, isDeseos, type ProjectDocument } from '@/schema/project';
import type { UniverseDocument } from '@/schema/universe';
import type { PlanFamily } from '@/lib/plans';

/**
 * Tarifas de Lumen.
 * Para cambiar un precio, edita este archivo. La pantalla Plan y el estudio leen de aquí.
 *
 * - baseCents: lo que cuesta el regalo vacío.
 * - meters: contadores. `included` entra en la base. Cada `pack` por encima suma `cents`.
 * - features: un extra que se suma una vez, solo si el regalo lo usa.
 */
export type MeterRule = {
  id: string;
  label: string;
  included: number;
  pack: number;
  cents: number;
};

export type FeatureRule = {
  id: string;
  label: string;
  cents: number;
};

export type PriceBook = {
  id: PlanFamily;
  name: string;
  baseCents: number;
  meters: MeterRule[];
  features: FeatureRule[];
};

export const PRICE: Record<PlanFamily, PriceBook> = {
  cita: {
    id: 'cita',
    name: 'Cita',
    baseCents: 295,
    meters: [
      { id: 'chars', label: 'Texto', included: 400, pack: 200, cents: 40 },
      { id: 'dates', label: 'Fechas', included: 2, pack: 1, cents: 50 },
    ],
    features: [{ id: 'customQuestion', label: 'Pregunta propia', cents: 100 }],
  },
  plantilla: {
    id: 'plantilla',
    name: 'Universo',
    baseCents: 1295,
    meters: [
      { id: 'photos', label: 'Fotos', included: 5, pack: 1, cents: 80 },
      { id: 'audios', label: 'Audios', included: 1, pack: 1, cents: 150 },
      { id: 'places', label: 'Lugares', included: 10, pack: 1, cents: 40 },
      { id: 'chars', label: 'Texto', included: 2500, pack: 500, cents: 50 },
    ],
    features: [
      { id: 'music', label: 'Música', cents: 200 },
      { id: 'secreto', label: 'Secreto', cents: 150 },
      { id: 'gate', label: 'Contraseña', cents: 100 },
    ],
  },
  deseos: {
    id: 'deseos',
    name: 'Lista de deseos',
    baseCents: 350,
    meters: [],
    features: [{ id: 'mantenimiento', label: 'Mantenimiento', cents: 150 }],
  },
};

export function maintenanceCents() {
  return PRICE.deseos.features.find((feature) => feature.id === 'mantenimiento')?.cents ?? 0;
}

export type QuoteLine = {
  id: string;
  label: string;
  note: string;
  cents: number;
};

export type Quote = {
  family: PlanFamily;
  totalCents: number;
  lines: QuoteLine[];
};

export function priceOf(doc: ProjectDocument): Quote {
  if (isCita(doc)) return quoteCita(doc);
  if (isDeseos(doc)) return quoteDeseos(doc);
  return quoteUniverse(doc);
}

function quoteCita(doc: DateAskDocument): Quote {
  return build(PRICE.cita, citaCounts(doc), {
    customQuestion: Boolean(doc.question.trim()) && !(CITA_PHRASES as readonly string[]).includes(doc.question.trim()),
  });
}

function quoteDeseos(_doc: DeseosDocument): Quote {
  return build(PRICE.deseos, {}, { mantenimiento: true });
}

function quoteUniverse(doc: UniverseDocument): Quote {
  return build(PRICE.plantilla, universeCounts(doc), {
    music: Boolean(doc.soundtrack.url.trim()),
    secreto: doc.stars.some((star) => star.type === 'secreto'),
    gate: doc.gate.enabled && Boolean(doc.gate.phrase.trim()),
  });
}

function build(book: PriceBook, counts: Record<string, number>, flags: Record<string, boolean>): Quote {
  const lines: QuoteLine[] = [{ id: 'base', label: 'Base', note: book.name, cents: book.baseCents }];
  for (const meter of book.meters) {
    const count = counts[meter.id] ?? 0;
    if (count === 0) continue;
    const extra = Math.max(0, count - meter.included);
    const packs = extra === 0 ? 0 : Math.ceil(extra / Math.max(1, meter.pack));
    lines.push({
      id: meter.id,
      label: meter.label,
      note: extra ? `${count} · ${meter.included} incluidas` : `${count} de ${meter.included}`,
      cents: packs * meter.cents,
    });
  }
  for (const feature of book.features) {
    if (!flags[feature.id]) continue;
    lines.push({
      id: feature.id,
      label: feature.label,
      note: feature.cents ? 'Extra' : 'Incluido',
      cents: feature.cents,
    });
  }
  return {
    family: book.id,
    totalCents: lines.reduce((sum, line) => sum + line.cents, 0),
    lines,
  };
}

function citaCounts(doc: DateAskDocument) {
  const dates = doc.dates.filter((item) => item.label.trim() || item.when).length;
  return {
    chars: lengthOf(doc.forName, doc.fromName, doc.question, doc.letter, doc.envelope, ...doc.dates.map((item) => item.label)),
    dates,
  };
}

function universeCounts(doc: UniverseDocument) {
  let photos = 0;
  let audios = 0;
  let places = 0;
  const bits = [
    doc.meta.title,
    doc.intro.forName,
    doc.intro.fromName,
    doc.intro.dedication,
    doc.intro.motto,
    doc.intro.cta,
    doc.intro.skyTitle,
    doc.gate.phrase,
    doc.gate.line,
    doc.gate.eyebrow,
    doc.soundtrack.label,
  ];
  for (const star of doc.stars) {
    bits.push(star.kicker, star.label);
    if (star.type === 'archivo') {
      photos += star.photos.filter((photo) => photo.src.trim()).length;
      star.photos.forEach((photo) => bits.push(photo.caption));
    } else if (star.type === 'lugares') {
      places += star.places.filter((place) => place.title.trim() || place.lat.trim()).length;
      bits.push(star.intro);
      star.places.forEach((place) => bits.push(place.title, place.body));
    } else if (star.type === 'carta') {
      if (star.voiceUrl.trim()) audios += 1;
      bits.push(star.kickerText, star.headline, star.body, star.signoff);
    } else if (star.type === 'historia') {
      star.beats.forEach((beat) => {
        if (beat.voiceUrl.trim()) audios += 1;
        bits.push(beat.title, beat.date, beat.lead, beat.quote);
        beat.slides.forEach((slide) => bits.push(slide.kicker, slide.title, slide.body));
      });
    } else if (star.type === 'lista') {
      bits.push(star.intro);
      star.items.forEach((item) => {
        bits.push(item.title, item.body, item.when);
        item.options.forEach((option) => bits.push(option.title, option.body));
      });
    } else if (star.type === 'notas') {
      star.cards.forEach((card) => bits.push(card.title, card.text));
    } else if (star.type === 'secreto') {
      bits.push(star.phrase, star.hint);
      star.entries.forEach((entry) => bits.push(entry.title, entry.body));
    }
  }
  return { photos, audios, places, chars: lengthOf(...bits) };
}

function lengthOf(...parts: Array<string | undefined>) {
  return parts.reduce((sum, part) => sum + (part?.trim().length ?? 0), 0);
}
