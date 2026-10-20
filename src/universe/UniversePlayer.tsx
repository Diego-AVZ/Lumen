import { useEffect, useId, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent } from 'react';
import { haptic } from '@/lib/haptics';
import { clamp, samePhrase } from '@/lib/motion';
import {
  TITLE_AT,
  WORLD,
  skyName,
  type Star,
  type UniverseDocument,
} from '@/schema/universe';
import { Grain, Starfield } from '@/universe/Starfield';
import { MusicDock } from '@/universe/Music';
import {
  ArchivoLayer,
  CartaLayer,
  HistoriaLayer,
  ListaLayer,
  LugaresLayer,
  NotasLayer,
  SecretoLayer,
} from '@/universe/layers';
import { introShot, skyShot, starShot } from '@/universe/shots';
import { useCamera } from '@/universe/useCamera';
import { readVisit, writeVisit, type VisitState } from '@/universe/visit';

export type PlayerFrame = 'gate' | 'intro' | 'sky' | 'star';

type Props = {
  doc: UniverseDocument;
  /** Si llega, el estudio manda el encuadre. Si no, el regalo se mueve solo. */
  frame?: PlayerFrame;
  starId?: string | null;
  framed?: boolean;
  compose?: boolean;
  selectedId?: string | null;
  onSelectStar?: (id: string) => void;
  onMoveStar?: (id: string, x: number, y: number) => void;
  onUserFrame?: (frame: PlayerFrame, starId?: string) => void;
};

function needsGate(doc: UniverseDocument) {
  return doc.gate.enabled && doc.gate.phrase.trim().length > 0 && !readVisit(doc.meta.id).gate;
}

export function UniversePlayer({
  doc,
  frame,
  starId,
  framed = false,
  compose = false,
  selectedId,
  onSelectStar,
  onMoveStar,
  onUserFrame,
}: Props) {
  const viewport = useRef<HTMLDivElement>(null);
  const docRef = useRef(doc);
  docRef.current = doc;
  const [localFrame, setLocalFrame] = useState<PlayerFrame>(() => (needsGate(doc) ? 'gate' : 'intro'));
  const [localStar, setLocalStar] = useState<string | null>(null);
  const [layer, setLayer] = useState<string | null>(null);
  const [entered, setEntered] = useState(false);
  const [hint, setHint] = useState(false);
  const [visit, setVisit] = useState<VisitState>(() => readVisit(doc.meta.id));
  const active = frame ?? localFrame;
  const activeStar = frame === undefined ? localStar : starId;
  const reduced = useReduced();
  const size = () => {
    const el = viewport.current;
    return { w: el?.offsetWidth || 390, h: el?.offsetHeight || 844 };
  };
  const start = introShot(390);
  const { camera, flyTo, clientToWorld, bind } = useCamera(start, viewport);

  const go = (next: PlayerFrame, id?: string) => {
    if (frame === undefined) {
      setLocalFrame(next);
      if (id) setLocalStar(id);
    }
    onUserFrame?.(next, id);
  };

  useEffect(() => {
    const token = window.setTimeout(() => setHint(true), 900);
    return () => window.clearTimeout(token);
  }, [active]);

  useEffect(() => {
    const { w, h } = size();
    const dur = reduced ? 1 : 880;
    if (active === 'gate' || active === 'intro') {
      setLayer(null);
      setEntered(false);
      flyTo(introShot(w), dur);
      return;
    }
    if (active === 'sky') {
      setLayer(null);
      setEntered(true);
      flyTo(skyShot(docRef.current.stars, w, h), dur);
      return;
    }
    if (active === 'star' && activeStar) {
      const star = docRef.current.stars.find((item) => item.id === activeStar);
      setEntered(true);
      if (!star) {
        setLayer(null);
        return;
      }
      flyTo(starShot(star, w), reduced ? 1 : 720, () => setLayer(star.id));
    }
  }, [active, activeStar, flyTo, reduced]);

  useEffect(() => {
    if (layer && !doc.stars.some((star) => star.id === layer)) setLayer(null);
  }, [doc.stars, layer]);

  const patchVisit = (recipe: (prev: VisitState) => VisitState) => {
    setVisit((prev) => {
      const next = recipe(prev);
      writeVisit(doc.meta.id, next);
      return next;
    });
  };

  const worldStyle = {
    width: WORLD.width,
    height: WORLD.height,
    transform: `translate(${-camera.x}px, ${-camera.y}px)`,
  };

  const skyOpen = entered && !layer && active !== 'gate';
  const openStar = doc.stars.find((star) => star.id === layer) ?? null;

  return (
    <div
      ref={viewport}
      className="universe relative h-full w-full overflow-hidden"
      style={{
        ['--ink' as string]: doc.theme.ink,
        ['--paper' as string]: doc.theme.paper,
        ['--gold' as string]: doc.theme.gold,
        ['--dust' as string]: doc.theme.dust,
        ['--frame-safe-top' as string]: framed ? '36px' : undefined,
        ['--frame-safe-bottom' as string]: framed ? '16px' : undefined,
        background: doc.theme.ink,
        color: doc.theme.paper,
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 50% 38%, ${doc.theme.skyFrom} 0%, ${doc.theme.skyMid} 62%, ${doc.theme.skyTo} 100%)`,
        }}
      />
      <Starfield />
      <div
        className="absolute inset-0"
        style={{ touchAction: skyOpen ? 'none' : 'auto' }}
        {...(skyOpen ? bind : {})}
      >
        <div
          className="absolute left-1/2 top-1/2 will-change-transform"
          style={{ transform: `scale(${camera.scale})`, transformOrigin: '0 0' }}
        >
          <div className="relative" style={worldStyle}>
            <Constellation stars={doc.stars} entered={entered} />
            <TitleMark
              doc={doc}
              entered={entered}
              onOpen={() => {
                haptic('light');
                go('intro');
              }}
            />
            {doc.stars.map((star, index) => (
              <StarNode
                key={star.id}
                star={star}
                index={index}
                visible={entered}
                selected={selectedId === star.id || layer === star.id}
                compose={compose && skyOpen}
                clientToWorld={clientToWorld}
                onSelect={() => onSelectStar?.(star.id)}
                onOpen={() => {
                  haptic('medium');
                  onSelectStar?.(star.id);
                  go('star', star.id);
                }}
                onMove={(x, y) => onMoveStar?.(star.id, x, y)}
              />
            ))}
          </div>
        </div>
      </div>

      {active === 'gate' && (
        <Gate
          doc={doc}
          onUnlock={() => {
            patchVisit((prev) => ({ ...prev, gate: true }));
            go('intro');
          }}
        />
      )}

      {active === 'intro' && <IntroHud doc={doc} onEnter={() => {
        haptic('medium');
        go('sky');
      }} />}

      {!layer && (active === 'intro' || active === 'sky') && doc.soundtrack.url.trim() && (
        <div className="absolute left-4 top-[calc(var(--safe-top)+0.85rem)] z-30 max-w-[calc(100%-2rem)]">
          <MusicDock url={doc.soundtrack.url} label={doc.soundtrack.label || 'Música'} />
        </div>
      )}

      {skyOpen && hint && (
        <p className="pointer-events-none absolute inset-x-0 bottom-[calc(var(--safe-bottom)+1rem)] z-20 text-center text-[11px] uppercase tracking-[0.22em] text-paper/40">
          {compose ? 'arrastra · pellizca' : doc.stars.length === 0 ? 'el cielo está en calma' : 'pellizca · arrastra · toca'}
        </p>
      )}

      {openStar?.type === 'historia' && <HistoriaLayer star={openStar} onBack={() => go('sky')} />}
      {openStar?.type === 'lista' && (
        <ListaLayer
          star={openStar}
          visit={visit}
          onChoose={(itemId, index) => patchVisit((prev) => ({ ...prev, choices: { ...prev.choices, [itemId]: index } }))}
          onBack={() => go('sky')}
        />
      )}
      {openStar?.type === 'carta' && <CartaLayer star={openStar} onBack={() => go('sky')} />}
      {openStar?.type === 'notas' && <NotasLayer star={openStar} onBack={() => go('sky')} />}
      {openStar?.type === 'archivo' && <ArchivoLayer star={openStar} onBack={() => go('sky')} />}
      {openStar?.type === 'secreto' && (
        <SecretoLayer
          star={openStar}
          open={Boolean(visit.secrets[openStar.id])}
          onUnlock={() => patchVisit((prev) => ({ ...prev, secrets: { ...prev.secrets, [openStar.id]: true } }))}
          onBack={() => go('sky')}
        />
      )}
      {openStar?.type === 'lugares' && <LugaresLayer star={openStar} onBack={() => go('sky')} />}
      <Grain />
    </div>
  );
}

function useReduced() {
  const [value, setValue] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setValue(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return value;
}

function Gate({ doc, onUnlock }: { doc: UniverseDocument; onUnlock: () => void }) {
  const [value, setValue] = useState('');
  const [wrong, setWrong] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!samePhrase(value, doc.gate.phrase)) {
      haptic('light');
      setWrong(true);
      return;
    }
    haptic('success');
    onUnlock();
  };
  return (
    <form onSubmit={submit} className="absolute inset-0 z-20 flex flex-col items-center justify-center px-8 text-center">
      {doc.gate.eyebrow && (
        <p className="mb-4 text-[12px] uppercase tracking-[0.28em] text-gold/80">{doc.gate.eyebrow}</p>
      )}
      <p className="font-display text-[2.7rem] italic leading-none text-paper">{doc.intro.forName || 'Universo'}</p>
      <p className="mt-6 max-w-[18ch] text-[15px] leading-relaxed text-paper/55">{doc.gate.line}</p>
      <input
        type="password"
        value={value}
        autoComplete="off"
        autoCapitalize="off"
        spellCheck={false}
        onChange={(e) => {
          setValue(e.target.value);
          setWrong(false);
        }}
        className="mt-10 w-full max-w-[16rem] border-b border-paper/25 bg-transparent py-3 text-center text-[16px] tracking-[0.16em] outline-none"
      />
      {wrong && <p className="mt-4 text-[13px] text-dust">Esa no es.</p>}
      <button type="submit" className="mt-10 text-[13px] uppercase tracking-[0.32em] text-gold">
        Entrar →
      </button>
    </form>
  );
}

function IntroHud({ doc, onEnter }: { doc: UniverseDocument; onEnter: () => void }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-end">
      <div className="animate-rise mb-[9vh] flex flex-col items-center px-8 text-center">
        {doc.intro.motto && (
          <p className="font-display text-[1.35rem] italic leading-snug text-paper/80">{doc.intro.motto}</p>
        )}
        <button type="button" onClick={onEnter} className="pointer-events-auto mt-7 text-[13px] uppercase tracking-[0.28em] text-gold">
          {doc.intro.cta || 'Entrar'} →
        </button>
      </div>
    </div>
  );
}

function TitleMark({ doc, entered, onOpen }: { doc: UniverseDocument; entered: boolean; onOpen: () => void }) {
  const origin = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="absolute -translate-x-1/2 -translate-y-1/2 text-center"
      style={{ left: TITLE_AT.x, top: TITLE_AT.y, width: entered ? undefined : 280, pointerEvents: entered ? 'auto' : 'none' }}
      onPointerDown={entered ? (e) => { origin.current = { x: e.clientX, y: e.clientY }; } : undefined}
      onClick={
        entered
          ? (e) => {
              const o = origin.current;
              if (o && Math.hypot(e.clientX - o.x, e.clientY - o.y) > 12) return;
              onOpen();
            }
          : undefined
      }
    >
      {entered ? (
        <p className="whitespace-nowrap px-3 font-display text-[1.55rem] italic leading-none text-paper">{skyName(doc)}</p>
      ) : (
        <>
          <p className="font-display italic leading-none text-paper">
            <span className="text-[1.25rem]">Para </span>
            <span className="text-[2.45rem]">{doc.intro.forName.trim() || '…'}</span>
          </p>
          {doc.intro.fromName.trim() && (
            <p className="mt-2 font-display text-[1.2rem] italic text-paper/75">de {doc.intro.fromName.trim()}</p>
          )}
          {doc.intro.dedication.trim() && (
            <p className="mx-auto mt-4 max-w-[24ch] text-[15px] leading-relaxed text-paper/65">{doc.intro.dedication}</p>
          )}
        </>
      )}
    </div>
  );
}

function Constellation({ stars, entered }: { stars: Star[]; entered: boolean }) {
  const glow = useId().replace(/:/g, '');
  const links = stars.slice(1).flatMap((star, i) => {
    const prev = stars[i];
    const d = arcBetween(prev, star);
    return d ? [{ id: `${prev.id}-${star.id}`, d }] : [];
  });
  return (
    <svg className="pointer-events-none absolute inset-0 overflow-visible" width={WORLD.width} height={WORLD.height} viewBox={`0 0 ${WORLD.width} ${WORLD.height}`}>
      <defs>
        <linearGradient id={glow} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="var(--gold)" stopOpacity="0.55" />
          <stop offset="0.5" stopColor="var(--gold)" stopOpacity="1" />
          <stop offset="1" stopColor="var(--gold)" stopOpacity="0.55" />
        </linearGradient>
      </defs>
      {links.map((link) => (
        <g key={link.id} style={{ opacity: entered ? 1 : 0, transition: 'opacity 1.1s ease' }}>
          <path d={link.d} fill="none" stroke="var(--gold)" strokeOpacity="0.22" strokeWidth="8" strokeLinecap="round" />
          <path d={link.d} fill="none" stroke={`url(#${glow})`} strokeWidth="1.35" strokeLinecap="round" />
        </g>
      ))}
    </svg>
  );
}

function arcBetween(a: Star, b: Star) {
  const lift = 26;
  const ax = a.x;
  const ay = a.y - lift;
  const bx = b.x;
  const by = b.y - lift;
  const dx = bx - ax;
  const dy = by - ay;
  const len = Math.hypot(dx, dy);
  if (len < 70) return null;
  const ux = dx / len;
  const uy = dy / len;
  const trim = Math.min(22, len * 0.08);
  const x1 = ax + ux * trim;
  const y1 = ay + uy * trim;
  const x2 = bx - ux * trim;
  const y2 = by - uy * trim;
  let px = -uy;
  let py = ux;
  if (py > 0) {
    px *= -1;
    py *= -1;
  }
  const bow = Math.min(110, Math.max(36, len * 0.14));
  const cx = (x1 + x2) / 2 + px * bow;
  const cy = (y1 + y2) / 2 + py * bow;
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

function StarNode({
  star,
  index,
  visible,
  selected,
  compose,
  clientToWorld,
  onSelect,
  onOpen,
  onMove,
}: {
  star: Star;
  index: number;
  visible: boolean;
  selected: boolean;
  compose: boolean;
  clientToWorld: (x: number, y: number) => { x: number; y: number };
  onSelect: () => void;
  onOpen: () => void;
  onMove: (x: number, y: number) => void;
}) {
  const drag = useRef<{ ox: number; oy: number; sx: number; sy: number; moved: boolean } | null>(null);
  const liveRef = useRef<{ x: number; y: number } | null>(null);
  const skipClick = useRef(false);
  const [live, setLive] = useState<{ x: number; y: number } | null>(null);
  const pos = live ?? star;

  const down = (e: ReactPointerEvent) => {
    if (compose) e.stopPropagation();
    const world = clientToWorld(e.clientX, e.clientY);
    drag.current = { ox: pos.x - world.x, oy: pos.y - world.y, sx: e.clientX, sy: e.clientY, moved: false };
    if (compose) e.currentTarget.setPointerCapture(e.pointerId);
  };

  const move = (e: ReactPointerEvent) => {
    if (!drag.current) return;
    if (Math.hypot(e.clientX - drag.current.sx, e.clientY - drag.current.sy) > 8) drag.current.moved = true;
    if (!compose || !drag.current.moved) return;
    const world = clientToWorld(e.clientX, e.clientY);
    const next = {
      x: clamp(Math.round(world.x + drag.current.ox), 180, WORLD.width - 180),
      y: clamp(Math.round(world.y + drag.current.oy), 160, WORLD.height - 160),
    };
    liveRef.current = next;
    setLive(next);
  };

  const up = () => {
    const was = drag.current;
    const placed = liveRef.current;
    drag.current = null;
    liveRef.current = null;
    if (was?.moved && placed && compose) {
      skipClick.current = true;
      onMove(placed.x, placed.y);
    }
    setLive(null);
  };

  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onClick={(e) => {
        e.stopPropagation();
        if (skipClick.current) {
          skipClick.current = false;
          return;
        }
        if (compose) onSelect();
        else onOpen();
      }}
      onDoubleClick={(e) => {
        e.stopPropagation();
        if (compose) onOpen();
      }}
      className="absolute flex h-[210px] w-[230px] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center text-center"
      style={{
        left: pos.x,
        top: pos.y,
        opacity: visible ? 1 : 0,
        transition: live ? 'none' : 'opacity 0.7s ease',
        transitionDelay: `${80 + index * 50}ms`,
        pointerEvents: visible ? 'auto' : 'none',
      }}
    >
      <span className="relative mb-2 grid h-16 w-16 place-items-center">
        {selected && <span className="absolute inset-[-6px] rounded-full border border-gold/80" />}
        <span className="absolute inset-0 rounded-full bg-gold/10 blur-md" />
        <span className="relative text-3xl">{star.glyph}</span>
      </span>
      <span className="text-[10px] uppercase tracking-[0.28em] text-gold/70">{star.kicker}</span>
      <span className="mt-1 max-w-[12ch] font-display text-[1.3rem] italic leading-tight text-paper">{star.label}</span>
    </button>
  );
}
