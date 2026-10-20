export function WaitMark({
  line = 'Trayendo tus proyectos',
  tone = 'card',
}: {
  line?: string;
  tone?: 'card' | 'inline';
}) {
  return (
    <div
      className={
        tone === 'inline'
          ? 'lumen-wait mt-5 flex items-center gap-3'
          : 'lumen-wait mt-10 flex items-center gap-4 rounded-[28px] bg-white px-6 py-7 ring-1 ring-black/5'
      }
      role="status"
      aria-live="polite"
    >
      <span className="lumen-wait-mark" aria-hidden>
        <span />
        <span />
        <span />
      </span>
      <div>
        <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Un momento</p>
        <p className={`mt-1 font-display italic leading-none ${tone === 'inline' ? 'text-[1.45rem]' : 'text-[1.85rem]'}`}>
          {line}
        </p>
      </div>
    </div>
  );
}
