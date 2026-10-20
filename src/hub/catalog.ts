export type HubVista = 'proyectos' | 'plan' | 'uso' | 'seguimiento' | 'ideas' | 'instrucciones' | 'crear';

export const HUB_VISTAS: {
  id: HubVista;
  label: string;
  hint: string;
  mark: string;
  accent?: boolean;
}[] = [
  { id: 'proyectos', label: 'Mis proyectos', hint: 'Universos y lo que venga', mark: '✦' },
  { id: 'plan', label: 'Plan', hint: 'Contratar un regalo', mark: '◐' },
  { id: 'uso', label: 'Uso', hint: 'Pagos y proyectos', mark: '▤' },
  { id: 'seguimiento', label: 'Seguimiento', hint: 'Regalos que ya viven', mark: '⌖' },
  { id: 'ideas', label: 'Ideas', hint: 'Por si te quedas en blanco', mark: '✎' },
  { id: 'instrucciones', label: 'Instrucciones', hint: 'Cómo se construye', mark: '?' },
  { id: 'crear', label: 'Crear', hint: 'Elegir plantilla y modo', mark: '+', accent: true },
];

export const TEMPLATES = [
  {
    id: 'universo',
    name: 'Universo',
    tag: 'Lista ahora',
    line: 'Un cielo con su nombre en el centro. Estrellas que se abren: historia, carta, deseos, lugares.',
    available: true,
    sky: 'linear-gradient(165deg, #3a2418 0%, #0c0b0a 46%, #070606 100%)',
  },
  {
    id: 'deseos',
    name: 'Lista de deseos',
    tag: 'Lista ahora',
    line: 'Planes que escribís los dos. Una ruleta, cada cierto tiempo, y sale el mismo en los dos móviles.',
    available: true,
    sky: 'linear-gradient(165deg, #3a2a18 0%, #1a120c 48%, #0c0907 100%)',
  },
  {
    id: 'cita',
    name: 'Pedir cita',
    tag: 'Lista ahora',
    line: 'Un sobre cerrado. Seis toques en el corazón, una carta y un sí o un no que no se deja pillar.',
    available: true,
    sky: 'linear-gradient(165deg, #4a1828 0%, #1a0c12 48%, #0c0708 100%)',
  },
  {
    id: 'carta',
    name: 'Carta larga',
    tag: 'Pronto',
    line: 'Una sola página para decirlo despacio, sin cielo ni estrellas.',
    available: false,
    sky: 'linear-gradient(165deg, #3a1824 0%, #140c10 50%, #090608 100%)',
  },
  {
    id: 'album',
    name: 'Álbum',
    tag: 'Pronto',
    line: 'Polaroids, fechas y una frase debajo. Para hojear juntos.',
    available: false,
    sky: 'linear-gradient(165deg, #2a2218 0%, #1a140f 50%, #0c0b0a 100%)',
  },
  {
    id: 'mapa',
    name: 'Mapa de lugares',
    tag: 'Pronto',
    line: 'Los sitios que os importan, con lo que pasó en cada uno.',
    available: false,
    sky: 'linear-gradient(165deg, #143044 0%, #071018 52%, #04080c 100%)',
  },
] as const;

export type TemplateId = (typeof TEMPLATES)[number]['id'];

export const IDEA_SEEDS = [
  { title: 'El primer mensaje', body: 'Qué decía. A qué hora. Por qué lo guardaste.' },
  { title: 'Un silencio bueno', body: 'Un rato en el que no hizo falta llenar nada.' },
  { title: 'La comida que pedís siempre', body: 'El plato, el sitio, quién lo elige.' },
  { title: 'Un viaje que aún no existe', body: 'Una ciudad, un mes, una promesa pequeña.' },
  { title: 'La frase que solo vosotros usáis', body: 'Puede ser tonta. Mejor si lo es.' },
  { title: 'Un día cualquiera', body: 'No el aniversario: un martes que se quedó.' },
];
