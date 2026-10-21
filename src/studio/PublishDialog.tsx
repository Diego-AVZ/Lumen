import { useEffect, useMemo, useRef, useState } from 'react';
import { saveUniverse } from '@/lib/cloud';
import { copyText, giftTagOf, makeGiftSlug, shortTag, slugify } from '@/lib/motion';
import { euros } from '@/lib/plans';
import { priceOf } from '@/lib/pricing';
import { claimPurchase, listPurchases, openPlans, paidToward, usePurchases } from '@/lib/purchases';
import { siteRoot } from '@/lib/site';
import { hashPhrase } from '@/lib/unlock';
import { PayModal } from '@/hub/PayModal';
import { InviteSheet } from '@/studio/InviteSheet';
import { citaEyebrowText } from '@/schema/cita';
import { extendMaintenance } from '@/schema/deseos';
import { isCita, isDeseos, isWeb, type ProjectDocument } from '@/schema/project';

type Health = { urls: string[] };

function forNameOf(doc: ProjectDocument) {
  if (isCita(doc)) return doc.forName;
  if (isDeseos(doc)) return doc.listName;
  return doc.intro.forName;
}

function fromNameOf(doc: ProjectDocument) {
  if (isCita(doc)) return doc.fromName;
  if (isDeseos(doc)) return doc.ownerName;
  return doc.intro.fromName;
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
  const frozen = Boolean(doc.meta.slug && doc.meta.status === 'published');
  const suggestion = useMemo(() => {
    if (doc.meta.slug) return giftTagOf(doc.meta.slug) ? doc.meta.slug.replace(/-[a-z0-9]{6}$/, '') : doc.meta.slug;
    return slugify(forNameOf(doc) ? `para-${forNameOf(doc)}` : doc.meta.title);
  }, [doc]);
  const [slug, setSlug] = useState(suggestion);
  const [tag] = useState(() => giftTagOf(doc.meta.slug) || shortTag());
  const [urls, setUrls] = useState<string[]>(() => [siteRoot()]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [invite, setInvite] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [clearLock, setClearLock] = useState(false);
  const [paying, setPaying] = useState(false);
  const hasLock = Boolean(doc.meta.unlockHash);
  const quote = useMemo(() => priceOf(doc), [doc]);
  const { rows, refresh } = usePurchases();
  const paid = paidToward(rows ?? [], doc.meta.id);
  const due = Math.max(0, quote.totalCents - paid);
  const attached = useRef(false);

  useEffect(() => {
    if (attached.current) return;
    attached.current = true;
    let cancel = false;
    void (async () => {
      let current = await listPurchases();
      let covered = paidToward(current, doc.meta.id);
      while (!cancel && covered < quote.totalCents) {
        const next = openPlans(current, quote.family)[0];
        if (!next) break;
        try {
          await claimPurchase(next, doc.meta.id);
        } catch {
          break;
        }
        current = await listPurchases();
        covered = paidToward(current, doc.meta.id);
      }
      if (!cancel) await refresh();
    })();
    return () => {
      cancel = true;
    };
  }, [doc.meta.id, quote.family, quote.totalCents, refresh]);

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
  const previewSlug = frozen ? doc.meta.slug : `${slugify(slug)}-${tag}`;
  const liveLink = doc.meta.status === 'published' && doc.meta.slug ? `${phone}/u/${doc.meta.slug}` : '';
  const shareLink = liveLink || draftLink;
  const publicLink = liveLink || `${phone}/u/${previewSlug}`;
  const forName = forNameOf(doc).trim();
  const fromName = fromNameOf(doc).trim();
  const dedication = isCita(doc) || isDeseos(doc) ? '' : isWeb(doc) ? doc.intro.line.trim() : doc.intro.dedication.trim();

  const copy = async (value: string) => {
    await copyText(value);
    setCopied(value);
    window.setTimeout(() => setCopied(''), 1600);
  };

  const publish = async () => {
    setBusy(true);
    setError('');
    let unlockHash = doc.meta.unlockHash;
    if (clearLock) unlockHash = undefined;
    else if (phrase.trim()) unlockHash = await hashPhrase(phrase.trim());
    let nextSlug = frozen ? doc.meta.slug : `${slugify(slug)}-${tag}`;
    try {
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const stamped = isDeseos(doc) && !doc.maintainedUntil ? extendMaintenance(doc) : doc;
        const next: ProjectDocument = {
          ...stamped,
          meta: {
            ...doc.meta,
            slug: nextSlug,
            status: 'published',
            publishedAt: doc.meta.publishedAt ?? new Date().toISOString(),
            unlockHash,
          },
        };
        try {
          await saveUniverse(next);
          onPublished(next);
          setSlug(nextSlug);
          return;
        } catch (err) {
          const message = err instanceof Error ? err.message : '';
          if (frozen || attempt === 3 || !/duplicate|unique|23505/i.test(message)) throw err;
          nextSlug = makeGiftSlug(slug);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo publicar.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <div className="fixed inset-0 z-50 grid place-items-end bg-[#1b1612]/40 p-3 sm:place-items-center" onClick={onClose}>
      <div className="max-h-[92dvh] w-full max-w-lg overflow-auto rounded-[28px] bg-linen p-6 shadow-2xl sm:p-8" onClick={(e) => e.stopPropagation()}>
        <p className="text-[11px] uppercase tracking-[0.22em] text-brass">Enviar</p>
        <h2 className="mt-2 font-display text-4xl italic leading-none">
          {due > 0 ? 'Pagar y publicar' : doc.meta.status === 'published' ? 'Actualizar' : 'Publicar'}
        </h2>
        <p className="mt-3 text-[15px] leading-relaxed text-inkwell/65">
          El precio lo has ido viendo al crearlo. Pagar lo publica. Si luego lo cambias y sigues dentro de lo pagado, actualizar no cobra.
        </p>
        <ul className="mt-4 space-y-2 rounded-[22px] bg-white px-4 py-4 ring-1 ring-black/5">
          {quote.lines.map((line) => (
            <li key={line.id} className="flex items-baseline justify-between gap-3 text-[14px]">
              <span>
                {line.label}
                <span className="ml-2 text-[12px] text-inkwell/40">{line.note}</span>
              </span>
              <span className="tabular-nums">{line.cents ? euros(line.cents) : 'Incluido'}</span>
            </li>
          ))}
          <li className="flex flex-wrap items-center justify-between gap-3 border-t border-black/5 pt-3">
            <span>
              <span className="block font-display text-2xl italic">{due > 0 ? 'Falta' : 'Dentro de lo pagado'}</span>
              <span className="font-display text-3xl italic">{due > 0 ? euros(due) : euros(quote.totalCents)}</span>
            </span>
            {due > 0 ? (
              <button type="button" onClick={() => setPaying(true)} className="rounded-full bg-inkwell px-5 py-3 text-[14px] text-linen">
                Pagar y publicar
              </button>
            ) : (
              <button type="button" disabled={busy} onClick={() => void publish()} className="rounded-full bg-inkwell px-5 py-3 text-[14px] text-linen disabled:opacity-50">
                {busy ? 'Publicando…' : doc.meta.status === 'published' ? 'Actualizar' : 'Publicar'}
              </button>
            )}
          </li>
        </ul>

        <button type="button" onClick={() => setInvite(true)} className="mt-4 w-full rounded-[22px] bg-white px-5 py-4 text-left ring-1 ring-black/10">
          <span className="text-[11px] uppercase tracking-[0.16em] text-brass">Sin pagar</span>
          <span className="mt-1 block font-display text-3xl italic">Diseñar la invitación</span>
          <span className="mt-1 block text-[14px] leading-relaxed text-inkwell/55">
            JPG para el móvil y PDF para enviarlo. El botón abre {isCita(doc) ? 'el sobre' : isDeseos(doc) ? 'la lista' : isWeb(doc) ? 'la web' : 'el universo'}.
          </span>
        </button>

        <LinkBlock label={liveLink ? 'Enlace del regalo' : 'Borrador en vivo'} href={shareLink} copied={copied === shareLink} onCopy={() => void copy(shareLink)} />
        {liveLink && <LinkBlock label="Borrador en vivo" href={draftLink} copied={copied === draftLink} onCopy={() => void copy(draftLink)} />}

        <div className="mt-6">
          <label className="text-[11px] uppercase tracking-[0.16em] text-inkwell/45">Nombre del enlace</label>
          <div className="mt-2 flex items-center gap-2 rounded-2xl bg-white px-3 ring-1 ring-black/10">
            <span className="text-inkwell/35">/u/</span>
            <input
              value={frozen ? doc.meta.slug : slug}
              onChange={(e) => setSlug(e.target.value)}
              readOnly={frozen}
              className="w-full bg-transparent py-3 outline-none"
            />
          </div>
          <p className="mt-2 text-[12.5px] leading-relaxed text-inkwell/50">
            {frozen
              ? 'Este enlace ya está publicado. Si lo cambias, el anterior deja de abrir.'
              : `Quedará /u/${previewSlug}. El final es único, para que dos “para-candela” no se pisen.`}
          </p>
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

        <div className="mt-6">
          <button type="button" onClick={onClose} className="text-[14px] text-inkwell/55">
            Cerrar
          </button>
        </div>
        <p className="mt-4 text-[12px] leading-relaxed text-inkwell/40">
          También desde este ordenador: {urls[0]}/u/{frozen ? doc.meta.slug : previewSlug}
        </p>
        {paying && due > 0 && (
          <PayModal
            title={quote.family === 'cita' ? 'Cita' : quote.family === 'deseos' ? 'Lista de deseos' : 'Universo'}
            cents={due}
            projectId={doc.meta.id}
            family={quote.family}
            onClose={() => setPaying(false)}
            onPaid={() => {
              setPaying(false);
              void refresh().then(() => publish());
            }}
          />
        )}
      </div>
    </div>
      {invite && (
        <InviteSheet
          projectId={doc.meta.id}
          url={publicLink}
          title={forName ? (isDeseos(doc) ? forName : `Para ${forName}`) : 'Para ti'}
          from={fromName}
          eyebrow={isCita(doc) ? citaEyebrowText(doc) : isDeseos(doc) ? 'Una lista' : isWeb(doc) ? 'Una web' : 'Un regalo'}
          line={dedication || (isCita(doc) ? 'Tengo una pregunta para ti.' : isDeseos(doc) ? 'Entra con tu correo y escribe planes.' : isWeb(doc) ? 'Hay una web que quiero que abras.' : 'Hay un cielo que quiero que abras.')}
          ready={Boolean(liveLink)}
          onClose={() => setInvite(false)}
        />
      )}
    </>
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
