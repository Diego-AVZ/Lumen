import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PriceTag } from '@/hub/PriceTag';
import { saveDraft } from '@/lib/drafts';
import { haptic } from '@/lib/haptics';
import { CADENCES, blankDeseos, deseosTitle } from '@/schema/deseos';

export function DeseosCreate({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [listName, setListName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [everyDays, setEveryDays] = useState(7);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const once = useRef(false);

  const draft = useMemo(() => {
    const doc = blankDeseos();
    doc.listName = listName.trim();
    doc.ownerName = ownerName.trim();
    doc.partnerEmail = partnerEmail.trim().toLowerCase();
    doc.everyDays = everyDays;
    doc.meta.title = deseosTitle(doc);
    return doc;
  }, [listName, ownerName, partnerEmail, everyDays]);

  const finish = () => {
    if (once.current || saving) return;
    once.current = true;
    setSaving(true);
    setError('');
    const doc = draft;
    doc.meta.titleTouched = Boolean(listName.trim());
    void saveDraft(doc)
      .then(() => {
        haptic('success');
        navigate(`/crear/${doc.meta.id}`);
      })
      .catch((err: unknown) => {
        once.current = false;
        setSaving(false);
        setError(err instanceof Error ? err.message : 'No se pudo abrir la lista.');
      });
  };

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(partnerEmail.trim());

  return (
    <div className="mx-auto max-w-xl">
      <button type="button" onClick={() => (step === 0 ? onBack() : setStep((n) => n - 1))} className="text-[13px] text-inkwell/45">
        ← {step === 0 ? 'Plantillas' : 'Anterior'}
      </button>
      <div className="mt-5">
        <PriceTag doc={draft} />
      </div>
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brass' : 'bg-black/10'}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">01 · La lista</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">¿Cómo la llamáis?</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-inkwell/55">Un nombre vuestro. Luego vais dejando planes, los dos.</p>
          <input
            autoFocus
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            placeholder="Lo que aún no hemos hecho"
            className="mt-8 w-full border-b border-black/12 bg-transparent py-3 font-display text-3xl italic outline-none placeholder:text-inkwell/20"
          />
          <button type="button" disabled={!listName.trim()} onClick={() => setStep(1)} className="mt-10 rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-30">
            Seguir
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">02 · Los dos</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">¿Quién escribe contigo?</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-inkwell/55">Con ese correo entra y añade planes. Tiene que ser el de su cuenta.</p>
          <label className="mt-8 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Tu nombre</span>
            <input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Alex" className="mt-2 w-full border-b border-black/10 bg-transparent py-3 text-2xl outline-none placeholder:text-inkwell/25" />
          </label>
          <label className="mt-6 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Su correo</span>
            <input value={partnerEmail} onChange={(e) => setPartnerEmail(e.target.value)} placeholder="clara@correo.com" inputMode="email" className="mt-2 w-full border-b border-black/10 bg-transparent py-3 text-2xl outline-none placeholder:text-inkwell/25" />
          </label>
          <button type="button" disabled={!ownerName.trim() || !emailOk} onClick={() => setStep(2)} className="mt-10 rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-30">
            Seguir
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">03 · La ruleta</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">¿Cada cuánto la giráis?</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-inkwell/55">En ese plazo, si los dos giráis con los mismos filtros, sale el mismo plan.</p>
          <div className="mt-8 flex flex-wrap gap-2">
            {CADENCES.map((item) => (
              <button
                key={item.days}
                type="button"
                onClick={() => setEveryDays(item.days)}
                className={`rounded-full px-4 py-2 text-[15px] ${everyDays === item.days ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
              >
                {item.label}
              </button>
            ))}
          </div>
          <button type="button" disabled={saving} onClick={finish} className="mt-10 rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-40">
            {saving ? 'Abriendo…' : 'Abrir la lista'}
          </button>
        </>
      )}
      {error && <p className="mt-4 text-[14px] text-[#8a3d32]">{error}</p>}
    </div>
  );
}
