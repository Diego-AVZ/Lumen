import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { openPaidDraft } from '@/lib/drafts';
import { haptic } from '@/lib/haptics';
import { uid } from '@/lib/motion';
import { euros, familyOf, type PlanFamily, type PlanId } from '@/lib/plans';
import { freeInFamily, openPlans, usePurchases, type Purchase } from '@/lib/purchases';
import { exampleDocument } from '@/schema/example';
import { THEMES, blankDocument } from '@/schema/universe';
import { HubShell } from '@/hub/HubShell';
import { TEMPLATES, type TemplateId } from '@/hub/catalog';
import { PlanGate, planLabel } from '@/hub/PlanShop';
import { documentFromEasy, EMPTY_EASY, type EasyAnswers } from '@/studio/easyUniverse';
import { CitaCreate } from '@/pages/CitaCreate';

type Phase = 'plantilla' | 'modo' | 'nombres' | 'wizard' | 'cita';
type Mode = 'facil' | 'max';

const WIZARD: {
  key: keyof EasyAnswers | 'themeId';
  eyebrow: string;
  title: string;
  hint: string;
  fields: { name: keyof EasyAnswers; label: string; placeholder: string; multiline?: boolean }[];
}[] = [
  {
    key: 'forName',
    eyebrow: '01 · El cielo',
    title: '¿Para quién es?',
    hint: 'Su nombre queda en el centro. El tuyo, si quieres, al pie.',
    fields: [
      { name: 'forName', label: 'Su nombre', placeholder: 'Clara' },
      { name: 'fromName', label: 'De parte de', placeholder: 'Alex' },
    ],
  },
  {
    key: 'metWhen',
    eyebrow: '02 · El comienzo',
    title: '¿Cuándo os conocisteis?',
    hint: 'Una fecha, una estación, o simplemente “un martes”.',
    fields: [
      { name: 'metWhen', label: 'Cuándo', placeholder: 'un martes de octubre' },
      { name: 'metWhere', label: 'Dónde', placeholder: 'en aquella terraza' },
    ],
  },
  {
    key: 'metWhat',
    eyebrow: '03 · Qué pasó',
    title: '¿Qué pasó ese día?',
    hint: 'No hace falta que sea épico. Basta con lo que se quedó.',
    fields: [{ name: 'metWhat', label: 'Lo que recuerdas', placeholder: 'Empezó por una frase pequeña…', multiline: true }],
  },
  {
    key: 'memoryWhat',
    eyebrow: '04 · Un momento',
    title: 'Un recuerdo que no se va',
    hint: 'Ponle un título corto y cuenta qué pasó.',
    fields: [
      { name: 'memoryTitle', label: 'Cómo lo llamáis', placeholder: 'La orilla' },
      { name: 'memoryWhat', label: 'Qué pasó', placeholder: 'Había viento y una luz que no salió en ninguna foto.', multiline: true },
    ],
  },
  {
    key: 'letter',
    eyebrow: '05 · La carta',
    title: 'Si pudieras dejarle una carta ahora',
    hint: 'Un párrafo. Se puede alargar después, en el estudio.',
    fields: [{ name: 'letter', label: 'La carta', placeholder: 'Quería que tuvieras un sitio al que volver…', multiline: true }],
  },
  {
    key: 'wish',
    eyebrow: '06 · Un deseo',
    title: 'Algo que aún queréis vivir',
    hint: 'Una promesa pequeña. Caerá como estrella fugaz.',
    fields: [{ name: 'wish', label: 'El deseo', placeholder: 'Volver a esa ciudad, sin prisa' }],
  },
];

export function Begin() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const plantilla = (params.get('plantilla') as TemplateId | null) ?? null;
  const [phase, setPhase] = useState<Phase>(() => {
    if (params.get('plantilla') === 'cita') return 'cita';
    if (params.get('modo') === 'facil') return 'wizard';
    if (params.get('modo') === 'max') return 'nombres';
    if (params.get('plantilla')) return 'modo';
    return 'plantilla';
  });
  const [forName, setForName] = useState('');
  const [fromName, setFromName] = useState('');
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<EasyAnswers>(() => {
    try {
      const raw = sessionStorage.getItem('lumen.easy');
      return raw ? { ...EMPTY_EASY, ...(JSON.parse(raw) as EasyAnswers) } : EMPTY_EASY;
    } catch {
      return EMPTY_EASY;
    }
  });
  const [soon, setSoon] = useState<string | null>(null);
  const [chosen, setChosen] = useState<PlanId | null>(null);
  const [ask, setAsk] = useState<PlanFamily | null>(null);
  const [error, setError] = useState('');
  const creating = useRef(false);
  const boot = useRef(false);
  const { rows: bought } = usePurchases();

  useEffect(() => {
    sessionStorage.setItem('lumen.easy', JSON.stringify(answers));
  }, [answers]);

  useEffect(() => {
    if (plantilla && plantilla !== 'universo' && plantilla !== 'cita') {
      setSoon(plantilla);
      params.delete('plantilla');
      params.delete('modo');
      setParams(params, { replace: true });
      setPhase('plantilla');
    }
  }, [plantilla, params, setParams]);

  useEffect(() => {
    if (bought === null || boot.current) return;
    boot.current = true;
    if (phase === 'plantilla') return;
    const family: PlanFamily = phase === 'cita' || plantilla === 'cita' ? 'cita' : 'plantilla';
    const open = openPlans(bought, family);
    if (open.length === 0) {
      setPhase('plantilla');
      setParams({});
      setAsk(family);
      return;
    }
    setChosen(open[0]);
    if (open.length > 1) setAsk(family);
  }, [bought, phase, plantilla, setParams]);

  const enter = (id: TemplateId, plan: PlanId) => {
    setChosen(plan);
    setAsk(null);
    setError('');
    haptic('light');
    setParams({ plantilla: id });
    setPhase(id === 'cita' ? 'cita' : 'modo');
  };

  const pickTemplate = (id: TemplateId, available: boolean) => {
    if (!available) {
      setSoon(id);
      return;
    }
    if (bought === null) return;
    const family: PlanFamily = id === 'cita' ? 'cita' : 'plantilla';
    const open = openPlans(bought, family);
    if (open.length === 1) {
      enter(id, open[0]);
      return;
    }
    setAsk(family);
  };

  const pickMode = (next: Mode) => {
    haptic('medium');
    const id = plantilla ?? 'universo';
    setParams({ plantilla: id, modo: next });
    setPhase(next === 'facil' ? 'wizard' : 'nombres');
  };

  const startMax = (example: boolean) => {
    if (creating.current) return;
    if (!chosen) {
      setAsk('plantilla');
      return;
    }
    creating.current = true;
    setError('');
    const doc = example ? exampleDocument() : blankDocument();
    if (example) {
      doc.meta.id = uid('uni');
      doc.meta.status = 'draft';
      doc.meta.slug = '';
      delete doc.meta.publishedAt;
    } else {
      doc.intro.forName = forName.trim();
      doc.intro.fromName = fromName.trim();
      doc.meta.title = forName.trim() ? `Para ${forName.trim()}` : 'Universo sin nombre';
    }
    void openPaidDraft(doc, chosen)
      .then(() => {
        haptic('success');
        navigate(`/crear/${doc.meta.id}`);
      })
      .catch((err: unknown) => {
        creating.current = false;
        setError(err instanceof Error ? err.message : 'No se pudo abrir.');
      });
  };

  const finishEasy = () => {
    if (creating.current) return;
    if (!chosen) {
      setAsk('plantilla');
      return;
    }
    creating.current = true;
    setError('');
    const doc = documentFromEasy(answers);
    sessionStorage.removeItem('lumen.easy');
    void openPaidDraft(doc, chosen)
      .then(() => {
        haptic('success');
        navigate(`/crear/${doc.meta.id}`);
      })
      .catch((err: unknown) => {
        creating.current = false;
        setError(err instanceof Error ? err.message : 'No se pudo abrir.');
      });
  };

  const current = WIZARD[step];
  const canNext =
    step === 0 ? Boolean(answers.forName.trim()) : true;
  const theme = THEMES.find((item) => item.id === answers.themeId) ?? THEMES[0];

  const preview = useMemo(() => {
    if (!answers.forName.trim()) return 'Un cielo para alguien.';
    return `Para ${answers.forName.trim()}`;
  }, [answers.forName]);

  return (
    <HubShell>
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
        {phase === 'cita' && (
          <CitaCreate
            plan={chosen}
            onBack={() => {
              setPhase('plantilla');
              setParams({});
            }}
          />
        )}
        {phase === 'plantilla' && (
          <>
            <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Crear</p>
            <h1 className="mt-3 max-w-[16ch] font-display text-[clamp(2.6rem,6vw,4.6rem)] italic leading-[0.92]">
              Elige el regalo
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-inkwell/60">
              Sobre o universo. Si no hay un plan libre, te pedimos pagarlo antes de crearlo.
            </p>
            {bought === null && <p className="mt-6 text-[14px] text-brass">Mirando tus planes…</p>}
            <ul className="mt-10 grid gap-4 md:grid-cols-2">
              {TEMPLATES.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => pickTemplate(item.id, item.available)}
                    className="group w-full overflow-hidden rounded-[32px] text-left outline-none ring-1 ring-black/10 transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_rgba(40,28,16,0.12)] focus-visible:ring-2 focus-visible:ring-brass"
                  >
                    <div className="relative h-40 px-6 py-5 text-linen" style={{ background: item.sky }}>
                      <span className="rounded-full bg-white/10 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em]">
                        {item.tag}
                      </span>
                      <span className="absolute bottom-5 right-6 text-5xl opacity-30 transition group-hover:opacity-60">✦</span>
                    </div>
                    <div className="bg-white px-6 py-5">
                      <h2 className="font-display text-4xl italic">{item.name}</h2>
                      <p className="mt-2 text-[15px] leading-relaxed text-inkwell/55">{item.line}</p>
                      {bought && (item.id === 'cita' || item.id === 'universo') && (
                        <p className="mt-3 text-[12px] uppercase tracking-[0.14em] text-brass">
                          {stockLine(bought, item.id === 'cita' ? 'cita' : 'plantilla')}
                        </p>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {soon && (
              <p className="mt-6 rounded-[22px] bg-white px-5 py-4 text-[15px] text-inkwell/70 ring-1 ring-black/5">
                {TEMPLATES.find((item) => item.id === soon)?.name} llega pronto. El universo ya está listo, si quieres empezar hoy.
              </p>
            )}
          </>
        )}

        {phase === 'modo' && (
          <>
            <button type="button" onClick={() => { setPhase('plantilla'); setParams({}); }} className="text-[13px] text-inkwell/45">
              ← Plantillas
            </button>
            <p className="mt-6 text-[12px] uppercase tracking-[0.22em] text-brass">Universo</p>
            <PlanMark plan={chosen} onChange={() => setAsk('plantilla')} />
            <h1 className="mt-3 max-w-[18ch] font-display text-[clamp(2.6rem,6vw,4.6rem)] italic leading-[0.92]">
              Cómo quieres construirlo
            </h1>
            <p className="mt-4 max-w-xl text-[17px] leading-relaxed text-inkwell/60">
              Dos caminos. El mismo cielo al final.
            </p>
            <div className="mt-10 grid gap-5 lg:grid-cols-2">
              <ModeCard
                kicker="Para empezar ya"
                title="Modo fácil y rápido"
                body="Te voy preguntando: cuándo os conocisteis, dónde, qué pasó. Seis pasos. Una plantilla pequeña y viva."
                points={['4–6 preguntas', 'Historia, carta y un deseo', 'Luego puedes abrir el estudio']}
                action="Este"
                onPick={() => pickMode('facil')}
                gold
              />
              <ModeCard
                kicker="Si ya sabes el oficio"
                title="Personalización máxima"
                body="Entras al estudio. Cada estrella, cada frase, cada color del cielo, a tu ritmo."
                points={['Todas las estrellas', 'Música, mapa, secretos', 'Control total']}
                action="Este"
                onPick={() => pickMode('max')}
              />
            </div>
          </>
        )}

        {phase === 'nombres' && (
          <div className="mx-auto max-w-xl pt-4">
            <button type="button" onClick={() => setPhase('modo')} className="text-[13px] text-inkwell/45">
              ← Modo
            </button>
            <PlanMark plan={chosen} onChange={() => setAsk('plantilla')} />
            <h1 className="mt-8 font-display text-[clamp(3rem,7vw,4.6rem)] italic leading-[0.95]">¿Para quién es?</h1>
            <p className="mt-4 max-w-md text-[17px] leading-relaxed text-inkwell/60">
              El nombre queda en el centro del cielo. Lo demás se cubre en el estudio, con calma.
            </p>
            <label className="mt-8 block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">Su nombre</span>
              <input
                autoFocus
                value={forName}
                onChange={(e) => setForName(e.target.value)}
                placeholder="Clara"
                className="mt-2 w-full border-b border-black/15 bg-transparent py-3 font-display text-4xl italic outline-none placeholder:text-inkwell/20"
              />
            </label>
            <label className="mt-6 block">
              <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">De parte de</span>
              <input
                value={fromName}
                onChange={(e) => setFromName(e.target.value)}
                placeholder="Opcional"
                className="mt-2 w-full border-b border-black/10 bg-transparent py-3 text-2xl outline-none placeholder:text-inkwell/25"
              />
            </label>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <button
                type="button"
                disabled={!forName.trim()}
                onClick={() => startMax(false)}
                className="rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-30"
              >
                Abrir el estudio
              </button>
              <button type="button" onClick={() => startMax(true)} className="text-[14px] text-brass">
                Prefiero un ejemplo
              </button>
            </div>
            {error && <p className="mt-4 text-[15px] text-[#8a3d32]">{error}</p>}
          </div>
        )}

        {phase === 'wizard' && current && (
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
            <div>
              <button
                type="button"
                onClick={() => (step === 0 ? setPhase('modo') : setStep((n) => n - 1))}
                className="text-[13px] text-inkwell/45"
              >
                ← {step === 0 ? 'Modo' : 'Anterior'}
              </button>
              <div className="mt-6 flex gap-1.5">
                {WIZARD.map((item, i) => (
                  <span key={item.eyebrow} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-brass' : 'bg-black/10'}`} />
                ))}
              </div>
              <p className="mt-8 text-[12px] uppercase tracking-[0.22em] text-brass">{current.eyebrow}</p>
              <PlanMark plan={chosen} onChange={() => setAsk('plantilla')} />
              <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,3.8rem)] italic leading-[0.95]">{current.title}</h1>
              <p className="mt-3 max-w-md text-[16px] leading-relaxed text-inkwell/55">{current.hint}</p>
              <form
                className="mt-8 grid gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (step < WIZARD.length - 1) {
                    if (!canNext) return;
                    haptic('light');
                    setStep((n) => n + 1);
                  } else {
                    finishEasy();
                  }
                }}
              >
                {current.fields.map((field) =>
                  field.multiline ? (
                    <label key={field.name} className="block">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">{field.label}</span>
                      <textarea
                        autoFocus={field === current.fields[0]}
                        rows={5}
                        value={answers[field.name]}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="mt-2 w-full resize-none rounded-[22px] bg-white px-4 py-3 text-[17px] leading-relaxed outline-none ring-1 ring-black/10 placeholder:text-inkwell/25"
                      />
                    </label>
                  ) : (
                    <label key={field.name} className="block">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">{field.label}</span>
                      <input
                        autoFocus={field === current.fields[0]}
                        value={answers[field.name]}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [field.name]: e.target.value }))}
                        placeholder={field.placeholder}
                        className="mt-2 w-full border-b border-black/12 bg-transparent py-3 font-display text-3xl italic outline-none placeholder:text-inkwell/20"
                      />
                    </label>
                  ),
                )}
              {step === WIZARD.length - 1 && (
                <div className="mt-8">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-inkwell/40">El color de la noche</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {THEMES.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setAnswers((prev) => ({ ...prev, themeId: item.id }))}
                        className={`h-11 w-11 rounded-full ring-2 ring-offset-2 ${answers.themeId === item.id ? 'ring-inkwell' : 'ring-transparent'}`}
                        style={{ background: item.skyFrom }}
                        aria-label={item.id}
                      />
                    ))}
                  </div>
                </div>
              )}
              <div className="mt-10 flex flex-wrap items-center gap-4">
                {step < WIZARD.length - 1 ? (
                  <>
                    <button type="submit" disabled={!canNext} className="rounded-full bg-inkwell px-6 py-3 text-linen disabled:opacity-30">
                      Seguir
                    </button>
                    {step > 0 && (
                      <button type="button" onClick={() => setStep((n) => n + 1)} className="text-[14px] text-inkwell/45">
                        Saltar este
                      </button>
                    )}
                  </>
                ) : (
                  <button type="submit" className="rounded-full bg-inkwell px-6 py-3 text-linen">
                    Crear el universo
                  </button>
                )}
              </div>
              {error && <p className="text-[15px] text-[#8a3d32]">{error}</p>}
              </form>
            </div>
            <aside className="hidden overflow-hidden rounded-[32px] lg:block" style={{ background: theme.skyMid, color: theme.paper }}>
              <div className="relative min-h-[28rem] p-8">
                <p className="text-[11px] uppercase tracking-[0.2em] opacity-50">Así va quedando</p>
                <p className="mt-6 font-display text-5xl italic leading-[0.95]">{preview}</p>
                {answers.fromName.trim() && <p className="mt-3 text-[15px] opacity-55">de {answers.fromName.trim()}</p>}
                <ul className="mt-10 space-y-4 text-[15px] leading-relaxed opacity-75">
                  {(answers.metWhen.trim() || answers.metWhere.trim()) && (
                    <li>
                      Os conocisteis {[answers.metWhen.trim(), answers.metWhere.trim()].filter(Boolean).join(', ')}.
                    </li>
                  )}
                  {answers.metWhat.trim() && <li>{answers.metWhat.trim()}</li>}
                  {answers.memoryTitle.trim() && <li>El momento: {answers.memoryTitle.trim()}.</li>}
                  {answers.wish.trim() && <li>Un deseo: {answers.wish.trim()}.</li>}
                </ul>
                <span className="absolute right-10 top-24 text-6xl opacity-20">✦</span>
              </div>
            </aside>
          </div>
        )}
        {ask && (
          <PlanGate
            family={ask}
            onClose={() => setAsk(null)}
            onUse={(plan) => {
              const template: TemplateId = familyOf(plan) === 'cita' ? 'cita' : 'universo';
              if (phase === 'plantilla') enter(template, plan);
              else {
                setChosen(plan);
                setAsk(null);
              }
            }}
          />
        )}
      </div>
    </HubShell>
  );
}

function stockLine(rows: Purchase[], family: PlanFamily) {
  const free = freeInFamily(rows, family);
  if (free > 0) return `${free} ${free === 1 ? 'libre' : 'libres'}`;
  return `Desde ${family === 'cita' ? euros(295) : euros(1295)}`;
}

function PlanMark({ plan, onChange }: { plan: PlanId | null; onChange: () => void }) {
  if (!plan) return null;
  return (
    <p className="mt-4 text-[13px] text-brass">
      Con {planLabel(plan)}
      <button type="button" onClick={onChange} className="ml-3 underline decoration-brass/40">
        Cambiar
      </button>
    </p>
  );
}

function ModeCard({
  kicker,
  title,
  body,
  points,
  action,
  onPick,
  gold,
}: {
  kicker: string;
  title: string;
  body: string;
  points: string[];
  action: string;
  onPick: () => void;
  gold?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onPick}
      className={`flex h-full flex-col rounded-[32px] p-7 text-left outline-none transition hover:-translate-y-0.5 ${
        gold ? 'bg-inkwell text-linen shadow-[0_22px_50px_rgba(40,28,16,0.18)]' : 'bg-white text-inkwell ring-1 ring-black/10'
      }`}
    >
      <p className={`text-[11px] uppercase tracking-[0.2em] ${gold ? 'text-[#e8b86d]' : 'text-brass'}`}>{kicker}</p>
      <h2 className="mt-4 font-display text-[2.4rem] italic leading-[0.95]">{title}</h2>
      <p className={`mt-4 text-[16px] leading-relaxed ${gold ? 'text-linen/65' : 'text-inkwell/60'}`}>{body}</p>
      <ul className={`mt-6 space-y-2 text-[14px] ${gold ? 'text-linen/55' : 'text-inkwell/50'}`}>
        {points.map((point) => (
          <li key={point}>· {point}</li>
        ))}
      </ul>
      <span className={`mt-8 inline-flex self-start rounded-full px-5 py-2.5 text-[14px] ${gold ? 'bg-[#e8b86d] text-inkwell' : 'bg-inkwell text-linen'}`}>
        {action}
      </span>
    </button>
  );
}
