import { lazy, Suspense, useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent } from 'react';
import { useAttached } from '@/attach/useAttached';
import { haptic } from '@/lib/haptics';
import { isCita } from '@/schema/project';
import { TRIP_SLIDE, sealIsOpen, sealOpensLabel, tripHeadline, tripLook, type StopSeal, type TripDocument, type TripStop } from '@/schema/viaje';

const DateAskPlayer = lazy(() => import('@/cita/DateAskPlayer').then((mod) => ({ default: mod.DateAskPlayer })));
import { formatMoney, parseMoney, tripMoney } from '@/viaje/money';
import { addTripNote, listTripNotes, notesAreLive, type TripNote } from '@/viaje/notes';
import { TripMap, pinOf } from '@/viaje/TripMap';

export function TripPlayer({
  doc,
  framed = false,
  preview = false,
  nested = false,
  stopId,
  onStop,
  onDrop,
}: {
  doc: TripDocument;
  framed?: boolean;
  preview?: boolean;
  nested?: boolean;
  stopId?: string | null;
  onStop?: (id: string | null) => void;
  onDrop?: (lat: number, lng: number) => void;
}) {
  const [own, setOwn] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sealOpen, setSealOpen] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ startY: number; start: number } | null>(null);
  const [lift, setLift] = useState(nested ? 0.74 : 0.66);
  const openId = onStop ? (stopId ?? null) : own;
  const money = tripMoney(doc);
  const look = tripLook(doc.look);
  const go = (id: string | null) => {
    setPhoto(null);
    setSealOpen(false);
    haptic(id && id !== TRIP_SLIDE ? 'light' : 'medium');
    if (onStop) onStop(id);
    else setOwn(id);
  };

  const pins = useMemo(
    () =>
      doc.stops.flatMap((stop) => {
        const at = pinOf(stop);
        return at ? [{ id: stop.id, at, seal: Boolean(stop.seal) }] : [];
      }),
    [doc.stops],
  );
  const slide = openId === TRIP_SLIDE;
  const index = slide ? -1 : doc.stops.findIndex((stop) => stop.id === openId);
  const stop = index >= 0 ? doc.stops[index] : null;
  const activePin = stop ? pins.findIndex((pin) => pin.id === stop.id) : null;

  const onHandleDown = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    drag.current = { startY: event.clientY, start: lift };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onHandleMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!drag.current || !stage.current) return;
    event.preventDefault();
    const height = stage.current.clientHeight || 1;
    const next = drag.current.start - (event.clientY - drag.current.startY) / height;
    setLift(Math.min(0.9, Math.max(0.34, next)));
  };
  const onHandleUp = () => {
    drag.current = null;
  };

  useEffect(() => {
    const hold = (event: TouchEvent) => {
      if (!drag.current) return;
      event.preventDefault();
    };
    document.addEventListener('touchmove', hold, { passive: false });
    return () => document.removeEventListener('touchmove', hold);
  }, []);

  return (
    <div
      ref={stage}
      className="relative h-full w-full overflow-hidden overscroll-none"
      style={{
        background: look.map,
        color: '#f6efe6',
        ['--frame-safe-top' as string]: framed ? '36px' : nested ? '0px' : undefined,
        ['--frame-safe-bottom' as string]: framed ? '22px' : undefined,
        ['--safe-top' as string]: nested ? '0px' : undefined,
      }}
    >
      <div className="absolute inset-0 z-0">
        <TripMap
          points={pins}
          activeIndex={activePin != null && activePin >= 0 ? activePin : null}
          onPick={go}
          onDrop={onDrop}
          layout={lift}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-20 bg-gradient-to-b from-black/45 to-transparent" />
        <p className="pointer-events-none absolute left-4 top-[calc(var(--safe-top)+0.7rem)] z-[1] text-[11px] uppercase tracking-[0.2em] text-white/80">
          {slide ? 'Cuentas' : stop ? `Parada ${index + 1} de ${doc.stops.length}` : 'Todo el recorrido'}
        </p>
        {onDrop && !slide && (
          <p className="pointer-events-none absolute left-4 right-14 z-[1] text-[11px] text-white/80" style={{ bottom: `calc(${lift * 100}% + 0.7rem)` }}>
            Toca el mapa para dejar la parada.
          </p>
        )}
      </div>

      <section
        className="absolute inset-x-0 bottom-0 z-20 flex flex-col rounded-t-[26px] shadow-[0_-12px_28px_rgba(0,0,0,0.22)]"
        style={{ height: `${lift * 100}%`, background: look.sheet, color: look.ink }}
      >
        <button
          type="button"
          aria-label="Mover la ficha"
          className="flex w-full shrink-0 cursor-grab touch-none flex-col items-center py-4 active:cursor-grabbing"
          onPointerDown={onHandleDown}
          onPointerMove={onHandleMove}
          onPointerUp={onHandleUp}
          onPointerCancel={onHandleUp}
        >
          <span className="h-2 w-16 rounded-full bg-black/28" />
        </button>
        <div className="scroll-y min-h-0 flex-1 px-5 pb-4 pt-4">
          {slide ? (
            <Accounts doc={doc} preview={preview} money={money} />
          ) : stop ? (
            <StopView
              stop={stop}
              index={index}
              total={doc.stops.length}
              currency={doc.budget.currency}
              accent={look.accent}
              onOpenPhoto={setPhoto}
              onOpenSeal={() => setSealOpen(true)}
            />
          ) : (
            <Overview doc={doc} onOpen={go} />
          )}
        </div>
        <footer className="flex shrink-0 items-center gap-2 border-t border-black/10 px-4 pb-[calc(var(--safe-bottom)+1.15rem)] pt-3">
          {slide ? (
            <>
              <button
                type="button"
                onClick={() => go(doc.stops[doc.stops.length - 1]?.id ?? null)}
                className="rounded-full px-3 py-2 text-[13px] ring-1 ring-black/10"
              >
                Anterior
              </button>
              <button type="button" onClick={() => go(null)} className="flex-1 rounded-full px-3 py-2.5 text-[13px]" style={{ background: look.ink, color: look.sheet }}>
                Recorrido
              </button>
            </>
          ) : stop ? (
            <>
              <button
                type="button"
                disabled={index <= 0}
                onClick={() => go(doc.stops[index - 1]?.id ?? null)}
                className="rounded-full px-3 py-2 text-[13px] ring-1 ring-black/10 disabled:opacity-30"
              >
                Anterior
              </button>
              <button type="button" onClick={() => go(null)} className="flex-1 rounded-full px-3 py-2.5 text-[13px]" style={{ background: look.ink, color: look.sheet }}>
                Recorrido
              </button>
              <button
                type="button"
                onClick={() => {
                  if (index >= doc.stops.length - 1) go(TRIP_SLIDE);
                  else go(doc.stops[index + 1]?.id ?? null);
                }}
                className="rounded-full px-3 py-2 text-[13px] ring-1 ring-black/10"
              >
                {index >= doc.stops.length - 1 ? 'Cuentas' : 'Siguiente'}
              </button>
            </>
          ) : (
            <div className="flex w-full gap-2">
              <button
                type="button"
                disabled={!doc.stops.length}
                onClick={() => go(doc.stops[0]?.id ?? null)}
                className="flex-1 rounded-full px-4 py-3 text-[14px] disabled:opacity-30"
                style={{ background: look.ink, color: look.sheet }}
              >
                Ver la primera parada
              </button>
              <button
                type="button"
                onClick={() => go(TRIP_SLIDE)}
                className="rounded-full px-4 py-3 text-[14px] ring-1 ring-black/15"
              >
                Cuentas
              </button>
            </div>
          )}
        </footer>
      </section>
      {sealOpen && stop?.seal && (
        <div className="absolute inset-0 z-[75] flex flex-col" style={{ background: look.sheet, color: look.ink }}>
          <button type="button" onClick={() => setSealOpen(false)} className="absolute left-4 top-[calc(var(--safe-top)+0.7rem)] z-[76] rounded-full px-3 py-1.5 text-[12px] ring-1 ring-current/20">
            Volver a la parada
          </button>
          <div className="min-h-0 flex-1 pt-10">
            <SealAsk seal={stop.seal} />
          </div>
        </div>
      )}
      {photo && (
        <button
          type="button"
          onClick={() => setPhoto(null)}
          className="absolute inset-0 z-[80] flex flex-col bg-[#0c0b0a]/94 px-3 pb-[calc(var(--safe-bottom)+1rem)] pt-[calc(var(--safe-top)+2.4rem)]"
        >
          <img src={photo} alt="" className="min-h-0 w-full flex-1 object-contain" />
          <span className="mt-3 text-center text-[12px] uppercase tracking-[0.16em] text-white/55">Toca para cerrar</span>
        </button>
      )}
    </div>
  );
}

function Overview({ doc, onOpen }: { doc: TripDocument; onOpen: (id: string) => void }) {
  return (
    <div>
      {doc.intro.when.trim() && (
        <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6232]">{doc.intro.when.trim()}</p>
      )}
      <h1 className="mt-1 font-display text-[2.15rem] italic leading-[0.95]">{tripHeadline(doc)}</h1>
      {doc.intro.line.trim() && <p className="mt-3 text-[15px] leading-relaxed text-[#1b1612]/70">{doc.intro.line.trim()}</p>}
      <p className="mt-4 text-[12px] uppercase tracking-[0.16em] text-[#1b1612]/40">
        {doc.stops.length === 1 ? '1 parada' : `${doc.stops.length} paradas`}
        {doc.intro.fromName.trim() ? ` · de ${doc.intro.fromName.trim()}` : ''}
      </p>
      {doc.stops.length === 0 ? (
        <p className="mt-6 text-[15px] text-[#1b1612]/45">Todavía no hay paradas.</p>
      ) : (
        <ul className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {doc.stops.map((stop, index) => (
            <li key={stop.id} className="w-[7.2rem] shrink-0">
              <button type="button" onClick={() => onOpen(stop.id)} className="w-full text-left">
                <Thumb stop={stop} index={index} />
                <span className="mt-2 block font-display text-[1.05rem] italic leading-tight">{stop.title.trim() || `Parada ${index + 1}`}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-[13px] leading-relaxed text-[#1b1612]/45">Toca un punto del mapa o una parada. El recorrido se queda arriba.</p>
    </div>
  );
}

function StopView({
  stop,
  index,
  total,
  currency,
  accent,
  onOpenPhoto,
  onOpenSeal,
}: {
  stop: TripStop;
  index: number;
  total: number;
  currency: TripDocument['budget']['currency'];
  accent: string;
  onOpenPhoto: (src: string) => void;
  onOpenSeal: () => void;
}) {
  const todos = stop.todo.map((item) => item.trim()).filter(Boolean);
  const amount = stop.cost.trim();
  const rows = [
    stop.stay.trim() && ['Tiempo aquí', stop.stay.trim()],
    stop.sleep.trim() && ['Dormimos en', stop.sleep.trim()],
    stop.eat.trim() && ['Comemos en', stop.eat.trim()],
    stop.arrive.trim() && ['Llegamos', stop.arrive.trim()],
    amount && ['Estimado', formatStopCost(amount, currency)],
    stop.note.trim() && ['Nota', stop.note.trim()],
  ].filter((row): row is [string, string] => Boolean(row));
  const onMap = Boolean(pinOf(stop));

  return (
    <article>
      <p className="text-[11px] uppercase tracking-[0.18em]" style={{ color: accent }}>
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </p>
      {stop.seal && <SealNote seal={stop.seal} accent={accent} onOpen={onOpenSeal} />}
      {stop.photo.trim() ? (
        <button
          type="button"
          onClick={() => {
            haptic('light');
            onOpenPhoto(stop.photo);
          }}
          className="mt-3 block w-full text-left"
        >
          <img src={stop.photo} alt="" className="aspect-[16/10] w-full rounded-[18px] object-cover" />
        </button>
      ) : (
        <span className="mt-3 grid h-9 w-9 place-items-center rounded-full bg-[#e4d3b8] font-display text-[0.95rem] italic text-[#1b1612]/50">
          {index + 1}
        </span>
      )}
      <h2 className="mt-4 font-display text-[2rem] italic leading-[0.98]">{stop.title.trim() || 'Sin nombre'}</h2>
      {stop.body.trim() && <p className="mt-3 whitespace-pre-line text-[15px] leading-relaxed text-[#1b1612]/75">{stop.body.trim()}</p>}
      {!onMap && <p className="mt-3 text-[13px] text-[#8a6232]">Esta parada todavía no está en el mapa.</p>}
      {(rows.length > 0 || todos.length > 0) && (
        <ul className="mt-5 divide-y divide-black/10 border-y border-black/10">
          {rows.map(([label, value]) => (
            <li key={label} className="py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a6232]">{label}</p>
              <p className="mt-1 whitespace-pre-line text-[15px] leading-relaxed">{value}</p>
            </li>
          ))}
          {todos.length > 0 && (
            <li className="py-3">
              <p className="text-[11px] uppercase tracking-[0.16em] text-[#8a6232]">Qué hacer</p>
              <ul className="mt-2 grid gap-1.5">
                {todos.map((item) => (
                  <li key={item} className="text-[15px] leading-snug">
                    {item}
                  </li>
                ))}
              </ul>
            </li>
          )}
        </ul>
      )}
    </article>
  );
}

function Accounts({
  doc,
  preview,
  money,
}: {
  doc: TripDocument;
  preview?: boolean;
  money: ReturnType<typeof tripMoney>;
}) {
  const live = notesAreLive(doc, preview);
  const [notes, setNotes] = useState<TripNote[]>([]);
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let stop = false;
    const load = () => {
      void listTripNotes(doc, live).then((rows) => {
        if (!stop) setNotes(rows);
      });
    };
    load();
    const beat = live ? window.setInterval(load, 7000) : 0;
    return () => {
      stop = true;
      if (beat) window.clearInterval(beat);
    };
  }, [doc, live]);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const rows = await addTripNote(doc, live, draft);
      haptic('success');
      setNotes(rows);
      setDraft('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo dejar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <article>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6232]">Cuentas</p>
      <h2 className="mt-2 font-display text-[2.35rem] italic leading-[0.95]">Lo que se ha gastado</h2>
      {money ? (
        <>
          <p className="mt-5 font-display text-[2.6rem] italic leading-none">{formatMoney(money.total, money.currency)}</p>
          <p className="mt-2 text-[14px] text-[#1b1612]/55">
            Total estimado
            {money.people ? ` · ${money.people} ${money.people === 1 ? 'persona' : 'personas'}` : ''}
          </p>
          {money.each != null && (
            <p className="mt-4 rounded-[18px] bg-[#1b1612] px-4 py-3 text-[#f6efe6]">
              <span className="block text-[11px] uppercase tracking-[0.16em] text-[#e8b86d]">Por persona</span>
              <span className="mt-1 block font-display text-[1.8rem] italic">{formatMoney(money.each, money.currency)}</span>
            </p>
          )}
          {(money.days.length > 0 || money.extra > 0) && (
            <ul className="mt-5 divide-y divide-black/10 border-y border-black/10">
              {money.days.map((day, index) => (
                <li key={day.id} className="flex items-baseline justify-between gap-3 py-3">
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.16em] text-[#8a6232]">Día {index + 1}</span>
                    <span className="mt-0.5 block text-[15px]">{day.title}</span>
                  </span>
                  <span className="shrink-0 text-[15px]">{formatMoney(day.amount, money.currency)}</span>
                </li>
              ))}
              {money.extra > 0 && (
                <li className="flex items-baseline justify-between gap-3 py-3">
                  <span>
                    <span className="block text-[11px] uppercase tracking-[0.16em] text-[#8a6232]">Extra</span>
                    <span className="mt-0.5 block text-[15px]">Fuera de las paradas</span>
                  </span>
                  <span className="shrink-0 text-[15px]">{formatMoney(money.extra, money.currency)}</span>
                </li>
              )}
            </ul>
          )}
          {money.note && <p className="mt-4 text-[14px] leading-relaxed text-[#1b1612]/60">{money.note}</p>}
        </>
      ) : (
        <p className="mt-3 text-[15px] leading-relaxed text-[#1b1612]/55">Todavía no hay un estimado. Las notas sí se pueden dejar.</p>
      )}

      <p className="mt-7 text-[11px] uppercase tracking-[0.16em] text-[#8a6232]">Notas de quien va</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#1b1612]/45">
        Quien abre el enlace puede escribir. Jorge paga el restaurante, 180 €.
      </p>
      <form onSubmit={(event) => void submit(event)} className="mt-3">
        <textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          maxLength={280}
          placeholder="Jorge paga todo en el restaurante, 180 €"
          className="w-full resize-none rounded-[16px] border border-black/10 bg-white px-3 py-2.5 text-[14.5px] outline-none placeholder:text-[#1b1612]/30 focus:border-[#8a6232]/50"
        />
        <button
          type="submit"
          disabled={busy || draft.trim().length < 2}
          className="mt-2 rounded-full bg-[#1b1612] px-4 py-2 text-[13px] text-[#f6efe6] disabled:opacity-30"
        >
          {busy ? 'Dejando…' : 'Dejar la nota'}
        </button>
        {error && <p className="mt-2 text-[13px] text-[#8a3d32]">{error}</p>}
      </form>
      {notes.length === 0 ? (
        <p className="mt-4 text-[14px] text-[#1b1612]/40">Todavía no hay ninguna.</p>
      ) : (
        <ul className="mt-4 divide-y divide-black/10 border-t border-black/10">
          {notes.map((note) => (
            <li key={note.id} className="py-3">
              <p className="text-[15px] leading-relaxed">{note.body}</p>
              {note.at && <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-[#1b1612]/35">{whenOf(note.at)}</p>}
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

function whenOf(iso: string) {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'Ahora';
  if (minutes < 60) return `Hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `Hace ${hours} h`;
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(then));
}

function SealNote({ seal, accent, onOpen }: { seal: StopSeal; accent: string; onOpen: () => void }) {
  const open = sealIsOpen(seal.opensAt);
  return (
    <div className="mt-3 rounded-[16px] px-3 py-3 ring-1 ring-black/10">
      <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: accent }}>
        {open ? 'El sobre ya se puede abrir' : `Se abre ${sealOpensLabel(seal.opensAt)}`}
      </p>
      <p className="mt-1 font-display text-[1.25rem] italic leading-tight">{seal.title || 'Una cita'}</p>
      <button type="button" disabled={!open} onClick={onOpen} className="mt-2 text-[13px] disabled:opacity-40" style={{ color: accent }}>
        {open ? 'Abrir el sobre' : 'Todavía cerrado'}
      </button>
    </div>
  );
}

function SealAsk({ seal }: { seal: StopSeal }) {
  const attached = useAttached(seal);
  const cita = attached.doc && isCita(attached.doc) ? attached.doc : null;
  if (!sealIsOpen(seal.opensAt)) {
    return <p className="grid h-full place-items-center px-8 text-center font-display text-3xl italic">Se abre {sealOpensLabel(seal.opensAt)}.</p>;
  }
  if (!cita) {
    return (
      <p className="grid h-full place-items-center px-8 text-center text-[15px] opacity-70">
        {attached.state === 'draft' ? 'El sobre se abre cuando esté publicado.' : attached.state === 'loading' ? 'Abriendo…' : 'No encuentro el sobre.'}
      </p>
    );
  }
  return (
    <Suspense fallback={<p className="grid h-full place-items-center text-[13px] opacity-60">Abriendo el sobre…</p>}>
      <DateAskPlayer doc={cita} nested />
    </Suspense>
  );
}

function formatStopCost(raw: string, currency: TripDocument['budget']['currency']) {
  const value = parseMoney(raw);
  return value == null ? raw : formatMoney(value, currency);
}

function Thumb({ stop, index }: { stop: TripStop; index: number }) {
  return (
    <span className="relative block aspect-[4/3] overflow-hidden rounded-[16px] bg-[#e4d3b8]">
      {stop.photo.trim() ? (
        <img src={stop.photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center font-display text-lg italic text-[#1b1612]/45">{index + 1}</span>
      )}
    </span>
  );
}
