/**
 * useCycleCounts.ts — Cycle Count CRUD + state machine + ABC-driven suggestion engine
 * Sprint T-Phase-1.2.6
 *
 * State machine: draft → submitted → approved → posted (or rejected / cancelled).
 * postCount: stock balance qty SET to physical_qty; value = physical × weighted_avg_rate.
 *
 * [JWT] Replace localStorage with REST endpoints under /api/inventory/cycle-counts
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { CycleCount, CycleCountSuggestion } from '@/types/cycle-count';
import { cycleCountsKey } from '@/types/cycle-count';
import { generateDocNo } from '@/lib/finecore-engine';
import { dMul, round2 } from '@/lib/decimal-helpers';
import type { InventoryItem } from '@/types/inventory-item';
// Sprint T-Phase-1.2.5h-c1 · Generalized approval workflow (M-4) — engine wires audit trail.
import {
  submit as wfSubmit, approve as wfApprove, reject as wfReject,
  post as wfPost, cancelApproval as wfCancel,
  type ApprovalContext,
} from '@/lib/approval-workflow-engine';

interface BalanceRow {
  item_id: string; item_code: string; item_name: string;
  godown_id: string; godown_name: string;
  qty: number; value: number; weighted_avg_rate: number;
  last_grn_id: string | null; last_grn_no: string | null;
  updated_at: string;
}

function read<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}
function write<T>(key: string, data: T[]) {
  // [JWT] PATCH /api/...
  localStorage.setItem(key, JSON.stringify(data));
}

const ABC_THRESHOLDS: Record<'A' | 'B' | 'C' | 'X', number> = {
  A: 7, B: 30, C: 90, X: 180,  // X = unclassified
};

export function getCycleCountSuggestions(
  items: InventoryItem[],
  pastCounts: CycleCount[],
  asOfMs: number = Date.now(),
): CycleCountSuggestion[] {
  const lastCountByItem = new Map<string, string>();
  for (const cc of pastCounts) {
    if (cc.status !== 'posted') continue;
    const dt = cc.posted_at ?? cc.count_date;
    for (const ln of cc.lines) {
      const prev = lastCountByItem.get(ln.item_id);
      if (!prev || dt > prev) lastCountByItem.set(ln.item_id, dt);
    }
  }

  const out: CycleCountSuggestion[] = [];
  for (const it of items) {
    const cls = (it.abc_class ?? null) as 'A' | 'B' | 'C' | null;
    const key = (cls ?? 'X') as 'A' | 'B' | 'C' | 'X';
    const threshold = ABC_THRESHOLDS[key];
    const lastCounted = lastCountByItem.get(it.id) ?? null;
    const days = lastCounted
      ? Math.floor((asOfMs - Date.parse(lastCounted)) / 86400000)
      : null;
    const overdueBy = days === null ? threshold + 1 : days - threshold;
    out.push({
      item_id: it.id,
      item_name: it.name,
      abc_class: cls,
      last_counted_at: lastCounted,
      days_since_count: days,
      threshold_days: threshold,
      is_overdue: overdueBy > 0,
      overdue_by_days: overdueBy,
    });
  }
  out.sort((a, b) => b.overdue_by_days - a.overdue_by_days);
  return out;
}

export function useCycleCounts(entityCode: string) {
  const [counts, setCounts] = useState<CycleCount[]>(
    () => read<CycleCount>(cycleCountsKey(entityCode)),
  );

  const persist = useCallback((next: CycleCount[]) => {
    setCounts(next);
    write(cycleCountsKey(entityCode), next);
  }, [entityCode]);

  const computeAggregates = useCallback((cc: CycleCount): CycleCount => {
    let varianceLines = 0;
    let totVarQty = 0;
    let totVarValue = 0;
    let totCountedValue = 0;
    const lines = cc.lines.map(ln => {
      const variance = ln.physical_qty - ln.system_qty;
      const value = round2(dMul(variance, ln.weighted_avg_rate));
      if (variance !== 0) varianceLines++;
      totVarQty += Math.abs(variance);
      totVarValue += value;
      totCountedValue += round2(dMul(ln.physical_qty, ln.weighted_avg_rate));
      return { ...ln, variance_qty: variance, variance_value: value };
    });
    return {
      ...cc,
      lines,
      total_lines: lines.length,
      variance_lines: varianceLines,
      total_variance_qty_abs: round2(totVarQty),
      total_variance_value: round2(totVarValue),
      net_shrinkage_pct: totCountedValue > 0
        ? round2((totVarValue / totCountedValue) * 100) : 0,
    };
  }, []);

  const createCount = useCallback((input: Partial<CycleCount> & { count_kind: CycleCount['count_kind']; count_date: string; lines: CycleCount['lines'] }): CycleCount => {
    const now = new Date().toISOString();
    const seed: CycleCount = {
      id: crypto.randomUUID(),
      entity_id: entityCode,
      count_no: generateDocNo('PSV', entityCode),
      count_kind: input.count_kind,
      count_date: input.count_date,
      godown_id: input.godown_id ?? null,
      godown_name: input.godown_name ?? null,
      bin_filter: input.bin_filter ?? null,
      abc_class_filter: input.abc_class_filter ?? null,
      counter_id: null, counter_name: null,
      reviewer_id: null, reviewer_name: null,
      approver_id: null, approver_name: null,
      status: 'draft',
      submitted_at: null, approved_at: null, rejected_at: null, rejection_reason: null,
      posted_at: null, cancelled_at: null, cancellation_reason: null,
      lines: input.lines,
      total_lines: 0, variance_lines: 0,
      total_variance_qty_abs: 0, total_variance_value: 0, net_shrinkage_pct: 0,
      notes: input.notes ?? null,
      created_at: now, updated_at: now,
    };
    const next = [computeAggregates(seed), ...counts];
    persist(next);
    toast.success(`Cycle count ${seed.count_no} created`);
    // [JWT] POST /api/inventory/cycle-counts
    return next[0];
  }, [counts, persist, entityCode, computeAggregates]);

  const updateCount = useCallback((id: string, patch: Partial<CycleCount>): CycleCount | null => {
    let updated: CycleCount | null = null;
    const next = counts.map(c => {
      if (c.id !== id) return c;
      const merged: CycleCount = { ...c, ...patch, updated_at: new Date().toISOString() };
      const re = computeAggregates(merged);
      updated = re;
      return re;
    });
    persist(next);
    return updated;
    // [JWT] PATCH /api/inventory/cycle-counts/:id
  }, [counts, persist, computeAggregates]);

  // Sprint T-Phase-1.2.5h-c1 · Approval transitions delegated to engine
  // (audit log written automatically — no parallel logAudit calls).
  const wfCtx: ApprovalContext = {
    entityCode,
    auditEntityType: 'cycle_count',
    sourceModule: 'inventory',
    recordLabel: r => (r.count_no as string) ?? r.id,
  };

  const submitForReview = useCallback((id: string, counterId: string, counterName: string) => {
    const cc = counts.find(c => c.id === id);
    if (!cc) return null;
    const r = wfSubmit(cc as unknown as Record<string, unknown> & { id: string }, { id: counterId, name: counterName }, wfCtx);
    if (!r.ok || !r.next) { toast.error(r.reason ?? 'Submit failed'); return null; }
    return updateCount(id, r.next as unknown as Partial<CycleCount>);
  }, [counts, updateCount, wfCtx]);

  const approveCount = useCallback((id: string, approverId: string, approverName: string) => {
    const cc = counts.find(c => c.id === id);
    if (!cc) return null;
    const r = wfApprove(cc as unknown as Record<string, unknown> & { id: string }, { id: approverId, name: approverName }, wfCtx);
    if (!r.ok || !r.next) { toast.error(r.reason ?? 'Approve failed'); return null; }
    return updateCount(id, r.next as unknown as Partial<CycleCount>);
  }, [counts, updateCount, wfCtx]);

  const rejectCount = useCallback((id: string, reason: string) => {
    const cc = counts.find(c => c.id === id);
    if (!cc) return null;
    const r = wfReject(cc as unknown as Record<string, unknown> & { id: string }, { id: 'system', name: 'system' }, reason, wfCtx);
    if (!r.ok || !r.next) { toast.error(r.reason ?? 'Reject failed'); return null; }
    return updateCount(id, r.next as unknown as Partial<CycleCount>);
  }, [counts, updateCount, wfCtx]);

  const cancelCount = useCallback((id: string, reason: string) => {
    const cc = counts.find(c => c.id === id);
    if (!cc) return null;
    const r = wfCancel(cc as unknown as Record<string, unknown> & { id: string }, reason, wfCtx);
    if (!r.ok || !r.next) { toast.error(r.reason ?? 'Cancel failed'); return null; }
    return updateCount(id, r.next as unknown as Partial<CycleCount>);
  }, [counts, updateCount, wfCtx]);

  const postCount = useCallback((id: string): CycleCount | null => {
    const cc = counts.find(c => c.id === id);
    if (!cc) return null;
    if (cc.status !== 'approved') {
      toast.error('Only approved counts can be posted');
      return null;
    }
    const now = new Date().toISOString();

    // Update stock balance: SET qty = physical_qty
    const balKey = `erp_stock_balance_${entityCode}`;
    const balances = read<BalanceRow>(balKey);
    const itemKey = `erp_inventory_items`;
    interface ItemLite { id: string; last_received_at?: string; last_issued_at?: string; updated_at?: string }
    const items = read<ItemLite>(itemKey);

    const itemTouchInward = new Set<string>();
    const itemTouchOutward = new Set<string>();

    for (const ln of cc.lines) {
      if (!ln.godown_id) continue;
      const idx = balances.findIndex(b => b.item_id === ln.item_id && b.godown_id === ln.godown_id);
      const newValue = round2(dMul(ln.physical_qty, ln.weighted_avg_rate));
      if (idx === -1) {
        balances.push({
          item_id: ln.item_id, item_code: ln.item_code, item_name: ln.item_name,
          godown_id: ln.godown_id, godown_name: ln.godown_name,
          qty: ln.physical_qty, value: newValue, weighted_avg_rate: ln.weighted_avg_rate,
          last_grn_id: null, last_grn_no: null, updated_at: now,
        });
      } else {
        balances[idx] = {
          ...balances[idx],
          qty: ln.physical_qty,
          value: newValue,
          updated_at: now,
        };
      }
      if (ln.variance_qty > 0) itemTouchInward.add(ln.item_id);
      if (ln.variance_qty < 0) itemTouchOutward.add(ln.item_id);
    }
    write(balKey, balances);

    // Touch item movement timestamps (batched)
    if (itemTouchInward.size + itemTouchOutward.size > 0) {
      const updatedItems = items.map(it => {
        if (itemTouchInward.has(it.id) || itemTouchOutward.has(it.id)) {
          return {
            ...it,
            last_received_at: itemTouchInward.has(it.id) ? now : it.last_received_at,
            last_issued_at: itemTouchOutward.has(it.id) ? now : it.last_issued_at,
            updated_at: now,
          };
        }
        return it;
      });
      write(itemKey, updatedItems);
    }

    // Sprint T-Phase-1.2.5h-c1 · Engine-driven post (audit trail wired automatically)
    const r = wfPost(cc as unknown as Record<string, unknown> & { id: string }, wfCtx);
    if (!r.ok || !r.next) { toast.error(r.reason ?? 'Post failed'); return null; }
    const result = updateCount(id, r.next as unknown as Partial<CycleCount>);
    toast.success('Cycle count posted · stock adjusted');
    return result;
  }, [counts, entityCode, updateCount, wfCtx]);

  return {
    counts,
    createCount,
    updateCount,
    submitForReview,
    approveCount,
    rejectCount,
    postCount,
    cancelCount,
  };
}
