import { useEffect, useMemo, useRef, useState } from 'react';
import { PayModal } from '@/hub/PayModal';
import { haptic } from '@/lib/haptics';
import { euros } from '@/lib/plans';
import { maintenanceCents } from '@/lib/pricing';
import { addWish, editWish, enjoyWish, loadBoard, moveWish, spinWish, type WheelSlice, type Wish, type WishDraw } from '@/lib/wishes';
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
type See = 'todas' | 'visibles' | 'ocultos';

const MOCK_WHEEL: WheelSlice[] = [
  { label: 'El finde en la costa', win: false },
  { label: 'Cenar sin reloj', win: false },
  { label: 'Un día sin plan', win: false },
  { label: 'El tren de las ocho', win: false },
  { label: 'Quedarnos en casa', win: false },
  { label: 'Perdernos por ahí', win: false },
];

export function DeseosBoard({
  doc,
  owner,
  onDoc,
}: {
  doc: DeseosDocument;
  owner: boolean;
  onDoc?: (next: DeseosDocument) => void;
}) {
  const [ready, setReady] = useState(false);
  const [wishes, setWishes] = useState<Wish[]>([]);
  const [draws, setDraws] = useState<WishDraw[]>([]);
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [span, setSpan] = useState<SpanId>('finde');
  const [moods, setMoods] = useState<MoodId[]>([]);
  const [hidden, setHidden] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [filterSpan, setFilterSpan] = useState<SpanId | 'todas'>('todas');
  const [see, setSee] = useState<See>('todas');
  const [filterMood, setFilterMood] = useState<MoodId | 'cualquiera'>('cualquiera');
  const [sort, setSort] = useState<SortId>('mano');
  const [spinSpan, setSpinSpan] = useState<SpanId>('finde');
  const [spinMoods, setSpinMoods] = useState<MoodId[]>([]);
  const [spinHidden, setSpinHidden] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const [wheel, setWheel] = useState<WheelSlice[]>(MOCK_WHEEL);
  const [turn, setTurn] = useState(0);
  const [landed, setLanded] = useState<{ title: string; note: string; fresh: boolean; mock: boolean } | null>(null);
  const [error, setError] = useState('');
  const [renewing, setRenewing] = useState(false);
  const live = ready && doc.meta.status === 'published';
  const maintained = maintenanceOpen(doc);
  const pending = useRef<{ title: string; note: string; fresh: boolean; mock: boolean } | null>(null);

  const refresh = () => {
    void loadBoard(doc.meta.id)
      .then((board) => {
        setReady(board.ready);
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
  }, [doc.meta.id, doc.meta.status]);

  const discovered = useMemo(() => new Set(draws.map((draw) => draw.wishId)), [draws]);

  const shown = useMemo(() => {
    const rows = wishes.filter((wish) => {
      if (wish.hidden && !wish.mine && !discovered.has(wish.id)) return false;
      if (filterSpan !== 'todas' && wish.span !== filterSpan) return false;
      if (filterMood !== 'cualquiera' && !wish.moods.includes(filterMood)) return false;
      if (see === 'visibles' && wish.hidden) return false;
      if (see === 'ocultos' && !(wish.hidden && (wish.mine || discovered.has(wish.id)))) return false;
      return true;
    });
    const copy = [...rows];
    if (sort === 'recientes') copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    else if (sort === 'vivir') copy.sort((a, b) => Number(Boolean(a.enjoyedAt)) - Number(Boolean(b.enjoyedAt)) || b.rank - a.rank);
    else copy.sort((a, b) => b.rank - a.rank);
    return copy;
  }, [wishes, draws, discovered, filterSpan, filterMood, see, sort]);

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

  const clearForm = () => {
    setTitle('');
    setNote('');
    setHidden(false);
    setEditing(null);
  };

  const beginEdit = (wish: Wish) => {
    setEditing(wish.id);
    setTitle(wish.title);
    setNote(wish.note);
    setSpan(wish.span);
    setMoods(wish.moods);
    setHidden(wish.hidden);
    document.getElementById('plan-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  useEffect(() => {
    if (spinning) return;
    if (!live) {
      if (turn === 0) setWheel(MOCK_WHEEL);
      return;
    }
    if (turn > 0 && landed && !landed.mock) return;
    const slices = wishes
      .filter((wish) => {
        if (wish.enjoyedAt || wish.span !== spinSpan) return false;
        if (spinMoods.length > 0 && !wish.moods.some((mood) => spinMoods.includes(mood))) return false;
        if (wish.hidden && !wish.mine && !discovered.has(wish.id)) return false;
        return spinHidden ? wish.hidden : !wish.hidden;
      })
      .map((wish) => ({ label: wish.title, win: false }));
    if (turn > 0) setTurn(0);
    setWheel(slices.length ? slices : [{ label: 'Sin planes aún', win: false }]);
  }, [live, spinning, turn, landed, wishes, discovered, spinSpan, spinMoods, spinHidden]);

  const submit = () => {
    const name = title.trim();
    if (!name) return;
    setError('');
    const input = { title: name, note: note.trim(), span, moods, hidden };
    const task = editing ? editWish(doc.meta.id, editing, input) : addWish(doc.meta.id, input);
    void task
      .then(() => {
        haptic('success');
        clearForm();
        refresh();
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'No se pudo guardar.'));
  };

  const spinToward = (slices: WheelSlice[], index: number) => {
    const n = Math.max(slices.length, 1);
    const center = ((index + 0.5) % n) * (360 / n);
    const next = Math.ceil((turn + 1) / 360) * 360 + 360 * 5 + (360 - center);
    setWheel(slices);
    setTurn(next);
  };

  const spin = () => {
    if (spinning) return;
    setError('');
    setLanded(null);
    if (live && !maintained) {
      setError('El mantenimiento está parado.');
      return;
    }
    if (!live) {
      const slices = MOCK_WHEEL.map((slice) => ({ ...slice, win: false }));
      const index = Math.floor(Math.random() * slices.length);
      slices[index] = { ...slices[index], win: true };
      pending.current = null;
      setSpinning(true);
      spinToward(slices, index);
      return;
    }
    setSpinning(true);
    void spinWish(doc.meta.id, spinSpan, spinMoods, spinHidden)
      .then((result) => {
        const index = Math.max(0, result.wheel.findIndex((slice) => slice.win));
        pending.current = {
          title: result.wish.title,
          note: result.fresh ? `Ha quedado guardado. En el otro móvil sale este mismo. ${result.wish.note}` : `Ya había salido. Es el mismo para los dos. ${result.wish.note}`,
          fresh: result.fresh,
          mock: false,
        };
        spinToward(result.wheel, index);
      })
      .catch((err: unknown) => {
        setSpinning(false);
        setError(err instanceof Error ? err.message : 'La ruleta no giró.');
      });
  };

  const finishSpin = () => {
    if (!spinning) return;
    const winner = wheel.find((slice) => slice.win);
    setSpinning(false);
    haptic('success');
    if (pending.current) {
      setLanded(pending.current);
      pending.current = null;
      refresh();
      return;
    }
    setLanded({
      title: winner?.label || 'Un plan',
      note: 'Es un ensayo. No se guarda. Cuando la publiques y esté pagada, el giro vale para los dos.',
      fresh: false,
      mock: true,
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
          {live
            ? 'Elige duración, si es visible u oculto, y un aire. Si ya se giró con eso en este plazo, sale el mismo.'
            : 'Todavía es un ensayo, con planes de mentira. Gira de verdad cuando la publiques y esté pagada.'}
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
        {live && (
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" onClick={() => setSpinHidden(false)} className={`rounded-full px-4 py-2 text-[14px] ${spinHidden ? 'ring-1 ring-white/15' : 'bg-[#f3ead8] text-[#1b1612]'}`}>
              Visibles
            </button>
            <button type="button" onClick={() => setSpinHidden(true)} className={`rounded-full px-4 py-2 text-[14px] ${spinHidden ? 'bg-[#e8b86d] text-[#1b1612]' : 'ring-1 ring-white/15'}`}>
              Ocultos
            </button>
          </div>
        )}
        <div className="mt-8 flex flex-col items-center">
          <Roulette slices={wheel} turn={turn} onDone={finishSpin} />
          <button type="button" disabled={spinning || (live && !maintained)} onClick={spin} className="mt-6 rounded-full bg-[#e8b86d] px-6 py-3 text-[#1b1612] disabled:opacity-40">
            {spinning ? 'Girando…' : live ? 'Girar' : 'Probar'}
          </button>
        </div>
        {landed && (
          <div className="mx-auto mt-5 max-w-md text-center">
            <p className="font-display text-3xl italic">{landed.title}</p>
            <p className="mt-2 text-[15px] leading-relaxed text-[#f3ead8]/70">{landed.note}</p>
          </div>
        )}
        {live && !maintained && owner && onDoc && (
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
          id="plan-form"
          className="rounded-[28px] bg-white p-6 ring-1 ring-black/5"
        >
          <p className="text-[12px] uppercase tracking-[0.18em] text-brass">{editing ? 'Cambiar' : 'Añadir'}</p>
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
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" onClick={() => setHidden(false)} className={`rounded-full px-3 py-1.5 text-[13px] ${hidden ? 'ring-1 ring-black/10' : 'bg-inkwell text-linen'}`}>
              Visible
            </button>
            <button type="button" onClick={() => setHidden(true)} className={`rounded-full px-3 py-1.5 text-[13px] ${hidden ? 'bg-inkwell text-linen' : 'ring-1 ring-black/10'}`}>
              Oculto
            </button>
          </div>
          <p className="mt-2 text-[13px] leading-relaxed text-inkwell/45">
            {hidden ? 'Lo ves tú. La otra persona solo si la ruleta lo descubre.' : 'Lo veis los dos desde que lo dejas.'}
          </p>
          <div className="mt-6 flex flex-wrap gap-4">
            <button type="submit" disabled={!title.trim()} className="rounded-full bg-inkwell px-5 py-2.5 text-linen disabled:opacity-30">
              {editing ? 'Guardar' : 'Dejarlo en la lista'}
            </button>
            {editing && (
              <button type="button" onClick={clearForm} className="text-[14px] text-inkwell/50">
                Cancelar
              </button>
            )}
          </div>
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
            <FilterChip on={see === 'todas'} onClick={() => setSee('todas')}>Todas</FilterChip>
            <FilterChip on={see === 'visibles'} onClick={() => setSee('visibles')}>Visibles</FilterChip>
            <FilterChip on={see === 'ocultos'} onClick={() => setSee('ocultos')}>Ocultos</FilterChip>
          </div>
          {see === 'ocultos' && (
            <p className="mt-3 max-w-md text-[13px] leading-relaxed text-inkwell/45">
              Aquí ves los que escribiste tú. Los de la otra persona aparecen cuando la ruleta los descubre.
            </p>
          )}
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
                  onEdit={wish.mine ? () => beginEdit(wish) : undefined}
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

function slicePath(cx: number, cy: number, r: number, start: number, end: number) {
  const sweep = Math.min(end - start, 359.99);
  const a = (deg: number) => {
    const rad = ((deg - 90) * Math.PI) / 180;
    return [cx + r * Math.cos(rad), cy + r * Math.sin(rad)];
  };
  const [x1, y1] = a(start);
  const [x2, y2] = a(start + sweep);
  const large = sweep > 180 ? 1 : 0;
  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
}

function Roulette({ slices, turn, onDone }: { slices: WheelSlice[]; turn: number; onDone: () => void }) {
  const n = Math.max(slices.length, 1);
  const step = 360 / n;
  return (
    <div className="relative h-[280px] w-[280px]">
      <span className="absolute left-1/2 top-0 z-10 -translate-x-1/2 text-[#e8b86d]">▼</span>
      <div
        className="absolute inset-3"
        onTransitionEnd={(event) => {
          if (event.propertyName === 'transform' && turn > 0) onDone();
        }}
        style={{ transform: `rotate(${turn}deg)`, transition: turn === 0 ? 'none' : 'transform 4.6s cubic-bezier(0.12, 0.72, 0.08, 1)' }}
      >
        <svg viewBox="0 0 320 320" className="h-full w-full drop-shadow-[0_18px_30px_rgba(0,0,0,0.35)]">
          {Array.from({ length: n }, (_, index) => {
            const slice = slices[index];
            const mid = index * step + step / 2;
            const label = slice?.label?.trim() || 'oculta';
            const short = label.length > 16 ? `${label.slice(0, 15)}…` : label;
            return (
              <g key={`${label}-${index}`}>
                <path d={slicePath(160, 160, 148, index * step, (index + 1) * step)} fill={index % 2 === 0 ? '#f3ead8' : '#e8b86d'} />
                <text
                  x="160"
                  y="160"
                  fill="#1b1612"
                  fontSize="12"
                  fontFamily="Fraunces, Georgia, serif"
                  textAnchor="middle"
                  transform={`rotate(${mid} 160 160) translate(0 -96)`}
                >
                  {short}
                </text>
              </g>
            );
          })}
          <circle cx="160" cy="160" r="18" fill="#1b1612" />
        </svg>
      </div>
    </div>
  );
}

function WishCard({ wish, onEnjoy, onEdit, move }: { wish: Wish; onEnjoy: () => void; onEdit?: () => void; move?: { up: () => void; down: () => void } }) {
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
        {wish.hidden ? ' · Oculto' : ''}
        {wish.moods.length > 0 ? ` · ${wish.moods.map(moodLabel).join(' · ')}` : ''}
        {wish.author ? ` · ${wish.mine ? 'Tú' : wish.author}` : ''}
      </p>
      <div className="mt-3 flex gap-4 text-[13px] text-inkwell/55">
        {onEdit && (
          <button type="button" onClick={onEdit}>
            Cambiar
          </button>
        )}
        <button type="button" onClick={onEnjoy}>
          {wish.enjoyedAt ? 'Ya lo vivisteis · deshacer' : 'Ya lo vivimos'}
        </button>
      </div>
    </article>
  );
}
