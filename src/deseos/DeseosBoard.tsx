import { useEffect, useMemo, useState } from 'react';
import { PayModal } from '@/hub/PayModal';
import { haptic } from '@/lib/haptics';
import { euros } from '@/lib/plans';
import { maintenanceCents } from '@/lib/pricing';
import { addWish, enjoyWish, loadBoard, moveWish, spinWish, type Wish, type WishDraw } from '@/lib/wishes';
import {
  CADENCES,
  MOODS,
  SPANS,
  extendMaintenance,
  maintenanceOpen,
  moodLabel,
  spanLabel,
  type DeseosDocument,
  type MoodId,
  type SpanId,
} from '@/schema/deseos';

type SortId = 'mano' | 'recientes' | 'vivir';

export function DeseosBoard({
  doc,
  owner,
  onDoc,
}: {
  doc: DeseosDocument;
  owner: boolean;
  onDoc?: (next: DeseosDocument) => void;
}) {
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [draws, setDraws] = useState<WishDraw[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [span, setSpan] = useState<SpanId>('finde');
  const [moods, setMoods] = useState<MoodId[]>([]);
  const [filterSpan, setFilterSpan] = useState<SpanId | 'todas'>('todas');
  const [filterMood, setFilterMood] = useState<MoodId | 'cualquiera'>('cualquiera');
  const [sort, setSort] = useState<SortId>('mano');
  const [spinSpan, setSpinSpan] = useState<SpanId>('finde');
  const [spinMoods, setSpinMoods] = useState<MoodId[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [reel, setReel] = useState('');
  const [landed, setLanded] = useState<{ wish: Wish; fresh: boolean } | null>(null);
  const [error, setError] = useState('');
  const [renewing, setRenewing] = useState(false);
  const open = maintenanceOpen(doc);

  const refresh = () => {
    void loadBoard(doc.meta.id)
      .then((board) => {
        setWishes(board.wishes);
        setDraws(board.draws);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No pude leer la lista.'));
  };

  useEffect(() => {
    refresh();
    const tick = window.setInterval(() => {
      if (document.visibilityState === 'visible') refresh();
    }, 8000);
    return () => window.clearInterval(tick);
  }, [doc.meta.id]);

  const shown = useMemo(() => {
    const rows = wishes.filter((wish) => {
      if (filterSpan !== 'todas' && wish.span !== filterSpan) return false;
      if (filterMood !== 'cualquiera' && !wish.moods.includes(filterMood)) return false;
      return true;
    });
    const copy = [...rows];
    if (sort === 'recientes') copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === 'vivir') copy.sort((a, b) => Number(Boolean(a.enjoyedAt)) - Number(Boolean(b.enjoyedAt)) || b.rank - a.rank);
    else copy.sort((a, b) => b.rank - a.rank);
    return copy;
  }, [wishes, filterSpan, filterMood, sort]);

  const todo = useMemo(() => {
    const seen = new Set<string>();
    const rows: Wish[] = [];
    const ordered = [...draws].sort((a, b) => b.at.localeCompare(a.at));
    for (const draw of ordered) {
      if (seen.has(draw.wishId)) continue;
      seen.add(draw.wishId);
      const wish = wishes.find((item) => item.id === draw.wishId);
      if (wish && !wish.enjoyedAt) rows.push(wish);
    }
    return rows;
  }, [draws, wishes]);

  const toggleMood = (id: MoodId, list: MoodId[], set: (next: MoodId[]) => void) => {
    set(list.includes(id) ? list.filter((item) => item !== id) : [...list, id]);
  };

  const submit = () => {
    const name = title.trim();
    if (!name) return;
    setError('');
    void addWish(doc.meta.id, { title: name, note: note.trim(), span, moods })
      .then(() => {
        haptic('success');
        setTitle('');
        setNote('');
        refresh();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo añadir.'));
  };

  const spin = () => {
    if (spinning || !open) return;
    const pool = wishes.filter((wish) => !wish.enjoyedAt && wish.span === spinSpan && (spinMoods.length === 0 || wish.moods.some((mood) => spinMoods.includes(mood))));
    if (pool.length === 0) {
      setError('Con eso no hay ningún plan todavía. Añadid uno, o aflojad el filtro.');
      setLanded(null);
      return;
    }
    setSpinning(true);
    setError('');
    setLanded(null);
    const started = Date.now();
    const tick = window.setInterval(() => {
      const pick = pool[Math.floor(Math.random() * pool.length)];
      setReel(pick?.title ?? '');
    }, 90);
    void spinWish(doc.meta.id, spinSpan, spinMoods)
      .then(async (result) => {
        const wait = Math.max(0, 1400 - (Date.now() - started));
        await new Promise((resolve) => window.setTimeout(resolve, wait));
        window.clearInterval(tick);
        setReel(result.wish.title);
        setLanded(result);
        setSpinning(false);
        haptic('success');
        refresh();
      })
      .catch((err: unknown) => {
        window.clearInterval(tick);
        setSpinning(false);
        setReel('');
        setError(err instanceof Error ? err.message : 'La ruleta no giró.');
      });
  };

  const mark = (wish: Wish, enjoyed: boolean) => {
    void enjoyWish(doc.meta.id, wish.id, enjoyed)
      .then(() => {
        haptic('light');
        refresh();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo marcar.'));
  };

  const cadence = CADENCES.find((item) => item.days === doc.everyDays)?.label ?? 'Cada semana';

  return (
    <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.2em] text-brass">Lista de deseos</p>
          <h1 className="mt-2 font-display text-[clamp(2.4rem,5vw,4rem)] italic leading-[0.95]">{doc.listName || 'Nuestros planes'}</h1>
          <p className="mt-3 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
            {doc.partnerEmail
              ? `${doc.ownerName || 'Tú'} y ${doc.partnerEmail} escribís aquí. La ruleta, ${cadence.toLowerCase()}, saca el mismo plan en los dos móviles.`
              : 'Falta el correo de la otra persona. Sin eso, la lista es solo tuya.'}
          </p>
        </div>
        {owner && onDoc && (
          <label className="block min-w-[16rem] flex-1">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Puede escribir</span>
            <input
              value={doc.partnerEmail}
              onChange={(e) => onDoc({ ...doc, partnerEmail: e.target.value.trim().toLowerCase() })}
              placeholder="su@correo.com"
              className="mt-1 w-full border-b border-black/10 bg-transparent py-2 outline-none"
            />
          </label>
        )}
      </div>

      {owner && onDoc && (
        <div className="mt-6 flex flex-wrap gap-2">
          {CADENCES.map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => onDoc({ ...doc, everyDays: item.days })}
              className={`rounded-full px-4 py-2 text-[14px] ${doc.everyDays === item.days ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}

      <section className="mt-10 rounded-[32px] bg-[#1b1612] px-6 py-8 text-[#f3ead8] sm:px-8">
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#e8b86d]">La ruleta</p>
        <h2 className="mt-2 font-display text-4xl italic">¿Qué hacemos?</h2>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[#f3ead8]/65">
          Eliges duración y, si quieres, un aire. Si ya se giró con eso en este plazo, sale el mismo. No hay dos resultados.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          {SPANS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSpinSpan(item.id)}
              className={`rounded-full px-4 py-2 text-[14px] ${spinSpan === item.id ? 'bg-[#f3ead8] text-[#1b1612]' : 'ring-1 ring-white/15'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MOODS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => toggleMood(item.id, spinMoods, setSpinMoods)}
              className={`rounded-full px-3 py-1.5 text-[13px] ${spinMoods.includes(item.id) ? 'bg-[#e8b86d] text-[#1b1612]' : 'text-[#f3ead8]/75 ring-1 ring-white/15'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap items-center gap-5">
          <button type="button" disabled={!open || spinning} onClick={spin} className="rounded-full bg-[#e8b86d] px-6 py-3 text-[#1b1612] disabled:opacity-40">
            {spinning ? 'Girando…' : 'Girar'}
          </button>
          <p className="min-h-8 font-display text-3xl italic">{reel || (open ? 'Todavía no ha salido nada.' : 'El mantenimiento está parado.')}</p>
        </div>
        {landed && (
          <p className="mt-4 max-w-md text-[15px] leading-relaxed text-[#f3ead8]/70">
            {landed.fresh ? 'Ha quedado guardado. En el otro móvil sale este mismo.' : 'Ya había salido. Es el mismo para los dos.'} {landed.wish.note}
          </p>
        )}
        {!open && owner && onDoc && (
          <button type="button" onClick={() => setRenewing(true)} className="mt-5 rounded-full px-5 py-2.5 text-[14px] ring-1 ring-[#e8b86d]/50">
            Renovar mantenimiento · {euros(maintenanceCents())}
          </button>
        )}
      </section>

      {todo.length > 0 && (
        <section className="mt-10">
          <h2 className="font-display text-3xl italic">Por hacer</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {todo.map((wish) => (
              <li key={wish.id}>
                <WishCard wish={wish} onEnjoy={() => mark(wish, true)} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-12 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
          className="rounded-[28px] bg-white p-6 ring-1 ring-black/5"
        >
          <p className="text-[12px] uppercase tracking-[0.18em] text-brass">Añadir</p>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="El finde en la costa"
            className="mt-3 w-full bg-transparent font-display text-3xl italic outline-none placeholder:text-inkwell/25"
          />
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Una línea, si hace falta"
            className="mt-2 w-full bg-transparent py-2 text-[16px] outline-none placeholder:text-inkwell/30"
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {SPANS.map((item) => (
              <button key={item.id} type="button" onClick={() => setSpan(item.id)} className={`rounded-full px-3 py-1.5 text-[13px] ${span === item.id ? 'bg-inkwell text-linen' : 'ring-1 ring-black/10'}`}>
                {item.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {MOODS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleMood(item.id, moods, setMoods)}
                className={`rounded-full px-3 py-1.5 text-[13px] ${moods.includes(item.id) ? 'bg-brass text-inkwell' : 'text-inkwell/60 ring-1 ring-black/10'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="submit" disabled={!title.trim()} className="mt-6 rounded-full bg-inkwell px-5 py-2.5 text-linen disabled:opacity-30">
            Dejarlo en la lista
          </button>
        </form>

        <div>
          <div className="flex flex-wrap gap-2">
            <FilterChip on={filterSpan === 'todas'} onClick={() => setFilterSpan('todas')}>Todas</FilterChip>
            {SPANS.map((item) => (
              <FilterChip key={item.id} on={filterSpan === item.id} onClick={() => setFilterSpan(item.id)}>
                {item.label}
              </FilterChip>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <FilterChip on={filterMood === 'cualquiera'} onClick={() => setFilterMood('cualquiera')}>Cualquier aire</FilterChip>
            {MOODS.map((item) => (
              <FilterChip key={item.id} on={filterMood === item.id} onClick={() => setFilterMood(item.id)}>
                {item.label}
              </FilterChip>
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[13px] text-inkwell/50">
            {(
              [
                ['mano', 'Como las dejasteis'],
                ['recientes', 'Recientes'],
                ['vivir', 'Por vivir'],
              ] as const
            ).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSort(id)} className={sort === id ? 'text-inkwell' : ''}>
                {label}
              </button>
            ))}
          </div>
          <ul className="mt-4 space-y-3">
            {shown.map((wish) => (
              <li key={wish.id}>
                <WishCard
                  wish={wish}
                  onEnjoy={() => mark(wish, !wish.enjoyedAt)}
                  move={
                    sort === 'mano'
                      ? {
                          up: () => void moveWish(doc.meta.id, wish.id, 1).then(refresh),
                          down: () => void moveWish(doc.meta.id, wish.id, -1).then(refresh),
                        }
                      : undefined
                  }
                />
              </li>
            ))}
            {shown.length === 0 && <li className="text-[15px] text-inkwell/45">Todavía no hay nada con ese filtro.</li>}
          </ul>
        </div>
      </section>

      {error && <p className="mt-6 text-[15px] text-[#8a3d32]">{error}</p>}

      {renewing && onDoc && (
        <PayModal
          title="Mantenimiento"
          cents={maintenanceCents()}
          projectId={doc.meta.id}
          family="deseos"
          onClose={() => setRenewing(false)}
          onPaid={() => {
            setRenewing(false);
            onDoc(extendMaintenance(doc));
          }}
        />
      )}
    </div>
  );
}

function FilterChip({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" onClick={onClick} className={`rounded-full px-3 py-1.5 text-[13px] ${on ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}>
      {children}
    </button>
  );
}

function WishCard({ wish, onEnjoy, move }: { wish: Wish; onEnjoy: () => void; move?: { up: () => void; down: () => void } }) {
  return (
    <article className={`rounded-[24px] bg-white px-5 py-4 ring-1 ring-black/5 ${wish.enjoyedAt ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[1.7rem] italic leading-tight">{wish.title}</h3>
          {wish.note && <p className="mt-1 text-[15px] leading-relaxed text-inkwell/60">{wish.note}</p>}
        </div>
        {move && (
          <div className="flex flex-col text-[12px] text-inkwell/40">
            <button type="button" onClick={move.up} aria-label="Subir">↑</button>
            <button type="button" onClick={move.down} aria-label="Bajar">↓</button>
          </div>
        )}
      </div>
      <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-brass">
        {spanLabel(wish.span)}
        {wish.moods.length > 0 ? ` · ${wish.moods.map(moodLabel).join(' · ')}` : ''}
        {wish.author ? ` · ${wish.mine ? 'Tú' : wish.author}` : ''}
      </p>
      <button type="button" onClick={onEnjoy} className="mt-3 text-[13px] text-inkwell/55">
        {wish.enjoyedAt ? 'Ya lo vivisteis · deshacer' : 'Ya lo vivimos'}
      </button>
    </article>
  );
}
