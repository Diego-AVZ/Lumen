import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PayModal } from '@/hub/PayModal';
import { euros, isPlanId, PLAN_GROUPS, planById, plansInFamily, type PlanId } from '@/lib/plans';
import { tally, usePurchases } from '@/lib/purchases';

export function PlanShop() {
  const [params, setParams] = useSearchParams();
  const asked = params.get('plan');
  const [pay, setPay] = useState<PlanId | null>(isPlanId(asked) ? asked : null);
  const { rows, error } = usePurchases();
  const bought = rows ?? [];

  const close = () => {
    setPay(null);
    if (!params.get('plan')) return;
    params.delete('plan');
    setParams(params, { replace: true });
  };

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Plan</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <h1 className="max-w-[14ch] font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">Contrata el regalo</h1>
        <Link to="/crear?vista=uso" className="text-[13px] uppercase tracking-[0.14em] text-brass">
          Ver uso
        </Link>
      </div>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        Cita, Cita pro, Plantilla basic y Plantilla pro. Crear sigue siendo gratis: el saldo se aplica al publicar. Hoy es una prueba: no se cobra.
      </p>
      {error && (
        <p className="mt-5 max-w-xl rounded-[22px] bg-white px-5 py-4 text-[15px] leading-relaxed text-[#8a3d32] ring-1 ring-black/5">
          {error}
        </p>
      )}

      <div className="mt-10 space-y-10">
        {PLAN_GROUPS.map((group) => (
          <section key={group.id}>
            <h2 className="font-display text-3xl italic">{group.label}</h2>
            <p className="mt-1 text-[15px] text-inkwell/50">{group.hint}</p>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              {plansInFamily(group.id).map((plan) => {
                const free = tally(bought, plan.id).free;
                const hot = asked === plan.id;
                return (
                  <article
                    key={plan.id}
                    className={`flex h-full flex-col rounded-[32px] p-6 sm:p-7 ${
                      plan.rich ? 'bg-inkwell text-linen' : 'bg-white text-inkwell ring-1 ring-black/5'
                    } ${hot ? 'outline outline-2 outline-offset-4 outline-[#e8b86d]' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className={`text-[11px] uppercase tracking-[0.18em] ${plan.rich ? 'text-[#e8b86d]' : 'text-brass'}`}>
                        {plan.family === 'cita' ? 'Sobre' : 'Plantilla'}
                      </p>
                      {free > 0 && (
                        <span className={`rounded-full px-2.5 py-1 text-[11px] ${plan.rich ? 'bg-white/10 text-[#e8b86d]' : 'bg-linen text-brass'}`}>
                          {free} {free === 1 ? 'libre' : 'libres'}
                        </span>
                      )}
                    </div>
                    <h3 className="mt-4 font-display text-[2.5rem] italic leading-none">{plan.name}</h3>
                    <p className="mt-4 font-display text-5xl italic leading-none">{euros(plan.priceCents)}</p>
                    <p className={`mt-4 text-[16px] leading-relaxed ${plan.rich ? 'text-linen/70' : 'text-inkwell/60'}`}>{plan.line}</p>
                    <ul className={`mt-5 space-y-1.5 text-[14px] ${plan.rich ? 'text-linen/55' : 'text-inkwell/50'}`}>
                      {plan.points.map((point) => (
                        <li key={point}>· {point}</li>
                      ))}
                    </ul>
                    <button
                      type="button"
                      onClick={() => setPay(plan.id)}
                      className={`mt-7 self-start rounded-full px-5 py-3 text-[14px] ${plan.rich ? 'bg-[#e8b86d] text-inkwell' : 'bg-inkwell text-linen'}`}
                    >
                      Pagar
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        ))}
      </div>
      <p className="mt-10 max-w-xl text-[14px] leading-relaxed text-inkwell/45">
        El precio exacto lo ves al construir. Si el regalo pide más, al publicar solo falta la diferencia.
      </p>
      {pay && (
        <PayModal
          title={planById(pay).name}
          cents={planById(pay).priceCents}
          projectId=""
          family={planById(pay).family}
          credit={pay}
          onClose={close}
          onPaid={close}
        />
      )}
    </main>
  );
}
