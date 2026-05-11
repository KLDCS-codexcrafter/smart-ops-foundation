/**
 * @file        src/lib/sitex-imprest-engine.ts
 * @purpose     SiteX Site Imprest canonical engine · Path B own entity · 4th Path B consumer · OOB #7 Live Gauge consumer · OOB #20 demobilization reconciliation
 * @who         Site Manager · Site Finance · Operations Lead
 * @when        2026-05-11
 * @sprint      T-Phase-1.A.15a SiteX Closeout · Q-LOCK-2a · Block A.2 · NEW canonical
 * @iso         ISO 9001:2015 §8.1 · ISO 25010 Reliability + Maintainability
 * @whom        Audit Owner
 * @decisions   D-NEW-CW POSSIBLE 20th canonical · D-194 localStorage · FR-50 · FR-52 #5 BD ledger
 * @disciplines FR-1 · FR-19 · FR-22 · FR-24 · FR-30 · FR-50 · FR-51 · FR-52 · FR-56 · FR-73.1 absolute
 * @reuses      SiteImprest + ImprestTransaction + ImprestReplenishmentRequest from @/types/sitex
 * @[JWT]       POST /api/sitex/imprest · POST /api/sitex/imprest/:id/replenish · POST /api/sitex/imprest/:id/deduct
 */

import type {
  SiteImprest, ImprestTransaction, ImprestReplenishmentRequest,
} from '@/types/sitex';
import {
  siteImprestsKey, imprestTransactionsKey, imprestReplenishmentsKey,
} from '@/types/sitex';

function readJSON<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}
function writeJSON<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
}

export function listImprests(entityCode: string): SiteImprest[] {
  return readJSON<SiteImprest>(siteImprestsKey(entityCode));
}

export function getImprestBySite(entityCode: string, siteId: string): SiteImprest | null {
  return listImprests(entityCode).find((i) => i.site_id === siteId) ?? null;
}

export function createImprest(
  entityCode: string, siteId: string, branchId: string, imprestLimit: number,
): SiteImprest {
  const now = new Date().toISOString();
  const imprest: SiteImprest = {
    id: `IMP-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    site_id: siteId,
    branch_id: branchId,
    current_balance: 0,
    imprest_limit: imprestLimit,
    last_replenishment_date: null,
    created_at: now,
  };
  const all = listImprests(entityCode);
  all.push(imprest);
  writeJSON(siteImprestsKey(entityCode), all);
  return imprest;
}

export function replenishImprest(
  entityCode: string, request: ImprestReplenishmentRequest,
): { allowed: boolean; reason: string | null; replenishment_id: string | null } {
  if (request.amount_requested <= 0) {
    return { allowed: false, reason: 'Amount must be positive', replenishment_id: null };
  }
  const reqs = readJSON<ImprestReplenishmentRequest>(imprestReplenishmentsKey(entityCode));
  reqs.push({ ...request, status: 'pending' });
  writeJSON(imprestReplenishmentsKey(entityCode), reqs);
  return { allowed: true, reason: null, replenishment_id: request.id };
}

export function approveReplenishment(
  entityCode: string, replenishmentId: string, approverId: string,
): { allowed: boolean; reason: string | null; bd_ledger_voucher_id: string | null } {
  const reqs = readJSON<ImprestReplenishmentRequest>(imprestReplenishmentsKey(entityCode));
  const req = reqs.find((r) => r.id === replenishmentId);
  if (!req) return { allowed: false, reason: 'Replenishment not found', bd_ledger_voucher_id: null };
  if (req.status !== 'pending') return { allowed: false, reason: 'Not pending', bd_ledger_voucher_id: null };

  const now = new Date().toISOString();
  const vid = `BD-VOU-${Date.now()}`;
  req.status = 'transferred';
  req.approved_by = approverId;
  req.approved_at = now;
  req.bd_ledger_voucher_id = vid;
  writeJSON(imprestReplenishmentsKey(entityCode), reqs);

  // Update imprest balance + txn
  const imprests = listImprests(entityCode);
  const imp = imprests.find((i) => i.id === req.imprest_id);
  if (imp) {
    imp.current_balance += req.amount_requested;
    imp.last_replenishment_date = now;
    writeJSON(siteImprestsKey(entityCode), imprests);
  }
  const txns = readJSON<ImprestTransaction>(imprestTransactionsKey(entityCode));
  txns.push({
    id: `TXN-${Date.now()}`,
    imprest_id: req.imprest_id,
    site_id: req.site_id,
    txn_type: 'replenishment',
    amount: req.amount_requested,
    currency: 'INR',
    fx_rate: 1,
    fx_date: now,
    reference: vid,
    payee_name: null,
    notes: req.reason,
    posted_by: approverId,
    posted_at: now,
    reverses_txn_id: null,
  });
  writeJSON(imprestTransactionsKey(entityCode), txns);
  return { allowed: true, reason: null, bd_ledger_voucher_id: vid };
}

export function canDeductFromImprest(
  entityCode: string, siteId: string, amount: number,
): { allowed: boolean; reason: string | null; current_balance: number } {
  const imp = getImprestBySite(entityCode, siteId);
  if (!imp) return { allowed: false, reason: 'No imprest', current_balance: 0 };
  if (amount <= 0) return { allowed: false, reason: 'Amount must be positive', current_balance: imp.current_balance };
  if (imp.current_balance < amount) {
    return { allowed: false, reason: 'Insufficient balance', current_balance: imp.current_balance };
  }
  return { allowed: true, reason: null, current_balance: imp.current_balance };
}

export function deductFromImprest(
  entityCode: string, siteId: string, amount: number,
  reference: string, payeeName: string, postedBy: string,
): { allowed: boolean; reason: string | null; txn_id: string | null; new_balance: number } {
  const guard = canDeductFromImprest(entityCode, siteId, amount);
  if (!guard.allowed) return { allowed: false, reason: guard.reason, txn_id: null, new_balance: guard.current_balance };

  const imprests = listImprests(entityCode);
  const imp = imprests.find((i) => i.site_id === siteId)!;
  imp.current_balance -= amount;
  writeJSON(siteImprestsKey(entityCode), imprests);

  const now = new Date().toISOString();
  const txnId = `TXN-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const txns = readJSON<ImprestTransaction>(imprestTransactionsKey(entityCode));
  txns.push({
    id: txnId, imprest_id: imp.id, site_id: siteId,
    txn_type: 'payment', amount, currency: 'INR', fx_rate: 1, fx_date: now,
    reference, payee_name: payeeName, notes: '', posted_by: postedBy,
    posted_at: now, reverses_txn_id: null,
  });
  writeJSON(imprestTransactionsKey(entityCode), txns);
  return { allowed: true, reason: null, txn_id: txnId, new_balance: imp.current_balance };
}

export function reconcileImprest(
  entityCode: string, siteId: string,
): { allowed: boolean; reason: string | null; returned_amount: number; bd_ledger_voucher_id: string | null } {
  const imp = getImprestBySite(entityCode, siteId);
  if (!imp) return { allowed: false, reason: 'No imprest', returned_amount: 0, bd_ledger_voucher_id: null };
  const returned = imp.current_balance;
  const now = new Date().toISOString();
  const vid = `BD-REV-${Date.now()}`;
  const imprests = listImprests(entityCode);
  const target = imprests.find((i) => i.id === imp.id)!;
  target.current_balance = 0;
  writeJSON(siteImprestsKey(entityCode), imprests);
  const txns = readJSON<ImprestTransaction>(imprestTransactionsKey(entityCode));
  txns.push({
    id: `TXN-${Date.now()}`, imprest_id: imp.id, site_id: siteId,
    txn_type: 'closeout_return', amount: returned, currency: 'INR',
    fx_rate: 1, fx_date: now, reference: vid, payee_name: null,
    notes: 'Demobilization reconciliation', posted_by: 'system',
    posted_at: now, reverses_txn_id: null,
  });
  writeJSON(imprestTransactionsKey(entityCode), txns);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('sitex:imprest.reconciled', {
      detail: { site_id: siteId, returned_amount: returned, bd_ledger_voucher_id: vid },
    }));
  }
  return { allowed: true, reason: null, returned_amount: returned, bd_ledger_voucher_id: vid };
}

export function listImprestTransactions(entityCode: string, imprestId: string): ImprestTransaction[] {
  return readJSON<ImprestTransaction>(imprestTransactionsKey(entityCode))
    .filter((t) => t.imprest_id === imprestId);
}

export function computeImprestHealthMetrics(entityCode: string, siteId: string): {
  utilization_pct: number;
  days_since_replenishment: number;
  txn_volume_30d: number;
  health_score_contribution: number;
} {
  const imp = getImprestBySite(entityCode, siteId);
  if (!imp) return { utilization_pct: 0, days_since_replenishment: 0, txn_volume_30d: 0, health_score_contribution: 50 };
  const util = imp.imprest_limit > 0 ? (imp.current_balance / imp.imprest_limit) * 100 : 0;
  const days = imp.last_replenishment_date
    ? Math.floor((Date.now() - new Date(imp.last_replenishment_date).getTime()) / 86400000)
    : 0;
  const cutoff = Date.now() - 30 * 86400000;
  const vol = listImprestTransactions(entityCode, imp.id)
    .filter((t) => new Date(t.posted_at).getTime() >= cutoff)
    .reduce((s, t) => s + Math.abs(t.amount), 0);
  let score = 100;
  if (util > 90) score = 40;
  else if (util > 70) score = 70;
  else if (util < 20) score = 60;
  return {
    utilization_pct: util,
    days_since_replenishment: days,
    txn_volume_30d: vol,
    health_score_contribution: score,
  };
}
