import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DeseosBoard } from '@/deseos/DeseosBoard';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { PriceTag } from '@/hub/PriceTag';
import { loadDraft, peekDraft, purgeProject, saveDraft } from '@/lib/drafts';
import { openWishProject } from '@/lib/wishes';
import { deseosTitle, type DeseosDocument } from '@/schema/deseos';
import { isDeseos } from '@/schema/project';
import { PublishDialog } from '@/studio/PublishDialog';

export function DeseosStudio({ id }: { id: string }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DeseosDocument | null>(() => {
    const loaded = peekDraft(id);
    return loaded && isDeseos(loaded) ? loaded : null;
  });
  const [owner, setOwner] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const ready = useRef(false);

  useEffect(() => {
    ready.current = false;
  }, [id]);

  useEffect(() => {
    if (!doc || !owner) return;
    if (!ready.current) {
      ready.current = true;
      return;
    }
    const handle = window.setTimeout(() => {
      const next = { ...doc, meta: { ...doc.meta, title: deseosTitle(doc), updatedAt: new Date().toISOString() } };
      void saveDraft(next).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [doc, owner]);

  useEffect(() => {
    if (doc) return;
    void (async () => {
      const owned = await loadDraft(id);
      if (owned && isDeseos(owned)) {
        setOwner(true);
        setDoc(owned);
        return;
      }
      const shared = await openWishProject(id);
      if (shared && isDeseos(shared)) {
        setOwner(false);
        setDoc(shared);
        return;
      }
      setMissing(true);
    })();
  }, [doc, id]);

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-linen text-inkwell">
        <p className="font-display text-4xl italic">{missing ? 'No encuentro esta lista.' : 'Abriendo la lista…'}</p>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-linen text-inkwell">
      <header className="flex h-16 items-center gap-3 border-b border-black/5 px-3 sm:px-4">
        <Link to="/crear" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white" aria-label="Mis proyectos">
          ←
        </Link>
        <span className="hidden font-display text-2xl italic sm:block">Lumen</span>
        {owner ? (
          <input
            value={doc.meta.title}
            onChange={(e) => setDoc({ ...doc, meta: { ...doc.meta, title: e.target.value, titleTouched: true } })}
            className="min-w-0 flex-1 bg-transparent font-display text-[1.45rem] italic outline-none"
          />
        ) : (
          <p className="min-w-0 flex-1 truncate font-display text-[1.45rem] italic">{doc.meta.title}</p>
        )}
        {owner && (
          <button type="button" onClick={() => setRemoving(true)} className="text-[13px] text-[#8a3d32]">
            Eliminar
          </button>
        )}
        <PriceTag doc={doc} />
        {owner && (
          <button type="button" onClick={() => setPublishing(true)} className="rounded-full bg-inkwell px-4 py-2 text-[14px] text-linen">
            Enviar
          </button>
        )}
      </header>
      <DeseosBoard doc={doc} owner={owner} onDoc={owner ? setDoc : undefined} />
      {publishing && (
        <PublishDialog
          doc={doc}
          onClose={() => setPublishing(false)}
          onPublished={(next) => {
            if (isDeseos(next)) setDoc(next);
            setPublishing(false);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title={doc.meta.title}
          busy={busy}
          onCancel={() => (busy ? undefined : setRemoving(false))}
          onConfirm={() => {
            void (async () => {
              setBusy(true);
              await purgeProject(doc.meta.id, doc.meta.slug);
              navigate('/crear');
            })();
          }}
        />
      )}
    </div>
  );
}
