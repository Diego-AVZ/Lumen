import { useEffect, useState } from 'react';
import { listDrafts, type DraftSummary } from '@/lib/drafts';
import type { Attachment, AttachKind } from '@/schema/attach';

const NAMES: Record<AttachKind, string> = {
  cita: 'sobre',
  viaje: 'viaje',
};

export function AttachPicker({
  kind,
  value,
  onChange,
}: {
  kind: AttachKind;
  value: Attachment | null;
  onChange: (next: Attachment | null) => void;
}) {
  const [rows, setRows] = useState<DraftSummary[] | null>(null);

  useEffect(() => {
    let stop = false;
    void listDrafts().then((all) => {
      if (!stop) setRows(all.filter((row) => row.kind === kind));
    });
    return () => {
      stop = true;
    };
  }, [kind]);

  const published = (rows ?? []).filter((row) => row.status === 'published' && row.slug);
  const waiting = (rows ?? []).filter((row) => !(row.status === 'published' && row.slug));

  return (
    <div>
      <p className="text-[12px] leading-relaxed text-inkwell/50">
        Solo entra un {NAMES[kind]} ya publicado. Se paga al publicarlo, aparte de este proyecto.
      </p>
      {value && (
        <p className="mt-2 rounded-2xl bg-white px-3 py-2 text-[13px] ring-1 ring-black/10">
          {value.title || 'Sin título'}
          {value.slug ? '' : ' · todavía no tiene enlace'}
        </p>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => onChange(null)}
          className={`rounded-full px-2.5 py-1 text-[12px] ${!value ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
        >
          Ninguno
        </button>
        {published.map((row) => {
          const on = value?.id === row.id;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => onChange({ kind, id: row.id, slug: row.slug, title: row.title })}
              className={`rounded-full px-2.5 py-1 text-[12px] ${on ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
            >
              {row.title || 'Sin título'}
            </button>
          );
        })}
      </div>
      {rows && published.length === 0 && (
        <p className="mt-2 text-[12px] text-inkwell/45">No hay ningún {NAMES[kind]} publicado.</p>
      )}
      {waiting.length > 0 && (
        <p className="mt-2 text-[12px] leading-relaxed text-inkwell/40">
          Sin publicar: {waiting.map((row) => row.title || 'Sin título').join(', ')}. Primero se envían y se pagan.
        </p>
      )}
    </div>
  );
}
