import { parseCita, citaTitle, type DateAskDocument } from '@/schema/cita';
import { displayTitle, parseDocument, type UniverseDocument } from '@/schema/universe';

export type ProjectDocument = UniverseDocument | DateAskDocument;

export function isCita(doc: ProjectDocument): doc is DateAskDocument {
  return 'kind' in doc && doc.kind === 'cita';
}

export function parseProject(input: unknown): ProjectDocument {
  if (input && typeof input === 'object' && (input as { kind?: string }).kind === 'cita') {
    return parseCita(input);
  }
  return parseDocument(input);
}

export function projectTitle(doc: ProjectDocument) {
  return isCita(doc) ? citaTitle(doc) : displayTitle(doc);
}

export function projectKind(doc: ProjectDocument): 'universo' | 'cita' {
  return isCita(doc) ? 'cita' : 'universo';
}
