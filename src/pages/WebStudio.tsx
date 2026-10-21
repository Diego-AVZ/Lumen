import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { PriceTag } from '@/hub/PriceTag';
import { putPhoto } from '@/lib/cloud';
import { loadDraft, peekDraft, purgeProject, saveDraft } from '@/lib/drafts';
import { compressImage } from '@/lib/images';
import { uid } from '@/lib/motion';
import { isWeb } from '@/schema/project';
import { coordsLabel, parseLatLngPair } from '@/universe/coords';
import {
  CADENCES,
  WEB_BLOCKS,
  WEB_THEMES,
  createBlock,
  createPage,
  createPlace,
  createRound,
  parseWeb,
  webTitle,
  type ListBlock,
  type MapBlock,
  type WebBlock,
  type WebBlockType,
  type WebDocument,
  type WebPage,
  type WebPlace,
} from '@/schema/web';
import { PhoneStage } from '@/studio/PhoneStage';
import { PublishDialog } from '@/studio/PublishDialog';
import { VoiceNote } from '@/studio/VoiceNote';
import { WebPlayer } from '@/web/WebPlayer';

const input =
  'mt-1.5 w-full rounded-2xl border border-black/10 bg-white px-3.5 py-2.5 text-[15px] text-inkwell outline-none placeholder:text-inkwell/30 focus:border-brass/60';

export function WebStudio({ id }: { id: string }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<WebDocument | null>(() => {
    const loaded = peekDraft(id);
    return loaded && isWeb(loaded) ? loaded : null;
  });
  const [focus, setFocus] = useState<string | null>(null);
  const [publishing, setPublishing] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);
  const [adding, setAdding] = useState(false);
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
      const next = { ...doc, meta: { ...doc.meta, title: webTitle(doc), updatedAt: new Date().toISOString() } };
      void saveDraft(next).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [doc]);

  useEffect(() => {
    if (doc) return;
    void loadDraft(id).then((loaded) => {
      if (loaded && isWeb(loaded)) setDoc(loaded);
      else setMissing(true);
    });
  }, [doc, id]);

  useEffect(() => {
    if (!doc || focus === null) return;
    if (!doc.pages.some((page) => page.id === focus)) setFocus(doc.pages[0]?.id ?? null);
  }, [doc, focus]);

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-linen px-6 text-center text-inkwell">
        <p className="font-display text-4xl italic">{missing ? 'No encuentro esta web.' : 'Abriendo la web…'}</p>
        {missing && (
          <Link to="/crear" className="mt-6 text-brass">
            Volver a los míos
          </Link>
        )}
      </div>
    );
  }

  const page = doc.pages.find((item) => item.id === focus) ?? null;

  const edit = (recipe: (current: WebDocument) => WebDocument) => {
    setDoc((current) => (current ? recipe(current) : current));
  };

  const patchIntro = (patch: Partial<WebDocument['intro']>) => {
    edit((current) => {
      const intro = { ...current.intro, ...patch };
      const title = current.meta.titleTouched
        ? current.meta.title
        : intro.forName.trim()
          ? `Para ${intro.forName.trim()}`
          : 'Web sin nombre';
      return { ...current, intro, meta: { ...current.meta, title } };
    });
  };

  const patchPage = (pageId: string, recipe: (page: WebPage) => WebPage) => {
    edit((current) => ({
      ...current,
      pages: current.pages.map((item) => (item.id === pageId ? recipe(item) : item)),
    }));
  };

  const addPage = () => {
    const created = createPage();
    edit((current) => ({ ...current, pages: [...current.pages, created] }));
    setFocus(created.id);
  };

  const addBlock = (type: WebBlockType) => {
    if (!page) return;
    const created = createBlock(type);
    patchPage(page.id, (item) => ({ ...item, blocks: [...item.blocks, created] }));
    setAdding(false);
  };

  return (
    <div className="flex h-dvh flex-col bg-linen text-inkwell">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-black/5 px-3 sm:px-4">
        <Link to="/crear" className="grid h-10 w-10 place-items-center rounded-full hover:bg-white" aria-label="Mis proyectos">
          ←
        </Link>
        <span className="hidden font-display text-2xl italic sm:block">Lumen</span>
        <input
          value={doc.meta.title}
          onChange={(event) =>
            setDoc({ ...doc, meta: { ...doc.meta, title: event.target.value, titleTouched: true } })
          }
          className="min-w-0 flex-1 bg-transparent font-display text-[1.45rem] italic outline-none"
        />
        <button type="button" onClick={() => setRemoving(true)} className="text-[13px] text-[#8a3d32]">
          Eliminar
        </button>
        <PriceTag doc={doc} />
        <button type="button" onClick={() => setPublishing(true)} className="rounded-full bg-inkwell px-4 py-2 text-[14px] text-linen">
          Enviar
        </button>
      </header>
      <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(0,1fr)_400px] lg:overflow-hidden">
        <aside className="order-2 min-h-0 overflow-auto border-t border-black/5 px-5 py-6 lg:order-1 lg:border-r lg:border-t-0">
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Web personalizada</p>
          <p className="mt-2 max-w-md text-[14px] leading-relaxed text-inkwell/55">
            La base son 12,95 €, como la plantilla. Si añades de más, suma. Se cobra al publicar.
          </p>

          <div className="mt-6 grid gap-4">
            <Field label="Para">
              <input className={input} value={doc.intro.forName} placeholder="Clara" onChange={(event) => patchIntro({ forName: event.target.value })} />
            </Field>
            <Field label="De parte de">
              <input className={input} value={doc.intro.fromName} placeholder="Alex" onChange={(event) => patchIntro({ fromName: event.target.value })} />
            </Field>
            <Field label="La frase de la portada">
              <textarea className={`${input} min-h-20 resize-none`} value={doc.intro.line} placeholder="No es un cielo. Es un sitio vuestro." onChange={(event) => patchIntro({ line: event.target.value })} />
            </Field>
            <Field label="Música de la portada" hint="Un enlace de Spotify. Canción, álbum o lista.">
              <input className={input} value={doc.soundtrack.url} placeholder="https://open.spotify.com/..." onChange={(event) => edit((current) => ({ ...current, soundtrack: { ...current.soundtrack, url: event.target.value } }))} />
            </Field>
            <Field label="Cómo se llama">
              <input className={input} value={doc.soundtrack.label} placeholder="Escuchar" onChange={(event) => edit((current) => ({ ...current, soundtrack: { ...current.soundtrack, label: event.target.value } }))} />
            </Field>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Papel</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {WEB_THEMES.map((theme) => (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => edit((current) => ({ ...current, theme }))}
                    className={`h-11 w-11 rounded-full ring-2 ring-offset-2 ${doc.theme.id === theme.id ? 'ring-inkwell' : 'ring-transparent'}`}
                    style={{ background: `linear-gradient(135deg, ${theme.paper} 50%, ${theme.ink} 50%)` }}
                    aria-label={theme.id}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Sitios</p>
            <button type="button" onClick={addPage} className="text-[13px] text-brass">
              Añadir
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFocus(null)}
              className={`rounded-full px-3 py-1.5 text-[13px] ${focus === null ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
            >
              Portada
            </button>
            {doc.pages.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setFocus(item.id)}
                className={`rounded-full px-3 py-1.5 text-[13px] ${focus === item.id ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
              >
                {item.nav || item.title || `Sitio ${index + 1}`}
              </button>
            ))}
          </div>

          {page && (
            <div className="mt-8">
              <div className="flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Este sitio</p>
                <button
                  type="button"
                  className="text-[13px] text-[#8a3d32]"
                  onClick={() => edit((current) => ({ ...current, pages: current.pages.filter((item) => item.id !== page.id) }))}
                >
                  Quitar sitio
                </button>
              </div>
              <div className="mt-4 grid gap-4">
                <Field label="Título">
                  <input className={input} value={page.title} onChange={(event) => patchPage(page.id, (item) => ({ ...item, title: event.target.value }))} />
                </Field>
                <Field label="En el menú">
                  <input className={input} value={page.nav} onChange={(event) => patchPage(page.id, (item) => ({ ...item, nav: event.target.value }))} />
                </Field>
                <Field label="Pregunta para entrar" hint="Si la dejas vacía, el sitio se abre directo. Una respuesta por línea. No distingue mayúsculas.">
                  <textarea
                    className={`${input} min-h-16 resize-none`}
                    value={page.quiz.question}
                    placeholder="¿Cómo se llama el café?"
                    onChange={(event) => patchPage(page.id, (item) => ({ ...item, quiz: { ...item.quiz, question: event.target.value } }))}
                  />
                </Field>
                <Field label="Respuestas que valen">
                  <textarea
                    className={`${input} min-h-16 resize-none`}
                    value={page.quiz.answers.join('\n')}
                    placeholder={'el de siempre'}
                    onChange={(event) => patchPage(page.id, (item) => ({ ...item, quiz: { ...item.quiz, answers: event.target.value.split('\n') } }))}
                  />
                </Field>
                <Field label="Pista">
                  <input className={input} value={page.quiz.hint} placeholder="El que estaba abierto." onChange={(event) => patchPage(page.id, (item) => ({ ...item, quiz: { ...item.quiz, hint: event.target.value } }))} />
                </Field>
              </div>

              <div className="mt-8 flex items-center justify-between">
                <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Dentro</p>
                <button type="button" onClick={() => setAdding((value) => !value)} className="text-[13px] text-brass">
                  {adding ? 'Cerrar' : 'Añadir'}
                </button>
              </div>
              {adding && (
                <ul className="mt-3 grid gap-2">
                  {WEB_BLOCKS.map((item) => (
                    <li key={item.type}>
                      <button type="button" onClick={() => addBlock(item.type)} className="w-full rounded-[18px] bg-white px-4 py-3 text-left ring-1 ring-black/10">
                        <span className="font-display text-2xl italic">{item.name}</span>
                        <span className="mt-1 block text-[13px] text-inkwell/55">{item.line}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <div className="mt-4 grid gap-3">
                {page.blocks.map((block, index) => (
                  <BlockCard
                    key={block.id}
                    block={block}
                    first={index === 0}
                    last={index === page.blocks.length - 1}
                    onChange={(next) =>
                      patchPage(page.id, (item) => ({
                        ...item,
                        blocks: item.blocks.map((entry) => (entry.id === block.id ? next : entry)),
                      }))
                    }
                    onRemove={() => patchPage(page.id, (item) => ({ ...item, blocks: item.blocks.filter((entry) => entry.id !== block.id) }))}
                    onMove={(dir) =>
                      patchPage(page.id, (item) => {
                        const blocks = item.blocks.slice();
                        const next = index + dir;
                        if (next < 0 || next >= blocks.length) return item;
                        const [moved] = blocks.splice(index, 1);
                        if (!moved) return item;
                        blocks.splice(next, 0, moved);
                        return { ...item, blocks };
                      })
                    }
                  />
                ))}
              </div>
            </div>
          )}
        </aside>
        <div className="order-1 min-h-[70vh] bg-mist lg:order-2 lg:min-h-0">
          <PhoneStage>
            <WebPlayer doc={doc} preview framed pageId={focus} onPage={setFocus} />
          </PhoneStage>
        </div>
      </div>
      {publishing && (
        <PublishDialog
          doc={doc}
          onClose={() => setPublishing(false)}
          onPublished={(next) => {
            const parsed = parseWeb(next);
            setDoc(parsed);
            void saveDraft(parsed);
            setPublishing(false);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title={webTitle(doc)}
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

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12.5px] leading-relaxed text-inkwell/45">{hint}</span>}
    </label>
  );
}

function BlockCard({
  block,
  first,
  last,
  onChange,
  onRemove,
  onMove,
}: {
  block: WebBlock;
  first: boolean;
  last: boolean;
  onChange: (block: WebBlock) => void;
  onRemove: () => void;
  onMove: (dir: -1 | 1) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const name = WEB_BLOCKS.find((item) => item.type === block.type)?.name ?? block.type;

  const upload = async (file: File | undefined, apply: (src: string) => void) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const data = await compressImage(file);
      apply(await putPhoto(data, uid('photo')));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="rounded-[22px] bg-white p-4 ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] uppercase tracking-[0.16em] text-brass">{name}</p>
        <div className="flex gap-3 text-[12px] text-inkwell/45">
          <button type="button" disabled={first} onClick={() => onMove(-1)} className="disabled:opacity-30">
            Subir
          </button>
          <button type="button" disabled={last} onClick={() => onMove(1)} className="disabled:opacity-30">
            Bajar
          </button>
          <button type="button" onClick={onRemove} className="text-[#8a3d32]">
            Quitar
          </button>
        </div>
      </div>
      <div className="mt-3 grid gap-3">
        {block.type === 'texto' && (
          <>
            <Field label="Antetítulo">
              <input className={input} value={block.kicker} onChange={(event) => onChange({ ...block, kicker: event.target.value })} />
            </Field>
            <Field label="Título">
              <input className={input} value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} />
            </Field>
            <Field label="Texto">
              <textarea className={`${input} min-h-28 resize-none`} value={block.body} onChange={(event) => onChange({ ...block, body: event.target.value })} />
            </Field>
          </>
        )}
        {block.type === 'imagen' && (
          <>
            <PhotoField src={block.src} uploading={uploading} onFile={(file) => void upload(file, (src) => onChange({ ...block, src }))} onClear={() => onChange({ ...block, src: '' })} />
            <Field label="Frase">
              <input className={input} value={block.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} />
            </Field>
          </>
        )}
        {block.type === 'audio' && (
          <>
            <Field label="Cómo se llama">
              <input className={input} value={block.label} placeholder="Una nota" onChange={(event) => onChange({ ...block, label: event.target.value })} />
            </Field>
            <VoiceNote url={block.url} onChange={(url) => onChange({ ...block, url })} />
          </>
        )}
        {block.type === 'spotify' && (
          <>
            <Field label="Enlace">
              <input className={input} value={block.url} placeholder="https://open.spotify.com/..." onChange={(event) => onChange({ ...block, url: event.target.value })} />
            </Field>
            <Field label="Botón">
              <input className={input} value={block.label} placeholder="Escuchar" onChange={(event) => onChange({ ...block, label: event.target.value })} />
            </Field>
          </>
        )}
        {block.type === 'corazon' && (
          <>
            <Field label="La frase" hint="Hay que tocar el corazón tantas veces como pongas. Luego aparece el detalle, la foto, o las dos.">
              <input className={input} value={block.line} onChange={(event) => onChange({ ...block, line: event.target.value })} />
            </Field>
            <Field label="Toques">
              <input
                className={input}
                type="number"
                min={1}
                max={12}
                value={block.taps}
                onChange={(event) => onChange({ ...block, taps: Math.min(12, Math.max(1, Number(event.target.value) || 1)) })}
              />
            </Field>
            <Field label="Lo que se descubre">
              <textarea className={`${input} min-h-20 resize-none`} value={block.detail} onChange={(event) => onChange({ ...block, detail: event.target.value })} />
            </Field>
            <PhotoField src={block.photo} uploading={uploading} onFile={(file) => void upload(file, (photo) => onChange({ ...block, photo }))} onClear={() => onChange({ ...block, photo: '' })} />
          </>
        )}
        {block.type === 'lista' && <ListFields block={block} onChange={onChange} />}
        {block.type === 'mapa' && <MapFields block={block} onChange={onChange} />}
        {uploadError && <p className="text-[13px] text-[#8a3d32]">{uploadError}</p>}
      </div>
    </div>
  );
}

function PhotoField({
  src,
  uploading,
  onFile,
  onClear,
}: {
  src: string;
  uploading: boolean;
  onFile: (file: File | undefined) => void;
  onClear: () => void;
}) {
  return (
    <div>
      {src && <img src={src} alt="" className="mb-2 h-28 w-full rounded-2xl object-cover" />}
      <div className="flex gap-3 text-[13px]">
        <label className="cursor-pointer rounded-full bg-inkwell px-3 py-1.5 text-linen">
          {uploading ? 'Subiendo…' : src ? 'Cambiar foto' : 'Subir foto'}
          <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => onFile(event.target.files?.[0])} />
        </label>
        {src && (
          <button type="button" onClick={onClear} className="text-[#8a3d32]">
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

function ListFields({ block, onChange }: { block: ListBlock; onChange: (block: WebBlock) => void }) {
  const patch = (recipe: (current: ListBlock) => ListBlock) => onChange(recipe(block));
  return (
    <>
      <Field label="Intro" hint="Cada cierto tiempo se abre un par de planes. Quien entra elige uno y queda guardado en su teléfono.">
        <textarea className={`${input} min-h-16 resize-none`} value={block.intro} onChange={(event) => patch((current) => ({ ...current, intro: event.target.value }))} />
      </Field>
      <Field label="Empieza">
        <input className={input} type="date" value={block.startsOn} onChange={(event) => patch((current) => ({ ...current, startsOn: event.target.value }))} />
      </Field>
      <div>
        <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Cada cuánto</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CADENCES.map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => patch((current) => ({ ...current, everyDays: item.days }))}
              className={`rounded-full px-3 py-1.5 text-[13px] ${block.everyDays === item.days ? 'bg-inkwell text-linen' : 'bg-linen ring-1 ring-black/10'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <input
          className={input}
          type="number"
          min={1}
          max={366}
          value={block.everyDays}
          onChange={(event) => patch((current) => ({ ...current, everyDays: Math.min(366, Math.max(1, Number(event.target.value) || 1)) }))}
        />
      </div>
      {block.rounds.map((round, index) => (
        <div key={round.id} className="rounded-[18px] bg-linen p-3">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-inkwell/45">Par {index + 1}</p>
            <button
              type="button"
              className="text-[12px] text-[#8a3d32]"
              onClick={() => patch((current) => ({ ...current, rounds: current.rounds.filter((item) => item.id !== round.id) }))}
            >
              Quitar
            </button>
          </div>
          <Field label="Cuándo">
            <input className={input} value={round.title} placeholder="Este finde" onChange={(event) => patch((current) => ({ ...current, rounds: current.rounds.map((item) => (item.id === round.id ? { ...item, title: event.target.value } : item)) }))} />
          </Field>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {(['a', 'b'] as const).map((side) => (
              <div key={side}>
                <Field label={side === 'a' ? 'Un plan' : 'El otro'}>
                  <input
                    className={input}
                    value={round[side].title}
                    onChange={(event) =>
                      patch((current) => ({
                        ...current,
                        rounds: current.rounds.map((item) =>
                          item.id === round.id ? { ...item, [side]: { ...item[side], title: event.target.value } } : item,
                        ),
                      }))
                    }
                  />
                </Field>
                <textarea
                  className={`${input} min-h-16 resize-none`}
                  value={round[side].body}
                  placeholder="Una línea"
                  onChange={(event) =>
                    patch((current) => ({
                      ...current,
                      rounds: current.rounds.map((item) =>
                        item.id === round.id ? { ...item, [side]: { ...item[side], body: event.target.value } } : item,
                      ),
                    }))
                  }
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <button type="button" onClick={() => patch((current) => ({ ...current, rounds: [...current.rounds, createRound()] }))} className="text-[13px] text-brass">
        Otro par
      </button>
    </>
  );
}

function MapFields({ block, onChange }: { block: MapBlock; onChange: (block: WebBlock) => void }) {
  const patch = (recipe: (current: MapBlock) => MapBlock) => onChange(recipe(block));
  const setPlace = (placeId: string, recipe: (place: WebPlace) => WebPlace) => {
    patch((current) => ({ ...current, places: current.places.map((place) => (place.id === placeId ? recipe(place) : place)) }));
  };
  return (
    <>
      <Field label="Intro">
        <textarea className={`${input} min-h-16 resize-none`} value={block.intro} onChange={(event) => patch((current) => ({ ...current, intro: event.target.value }))} />
      </Field>
      {block.places.map((place) => (
        <div key={place.id} className="rounded-[18px] bg-linen p-3">
          <div className="flex justify-end">
            <button type="button" className="text-[12px] text-[#8a3d32]" onClick={() => patch((current) => ({ ...current, places: current.places.filter((item) => item.id !== place.id) }))}>
              Quitar
            </button>
          </div>
          <div className="grid grid-cols-[4.5rem_1fr] gap-2">
            <Field label="Símbolo">
              <input className={input} value={place.emoji} onChange={(event) => setPlace(place.id, (item) => ({ ...item, emoji: event.target.value }))} />
            </Field>
            <Field label="Sitio">
              <input className={input} value={place.title} onChange={(event) => setPlace(place.id, (item) => ({ ...item, title: event.target.value }))} />
            </Field>
          </div>
          <Field label="Qué pasó">
            <textarea className={`${input} min-h-16 resize-none`} value={place.body} onChange={(event) => setPlace(place.id, (item) => ({ ...item, body: event.target.value }))} />
          </Field>
          <Field label="Coordenadas" hint="Latitud y longitud, o un enlace de Google Maps.">
            <input
              className={input}
              value={coordsLabel(place)}
              placeholder="36.72, -4.42"
              onChange={(event) => {
                const parsed = parseLatLngPair(event.target.value);
                setPlace(place.id, (item) => ({ ...item, lat: parsed?.lat ?? event.target.value, lng: parsed?.lng ?? '' }));
              }}
            />
          </Field>
        </div>
      ))}
      <button type="button" onClick={() => patch((current) => ({ ...current, places: [...current.places, createPlace()] }))} className="text-[13px] text-brass">
        Otro sitio
      </button>
    </>
  );
}
