/**
 * useOutstanding.ts — Outstanding management hook
 * [JWT] Replace with GET/PATCH /api/accounting/outstanding
 */
import { useState, useCallback } from 'react';
import type { OutstandingEntry } from '@/types/voucher';
import { outstandingKey } from '@/lib/finecore-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function useOutstanding(entityCode: string) {
  const key = outstandingKey(entityCode);
  const [entries, setEntries] = useState<OutstandingEntry[]>(() => ls<OutstandingEntry>(key));

  const getPartyOutstanding = useCallback((partyId: string, type?: 'debtor' | 'creditor') => {
    return entries.filter(e =>
      e.party_id === partyId && e.status !== 'cancelled' && e.status !== 'settled' &&
      (!type || e.party_type === type)
    );
  }, [entries]);

  const getAging = useCallback((asOf?: string) => {
    const refDate = asOf ? new Date(asOf) : new Date();
    const buckets = [30, 60, 90, 180, 999];
    return entries
      .filter(e => e.status === 'open' || e.status === 'partial')
      .map(e => {
        const days = Math.floor((refDate.getTime() - new Date(e.voucher_date).getTime()) / 86400000);
        const bucket = buckets.findIndex(b => days <= b);
        return { ...e, ageDays: days, bucket: bucket >= 0 ? bucket : buckets.length - 1 };
      });
  }, [entries]);

  const settleOutstanding = useCallback((entryId: string, amount: number, settlementVoucherId: string) => {
    const now = new Date().toISOString();
    const updated = entries.map(e => {
      if (e.id !== entryId) return e;
      const newSettled = e.settled_amount + amount;
      const newPending = e.original_amount - newSettled;
      return {
        ...e,
        settled_amount: newSettled,
        pending_amount: Math.max(0, newPending),
        settlement_refs: [...e.settlement_refs, { voucher_id: settlementVoucherId, amount, date: now }],
        status: (newPending <= 0.01 ? 'settled' : 'partial') as OutstandingEntry['status'],
        updated_at: now,
      };
    });
    setEntries(updated);
    // [JWT] PATCH /api/accounting/outstanding/:id
    localStorage.setItem(key, JSON.stringify(updated));
  }, [entries, key]);

  const getCreditUtilisation = useCallback((partyId: string) => {
    const open = entries.filter(e => e.party_id === partyId && e.party_type === 'debtor' && e.status !== 'cancelled' && e.status !== 'settled');
    return open.reduce((s, e) => s + e.pending_amount, 0);
  }, [entries]);

  return { entries, getPartyOutstanding, getAging, settleOutstanding, getCreditUtilisation };
}
