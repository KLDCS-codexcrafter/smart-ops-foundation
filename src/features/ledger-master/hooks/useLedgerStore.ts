/**
 * @file     useLedgerStore.ts
 * @purpose  React hook providing CRUD over ledger definitions for a single
 *           ledger type. Wraps the existing erp_group_ledger_definitions
 *           storage key used by LedgerMaster.tsx — does NOT fork it.
 *           Listens for `storage` events so LedgerMaster page-level edits
 *           reflect into open Panels.
 * @sprint   T-H1.5-C-S6.5a
 * @finding  CC-059
 */
import { useCallback, useEffect, useState } from 'react';

export type LedgerStoreType =
  | 'cash' | 'bank' | 'asset' | 'liability' | 'capital'
  | 'loan_receivable' | 'borrowing' | 'income' | 'expense'
  | 'duties_tax' | 'payroll_statutory';

const STORAGE_KEY = 'erp_group_ledger_definitions';

export function useLedgerStore<T extends { id: string; ledgerType: LedgerStoreType }>(
  ledgerType: LedgerStoreType,
) {
  const [ledgers, setLedgers] = useState<T[]>([]);

  const reload = useCallback(() => {
    try {
      // [JWT] GET /api/accounting/ledger-definitions?type=:ledgerType
      const raw = localStorage.getItem(STORAGE_KEY);
      const all: T[] = raw ? (JSON.parse(raw) as T[]) : [];
      setLedgers(all.filter(l => l.ledgerType === ledgerType));
    } catch { setLedgers([]); }
  }, [ledgerType]);

  useEffect(() => {
    reload();
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) reload();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [reload]);

  const persist = useCallback((next: T[]) => {
    try {
      // [JWT] PUT /api/accounting/ledger-definitions
      const raw = localStorage.getItem(STORAGE_KEY);
      const all: T[] = raw ? (JSON.parse(raw) as T[]) : [];
      const others = all.filter(l => l.ledgerType !== ledgerType);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...others, ...next]));
    } catch { /* ignore */ }
  }, [ledgerType]);

  const create = useCallback((draft: T) => {
    setLedgers(prev => {
      const next = [...prev, draft];
      persist(next);
      return next;
    });
  }, [persist]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    setLedgers(prev => {
      const next = prev.map(l => l.id === id ? { ...l, ...patch } as T : l);
      persist(next);
      return next;
    });
  }, [persist]);

  const remove = useCallback((id: string) => {
    setLedgers(prev => {
      const next = prev.filter(l => l.id !== id);
      persist(next);
      return next;
    });
  }, [persist]);

  return { ledgers, reload, create, update, remove };
}
