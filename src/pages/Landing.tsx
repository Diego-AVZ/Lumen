import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { TEMPLATES, type TemplateId } from '@/hub/catalog';
import { DateAskPlayer } from '@/cita/DateAskPlayer';
import { blankCita, type DateAskDocument } from '@/schema/cita';
import { exampleDocument } from '@/schema/example';
import type { PlayerFrame } from '@/universe/UniversePlayer';
import type { Star, UniverseDocument } from '@/schema/universe';
import { PhoneChrome } from '@/studio/PhoneStage';
import { UniversePlayer } from '@/universe/UniversePlayer';
import { WebPlayer } from '@/web/WebPlayer';
import { sampleWeb, type WebDocument } from '@/schema/web';
import { TripPlayer } from '@/viaje/TripPlayer';
import { sampleTrip, type TripDocument } from '@/schema/viaje';

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

function ProjectStory({ id, cita, web, viaje }: { id: TemplateId; cita: DateAskDocument; web: WebDocument; viaje: TripDocument }) {
  const story = {
    cita: {
      kicker: 'El sobre',
      title: 'Pedir cita',
      line: 'Se abre a toques, no de un tirón.',
      body: 'Le dejas su nombre y el tuyo. Una pregunta —de las que ya están, o la escribes tú—. Una nota corta, de las que se leen antes de contestar. Y dos o tres horas, por si dice que sí: el viernes a las nueve, el sábado por la tarde. El sello hay que tocarlo seis veces. El no se escurre. El sí se queda, con el día que eligió.',
    },
    carta: {
      kicker: 'La página',
      title: 'Carta larga',
      line: 'Sin cielo. Para leerla sentada.',
      body: 'Un título, el texto todo seguido, y cómo firmas al final. Sirve cuando lo que quieres decir no cabe en una estrella: que lo lea del tirón, sin pasar páginas ni buscar constelaciones. Puedes dejar también una línea pequeña al pie, como quien añade algo después de cerrar la carta.',
    },
    album: {
      kicker: 'Las fotos',
      title: 'Álbum',
      line: 'Se hojea. No se cuenta.',
      body: 'Cada foto va como una polaroid: la imagen, la fecha y una frase debajo. La tarde de la orilla, el camino de vuelta, esa en la que salís mal y da igual. No hace falta un relato. Basta con pasarlas.',
    },
    deseos: {
      kicker: 'Los dos',
      title: 'Lista de deseos',
      line: 'Se escribe entre dos, y la ruleta no miente.',
      body: 'Cada uno va dejando planes: una tarde, un día, un finde, unas vacaciones. Tranquilo, aventura, un viaje. Cuando toca —cada semana, o el plazo que elijáis— los dos giráis con los mismos filtros y sale el mismo plan. Queda en por hacer, hasta que lo marcáis como vivido.',
    },
    mapa: {
      kicker: 'Los sitios',
      title: 'Mapa de lugares',
      line: 'Dónde estuvisteis, y qué pasó ahí.',
      body: 'La orilla, el café, la esquina donde os quedasteis. En cada sitio, una frase de lo que ocurrió. Se leen en lista y, si quieres, encima del mapa. Para volver a un lugar sin tener que explicarlo entero.',
    },
    web: {
      kicker: 'La página',
      title: 'Web personalizada',
      line: 'Como el universo, en formato web.',
      body: 'Textos, fotos, audios y un enlace de Spotify. Se puede leer por sitios o de un tirón. Un sitio puede pedir una respuesta antes de abrirse. Un corazón se toca, como en la cita, y detrás hay un detalle o una foto. La lista no es un cielo: cada cierto tiempo se elige entre dos planes y la elección se queda. Y hay mapa. La base son 12,95 €. Se cobra al publicar.',
    },
    viaje: {
      kicker: 'El mapa',
      title: 'El viaje',
      line: 'Primero el recorrido entero. Luego, cada parada.',
      body: 'El satélite ocupa media pantalla, con nombres de pueblos y ciudades. Se toca un punto, o se pasa al siguiente. En cada parada: el título, una frase, la foto y el plan. Al final, las cuentas: por día, por persona y el total, en euros o dólares. Quien abre el enlace puede dejar una nota de lo que ha pagado. Lo que se deja vacío no sale. La base son 12,95 €. Se cobra al publicar.',
    },
  } as const;
  if (id === 'universo') return null;
  const item = story[id];
  return (
    <article className="grid items-center gap-10 py-16 lg:grid-cols-[1.05fr_0.95fr]">
      <div>
        <p className="text-[12px] uppercase tracking-[0.2em] text-[#e8b86d]">{item.kicker}</p>
        <h3 className="mt-3 font-display text-[2.6rem] italic leading-none">{item.title}</h3>
        <p className="mt-3 font-display text-[1.35rem] italic text-[#f3ead8]/80">{item.line}</p>
        <p className="mt-4 max-w-md text-[16px] leading-relaxed text-[#f3ead8]/68">{item.body}</p>
      </div>
      <div className="flex justify-center lg:justify-end">
        <WhenSeen height={868 * 0.54}>
          <ScaledPhone scale={0.54}>
            {id === 'cita' && <DateAskPlayer doc={cita} preview framed />}
            {id === 'web' && <WebPlayer doc={web} framed />}
            {id === 'viaje' && <TripPlayer doc={viaje} framed preview />}
            {id === 'carta' && <CartaSample />}
            {id === 'album' && <AlbumSample />}
            {id === 'mapa' && <MapaSample />}
            {id === 'deseos' && <DeseosSample />}
          </ScaledPhone>
        </WhenSeen>
      </div>
    </article>
  );
}

function DeseosSample() {
  return (
    <div className="flex h-full flex-col bg-[#1b1612] px-7 pb-10 pt-16 text-[#f3ead8]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b86d]">Ha salido</p>
      <h3 className="mt-4 font-display text-[2.2rem] italic leading-[1.05]">El finde en la costa</h3>
      <p className="mt-3 text-[15px] leading-relaxed text-[#f3ead8]/65">El mismo en los dos móviles. Queda en por hacer.</p>
      <p className="mt-auto text-[12px] uppercase tracking-[0.16em] text-[#e8b86d]">Fin de semana · tranquilo</p>
    </div>
  );
}

function CartaSample() {
  return (
    <div className="flex h-full flex-col bg-[#f6efe6] px-8 pb-10 pt-16 text-[#1b1612]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#8a6232]">Para Clara</p>
      <h3 className="mt-5 font-display text-[2.4rem] italic leading-[1.05]">Lo que no te dije el martes</h3>
      <p className="mt-6 text-[16px] leading-relaxed">
        Quería que lo leyeras sentada. Sin prisa, y sin un cielo alrededor. Solo esto, del tirón.
      </p>
      <p className="mt-4 text-[16px] leading-relaxed text-[#1b1612]/70">
        Si al terminar te queda algo en la boca, está bien. No hacía falta contestarlo esa noche.
      </p>
      <p className="mt-auto font-display text-[1.8rem] italic">Alex</p>
      <p className="mt-2 text-[13px] text-[#1b1612]/45">P. D. El café sigue abierto.</p>
    </div>
  );
}

function AlbumSample() {
  return (
    <div className="flex h-full flex-col justify-center gap-4 bg-[#1a140f] px-8">
      {[
        ['La orilla', 'un martes'],
        ['El camino de vuelta', 'esa tarde'],
      ].map(([title, when]) => (
        <div key={title} className="rotate-[-1.5deg] bg-[#f6efe6] p-3 pb-8 text-[#1b1612] shadow-lg even:rotate-[1.5deg]">
          <div className="h-28 bg-[linear-gradient(160deg,#f6e7cf,#e0a36a_55%,#6a4330)]" />
          <p className="mt-3 font-display text-2xl italic">{title}</p>
          <p className="text-[12px] uppercase tracking-[0.14em] text-[#1b1612]/45">{when}</p>
        </div>
      ))}
    </div>
  );
}

function MapaSample() {
  return (
    <div className="flex h-full flex-col bg-[#071018] px-7 pb-10 pt-16 text-[#f3ead8]">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#e8b86d]">Dos sitios</p>
      {[
        ['🌊', 'La orilla', 'Ahí se quedó el silencio bueno.'],
        ['☕', 'El café', 'El que estaba abierto. Pedimos lo mismo.'],
      ].map(([emoji, title, body]) => (
        <div key={title} className="mt-6 border-b border-white/10 pb-5">
          <p className="text-2xl">{emoji}</p>
          <p className="mt-2 font-display text-[1.8rem] italic">{title}</p>
          <p className="mt-1 text-[15px] leading-relaxed text-[#f3ead8]/65">{body}</p>
        </div>
      ))}
    </div>
  );
}

export function Landing() {
  const [project, setProject] = useState<TemplateId>('universo');
  useEffect(() => {
    void import('@/pages/Hub');
    void import('@/pages/Begin');
  }, []);
  const citaDemo = useMemo(() => {
    const doc = blankCita();
    doc.forName = 'Clara';
    doc.fromName = 'Alex';
    doc.eyebrow = 'De Alex';
    doc.question = '¿Quieres venir conmigo a cenar?';
    doc.letter = 'No hace falta que sea perfecto. Solo quiero verte.';
    doc.envelope = 'Ábrelo cuando puedas';
    return doc;
  }, []);
  const webDemo = useMemo(() => sampleWeb(), []);
  const viajeDemo = useMemo(() => sampleTrip(), []);
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
          <a href="#proyectos" className="hidden text-inkwell/70 sm:block">
            Proyectos
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
              Detalles únicos para conectar. Marca la diferencia. Cuida a las personas que más te importan. <b>Regala diferente.</b> 
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/crear/nuevo" className="rounded-full bg-inkwell px-6 py-3.5 text-[15px] text-linen">
                Crear un proyecto
              </Link>
              <a href="#proyectos" className="rounded-full px-5 py-3.5 text-[15px] text-inkwell/70">
                Ver opciones
              </a>
            </div>
          </div>
          <HeroTour doc={scenes.hero} />
        </section>

        <section id="como" className="border-y border-black/5">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:px-8 md:grid-cols-3">
            {[
              ['01', 'Escribes como si se lo contaras', 'Crea a tu gusto. Personaliza cada detalle. Recuérdaselo'],
              ['02', 'Visualiza en tiempo real', 'Revisa como evoluciona tu regalo. Modifica, edita y guarda.'],
              ['03', 'Publica el proyecto', 'Envíaselo en PDF o en un QR. Disfruta de su sonrisa al verlo.'],
            ].map(([n, title, body]) => (
              <article key={n}>
                <p className="font-display text-xl italic text-brass">{n}</p>
                <h2 className="mt-3 font-display text-[1.85rem] italic leading-[1.05]">{title}</h2>
                <p className="mt-3 text-[16px] leading-relaxed text-inkwell/65">{body}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="proyectos" className="landing-night text-[#f3ead8]">
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
            <p className="text-[12px] uppercase tracking-[0.24em] text-[#e8b86d]">Los proyectos</p>
            <h2 className="mt-4 max-w-[16ch] font-display text-[clamp(2.6rem,5vw,4.2rem)] italic leading-[0.95]">
              No tiene que ser un cielo.
            </h2>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-[#f3ead8]/70">
              En crear eliges el regalo. Un universo, una web, un viaje, una cita, una lista de deseos, una carta, un álbum o un mapa. Toca uno y ves qué cabe dentro.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {TEMPLATES.map((item) => {
                const on = project === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setProject(item.id)}
                    className={`rounded-[24px] px-4 py-4 text-left ring-1 transition ${on ? 'bg-[#f3ead8] text-[#1b1612] ring-[#f3ead8]' : 'bg-white/5 text-[#f3ead8] ring-white/10 hover:bg-white/10'}`}
                  >
                    <span className={`text-[10px] uppercase tracking-[0.16em] ${on ? 'text-[#8a6232]' : 'text-[#e8b86d]'}`}>{item.tag}</span>
                    <span className="mt-2 block font-display text-[1.55rem] italic leading-none">{item.name}</span>
                    <span className={`mt-2 block text-[13px] leading-snug ${on ? 'text-[#1b1612]/65' : 'text-[#f3ead8]/60'}`}>{item.line}</span>
                  </button>
                );
              })}
            </div>

            {project === 'universo' && (
            <div id="estrellas" className="mt-6 divide-y divide-white/10">
              <p className="py-8 max-w-xl text-[16px] leading-relaxed text-[#f3ead8]/70">
                Dentro del universo cada cosa es una estrella, y cada una se abre distinto. La música no es un menú: es un botón en el cielo, o dentro de un capítulo. Pegas un enlace de Spotify —canción, álbum o lista— y suena.
              </p>
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
            )}

            {project !== 'universo' && <ProjectStory id={project} cita={citaDemo} web={webDemo} viaje={viajeDemo} />}
          </div>
        </section>

        <section className="mx-auto max-w-3xl px-5 py-24 text-center sm:px-8">
          <h2 className="font-display text-[clamp(2.6rem,5vw,4rem)] italic leading-[1]">Demuestra cuanto te importa</h2>
          <p className="mx-auto mt-5 max-w-lg text-[17px] leading-relaxed text-inkwell/65">
            Crea rápido, personaliza con calma y publicalo en un instante. Pero siempre con cariño
          </p>
          <Link to="/crear/nuevo" className="mt-8 inline-block rounded-full bg-inkwell px-6 py-3.5 text-linen">
            Crear mi regalo
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
