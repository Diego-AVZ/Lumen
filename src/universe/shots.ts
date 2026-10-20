import { clamp } from '@/lib/motion';
import { TITLE_AT, type Star } from '@/schema/universe';
import type { CameraState } from '@/universe/useCamera';

export function introShot(vw: number): CameraState {
  return {
    x: TITLE_AT.x,
    y: TITLE_AT.y + 16,
    scale: Math.min(1.18, (vw * 0.8) / 270),
  };
}

export function skyShot(stars: Pick<Star, 'x' | 'y'>[], vw: number, vh: number): CameraState {
  const pts = [TITLE_AT, ...stars.map((s) => ({ x: s.x, y: s.y }))];
  const minX = Math.min(...pts.map((p) => p.x)) - 240;
  const maxX = Math.max(...pts.map((p) => p.x)) + 240;
  const minY = Math.min(...pts.map((p) => p.y)) - 210;
  const maxY = Math.max(...pts.map((p) => p.y)) + 230;
  const scale = Math.min(vw / Math.max(1, maxX - minX), vh / Math.max(1, maxY - minY)) * 0.9;
  return {
    x: (minX + maxX) / 2,
    y: (minY + maxY) / 2,
    scale: clamp(scale, 0.26, 1.35),
  };
}

export function starShot(star: Pick<Star, 'x' | 'y'>, vw: number): CameraState {
  return { x: star.x, y: star.y, scale: Math.min(2.05, vw / 170) };
}
