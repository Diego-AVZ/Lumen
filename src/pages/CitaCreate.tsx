import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { saveDraft } from '@/lib/drafts';
import { haptic } from '@/lib/haptics';
import { uid } from '@/lib/motion';
import { DateSlots } from '@/cita/DateSlots';
import { PriceTag } from '@/hub/PriceTag';
import { CITA_PHRASES, blankCita, citaTitle, nearbySlots } from '@/schema/cita';

export function CitaCreate({ onBack }: { onBack: () => void }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [forName, setForName] = useState('');
  const [fromName, setFromName] = useState('');
  const [question, setQuestion] = useState(CITA_PHRASES[0]);
  const [letter, setLetter] = useState('No hace falta que sea perfecto. Solo quiero verte.');
  const [dates, setDates] = useState(() =>
    nearbySlots()
      .slice(0, 2)
      .map((slot) => ({ id: uid('when'), label: slot.label, when: slot.when })),
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const once = useRef(false);
  const draft = useMemo(() => {
    const doc = blankCita();
    doc.forName = forName.trim();
    doc.fromName = fromName.trim();
    doc.question = question.trim() || CITA_PHRASES[0];
    doc.letter = letter.trim();
    doc.dates = dates.filter((item) => item.label.trim() || item.when);
    if (doc.dates.length === 0) doc.dates = [{ id: uid('when'), label: 'Cuando quieras', when: '' }];
    return doc;
  }, [forName, fromName, question, letter, dates]);
  const finish = () => {
    if (once.current || saving) return;
    once.current = true;
    setSaving(true);
    setError('');
    const doc = draft;
    doc.meta.title = citaTitle(doc);
    doc.meta.titleTouched = Boolean(forName.trim());
    void saveDraft(doc)
      .then(() => {
        haptic('success');
        navigate(`/crear/${doc.meta.id}`);
      })
      .catch((err: unknown) => {
        once.current = false;
        setSaving(false);
        setError(err instanceof Error ? err.message : 'No se pudo crear el sobre.');
      });
  };

  return (
    <div className="mx-auto max-w-xl">
      <button type="button" onClick={() => (step === 0 ? onBack() : setStep((n) => n - 1))} className="text-[13px] text-inkwell/45">
        ← {step === 0 ? 'Plantillas' : 'Anterior'}
      </button>
      <div className="mt-5">
        <PriceTag doc={draft} />
      </div>
      <div className="mt-6 flex gap-1.5">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brass' : 'bg-black/10'}`} />
        ))}
      </div>

      {step === 0 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">01 · Pedir cita</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">¿Para quién es el sobre?</h1>
          <label className="mt-8 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Su nombre</span>
            <input autoFocus value={forName} onChange={(e) => setForName(e.target.value)} placeholder="Clara" className="mt-2 w-full border-b border-black/12 bg-transparent py-3 font-display text-3xl italic outline-none placeholder:text-inkwell/20" />
          </label>
          <label className="mt-6 block">
            <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">De parte de</span>
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="Alex" className="mt-2 w-full border-b border-black/10 bg-transparent py-3 text-2xl outline-none placeholder:text-inkwell/25" />
          </label>
          <button type="button" disabled={!forName.trim()} onClick={() => setStep(1)} className="mt-10 rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-30">
            Seguir
          </button>
        </>
      )}

      {step === 1 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">02 · La pregunta</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">Elige una frase, o escríbela</h1>
          <div className="mt-8 flex flex-wrap gap-2">
            {CITA_PHRASES.map((phrase) => (
              <button
                key={phrase}
                type="button"
                onClick={() => setQuestion(phrase)}
                className={`rounded-full px-4 py-2 text-left text-[14px] ${question === phrase ? 'bg-inkwell text-linen' : 'bg-white ring-1 ring-black/10'}`}
              >
                {phrase}
              </button>
            ))}
          </div>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} className="mt-6 w-full resize-none rounded-[22px] bg-white px-4 py-3 text-[17px] outline-none ring-1 ring-black/10" />
          <button type="button" disabled={!question.trim()} onClick={() => setStep(2)} className="mt-8 rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-30">
            Seguir
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">03 · La nota</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">Algo más, si quieres</h1>
          <p className="mt-3 text-[16px] text-inkwell/55">Va dentro del sobre, encima de la pregunta.</p>
          <textarea autoFocus value={letter} onChange={(e) => setLetter(e.target.value)} rows={5} className="mt-8 w-full resize-none rounded-[22px] bg-white px-4 py-3 text-[17px] leading-relaxed outline-none ring-1 ring-black/10" />
          <div className="mt-8 flex gap-4">
            <button type="button" onClick={() => setStep(3)} className="rounded-full bg-inkwell px-6 py-3 text-linen">
              Seguir
            </button>
            <button type="button" onClick={() => setStep(3)} className="text-[14px] text-inkwell/45">
              Saltar este
            </button>
          </div>
        </>
      )}

      {step === 3 && (
        <>
          <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">04 · Los días</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">Si dice que sí, ¿cuándo?</h1>
          <div className="mt-8">
            <DateSlots dates={dates} onChange={setDates} />
          </div>
          <div>
            <button type="button" disabled={saving} onClick={finish} className="mt-8 rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-40">
              {saving ? 'Creando…' : 'Crear el sobre'}
            </button>
            {error && <p className="mt-4 text-[15px] text-[#8a3d32]">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
