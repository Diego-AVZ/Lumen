import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CHAINS, createPath, euros, planById, type ChainId, type PayAsset, type PlanId } from '@/lib/plans';
import { mockCheckout } from '@/lib/purchases';

type Rail = 'card' | 'crypto';
type Phase = 'form' | 'confirm' | 'working' | 'done';

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function mockAddress() {
  const bytes = crypto.getRandomValues(new Uint8Array(20));
  return `0x${[...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')}`;
}

function shortAddress(value: string) {
  return `${value.slice(0, 6)}…${value.slice(-4)}`;
}

export function PayModal({ plan: planId, onClose, onCreate }: { plan: PlanId; onClose: () => void; onCreate?: (plan: PlanId) => void }) {
  const navigate = useNavigate();
  const plan = planById(planId);
  const gone = useRef(false);
  const paying = useRef(false);
  const [rail, setRail] = useState<Rail>('card');
  const [asset, setAsset] = useState<PayAsset>('usdc');
  const [network, setNetwork] = useState<ChainId>('base');
  const [wallet, setWallet] = useState<string | null>(null);
  const [linking, setLinking] = useState(false);
  const [phase, setPhase] = useState<Phase>('form');
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [reference, setReference] = useState('');

  useEffect(() => {
    gone.current = false;
    return () => {
      gone.current = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && phase !== 'working') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, phase]);

  const chainName = CHAINS.find((item) => item.id === network)?.name ?? network;
  const coin = asset.toUpperCase();
  const steps = rail === 'card' ? ['Preparando el cobro', 'Confirmando la tarjeta'] : ['Conectando la wallet', `Aprobando ${coin}`, 'Firmando el pago'];

  const connect = async () => {
    setLinking(true);
    await wait(480);
    if (!gone.current) {
      setWallet(mockAddress());
      setLinking(false);
    }
  };

  const run = async () => {
    if (paying.current) return;
    paying.current = true;
    setPhase('working');
    setError('');
    setStep(0);
    const delay = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 160 : 680;
    for (let index = 0; index < steps.length; index += 1) {
      setStep(index);
      await wait(delay);
      if (gone.current) return;
    }
    try {
      const row = await mockCheckout({
        plan: plan.id,
        rail,
        asset: rail === 'crypto' ? asset : 'card',
        network: rail === 'crypto' ? network : '',
        wallet: rail === 'crypto' ? wallet ?? '' : '',
      });
      if (gone.current) return;
      setReference(row.id.slice(0, 8));
      setPhase('done');
    } catch (err) {
      paying.current = false;
      if (gone.current) return;
      setError(err instanceof Error ? err.message : 'No se pudo guardar el pago.');
      setPhase('confirm');
    }
  };

  const create = () => {
    if (onCreate) onCreate(plan.id);
    else navigate(createPath(plan.id));
  };

  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-end bg-[#12100e]/55 p-3 sm:place-items-center"
      onClick={() => (phase === 'working' ? undefined : onClose())}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pay-title"
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-[32px] bg-linen p-6 text-inkwell shadow-[0_24px_60px_rgba(20,14,10,0.28)] sm:p-8"
        onClick={(event) => event.stopPropagation()}
      >
        {phase === 'done' ? (
          <>
            <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Listo</p>
            <h2 id="pay-title" className="mt-3 font-display text-[2.6rem] italic leading-[0.95]">
              {plan.name} ya es tuyo
            </h2>
            <p className="mt-4 text-[16px] leading-relaxed text-inkwell/65">
              {euros(plan.priceCents)} · pago de prueba. No se ha cobrado.
              {reference ? ` Referencia ${reference}.` : ''} Queda libre hasta que crees el proyecto.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={create} className="rounded-full bg-inkwell px-5 py-3 text-[14px] text-linen">
                Crear ahora
              </button>
              <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-[14px] ring-1 ring-black/10">
                Cerrar
              </button>
            </div>
          </>
        ) : phase === 'working' ? (
          <>
            <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Un momento</p>
            <h2 id="pay-title" className="mt-3 font-display text-[2.4rem] italic leading-[0.95]">
              Cerrando el pago
            </h2>
            <ol className="mt-7 space-y-3">
              {steps.map((label, index) => {
                const state = index < step ? 'done' : index === step ? 'now' : 'wait';
                return (
                  <li key={label} className="flex items-center gap-3">
                    <span
                      className={`grid h-8 w-8 place-items-center rounded-full text-[12px] ${
                        state === 'wait' ? 'bg-white text-inkwell/30 ring-1 ring-black/10' : 'bg-inkwell text-linen'
                      } ${state === 'now' ? 'lumen-pay-pulse' : ''}`}
                    >
                      {index + 1}
                    </span>
                    <span className={state === 'wait' ? 'text-inkwell/40' : ''}>{label}</span>
                  </li>
                );
              })}
            </ol>
          </>
        ) : phase === 'confirm' ? (
          <>
            <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Confirmar pago</p>
            <h2 id="pay-title" className="mt-3 font-display text-[2.6rem] italic leading-[0.95]">
              {plan.name}
            </h2>
            <p className="mt-3 font-display text-4xl italic">{euros(plan.priceCents)}</p>
            <p className="mt-4 text-[15px] leading-relaxed text-inkwell/65">
              {rail === 'card'
                ? 'Tarjeta de prueba, por Stripe. No se cobra y no guardamos el número.'
                : `Aprobar ${coin} en ${chainName} y firmar. La wallet es simulada: no sale nada.`}
            </p>
            {rail === 'crypto' && wallet && (
              <p className="mt-3 text-[13px] text-inkwell/45">
                {shortAddress(wallet)} · {chainName} · {coin}
              </p>
            )}
            {error && <p className="mt-4 text-[14px] leading-relaxed text-[#8a3d32]">{error}</p>}
            <div className="mt-7 flex flex-wrap gap-3">
              <button type="button" onClick={() => void run()} className="rounded-full bg-inkwell px-5 py-3 text-[14px] text-linen">
                Confirmar pago
              </button>
              <button type="button" onClick={() => { setError(''); setPhase('form'); }} className="rounded-full px-5 py-3 text-[14px] ring-1 ring-black/10">
                Volver
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-brass">Pagar</p>
                <h2 id="pay-title" className="mt-2 font-display text-[2.5rem] italic leading-none">
                  {plan.name}
                </h2>
              </div>
              <p className="font-display text-3xl italic">{euros(plan.priceCents)}</p>
            </div>
            <p className="mt-4 text-[15px] leading-relaxed text-inkwell/60">{plan.line} Un pago abre un proyecto.</p>

            <div className="mt-6 grid grid-cols-2 gap-2 rounded-full bg-white p-1 ring-1 ring-black/5">
              {([
                ['card', 'Tarjeta'],
                ['crypto', 'Cripto'],
              ] as const).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setRail(id)}
                  className={`rounded-full px-3 py-2.5 text-[14px] ${rail === id ? 'bg-inkwell text-linen' : 'text-inkwell/55'}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {rail === 'card' ? (
              <div className="mt-6">
                <p className="text-[12px] uppercase tracking-[0.16em] text-inkwell/40">Stripe · datos de prueba</p>
                <label className="mt-3 block">
                  <span className="text-[12px] text-inkwell/45">Número</span>
                  <input
                    inputMode="numeric"
                    autoComplete="off"
                    placeholder="4242 4242 4242 4242"
                    className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-[16px] outline-none ring-1 ring-black/10 placeholder:text-inkwell/25"
                  />
                </label>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <label>
                    <span className="text-[12px] text-inkwell/45">Caduca</span>
                    <input
                      autoComplete="off"
                      placeholder="12/28"
                      className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-[16px] outline-none ring-1 ring-black/10 placeholder:text-inkwell/25"
                    />
                  </label>
                  <label>
                    <span className="text-[12px] text-inkwell/45">CVC</span>
                    <input
                      inputMode="numeric"
                      autoComplete="off"
                      placeholder="123"
                      className="mt-1 w-full rounded-2xl bg-white px-4 py-3 text-[16px] outline-none ring-1 ring-black/10 placeholder:text-inkwell/25"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="mt-6">
                <p className="text-[12px] uppercase tracking-[0.16em] text-inkwell/40">Moneda</p>
                <div className="mt-2 flex gap-2">
                  {(['usdc', 'usdt'] as const).map((id) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setAsset(id)}
                      className={`rounded-full px-4 py-2 text-[13px] uppercase tracking-[0.14em] ${
                        asset === id ? 'bg-inkwell text-linen' : 'bg-white text-inkwell/60 ring-1 ring-black/10'
                      }`}
                    >
                      {id}
                    </button>
                  ))}
                </div>
                <p className="mt-5 text-[12px] uppercase tracking-[0.16em] text-inkwell/40">Red</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {CHAINS.map((chain) => (
                    <button
                      key={chain.id}
                      type="button"
                      onClick={() => setNetwork(chain.id)}
                      className={`rounded-full px-3 py-1.5 text-[13px] ${
                        network === chain.id ? 'bg-[#e8b86d] text-inkwell' : 'bg-white text-inkwell/60 ring-1 ring-black/10'
                      }`}
                    >
                      {chain.name}
                    </button>
                  ))}
                </div>
                <div className="mt-5 flex items-center justify-between gap-3 rounded-[22px] bg-white px-4 py-3 ring-1 ring-black/5">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.16em] text-brass">Wallet</p>
                    <p className="mt-1 text-[14px]">{wallet ? shortAddress(wallet) : 'Sin conectar'}</p>
                  </div>
                  <button type="button" onClick={() => (wallet ? setWallet(null) : void connect())} className="text-[13px] text-brass">
                    {linking ? 'Conectando…' : wallet ? 'Quitar' : 'Conectar'}
                  </button>
                </div>
                <ol className="mt-4 space-y-1 text-[13px] text-inkwell/50">
                  <li>1 · Conectar la wallet</li>
                  <li>2 · Aprobar el gasto de {coin}</li>
                  <li>3 · Firmar el pago</li>
                </ol>
              </div>
            )}

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="button"
                disabled={rail === 'crypto' && !wallet}
                onClick={() => setPhase('confirm')}
                className="rounded-full bg-inkwell px-5 py-3 text-[14px] text-linen disabled:opacity-30"
              >
                Pagar {euros(plan.priceCents)}
              </button>
              <button type="button" onClick={onClose} className="rounded-full px-5 py-3 text-[14px] ring-1 ring-black/10">
                Ahora no
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
