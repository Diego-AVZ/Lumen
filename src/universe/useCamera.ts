import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type RefObject } from 'react';
import { clamp, easeOutExpo, lerp } from '@/lib/motion';

export type CameraState = { x: number; y: number; scale: number };

type Fly = {
  from: CameraState;
  to: CameraState;
  start: number;
  duration: number;
  onDone?: () => void;
};

type Pointer = { id: number; x: number; y: number };

const MIN_SCALE = 0.22;
const MAX_SCALE = 3.2;

function distance(a: Pointer, b: Pointer) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function useCamera(initial: CameraState, viewport: RefObject<HTMLElement | null>) {
  const cam = useRef<CameraState>({ ...initial });
  const vel = useRef({ x: 0, y: 0 });
  const fly = useRef<Fly | null>(null);
  const pointers = useRef<Pointer[]>([]);
  const lastPinch = useRef<number | null>(null);
  const lastPan = useRef<{ x: number; y: number; t: number } | null>(null);
  const dragging = useRef(false);
  const [, tick] = useState(0);
  const frame = useRef(0);

  const paint = useCallback(() => tick((n) => (n + 1) % 1_000_000), []);

  const metrics = useCallback(() => {
    const el = viewport.current;
    if (!el) return { w: 390, h: 844, css: 1, left: 0, top: 0 };
    const rect = el.getBoundingClientRect();
    return {
      w: el.offsetWidth || rect.width || 390,
      h: el.offsetHeight || rect.height || 844,
      css: rect.width / Math.max(1, el.offsetWidth || rect.width),
      left: rect.left,
      top: rect.top,
    };
  }, [viewport]);

  const localPoint = useCallback(
    (clientX: number, clientY: number) => {
      const m = metrics();
      return { x: (clientX - m.left) / m.css, y: (clientY - m.top) / m.css, ...m };
    },
    [metrics],
  );

  useEffect(() => {
    let alive = true;
    const loop = (now: number) => {
      if (!alive) return;
      const f = fly.current;
      if (f) {
        const t = clamp((now - f.start) / Math.max(1, f.duration), 0, 1);
        const e = easeOutExpo(t);
        cam.current = {
          x: lerp(f.from.x, f.to.x, e),
          y: lerp(f.from.y, f.to.y, e),
          scale: lerp(f.from.scale, f.to.scale, e),
        };
        vel.current = { x: 0, y: 0 };
        paint();
        if (t >= 1) {
          const done = f.onDone;
          fly.current = null;
          done?.();
        }
      } else if (!dragging.current) {
        vel.current.x *= 0.9;
        vel.current.y *= 0.9;
        if (Math.abs(vel.current.x) > 0.04 || Math.abs(vel.current.y) > 0.04) {
          cam.current.x += vel.current.x;
          cam.current.y += vel.current.y;
          paint();
        }
      }
      frame.current = requestAnimationFrame(loop);
    };
    frame.current = requestAnimationFrame(loop);
    return () => {
      alive = false;
      cancelAnimationFrame(frame.current);
    };
  }, [paint]);

  const flyTo = useCallback((to: CameraState, duration = 1000, onDone?: () => void) => {
    fly.current = { from: { ...cam.current }, to, start: performance.now(), duration, onDone };
  }, []);

  const zoomAt = useCallback(
    (clientX: number, clientY: number, nextScale: number) => {
      const p = localPoint(clientX, clientY);
      const c = cam.current;
      const scale = clamp(nextScale, MIN_SCALE, MAX_SCALE);
      const worldX = c.x + (p.x - p.w / 2) / c.scale;
      const worldY = c.y + (p.y - p.h / 2) / c.scale;
      cam.current = {
        x: worldX - (p.x - p.w / 2) / scale,
        y: worldY - (p.y - p.h / 2) / scale,
        scale,
      };
      paint();
    },
    [localPoint, paint],
  );

  const clientToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const p = localPoint(clientX, clientY);
      const c = cam.current;
      return {
        x: c.x + (p.x - p.w / 2) / c.scale,
        y: c.y + (p.y - p.h / 2) / c.scale,
      };
    },
    [localPoint],
  );

  const onPointerDown = useCallback((e: ReactPointerEvent) => {
    if (e.button !== 0) return;
    fly.current = null;
    pointers.current.push({ id: e.pointerId, x: e.clientX, y: e.clientY });
    dragging.current = true;
    lastPan.current = { x: e.clientX, y: e.clientY, t: performance.now() };
    vel.current = { x: 0, y: 0 };
    if (pointers.current.length === 2) {
      lastPinch.current = distance(pointers.current[0], pointers.current[1]);
    }
  }, []);

  const onPointerMove = useCallback(
    (e: ReactPointerEvent) => {
      const list = pointers.current;
      const idx = list.findIndex((p) => p.id === e.pointerId);
      if (idx < 0) return;
      const prev = list[idx];
      list[idx] = { id: e.pointerId, x: e.clientX, y: e.clientY };
      const css = metrics().css || 1;

      if (list.length === 2 && lastPinch.current) {
        const nextDist = distance(list[0], list[1]);
        const ratio = nextDist / lastPinch.current;
        lastPinch.current = nextDist;
        const midX = (list[0].x + list[1].x) / 2;
        const midY = (list[0].y + list[1].y) / 2;
        zoomAt(midX, midY, cam.current.scale * ratio);
        return;
      }

      if (list.length === 1 && dragging.current) {
        const dx = (e.clientX - prev.x) / css;
        const dy = (e.clientY - prev.y) / css;
        cam.current.x -= dx / cam.current.scale;
        cam.current.y -= dy / cam.current.scale;
        const now = performance.now();
        const last = lastPan.current;
        if (last) {
          const dt = Math.max(1, now - last.t);
          vel.current = {
            x: -((e.clientX - last.x) / css) / cam.current.scale / (dt / 16),
            y: -((e.clientY - last.y) / css) / cam.current.scale / (dt / 16),
          };
        }
        lastPan.current = { x: e.clientX, y: e.clientY, t: now };
        paint();
      }
    },
    [metrics, paint, zoomAt],
  );

  const onPointerUp = useCallback((e: ReactPointerEvent) => {
    pointers.current = pointers.current.filter((p) => p.id !== e.pointerId);
    if (pointers.current.length < 2) lastPinch.current = null;
    if (pointers.current.length === 0) {
      dragging.current = false;
      lastPan.current = null;
    }
  }, []);

  useEffect(() => {
    const el = viewport.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const node = e.target instanceof Element ? e.target : null;
      if (node?.closest('[data-layer]')) return;
      e.preventDefault();
      fly.current = null;
      if (e.ctrlKey || e.metaKey) {
        zoomAt(e.clientX, e.clientY, cam.current.scale * (e.deltaY > 0 ? 0.92 : 1.08));
        return;
      }
      const css = metrics().css || 1;
      cam.current.x += e.deltaX / css / cam.current.scale;
      cam.current.y += e.deltaY / css / cam.current.scale;
      paint();
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [metrics, paint, viewport, zoomAt]);

  return {
    camera: cam.current,
    flyTo,
    clientToWorld,
    bind: { onPointerDown, onPointerMove, onPointerUp, onPointerCancel: onPointerUp },
  };
}
