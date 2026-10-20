import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { DateAskPlayer } from '@/cita/DateAskPlayer';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { isCita } from '@/schema/project';
import { loadDraft, peekDraft, purgeProject, saveDraft } from '@/lib/drafts';
import { uid } from '@/lib/motion';
import { CITA_PHRASES, citaTitle, parseCita, type DateAskDocument } from '@/schema/cita';
import { PhoneStage } from '@/studio/PhoneStage';
import { PublishDialog } from '@/studio/PublishDialog';

export function DateAskStudio({ id }: { id: string }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<DateAskDocument | null>(() => {
    const loaded = peekDraft(id);
    return loaded && isCita(loaded) ? loaded : null;
  });
  const [publishing, setPublishing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  const ready = useRef(false);
  useEffect(() => {
    ready.current = false;
  }, [id]);
  useEffect(() => {
    if (!doc) return;
    if (!ready.current) {
      ready.current = true;
      return;
    }
    const handle = window.setTimeout(() => {
      const next = { ...doc, meta: { ...doc.meta, title: citaTitle(doc), updatedAt: new Date().toISOString() } };
      void saveDraft(next).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [doc]);

  useEffect(() => {
    if (doc) return;
    void loadDraft(id).then((loaded) => {
      if (loaded && isCita(loaded)) setDoc(loaded);
      else setMissing(true);
    });
  }, [doc, id]);

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-linen text-inkwell">
        <p className="font-display text-4xl italic">{missing ? 'No encuentro esta cita.' : 'Abriendo la cita…'}</p>
      </div>
    );
  }

  const edit = (patch: Partial<DateAskDocument>) => setDoc({ ...doc, ...patch });

  return (
    <div className="flex h-dvh flex-col bg-linen text-inkwell">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 px-3 sm:px-4">
        <Link to="/crear" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white" aria-label="Mis proyectos">
          ←
        </Link>
        <span className="hidden font-display text-2xl italic sm:block">Lumen</span>
        <input
          value={doc.meta.title}
          onChange={(e) => setDoc({ ...doc, meta: { ...doc.meta, title: e.target.value, titleTouched: true } })}
          className="min-w-0 flex-1 bg-transparent font-display text-[1.45rem] italic outline-none"
        />
        <button type="button" onClick={() => setRemoving(true)} className="text-[13px] text-[#8a3d32]">
          Eliminar
        </button>
        <button type="button" onClick={() => setPublishing(true)} className="rounded-full bg-inkwell px-4 py-2 text-[14px] text-linen">
          Enviar
        </button>
      </header>
      <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_380px] lg:overflow-hidden">
        <div className="min-h-[70vh] bg-mist lg:min-h-0">
          <PhoneStage>
            <DateAskPlayer doc={doc} preview />
          </PhoneStage>
        </div>
        <aside className="min-h-0 overflow-auto border-t border-black/5 bg-linen p-5 lg:border-l lg:border-t-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Pedir cita</p>
          <label className="mt-5 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Para</span>
            <input value={doc.forName} onChange={(e) => edit({ forName: e.target.value })} className="mt-1 w-full border-b border-black/10 bg-transparent py-2 font-display text-2xl italic outline-none" />
          </label>
          <label className="mt-5 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">De parte de</span>
            <input value={doc.fromName} onChange={(e) => edit({ fromName: e.target.value })} className="mt-1 w-full border-b border-black/10 bg-transparent py-2 text-lg outline-none" />
          </label>
          <p className="mt-7 text-[11px] uppercase tracking-[0.16em] text-inkwell/40">La pregunta</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {CITA_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => edit({ question: phrase })}
                className={`rounded-full px-3 py-1.5 text-left text-[13px] ${doc.question === phrase ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
              >
                {phrase}
              </button>
            ))}
          </div>
          <textarea
            value={doc.question}
            onChange={(e) => edit({ question: e.target.value })}
            rows={2}
            className="mt-3 w-full resize-none rounded-2xl bg-white px-4 py-3 text-[15px] outline-none ring-1 ring-black/10"
          />
          <label className="mt-6 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">La nota</span>
            <textarea
              value={doc.letter}
              onChange={(e) => edit({ letter: e.target.value })}
              rows={4}
              className="mt-2 w-full resize-none rounded-2xl bg-white px-4 py-3 text-[15px] outline-none ring-1 ring-black/10"
            />
          </label>
          <div className="mt-6 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Fechas posibles</p>
            <button
              type="button"
              className="text-[13px] text-brass"
              onClick={() => edit({ dates: [...doc.dates, { id: uid('when'), label: '', when: '' }] })}
            >
              Añadir
            </button>
          </div>
          <ul className="mt-3 grid gap-3">
            {doc.dates.map((item, index) => (
              <li key={item.id} className="rounded-2xl bg-white p-3 ring-1 ring-black/10">
                <input
                  value={item.label}
                  onChange={(e) => {
                    const dates = doc.dates.map((row, i) => (i === index ? { ...row, label: e.target.value } : row));
                    edit({ dates });
                  }}
                  placeholder="Viernes por la noche"
                  className="w-full bg-transparent font-display text-xl italic outline-none"
                />
                <input
                  type="datetime-local"
                  value={item.when}
                  onChange={(e) => {
                    const dates = doc.dates.map((row, i) => (i === index ? { ...row, when: e.target.value } : row));
                    edit({ dates });
                  }}
                  className="mt-2 w-full bg-transparent text-[14px] text-inkwell/70 outline-none"
                />
                {doc.dates.length > 1 && (
                  <button
                    type="button"
                    className="mt-2 text-[12px] text-[#8a3d32]"
                    onClick={() => edit({ dates: doc.dates.filter((row) => row.id !== item.id) })}
                  >
                    Quitar
                  </button>
                )}
              </li>
            ))}
          </ul>
        </aside>
      </div>
      {publishing && (
        <PublishDialog
          doc={doc}
          onClose={() => setPublishing(false)}
          onPublished={(next) => {
            const parsed = parseCita(next);
            setDoc(parsed);
            saveDraft(parsed);
            setPublishing(false);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title={citaTitle(doc)}
          busy={busy}
          onCancel={() => setRemoving(false)}
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
