import type { TemplateId } from '@/hub/catalog';

const UNIVERSE_STARS = [
  { left: '18%', top: '22%', size: 3, delay: '0s' },
  { left: '72%', top: '16%', size: 2, delay: '0.4s' },
  { left: '28%', top: '58%', size: 2, delay: '0.9s' },
  { left: '80%', top: '48%', size: 3, delay: '1.3s' },
  { left: '52%', top: '78%', size: 2, delay: '1.8s' },
  { left: '12%', top: '82%', size: 2, delay: '2.2s' },
];

export function GiftPeek({ id }: { id: TemplateId }) {
  return (
    <div className="gift-peek pointer-events-none" aria-hidden>
      <div className="gift-peek-bob">
        <div className="gift-phone">
          <span className="gift-notch" />
          <div className="gift-screen">
            {id === 'universo' && <UniverseMini />}
            {id === 'deseos' && <DeseosMini />}
            {id === 'cita' && <CitaMini />}
            {id === 'carta' && <CartaMini />}
            {id === 'album' && <AlbumMini />}
            {id === 'mapa' && <MapaMini />}
            {id === 'web' && <WebMini />}
          </div>
        </div>
      </div>
    </div>
  );
}

function UniverseMini() {
  return (
    <div className="relative h-full overflow-hidden bg-[#0c0b0a]">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(232,184,109,0.22),transparent_52%)]" />
      {UNIVERSE_STARS.map((star) => (
        <span
          key={`${star.left}${star.top}`}
          className="gift-mini-star"
          style={{
            left: star.left,
            top: star.top,
            width: star.size,
            height: star.size,
            animationDelay: star.delay,
          }}
        />
      ))}
      <span className="gift-mini-fall" />
      <div className="absolute inset-x-0 top-[42%] text-center text-[#f3ead8]">
        <p className="text-[7px] uppercase tracking-[0.22em] text-[#e8b86d]/70">Para</p>
        <p className="mt-1 font-display text-[1.35rem] italic leading-none">Clara</p>
      </div>
    </div>
  );
}

function DeseosMini() {
  return (
    <div className="relative flex h-full flex-col justify-center bg-[#1b1612] px-3 text-[#f3ead8]">
      <p className="text-[6px] uppercase tracking-[0.18em] text-[#e8b86d]">Ruleta</p>
      <p className="mt-2 font-display text-[1.05rem] italic leading-none">El finde en la costa</p>
      <span className="mt-3 block h-px w-10 bg-[#e8b86d]/40" />
      <p className="mt-2 text-[7px] uppercase tracking-[0.14em] text-[#f3ead8]/50">Fin de semana</p>
    </div>
  );
}

function CitaMini() {
  return (
    <div className="relative flex h-full flex-col items-center justify-center overflow-hidden bg-[#140e0c] px-2">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_18%,rgba(232,184,109,0.2),transparent_50%)]" />
      <p className="relative text-[6px] uppercase tracking-[0.2em] text-[#e8b86d]/75">Para ti</p>
      <div className="gift-mini-env relative mt-3">
        <span className="gift-mini-pocket" />
        <span className="gift-mini-letter" />
        <span className="gift-mini-front" />
        <span className="gift-mini-flap" />
        <span className="gift-mini-seal">
          <svg width="9" height="9" viewBox="0 0 24 24" fill="#fff6ea" aria-hidden>
            <path d="M12 21s-7.2-4.6-9.4-9.1C1.2 8.7 3 5.5 6.4 5.5c2 0 3.3 1.1 3.6 2.1.3-1 1.6-2.1 3.6-2.1 3.4 0 5.2 3.2 3.8 6.4C19.2 16.4 12 21 12 21z" />
          </svg>
          <span className="gift-mini-ring" />
        </span>
      </div>
    </div>
  );
}

function CartaMini() {
  return (
    <div className="relative flex h-full items-center justify-center overflow-hidden bg-[#1a1014] px-3">
      <div className="gift-mini-sheet">
        <p className="text-[6px] uppercase tracking-[0.18em] text-brass">Carta</p>
        <p className="mt-2 font-display text-[0.95rem] italic leading-[0.95] text-inkwell">Quería que tuvieras un sitio al que volver.</p>
        <span className="mt-3 block h-px w-10 bg-black/15" />
        <span className="mt-1.5 block h-px w-14 bg-black/10" />
        <span className="mt-1.5 block h-px w-8 bg-black/10" />
      </div>
    </div>
  );
}

function AlbumMini() {
  return (
    <div className="relative h-full overflow-hidden bg-[#1a140f]">
      <div className="absolute left-[18%] top-[28%] h-16 w-14 rotate-[-11deg] bg-[#f4ead8] p-1 shadow-[0_10px_18px_rgba(0,0,0,0.35)]">
        <span className="block h-10 w-full bg-[#6a4a32]" />
      </div>
      <div className="gift-mini-polaroid absolute right-[16%] top-[34%] h-[4.4rem] w-16 rotate-[8deg] bg-[#f7f1e4] p-1 shadow-[0_12px_20px_rgba(0,0,0,0.4)]">
        <span className="block h-12 w-full bg-[#8a6232]" />
      </div>
    </div>
  );
}

function WebMini() {
  return (
    <div className="relative flex h-full flex-col bg-[#f6efe6] px-3 pt-8 text-[#1b1612]">
      <p className="text-[6px] uppercase tracking-[0.18em] text-[#8a6232]">Para Clara</p>
      <p className="mt-1 font-display text-[1.05rem] italic leading-none">Una web</p>
      <span className="mt-3 grid h-7 w-7 place-items-center rounded-full bg-[#b4233a] text-[11px] text-white">♥</span>
      <span className="mt-3 block h-px w-10 bg-black/15" />
      <span className="mt-2 block h-px w-14 bg-black/10" />
    </div>
  );
}

function MapaMini() {
  return (
    <div className="relative h-full overflow-hidden bg-[#071018]">
      <div
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'linear-gradient(rgba(232,184,109,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(232,184,109,0.12) 1px, transparent 1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <span className="gift-mini-pin" />
      <p className="absolute inset-x-0 bottom-8 text-center font-display text-[0.85rem] italic text-[#f3ead8]">Aquí</p>
    </div>
  );
}
