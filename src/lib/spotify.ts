export type SpotifyEmbed = {
  kind: 'track' | 'album' | 'playlist' | 'episode';
  id: string;
  src: string;
};

const LINK =
  /(?:open\.spotify\.com\/(?:intl-[a-z]{2}(?:-[a-z]{2})?\/)?|spotify:)(track|album|playlist|episode)[/:]([A-Za-z0-9]+)/i;

export function spotifyEmbed(input: string): SpotifyEmbed | null {
  const match = input.trim().match(LINK);
  if (!match) return null;
  const kind = match[1].toLowerCase() as SpotifyEmbed['kind'];
  const id = match[2];
  return {
    kind,
    id,
    src: `https://open.spotify.com/embed/${kind}/${id}?utm_source=generator&theme=0`,
  };
}
