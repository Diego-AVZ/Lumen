import { parseCita, citaTitle, type DateAskDocument } from '@/schema/cita';
import { deseosTitle, parseDeseos, type DeseosDocument } from '@/schema/deseos';
import { displayTitle, parseDocument, type UniverseDocument } from '@/schema/universe';

export type ProjectDocument = UniverseDocument | DateAskDocument | DeseosDocument;
export type ProjectKind = 'universo' | 'cita' | 'deseos';

export function isCita(doc: ProjectDocument): doc is DateAskDocument {
  return 'kind' in doc && doc.kind === 'cita';
}

export function isDeseos(doc: ProjectDocument): doc is DeseosDocument {
  return 'kind' in doc && doc.kind === 'deseos';
}

export function parseProject(input: unknown): ProjectDocument {
  let value = input;
  if (typeof value === 'string') {
    value = JSON.parse(value);
  }
  const kind = value && typeof value === 'object' ? (value as { kind?: string }).kind : '';
  if (kind === 'cita') return parseCita(value);
  if (kind === 'deseos') return parseDeseos(value);
  return parseDocument(value);
}

export function projectTitle(doc: ProjectDocument) {
  if (isCita(doc)) return citaTitle(doc);
  if (isDeseos(doc)) return deseosTitle(doc);
  return displayTitle(doc);
}

export function projectKind(doc: ProjectDocument): ProjectKind {
  if (isCita(doc)) return 'cita';
  if (isDeseos(doc)) return 'deseos';
  return 'universo';
}

export function kindLabel(kind: ProjectKind) {
  if (kind === 'cita') return 'Cita';
  if (kind === 'deseos') return 'Lista de deseos';
  return 'Universo';
}
