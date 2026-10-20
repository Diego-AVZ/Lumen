import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DateAskStudio } from '@/pages/DateAskStudio';
import { saveDraft } from '@/lib/drafts';
import { downloadText } from '@/lib/motion';
import { exampleDocument } from '@/schema/example';
import {
  STAR_TYPES,
  createStar,
  displayTitle,
  parseDocument,
  type StarType,
  type UniverseDocument,
} from '@/schema/universe';
import { UniversePlayer, type PlayerFrame } from '@/universe/UniversePlayer';
import { PortadaEditor, StarEditor } from '@/studio/editors';
import { PhoneStage } from '@/studio/PhoneStage';
import { PublishDialog } from '@/studio/PublishDialog';
import { useDraft } from '@/studio/useDraft';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { isCita } from '@/schema/project';

type Mode = 'portada' | 'cielo' | 'dentro';

export function Studio() {
  const { id = '' } = useParams();
  if (id.startsWith('cita_')) return <DateAskStudio id={id} />;
  return <UniverseStudio />;
}

function UniverseStudio() {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const draft = useDraft(id);
  const api = useRef(draft);
  api.current = draft;
  const [mode, setMode] = useState<Mode>('portada');
  const [tryGate, setTryGate] = useState(false);
  const [starId, setStarId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [panel, setPanel] = useState<'estrellas' | 'editar'>('editar');
  const [wide, setWide] = useState(() => window.innerWidth >= 1180);
  const [removing, setRemoving] = useState(false);
  const [removingBusy, setRemovingBusy] = useState(false);

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1180);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'z') return;
      event.preventDefault();
      if (event.shiftKey) api.current.redo();
      else api.current.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const doc = draft.doc;
  const missing = draft.missing;
  useEffect(() => {
    if (!doc) return;
    document.title = displayTitle(doc);
  }, [doc]);

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-linen px-6 text-center">
        <div>
          <p className="font-display text-4xl italic">{missing ? 'No encuentro este universo.' : 'Abriendo…'}</p>
          {missing && (
            <Link to="/crear" className="mt-6 inline-block text-brass">
              Volver a los míos
            </Link>
          )}
        </div>
      </div>
    );
  }

  const star = doc.stars.find((item) => item.id === starId) ?? null;
  const frame: PlayerFrame = tryGate ? 'gate' : mode === 'portada' ? 'intro' : mode === 'dentro' && star ? 'star' : 'sky';

  const onUserFrame = (next: PlayerFrame, nextId?: string) => {
    setTryGate(false);
    if (next === 'intro') setMode('portada');
    if (next === 'sky') setMode('cielo');
    if (next === 'star' && nextId) {
      setStarId(nextId);
      setMode('dentro');
    }
  };

  const addStar = (type: StarType) => {
    const created = createStar(type, doc.stars.length);
    draft.commit((current) => ({ ...current, stars: [...current.stars, created] }));
    setStarId(created.id);
    setMode('dentro');
    setAdding(false);
    setPanel('editar');
  };

  const moveStar = (index: number, dir: -1 | 1) => {
    const next = index + dir;
    if (next < 0 || next >= doc.stars.length) return;
    draft.commit((current) => {
      const stars = current.stars.slice();
      const [item] = stars.splice(index, 1);
      if (!item) return current;
      stars.splice(next, 0, item);
      return { ...current, stars };
    });
  };

  const rail = (
    <aside className="flex h-full min-h-0 flex-col border-black/5 bg-linen">
      <div className="scroll-y min-h-0 flex-1 px-3 py-4">
        <button
          type="button"
          onClick={() => {
            setMode('portada');
            setPanel('editar');
          }}
          className={['mb-4 w-full rounded-2xl px-3 py-3 text-left', mode === 'portada' ? 'bg-white shadow-sm' : 'hover:bg-white/60'].join(' ')}
        >
          <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Entrada</span>
          <span className="mt-1 block font-display text-2xl italic">Portada</span>
        </button>
        <div className="mb-2 flex items-center justify-between px-2">
          <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Estrellas</p>
          <button type="button" onClick={() => setAdding(true)} className="text-[13px] text-brass">
            Añadir
          </button>
        </div>
        {doc.stars.length === 0 && (
          <button type="button" onClick={() => setAdding(true)} className="w-full rounded-2xl border border-dashed border-brass/40 px-3 py-6 text-left">
            <span className="font-display text-2xl italic">La primera</span>
            <span className="mt-1 block text-[13px] text-inkwell/50">Historia, lista, carta, lo que quieras poner en el cielo.</span>
          </button>
        )}
        <ul className="grid gap-1">
          {doc.stars.map((item, index) => (
            <li key={item.id} className={['rounded-2xl px-2 py-2', starId === item.id ? 'bg-white shadow-sm' : 'hover:bg-white/50'].join(' ')}>
              <button
                type="button"
                onClick={() => {
                  setStarId(item.id);
                  setMode('dentro');
                  setPanel('editar');
                }}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="grid h-9 w-9 place-items-center rounded-full bg-mist text-lg">{item.glyph}</span>
                <span>
                  <span className="block text-[10px] uppercase tracking-[0.16em] text-inkwell/35">{item.kicker}</span>
                  <span className="block font-display text-[1.25rem] italic leading-tight">{item.label}</span>
                </span>
              </button>
              <div className="mt-1 flex gap-3 pl-12 text-[11px] uppercase tracking-[0.12em] text-inkwell/35">
                <button type="button" onClick={() => moveStar(index, -1)}>Subir</button>
                <button type="button" onClick={() => moveStar(index, 1)}>Bajar</button>
              </div>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            const sample = exampleDocument();
            draft.commit((current) => ({
              ...sample,
              meta: { ...current.meta, title: sample.meta.title, titleTouched: true },
            }));
            setMode('portada');
            setStarId(sample.stars[0]?.id ?? null);
          }}
          className="mt-6 px-2 text-left text-[13px] text-inkwell/45 underline-offset-4 hover:underline"
        >
          Rellenar con un ejemplo
        </button>
      </div>
    </aside>
  );

  const inspector = (
    <aside className="scroll-y h-full min-h-0 border-black/5 bg-[#f7f3ec] px-5 py-5">
      {mode === 'portada' || !star ? (
        <>
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Portada</p>
          <h2 className="mt-1 font-display text-3xl italic">Antes de entrar</h2>
          <div className="mt-5">
            <PortadaEditor doc={doc} onChange={draft.edit} />
          </div>
        </>
      ) : (
        <>
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">{labelOf(star.type)}</p>
          <h2 className="mt-1 font-display text-3xl italic">{star.label}</h2>
          <div className="mt-5">
            <StarEditor
              star={star}
              onChange={(next) => draft.edit((current) => ({ ...current, stars: current.stars.map((item) => (item.id === next.id ? next : item)) }))}
              onCommit={(next) => draft.commit((current) => ({ ...current, stars: current.stars.map((item) => (item.id === next.id ? next : item)) }))}
              onDelete={() => {
                draft.commit((current) => ({ ...current, stars: current.stars.filter((item) => item.id !== star.id) }));
                setStarId(null);
                setMode('portada');
              }}
            />
          </div>
        </>
      )}
    </aside>
  );

  return (
    <div className="flex h-dvh flex-col bg-linen text-inkwell">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 px-3 sm:px-4">
        <Link to="/crear" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white" aria-label="Mis proyectos">
          ←
        </Link>
        <span className="hidden font-display text-2xl italic sm:block">Lumen</span>
        <input
          value={doc.meta.title}
          onChange={(e) =>
            draft.edit((current) => ({
              ...current,
              meta: { ...current.meta, title: e.target.value, titleTouched: true },
            }))
          }
          className="min-w-0 flex-1 bg-transparent font-display text-[1.45rem] italic outline-none"
        />
        <span className="hidden text-[12px] uppercase tracking-[0.16em] text-inkwell/40 sm:block">
          {draft.status === 'saving' ? 'Guardando' : 'Guardado'}
        </span>
        <button type="button" disabled={!draft.canUndo} onClick={draft.undo} className="hidden text-[13px] text-inkwell/60 disabled:opacity-30 sm:block">
          Deshacer
        </button>
        <button
          type="button"
          onClick={() => downloadText(`${slugFile(doc)}.json`, JSON.stringify(doc, null, 2))}
          className="hidden text-[13px] text-inkwell/60 md:block"
        >
          JSON
        </button>
        <label className="hidden cursor-pointer text-[13px] text-inkwell/60 md:block">
          Importar
          <input
            type="file"
            accept="application/json"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              void file.text().then((text) => {
                const parsed = parseDocument(JSON.parse(text));
                draft.commit((current) => ({
                  ...parsed,
                  meta: {
                    ...parsed.meta,
                    id: current.meta.id,
                    slug: current.meta.slug,
                    status: current.meta.status,
                    publishedAt: current.meta.publishedAt,
                    createdAt: current.meta.createdAt,
                  },
                }));
              });
            }}
          />
        </label>
        <button type="button" onClick={() => setRemoving(true)} className="text-[13px] text-[#8a3d32]">
          Eliminar
        </button>
        <button type="button" onClick={() => setPublishing(true)} className="rounded-full bg-inkwell px-4 py-2 text-[14px] text-linen">
          Enviar
        </button>
      </header>
      {removing && (
        <ConfirmDelete
          title={displayTitle(doc)}
          busy={removingBusy}
          onCancel={() => (removingBusy ? undefined : setRemoving(false))}
          onConfirm={() => {
            void (async () => {
              setRemovingBusy(true);
              await draft.discard();
              navigate('/crear');
            })();
          }}
        />
      )}

      <div className={wide ? 'grid min-h-0 flex-1 grid-cols-[280px_minmax(0,1fr)_380px]' : 'flex min-h-0 flex-1 flex-col'}>
        {wide && <div className="h-full min-h-0 overflow-hidden border-r">{rail}</div>}
        <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-mist">
            <div className="flex flex-wrap items-center justify-center gap-2 px-3 pb-1 pt-3">
            <div className="flex rounded-full bg-white/80 p-1 text-[13px] shadow-sm">
              {(
                [
                  ['portada', 'Portada'],
                  ['cielo', 'Cielo'],
                  ['dentro', 'Dentro'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  disabled={value === 'dentro' && !star}
                  onClick={() => {
                    setTryGate(false);
                    setMode(value);
                  }}
                  className={[
                    'rounded-full px-4 py-1.5 disabled:opacity-30',
                    mode === value ? 'bg-inkwell text-linen' : 'text-inkwell/60',
                  ].join(' ')}
                >
                  {label}
                </button>
              ))}
            </div>
            {doc.gate.enabled && doc.gate.phrase.trim() && (
              <button type="button" onClick={() => setTryGate(true)} className="text-[12px] uppercase tracking-[0.14em] text-inkwell/45">
                Probar la puerta
              </button>
            )}
          </div>
          <PhoneStage>
            <UniversePlayer
              doc={doc}
              frame={frame}
              starId={star?.id}
              framed
              compose={mode === 'cielo'}
              selectedId={starId}
              onSelectStar={setStarId}
              onUserFrame={onUserFrame}
              onMoveStar={(movedId, x, y) =>
                draft.commit((current) => ({
                  ...current,
                  stars: current.stars.map((item) => (item.id === movedId ? { ...item, x, y } : item)),
                }))
              }
            />
          </PhoneStage>
          {!wide && (
            <div className="flex border-t border-black/5 bg-linen text-[13px]">
              <button type="button" onClick={() => setPanel('estrellas')} className={['flex-1 py-3', panel === 'estrellas' ? 'text-inkwell' : 'text-inkwell/40'].join(' ')}>
                Estrellas
              </button>
              <button type="button" onClick={() => setPanel('editar')} className={['flex-1 py-3', panel === 'editar' ? 'text-inkwell' : 'text-inkwell/40'].join(' ')}>
                Editar
              </button>
            </div>
          )}
        </main>
        {wide && <div className="h-full min-h-0 overflow-hidden border-l">{inspector}</div>}
      </div>
      {!wide && <div className="h-[46dvh] min-h-0 shrink-0 overflow-hidden border-t">{panel === 'estrellas' ? rail : inspector}</div>}

      {adding && (
        <div className="fixed inset-0 z-40 grid place-items-end overflow-hidden bg-[#1b1612]/35 p-3 sm:place-items-center" onClick={() => setAdding(false)}>
          <div className="flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-[28px] bg-linen p-5 sm:p-7" onClick={(e) => e.stopPropagation()}>
            <p className="text-[11px] uppercase tracking-[0.2em] text-brass">Nueva estrella</p>
            <h2 className="mt-1 font-display text-4xl italic">Qué quieres poner</h2>
            <div className="mt-5 grid min-h-0 gap-2 overflow-y-auto overscroll-contain pr-1 sm:grid-cols-2">
              {STAR_TYPES.map((type) => (
                <button key={type.type} type="button" onClick={() => addStar(type.type)} className="rounded-2xl bg-white px-4 py-4 text-left ring-1 ring-black/5 hover:ring-brass/40">
                  <span className="text-2xl">{type.glyph}</span>
                  <span className="mt-2 block font-display text-2xl italic">{type.name}</span>
                  <span className="mt-1 block text-[13px] leading-relaxed text-inkwell/55">{type.line}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {publishing && (
        <PublishDialog
          doc={doc}
          onClose={() => setPublishing(false)}
          onPublished={(next) => {
            if (isCita(next)) return;
            draft.setDoc(next);
            void saveDraft(next);
          }}
        />
      )}
    </div>
  );
}

function labelOf(type: StarType) {
  return STAR_TYPES.find((item) => item.type === type)?.name ?? type;
}

function slugFile(doc: UniverseDocument) {
  return (doc.meta.slug || displayTitle(doc) || 'universo').toLowerCase().replace(/\s+/g, '-');
}
