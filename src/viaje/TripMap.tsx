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

function markerIcon(n: number, on: boolean, seal: boolean) {
  return divIcon({
    className: 'trip-pin-wrap',
    html: `<span class="trip-pin${on ? ' on' : ''}${seal ? ' seal' : ''}">${seal ? '✉' : n}</span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function sheetPad(map: ReturnType<typeof useMap>, layout: number) {
  const size = map.getSize();
  const sheet = Math.round(size.y * Math.min(0.9, Math.max(0, layout)));
  return {
    paddingTopLeft: [20, 56] as [number, number],
    paddingBottomRight: [20, sheet + 24] as [number, number],
  };
}

function Camera({ points, focus, layout }: { points: [number, number][]; focus: [number, number] | null; layout: number }) {
  const map = useMap();
  const signature = `${focus ? focus.join(',') : 'all'}|${points.map((point) => point.join(',')).join(';')}|${Math.round(layout * 20)}`;

  useEffect(() => {
    const frame = () => {
      map.invalidateSize();
      const pad = sheetPad(map, layout);
      if (focus) {
        map.fitBounds([focus, focus], { ...pad, maxZoom: 13.2, animate: true });
        return;
      }
      if (points.length === 0) return;
      if (points.length === 1) {
        map.fitBounds([points[0], points[0]], { ...pad, maxZoom: 11, animate: true });
        return;
      }
      map.fitBounds(points, { ...pad, maxZoom: 9, animate: true });
    };
    const later = window.setTimeout(frame, 180);
    return () => window.clearTimeout(later);
  }, [map, signature, layout]);

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
  layout = 0,
}: {
  points: { id: string; at: [number, number]; seal?: boolean }[];
  activeIndex: number | null;
  onPick: (id: string) => void;
  onDrop?: (lat: number, lng: number) => void;
  layout?: number;
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
      {onDrop && <ZoomControl position="topright" />}
      {onDrop && <Drop onDrop={onDrop} />}
      <Camera points={all} focus={focus} layout={layout} />
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
          icon={markerIcon(index + 1, activeIndex === index, Boolean(point.seal))}
          eventHandlers={{ click: () => onPick(point.id) }}
        />
      ))}
    </MapContainer>
  );
}
