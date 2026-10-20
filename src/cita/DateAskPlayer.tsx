import { useEffect, useRef, useState } from 'react';
import { haptic } from '@/lib/haptics';
import { pingVisit } from '@/lib/stats';
import { formatDateOption, type CitaSeal, type DateAskDocument, type DateOption } from '@/schema/cita';

const HINTS = ['Otra vez', 'El lacre cede', 'Sigue', 'Casi', 'Uno más'];
const SEAL_HINT: Record<CitaSeal, string> = {
  heart: 'Toca el corazón',
  star: 'Toca la estrella',
  bear: 'Toca el osito',
  dog: 'Toca al perro',
};
const NO_LINES = ['No', '¿Seguro?', 'Mmm…', 'El otro', 'Ni se te ocurra', 'Nooo'];

type Spark = { id: number; dx: string; dy: string };

export function DateAskPlayer({ doc, preview = false }: { doc: DateAskDocument; preview?: boolean }) {
  const [clicks, setClicks] = useState(0);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [open, setOpen] = useState(false);
  const [yes, setYes] = useState(false);
  const [picked, setPicked] = useState<DateOption | null>(null);
  const [sent, setSent] = useState(false);
  const [noTries, setNoTries] = useState(0);
  const [noGone, setNoGone] = useState(false);
  const [noPos, setNoPos] = useState({ x: 0, y: 0 });
  const [flee, setFlee] = useState(false);
  const [shake, setShake] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const noBtn = useRef<HTMLButtonElement>(null);
  const opened = clicks >= 6;
  const flap = Math.min(1, clicks / 6);
  const roaming = noTries > 0;
  const dates = doc.dates.filter((item) => item.label.trim() || item.when);
  const options = dates.length ? dates : [{ id: 'cuando', label: 'Cuando quieras', when: '' }];

  useEffect(() => {
    if (!opened) return;
    const t = window.setTimeout(() => setOpen(true), 720);
    return () => window.clearTimeout(t);
  }, [opened]);

  const tapHeart = () => {
    setClicks((current) => {
      if (current >= 6) return current;
      haptic(current >= 5 ? 'success' : 'medium');
      return current + 1;
    });
    setSparks((prev) =>
      [
        ...prev,
        ...Array.from({ length: 8 }, (_, i) => ({
          id: Date.now() + i,
          dx: `${(Math.random() * 2 - 1) * 64}px`,
          dy: `${-16 - Math.random() * 80}px`,
        })),
      ].slice(-32),
    );
  };

  const localPoint = (clientX: number, clientY: number) => {
    const el = stage.current;
    if (!el) return { x: 0, y: 0 };
    const box = el.getBoundingClientRect();
    const sx = box.width / Math.max(1, el.clientWidth);
    const sy = box.height / Math.max(1, el.clientHeight);
    return { x: (clientX - box.left) / sx, y: (clientY - box.top) / sy };
  };

  const jumpNo = () => {
    const el = stage.current;
    if (!el) return { x: 24, y: 120 };
    const w = el.clientWidth;
    const h = el.clientHeight;
    return {
      x: 12 + Math.random() * Math.max(48, w - 132),
      y: 88 + Math.random() * Math.max(48, h - 200),
    };
  };

  const onNo = () => {
    haptic('light');
    if (!preview) void pingVisit(doc.meta.id, 'no');
    const tries = noTries + 1;
    setNoTries(tries);
    setShake(true);
    window.setTimeout(() => setShake(false), 360);
    if (tries === 1) {
      setNoGone(true);
      window.setTimeout(() => {
        setNoPos(jumpNo());
        setNoGone(false);
        setFlee(true);
      }, 1000);
      return;
    }
    setFlee(true);
    setNoPos(jumpNo());
  };

  const onMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!flee || noGone || !noBtn.current || !stage.current) return;
    const pointer = localPoint(event.clientX, event.clientY);
    const rect = noBtn.current.getBoundingClientRect();
    const origin = localPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    const dx = pointer.x - origin.x;
    const dy = pointer.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist < 110) {
      const w = stage.current.clientWidth;
      const h = stage.current.clientHeight;
      const push = 96 / Math.max(dist, 10);
      setNoPos((prev) => ({
        x: Math.min(w - 96, Math.max(8, prev.x - dx * push * 0.45)),
        y: Math.min(h - 56, Math.max(56, prev.y - dy * push * 0.45)),
      }));
    }
  };

  const sayYes = () => {
    haptic('success');
    setYes(true);
    if (!preview) void pingVisit(doc.meta.id, 'reply', { dateId: '', dateLabel: 'Dijo que sí' });
  };

  const choose = (option: DateOption) => {
    setPicked(option);
    haptic('success');
    setSent(true);
    if (!preview) void pingVisit(doc.meta.id, 'reply', { dateId: option.id, dateLabel: formatDateOption(option) });
  };

  const letterY = opened ? -128 : 22 - flap * 42;
  const noStyle = roaming
    ? {
        left: noPos.x,
        top: noPos.y,
        position: 'absolute' as const,
        zIndex: 30,
      }
    : undefined;

  const noButton = !noGone && open && !yes && (
    <span className={shake ? 'cita-no-shake inline-flex' : 'inline-flex'} style={noStyle}>
      <button
        ref={noBtn}
        type="button"
        onClick={onNo}
        onPointerEnter={() => {
          if (flee) setNoPos(jumpNo());
        }}
        className="rounded-full bg-[#fffaf1] px-6 py-2.5 text-[15px] text-[#2a2118] ring-1 ring-black/15"
        style={{
          transform: roaming ? `scale(${Math.max(0.68, 1 - noTries * 0.07)}) rotate(${noTries > 2 ? (noTries - 2) * 11 : 0}deg)` : undefined,
        }}
      >
        {NO_LINES[Math.min(noTries, NO_LINES.length - 1)]}
      </button>
    </span>
  );

  return (
    <div ref={stage} className="cita-room relative flex h-full min-h-dvh flex-col items-center justify-center overflow-hidden px-5 py-10 text-[#f6ead8]" onPointerMove={onMove}>
      <p className="text-[11px] uppercase tracking-[0.22em] text-[#e8b86d]/80">
        {doc.fromName.trim() ? `De ${doc.fromName.trim()}` : 'Una cita'}
      </p>
      <h1 className="mt-2 max-w-[12ch] text-center font-display text-4xl italic leading-[0.95]">
        {doc.forName.trim() ? `Para ${doc.forName.trim()}` : 'Para ti'}
      </h1>

      {!open && (
        <>
          <div className="relative mt-10">
            <div className="cita-env">
              <div className="cita-pocket" />
              <div className="cita-letter" style={{ transform: `translateY(${letterY}px)`, opacity: 0.28 + flap * 0.55 }} />
              <div className="cita-front" />
              <div className="cita-flap" style={{ transform: `rotateX(${flap * 172}deg)` }} />
              {sparks.map((spark) => (
                <span key={spark.id} className="cita-burst" style={{ left: '50%', top: '42%', '--dx': spark.dx, '--dy': spark.dy } as React.CSSProperties} />
              ))}
              {doc.envelope.trim() && <p className="cita-envelope-line">{doc.envelope.trim()}</p>}
              <button
                type="button"
                className={`cita-seal ${clicks > 0 ? 'cita-seal-hot' : ''}`}
                data-seal={doc.seal}
                onClick={tapHeart}
                style={{
                  opacity: opened ? 0 : 1,
                  pointerEvents: opened ? 'none' : 'auto',
                  transform: `scale(${1 + clicks * 0.035})`,
                }}
                aria-label="Abrir el sobre"
              >
                <SealMark id={doc.seal} />
                <span className="cita-seal-ring" />
              </button>
            </div>
          </div>
          <p className="mt-8 text-[14px] text-[#f6ead8]/60">{opened ? 'Se abre…' : clicks === 0 ? SEAL_HINT[doc.seal] : HINTS[Math.min(clicks - 1, HINTS.length - 1)]}</p>
          <div className="mt-3 flex gap-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`h-1.5 w-6 rounded-full transition ${i < clicks ? 'bg-[#e8b86d]' : 'bg-white/15'}`} />
            ))}
          </div>
        </>
      )}

      {open && !yes && (
        <article className="animate-rise mt-8 w-full max-w-sm rounded-[8px] bg-[#fffaf1] px-6 py-7 text-[#2a2118] shadow-[0_24px_50px_rgba(20,10,8,0.35)]">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8a6232]">La nota</p>
          {doc.letter.trim() && <p className="mt-4 font-display text-[1.35rem] italic leading-snug">{doc.letter.trim()}</p>}
          <p className="mt-5 text-[1.55rem] leading-snug">{doc.question}</p>
          <div className="mt-8 flex min-h-[3.2rem] items-center gap-3">
            <button
              type="button"
              onClick={sayYes}
              className="rounded-full bg-[#1b1612] px-6 py-2.5 text-[15px] text-[#f3eee6] transition"
              style={{ transform: `scale(${1 + Math.min(noTries, 4) * 0.08})` }}
            >
              Sí
            </button>
            {!roaming && noButton}
          </div>
        </article>
      )}

      {roaming && noButton}

      {yes && !sent && (
        <div className="animate-rise mt-8 w-full max-w-sm">
          <p className="text-center text-[13px] uppercase tracking-[0.18em] text-[#e8b86d]">Elige un día</p>
          <ul className="cita-dates mt-5 grid gap-3">
            {options.map((item) => (
              <li key={item.id}>
                <button type="button" onClick={() => choose(item)} className="cita-date">
                  <span className="font-display text-2xl italic leading-tight">{formatDateOption(item)}</span>
                  <span className="mt-1 block text-[12px] uppercase tracking-[0.14em] text-[#8a6232]">Ese</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {sent && (
        <div className="animate-rise mt-10 max-w-sm text-center">
          <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b86d]">Dicho</p>
          <p className="mt-4 font-display text-5xl italic leading-[0.95]">Entonces es un sí.</p>
          {picked && <p className="mt-4 text-[17px] text-[#f6ead8]/70">{formatDateOption(picked)}</p>}
          <p className="mt-6 text-[15px] text-[#f6ead8]/50">{preview ? 'Así lo verá.' : 'Ya se lo he contado.'}</p>
        </div>
      )}
    </div>
  );
}

function SealMark({ id }: { id: CitaSeal }) {
  if (id === 'star') {
    return (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2.4 14.7 8.8 21.6 9.4 16.4 14l1.6 6.7L12 17.6 6 20.7 7.6 14 2.4 9.4 9.3 8.8 12 2.4z" />
      </svg>
    );
  }
  if (id === 'bear') {
    return (
      <svg width="30" height="28" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <circle cx="6.2" cy="6.2" r="3.1" />
        <circle cx="17.8" cy="6.2" r="3.1" />
        <circle cx="12" cy="13.2" r="7.2" />
        <circle cx="9.4" cy="12.4" r="0.9" fill="#5c3318" />
        <circle cx="14.6" cy="12.4" r="0.9" fill="#5c3318" />
        <ellipse cx="12" cy="14.6" rx="1.3" ry="0.9" fill="#5c3318" />
      </svg>
    );
  }
  if (id === 'dog') {
    return (
      <svg width="34" height="22" viewBox="0 0 34 22" fill="currentColor" aria-hidden="true">
        <ellipse cx="20" cy="11" rx="10" ry="5.2" />
        <circle cx="8.5" cy="9.2" r="4.3" />
        <ellipse cx="4.2" cy="11.4" rx="2.2" ry="1.3" transform="rotate(-20 4.2 11.4)" />
        <path d="M6.2 6.2c-.2-2.4 1.2-3.6 2.4-2.2" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="7.2" cy="8.6" r="0.55" fill="#3a2418" />
        <path d="M13.5 15.2v3.2M18.2 15.6v3.4M23.2 15.4v3.1M27.4 14.6v2.8" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M29.2 9.2c2.4.2 3.6 1.2 3.2 2.2-.6 1.4-2.8.8-3.4-.2" />
      </svg>
    );
  }
  return (
    <svg width="28" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 21s-6.2-4.35-9.2-8.22C.7 10.2.9 6.7 3.4 4.9 5.4 3.4 8 3.7 12 7.2c4-3.5 6.6-3.8 8.6-2.3 2.5 1.8 2.7 5.3.6 7.88C18.2 16.65 12 21 12 21z" />
    </svg>
  );
}
