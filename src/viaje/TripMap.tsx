import { useEffect, useRef } from 'react';
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

function Camera({ points, focus }: { points: [number, number][]; focus: [number, number] | null }) {
  const map = useMap();
  const place = `${focus ? focus.join(',') : 'all'}|${points.map((point) => point.join(',')).join(';')}`;
  const pointsRef = useRef(points);
  const focusRef = useRef(focus);
  pointsRef.current = points;
  focusRef.current = focus;

  useEffect(() => {
    let frame = 0;
    let timer = 0;
    const aim = (animate: boolean) => {
      if (map.getContainer().clientHeight < 48) return;
      map.invalidateSize(false);
      const pad = { paddingTopLeft: [16, 44] as [number, number], paddingBottomRight: [16, 16] as [number, number], animate };
      const here = focusRef.current;
      const all = pointsRef.current;
      if (here) {
        map.fitBounds([here, here], { ...pad, maxZoom: 13 });
        return;
      }
      if (all.length === 0) return;
      if (all.length === 1) {
        map.fitBounds([all[0], all[0]], { ...pad, maxZoom: 11 });
        return;
      }
      map.fitBounds(all, { ...pad, maxZoom: 9 });
    };
    const schedule = (animate: boolean) => {
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
      timer = window.setTimeout(() => {
        frame = window.requestAnimationFrame(() => aim(animate));
      }, animate ? 40 : 16);
    };
    schedule(true);
    const watcher = new ResizeObserver(() => schedule(false));
    watcher.observe(map.getContainer());
    return () => {
      watcher.disconnect();
      window.clearTimeout(timer);
      window.cancelAnimationFrame(frame);
    };
  }, [map, place]);

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
  points: { id: string; at: [number, number]; seal?: boolean }[];
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
      {onDrop && <ZoomControl position="topright" />}
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
          icon={markerIcon(index + 1, activeIndex === index, Boolean(point.seal))}
          eventHandlers={{ click: () => onPick(point.id) }}
        />
      ))}
    </MapContainer>
  );
}
