import { useEffect, useState, type FormEvent } from 'react';
import { gmailInbox, linkGoogle, listMine, sendMagicLink, signInWithGoogle, signOut, type CloudUniverse } from '@/lib/cloud';
import { purgeProject } from '@/lib/drafts';
import { ConfirmDelete } from '@/hub/ConfirmDelete';
import { WaitMark } from '@/hub/WaitMark';
import { explainAuthError, takeAuthError } from '@/bootPath';
import { useSession } from '@/lib/session';
import { cloudEnabled } from '@/lib/supabase';

export { useSession } from '@/lib/session';

export function AccountBar({
  onOpen,
}: {
  onOpen: (id: string) => void;
}) {
  const { user } = useSession();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(() => explainAuthError(takeAuthError()));
  const [busy, setBusy] = useState<'google' | 'email' | 'out' | 'del' | null>(null);
  const [mine, setMine] = useState<CloudUniverse[] | null>(null);
  const [pending, setPending] = useState<CloudUniverse | null>(null);

  useEffect(() => {
    if (!user) {
      setMine(null);
      return;
    }
    let cancel = false;
    setMine(null);
    void listMine().then((rows) => {
      if (!cancel) setMine(rows);
    });
    return () => {
      cancel = true;
    };
  }, [user]);

  const google = async () => {
    setBusy('google');
    setError('');
    try {
      await signInWithGoogle();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo entrar con Google.');
      setBusy(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('email');
    setError('');
    try {
      await sendMagicLink(email);
      setSent(true);
      window.location.assign(gmailInbox(email));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.');
      setBusy(null);
    }
  };

  const leave = async () => {
    setBusy('out');
    await signOut();
    setBusy(null);
  };

  if (!cloudEnabled()) {
    return (
      <section className="mt-8 rounded-[28px] bg-white p-6 ring-1 ring-black/5">
        <h2 className="font-display text-3xl italic">Tu cuenta</h2>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-inkwell/60">
          Falta configurar Supabase para entrar con Google o el correo.
        </p>
      </section>
    );
  }

  if (!user) {
    return (
      <section className="mt-8 rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
        <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Cuenta</p>
        <h2 className="mt-2 font-display text-3xl italic">Entra para llevarte los proyectos</h2>
        <p className="mt-2 max-w-lg text-[15px] leading-relaxed text-inkwell/60">
          Con Google es un toque. Si prefieres, deja el correo y te abrimos Gmail con el enlace.
        </p>
        <button
          type="button"
          onClick={() => void google()}
          disabled={busy !== null}
          className="mt-6 flex w-full items-center justify-center gap-3 rounded-full bg-inkwell px-5 py-3 text-[15px] text-linen disabled:opacity-40"
        >
          <GoogleMark />
          {busy === 'google' ? 'Abriendo Google…' : 'Continuar con Google'}
        </button>
        <div className="mt-6 flex items-center gap-3 text-[12px] uppercase tracking-[0.16em] text-inkwell/35">
          <span className="h-px flex-1 bg-black/10" />
          o con el correo
          <span className="h-px flex-1 bg-black/10" />
        </div>
        <form onSubmit={(event) => void submit(event)} className="mt-4 flex flex-wrap gap-2">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="min-w-[16rem] flex-1 rounded-full border border-black/10 bg-linen px-4 py-2.5 text-[15px] outline-none"
          />
          <button type="submit" disabled={busy !== null} className="rounded-full px-5 py-2.5 text-[14px] ring-1 ring-black/10 disabled:opacity-40">
            {busy === 'email' ? 'Enviando…' : 'Mandarme el enlace'}
          </button>
        </form>
        {sent && (
          <p className="mt-3 text-[14px] text-brass">
            Enlace enviado. Te llevamos a Gmail; ábrelo y vuelves aquí ya dentro.
          </p>
        )}
        {error && <p className="mt-3 text-[14px] leading-relaxed text-[#8a3d32]">{error}</p>}
      </section>
    );
  }

  const viaGoogle = user.app_metadata?.provider === 'google' || user.identities?.some((item) => item.provider === 'google');

  return (
    <section className="mt-8 rounded-[28px] bg-white p-6 ring-1 ring-black/5 sm:p-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Sesión</p>
          <h2 className="mt-2 font-display text-3xl italic">Estás dentro</h2>
          <p className="mt-1 text-[14px] text-inkwell/55">
            {user.email}
            {viaGoogle ? ' · Google' : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {!viaGoogle && (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => {
                setBusy('google');
                setError('');
                void linkGoogle().catch((err: unknown) => {
                  setBusy(null);
                  setError(err instanceof Error ? err.message : 'No se pudo conectar Google.');
                });
              }}
              className="rounded-full bg-inkwell px-5 py-2.5 text-[14px] text-linen disabled:opacity-40"
            >
              {busy === 'google' ? 'Abriendo Google…' : 'Conectar Google'}
            </button>
          )}
          <button
            type="button"
            disabled={busy === 'out'}
            onClick={() => void leave()}
            className="rounded-full px-5 py-2.5 text-[14px] ring-1 ring-black/10 hover:bg-linen"
          >
            {busy === 'out' ? 'Saliendo…' : 'Cerrar sesión'}
          </button>
        </div>
      </div>
      {mine === null ? (
        <WaitMark line="Trayendo tus proyectos" tone="inline" />
      ) : mine.length === 0 ? (
        <p className="mt-5 text-[15px] text-inkwell/55">Todavía no hay ninguno en la cuenta.</p>
      ) : (
        <ul className="mt-5 grid gap-3 sm:grid-cols-2">
          {mine.map((row) => (
            <li key={row.id} className="rounded-[24px] bg-linen p-5">
              <button type="button" onClick={() => onOpen(row.id)} className="w-full text-left">
                <p className="text-[11px] uppercase tracking-[0.16em] text-brass">
                  {row.kind === 'cita' ? 'Cita' : row.kind === 'deseos' ? 'Lista de deseos' : row.kind === 'web' ? 'Web' : 'Universo'}
                  {' · '}
                  {row.status === 'published' ? 'Publicado' : 'Borrador'}
                  {row.slug ? ` · /u/${row.slug}` : ''}
                </p>
                <h3 className="mt-2 font-display text-3xl italic leading-tight">{row.title || (row.kind === 'cita' ? 'Cita' : row.kind === 'deseos' ? 'Lista de deseos' : row.kind === 'web' ? 'Web' : 'Universo')}</h3>
              </button>
              <button type="button" className="mt-3 text-[13px] text-[#8a3d32]" onClick={() => setPending(row)}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      )}
      {pending && (
        <ConfirmDelete
          title={pending.title || 'Universo'}
          busy={busy === 'del'}
          onCancel={() => (busy === 'del' ? undefined : setPending(null))}
          onConfirm={() => {
            void (async () => {
              setBusy('del');
              await purgeProject(pending.id, pending.slug);
              setMine(await listMine());
              setPending(null);
              setBusy(null);
            })();
          }}
        />
      )}
    </section>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.6-.4-3.9z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.8 1.2 8 3.1l5.7-5.7C34.2 6.1 29.4 4 24 4 16.3 4 9.6 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.3 35.1 26.8 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.1H42V20H24v8h11.3c-1.1 3.2-3.5 5.7-6.5 7.1l.1.1 6.3 5.3C36.8 41.3 44 36 44 24c0-1.3-.1-2.6-.4-3.9z" />
    </svg>
  );
}
