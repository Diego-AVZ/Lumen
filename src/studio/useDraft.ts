import { useEffect, useRef, useState } from 'react';
import { loadDraft, purgeProject, saveDraft } from '@/lib/drafts';
import { isCita } from '@/schema/project';
import { displayTitle, type UniverseDocument } from '@/schema/universe';

function touch(doc: UniverseDocument): UniverseDocument {
  const titled = doc.meta.titleTouched ? doc.meta.title : displayTitle({ ...doc, meta: { ...doc.meta, title: '' } });
  return {
    ...doc,
    meta: {
      ...doc.meta,
      title: doc.meta.titleTouched ? doc.meta.title : titled,
      updatedAt: new Date().toISOString(),
    },
  };
}

export function useDraft(id: string) {
  const history = useRef<UniverseDocument[]>([]);
  const future = useRef<UniverseDocument[]>([]);
  const lastSaved = useRef<UniverseDocument | null>(null);
  const [rev, setRev] = useState(0);
  const [doc, setDoc] = useState<UniverseDocument | null>(null);
  const [missing, setMissing] = useState(false);
  const [status, setStatus] = useState<'saved' | 'saving'>('saved');
  const bump = () => setRev((n) => n + 1);

  useEffect(() => {
    let cancel = false;
    setDoc(null);
    setMissing(false);
    void loadDraft(id)
      .then((loaded) => {
        if (cancel) return;
        if (loaded && !isCita(loaded)) {
          lastSaved.current = loaded;
          setDoc(loaded);
          return;
        }
        setMissing(true);
      })
      .catch(() => {
        if (!cancel) setMissing(true);
      });
    return () => {
      cancel = true;
    };
  }, [id]);

  useEffect(() => {
    if (!doc) return;
    if (lastSaved.current) setStatus('saving');
    const handle = window.setTimeout(() => {
      if (!lastSaved.current) {
        lastSaved.current = doc;
      } else if (lastSaved.current !== doc) {
        history.current.push(lastSaved.current);
        if (history.current.length > 60) history.current.shift();
        future.current = [];
        lastSaved.current = doc;
      }
      void saveDraft(doc)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('saving'));
      bump();
    }, 640);
    return () => window.clearTimeout(handle);
  }, [doc]);

  const edit = (recipe: (current: UniverseDocument) => UniverseDocument) => {
    setDoc((prev) => (prev ? touch(recipe(prev)) : prev));
  };

  const commit = (recipe: (current: UniverseDocument) => UniverseDocument) => {
    setDoc((prev) => {
      if (!prev) return prev;
      if (lastSaved.current && lastSaved.current !== prev) history.current.push(lastSaved.current);
      history.current.push(prev);
      if (history.current.length > 60) history.current.shift();
      future.current = [];
      const next = touch(recipe(prev));
      lastSaved.current = next;
      return next;
    });
    bump();
  };

  const undo = () => {
    setDoc((prev) => {
      if (!prev) return prev;
      if (lastSaved.current && lastSaved.current !== prev) {
        future.current.push(prev);
        return lastSaved.current;
      }
      const past = history.current.pop();
      if (!past) return prev;
      future.current.push(prev);
      lastSaved.current = past;
      return past;
    });
    bump();
  };

  const redo = () => {
    setDoc((prev) => {
      if (!prev) return prev;
      const next = future.current.pop();
      if (!next) return prev;
      history.current.push(prev);
      lastSaved.current = next;
      return next;
    });
    bump();
  };

  const pending = Boolean(doc && lastSaved.current && lastSaved.current !== doc);
  const canUndo = history.current.length > 0 || pending;
  const canRedo = future.current.length > 0;

  return {
    doc,
    setDoc,
    edit,
    commit,
    undo,
    redo,
    canUndo,
    canRedo,
    status,
    rev,
    missing,
    async discard() {
      if (!doc) return;
      await purgeProject(doc.meta.id, doc.meta.slug);
    },
  };
}
