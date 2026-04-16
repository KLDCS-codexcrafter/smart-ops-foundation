/**
 * useJournal.ts — Read hook for journal (GL) entries
 * [JWT] Replace with GET /api/accounting/journal
 */
import { useState, useCallback } from 'react';
import type { JournalEntry } from '@/types/voucher';
import { journalKey } from '@/lib/finecore-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useJournal(entityCode: string) {
  const key = journalKey(entityCode);
  const [entries] = useState<JournalEntry[]>(() => ls<JournalEntry>(key));

  const getLedgerBalance = useCallback((ledgerId: string, asOf?: string) => {
    const filtered = entries.filter(e =>
      e.ledger_id === ledgerId && !e.is_cancelled &&
      (!asOf || e.date <= asOf)
    );
    const dr = filtered.reduce((s, e) => s + e.dr_amount, 0);
    const cr = filtered.reduce((s, e) => s + e.cr_amount, 0);
    return { dr, cr, balance: dr - cr };
  }, [entries]);

  const getTrialBalance = useCallback(() => {
    const map = new Map<string, { ledgerId: string; ledgerName: string; dr: number; cr: number }>();
    for (const e of entries) {
      if (e.is_cancelled) continue;
      const existing = map.get(e.ledger_id) || { ledgerId: e.ledger_id, ledgerName: e.ledger_name, dr: 0, cr: 0 };
      existing.dr += e.dr_amount;
      existing.cr += e.cr_amount;
      map.set(e.ledger_id, existing);
    }
    return Array.from(map.values());
  }, [entries]);

  const getLedgerHistory = useCallback((ledgerId: string, from?: string, to?: string) => {
    return entries.filter(e =>
      e.ledger_id === ledgerId && !e.is_cancelled &&
      (!from || e.date >= from) && (!to || e.date <= to)
    );
  }, [entries]);

  const getTrialBalanceAsOf = useCallback((asOfDate: string) => {
    const filtered = entries.filter(e => e.date <= asOfDate && !e.is_cancelled);
    const map = new Map<string, { ledgerId: string; ledgerName: string; ledgerGroupCode: string; dr: number; cr: number }>();
    for (const e of filtered) {
      const ex = map.get(e.ledger_id) || { ledgerId: e.ledger_id, ledgerName: e.ledger_name, ledgerGroupCode: e.ledger_group_code, dr: 0, cr: 0 };
      ex.dr += e.dr_amount; ex.cr += e.cr_amount;
      map.set(e.ledger_id, ex);
    }
    return Array.from(map.values());
  }, [entries]);

  return { entries, getLedgerBalance, getTrialBalance, getTrialBalanceAsOf, getLedgerHistory };
}
