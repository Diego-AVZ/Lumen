import { useMemo, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { TRIP_SLIDE, tripHeadline, type TripDocument, type TripStop } from '@/schema/viaje';
import { formatMoney, parseMoney, tripMoney } from '@/viaje/money';
import { TripMap, pinOf } from '@/viaje/TripMap';

export function TripPlayer({
  doc,
  framed = false,
  stopId,
  onStop,
  onDrop,
}: {
  doc: TripDocument;
  framed?: boolean;
  preview?: boolean;
  stopId?: string | null;
  onStop?: (id: string | null) => void;
  onDrop?: (lat: number, lng: number) => void;
}) {
  const [own, setOwn] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const openId = onStop ? (stopId ?? null) : own;
  const money = tripMoney(doc);
  const go = (id: string | null) => {
    setPhoto(null);
    haptic(id && id !== TRIP_SLIDE ? 'light' : 'medium');
    if (onStop) onStop(id);
    else setOwn(id);
  };

  const pins = useMemo(
    () =>
      doc.stops.flatMap((stop) => {
        const at = pinOf(stop);
        return at ? [{ id: stop.id, at }] : [];
      }),
    [doc.stops],
  );
  const slide = openId === TRIP_SLIDE;
  const index = slide ? -1 : doc.stops.findIndex((stop) => stop.id === openId);
  const stop = index >= 0 ? doc.stops[index] : null;
  const activePin = stop ? pins.findIndex((pin) => pin.id === stop.id) : null;

  return (
    <div
      className="relative h-full w-full overflow-hidden bg-[#122018] text-[#f6efe6]"
      style={{
        ['--frame-safe-top' as string]: framed ? '36px' : undefined,
        ['--frame-safe-bottom' as string]: framed ? '14px' : undefined,
      }}
    >
      <div className={`absolute inset-x-0 top-0 ${slide ? 'h-[14%]' : 'h-[46%]'}`}>
        <TripMap
          points={pins}
          activeIndex={activePin != null && activePin >= 0 ? activePin : null}
          onPick={go}
          onDrop={onDrop}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
        <p className="pointer-events-none absolute left-4 top-[calc(var(--safe-top)+0.7rem)] text-[11px] uppercase tracking-[0.2em] text-white/80">
          {slide ? 'El presupuesto' : stop ? `Parada ${index + 1} de ${doc.stops.length}` : 'Todo el recorrido'}
        </p>
        {onDrop && !slide && (
          <p className="pointer-events-none absolute bottom-3 left-4 right-4 text-[11px] text-white/80">
            Toca el mapa para dejar la parada.
          </p>
        )}
      </div>

      <section
        className={`absolute inset-x-0 bottom-0 flex flex-col bg-[#f6efe6] text-[#1b1612] shadow-[0_-18px_40px_rgba(0,0,0,0.28)] ${
          slide ? 'top-[10%] rounded-t-[22px]' : 'top-[42%] rounded-t-[28px]'
        }`}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-black/15" />
        <div className="scroll-y min-h-0 flex-1 px-5 pb-4 pt-4">
          {slide && money ? (
            <MoneySlide money={money} />
          ) : stop ? (
            <StopView
              stop={stop}
              index={index}
              total={doc.stops.length}
              currency={doc.budget.currency}
              onOpenPhoto={setPhoto}
            />
          ) : (
            <Overview doc={doc} onOpen={go} />
          )}
        </div>
        <footer className="flex shrink-0 items-center gap-2 border-t border-black/10 px-4 py-3 pb-[calc(var(--safe-bottom)+0.75rem)]">
          {slide ? (
            <>
              <button
                type="button"
                onClick={() => go(doc.stops[doc.stops.length - 1]?.id ?? null)}
                className="rounded-full px-3 py-2 text-[13px] ring-1 ring-black/10"
              >
                Anterior
              </button>
              <button type="button" onClick={() => go(null)} className="flex-1 rounded-full bg-[#1b1612] px-3 py-2 text-[13px] text-[#f6efe6]">
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
              <button type="button" onClick={() => go(null)} className="flex-1 rounded-full bg-[#1b1612] px-3 py-2 text-[13px] text-[#f6efe6]">
                Recorrido
              </button>
              <button
                type="button"
                disabled={index >= doc.stops.length - 1 && !money}
                onClick={() => {
                  if (index >= doc.stops.length - 1) go(TRIP_SLIDE);
                  else go(doc.stops[index + 1]?.id ?? null);
                }}
                className="rounded-full px-3 py-2 text-[13px] ring-1 ring-black/10 disabled:opacity-30"
              >
                {index >= doc.stops.length - 1 ? 'Diapositiva' : 'Siguiente'}
              </button>
            </>
          ) : (
            <div className="flex w-full gap-2">
              <button
                type="button"
                disabled={!doc.stops.length}
                onClick={() => go(doc.stops[0]?.id ?? null)}
                className="flex-1 rounded-full bg-[#1b1612] px-4 py-3 text-[14px] text-[#f6efe6] disabled:opacity-30"
              >
                Ver la primera parada
              </button>
              {money && (
                <button
                  type="button"
                  onClick={() => go(TRIP_SLIDE)}
                  className="rounded-full px-4 py-3 text-[14px] ring-1 ring-black/15"
                >
                  Diapositiva
                </button>
              )}
            </div>
          )}
        </footer>
      </section>
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
  onOpenPhoto,
}: {
  stop: TripStop;
  index: number;
  total: number;
  currency: TripDocument['budget']['currency'];
  onOpenPhoto: (src: string) => void;
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
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a6232]">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </p>
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

function MoneySlide({ money }: { money: NonNullable<ReturnType<typeof tripMoney>> }) {
  return (
    <article>
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6232]">Diapositiva</p>
      <h2 className="mt-2 font-display text-[2.35rem] italic leading-[0.95]">El presupuesto</h2>
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
    </article>
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
