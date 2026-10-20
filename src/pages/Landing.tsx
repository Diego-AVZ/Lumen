import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { exampleDocument } from '@/schema/example';
import type { PlayerFrame } from '@/universe/UniversePlayer';
import type { Star, UniverseDocument } from '@/schema/universe';
import { PhoneChrome } from '@/studio/PhoneStage';
import { UniversePlayer } from '@/universe/UniversePlayer';

const TOUR: { label: string; frame: PlayerFrame; star: string | null; wait: number }[] = [
  { label: 'La dedicatoria', frame: 'intro', star: null, wait: 2600 },
  { label: 'El cielo', frame: 'sky', star: null, wait: 3400 },
  { label: 'Historia', frame: 'star', star: 'star_historia', wait: 4600 },
  { label: 'El cielo', frame: 'sky', star: null, wait: 2200 },
  { label: 'Lista', frame: 'star', star: 'star_lista', wait: 5600 },
  { label: 'Carta', frame: 'star', star: 'star_carta', wait: 4000 },
];

const POLAROID =
  'data:image/svg+xml,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 4 5"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#f6e7cf"/><stop offset="0.5" stop-color="#e0a36a"/><stop offset="1" stop-color="#6a4330"/></linearGradient></defs><rect width="4" height="5" fill="url(#g)"/><circle cx="2.75" cy="1.1" r="0.38" fill="#fff6e4"/></svg>',
  );

function solo(base: UniverseDocument, star: Star): UniverseDocument {
  return { ...base, soundtrack: { url: '', label: '' }, stars: [{ ...star, x: 1100, y: 980 }] };
}

function useReduced() {
  const [value, setValue] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setValue(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);
  return value;
}

function ScaledPhone({ scale, children }: { scale: number; children: ReactNode }) {
  return (
    <div style={{ width: 414 * scale, height: 868 * scale }}>
      <div style={{ width: 414, height: 868, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <PhoneChrome>{children}</PhoneChrome>
      </div>
    </div>
  );
}

function FitPhone({ children }: { children: ReactNode }) {
  const [scale, setScale] = useState(0.62);
  useEffect(() => {
    const fit = () => {
      const w = Math.min(window.innerWidth * 0.9, 460);
      const h = Math.min(window.innerHeight * 0.72, 760);
      setScale(Math.max(0.42, Math.min(w / 414, h / 868, 0.78)));
    };
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);
  return <ScaledPhone scale={scale}>{children}</ScaledPhone>;
}

function WhenSeen({ height, children }: { height: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setOn(true);
      },
      { rootMargin: '240px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} style={{ minHeight: height }}>
      {on ? children : null}
    </div>
  );
}

function HeroTour({ doc }: { doc: UniverseDocument }) {
  const reduced = useReduced();
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(!reduced);
  const [override, setOverride] = useState<{ frame: PlayerFrame; star: string | null } | null>(null);
  const tour = TOUR[step] ?? TOUR[0]!;
  const current = override ?? tour;

  useEffect(() => {
    if (!playing || override) return;
    const wait = TOUR[step]?.wait ?? 3000;
    const timer = window.setTimeout(() => setStep((value) => (value + 1) % TOUR.length), wait);
    return () => window.clearTimeout(timer);
  }, [override, playing, step]);

  return (
    <div className="flex flex-col items-center">
      <div
        onPointerDown={() => {
          if (playing) setPlaying(false);
        }}
      >
        <FitPhone>
          <UniversePlayer
            doc={doc}
            framed
            frame={current.frame}
            starId={current.star}
            onUserFrame={(frame, starId) => {
              setPlaying(false);
              setOverride({ frame, star: starId ?? null });
            }}
          />
        </FitPhone>
      </div>
      <div className="mt-4 flex items-center gap-3 text-[13px] tracking-wide text-inkwell/50">
        <span>{playing ? tour.label : 'Lo mueves tú'}</span>
        {!playing && (
          <button
            type="button"
            className="text-brass"
            onClick={() => {
              setOverride(null);
              setPlaying(true);
            }}
          >
            Recorrer otra vez
          </button>
        )}
      </div>
    </div>
  );
}

export function Landing() {
  const scenes = useMemo(() => {
    const base = exampleDocument();
    const byType = (type: Star['type']) => base.stars.find((star) => star.type === type);
    const historia = byType('historia');
    const lista = byType('lista');
    const carta = byType('carta');
    const notas = byType('notas');
    const play = Math.random().toString(16).slice(2, 8);
    const archivo: Star = {
      id: 'demo_archivo',
      type: 'archivo',
      x: 1100,
      y: 980,
      kicker: 'fotos',
      label: 'Archivo',
      glyph: '◎',
      photos: [
        { id: 'ph1', src: POLAROID, caption: 'La luz de esa tarde.' },
        { id: 'ph2', src: POLAROID, caption: 'El camino de vuelta.' },
      ],
    };
    const secreto: Star = {
      id: 'demo_secreto',
      type: 'secreto',
      x: 1100,
      y: 980,
      kicker: 'solo tú',
      label: 'Secreto',
      glyph: '◈',
      phrase: 'orion',
      hint: 'El nombre de la constelación que buscamos.',
      entries: [{ id: 'sec1', title: 'Lo que no dije', body: 'Estaba nervioso. Se notaba menos de lo que yo creía.' }],
    };
    const lugares: Star = {
      id: 'demo_lugares',
      type: 'lugares',
      x: 1100,
      y: 980,
      kicker: 'mapa',
      label: 'Lugares',
      glyph: '⌖',
      intro: 'Sitios que ya tienen una historia.',
      places: [
        { id: 'pl1', emoji: '🌊', title: 'La orilla', body: 'Ahí se quedó el silencio bueno.', lat: '36.721', lng: '-4.415' },
        { id: 'pl2', emoji: '☕', title: 'El café', body: 'El que estaba abierto. Pedimos lo mismo.', lat: '40.415', lng: '-3.707' },
      ],
    };
    return {
      hero: base,
      historia: historia ? solo(base, historia) : base,
      lista: lista ? solo(base, { ...lista, id: `demo_lista_${play}` }) : base,
      carta: carta ? solo(base, carta) : base,
      notas: notas ? solo(base, notas) : base,
      archivo: solo(base, archivo),
      secreto: solo(base, secreto),
      lugares: solo(base, lugares),
    };
  }, []);

  const features: {
    id: string;
    glyph: string;
    name: string;
    line: string;
    body: string;
    doc: UniverseDocument;
    star: string;
  }[] = [
    {
      id: 'historia',
      glyph: '✦',
      name: 'Historia',
      line: 'Se desliza como quien pasa una página.',
      body: 'Cada capítulo va de lado. Dentro, los momentos bajan. Un gesto corto ya cambia de página: no hace falta arrastrar hasta el fondo. En un capítulo puedes pegar una canción, y aparece un botón para escucharla ahí.',
      doc: scenes.historia,
      star: 'star_historia',
    },
    {
      id: 'lista',
      glyph: '▴',
      name: 'Lista',
      line: 'Estrellas fugaces con fecha.',
      body: 'Cada deseo orbita hasta el día que eliges. Ese día cae, se queda en tierra y pasa al talonario. Los que todavía no tocan siguen arriba, con la fecha de la próxima caída escrita debajo. Si ya se vivió, está en tierra desde el principio.',
      doc: scenes.lista,
      star: scenes.lista.stars[0]?.id ?? 'star_lista',
    },
    {
      id: 'carta',
      glyph: '—',
      name: 'Carta',
      line: 'Una página, para leer despacio.',
      body: 'Un título, párrafos y una firma. Sirve para lo que no cabe en un capítulo: lo que quieres que lea sentada, del tirón, al final o nada más entrar.',
      doc: scenes.carta,
      star: 'star_carta',
    },
    {
      id: 'notas',
      glyph: '🌿',
      name: 'Notas',
      line: 'Tarjetas para días concretos.',
      body: 'Pequeñas, con un símbolo y unas líneas. Un día claro, un día largo, un recordatorio. Se pasan como fichas, sin convertirse en un relato.',
      doc: scenes.notas,
      star: 'star_notas',
    },
    {
      id: 'archivo',
      glyph: '◎',
      name: 'Archivo',
      line: 'Polaroids.',
      body: 'Una foto y una frase debajo. Se hojean en un álbum oscuro. Las imágenes se comprimen al subirlas, para que el enlace abra rápido también en el móvil.',
      doc: scenes.archivo,
      star: 'demo_archivo',
    },
    {
      id: 'secreto',
      glyph: '◈',
      name: 'Secreto',
      line: 'No se abre sin una frase.',
      body: 'Una pista, y una palabra que solo esa persona sabe. Hasta que la escribe, el texto no está. Es un gesto, no una cerradura: quien tiene el enlace puede intentarlo.',
      doc: scenes.secreto,
      star: 'demo_secreto',
    },
    {
      id: 'lugares',
      glyph: '⌖',
      name: 'Lugares',
      line: 'El mapa de lo que ya pasó.',
      body: 'Un sitio, una coordenada y lo que ocurrió allí. Se ven en una lista y, si quieres, en el mapa. Sirve para la orilla, el café, la esquina donde os quedasteis.',
      doc: scenes.lugares,
      star: 'demo_lugares',
    },
  ];

  return (
    <div className="min-h-dvh bg-linen text-inkwell">
      <header className="sticky top-0 z-30 flex items-center justify-between bg-linen/80 px-5 py-4 backdrop-blur-md sm:px-8">
        <a href="#arriba" className="font-display text-[1.7rem] italic leading-none">
          Lumen
        </a>
        <nav className="flex items-center gap-5 text-[14px]">
          <a href="#estrellas" className="hidden text-inkwell/70 sm:block">
            Estrellas
          </a>
          <a href="#como" className="hidden text-inkwell/70 md:block">
            Cómo funciona
          </a>
          <Link to="/crear" className="text-inkwell/70">
            Estudio
          </Link>
          <Link to="/crear/nuevo" className="rounded-full bg-inkwell px-4 py-2 text-linen">
            Crear
          </Link>
        </nav>
      </header>

      <main id="arriba">
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:pt-14">
          <div>
            <p className="text-[12px] uppercase tracking-[0.28em] text-brass">Estudio de universos</p>
            <h1 className="mt-5 max-w-[11ch] font-display text-[clamp(3.3rem,7vw,5.6rem)] italic leading-[0.9] tracking-[-0.03em]">
              Un regalo que se explora.
            </h1>
            <p className="mt-6 max-w-[40ch] text-[18px] leading-relaxed text-inkwell/70">
              Un cielo con su nombre en el centro. Estrellas que se abren —una historia, una lista de fugaces, una carta— y, si quieres, música de Spotify con solo pegar el enlace. El móvil de al lado ya está recorriéndolo.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/crear/nuevo" className="rounded-full bg-inkwell px-6 py-3.5 text-[15px] text-linen">
                Crear un universo
              </Link>
              <a href="#estrellas" className="rounded-full px-5 py-3.5 text-[15px] text-inkwell/70">
                Ver cada estrella
              </a>
            </div>
          </div>
          <HeroTour doc={scenes.hero} />
        </section>

        <section id="como" className="border-y border-black/5">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-3">
            {[
              ['01', 'Escribes como si se lo contaras', 'La portada es un nombre. Cada estrella guarda un tipo de recuerdo, y se lee de una forma distinta.'],
              ['02', 'Lo ves en un móvil, mientras lo haces', 'Arrastras las estrellas por el cielo. Lo que cambias se guarda solo. La música y las fechas se pegan en el mismo sitio.'],
              ['03', 'Publicas un enlace', 'Se lo mandas. Lo abre, y está dentro. Con la misma Wi-Fi puedes probarlo hoy desde su teléfono.'],
            ].map(([n, title, body]) => (
              <article key={n}>
                <p className="font-display text-xl italic text-brass">{n}</p>
                <h2 className="mt-3 font-display text-[1.85rem] italic leading-[1.05]">{title}</h2>
                <p className="mt-3 text-[16px] leading-relaxed text-inkwell/65">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="estrellas" className="landing-night text-[#f3ead8]">
          {[
            { left: '8%', top: '6%', delay: '0s' },
            { left: '62%', top: '18%', delay: '3.2s' },
            { left: '78%', top: '46%', delay: '6.4s' },
            { left: '30%', top: '70%', delay: '1.8s' },
            { left: '88%', top: '82%', delay: '8s' },
          ].map((streak) => (
            <span key={streak.top + streak.left} className="landing-streak" style={{ left: streak.left, top: streak.top, animationDelay: streak.delay }} />
          ))}
          <div className="relative mx-auto max-w-6xl px-5 py-20 sm:px-8">
            <p className="text-[12px] uppercase tracking-[0.24em] text-[#e8b86d]">Las estrellas</p>
            <h2 className="mt-4 max-w-[14ch] font-display text-[clamp(2.6rem,5vw,4.2rem)] italic leading-[0.95]">
              Siete maneras de guardar un día.
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#f3ead8]/70">
              No es una lista de funciones. Cada estrella se abre distinto. La música no es una octava: es un botón en el cielo, o dentro de un capítulo. Pegas un enlace de Spotify —canción, álbum o lista— y suena. No hace falta cuenta de desarrollador ni un plan de pago.
            </p>

            <div className="mt-6 divide-y divide-white/10">
              {features.map((feature, index) => {
                const phone = 868 * 0.54;
                const flip = index % 2 === 1;
                return (
                  <article key={feature.id} className="grid items-center gap-8 py-14 lg:grid-cols-[1.05fr_0.95fr]">
                    <div className={flip ? 'lg:order-2' : ''}>
                      <p className="text-[#e8b86d]">
                        <span className="mr-3">{feature.glyph}</span>
                        <span className="text-[12px] uppercase tracking-[0.2em] text-[#f3ead8]/45">0{index + 1}</span>
                      </p>
                      <h3 className="mt-3 font-display text-[2.6rem] italic leading-none">{feature.name}</h3>
                      <p className="mt-3 font-display text-[1.35rem] italic text-[#f3ead8]/80">{feature.line}</p>
                      <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#f3ead8]/68">{feature.body}</p>
                    </div>
                    <div className={['flex justify-center', flip ? 'lg:order-1 lg:justify-start' : 'lg:justify-end'].join(' ')}>
                      <WhenSeen height={phone}>
                        <ScaledPhone scale={0.54}>
                          <UniversePlayer doc={feature.doc} framed frame="star" starId={feature.star} />
                        </ScaledPhone>
                      </WhenSeen>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <h2 className="font-display text-[clamp(2.6rem,5vw,4rem)] italic leading-[1]">Lo abre y está dentro.</h2>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-inkwell/65">
            La puerta, el nombre, el cielo, y después cada estrella. El enlace es el regalo.
          </p>
          <Link to="/crear/nuevo" className="mt-8 inline-block rounded-full bg-inkwell px-6 py-3.5 text-linen">
            Crear el primero
          </Link>
        </section>
      </main>

      <footer className="flex items-center justify-between border-t border-black/5 px-5 py-6 text-[13px] text-inkwell/45 sm:px-8">
        <span className="font-display text-xl italic text-inkwell">Lumen</span>
        <span>Hecho para regalar despacio.</span>
      </footer>
    </div>
  );
}
