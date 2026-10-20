import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSession } from '@/lib/session';
import { isPlanId, plansInFamily, type PlanFamily, type PlanId } from '@/lib/plans';

export type Purchase = {
  id: string;
  plan: PlanId;
  amountCents: number;
  currency: string;
  rail: 'card' | 'crypto';
  asset: string;
  network: string;
  wallet: string;
  status: 'paid' | 'used';
  projectId: string;
  mock: boolean;
  createdAt: string;
  usedAt: string | null;
};

const listeners = new Set<() => void>();
let generation = 0;
let cache: { userId: string; at: number; rows: Purchase[] } | null = null;
let flight: { gen: number; promise: Promise<Purchase[]> } | null = null;

export function subscribePurchases(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function invalidate() {
  generation += 1;
  cache = null;
  flight = null;
  listeners.forEach((listener) => listener());
}

export function peekPurchases(userId: string) {
  if (!cache || cache.userId !== userId || Date.now() - cache.at > 20_000) return null;
  return cache.rows;
}

async function sessionUser() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

function explain(error: { message?: string; code?: string } | null) {
  const message = error?.message || '';
  if (
    error?.code === 'PGRST202' ||
    error?.code === 'PGRST205' ||
    /mock_checkout|mock_pay|claim_purchase|release_purchase|purchases|schema cache/i.test(message)
  ) {
    return 'Falta el SQL de compras en Supabase. Está al final de schema.sql, en el bloque de purchases.';
  }
  return message || 'No se pudo guardar el pago.';
}

function asPurchase(raw: unknown): Purchase | null {
  const row = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : null;
  if (!row || !isPlanId(row.plan) || typeof row.id !== 'string') return null;
  return {
    id: row.id,
    plan: row.plan,
    amountCents: Number(row.amount_cents) || 0,
    currency: String(row.currency || 'eur'),
    rail: row.rail === 'crypto' ? 'crypto' : 'card',
    asset: String(row.asset || ''),
    network: String(row.network || ''),
    wallet: String(row.wallet || ''),
    status: row.status === 'used' ? 'used' : 'paid',
    projectId: String(row.project_id || ''),
    mock: row.mock !== false,
    createdAt: String(row.created_at || ''),
    usedAt: row.used_at ? String(row.used_at) : null,
  };
}

function one(data: unknown) {
  const value = Array.isArray(data) ? data[0] : data;
  const parsed = asPurchase(value);
  if (!parsed) throw new Error('La compra no volvió bien.');
  return parsed;
}

async function readPurchases(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from('purchases')
    .select('id, plan, amount_cents, currency, rail, asset, network, wallet, status, project_id, mock, created_at, used_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(explain(error));
  return (data ?? []).map(asPurchase).filter((row): row is Purchase => Boolean(row));
}

export async function listPurchases() {
  const user = await sessionUser();
  if (!user || !supabase) return [];
  if (cache && cache.userId === user.id && Date.now() - cache.at < 20_000) return cache.rows;
  if (flight && flight.gen === generation) return flight.promise;
  const gen = generation;
  const promise = readPurchases(user.id)
    .then((rows) => {
      if (gen === generation) cache = { userId: user.id, at: Date.now(), rows };
      return rows;
    })
    .finally(() => {
      if (flight?.promise === promise) flight = null;
    });
  flight = { gen, promise };
  return promise;
}

export async function mockCheckout(input: {
  plan: PlanId;
  rail: 'card' | 'crypto';
  asset?: string;
  network?: string;
  wallet?: string;
}) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc('mock_checkout', {
    p_plan: input.plan,
    p_rail: input.rail,
    p_asset: input.asset ?? '',
    p_network: input.network ?? '',
    p_wallet: input.wallet ?? '',
  });
  if (error) throw new Error(explain(error));
  const row = one(data);
  invalidate();
  return row;
}

export async function mockPay(input: {
  projectId: string;
  family: PlanFamily;
  cents: number;
  rail: 'card' | 'crypto';
  asset?: string;
  network?: string;
  wallet?: string;
}) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc('mock_pay', {
    p_project: input.projectId,
    p_family: input.family,
    p_cents: input.cents,
    p_rail: input.rail,
    p_asset: input.asset ?? '',
    p_network: input.network ?? '',
    p_wallet: input.wallet ?? '',
  });
  if (error) throw new Error(explain(error));
  const row = one(data);
  invalidate();
  return row;
}

export async function claimPurchase(plan: PlanId, projectId: string) {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc('claim_purchase', { p_plan: plan, p_project: projectId });
  if (error) throw new Error(explain(error));
  const row = one(data);
  invalidate();
  return row;
}

export async function releasePurchase(id: string) {
  if (!supabase || !id) return;
  const { error } = await supabase.rpc('release_purchase', { p_id: id });
  if (error) throw new Error(explain(error));
  invalidate();
}

export function isFree(row: Purchase) {
  return row.status === 'paid' && !row.usedAt;
}

export function freeInFamily(rows: Purchase[], family: PlanFamily) {
  const ids = new Set(plansInFamily(family).map((plan) => plan.id));
  return rows.filter((row) => ids.has(row.plan) && isFree(row)).length;
}

export function openPlans(rows: Purchase[], family: PlanFamily) {
  return plansInFamily(family)
    .filter((plan) => rows.some((row) => row.plan === plan.id && isFree(row)))
    .map((plan) => plan.id);
}

export function paidToward(rows: Purchase[], projectId: string) {
  return rows.filter((row) => row.projectId === projectId).reduce((sum, row) => sum + row.amountCents, 0);
}

export function tally(rows: Purchase[], plan: PlanId) {
  const mine = rows.filter((row) => row.plan === plan);
  const free = mine.filter(isFree).length;
  return { bought: mine.length, free, used: mine.length - free };
}

export function usePurchases() {
  const { user } = useSession();
  const ticket = useRef(0);
  const [rows, setRows] = useState<Purchase[] | null>(() => (user ? peekPurchases(user.id) : null));
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    const mine = ++ticket.current;
    if (!user) {
      setRows([]);
      setError('');
      return;
    }
    try {
      const next = await listPurchases();
      if (mine !== ticket.current) return;
      setRows(next);
      setError('');
    } catch (err) {
      if (mine !== ticket.current) return;
      setError(err instanceof Error ? err.message : 'No pude leer las compras.');
      setRows((current) => current ?? []);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribePurchases(() => void load()), [load]);

  return { rows, error, loading: rows === null, refresh: load };
}
