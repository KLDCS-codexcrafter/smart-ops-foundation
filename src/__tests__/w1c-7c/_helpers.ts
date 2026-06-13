/**
 * @file w1c-7c/_helpers.ts — shared test harness for the 11 ops-close cards.
 * Sprint W1C-7c · T-W1C7c-Demo-Txns-Ops-Close.
 */
import { beforeEach } from 'vitest';
import { seedOpsCloseTxnsForDemo } from '@/data/demo-transactions-ops-close';

export const ENTITY = 'SMRT';

export function freshSeed(): void {
  localStorage.clear();
  seedOpsCloseTxnsForDemo(ENTITY);
}

export function setupFreshSeed(): void {
  beforeEach(() => { freshSeed(); });
}

export function readKey<T = unknown>(key: string): T[] {
  const raw = localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T[]) : [];
}
