import { useEffect, useMemo, useState } from 'react';
import { saveUniverse } from '@/lib/cloud';
import { copyText, slugify } from '@/lib/motion';
import { siteRoot } from '@/lib/site';
import { hashPhrase } from '@/lib/unlock';
import { isCita, type ProjectDocument } from '@/schema/project';

type Health = { urls: string[] };

function forNameOf(doc: ProjectDocument) {
  return isCita(doc) ? doc.forName : doc.intro.forName;
}

export function PublishDialog({
  doc,
  onClose,
  onPublished,
}: {
  doc: ProjectDocument;
  onClose: () => void;
  onPublished: (doc: ProjectDocument) => void;
}) {
  const suggestion = useMemo(
    () => doc.meta.slug || slugify(forNameOf(doc) ? `para-${forNameOf(doc)}` : doc.meta.title),
    [doc],
  );
  const [slug, setSlug] = useState(suggestion);
  const [urls, setUrls] = useState<string[]>(() => [siteRoot()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [qr, setQr] = useState('');
  const [phrase, setPhrase] = useState('');
  const [clearLock, setClearLock] = useState(false);
  const hasLock = Boolean(doc.meta.unlockHash);

  useEffect(() => {
    if (import.meta.env.PROD) return;
    void fetch('/api/health')
      .then((res) => res.json())
      .then((data: Health) => {
        if (Array.isArray(data.urls) && data.urls.length) setUrls(data.urls);
      })
      .catch(() => undefined);
  }, []);

  const phone =
    urls.find((url) => /https?:\/\/(192\.168\.|10\.)/.test(url)) ??
    urls.find((url) => !url.includes('localhost') && !url.includes('127.0.0.1')) ??
    urls[0];
  const draftLink = `${phone}/p/${doc.meta.id}`;
  const liveLink = doc.meta.status === 'published' && doc.meta.slug ? `${phone}/u/${doc.meta.slug}` : '';
  const shareLink = liveLink || draftLink;

  useEffect(() => {
    let cancel = false;
    void import('qrcode')
      .then((QR) => QR.toDataURL(shareLink, { margin: 1, width: 360, color: { dark: '#1b1612', light: '#ffffff' } }))
      .then((url) => {
        if (!cancel) setQr(url);
      })
      .catch(() => {
        if (!cancel) setQr('');
      });
    return () => {
      cancel = true;
    };
  }, [shareLink]);

  const copy = async (value: string) => {
    await copyText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const publish = async () => {
    const nextSlug = slugify(slug);
    setBusy(true);
    setError('');
    let unlockHash = doc.meta.unlockHash;
    if (clearLock) unlockHash = undefined;
    else if (phrase.trim()) unlockHash = await hashPhrase(phrase.trim());
    const next: ProjectDocument = {
      ...doc,
      meta: {
        ...doc.meta,
        slug: nextSlug,
        status: 'published',
        publishedAt: new Date().toISOString(),
        unlockHash,
      },
    };
    try {
      await saveUniverse(next);
      onPublished(next);
      setSlug(nextSlug);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#1b1612]/40 p-3 sm:place-items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-[28px] bg-linen p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">El enlace</p>
        <h2 className="mt-2 font-display text-4xl italic leading-none">Para el móvil</h2>
        <p className="mt-3 text-[15px] leading-relaxed text-inkwell/65">
          El regalo vive en tu cuenta. Escanea el código: abre el universo, no la portada de Lumen.
        </p>

        {qr && (
          <div className="mt-5 flex flex-col items-center rounded-2xl bg-white p-4 ring-1 ring-black/10">
            <img src={qr} alt="" width={180} height={180} className="h-[180px] w-[180px]" />
            <p className="mt-3 text-center text-[12px] uppercase tracking-[0.16em] text-inkwell/45">
              {liveLink ? 'El regalo' : 'El borrador, se actualiza solo'}
            </p>
          </div>
        )}

        <LinkBlock label={liveLink ? 'Enlace del regalo' : 'Borrador en vivo'} href={shareLink} copied={copied === shareLink} onCopy={() => void copy(shareLink)} />
        {liveLink && <LinkBlock label="Borrador en vivo" href={draftLink} copied={copied === draftLink} onCopy={() => void copy(draftLink)} />}

        <div className="mt-6">
          <label className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Nombre del enlace</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-black/10">
            <span className="text-inkwell/35">/u/</span>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className="w-full bg-transparent py-3 outline-none" />
          </div>
          {doc.meta.slug && slugify(slug) !== doc.meta.slug && (
            <p className="mt-2 text-[12.5px] text-inkwell/50">Si cambias el enlace, el anterior deja de abrir.</p>
          )}
        </div>

        <div className="mt-6">
          <label className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Contraseña (opcional)</label>
          <input
            type="password"
            value={phrase}
            onChange={(e) => {
              setPhrase(e.target.value);
              if (e.target.value) setClearLock(false);
            }}
            placeholder={hasLock ? 'Hay una. Escribe para cambiarla.' : 'Solo quien la sepa abre el regalo'}
            className="mt-2 w-full rounded-2xl bg-white px-4 py-3 outline-none ring-1 ring-black/10"
          />
          {hasLock && (
            <label className="mt-3 flex items-center gap-2 text-[14px] text-inkwell/60">
              <input type="checkbox" checked={clearLock} onChange={(e) => setClearLock(e.target.checked)} />
              Quitar la contraseña
            </label>
          )}
        </div>

        {error && <p className="mt-4 text-[14px] text-[#8a3d32]">{error}</p>}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={onClose} className="text-[14px] text-inkwell/55">
            Cerrar
          </button>
          <button type="button" disabled={busy} onClick={() => void publish()} className="rounded-full bg-inkwell px-5 py-3 text-[14px] text-linen disabled:opacity-50">
            {doc.meta.status === 'published' ? 'Actualizar regalo' : 'Publicar regalo'}
          </button>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-inkwell/40">
          También desde este ordenador: {urls[0]}/u/{slugify(slug)}
        </p>
      </div>
    </div>
  );
}

function LinkBlock({ label, href, onCopy, copied }: { label: string; href: string; onCopy: () => void; copied: boolean }) {
  return (
    <div className="mt-5 rounded-2xl bg-white p-4 ring-1 ring-black/10">
      <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">{label}</p>
      <a href={href} className="mt-2 block break-all font-display text-[1.35rem] italic leading-snug text-inkwell">
        {href.replace(/^https?:\/\//, '')}
      </a>
      <button type="button" onClick={onCopy} className="mt-3 text-[13px] uppercase tracking-[0.16em] text-brass">
        {copied ? 'Copiado' : 'Copiar'}
      </button>
    </div>
  );
}
