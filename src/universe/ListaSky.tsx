import { useEffect, useMemo, useRef, useState } from 'react';
import type { ListItem, ListaStar } from '@/schema/universe';
import { haptic } from '@/lib/haptics';
import type { VisitState } from '@/universe/visit';

const RING = { rx: 34, ry: 30 };
const TILTS = [-1.6, 1.3, -0.8, 1.8, 0.5, -1.4];

function dayStamp(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function todayStamp() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatDay(iso: string) {
  const stamp = dayStamp(iso);
  if (stamp == null) return iso;
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' }).format(new Date(stamp));
}

type Role = 'orbit' | 'wish' | 'landed';

function rolesOf(items: ListItem[]) {
  const today = todayStamp();
  const roles = new Map<string, Role>();
  const ready: { id: string; when: number }[] = [];
  for (const item of items) {
    if (item.state === 'vivido') {
      roles.set(item.id, 'landed');
      continue;
    }
    if (item.state === 'pronto') {
      roles.set(item.id, 'orbit');
      continue;
    }
    const when = dayStamp(item.fallsOn);
    if (when != null && when > today) {
      roles.set(item.id, 'orbit');
      continue;
    }
    ready.push({ id: item.id, when: when ?? 0 });
  }
  ready.sort((a, b) => a.when - b.when);
  const wish = ready[ready.length - 1];
  for (const item of ready) roles.set(item.id, wish && item.id === wish.id ? 'wish' : 'landed');
  return roles;
}

function ringAt(index: number, total: number) {
  const turn = (index / Math.max(1, total)) * Math.PI * 2 - Math.PI / 2;
  return { x: 50 + RING.rx * Math.cos(turn), y: 50 + RING.ry * Math.sin(turn) };
}

function fallenKey(starId: string) {
  return `lumen.fall.v1.${starId}`;
}

function readFallen(starId: string) {
  try {
    const raw = localStorage.getItem(fallenKey(starId));
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

function rememberFallen(starId: string, itemId: string) {
  const next = [...new Set([...readFallen(starId), itemId])];
  try {
    localStorage.setItem(fallenKey(starId), JSON.stringify(next));
  } catch {
    /* modo privado */
  }
}

export function ListaLayer({
  star,
  visit,
  onChoose,
  onBack,
}: {
  star: ListaStar;
  visit: VisitState;
  onChoose: (itemId: string, index: number) => void;
  onBack: () => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const item = star.items.find((entry) => entry.id === openId) ?? null;

  return (
    <div data-layer className="animate-depth absolute inset-0 z-20 flex min-h-0 flex-col bg-ink/92 backdrop-blur-md">
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[calc(var(--safe-top)+0.85rem)]">
        <button type="button" onClick={() => (item ? setOpenId(null) : onBack())} className="back-chip">
          ← {item ? 'lista' : 'universo'}
        </button>
        <p className="text-[11px] uppercase tracking-[0.22em] text-paper/45">{item ? item.title || 'Deseo' : star.label || 'Lista'}</p>
      </header>
      <div className="relative min-h-0 flex-1">
        {item ? (
          <Detail item={item} picked={visit.choices[item.id]} onChoose={(index) => onChoose(item.id, index)} />
        ) : (
          <Field star={star} onOpen={setOpenId} />
        )}
      </div>
    </div>
  );
}

function Field({ star, onOpen }: { star: ListaStar; onOpen: (id: string) => void }) {
  const roles = useMemo(() => rolesOf(star.items), [star.items]);
  const wish = star.items.find((item) => roles.get(item.id) === 'wish') ?? null;
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const already = wish ? readFallen(star.id).includes(wish.id) : true;
  const play = Boolean(wish && !reduced && !already);
  const [landed, setLanded] = useState(!play);
  const orbiting = star.items.filter((item) => roles.get(item.id) === 'orbit');
  const landedItems = star.items.filter((item) => roles.get(item.id) === 'landed');
  const nextOrbit = [...orbiting].sort((a, b) => (a.fallsOn || '9999').localeCompare(b.fallsOn || '9999'))[0];

  useEffect(() => {
    setLanded(!play);
  }, [play, wish?.id]);

  return (
    <div className="scroll-y h-full px-5 pb-[calc(var(--safe-bottom)+2rem)]">
      <p className="text-[12px] uppercase tracking-[0.28em] text-gold/80">Estrellas fugaces</p>
      <h2 className="mt-2 font-display text-[2.05rem] italic leading-[1.05] text-paper">
        {star.label || 'La lista'}
      </h2>
      {star.intro && <p className="mt-3 max-w-[34ch] text-[16px] leading-relaxed text-paper/70">{star.intro}</p>}

      {star.items.length === 0 ? (
        <p className="mt-10 text-[16px] text-paper/40">Todavía no hay fechas en el cielo.</p>
      ) : (
        <div className="mx-auto mt-2 w-full max-w-[22rem] px-4 pt-6">
          <div className="relative aspect-square w-full">
            <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
              <ellipse cx="50" cy="50" rx={RING.rx} ry={RING.ry} fill="none" stroke="rgba(232,184,109,0.28)" strokeWidth="0.35" />
            </svg>
            <div className="vale-orbit" aria-hidden>
              {orbiting.map((item, index) => {
                const ring = index % 3;
                const rx = [46, 40, 34][ring];
                const ry = [40, 35, 30][ring];
                const dur = [46, 58, 72][ring];
                return (
                  <span
                    key={item.id}
                    className="vale-orbit-star"
                    style={{
                      offsetPath: `ellipse(${rx}% ${ry}% at 50% 50%)`,
                      animationDuration: `${dur}s`,
                      animationDelay: `${-(index * 5.1)}s`,
                    }}
                  >
                    <i className="vale-orbit-tail" />
                    <i className="vale-orbit-dot" />
                  </span>
                );
              })}
            </div>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
              <p className="font-display text-[1.35rem] italic leading-none text-paper">el cielo</p>
              <p className="mt-2 text-[11px] uppercase tracking-[0.2em] text-gold/75">
                {landed && wish ? 'pide un deseo' : `${landedItems.length} en tierra · ${orbiting.length} arriba`}
              </p>
            </div>
            {landedItems.map((item, index) => {
              const spot = ringAt(star.items.indexOf(item), star.items.length);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onOpen(item.id)}
                  className="vale-fall"
                  style={{ left: `${spot.x}%`, top: `${spot.y}%`, animationDelay: `${index * 140}ms` }}
                  aria-label={item.title || 'Estrella'}
                >
                  <i className="vale-streak" />
                  <i className="vale-dot" />
                </button>
              );
            })}
            {wish && (
              <Wish
                key={wish.id}
                land={ringAt(star.items.indexOf(wish), star.items.length)}
                play={play}
                title={wish.title}
                onLand={() => {
                  rememberFallen(star.id, wish.id);
                  setLanded(true);
                  haptic('success');
                }}
                onOpen={() => onOpen(wish.id)}
              />
            )}
          </div>
        </div>
      )}

      <p className="mt-3 text-center text-[13px] leading-relaxed text-paper/50">
        {wish && !landed
          ? 'Una va a caer…'
          : nextOrbit?.fallsOn
            ? `La siguiente cae el ${formatDay(nextOrbit.fallsOn)}`
            : wish
              ? 'Toca la estrella que acaba de caer.'
              : 'El cielo está en calma.'}
      </p>

      <p className="mt-8 text-[12px] uppercase tracking-[0.28em] text-gold/80">Talonario</p>
      <ul className="mt-4 space-y-3 pb-4">
        {nextOrbit && (
          <li>
            <div className="vale-stub w-full" style={{ rotate: '1deg' }}>
              <span className="text-[11px] uppercase tracking-[0.2em] text-gold/70">próxima</span>
              <span className="mt-2 block font-display text-[1.45rem] italic text-paper">
                {nextOrbit.title || 'Sin nombre'}
                {nextOrbit.fallsOn ? ` · ${formatDay(nextOrbit.fallsOn)}` : ''}
              </span>
            </div>
          </li>
        )}
        {[...landedItems].reverse().concat(wish && landed ? [wish] : []).map((item, index) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onOpen(item.id)}
              className="vale-stub w-full text-left"
              style={{ rotate: `${TILTS[index % TILTS.length]}deg` }}
            >
              <span className="text-[11px] uppercase tracking-[0.2em] text-gold/70">
                {item.state === 'vivido' ? 'vivida' : item.fallsOn ? formatDay(item.fallsOn) : 'abierta'}
              </span>
              <span className="mt-2 flex items-baseline justify-between gap-3">
                <span className="font-display text-[1.45rem] italic leading-tight text-paper">{item.title || 'Sin nombre'}</span>
                <span aria-hidden>{item.emoji || '✦'}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Wish({
  land,
  play,
  title,
  onLand,
  onOpen,
}: {
  land: { x: number; y: number };
  play: boolean;
  title: string;
  onLand: () => void;
  onOpen: () => void;
}) {
  const host = useRef<HTMLButtonElement>(null);
  const done = useRef(!play);
  const [path, setPath] = useState('');
  const [down, setDown] = useState(!play);

  useEffect(() => {
    if (!play || down) return;
    const box = host.current?.parentElement;
    if (!box) return;
    const w = box.clientWidth;
    const h = box.clientHeight;
    if (w < 8 || h < 8) return;
    const cx = w / 2;
    const cy = h / 2;
    const lx = (land.x / 100) * w;
    const ly = (land.y / 100) * h;
    const rx = w * 0.46;
    const ry = h * 0.4;
    setPath(
      `M ${cx} ${cy - ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy + ry} A ${rx} ${ry} 0 1 1 ${cx} ${cy - ry} C ${cx + rx * 0.2} ${-h * 0.08} ${(lx + cx) / 2} ${ly - h * 0.28} ${lx} ${ly}`,
    );
  }, [down, land.x, land.y, play]);

  const finish = () => {
    if (done.current) return;
    done.current = true;
    setDown(true);
    onLand();
  };

  useEffect(() => {
    if (!play || !path || down) return;
    const timer = window.setTimeout(finish, 7600);
    return () => window.clearTimeout(timer);
  }, [down, path, play]);

  return (
    <button
      ref={host}
      type="button"
      aria-label={title || 'Pedir un deseo'}
      disabled={!down}
      onClick={onOpen}
      onAnimationEnd={(event) => {
        if (event.target !== event.currentTarget) return;
        finish();
      }}
      className={`vale-wish${down || !path ? ' vale-wish-land' : ''}`}
      style={down || !path ? { left: `${land.x}%`, top: `${land.y}%` } : { left: 0, top: 0, offsetPath: `path('${path}')` }}
    >
      <i className="vale-streak" />
      <i className="vale-dot" />
    </button>
  );
}

function Detail({
  item,
  picked,
  onChoose,
}: {
  item: ListItem;
  picked: number | undefined;
  onChoose: (index: number) => void;
}) {
  const choice = item.options.length >= 2;
  const chosen = choice && picked != null ? item.options[picked] : null;
  if (choice && !chosen) {
    return (
      <div className="scroll-y h-full px-5 pb-10">
        <p className="text-[12px] uppercase tracking-[0.22em] text-gold/75">{item.fallsOn ? formatDay(item.fallsOn) : 'elige'}</p>
        <h2 className="mt-3 font-display text-[2.1rem] italic leading-none text-paper">{item.title || 'Un deseo'}</h2>
        <p className="mt-4 max-w-[32ch] text-[16px] leading-relaxed text-paper/65">
          {item.body || 'Hay dos maneras. Eliges una.'}
        </p>
        <div className="mt-6 grid gap-3">
          {item.options.slice(0, 2).map((option, index) => (
            <button
              key={option.id}
              type="button"
              onClick={() => {
                haptic('success');
                onChoose(index);
              }}
              className="vale-stub text-left"
              style={{ rotate: `${index === 0 ? -1.2 : 1.4}deg` }}
            >
              <p className="text-[12px] uppercase tracking-[0.18em] text-gold/80">{option.emoji} opción {index === 0 ? 'a' : 'b'}</p>
              <p className="mt-2 font-display text-[1.55rem] italic leading-tight text-paper">{option.title || 'Sin título'}</p>
              {option.body && <p className="mt-2 text-[15px] leading-relaxed text-paper/70">{option.body}</p>}
            </button>
          ))}
        </div>
      </div>
    );
  }
  const shown = chosen ?? { emoji: item.emoji, title: item.title, body: item.body };
  return (
    <div className="scroll-y h-full px-6 pb-16 pt-2">
      <p className="text-[12px] uppercase tracking-[0.22em] text-gold/75">
        {item.state === 'vivido' ? 'ya vivida' : item.fallsOn ? formatDay(item.fallsOn) : 'abierta'}
      </p>
      <p className="mt-5 text-3xl">{shown.emoji}</p>
      <h2 className="mt-3 font-display text-[2.2rem] italic leading-[1.05] text-paper">{shown.title || 'Sin título'}</h2>
      {shown.body && <p className="mt-6 whitespace-pre-line text-[17px] leading-relaxed text-paper/75">{shown.body}</p>}
    </div>
  );
}
