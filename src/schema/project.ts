import { parseCita, citaTitle, type DateAskDocument } from '@/schema/cita';
import { deseosTitle, parseDeseos, type DeseosDocument } from '@/schema/deseos';
import { displayTitle, parseDocument, type UniverseDocument } from '@/schema/universe';
import { parseWeb, webTitle, type WebDocument } from '@/schema/web';
import { parseTrip, tripTitle, type TripDocument } from '@/schema/viaje';

export type ProjectDocument = UniverseDocument | DateAskDocument | DeseosDocument | WebDocument | TripDocument;
export type ProjectKind = 'universo' | 'cita' | 'deseos' | 'web' | 'viaje';

export function isCita(doc: ProjectDocument): doc is DateAskDocument {
  return 'kind' in doc && doc.kind === 'cita';
}

export function isDeseos(doc: ProjectDocument): doc is DeseosDocument {
  return 'kind' in doc && doc.kind === 'deseos';
}

export function isWeb(doc: ProjectDocument): doc is WebDocument {
  return 'kind' in doc && doc.kind === 'web';
}

export function isViaje(doc: ProjectDocument): doc is TripDocument {
  return 'kind' in doc && doc.kind === 'viaje';
}

export function parseProject(input: unknown): ProjectDocument {
  let value = input;
  if (typeof value === 'string') {
    value = JSON.parse(value);
  }
  const kind = value && typeof value === 'object' ? (value as { kind?: string }).kind : '';
  if (kind === 'cita') return parseCita(value);
  if (kind === 'deseos') return parseDeseos(value);
  if (kind === 'web') return parseWeb(value);
  if (kind === 'viaje') return parseTrip(value);
  return parseDocument(value);
}

export function projectTitle(doc: ProjectDocument) {
  if (isCita(doc)) return citaTitle(doc);
  if (isDeseos(doc)) return deseosTitle(doc);
  if (isWeb(doc)) return webTitle(doc);
  if (isViaje(doc)) return tripTitle(doc);
  return displayTitle(doc);
}

export function projectKind(doc: ProjectDocument): ProjectKind {
  if (isCita(doc)) return 'cita';
  if (isDeseos(doc)) return 'deseos';
  if (isWeb(doc)) return 'web';
  if (isViaje(doc)) return 'viaje';
  return 'universo';
}

export function kindLabel(kind: ProjectKind) {
  if (kind === 'cita') return 'Cita';
  if (kind === 'deseos') return 'Lista de deseos';
  if (kind === 'web') return 'Web';
  if (kind === 'viaje') return 'Viaje';
  return 'Universo';
}
