import { useMemo, useState } from 'react';
import { euros } from '@/lib/plans';
import { priceOf } from '@/lib/pricing';
import type { ProjectDocument } from '@/schema/project';

export function PriceTag({ doc, detail = false }: { doc: ProjectDocument; detail?: boolean }) {
  const quote = useMemo(() => priceOf(doc), [doc]);
  const [open, setOpen] = useState(detail);
  const extras = quote.lines.filter((line) => line.id !== 'base' && line.cents > 0);

  return (
    <div className={detail ? '' : 'relative'}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-full bg-white px-3 py-1.5 text-[13px] text-inkwell ring-1 ring-black/10"
      >
        {euros(quote.totalCents)}
        <span className="ml-2 text-inkwell/40">al publicar</span>
      </button>
      {open && (
        <div className={`${detail ? 'mt-4' : 'absolute right-0 z-30 mt-2 w-72'} rounded-[22px] bg-white p-4 text-left text-inkwell shadow-[0_18px_40px_rgba(40,28,16,0.12)] ring-1 ring-black/5`}>
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Este regalo</p>
          <ul className="mt-3 space-y-2">
            {quote.lines.map((line) => (
              <li key={line.id} className="flex items-baseline justify-between gap-3 text-[14px]">
                <span>
                  {line.label}
                  <span className="mt-0.5 block text-[12px] text-inkwell/45">{line.note}</span>
                </span>
                <span className="shrink-0 tabular-nums">{line.cents ? euros(line.cents) : 'Incluido'}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 border-t border-black/5 pt-3 font-display text-2xl italic">{euros(quote.totalCents)}</p>
          {extras.length === 0 && <p className="mt-1 text-[12px] text-inkwell/45">Todavía cabe en la base.</p>}
        </div>
      )}
    </div>
  );
}
