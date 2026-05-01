/**
 * useMaterialIssueNotes.ts — CRUD + post for Material Issue Notes
 * Sprint T-Phase-1.2.2 · Inventory Hub MOAT sprint
 *
 * Storage: erp_material_issue_notes_${entityCode}
 * Stock balance: deducts from from-godown · adds to to-godown using weighted-avg rate.
 * [JWT] GET/POST/PATCH /api/inventory/material-issue-notes
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  minNotesKey, type MaterialIssueNote,
} from '@/types/consumption';
import { stockBalanceKey, type StockBalanceEntry } from '@/types/grn';
import { dAdd, dSub, dMul, round2 } from '@/lib/decimal-helpers';
import { isPeriodLocked, periodLockMessage } from '@/lib/period-lock-engine';
// Sprint T-Phase-1.2.5h-b1 · Universal audit trail (MCA Rule 3(1))
import { logAudit } from '@/lib/audit-trail-engine';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

export interface IssueValidationError {
  ok: false;
  reason: string;
}
export interface IssueValidationOk {
  ok: true;
}
export type IssueValidation = IssueValidationOk | IssueValidationError;

/** Pure helper — checks if from-godown has enough stock. Re-usable from forms. */
export function checkBalanceForIssue(
  balances: readonly StockBalanceEntry[],
  fromGodownId: string,
  lines: readonly { item_id: string; item_name: string; qty: number }[],
): IssueValidation {
  for (const ln of lines) {
    if (ln.qty <= 0) continue;
    const bal = balances.find(b => b.item_id === ln.item_id && b.godown_id === fromGodownId);
    const avail = bal?.qty ?? 0;
    if (avail < ln.qty) {
      return {
        ok: false,
        reason: `${ln.item_name} — only ${avail} available · ${ln.qty} requested`,
      };
    }
  }
  return { ok: true };
}

export function useMaterialIssueNotes(entityCode: string) {
  const key = minNotesKey(entityCode);
  const [mins, setMins] = useState<MaterialIssueNote[]>(() => ls<MaterialIssueNote>(key));

  const refresh = useCallback(() => setMins(ls<MaterialIssueNote>(key)), [key]);

  const upsertDraft = useCallback((m: MaterialIssueNote) => {
    setMins(prev => {
      const idx = prev.findIndex(x => x.id === m.id);
      const next = idx === -1 ? [m, ...prev] : prev.map(x => x.id === m.id ? m : x);
      ss(key, next);
      return next;
    });
  }, [key]);

  /**
   * issueMin — flips status from draft → issued.
   * Validates period-lock + stock balance, then atomically updates stock balance.
   */
  const issueMin = useCallback((m: MaterialIssueNote): IssueValidation => {
    if (isPeriodLocked(m.issue_date, entityCode)) {
      const msg = periodLockMessage(m.issue_date, entityCode) ?? 'Period locked';
      toast.error(msg); return { ok: false, reason: msg };
    }
    const balances = ls<StockBalanceEntry>(stockBalanceKey(entityCode));
    const check = checkBalanceForIssue(balances, m.from_godown_id, m.lines);
    if (!check.ok) {
      toast.error(check.reason); return check;
    }
    // Apply transfer
    const now = new Date().toISOString();
    const updated: StockBalanceEntry[] = [...balances];
    for (const ln of m.lines) {
      if (ln.qty <= 0) continue;
      // Deduct from source
      const fIdx = updated.findIndex(
        b => b.item_id === ln.item_id && b.godown_id === m.from_godown_id);
      if (fIdx === -1) {
        toast.error(`No balance row for ${ln.item_name} in source godown`);
        return { ok: false, reason: 'Balance row missing' };
      }
      const fBal = updated[fIdx];
      const newFromQty = round2(dSub(fBal.qty, ln.qty));
      const newFromValue = round2(dSub(fBal.value, dMul(ln.qty, fBal.weighted_avg_rate)));
      updated[fIdx] = {
        ...fBal,
        qty: newFromQty,
        value: Math.max(0, newFromValue),
        updated_at: now,
      };
      // Add to destination at the source weighted-avg rate (snapshot used in MIN line)
      const tIdx = updated.findIndex(
        b => b.item_id === ln.item_id && b.godown_id === m.to_godown_id);
      const transferValue = round2(dMul(ln.qty, fBal.weighted_avg_rate));
      if (tIdx === -1) {
        updated.push({
          item_id: ln.item_id, item_code: ln.item_code, item_name: ln.item_name,
          godown_id: m.to_godown_id, godown_name: m.to_godown_name,
          qty: ln.qty,
          value: transferValue,
          weighted_avg_rate: fBal.weighted_avg_rate,
          last_grn_id: null, last_grn_no: null,
          updated_at: now,
        });
      } else {
        const tBal = updated[tIdx];
        const nq = round2(dAdd(tBal.qty, ln.qty));
        const nv = round2(dAdd(tBal.value, transferValue));
        updated[tIdx] = {
          ...tBal,
          qty: nq, value: nv,
          weighted_avg_rate: nq > 0 ? round2(nv / nq) : fBal.weighted_avg_rate,
          updated_at: now,
        };
      }
    }
    ss(stockBalanceKey(entityCode), updated);

    // Sprint T-Phase-1.2.5 · Update Item.last_issued_at in single batched write
    try {
      const IKEY = 'erp_inventory_items';
      // [JWT] GET /api/inventory/items
      const itemsRaw = localStorage.getItem(IKEY);
      if (itemsRaw) {
        const arr: Array<{ id: string; last_issued_at?: string | null; updated_at?: string }> = JSON.parse(itemsRaw);
        const lineItemIds = new Set(m.lines.filter(l => l.qty > 0).map(l => l.item_id));
        let changed = false;
        for (let i = 0; i < arr.length; i++) {
          if (lineItemIds.has(arr[i].id)) {
            arr[i] = { ...arr[i], last_issued_at: now, updated_at: now };
            changed = true;
          }
        }
        // [JWT] PATCH /api/inventory/items (bulk last_issued_at)
        if (changed) localStorage.setItem(IKEY, JSON.stringify(arr));
      }
    } catch { /* best-effort */ }

    const issued: MaterialIssueNote = {
      ...m, status: 'issued', issued_at: now, updated_at: now,
    };
    upsertDraft(issued);
    toast.success(`MIN ${issued.min_no} issued · ${m.lines.length} line(s) transferred`);
    return { ok: true };
  }, [entityCode, upsertDraft]);

  const cancelMin = useCallback((id: string, reason: string) => {
    const now = new Date().toISOString();
    const found = mins.find(x => x.id === id);
    if (!found) return;
    if (found.status === 'issued') {
      toast.error('Cannot cancel an issued MIN — create a reversing MIN instead');
      return;
    }
    upsertDraft({
      ...found, status: 'cancelled',
      cancelled_at: now, cancellation_reason: reason, updated_at: now,
    });
  }, [mins, upsertDraft]);

  return { mins, refresh, upsertDraft, issueMin, cancelMin };
}
