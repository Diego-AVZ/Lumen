import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

type Row = { slug: string; title: string; forName: string; starCount: number };

export function GiftLinks({ tone = 'dark' }: { tone?: 'dark' | 'light' }) {
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!import.meta.env.DEV) {
      setRows([]);
      return;
    }
    void fetch('/api/universes', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : []))
      .then((data: Row[]) => setRows(Array.isArray(data) ? data.filter((row) => row.slug) : []))
      .catch(() => setRows([]));
  }, []);

  if (!rows || rows.length === 0) return null;

  const dark = tone === 'dark';
  return (
    <div className="mt-8 text-left">
      <p className={dark ? 'text-[11px] uppercase tracking-[0.18em] text-[#e8b86d]/80' : 'text-[11px] uppercase tracking-[0.18em] text-brass'}>
        Universos en este equipo
      </p>
      <ul className="mt-3 grid gap-2">
        {rows.map((row) => (
          <li key={row.slug}>
            <Link
              to={`/u/${row.slug}`}
              className={
                dark
                  ? 'block rounded-2xl bg-white/5 px-4 py-3 ring-1 ring-white/10'
                  : 'block rounded-2xl bg-white px-4 py-3 ring-1 ring-black/10'
              }
            >
              <span className={dark ? 'font-display text-2xl italic text-[#f3ead8]' : 'font-display text-2xl italic'}>
                {row.forName ? `Para ${row.forName}` : row.title || 'Universo'}
              </span>
              <span className={dark ? 'mt-1 block text-[12px] text-[#f3ead8]/45' : 'mt-1 block text-[12px] text-inkwell/45'}>
                /u/{row.slug}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
