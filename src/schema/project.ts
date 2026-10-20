import { parseCita, citaTitle, type DateAskDocument } from '@/schema/cita';
import { displayTitle, parseDocument, type UniverseDocument } from '@/schema/universe';

export type ProjectDocument = UniverseDocument | DateAskDocument;

export function isCita(doc: ProjectDocument): doc is DateAskDocument {
  return 'kind' in doc && doc.kind === 'cita';
}

export function parseProject(input: unknown): ProjectDocument {
  let value = input;
  if (typeof value === 'string') {
    value = JSON.parse(value);
  }
  if (value && typeof value === 'object' && (value as { kind?: string }).kind === 'cita') {
    return parseCita(value);
  }
  return parseDocument(value);
}

export function projectTitle(doc: ProjectDocument) {
  return isCita(doc) ? citaTitle(doc) : displayTitle(doc);
}

export function projectKind(doc: ProjectDocument): 'universo' | 'cita' {
  return isCita(doc) ? 'cita' : 'universo';
}
