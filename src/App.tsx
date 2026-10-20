import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { RequireAccount } from '@/hub/RequireAccount';
import { Gift } from '@/pages/Gift';
import { siteBase } from '@/lib/site';

const Landing = lazy(() => import('@/pages/Landing').then((m) => ({ default: m.Landing })));
const Hub = lazy(() => import('@/pages/Hub').then((m) => ({ default: m.Hub })));
const Begin = lazy(() => import('@/pages/Begin').then((m) => ({ default: m.Begin })));
const Studio = lazy(() => import('@/pages/Studio').then((m) => ({ default: m.Studio })));
const Missing = lazy(() => import('@/pages/Missing').then((m) => ({ default: m.Missing })));

function Boot() {
  return (
    <div className="grid h-dvh place-items-center bg-[#0c0b0a]">
      <span className="h-2 w-2 rounded-full bg-[#e8b86d]" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter basename={siteBase() || undefined}>
      <Suspense fallback={<Boot />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/crear" element={<RequireAccount><Hub /></RequireAccount>} />
          <Route path="/crear/nuevo" element={<RequireAccount><Begin /></RequireAccount>} />
          <Route path="/crear/:id" element={<RequireAccount><Studio /></RequireAccount>} />
          <Route path="/u/:slug" element={<Gift kind="published" />} />
          <Route path="/p/:id" element={<Gift kind="draft" />} />
          <Route path="*" element={<Missing />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
