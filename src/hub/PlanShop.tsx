import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { PayModal } from '@/hub/PayModal';
import { euros, isPlanId, PLAN_GROUPS, planById, plansInFamily, type PlanFamily, type PlanId } from '@/lib/plans';
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
        Un pago abre un proyecto. Tarjeta o USDC/USDT, en la red que elijas. Hoy es una prueba: no se cobra.
      </p>
      {error && <p className="mt-5 max-w-xl rounded-[22px] bg-white px-5 py-4 text-[15px] leading-relaxed text-[#8a3d32] ring-1 ring-black/5">{error}</p>}

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
        Los límites de fotos, audio y lugares, y los efectos de Cita pro, se aplican al construir. El pago ya queda guardado en la cuenta.
      </p>
      {pay && <PayModal plan={pay} onClose={close} />}
    </main>
  );
}

export function PlanGate({
  family,
  onUse,
  onClose,
}: {
  family: PlanFamily;
  onUse: (plan: PlanId) => void;
  onClose: () => void;
}) {
  const { rows } = usePurchases();
  const [pay, setPay] = useState<PlanId | null>(null);
  const offers = plansInFamily(family);
  const bought = rows ?? [];
  const hasFree = offers.some((plan) => tally(bought, plan.id).free > 0);

  return (
    <>
      <div className="fixed inset-0 z-[70] grid place-items-end bg-[#12100e]/50 p-3 sm:place-items-center" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="gate-title"
          className="w-full max-w-lg rounded-[32px] bg-linen p-6 text-inkwell shadow-[0_24px_60px_rgba(20,14,10,0.28)] sm:p-8"
          onClick={(event) => event.stopPropagation()}
        >
          <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Crear</p>
          <h2 id="gate-title" className="mt-3 font-display text-[2.4rem] italic leading-[0.95]">
            {hasFree ? (family === 'cita' ? '¿Qué sobre abres?' : '¿Qué plantilla abres?') : family === 'cita' ? 'Hace falta un sobre' : 'Hace falta una plantilla'}
          </h2>
          <p className="mt-3 text-[15px] leading-relaxed text-inkwell/60">
            {hasFree
              ? 'Elige el plan que tienes libre. Si quieres el otro, puedes pagarlo.'
              : 'Un pago abre un proyecto. Tarjeta o USDC/USDT. Hoy no se cobra.'}
          </p>
          <ul className="mt-6 grid gap-3">
            {offers.map((plan) => {
              const free = tally(bought, plan.id).free;
              return (
                <li key={plan.id} className="flex items-center justify-between gap-3 rounded-[24px] bg-white px-4 py-4 ring-1 ring-black/5">
                  <div>
                    <p className="font-display text-[1.7rem] italic leading-none">{plan.name}</p>
                    <p className="mt-1 text-[13px] text-inkwell/50">
                      {euros(plan.priceCents)}
                      {' · '}
                      {free > 0 ? `${free} ${free === 1 ? 'libre' : 'libres'}` : 'sin comprar'}
                    </p>
                  </div>
                  {free > 0 ? (
                    <button type="button" onClick={() => onUse(plan.id)} className="rounded-full bg-inkwell px-4 py-2 text-[13px] text-linen">
                      Usar
                    </button>
                  ) : (
                    <button type="button" onClick={() => setPay(plan.id)} className="rounded-full px-4 py-2 text-[13px] ring-1 ring-black/10">
                      Pagar
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <button type="button" onClick={onClose} className="mt-5 text-[13px] text-inkwell/45">
            Ahora no
          </button>
        </div>
      </div>
      {pay && (
        <PayModal
          plan={pay}
          onClose={() => setPay(null)}
          onCreate={(plan) => {
            setPay(null);
            onUse(plan);
          }}
        />
      )}
    </>
  );
}

export function planLabel(id: PlanId) {
  return planById(id).name;
}
