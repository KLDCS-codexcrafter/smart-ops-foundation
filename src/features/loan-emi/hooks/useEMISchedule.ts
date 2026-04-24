/**
 * @file     useEMISchedule.ts
 * @purpose  React hook managing EMI schedule for a single Borrowing ledger.
 *           Reads live schedule from useLedgerStore, enriches with 'due' status,
 *           exposes mutation actions (markPaid, markBounced, addNote, regenerate).
 *           Handles silent S6.5b → D1 migration on read.
 * @sprint   T-H1.5-D-D1
 */

import { useMemo, useCallback } from 'react';
import { useLedgerStore } from '@/features/ledger-master/hooks/useLedgerStore';
import {
  transitionEMI, enrichRow, upgradeSchedule,
  type EMIScheduleLiveRow, type EMIStatus,
} from '../lib/emi-lifecycle-engine';
import type { BuildScheduleInput, EMIScheduleRow } from '@/features/ledger-master/lib/emi-schedule-builder';
import { buildEMISchedule } from '@/features/ledger-master/lib/emi-schedule-builder';

interface BorrowingLike {
  id: string;
  ledgerType: 'borrowing';
  emiScheduleCached?: EMIScheduleRow[];
  emiScheduleLive?: EMIScheduleLiveRow[];
}

export interface EMISummary {
  total: number;
  paid: number;
  due: number;
  overdue: number;
  bounced: number;
  scheduled: number;
  outstandingAmount: number;      // sum of totalEMI for non-paid rows
  nextDueDate: string | null;     // earliest non-paid dueDate
  nextDueAmount: number;          // totalEMI of next due row
}

export function useEMISchedule(ledgerId: string) {
  const { ledgers, update } = useLedgerStore<BorrowingLike>('borrowing');
  const ledger = ledgers.find(l => l.id === ledgerId);

  const today = new Date().toISOString().slice(0, 10);

  const storedRows: EMIScheduleLiveRow[] = useMemo(() => {
    if (!ledger) return [];
    if (ledger.emiScheduleLive && ledger.emiScheduleLive.length > 0) {
      return ledger.emiScheduleLive;
    }
    // Migrate S6.5b format silently
    if (ledger.emiScheduleCached && ledger.emiScheduleCached.length > 0) {
      return upgradeSchedule(ledger.emiScheduleCached);
    }
    return [];
  }, [ledger]);

  const enrichedRows = useMemo(
    () => storedRows.map(r => enrichRow(r, today)),
    [storedRows, today],
  );

  const summary: EMISummary = useMemo(() => {
    const count = (s: EMIStatus) => enrichedRows.filter(r => r.status === s).length;
    const outstandingAmount = enrichedRows
      .filter(r => r.status !== 'paid')
      .reduce((sum, r) => sum + r.totalEMI - r.paidAmount, 0);
    const nextPending = enrichedRows.find(r => r.status !== 'paid');
    return {
      total: enrichedRows.length,
      paid: count('paid'),
      due: count('due'),
      overdue: count('overdue'),
      bounced: count('bounced'),
      scheduled: count('scheduled'),
      outstandingAmount: Math.round(outstandingAmount * 100) / 100,
      nextDueDate: nextPending?.dueDate ?? null,
      nextDueAmount: nextPending?.totalEMI ?? 0,
    };
  }, [enrichedRows]);

  const persistRows = useCallback((next: EMIScheduleLiveRow[]) => {
    if (!ledger) return;
    update(ledger.id, { emiScheduleLive: next } as Partial<BorrowingLike>);
  }, [ledger, update]);

  const markPaid = useCallback((
    emiNumber: number, paidDate: string, paidAmount: number, voucherId: string | null,
  ) => {
    const next = storedRows.map(r => {
      if (r.emiNumber !== emiNumber) return r;
      const isFull = paidAmount >= r.totalEMI - 0.01;
      return transitionEMI(r, isFull ? 'paid' : 'partial', {
        paidDate, paidAmount, paymentVoucherId: voucherId,
      });
    });
    persistRows(next);
  }, [storedRows, persistRows]);

  const markBounced = useCallback((emiNumber: number, bouncedDate: string, notes: string) => {
    const next = storedRows.map(r => {
      if (r.emiNumber !== emiNumber) return r;
      return transitionEMI(r, 'bounced', {
        bouncedDate, bouncedCount: r.bouncedCount + 1,
        notes: notes ? `${r.notes ? r.notes + ' · ' : ''}${notes}` : r.notes,
      });
    });
    persistRows(next);
  }, [storedRows, persistRows]);

  const addNote = useCallback((emiNumber: number, note: string) => {
    const next = storedRows.map(r => {
      if (r.emiNumber !== emiNumber) return r;
      return { ...r, notes: r.notes ? `${r.notes} · ${note}` : note };
    });
    persistRows(next);
  }, [storedRows, persistRows]);

  const regenerate = useCallback((input: BuildScheduleInput) => {
    const fresh = buildEMISchedule(input);
    const live = upgradeSchedule(fresh);
    persistRows(live);
  }, [persistRows]);

  return {
    rows: enrichedRows,
    summary,
    markPaid,
    markBounced,
    addNote,
    regenerate,
    loaded: ledger !== undefined,
  };
}
