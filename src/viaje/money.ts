import { stopDay, type TripCurrency, type TripDocument } from '@/schema/viaje';

export function parseMoney(raw: string): number | null {
  let text = raw.trim().replace(/\s/g, '').replace(/[€$]/g, '');
  if (!text) return null;
  if (text.includes(',') && text.includes('.')) {
    if (text.lastIndexOf(',') > text.lastIndexOf('.')) text = text.replace(/\./g, '').replace(',', '.');
    else text = text.replace(/,/g, '');
  } else if (text.includes(',')) {
    text = text.replace(',', '.');
  }
  const value = Number(text);
  if (!Number.isFinite(value) || value < 0) return null;
  return value;
}

export function peopleOf(raw: string): number {
  const value = Number.parseInt(raw.trim(), 10);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

export function formatMoney(value: number, currency: TripCurrency) {
  return new Intl.NumberFormat(currency === 'EUR' ? 'es-ES' : 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

export type TripCostLine = {
  id: string;
  title: string;
  amount: number;
};

export type TripDayGroup = {
  id: string;
  day: number | null;
  lines: TripCostLine[];
  amount: number;
};

export type TripMoney = {
  currency: TripCurrency;
  days: TripDayGroup[];
  extra: number;
  people: number;
  total: number;
  each: number | null;
  note: string;
};

export function tripMoney(doc: TripDocument): TripMoney | null {
  const tagged = doc.stops.some((stop) => stopDay(stop) != null);
  const lines: Array<TripCostLine & { day: number | null }> = [];
  let legacy = 0;
  for (const stop of doc.stops) {
    const amount = parseMoney(stop.cost);
    if (amount == null) continue;
    const day = stopDay(stop);
    lines.push({
      id: stop.id,
      title: stop.title.trim() || 'Parada',
      amount,
      day: day ?? (tagged ? null : ++legacy),
    });
  }
  const days: TripDayGroup[] = [];
  for (const line of lines) {
    const key = line.day == null ? `solo:${line.id}` : `dia:${line.day}`;
    let group = line.day == null ? undefined : days.find((item) => item.id === key);
    if (!group) {
      group = { id: key, day: line.day, lines: [], amount: 0 };
      days.push(group);
    }
    group.lines.push({ id: line.id, title: line.title, amount: line.amount });
    group.amount += line.amount;
  }
  const extra = parseMoney(doc.budget.extra) ?? 0;
  const people = peopleOf(doc.budget.people);
  const eachInput = parseMoney(doc.budget.each);
  const totalInput = parseMoney(doc.budget.total);
  const daysSum = days.reduce((sum, day) => sum + day.amount, 0);
  const total =
    totalInput != null ? totalInput : eachInput != null && people ? eachInput * people : daysSum + extra;
  const each = eachInput != null ? eachInput : people ? total / people : null;
  const note = doc.budget.note.trim();
  if (days.length === 0 && extra === 0 && totalInput == null && eachInput == null && !people && !note) return null;
  return { currency: doc.budget.currency, days, extra, people, total, each, note };
}
