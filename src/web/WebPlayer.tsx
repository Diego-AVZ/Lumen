import { lazy, Suspense, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react';
import { haptic } from '@/lib/haptics';
import { spotifyEmbed } from '@/lib/spotify';
import {
  answerMatches,
  pageLocked,
  type HeartBlock,
  type ListBlock,
  type MapBlock,
  type WebBlock,
  type WebDocument,
  type WebPage,
} from '@/schema/web';

const LugaresMap = lazy(() => import('@/universe/LugaresMap'));

const HINTS = ['Otra vez', 'Sigue', 'Casi', 'Uno más'];

type Spark = { id: number; dx: string; dy: string };

function dayStamp(iso: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [year, month, day] = iso.split('-').map(Number);
  return Date.UTC(year, month - 1, day);
}

function todayStamp() {
  const now = new Date();
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
}

function formatStamp(stamp: number) {
  return new Intl.DateTimeFormat('es', { day: 'numeric', month: 'long' }).format(new Date(stamp));
}

function readBag(key: string): Record<string, number | true> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed as Record<string, number | true>;
  } catch {
    return {};
  }
}

function writeBag(key: string, bag: Record<string, number | true>) {
  try {
    localStorage.setItem(key, JSON.stringify(bag));
  } catch {
    /* modo privado */
  }
}

export function WebPlayer({
  doc,
  preview = false,
  framed = false,
  pageId,
  onPage,
}: {
  doc: WebDocument;
  preview?: boolean;
  framed?: boolean;
  pageId?: string | null;
  onPage?: (id: string | null) => void;
}) {
  const [own, setOwn] = useState<string | null>(null);
  const openId = onPage ? (pageId ?? null) : own;
  const page = doc.pages.find((item) => item.id === openId) ?? null;
  const go = (id: string | null) => {
    if (onPage) onPage(id);
    else setOwn(id);
  };

  const ink = doc.theme.ink;
  const paper = doc.theme.paper;
  const gold = doc.theme.gold;

  return (
    <div
      className="web-site relative flex h-full w-full flex-col overflow-hidden"
      style={{
        background: paper,
        color: ink,
        ['--frame-safe-top' as string]: framed ? '36px' : undefined,
        ['--frame-safe-bottom' as string]: framed ? '16px' : undefined,
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-2 pt-[calc(var(--safe-top)+0.85rem)]">
        {page ? (
          <button type="button" onClick={() => go(null)} className="text-[13px]" style={{ color: gold }}>
            ← inicio
          </button>
        ) : (
          <p className="text-[11px] uppercase tracking-[0.22em]" style={{ color: gold }}>
            {doc.intro.fromName.trim() ? `De ${doc.intro.fromName.trim()}` : 'Una web'}
          </p>
        )}
        <p className="truncate text-[11px] uppercase tracking-[0.18em] opacity-50">{page ? page.nav || page.title : 'Portada'}</p>
      </header>

      <div className="scroll-y min-h-0 flex-1 px-5 pb-[calc(var(--safe-bottom)+1.5rem)]">
        {page ? (
          <Site page={page} doc={doc} preview={preview} ink={ink} paper={paper} gold={gold} onOpen={go} />
        ) : (
          <Cover doc={doc} ink={ink} gold={gold} onOpen={go} />
        )}
      </div>
    </div>
  );
}

function Cover({
  doc,
  ink,
  gold,
  onOpen,
}: {
  doc: WebDocument;
  ink: string;
  gold: string;
  onOpen: (id: string) => void;
}) {
  return (
    <div className="pb-8 pt-3">
      <h1 className="max-w-[12ch] font-display text-[2.7rem] italic leading-[0.95]">
        {doc.intro.forName.trim() ? `Para ${doc.intro.forName.trim()}` : 'Para ti'}
      </h1>
      {doc.intro.line.trim() && <p className="mt-4 max-w-[28ch] text-[17px] leading-relaxed opacity-75">{doc.intro.line.trim()}</p>}
      {doc.soundtrack.url.trim() && (
        <div className="mt-5">
          <Listen url={doc.soundtrack.url} label={doc.soundtrack.label || 'Escuchar'} gold={gold} />
        </div>
      )}
      <p className="mt-8 text-[11px] uppercase tracking-[0.22em]" style={{ color: gold }}>
        Sitios
      </p>
      {doc.pages.length === 0 ? (
        <p className="mt-4 text-[16px] opacity-45">Todavía no hay páginas.</p>
      ) : (
        <ul className="mt-4 grid gap-3">
          {doc.pages.map((page) => (
            <li key={page.id}>
              <button
                type="button"
                onClick={() => onOpen(page.id)}
                className="w-full rounded-[22px] px-4 py-4 text-left"
                style={{ background: `${ink}0c`, boxShadow: `inset 0 0 0 1px ${ink}18` }}
              >
                <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: gold }}>
                  {pageLocked(page) ? 'Pide una respuesta' : page.nav || 'Sitio'}
                </p>
                <p className="mt-1 font-display text-[1.7rem] italic leading-none">{page.title || 'Sin título'}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Site({
  page,
  doc,
  preview,
  ink,
  paper,
  gold,
  onOpen,
}: {
  page: WebPage;
  doc: WebDocument;
  preview: boolean;
  ink: string;
  paper: string;
  gold: string;
  onOpen: (id: string) => void;
}) {
  const key = `lumen.web.${preview ? 'preview' : 'live'}.v1.quiz.${doc.meta.id}`;
  const [passed, setPassed] = useState(() => Boolean(readBag(key)[page.id]));
  const [attempt, setAttempt] = useState('');
  const [wrong, setWrong] = useState(false);
  const locked = pageLocked(page) && !passed;

  useEffect(() => {
    setPassed(Boolean(readBag(key)[page.id]));
    setAttempt('');
    setWrong(false);
  }, [key, page.id]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!answerMatches(page.quiz, attempt)) {
      haptic('light');
      setWrong(true);
      window.setTimeout(() => setWrong(false), 420);
      return;
    }
    haptic('success');
    const bag = readBag(key);
    bag[page.id] = true;
    writeBag(key, bag);
    setPassed(true);
  };

  return (
    <div className="pb-6 pt-1">
      {doc.pages.length > 1 && (
        <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
          {doc.pages.map((item) => {
            const on = item.id === page.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onOpen(item.id)}
                className="shrink-0 rounded-full px-3 py-1.5 text-[13px]"
                style={{
                  background: on ? ink : 'transparent',
                  color: on ? paper : ink,
                  boxShadow: on ? undefined : `inset 0 0 0 1px ${ink}22`,
                }}
              >
                {item.nav || item.title || 'Sitio'}
              </button>
            );
          })}
        </div>
      )}
      <h1 className="font-display text-[2.35rem] italic leading-[0.98]">{page.title || 'Sin título'}</h1>
      {locked ? (
        <form onSubmit={submit} className="mt-6">
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: gold }}>
            Para entrar
          </p>
          <p className="mt-3 font-display text-[1.7rem] italic leading-snug">{page.quiz.question}</p>
          {page.quiz.hint.trim() && <p className="mt-2 text-[14px] opacity-55">{page.quiz.hint.trim()}</p>}
          <input
            value={attempt}
            onChange={(event) => setAttempt(event.target.value)}
            placeholder="La respuesta"
            className={`mt-5 w-full border-b bg-transparent py-3 text-[18px] outline-none ${wrong ? 'web-shake' : ''}`}
            style={{ borderColor: `${ink}33` }}
          />
          <button type="submit" className="mt-5 rounded-full px-5 py-2.5 text-[14px]" style={{ background: ink, color: paper }}>
            Entrar
          </button>
          {wrong && <p className="mt-3 text-[14px] opacity-60">No es esa.</p>}
        </form>
      ) : page.blocks.length === 0 ? (
        <p className="mt-6 text-[16px] opacity-45">Esta página está en blanco.</p>
      ) : (
        <div className="mt-6 grid gap-8">
          {page.blocks.map((block) => (
            <BlockView key={block.id} block={block} docId={doc.meta.id} preview={preview} ink={ink} paper={paper} gold={gold} />
          ))}
        </div>
      )}
    </div>
  );
}

function BlockView({
  block,
  docId,
  preview,
  ink,
  paper,
  gold,
}: {
  block: WebBlock;
  docId: string;
  preview: boolean;
  ink: string;
  paper: string;
  gold: string;
}) {
  if (block.type === 'texto') {
    return (
      <article>
        {block.kicker.trim() && (
          <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: gold }}>
            {block.kicker.trim()}
          </p>
        )}
        {block.title.trim() && <h2 className="mt-2 font-display text-[1.85rem] italic leading-[1.05]">{block.title.trim()}</h2>}
        {block.body.trim() && <p className="mt-3 whitespace-pre-line text-[16px] leading-relaxed opacity-80">{block.body.trim()}</p>}
      </article>
    );
  }
  if (block.type === 'imagen') {
    if (!block.src.trim() && !block.caption.trim()) return null;
    return (
      <figure>
        {block.src.trim() && <img src={block.src} alt={block.caption || ''} className="w-full rounded-[18px] object-cover" />}
        {block.caption.trim() && <figcaption className="mt-2 text-[14px] italic opacity-60">{block.caption.trim()}</figcaption>}
      </figure>
    );
  }
  if (block.type === 'audio') {
    if (!block.url.trim()) return null;
    return (
      <div>
        {block.label.trim() && <p className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: gold }}>{block.label.trim()}</p>}
        <audio controls src={block.url} className="w-full" />
      </div>
    );
  }
  if (block.type === 'spotify') {
    if (!block.url.trim()) return null;
    return <Listen url={block.url} label={block.label || 'Escuchar'} gold={gold} />;
  }
  if (block.type === 'corazon') return <Heart block={block} docId={docId} preview={preview} ink={ink} />;
  if (block.type === 'lista') return <Plans block={block} docId={docId} preview={preview} ink={ink} paper={paper} gold={gold} />;
  return <Places block={block} ink={ink} gold={gold} />;
}

function Listen({ url, label, gold }: { url: string; label: string; gold: string }) {
  const embed = spotifyEmbed(url);
  const [open, setOpen] = useState(false);
  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="text-[12px] uppercase tracking-[0.18em]" style={{ color: gold }}>
        {label} ↗
      </a>
    );
  }
  return (
    <div>
      <button type="button" onClick={() => setOpen((value) => !value)} className="text-[12px] uppercase tracking-[0.18em]" style={{ color: gold }}>
        ♪ {open ? 'Cerrar' : label}
      </button>
      {open && (
        <iframe
          title={label}
          src={embed.src}
          className="mt-3 h-[152px] w-full rounded-xl"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
    </div>
  );
}

function Heart({ block, docId, preview, ink }: { block: HeartBlock; docId: string; preview: boolean; ink: string }) {
  const key = `lumen.web.${preview ? 'preview' : 'live'}.v1.heart.${docId}`;
  const [open, setOpen] = useState(() => Boolean(readBag(key)[block.id]));
  const [clicks, setClicks] = useState(0);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const need = Math.max(1, block.taps || 6);

  useEffect(() => {
    const stored = Boolean(readBag(key)[block.id]);
    setOpen(stored);
    setClicks(stored ? need : 0);
  }, [block.id, key, need]);

  const tap = () => {
    if (open) return;
    setClicks((current) => {
      if (current >= need) return current;
      const next = current + 1;
      haptic(next >= need ? 'success' : 'medium');
      if (next >= need) {
        const bag = readBag(key);
        bag[block.id] = true;
        writeBag(key, bag);
        window.setTimeout(() => setOpen(true), 280);
      }
      return next;
    });
    setSparks((prev) =>
      [
        ...prev,
        ...Array.from({ length: 8 }, (_, index) => ({
          id: Date.now() + index + Math.random(),
          dx: `${(Math.random() * 2 - 1) * 70}px`,
          dy: `${-18 - Math.random() * 78}px`,
        })),
      ].slice(-32),
    );
  };

  return (
    <div className="py-2 text-center">
      {block.line.trim() && <p className="font-display text-[1.45rem] italic leading-snug">{block.line.trim()}</p>}
      {!open && (
        <>
          <div className="relative mx-auto mt-5 grid w-fit place-items-center">
            {sparks.map((spark) => (
              <span
                key={spark.id}
                className="cita-burst"
                style={{ left: '50%', top: '42%', ['--dx' as string]: spark.dx, ['--dy' as string]: spark.dy } as CSSProperties}
              />
            ))}
            <button
              type="button"
              className={`web-heart ${clicks > 0 ? 'web-heart-hot' : ''}`}
              onClick={tap}
              aria-label="Ver el detalle"
              style={{ transform: `scale(${1 + clicks * 0.03})` }}
            >
              <HeartMark />
              <span className="web-heart-ring" />
            </button>
          </div>
          <p className="mt-4 text-[14px] opacity-55">
            {clicks === 0 ? 'Toca el corazón' : HINTS[Math.min(clicks - 1, HINTS.length - 1)]}
          </p>
          <div className="mt-3 flex justify-center gap-1.5">
            {Array.from({ length: need }, (_, index) => (
              <span key={index} className="h-1.5 w-5 rounded-full" style={{ background: index < clicks ? ink : `${ink}22` }} />
            ))}
          </div>
        </>
      )}
      {open && (
        <div className="animate-rise mx-auto mt-4 max-w-[22rem] text-left">
          {block.photo.trim() && <img src={block.photo} alt="" className="w-full rounded-[18px] object-cover" />}
          {block.detail.trim() && (
            <p className={`whitespace-pre-line text-[16px] leading-relaxed opacity-80 ${block.photo.trim() ? 'mt-4' : ''}`}>{block.detail.trim()}</p>
          )}
        </div>
      )}
    </div>
  );
}

function HeartMark() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff6ea" aria-hidden>
      <path d="M12 21s-7.2-4.6-9.4-9.1C1.2 8.7 3 5.5 6.4 5.5c2 0 3.3 1.1 3.6 2.1.3-1 1.6-2.1 3.6-2.1 3.4 0 5.2 3.2 3.8 6.4C19.2 16.4 12 21 12 21z" />
    </svg>
  );
}

function roundOpens(block: ListBlock, index: number) {
  const start = dayStamp(block.startsOn) ?? todayStamp();
  return start + index * block.everyDays * 86400000;
}

function Plans({
  block,
  docId,
  preview,
  ink,
  paper,
  gold,
}: {
  block: ListBlock;
  docId: string;
  preview: boolean;
  ink: string;
  paper: string;
  gold: string;
}) {
  const key = `lumen.web.${preview ? 'preview' : 'live'}.v1.choice.${docId}`;
  const [choices, setChoices] = useState<Record<string, number>>(() => readBag(key) as Record<string, number>);
  const today = useMemo(() => todayStamp(), []);

  useEffect(() => {
    setChoices(readBag(key) as Record<string, number>);
  }, [key, block.id]);

  const choose = (roundId: string, index: number) => {
    haptic('success');
    const bag = { ...readBag(key), [roundId]: index };
    writeBag(key, bag);
    setChoices(bag as Record<string, number>);
  };

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: gold }}>
        La lista
      </p>
      {block.intro.trim() && <p className="mt-3 text-[16px] leading-relaxed opacity-75">{block.intro.trim()}</p>}
      <ul className="mt-5 grid gap-4">
        {block.rounds.map((round, index) => {
          const opens = roundOpens(block, index);
          const ready = today >= opens;
          const picked = choices[round.id];
          const chosen = picked === 0 || picked === 1 ? (picked === 0 ? round.a : round.b) : null;
          return (
            <li key={round.id} className="rounded-[22px] px-4 py-4" style={{ boxShadow: `inset 0 0 0 1px ${ink}18` }}>
              <p className="text-[11px] uppercase tracking-[0.16em]" style={{ color: gold }}>
                {chosen ? 'Elegido' : ready ? 'Puedes elegir' : `Se abre el ${formatStamp(opens)}`}
              </p>
              {round.title.trim() && <p className="mt-1 font-display text-[1.35rem] italic">{round.title.trim()}</p>}
              {!ready && <p className="mt-2 text-[14px] opacity-55">Todavía no toca. Cuando se abra, hay dos planes.</p>}
              {ready && !chosen && (
                <div className="mt-3 grid gap-2">
                  {[round.a, round.b].map((plan, planIndex) => (
                    <button
                      key={planIndex}
                      type="button"
                      onClick={() => choose(round.id, planIndex)}
                      className="rounded-[18px] px-4 py-3 text-left"
                      style={{ background: ink, color: paper }}
                    >
                      <p className="text-[11px] uppercase tracking-[0.14em] opacity-60">{planIndex === 0 ? 'Un plan' : 'El otro'}</p>
                      <p className="mt-1 font-display text-[1.35rem] italic leading-tight">{plan.title.trim() || 'Sin título'}</p>
                      {plan.body.trim() && <p className="mt-1 text-[14px] leading-relaxed opacity-75">{plan.body.trim()}</p>}
                    </button>
                  ))}
                </div>
              )}
              {chosen && (
                <div className="mt-3">
                  <p className="font-display text-[1.55rem] italic leading-tight">{chosen.title.trim() || 'Sin título'}</p>
                  {chosen.body.trim() && <p className="mt-2 text-[15px] leading-relaxed opacity-75">{chosen.body.trim()}</p>}
                  <p className="mt-3 text-[12px] uppercase tracking-[0.14em] opacity-45">Quedó guardado</p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Places({ block, ink, gold }: { block: MapBlock; ink: string; gold: string }) {
  const [active, setActive] = useState(block.places[0]?.id ?? '');
  const [map, setMap] = useState(false);
  const pins = block.places.filter((place) => place.lat.trim() || place.lng.trim());

  return (
    <section>
      <p className="text-[11px] uppercase tracking-[0.2em]" style={{ color: gold }}>
        Mapa
      </p>
      {block.intro.trim() && <p className="mt-3 text-[16px] leading-relaxed opacity-75">{block.intro.trim()}</p>}
      {pins.length > 0 && (
        <button type="button" onClick={() => setMap((value) => !value)} className="mt-4 text-[12px] uppercase tracking-[0.16em]" style={{ color: gold }}>
          {map ? 'Ver la lista' : 'Ver el mapa'}
        </button>
      )}
      {map && pins.length > 0 ? (
        <div className="mt-4 h-64 overflow-hidden rounded-[18px]">
          <Suspense fallback={<div className="h-full w-full" style={{ background: `${ink}10` }} />}>
            <LugaresMap places={block.places} active={active} onPick={setActive} />
          </Suspense>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3">
          {block.places.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => {
                  setActive(place.id);
                  if (place.lat.trim() || place.lng.trim()) setMap(true);
                }}
                className="w-full rounded-[18px] px-4 py-3 text-left"
                style={{ boxShadow: `inset 0 0 0 1px ${place.id === active ? ink : `${ink}22`}` }}
              >
                <p className="text-xl">{place.emoji || '⌖'}</p>
                <p className="mt-1 font-display text-[1.4rem] italic leading-tight">{place.title.trim() || 'Sin nombre'}</p>
                {place.body.trim() && <p className="mt-1 text-[14px] leading-relaxed opacity-70">{place.body.trim()}</p>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
