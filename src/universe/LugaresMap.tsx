import { useEffect } from 'react';
import { CircleMarker, MapContainer, TileLayer, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import type { Place } from '@/schema/universe';
import { coordsOf } from '@/universe/coords';

type Props = {
  places: Place[];
  active: string;
  onPick: (id: string) => void;
};

function Fly({ place }: { place: Place | undefined }) {
  const map = useMap();
  useEffect(() => {
    const pin = place ? coordsOf(place) : null;
    if (!pin) return;
    map.flyTo(pin, Math.max(map.getZoom(), 13), { duration: 0.7 });
  }, [map, place]);
  return null;
}

export default function LugaresMap({ places, active, onPick }: Props) {
  const pins = places.flatMap((place) => {
    const pin = coordsOf(place);
    return pin ? [{ place, pin }] : [];
  });
  const first = pins[0]?.pin ?? [40.4168, -3.7038];

  return (
    <MapContainer center={first} zoom={12} className="h-full w-full" zoomControl={false} attributionControl={false}>
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Fly place={places.find((place) => place.id === active)} />
      {pins.map(({ place, pin }) => (
        <CircleMarker
          key={place.id}
          center={pin}
          radius={place.id === active ? 10 : 7}
          pathOptions={{
            color: '#f3ead8',
            weight: 2,
            fillColor: place.id === active ? '#e8b86d' : '#e23a32',
            fillOpacity: 0.95,
          }}
          eventHandlers={{ click: () => onPick(place.id) }}
        />
      ))}
    </MapContainer>
  );
}
