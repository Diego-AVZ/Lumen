import { deleteCloudUniverse, listMine, loadOwned, saveUniverse, type CloudUniverse } from '@/lib/cloud';
import { parseProject, type ProjectDocument } from '@/schema/project';

const INDEX = 'lumen.index.v1';
const docKey = (id: string) => `lumen.doc.v1.${id}`;

const cache = new Map<string, ProjectDocument>();

export type DraftSummary = {
  id: string;
  title: string;
  updatedAt: string;
  slug: string;
  status: 'draft' | 'published';
  kind: 'universo' | 'cita';
};

function asSummary(row: CloudUniverse): DraftSummary {
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    slug: row.slug,
    status: row.status,
    kind: row.kind,
  };
}

export function peekDraft(id: string): ProjectDocument | null {
  return cache.get(id) ?? null;
}

export async function listDrafts(): Promise<DraftSummary[]> {
  return (await listMine()).map(asSummary);
}

export async function loadDraft(id: string): Promise<ProjectDocument | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const doc = await loadOwned(id);
  if (doc) cache.set(id, doc);
  return doc;
}

export async function saveDraft(doc: ProjectDocument) {
  cache.set(doc.meta.id, doc);
  await saveUniverse(doc);
}

export async function purgeProject(id: string, _slug = '') {
  cache.delete(id);
  await deleteCloudUniverse(id);
}

export async function migrateLocalDrafts() {
  try {
    const raw = localStorage.getItem(INDEX);
    const rows = raw ? (JSON.parse(raw) as { id?: string }[]) : [];
    const ids = Array.isArray(rows) ? rows.map((row) => row.id).filter((id): id is string => Boolean(id)) : [];
    for (const id of ids) {
      const body = localStorage.getItem(docKey(id));
      if (!body) continue;
      try {
        const doc = parseProject(JSON.parse(body));
        cache.set(doc.meta.id, doc);
        await saveUniverse(doc);
      } catch {
        /* un documento viejo no bloquea al resto */
      }
      localStorage.removeItem(docKey(id));
    }
    localStorage.removeItem(INDEX);
    for (const key of Object.keys(localStorage)) {
      if (key.startsWith('lumen.doc.v1.')) localStorage.removeItem(key);
    }
  } catch {
    /* si el navegador no deja leer, seguimos con la cuenta */
  }
}
