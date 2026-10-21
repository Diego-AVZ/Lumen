import { useMemo, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { tripHeadline, type TripDocument, type TripStop } from '@/schema/viaje';
import { TripMap, pinOf } from '@/viaje/TripMap';

export function TripPlayer({
  doc,
  framed = false,
  stopId,
  onStop,
}: {
  doc: TripDocument;
  framed?: boolean;
  preview?: boolean;
  stopId?: string | null;
  onStop?: (id: string | null) => void;
}) {
  const [own, setOwn] = useState<string | null>(null);
  const openId = onStop ? (stopId ?? null) : own;
  const go = (id: string | null) => {
    haptic(id ? 'light' : 'medium');
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
  const index = doc.stops.findIndex((stop) => stop.id === openId);
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
      <div className="absolute inset-x-0 top-0 h-[46%]">
        <TripMap points={pins} activeIndex={activePin != null && activePin >= 0 ? activePin : null} onPick={go} />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/45 to-transparent" />
        <p className="pointer-events-none absolute left-4 top-[calc(var(--safe-top)+0.7rem)] text-[11px] uppercase tracking-[0.2em] text-white/80">
          {stop ? `Parada ${index + 1} de ${doc.stops.length}` : 'Todo el recorrido'}
        </p>
        <p className="pointer-events-none absolute right-3 top-[calc(var(--safe-top)+0.75rem)] text-[9px] tracking-wide text-white/45">Esri</p>
      </div>

      <section className="absolute inset-x-0 bottom-0 top-[42%] flex flex-col rounded-t-[28px] bg-[#f6efe6] text-[#1b1612] shadow-[0_-18px_40px_rgba(0,0,0,0.28)]">
        <div className="mx-auto mt-2.5 h-1 w-10 shrink-0 rounded-full bg-black/15" />
        <div className="scroll-y min-h-0 flex-1 px-5 pb-4 pt-4">
          {stop ? (
            <StopView stop={stop} index={index} total={doc.stops.length} />
          ) : (
            <Overview doc={doc} onOpen={go} />
          )}
        </div>
        <footer className="flex shrink-0 items-center gap-2 border-t border-black/10 px-4 py-3 pb-[calc(var(--safe-bottom)+0.75rem)]">
          {stop ? (
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
                disabled={index >= doc.stops.length - 1}
                onClick={() => go(doc.stops[index + 1]?.id ?? null)}
                className="rounded-full px-3 py-2 text-[13px] ring-1 ring-black/10 disabled:opacity-30"
              >
                Siguiente
              </button>
            </>
          ) : (
            <button
              type="button"
              disabled={!doc.stops.length}
              onClick={() => go(doc.stops[0]?.id ?? null)}
              className="w-full rounded-full bg-[#1b1612] px-4 py-3 text-[14px] text-[#f6efe6] disabled:opacity-30"
            >
              Ver la primera parada
            </button>
          )}
        </footer>
      </section>
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

function StopView({ stop, index, total }: { stop: TripStop; index: number; total: number }) {
  const todos = stop.todo.map((item) => item.trim()).filter(Boolean);
  const rows = [
    stop.stay.trim() && ['Tiempo aquí', stop.stay.trim()],
    stop.sleep.trim() && ['Dormimos en', stop.sleep.trim()],
    stop.eat.trim() && ['Comemos en', stop.eat.trim()],
    stop.arrive.trim() && ['Llegamos', stop.arrive.trim()],
    stop.note.trim() && ['Nota', stop.note.trim()],
  ].filter((row): row is [string, string] => Boolean(row));
  const onMap = Boolean(pinOf(stop));

  return (
    <article>
      <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a6232]">
        {String(index + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
      </p>
      {stop.photo.trim() ? (
        <img src={stop.photo} alt="" className="mt-3 aspect-[16/10] w-full rounded-[18px] object-cover" />
      ) : (
        <div className="mt-3">
          <Thumb stop={stop} index={index} wide />
        </div>
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

function Thumb({ stop, index, wide = false }: { stop: TripStop; index: number; wide?: boolean }) {
  return (
    <span className={`relative block overflow-hidden rounded-[16px] bg-[#e4d3b8] ${wide ? 'aspect-[16/10] w-full' : 'aspect-[4/3]'}`}>
      {stop.photo.trim() ? (
        <img src={stop.photo} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="grid h-full place-items-center font-display text-3xl italic text-[#1b1612]/70">{index + 1}</span>
      )}
    </span>
  );
}
