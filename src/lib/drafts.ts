import { deleteCloudUniverse, listMine, loadOwned, saveUniverse, type CloudUniverse } from '@/lib/cloud';
import { listPartnerBoards } from '@/lib/wishes';
import type { PlanId } from '@/lib/plans';
import { claimPurchase, releasePurchase } from '@/lib/purchases';
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
  kind: 'universo' | 'cita' | 'deseos';
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
  const mine = (await listMine()).map(asSummary);
  const shared = (await listPartnerBoards()).map(asSummary);
  const seen = new Set(mine.map((row) => row.id));
  return [...mine, ...shared.filter((row) => row.id && !seen.has(row.id))];
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

export async function openPaidDraft(doc: ProjectDocument, plan: PlanId) {
  const purchase = await claimPurchase(plan, doc.meta.id);
  doc.meta.plan = plan;
  doc.meta.purchaseId = purchase.id;
  doc.meta.updatedAt = new Date().toISOString();
  try {
    await saveDraft(doc);
  } catch (error) {
    try {
      await releasePurchase(purchase.id);
    } catch {
      /* si no vuelve el plan, el proyecto tampoco se guardó */
    }
    throw error;
  }
}

export async function purgeProject(id: string, _slug = '') {
  cache.delete(id);
  await deleteCloudUniverse(id);
}

export function hasLocalDrafts() {
  try {
    if (localStorage.getItem(INDEX)) return true;
    for (let i = 0; i < localStorage.length; i += 1) {
      if (localStorage.key(i)?.startsWith('lumen.doc.v1.')) return true;
    }
  } catch {
    return false;
  }
  return false;
}

export async function migrateLocalDrafts() {
  if (!hasLocalDrafts()) return;
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
