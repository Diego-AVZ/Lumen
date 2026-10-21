import { useEffect, useState } from 'react';
import { readGift } from '@/lib/cloud';
import { loadDraft } from '@/lib/drafts';
import type { Attachment } from '@/schema/attach';
import { isCita, isViaje, type ProjectDocument } from '@/schema/project';

export type AttachedState = 'empty' | 'loading' | 'open' | 'draft' | 'missing';

export function useAttached(link: Attachment | null) {
  const [doc, setDoc] = useState<ProjectDocument | null>(null);
  const [state, setState] = useState<AttachedState>(link ? 'loading' : 'empty');

  const id = link?.id ?? '';
  const slug = link?.slug ?? '';
  const kind = link?.kind;

  useEffect(() => {
    if (!kind || (!id && !slug)) {
      setDoc(null);
      setState('empty');
      return;
    }
    let stop = false;
    setState('loading');
    void (async () => {
      if (slug) {
        const read = await readGift(slug);
        if (stop) return;
        if (read.state === 'open' && read.doc && kindOk(read.doc, kind)) {
          setDoc(read.doc);
          setState('open');
          return;
        }
      }
      if (id) {
        const local = await loadDraft(id);
        if (stop) return;
        if (local && kindOk(local, kind)) {
          setDoc(local);
          setState(local.meta.status === 'published' && local.meta.slug ? 'open' : 'draft');
          return;
        }
      }
      if (!stop) {
        setDoc(null);
        setState('missing');
      }
    })();
    return () => {
      stop = true;
    };
  }, [id, slug, kind]);

  return { doc, state };
}

function kindOk(doc: ProjectDocument, kind: Attachment['kind']) {
  return kind === 'cita' ? isCita(doc) : isViaje(doc);
}
