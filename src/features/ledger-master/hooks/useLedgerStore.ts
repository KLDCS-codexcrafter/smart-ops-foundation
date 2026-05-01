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
import { logAudit } from '@/lib/audit-trail-engine';
import { useEntityCode } from '@/hooks/useEntityCode';

export type LedgerStoreType =
  | 'cash' | 'bank' | 'asset' | 'liability' | 'capital'
  | 'loan_receivable' | 'borrowing' | 'income' | 'expense'
  | 'duties_tax' | 'payroll_statutory';

const STORAGE_KEY = 'erp_group_ledger_definitions';

export function useLedgerStore<T extends { id: string; ledgerType: LedgerStoreType }>(
  ledgerType: LedgerStoreType,
) {
  const { entityCode } = useEntityCode();
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
    // Sprint T-Phase-1.2.5h-b1-fix · Audit trail (additive · MCA Rule 3(1))
    logAudit({
      entityCode: entityCode || 'GLOBAL',
      action: 'create',
      entityType: 'ledger',
      recordId: draft.id,
      recordLabel: (draft as unknown as { name?: string }).name ?? draft.id,
      beforeState: null,
      afterState: { ...draft } as Record<string, unknown>,
      reason: null,
      sourceModule: 'accounting',
    });
  }, [persist, entityCode]);

  const update = useCallback((id: string, patch: Partial<T>) => {
    const snaps: { prev: T | null; next: T | null } = { prev: null, next: null };
    setLedgers(prev => {
      snaps.prev = prev.find(l => l.id === id) ?? null;
      const next = prev.map(l => l.id === id ? { ...l, ...patch } as T : l);
      snaps.next = next.find(l => l.id === id) ?? null;
      persist(next);
      return next;
    });
    if (snaps.next) {
      // Sprint T-Phase-1.2.5h-b1-fix · Audit trail (additive · MCA Rule 3(1))
      const nextSnap = snaps.next as T;
      const prevSnap = snaps.prev;
      logAudit({
        entityCode: entityCode || 'GLOBAL',
        action: 'update',
        entityType: 'ledger',
        recordId: id,
        recordLabel: (nextSnap as unknown as { name?: string }).name ?? id,
        beforeState: prevSnap ? ({ ...prevSnap } as Record<string, unknown>) : null,
        afterState: { ...nextSnap } as Record<string, unknown>,
        reason: null,
        sourceModule: 'accounting',
      });
    }
  }, [persist, entityCode]);

  const remove = useCallback((id: string) => {
    const snaps: { prev: T | null } = { prev: null };
    setLedgers(prev => {
      snaps.prev = prev.find(l => l.id === id) ?? null;
      const next = prev.filter(l => l.id !== id);
      persist(next);
      return next;
    });
    if (snaps.prev) {
      const prevSnap = snaps.prev as T;
      // Sprint T-Phase-1.2.5h-b1-fix · Audit trail (additive · MCA Rule 3(1))
      logAudit({
        entityCode: entityCode || 'GLOBAL',
        action: 'cancel',
        entityType: 'ledger',
        recordId: id,
        recordLabel: (prevSnap as unknown as { name?: string }).name ?? id,
        beforeState: { ...prevSnap } as Record<string, unknown>,
        afterState: null,
        reason: 'Ledger removed',
        sourceModule: 'accounting',
      });
    }
  }, [persist, entityCode]);

  return { ledgers, reload, create, update, remove };
}
