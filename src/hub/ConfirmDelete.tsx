export function ConfirmDelete({
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#12100e]/50 px-5" onClick={onCancel}>
      <div
        role="dialog"
        aria-labelledby="delete-title"
        className="w-full max-w-md rounded-[28px] bg-linen p-7 text-inkwell shadow-[0_24px_60px_rgba(20,14,10,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Eliminar proyecto</p>
        <h2 id="delete-title" className="mt-3 font-display text-[2.4rem] italic leading-[0.95]">
          {title}
        </h2>
        <p className="mt-4 text-[15px] leading-relaxed text-inkwell/60">
          Se borra de este equipo, del enlace publicado y de la cuenta. No se puede deshacer.
        </p>
        <div className="mt-7 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="rounded-full bg-[#8a3d32] px-5 py-2.5 text-[14px] text-linen disabled:opacity-40"
          >
            {busy ? 'Eliminando…' : 'Eliminar'}
          </button>
          <button type="button" onClick={onCancel} className="rounded-full px-5 py-2.5 text-[14px] ring-1 ring-black/10">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
