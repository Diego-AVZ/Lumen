import { useEffect, useState, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from '@/lib/cloud';
import { HUB_VISTAS, type HubVista } from '@/hub/catalog';
import { useSession } from '@/lib/session';

function vistaFromPath(pathname: string, search: string): HubVista {
  if (pathname.startsWith('/crear/nuevo')) return 'crear';
  const value = new URLSearchParams(search).get('vista');
  return HUB_VISTAS.some((item) => item.id === value) ? (value as HubVista) : 'proyectos';
}

export function HubShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useSession();
  const current = vistaFromPath(location.pathname, location.search);
  const [open, setOpen] = useState(false);
  const [wide, setWide] = useState(() => (typeof window === 'undefined' ? true : window.innerWidth >= 1024));

  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 1024);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    document.body.style.background = '';
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', '#f3eee6');
  }, []);

  const go = (id: HubVista) => {
    if (id === 'crear') navigate('/crear/nuevo');
    else navigate(id === 'proyectos' ? '/crear' : `/crear?vista=${id}`);
  };

  const railOpen = wide || open;

  return (
    <div className="hub-sky min-h-dvh text-linen">
      {open && !wide && (
        <button type="button" className="fixed inset-0 z-40 bg-black/45" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[17.5rem] flex-col border-r border-white/10 bg-[#12100e] px-4 py-5 transition-transform duration-300 ${
          railOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Link to="/" className="px-2">
          <p className="font-display text-[2rem] italic leading-none">Lumen</p>
          <p className="mt-2 text-[11px] uppercase tracking-[0.22em] text-[#e8b86d]/80">Centro de control</p>
        </Link>
        <nav className="mt-8 flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
          {HUB_VISTAS.map((item) => {
            const active = current === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => go(item.id)}
                className={`group flex items-start gap-3 rounded-2xl px-3 py-3 text-left transition ${
                  item.accent
                    ? active
                      ? 'bg-[#e8b86d] text-inkwell'
                      : 'bg-[#e8b86d]/15 text-linen hover:bg-[#e8b86d]/25'
                    : active
                      ? 'bg-white/10 text-linen'
                      : 'text-linen/55 hover:bg-white/5 hover:text-linen'
                }`}
              >
                <span
                  className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] ${
                    item.accent && active ? 'bg-inkwell/10' : 'bg-white/10'
                  }`}
                >
                  {item.mark}
                </span>
                <span>
                  <span className="block text-[15px]">{item.label}</span>
                  <span className={`mt-0.5 block text-[12px] ${item.accent && active ? 'text-inkwell/55' : 'text-linen/40'}`}>
                    {item.hint}
                  </span>
                </span>
              </button>
            );
          })}
        </nav>
        <div className="rounded-2xl bg-white/5 px-3 py-3">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#e8b86d]/75">Cuenta</p>
          <p className="mt-1 truncate text-[13px] text-linen/70">{user?.email ?? 'Sin entrar'}</p>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="mt-2 text-[12px] text-linen/45 hover:text-linen"
            >
              Cerrar sesión
            </button>
          ) : (
            <button type="button" onClick={() => go('plan')} className="mt-2 text-[12px] text-linen/45 hover:text-linen">
              Entrar
            </button>
          )}
        </div>
      </aside>

      <div className={wide ? 'pl-[17.5rem]' : ''}>
        {!wide && (
          <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-white/10 bg-[#12100e]/90 px-4 py-3 backdrop-blur-md">
            <button type="button" onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label="Abrir menú">
              ☰
            </button>
            <div className="min-w-0 flex-1">
              <p className="font-display text-2xl italic leading-none">Lumen</p>
              <p className="truncate text-[11px] uppercase tracking-[0.16em] text-[#e8b86d]/80">
                {HUB_VISTAS.find((item) => item.id === current)?.label}
              </p>
            </div>
            <button type="button" onClick={() => go('crear')} className="rounded-full bg-[#e8b86d] px-4 py-2 text-[13px] text-inkwell">
              Crear
            </button>
          </header>
        )}
        <div className="min-h-dvh bg-linen text-inkwell">{children}</div>
      </div>
    </div>
  );
}
