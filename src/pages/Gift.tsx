import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { DateAskPlayer } from '@/cita/DateAskPlayer';
import { loadOwned, openGift, readGift } from '@/lib/cloud';
import { peekDraft } from '@/lib/drafts';
import { GiftLinks } from '@/pages/GiftLinks';
import { pingVisit } from '@/lib/stats';
import { rememberedPhrase, rememberPhrase } from '@/lib/unlock';
import { isCita, parseProject, type ProjectDocument } from '@/schema/project';
import { UniversePlayer } from '@/universe/UniversePlayer';

function embeddedDocument(kind: 'published' | 'draft', slug?: string, id?: string) {
  const raw = (window as Window & { __LUMEN_DOC__?: unknown }).__LUMEN_DOC__;
  if (!raw) return null;
  try {
    const doc = parseProject(raw);
    if (kind === 'published' && slug && doc.meta.slug === slug) return doc;
    if (kind === 'draft' && id && doc.meta.id === id) return doc;
    return null;
  } catch {
    return null;
  }
}

export function Gift({ kind }: { kind: 'published' | 'draft' }) {
  const { slug, id } = useParams();
  const initial = embeddedDocument(kind, slug, id) ?? (kind === 'draft' && id ? peekDraft(id) : null);
  const [doc, setDoc] = useState<ProjectDocument | null>(initial);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(!initial);
  const [locked, setLocked] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [busy, setBusy] = useState(false);
  const docRef = useRef(doc);
  docRef.current = doc;

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        if (kind === 'published' && slug) {
          const remembered = rememberedPhrase(slug);
          const read = await readGift(slug, remembered);
          if (stop) return;
          if (read.state === 'open' && read.doc) {
            setDoc(read.doc);
            setLocked(false);
            setMessage('');
            setLoading(false);
            return;
          }
          if (read.state === 'locked' || read.state === 'wrong') {
            setLocked(true);
            setLoading(false);
            return;
          }
          setMessage('Este regalo no está publicado.');
          setLoading(false);
          return;
        }
        const next = id ? await loadOwned(id) : null;
        if (stop) return;
        if (!next) {
          if (!docRef.current) {
            setMessage('Este borrador está en la cuenta. Publícalo para abrirlo en el teléfono.');
            setLoading(false);
          }
          return;
        }
        setDoc(next);
        setMessage('');
        setLoading(false);
      } catch {
        if (!stop && !docRef.current) {
          setMessage('No encuentro este regalo.');
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      stop = true;
    };
  }, [id, kind, slug]);

  const visitId = doc?.meta.id;
  useEffect(() => {
    if (!visitId) return;
    void pingVisit(visitId, 'start');
    const beat = window.setInterval(() => void pingVisit(visitId, 'pulse'), 20000);
    const onHide = () => {
      if (document.visibilityState === 'hidden') void pingVisit(visitId, 'pulse');
    };
    document.addEventListener('visibilitychange', onHide);
    return () => {
      window.clearInterval(beat);
      document.removeEventListener('visibilitychange', onHide);
      void pingVisit(visitId, 'pulse');
    };
  }, [visitId]);

  useEffect(() => {
    const color = doc && !isCita(doc) ? doc.theme.ink : '#140e0c';
    document.body.style.background = color;
    const name = doc ? (isCita(doc) ? doc.forName : doc.intro.forName) : '';
    document.title = name ? `Para ${name}` : 'Lumen';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
    return () => {
      document.body.style.background = '';
    };
  }, [doc]);

  const unlock = async (event: FormEvent) => {
    event.preventDefault();
    if (!slug) return;
    setBusy(true);
    setUnlockError('');
    try {
      const next = await openGift(slug, phrase.trim());
      rememberPhrase(slug, phrase.trim());
      setDoc(next);
      setLocked(false);
    } catch (err) {
      setUnlockError(err instanceof Error ? err.message : 'La contraseña no es esa.');
    } finally {
      setBusy(false);
    }
  };

  if (locked) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0c0b0a] px-8 text-center text-[#f3ead8]">
        <form onSubmit={(event) => void unlock(event)} className="w-full max-w-sm">
          <p className="text-[11px] uppercase tracking-[0.22em] text-[#e8b86d]/80">Cerrado</p>
          <h1 className="mt-4 font-display text-5xl italic leading-[0.95]">Una palabra.</h1>
          <p className="mt-4 text-[15px] leading-relaxed text-[#f3ead8]/55">Quien lo envió dejó una contraseña. Sin ella, el regalo no se abre.</p>
          <input
            type="password"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            autoFocus
            className="mt-8 w-full border-b border-white/20 bg-transparent py-3 text-center font-display text-3xl italic outline-none"
          />
          {unlockError && <p className="mt-3 text-[14px] text-[#e8b86d]">{unlockError}</p>}
          <button type="submit" disabled={busy || !phrase.trim()} className="mt-8 rounded-full bg-[#e8b86d] px-6 py-3 text-[#140e0c] disabled:opacity-40">
            {busy ? 'Abriendo…' : 'Abrir'}
          </button>
        </form>
      </div>
    );
  }

  if (loading || message || !doc) {
    return (
      <div className="grid h-dvh place-items-center bg-[#0c0b0a] px-8 text-center text-[#f3ead8]">
        {message ? (
          <div className="w-full max-w-md">
            <p className="font-display text-4xl italic">No está aquí.</p>
            <p className="mx-auto mt-4 max-w-xs text-[15px] leading-relaxed text-[#f3ead8]/55">{message}</p>
            {kind === 'published' && <GiftLinks />}
          </div>
        ) : (
          <span className="h-2 w-2 rounded-full bg-[#e8b86d]" />
        )}
      </div>
    );
  }

  return (
    <div className="relative h-dvh w-full">
      {isCita(doc) ? <DateAskPlayer key={doc.meta.id} doc={doc} /> : <UniversePlayer key={doc.meta.id} doc={doc} />}
    </div>
  );
}
