import { Component, lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useParams } from 'react-router-dom';
import { RequireAccount } from '@/hub/RequireAccount';
import { Gift } from '@/pages/Gift';
import { SessionProvider } from '@/lib/session';
import { siteBase } from '@/lib/site';

const Landing = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.Landing })));
const Hub = lazy(() => import('@/pages/Hub').then((m) => ({ default: m.Hub })));
const Begin = lazy(() => import('@/pages/Begin').then((m) => ({ default: m.Begin })));
const Studio = lazy(() => import('@/pages/Studio').then((m) => ({ default: m.Studio })));
const DateAskStudio = lazy(() => import('@/pages/DateAskStudio').then((m) => ({ default: m.DateAskStudio })));
const Missing = lazy(() => import('@/pages/Missing').then((m) => ({ default: m.Missing })));

function ProjectStudio() {
  const { id = '' } = useParams();
  if (id.startsWith('cita_')) return <DateAskStudio id={id} />;
  return <Studio />;
}

function DarkBoot() {
  return (
    <div className="grid h-dvh place-items-center bg-[#0c0b0a]">
      <span className="h-2 w-2 rounded-full bg-[#e8b86d]" />
    </div>
  );
}

function LinenBoot() {
  return (
    <div className="grid h-dvh place-items-center bg-linen">
      <span className="h-2 w-2 rounded-full bg-brass" />
    </div>
  );
}

class LoadError extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (this.state.failed) {
      return (
        <div className="grid h-dvh place-items-center bg-linen px-6 text-center text-inkwell">
          <div>
            <p className="font-display text-4xl italic">La página no terminó de abrir.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-6 rounded-full bg-inkwell px-5 py-3 text-linen">
              Recargar
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Workshop() {
  return (
    <RequireAccount>
      <LoadError>
        <Suspense fallback={<LinenBoot />}>
          <Outlet />
        </Suspense>
      </LoadError>
    </RequireAccount>
  );
}

export default function App() {
  return (
    <SessionProvider>
      <BrowserRouter basename={siteBase() || undefined}>
        <LoadError>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={<DarkBoot />}>
                  <Landing />
                </Suspense>
              }
            />
            <Route element={<Workshop />}>
              <Route path="/crear" element={<Hub />} />
              <Route path="/crear/nuevo" element={<Begin />} />
              <Route path="/crear/:id" element={<ProjectStudio />} />
            </Route>
            <Route path="/u/:slug" element={<Gift kind="published" />} />
            <Route path="/p/:id" element={<Gift kind="draft" />} />
            <Route
              path="*"
              element={
                <Suspense fallback={<DarkBoot />}>
                  <Missing />
                </Suspense>
              }
            />
          </Routes>
        </LoadError>
      </BrowserRouter>
    </SessionProvider>
  );
}
