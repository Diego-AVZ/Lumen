import { Link } from 'react-router-dom';
import { GiftLinks } from '@/pages/GiftLinks';

export function Missing() {
  return (
    <div className="grid min-h-dvh place-items-center bg-[#0c0b0a] px-6 py-16 text-[#f3ead8]">
      <div className="w-full max-w-md text-center">
        <p className="font-display text-4xl italic leading-none">Este enlace no abre.</p>
        <p className="mx-auto mt-4 max-w-xs text-[15px] leading-relaxed text-[#f3ead8]/55">
          El regalo vive en una dirección concreta, del tipo /u/para-valeria. La portada del estudio no es el universo.
        </p>
        <GiftLinks />
        <Link to="/" className="mt-8 inline-block text-[13px] uppercase tracking-[0.18em] text-[#e8b86d]">
          Volver a Lumen
        </Link>
      </div>
    </div>
  );
}
