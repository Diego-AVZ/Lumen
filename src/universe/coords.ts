import type { Place } from '@/schema/universe';

export function parseLatLngPair(raw: string): { lat: string; lng: string } | null {
  const text = raw.replace(/\u00a0/g, ' ').trim();
  if (!text) return null;

  const fromUrl = text.match(/@(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  if (fromUrl) return pack(fromUrl[1], fromUrl[2]);

  const pair = text.match(/^(-?\d+(?:\.\d+)?)\s*[,;\s]\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (pair) return pack(pair[1], pair[2]);

  return null;
}

function pack(latRaw: string, lngRaw: string) {
  const lat = Number(latRaw);
  const lng = Number(lngRaw);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat: latRaw, lng: lngRaw };
  if (Math.abs(lng) <= 90 && Math.abs(lat) <= 180) return { lat: lngRaw, lng: latRaw };
  return null;
}

export function coordsOf(place: Place): [number, number] | null {
  const pair =
    parseLatLngPair(place.lat) ??
    parseLatLngPair(place.lng) ??
    parseLatLngPair(`${place.lat} ${place.lng}`.trim());
  if (!pair) return null;
  const lat = Number(pair.lat);
  const lng = Number(pair.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

export function coordsLabel(place: Pick<Place, 'lat' | 'lng'>) {
  if (place.lat && place.lng) return `${place.lat}, ${place.lng}`;
  return place.lat || place.lng || '';
}
