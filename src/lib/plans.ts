export const PLAN_IDS = ['cita', 'cita_pro', 'plantilla', 'plantilla_pro', 'deseos'] as const;

export type PlanId = (typeof PLAN_IDS)[number];
export type PlanFamily = 'cita' | 'plantilla' | 'deseos';

export type PlanOffer = {
  id: PlanId;
  family: PlanFamily;
  name: string;
  priceCents: number;
  line: string;
  points: string[];
  rich?: boolean;
};

export const PLANS: PlanOffer[] = [
  {
    id: 'cita',
    family: 'cita',
    name: 'Cita',
    priceCents: 295,
    line: 'El sobre, como está ahora.',
    points: ['Seis toques y el sello', 'Una carta', 'Un sí, un no y unas fechas'],
  },
  {
    id: 'cita_pro',
    family: 'cita',
    name: 'Cita pro',
    priceCents: 495,
    line: 'Más textos, más efectos, más gracia.',
    points: ['Todo lo del sobre', 'Más frases y efectos', 'Más margen para que diga que sí'],
    rich: true,
  },
  {
    id: 'plantilla',
    family: 'plantilla',
    name: 'Plantilla basic',
    priceCents: 1295,
    line: 'Un universo o una web, con un techo claro.',
    points: ['Universo y web personalizada', '5 fotos, 1 audio, 10 lugares', 'El estudio para montarlo'],
  },
  {
    id: 'plantilla_pro',
    family: 'plantilla',
    name: 'Plantilla pro',
    priceCents: 1995,
    line: 'Lo mismo, con menos límites.',
    points: ['Más fotos, audios y lugares', 'Más personalización', 'Menos techo al construir'],
    rich: true,
  },
];

export const PLAN_GROUPS: { id: PlanFamily; label: string; hint: string }[] = [
  { id: 'cita', label: 'Sobres', hint: 'Pedir cita' },
  { id: 'plantilla', label: 'Plantillas', hint: 'Universo, web y las que vengan' },
];

export const CHAINS = [
  { id: 'ethereum', name: 'Ethereum' },
  { id: 'base', name: 'Base' },
  { id: 'polygon', name: 'Polygon' },
  { id: 'arbitrum', name: 'Arbitrum' },
  { id: 'optimism', name: 'Optimism' },
  { id: 'avalanche', name: 'Avalanche' },
] as const;

export type ChainId = (typeof CHAINS)[number]['id'];
export type PayAsset = 'usdc' | 'usdt';

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === 'string' && (PLAN_IDS as readonly string[]).includes(value);
}

export function planById(id: PlanId) {
  const plan = PLANS.find((item) => item.id === id);
  if (!plan) throw new Error('Ese plan no existe.');
  return plan;
}

export function plansInFamily(family: PlanFamily) {
  return PLANS.filter((item) => item.family === family);
}

export function familyOf(plan: PlanId): PlanFamily {
  if (plan === 'cita' || plan === 'cita_pro') return 'cita';
  if (plan === 'deseos') return 'deseos';
  return 'plantilla';
}

export function createPath(plan: PlanId) {
  const family = familyOf(plan);
  if (family === 'cita') return '/crear/nuevo?plantilla=cita';
  if (family === 'deseos') return '/crear/nuevo?plantilla=deseos';
  return '/crear/nuevo?plantilla=universo';
}

export function euros(cents: number) {
  const value = (cents / 100).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${value} €`;
}
