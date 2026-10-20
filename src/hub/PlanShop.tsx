import { euros } from '@/lib/plans';
import { PRICE } from '@/lib/pricing';

export function PlanShop() {
  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <p className="text-[12px] uppercase tracking-[0.22em] text-brass">Plan</p>
      <h1 className="mt-3 max-w-[16ch] font-display text-[clamp(2.6rem,6vw,4.4rem)] italic leading-[0.92]">
        Se cobra al publicar
      </h1>
      <p className="mt-4 max-w-xl text-[16px] leading-relaxed text-inkwell/60">
        Crear es gratis. El precio de salida entra con la base. Lo que te pases —fotos, audios, texto— se suma, y lo ves en el estudio antes de enviar.
      </p>
      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        {Object.values(PRICE).map((book) => (
          <article key={book.id} className="rounded-[32px] bg-white p-6 ring-1 ring-black/5 sm:p-7">
            <p className="text-[11px] uppercase tracking-[0.18em] text-brass">{book.id === 'cita' ? 'Sobre' : 'Plantilla'}</p>
            <h2 className="mt-3 font-display text-4xl italic leading-none">{book.name}</h2>
            <p className="mt-4 font-display text-5xl italic leading-none">{euros(book.baseCents)}</p>
            <p className="mt-2 text-[13px] text-inkwell/45">Precio de salida</p>
            <ul className="mt-6 space-y-3">
              {book.meters.map((meter) => (
                <li key={meter.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span>
                    {meter.label}
                    <span className="mt-0.5 block text-[12px] text-inkwell/45">{meter.included} incluidas</span>
                  </span>
                  <span className="shrink-0 text-inkwell/70">+ {euros(meter.cents)} / {meter.pack === 1 ? 'extra' : meter.pack}</span>
                </li>
              ))}
              {book.features.map((feature) => (
                <li key={feature.id} className="flex items-baseline justify-between gap-3 text-[15px]">
                  <span>
                    {feature.label}
                    <span className="mt-0.5 block text-[12px] text-inkwell/45">Si lo usas</span>
                  </span>
                  <span className="shrink-0 text-inkwell/70">{feature.cents ? `+ ${euros(feature.cents)}` : 'Incluido'}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
      <p className="mt-8 max-w-xl text-[14px] leading-relaxed text-inkwell/45">
        Si publicas y luego añades más, el siguiente envío cobra solo la diferencia. Los números viven en el código, en las tarifas.
      </p>
    </main>
  );
}
