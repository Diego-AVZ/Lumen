import { lazy, Suspense, useEffect, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode, type RefObject } from 'react';
import { useAttached } from '@/attach/useAttached';
import { DateAskPlayer } from '@/cita/DateAskPlayer';
import { isCita } from '@/schema/project';
import type {
  ArchivoStar,
  CartaStar,
  HistoriaStar,
  LugaresStar,
  NotasStar,
  SecretoStar,
  SobreStar,
  StoryBeat,
} from '@/schema/universe';
import { haptic } from '@/lib/haptics';
import { samePhrase } from '@/lib/motion';
import { coordsOf } from '@/universe/coords';
import { VoicePlay } from '@/studio/VoiceNote';
import { MusicDock } from '@/universe/Music';

export { ListaLayer } from '@/universe/ListaSky';

const LugaresMap = lazy(() => import('@/universe/LugaresMap'));

function LayerShell({
  title,
  onBack,
  backLabel = 'universo',
  children,
}: {
  title: string;
  onBack: () => void;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div data-layer className="animate-depth absolute inset-0 z-20 flex min-h-0 flex-col bg-ink/90 backdrop-blur-md">
      <header className="flex shrink-0 items-center justify-between gap-3 px-5 pb-3 pt-[calc(var(--safe-top)+0.85rem)]">
        <button type="button" onClick={onBack} className="back-chip">
          ← {backLabel}
        </button>
        <p className="text-[11px] uppercase tracking-[0.22em] text-paper/45">{title}</p>
      </header>
      <div className="min-h-0 flex-1">{children}</div>
    </div>
  );
}

function scrollChild(el: HTMLElement, index: number, axis: 'x' | 'y') {
  const child = el.children.item(index) as HTMLElement | null;
  if (!child) return;
  el.scrollTo({
    left: axis === 'x' ? child.offsetLeft : el.scrollLeft,
    top: axis === 'y' ? child.offsetTop : el.scrollTop,
    behavior: 'smooth',
  });
}

function useFlick(axis: 'x' | 'y') {
  const ref = useRef<HTMLDivElement>(null);
  const origin = useRef<{ x: number; y: number; pos: number } | null>(null);
  const onPointerDown = (event: ReactPointerEvent) => {
    if ((event.target as HTMLElement).closest('button, a, input, textarea, iframe')) return;
    const el = ref.current;
    if (!el) return;
    origin.current = { x: event.clientX, y: event.clientY, pos: axis === 'x' ? el.scrollLeft : el.scrollTop };
  };
  const onPointerUp = (event: ReactPointerEvent) => {
    const start = origin.current;
    origin.current = null;
    const el = ref.current;
    if (!start || !el) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    const main = axis === 'x' ? dx : dy;
    const cross = axis === 'x' ? dy : dx;
    if (Math.abs(main) < 8 || Math.abs(main) < Math.abs(cross) * 0.65) return;
    const size = Math.max(1, axis === 'x' ? el.clientWidth : el.clientHeight);
    const now = axis === 'x' ? el.scrollLeft : el.scrollTop;
    if (Math.abs(now - start.pos) > size * 0.35) return;
    scrollChild(el, Math.round(start.pos / size) + (main < 0 ? 1 : -1), axis);
  };
  return { ref, onPointerDown, onPointerUp };
}

export function HistoriaLayer({ star, onBack }: { star: HistoriaStar; onBack: () => void }) {
  const horizontal = useFlick('x');
  const [index, setIndex] = useState(0);
  const beats = star.beats;

  return (
    <LayerShell title={star.label || 'Historia'} onBack={onBack}>
      {beats.length === 0 ? (
        <Empty text="Esta historia todavía no tiene capítulos." />
      ) : (
        <>
          <div
            {...horizontal}
            className="snap-x h-full"
            onScroll={(e) => {
              const el = e.currentTarget;
              const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
              if (next !== index) setIndex(next);
            }}
          >
            {beats.map((beat, i) => (
              <BeatColumn key={beat.id} beat={beat} isLast={i === beats.length - 1} horizontal={horizontal.ref} />
            ))}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--safe-bottom)+0.9rem)] z-10 flex justify-center gap-1.5">
            {beats.map((beat, i) => (
              <button
                key={beat.id}
                type="button"
                aria-label={beat.title || `Capítulo ${i + 1}`}
                onClick={() => {
                  const el = horizontal.ref.current;
                  if (el) scrollChild(el, i, 'x');
                }}
                className={[
                  'pointer-events-auto h-1.5 rounded-full transition-all',
                  i === index ? 'w-5 bg-gold' : 'w-1.5 bg-paper/25',
                ].join(' ')}
              />
            ))}
          </div>
        </>
      )}
    </LayerShell>
  );
}

function BeatColumn({
  beat,
  isLast,
  horizontal,
}: {
  beat: StoryBeat;
  isLast: boolean;
  horizontal: RefObject<HTMLDivElement>;
}) {
  const vertical = useFlick('y');
  const [depth, setDepth] = useState(0);
  const total = beat.slides.length + 1;

  const go = (dir: 1 | -1) => {
    const v = vertical.ref.current;
    if (!v) return;
    const next = Math.max(0, Math.min(total - 1, depth + dir));
    if (next === depth && dir === 1 && !isLast) {
      const h = horizontal.current;
      if (!h) return;
      const page = Math.round(h.scrollLeft / Math.max(1, h.clientWidth));
      scrollChild(h, page + 1, 'x');
      return;
    }
    scrollChild(v, next, 'y');
  };

  return (
    <div className="snap-page relative">
      <div
        {...vertical}
        className="snap-y h-full"
        onScroll={(e) => {
          const el = e.currentTarget;
          const next = Math.round(el.scrollTop / Math.max(1, el.clientHeight));
          if (next !== depth) setDepth(next);
        }}
      >
        <section className="snap-page flex flex-col px-6 pb-24 pt-2">
          <p className="text-[12px] uppercase tracking-[0.28em] text-gold/80">
            {beat.index} · {beat.emoji}
          </p>
          <h2 className="mt-3 font-display text-[2.2rem] italic leading-none text-paper">
            {beat.title || 'Sin título'}
          </h2>
          {beat.track && (
            <div className="mt-4">
              <MusicDock url={beat.track} label="Escuchar" bare />
            </div>
          )}
          <VoicePlay url={beat.voiceUrl} />
          {beat.date && <p className="mt-3 text-[13px] uppercase tracking-[0.18em] text-gold/70">{beat.date}</p>}
          {beat.lead ? (
            <p className="readable mt-5 text-[17px] leading-relaxed text-paper/80">{beat.lead}</p>
          ) : (
            <p className="mt-5 text-[16px] leading-relaxed text-paper/35">Este capítulo todavía está en blanco.</p>
          )}
          {beat.quote && (
            <p className="readable mt-6 border-l border-gold/40 pl-4 font-display text-[1.25rem] italic leading-snug text-paper/75">
              “{beat.quote}”
            </p>
          )}
          <SlideHint last={total === 1 && isLast} onNext={() => go(1)} side={!isLast && total === 1} />
        </section>
        {beat.slides.map((slide, i) => (
          <section key={slide.id} className="snap-page flex flex-col px-6 pb-24 pt-2">
            <p className="text-[12px] uppercase tracking-[0.28em] text-gold/80">
              {beat.index}.{slide.kicker || String(i + 1).padStart(2, '0')} · {beat.emoji}
            </p>
            <h2 className="mt-3 font-display text-[2.05rem] italic leading-[1.05] text-paper">
              {slide.title || 'Sin título'}
            </h2>
            {slide.body && <p className="readable mt-6 text-[17px] leading-relaxed text-paper/75">{slide.body}</p>}
            <SlideHint last={i === beat.slides.length - 1 && isLast} side={!isLast && i === beat.slides.length - 1} onNext={() => go(1)} />
          </section>
        ))}
      </div>
      <div className="pointer-events-none absolute bottom-auto right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-1.5">
        {Array.from({ length: total }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => {
              const v = vertical.ref.current;
              if (v) scrollChild(v, i, 'y');
            }}
            className={[
              'pointer-events-auto w-1.5 rounded-full',
              i === depth ? 'h-5 bg-gold' : 'h-1.5 bg-paper/25',
            ].join(' ')}
          />
        ))}
      </div>
    </div>
  );
}

function SlideHint({ onNext, side, last }: { onNext: () => void; side: boolean; last: boolean }) {
  if (last) return <span className="mt-auto" />;
  return (
    <button type="button" onClick={onNext} className="mt-auto pt-8 text-left">
      {side ? (
        <span className="font-display text-[2rem] italic text-gold/90">desliza →</span>
      ) : (
        <span className="text-[12px] uppercase tracking-[0.22em] text-paper/35">desliza ↓</span>
      )}
    </button>
  );
}

export function CartaLayer({ star, onBack }: { star: CartaStar; onBack: () => void }) {
  const parts = star.body
    .split(/\n\s*\n/)
    .map((part) => part.trim())
    .filter(Boolean);
  return (
    <LayerShell title={star.label || 'Carta'} onBack={onBack}>
      <article className="scroll-y h-full px-7 pb-16 pt-2">
        {star.kickerText && (
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold/75">{star.kickerText}</p>
        )}
        <h2 className="mt-4 font-display text-[2.15rem] italic leading-[1.12] text-paper">
          {star.headline || 'Una carta'}
        </h2>
        <div className="mt-8 space-y-5">
          {parts.length === 0 && <p className="text-[16px] text-paper/35">La carta todavía no está escrita.</p>}
          {parts.map((part, index) => (
            <p key={`${index}-${part.slice(0, 12)}`} className="readable text-[17px] leading-relaxed text-paper/80">
              {part}
            </p>
          ))}
        </div>
        {star.signoff && <p className="mt-10 font-display text-[1.4rem] italic text-gold">{star.signoff}</p>}
        <VoicePlay url={star.voiceUrl} />
      </article>
    </LayerShell>
  );
}

export function NotasLayer({ star, onBack }: { star: NotasStar; onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const card = star.cards.find((entry) => entry.id === openId) ?? null;
  return (
    <LayerShell
      title={star.label || 'Notas'}
      onBack={() => (card ? setOpenId(null) : onBack())}
      backLabel={card ? 'notas' : 'universo'}
    >
      {card ? (
        <article className="scroll-y h-full px-5 pb-12 pt-2">
          <div className="kit-sheet">
            <p className="kit-emoji-lg">{card.emoji || '🌿'}</p>
            <h2 className="kit-title kit-title-lg">{card.title || 'Nota'}</h2>
            <div className="kit-lines">
              {card.text
                .split('\n')
                .map((line) => line.trim())
                .filter(Boolean)
                .map((line) => (
                  <p key={line} className="kit-line readable">
                    {line}
                  </p>
                ))}
              {!card.text.trim() && <p className="kit-line">Esta nota está en blanco.</p>}
            </div>
          </div>
        </article>
      ) : star.cards.length === 0 ? (
        <Empty text="No hay notas todavía." />
      ) : (
        <ul className="kit-grid scroll-y h-full px-4 pb-10 pt-1">
          {star.cards.map((entry) => (
            <li key={entry.id}>
              <button type="button" onClick={() => setOpenId(entry.id)} className="kit-note w-full text-left">
                <span className="kit-emoji">{entry.emoji || '🌿'}</span>
                <span className="kit-title">{entry.title || 'Nota'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </LayerShell>
  );
}

const TILTS = [-2.2, 1.6, -1.1, 2, 0.4, -1.8];

export function ArchivoLayer({ star, onBack }: { star: ArchivoStar; onBack: () => void }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const photo = star.photos.find((entry) => entry.id === openId) ?? null;
  return (
    <LayerShell
      title={star.label || 'Archivo'}
      onBack={() => (photo ? setOpenId(null) : onBack())}
      backLabel={photo ? 'archivo' : 'universo'}
    >
      {photo ? (
        <div className="flex h-full flex-col justify-center px-6 pb-10">
          <Polaroid photo={photo} tilt={0} large />
        </div>
      ) : star.photos.length === 0 ? (
        <Empty text="El archivo espera su primera foto." />
      ) : (
        <div className="album-page h-full">
          <div className="album-sheet px-5 pb-12 pt-[calc(var(--safe-top)+0.2rem)]">
            <div className="mx-auto grid max-w-[20rem] gap-6">
              {star.photos.map((entry, i) => (
                <button key={entry.id} type="button" onClick={() => setOpenId(entry.id)} className="text-left">
                  <Polaroid photo={entry} tilt={TILTS[i % TILTS.length]} />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </LayerShell>
  );
}

function Polaroid({
  photo,
  tilt,
  large = false,
}: {
  photo: ArchivoStar['photos'][number];
  tilt: number;
  large?: boolean;
}) {
  return (
    <span className="album-polaroid" style={{ ['--tilt' as string]: `${tilt}deg` }}>
      <i className="album-tape album-tape-l" />
      <i className="album-tape album-tape-r" />
      <span className="album-shot">
        {photo.src ? (
          <img src={photo.src} alt="" style={large ? { maxHeight: 420, aspectRatio: 'auto' } : undefined} />
        ) : (
          <span className="grid aspect-square place-items-center text-[11px] uppercase tracking-[0.18em] text-paper/40">
            sin foto
          </span>
        )}
      </span>
      <span className="album-caption">{photo.caption || ' '}</span>
    </span>
  );
}

export function SecretoLayer({
  star,
  open,
  onUnlock,
  onBack,
}: {
  star: SecretoStar;
  open: boolean;
  onUnlock: () => void;
  onBack: () => void;
}) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const [current, setCurrent] = useState(0);
  const unlocked = open || !star.phrase.trim();

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!samePhrase(value, star.phrase)) {
      haptic('light');
      setWrong(true);
      return;
    }
    haptic('success');
    onUnlock();
  };

  const entry = star.entries[current];

  return (
    <LayerShell title={star.label || 'Secreto'} onBack={onBack}>
      {!unlocked ? (
        <form onSubmit={submit} className="flex h-full flex-col items-center justify-center px-8 text-center">
          <p className="font-display text-[1.7rem] italic text-paper">{star.hint || 'Hay una frase.'}</p>
          <input
            type="password"
            value={value}
            autoComplete="off"
            onChange={(e) => {
              setValue(e.target.value);
              setWrong(false);
            }}
            className="mt-8 w-full max-w-[16rem] border-b border-paper/25 bg-transparent py-3 text-center tracking-[0.14em] text-paper outline-none"
          />
          {wrong && <p className="mt-4 text-[13px] text-dust">Esa no es.</p>}
          <button type="submit" className="mt-8 text-[13px] uppercase tracking-[0.28em] text-gold">
            Abrir →
          </button>
        </form>
      ) : star.entries.length === 0 ? (
        <Empty text="El secreto está vacío." />
      ) : (
        <div className="flex h-full flex-col px-6 pb-10 pt-2">
          <p className="text-[12px] uppercase tracking-[0.22em] text-gold/70">
            {String(current + 1).padStart(2, '0')} / {String(star.entries.length).padStart(2, '0')}
          </p>
          <h2 className="mt-3 font-display text-[2rem] italic leading-tight text-paper">{entry?.title || 'Secreto'}</h2>
          <p className="readable mt-5 text-[17px] leading-relaxed text-paper/75">{entry?.body}</p>
          {star.entries.length > 1 && (
            <div className="mt-auto flex justify-between pt-8 text-[12px] uppercase tracking-[0.18em] text-gold">
              <button type="button" onClick={() => setCurrent((n) => Math.max(0, n - 1))} disabled={current === 0}>
                ← anterior
              </button>
              <button
                type="button"
                onClick={() => setCurrent((n) => Math.min(star.entries.length - 1, n + 1))}
                disabled={current === star.entries.length - 1}
              >
                siguiente →
              </button>
            </div>
          )}
        </div>
      )}
    </LayerShell>
  );
}

export function SobreLayer({ star, onBack }: { star: SobreStar; onBack: () => void }) {
  const attached = useAttached(star.cita);
  const cita = attached.doc && isCita(attached.doc) ? attached.doc : null;
  return (
    <LayerShell title={star.label || 'Sobre'} onBack={onBack}>
      <div className="flex h-full min-h-0 flex-col">
        {star.line.trim() && <p className="px-6 pt-2 text-center font-display text-[1.15rem] italic text-paper/70">{star.line.trim()}</p>}
        <div className="min-h-0 flex-1">
          {cita ? (
            <DateAskPlayer doc={cita} nested />
          ) : (
            <Empty
              text={
                !star.cita
                  ? 'Esta estrella todavía no tiene sobre.'
                  : attached.state === 'draft'
                    ? 'El sobre se abre cuando esté publicado.'
                    : attached.state === 'loading'
                      ? 'Abriendo el sobre…'
                      : 'No encuentro el sobre.'
              }
            />
          )}
        </div>
      </div>
    </LayerShell>
  );
}

export function LugaresLayer({ star, onBack }: { star: LugaresStar; onBack: () => void }) {
  const pins = star.places.filter((place) => coordsOf(place));
  const [active, setActive] = useState(pins[0]?.id ?? star.places[0]?.id ?? '');

  useEffect(() => {
    if (!star.places.some((place) => place.id === active)) {
      setActive(star.places[0]?.id ?? '');
    }
  }, [active, star.places]);

  return (
    <LayerShell title={star.label || 'Lugares'} onBack={onBack}>
      <div className="flex h-full min-h-0 flex-col">
        {pins.length > 0 && (
          <div className="h-[42%] min-h-[190px]">
            <Suspense fallback={<div className="grid h-full place-items-center text-[12px] uppercase tracking-[0.18em] text-paper/40">abriendo el mapa</div>}>
              <LugaresMap places={star.places} active={active} onPick={setActive} />
            </Suspense>
          </div>
        )}
        <div className="scroll-y min-h-0 flex-1 px-5 pb-10 pt-4">
          {star.intro && <p className="mb-4 font-display text-[1.2rem] italic text-paper/70">{star.intro}</p>}
          {star.places.length === 0 && <Empty text="Todavía no hay lugares." />}
          <ul className="grid gap-3">
            {star.places.map((place) => {
              const on = place.id === active;
              const pin = coordsOf(place);
              return (
                <li key={place.id}>
                  <button
                    type="button"
                    onClick={() => setActive(place.id)}
                    className={[
                      'w-full rounded-2xl border px-4 py-3 text-left',
                      on ? 'border-gold/50 bg-paper/5' : 'border-paper/10',
                    ].join(' ')}
                  >
                    <p className="text-[12px] uppercase tracking-[0.16em] text-gold/75">
                      {place.emoji || '⌖'} {on ? 'aquí' : 'lugar'}
                    </p>
                    <p className="mt-1 font-display text-[1.35rem] italic text-paper">{place.title || 'Sin nombre'}</p>
                    {on && place.body && <p className="readable mt-2 text-[15px] leading-relaxed text-paper/70">{place.body}</p>}
                    {on && pin && (
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${pin[0]}&mlon=${pin[1]}#map=15/${pin[0]}/${pin[1]}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-3 inline-block text-[12px] uppercase tracking-[0.16em] text-gold"
                      >
                        Abrir el mapa →
                      </a>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </LayerShell>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <div className="grid h-full place-items-center px-10 text-center">
      <p className="font-display text-[1.4rem] italic leading-snug text-paper/55">{text}</p>
    </div>
  );
}
