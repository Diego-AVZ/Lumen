import { useState } from 'react';
import { spotifyEmbed } from '@/lib/spotify';

export function MusicDock({
  url,
  label,
  bare,
}: {
  url: string;
  label?: string;
  bare?: boolean;
}) {
  const embed = spotifyEmbed(url);
  const [open, setOpen] = useState(false);
  if (!url.trim()) return null;
  const name = label?.trim() || 'Escuchar';

  if (!embed) {
    return (
      <a href={url} target="_blank" rel="noreferrer" className={bare ? 'text-[12px] uppercase tracking-[0.2em] text-gold' : 'music-pill'}>
        {name} ↗
      </a>
    );
  }

  return (
    <div className={bare ? '' : 'music-dock'}>
      <button type="button" onClick={() => setOpen((value) => !value)} className={bare ? 'text-[12px] uppercase tracking-[0.2em] text-gold' : 'music-pill'}>
        <span aria-hidden>♪</span> {open ? 'Cerrar' : name}
      </button>
      {open && (
        <iframe
          title={name}
          src={embed.src}
          className="mt-2 h-[152px] w-full rounded-xl"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
        />
      )}
    </div>
  );
}
