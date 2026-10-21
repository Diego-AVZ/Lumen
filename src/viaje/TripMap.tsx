import { useEffect } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { parseLatLngPair } from '@/universe/coords';

export function pinOf(stop: { lat: string; lng: string }): [number, number] | null {
  const pair =
    parseLatLngPair(stop.lat) ??
    parseLatLngPair(stop.lng) ??
    parseLatLngPair(`${stop.lat} ${stop.lng}`.trim());
  if (!pair) return null;
  const lat = Number(pair.lat);
  const lng = Number(pair.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return [lat, lng];
}

function markerIcon(n: number, on: boolean) {
  return divIcon({
    className: 'trip-pin-wrap',
    html: `<span class="trip-pin${on ? ' on' : ''}">${n}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function Camera({ points, focus }: { points: [number, number][]; focus: [number, number] | null }) {
  const map = useMap();
  const signature = `${focus ? focus.join(',') : 'all'}|${points.map((point) => point.join(',')).join(';')}`;

  useEffect(() => {
    const frame = () => {
      map.invalidateSize();
      if (focus) {
        map.flyTo(focus, 13.2, { duration: 0.85 });
        return;
      }
      if (points.length === 0) return;
      if (points.length === 1) {
        map.flyTo(points[0], 11, { duration: 0.7 });
        return;
      }
      map.fitBounds(points, { padding: [36, 36], maxZoom: 9, animate: true });
    };
    frame();
    const later = window.setTimeout(frame, 240);
    return () => window.clearTimeout(later);
  }, [map, signature]);

  return null;
}

function Drop({ onDrop }: { onDrop: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(event) {
      onDrop(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export function TripMap({
  points,
  activeIndex,
  onPick,
  onDrop,
}: {
  points: { id: string; at: [number, number] }[];
  activeIndex: number | null;
  onPick: (id: string) => void;
  onDrop?: (lat: number, lng: number) => void;
}) {
  const focus = activeIndex != null ? points[activeIndex]?.at ?? null : null;
  const all = points.map((point) => point.at);
  const center = all[0] ?? ([36.8, -4.1] as [number, number]);

  return (
    <MapContainer
      center={center}
      zoom={6}
      className={`trip-map h-full w-full ${onDrop ? 'cursor-crosshair' : ''}`}
      zoomControl={false}
      attributionControl={false}
    >
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
      <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}" />
      {onDrop && <ZoomControl position="bottomright" />}
      {onDrop && <Drop onDrop={onDrop} />}
      <Camera points={all} focus={focus} />
      {all.length > 1 && (
        <Polyline
          positions={all}
          pathOptions={{ color: '#f6efe6', weight: 3, opacity: 0.92 }}
        />
      )}
      {points.map((point, index) => (
        <Marker
          key={point.id}
          position={point.at}
          icon={markerIcon(index + 1, activeIndex === index)}
          eventHandlers={{ click: () => onPick(point.id) }}
        />
      ))}
    </MapContainer>
  );
}
