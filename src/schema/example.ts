import { blankDocument, type UniverseDocument } from '@/schema/universe';

function dayOffset(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Universo de demostración. No es el regalo de nadie: es la plantilla viva. */
export function exampleDocument(): UniverseDocument {
  const doc = blankDocument();
  doc.meta.id = 'ejemplo';
  doc.meta.title = 'Para Clara';
  doc.meta.titleTouched = true;
  doc.intro = {
    forName: 'Clara',
    fromName: 'Alex',
    dedication: 'por si un día quieres volver a estos días',
    motto: 'Recuerda. Vive. Explora.',
    cta: 'Explorar mi universo',
    skyTitle: 'Clara',
  };
  doc.soundtrack = {
    label: 'Música',
    url: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
  };
  doc.stars = [
    {
      id: 'star_historia',
      type: 'historia',
      x: 620,
      y: 760,
      kicker: '01',
      label: 'Historia',
      glyph: '✦',
      beats: [
        {
          id: 'beat_mensaje',
          index: '01',
          emoji: '✉️',
          title: 'El mensaje',
          date: 'un martes',
          lead: 'Empezó por una frase pequeña, de esas que no parecen un comienzo.',
          quote: '¿Sigues teniendo libres los sábados?',
          track: 'https://open.spotify.com/playlist/37i9dQZF1DX4sWSpwq3LiO',
          voiceUrl: '',
          slides: [
            {
              id: 'slide_respuesta',
              kicker: '01',
              title: 'La respuesta',
              body: 'Contestaste por la noche, y el plan dejó de ser hipotético.',
            },
            {
              id: 'slide_mapa',
              kicker: '02',
              title: 'El mapa',
              body: 'Busqué un sitio que no exigiera nada: caminar, hablar, volver.',
            },
          ],
        },
        {
          id: 'beat_orilla',
          index: '02',
          emoji: '🌙',
          title: 'La orilla',
          date: 'el primer sábado',
          lead: 'Había viento y una luz naranja que no salió en ninguna foto.',
          quote: '',
          track: '',
          voiceUrl: '',
          slides: [
            {
              id: 'slide_silencio',
              kicker: '01',
              title: 'El silencio bueno',
              body: 'No hizo falta llenarlo. Se quedó ahí, entre las dos.',
            },
            {
              id: 'slide_volver',
              kicker: '02',
              title: 'Volver',
              body: 'En el camino de vuelta ya estábamos planeando el siguiente.',
            },
          ],
        },
      ],
    },
    {
      id: 'star_lista',
      type: 'lista',
      x: 1680,
      y: 820,
      kicker: 'vale',
      label: 'La lista',
      glyph: '▴',
      intro: 'Cosas que podemos hacer cuando quieras.',
      items: [
        {
          id: 'item_cafe',
          emoji: '☕',
          title: 'Un café largo',
          when: 'cuando sea',
          fallsOn: dayOffset(-18),
          body: 'Sin prisa y sin sitio fijo. El que esté abierto.',
          state: 'abierto',
          options: [],
        },
        {
          id: 'item_sabado',
          emoji: '✦',
          title: 'El sábado',
          when: 'hoy',
          fallsOn: dayOffset(0),
          body: 'Hay dos maneras de pasarlo. Las dos me valen.',
          state: 'abierto',
          options: [
            { id: 'opt_monte', emoji: '⛰️', title: 'Subir a un mirador', body: 'Aunque sea un rato, y bajar antes de que anochezca.' },
            { id: 'opt_agua', emoji: '🌊', title: 'Quedarnos donde haya agua', body: 'Orilla, fuente o charco. Lo importante es no tener hora.' },
          ],
        },
        {
          id: 'item_sinplan',
          emoji: '🎁',
          title: 'Un día sin plan',
          when: 'más adelante',
          fallsOn: dayOffset(16),
          body: 'Este todavía no se abre. Está reservado.',
          state: 'pronto',
          options: [],
        },
      ],
    },
    {
      id: 'star_notas',
      type: 'notas',
      x: 780,
      y: 1560,
      kicker: 'días',
      label: 'Notas',
      glyph: '🌿',
      cards: [
        { id: 'note_claro', emoji: '🌞', title: 'Los días claros', text: 'Salir aunque sea un rato.\nAvisarme si quieres compañía.' },
        { id: 'note_largo', emoji: '🌙', title: 'Los días largos', text: 'No hay que resolverlos.\nSe pueden contar, y ya.' },
      ],
    },
    {
      id: 'star_carta',
      type: 'carta',
      x: 1760,
      y: 1680,
      kicker: 'fin',
      label: 'Una carta',
      glyph: '—',
      kickerText: 'para leer al final',
      headline: 'No tiene que servir para nada.',
      body: 'Hice esto para que los días no se queden solo en la conversación.\n\nSi vuelves, estarán aquí, en el mismo orden, con el mismo cielo.\n\nY si no vuelves, también está bien. Ya existieron.',
      signoff: 'Alex',
      voiceUrl: '',
    },
  ];
  return doc;
}
