import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { PriceTag } from '@/hub/PriceTag';
import { putPhoto } from '@/lib/cloud';
import { loadDraft, peekDraft, purgeProject, saveDraft } from '@/lib/drafts';
import { compressImage } from '@/lib/images';
import { uid } from '@/lib/motion';
import { isViaje } from '@/schema/project';
import { coordsLabel, parseLatLngPair } from '@/universe/coords';
import { TRIP_SLIDE, createStop, parseTrip, tripTitle, type TripBudget, type TripDocument, type TripStop } from '@/schema/viaje';
import { PhoneRack, PhoneStage } from '@/studio/PhoneStage';
import { PublishDialog } from '@/studio/PublishDialog';
import { tripMoney } from '@/viaje/money';
import { pinOf } from '@/viaje/TripMap';
import { TripPlayer } from '@/viaje/TripPlayer';

const input =
  'mt-1 w-full rounded-xl border border-black/10 bg-white px-2.5 py-1.5 text-[13.5px] text-inkwell outline-none placeholder:text-inkwell/30 focus:border-brass/60';

export function TripStudio({ id }: { id: string }) {
  const navigate = useNavigate();
  const [doc, setDoc] = useState<TripDocument | null>(() => {
    const loaded = peekDraft(id);
    return loaded && isViaje(loaded) ? loaded : null;
  });
  const [focus, setFocus] = useState<string | null>(null);
  const [rack, setRack] = useState(false);
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
      const next = { ...doc, meta: { ...doc.meta, title: tripTitle(doc), updatedAt: new Date().toISOString() } };
      void saveDraft(next).catch(() => undefined);
    }, 700);
    return () => window.clearTimeout(handle);
  }, [doc]);

  useEffect(() => {
    if (doc) return;
    void loadDraft(id).then((loaded) => {
      if (loaded && isViaje(loaded)) setDoc(loaded);
      else setMissing(true);
    });
  }, [doc, id]);

  if (!doc) {
    return (
      <div className="grid h-dvh place-items-center bg-linen px-6 text-center text-inkwell">
        <p className="font-display text-4xl italic">{missing ? 'No encuentro este viaje.' : 'Abriendo el viaje…'}</p>
        {missing && (
          <Link to="/crear" className="mt-6 text-brass">
            Volver a los míos
          </Link>
        )}
      </div>
    );
  }

  const edit = (recipe: (current: TripDocument) => TripDocument) => {
    setDoc((current) => (current ? recipe(current) : current));
  };

  const patchIntro = (patch: Partial<TripDocument['intro']>) => {
    edit((current) => {
      const intro = { ...current.intro, ...patch };
      const title = current.meta.titleTouched
        ? current.meta.title
        : intro.forName.trim()
          ? `Para ${intro.forName.trim()}`
          : 'Viaje sin nombre';
      return { ...current, intro, meta: { ...current.meta, title } };
    });
  };

  const patchBudget = (patch: Partial<TripBudget>) => {
    edit((current) => ({ ...current, budget: { ...current.budget, ...patch } }));
  };

  const patchStop = (stopId: string, recipe: (stop: TripStop) => TripStop) => {
    edit((current) => ({
      ...current,
      stops: current.stops.map((stop) => (stop.id === stopId ? recipe(stop) : stop)),
    }));
  };

  const addStop = () => {
    const created = createStop();
    edit((current) => ({ ...current, stops: [...current.stops, created] }));
    setFocus(created.id);
  };

  const move = (index: number, dir: -1 | 1) => {
    edit((current) => {
      const next = index + dir;
      if (next < 0 || next >= current.stops.length) return current;
      const stops = current.stops.slice();
      const [item] = stops.splice(index, 1);
      if (!item) return current;
      stops.splice(next, 0, item);
      return { ...current, stops };
    });
  };

  const placeOnMap = (lat: number, lng: number) => {
    const latText = packCoord(lat);
    const lngText = packCoord(lng);
    let target = focus && focus !== TRIP_SLIDE ? focus : '';
    edit((current) => {
      const focused = target ? current.stops.find((stop) => stop.id === target) : undefined;
      const vacant = current.stops.find((stop) => !pinOf(stop) && !stop.title.trim());
      const stop = focused ?? vacant;
      if (stop) {
        target = stop.id;
        return {
          ...current,
          stops: current.stops.map((item) => (item.id === stop.id ? { ...item, lat: latText, lng: lngText } : item)),
        };
      }
      const created = createStop();
      created.lat = latText;
      created.lng = lngText;
      target = created.id;
      return { ...current, stops: [...current.stops, created] };
    });
    if (target) setFocus(target);
    const placed = target;
    void nameOfPlace(lat, lng).then((name) => {
      if (!name || !placed) return;
      setDoc((current) => {
        if (!current) return current;
        return {
          ...current,
          stops: current.stops.map((stop) => (stop.id === placed && !stop.title.trim() ? { ...stop, title: name } : stop)),
        };
      });
    });
  };

  const money = tripMoney(doc);
  const rackItems: { key: string; label: string; node: ReactNode }[] = [
    { key: 'route', label: 'Recorrido', node: <TripPlayer doc={doc} framed stopId={null} onStop={() => undefined} /> },
    ...doc.stops.map((stop, index) => ({
      key: stop.id,
      label: stop.title.trim() || `Parada ${index + 1}`,
      node: <TripPlayer doc={doc} framed stopId={stop.id} onStop={() => undefined} />,
    })),
    ...(money
      ? [
          {
            key: 'slide',
            label: 'Diapositiva',
            node: <TripPlayer doc={doc} framed stopId={TRIP_SLIDE} onStop={() => undefined} />,
          },
        ]
      : []),
  ];

  return (
    <div className="flex h-dvh flex-col bg-linen text-inkwell">
      <header className="flex h-14 shrink-0 items-center gap-3 border-b border-black/5 px-3">
        <Link to="/crear" className="grid h-9 w-9 place-items-center rounded-full hover:bg-white" aria-label="Mis proyectos">
          ←
        </Link>
        <span className="hidden font-display text-xl italic sm:block">Lumen</span>
        <input
          value={doc.meta.title}
          onChange={(event) => setDoc({ ...doc, meta: { ...doc.meta, title: event.target.value, titleTouched: true } })}
          className="min-w-0 flex-1 bg-transparent font-display text-[1.25rem] italic outline-none"
        />
        <button type="button" onClick={() => setRemoving(true)} className="text-[12px] text-[#8a3d32]">
          Eliminar
        </button>
        <PriceTag doc={doc} />
        <button type="button" onClick={() => setPublishing(true)} className="rounded-full bg-inkwell px-4 py-1.5 text-[13px] text-linen">
          Enviar
        </button>
      </header>
      <div className="grid min-h-0 flex-1 overflow-auto lg:grid-cols-[minmax(240px,300px)_minmax(0,1fr)] lg:overflow-hidden">
        <aside className="order-2 min-h-0 overflow-auto border-t border-black/5 px-3 py-4 lg:order-1 lg:border-r lg:border-t-0">
          <p className="text-[10px] uppercase tracking-[0.16em] text-brass">El viaje</p>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-inkwell/50">
            Toca el mapa del teléfono para dejar una parada. Lo vacío no sale.
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <Field label="Para">
              <input className={input} value={doc.intro.forName} placeholder="Clara" onChange={(event) => patchIntro({ forName: event.target.value })} />
            </Field>
            <Field label="De parte de">
              <input className={input} value={doc.intro.fromName} placeholder="Alex" onChange={(event) => patchIntro({ fromName: event.target.value })} />
            </Field>
            <Field label="Nombre">
              <input className={input} value={doc.intro.title} placeholder="La costa" onChange={(event) => patchIntro({ title: event.target.value })} />
            </Field>
            <Field label="Cuándo">
              <input className={input} value={doc.intro.when} placeholder="Cuatro días" onChange={(event) => patchIntro({ when: event.target.value })} />
            </Field>
            <div className="col-span-2">
              <Field label="Una frase">
                <textarea className={`${input} min-h-12 resize-none`} value={doc.intro.line} placeholder="Primero el mapa entero." onChange={(event) => patchIntro({ line: event.target.value })} />
              </Field>
            </div>
          </div>

          <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-brass">Presupuesto</p>
          <div className="mt-2 grid grid-cols-2 gap-2.5">
            <div>
              <p className="text-[10px] uppercase tracking-[0.14em] text-inkwell/40">Moneda</p>
              <div className="mt-1 grid grid-cols-2 gap-1">
                {(['EUR', 'USD'] as const).map((code) => (
                  <button
                    key={code}
                    type="button"
                    onClick={() => patchBudget({ currency: code })}
                    className={`rounded-full px-2 py-1 text-[12px] ${doc.budget.currency === code ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
                  >
                    {code}
                  </button>
                ))}
              </div>
            </div>
            <Field label="Gente">
              <input className={input} inputMode="numeric" value={doc.budget.people} placeholder="2" onChange={(event) => patchBudget({ people: event.target.value })} />
            </Field>
            <Field label="Total estimado">
              <input className={input} inputMode="decimal" value={doc.budget.total} placeholder="Se suma solo" onChange={(event) => patchBudget({ total: event.target.value })} />
            </Field>
            <Field label="Por persona">
              <input className={input} inputMode="decimal" value={doc.budget.each} placeholder="Se divide solo" onChange={(event) => patchBudget({ each: event.target.value })} />
            </Field>
            <Field label="Extra">
              <input className={input} inputMode="decimal" value={doc.budget.extra} placeholder="Coche, vuelos" onChange={(event) => patchBudget({ extra: event.target.value })} />
            </Field>
            <div className="col-span-2">
              <Field label="Nota">
                <input className={input} value={doc.budget.note} placeholder="Sin contar caprichos" onChange={(event) => patchBudget({ note: event.target.value })} />
              </Field>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.16em] text-brass">Paradas</p>
            <button type="button" onClick={addStop} className="text-[12px] text-brass">
              Añadir
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setFocus(null)}
              className={`rounded-full px-2.5 py-1 text-[12px] ${focus === null ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
            >
              Recorrido
            </button>
            {doc.stops.map((stop, index) => (
              <button
                key={stop.id}
                type="button"
                onClick={() => setFocus(stop.id)}
                className={`rounded-full px-2.5 py-1 text-[12px] ${focus === stop.id ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
              >
                {index + 1}. {stop.title.trim() || 'Sin nombre'}
              </button>
            ))}
            {money && (
              <button
                type="button"
                onClick={() => setFocus(TRIP_SLIDE)}
                className={`rounded-full px-2.5 py-1 text-[12px] ${focus === TRIP_SLIDE ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
              >
                Diapositiva
              </button>
            )}
          </div>

          {doc.stops.map((stop, index) =>
            stop.id === focus ? (
              <StopEditor
                key={stop.id}
                stop={stop}
                index={index}
                total={doc.stops.length}
                currency={doc.budget.currency}
                onChange={(recipe) => patchStop(stop.id, recipe)}
                onMove={(dir) => move(index, dir)}
                onRemove={() => {
                  edit((current) => ({ ...current, stops: current.stops.filter((item) => item.id !== stop.id) }));
                  setFocus(null);
                }}
              />
            ) : null,
          )}
        </aside>
        <div className="order-1 flex min-h-[72vh] flex-col bg-[#1a1814] lg:order-2 lg:min-h-0">
          <div className="flex shrink-0 justify-end gap-1 px-4 pt-3">
            <button
              type="button"
              onClick={() => setRack(false)}
              className={`rounded-full px-3 py-1 text-[12px] ${!rack ? 'bg-white text-inkwell' : 'text-white/55'}`}
            >
              Un móvil
            </button>
            <button
              type="button"
              onClick={() => setRack(true)}
              className={`rounded-full px-3 py-1 text-[12px] ${rack ? 'bg-white text-inkwell' : 'text-white/55'}`}
            >
              Varios
            </button>
          </div>
          {rack ? (
            <PhoneRack items={rackItems} />
          ) : (
            <PhoneStage>
              <TripPlayer doc={doc} framed stopId={focus} onStop={setFocus} onDrop={placeOnMap} />
            </PhoneStage>
          )}
        </div>
      </div>
      {publishing && (
        <PublishDialog
          doc={doc}
          onClose={() => setPublishing(false)}
          onPublished={(next) => {
            const parsed = parseTrip(next);
            setDoc(parsed);
            void saveDraft(parsed);
            setPublishing(false);
          }}
        />
      )}
      {removing && (
        <ConfirmDelete
          title={tripTitle(doc)}
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
      <span className="text-[10px] uppercase tracking-[0.14em] text-inkwell/40">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] leading-relaxed text-inkwell/40">{hint}</span>}
    </label>
  );
}

function StopEditor({
  stop,
  index,
  total,
  currency,
  onChange,
  onMove,
  onRemove,
}: {
  stop: TripStop;
  index: number;
  total: number;
  currency: TripDocument['budget']['currency'];
  onChange: (recipe: (stop: TripStop) => TripStop) => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const upload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setUploadError('');
    try {
      const data = await compressImage(file);
      const photo = await putPhoto(data, uid('photo'));
      onChange((current) => ({ ...current, photo }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'No se pudo subir la foto.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="mt-4 rounded-[18px] bg-white p-3 ring-1 ring-black/5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] uppercase tracking-[0.16em] text-brass">Parada {index + 1}</p>
        <div className="flex gap-2 text-[11px] text-inkwell/45">
          <button type="button" disabled={index === 0} onClick={() => onMove(-1)} className="disabled:opacity-30">
            Subir
          </button>
          <button type="button" disabled={index === total - 1} onClick={() => onMove(1)} className="disabled:opacity-30">
            Bajar
          </button>
          <button type="button" onClick={onRemove} className="text-[#8a3d32]">
            Quitar
          </button>
        </div>
      </div>
      <div className="mt-2 grid gap-2">
        <Field label="Título">
          <input className={input} value={stop.title} placeholder="Nerja" onChange={(event) => onChange((current) => ({ ...current, title: event.target.value }))} />
        </Field>
        <Field label="Qué pasa aquí">
          <textarea className={`${input} min-h-14 resize-none`} value={stop.body} onChange={(event) => onChange((current) => ({ ...current, body: event.target.value }))} />
        </Field>
        <div>
          {stop.photo && <img src={stop.photo} alt="" className="mb-2 h-16 w-full rounded-xl object-cover" />}
          <div className="flex gap-3 text-[12px]">
            <label className="cursor-pointer rounded-full bg-inkwell px-3 py-1 text-linen">
              {uploading ? 'Subiendo…' : stop.photo ? 'Cambiar foto' : 'Miniatura'}
              <input type="file" accept="image/*" className="hidden" disabled={uploading} onChange={(event) => void upload(event.target.files?.[0])} />
            </label>
            {stop.photo && (
              <button type="button" className="text-[#8a3d32]" onClick={() => onChange((current) => ({ ...current, photo: '' }))}>
                Quitar
              </button>
            )}
          </div>
          {uploadError && <p className="mt-2 text-[12px] text-[#8a3d32]">{uploadError}</p>}
        </div>
        <Field label="En el mapa" hint="Toca el satélite o pega coordenadas.">
          <input
            className={input}
            value={coordsLabel(stop)}
            placeholder="36.75, -3.88"
            onChange={(event) => {
              const parsed = parseLatLngPair(event.target.value);
              onChange((current) => ({ ...current, lat: parsed?.lat ?? event.target.value, lng: parsed?.lng ?? '' }));
            }}
          />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Tiempo aquí">
            <input className={input} value={stop.stay} placeholder="Dos días" onChange={(event) => onChange((current) => ({ ...current, stay: event.target.value }))} />
          </Field>
          <Field label={`Estimado ${currency === 'USD' ? '$' : '€'}`}>
            <input className={input} inputMode="decimal" value={stop.cost} placeholder="180" onChange={(event) => onChange((current) => ({ ...current, cost: event.target.value }))} />
          </Field>
          <Field label="Dormimos en">
            <input className={input} value={stop.sleep} placeholder="La casa" onChange={(event) => onChange((current) => ({ ...current, sleep: event.target.value }))} />
          </Field>
          <Field label="Comemos en">
            <input className={input} value={stop.eat} placeholder="La plaza" onChange={(event) => onChange((current) => ({ ...current, eat: event.target.value }))} />
          </Field>
          <Field label="Cómo llegamos">
            <input className={input} value={stop.arrive} placeholder="En coche" onChange={(event) => onChange((current) => ({ ...current, arrive: event.target.value }))} />
          </Field>
          <Field label="Nota">
            <input className={input} value={stop.note} onChange={(event) => onChange((current) => ({ ...current, note: event.target.value }))} />
          </Field>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-inkwell/40">Qué hacer</p>
          <div className="mt-1.5 grid gap-1.5">
            {stop.todo.map((item, todoIndex) => (
              <div key={`${stop.id}-${todoIndex}`} className="flex gap-2">
                <input
                  className={input}
                  value={item}
                  placeholder="Bajar a la cala"
                  onChange={(event) =>
                    onChange((current) => ({
                      ...current,
                      todo: current.todo.map((line, lineIndex) => (lineIndex === todoIndex ? event.target.value : line)),
                    }))
                  }
                />
                <button
                  type="button"
                  className="text-[11px] text-[#8a3d32]"
                  onClick={() => onChange((current) => ({ ...current, todo: current.todo.filter((_, lineIndex) => lineIndex !== todoIndex) }))}
                >
                  Quitar
                </button>
              </div>
            ))}
            <button type="button" className="text-left text-[12px] text-brass" onClick={() => onChange((current) => ({ ...current, todo: [...current.todo, ''] }))}>
              Añadir algo que hacer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function packCoord(value: number) {
  return value.toFixed(5).replace(/0+$/, '').replace(/\.$/, '');
}

async function nameOfPlace(lat: number, lng: number) {
  try {
    const response = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=es`,
    );
    if (!response.ok) return '';
    const data = (await response.json()) as { city?: string; locality?: string; principalSubdivision?: string };
    return (data.city || data.locality || data.principalSubdivision || '').trim();
  } catch {
    return '';
  }
}
