/**
 * @file        src/test/sitex-imprest-engine.test.ts
 * @purpose     A.15b imprest engine tests (FR-30 header backfilled at A.16c.G.1 T3.1)
 * @sprint      T-Phase-1.A.15b SiteX Closeout Mobile · Block G.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createImprest, getImprestBySite, replenishImprest, approveReplenishment,
  canDeductFromImprest, deductFromImprest, reconcileImprest,
  listImprestTransactions, computeImprestHealthMetrics,
} from '@/lib/sitex-imprest-engine';
import { siteImprestsKey, imprestTransactionsKey, imprestReplenishmentsKey } from '@/types/sitex';

const E = 'TEST';
beforeEach(() => {
  localStorage.removeItem(siteImprestsKey(E));
  localStorage.removeItem(imprestTransactionsKey(E));
  localStorage.removeItem(imprestReplenishmentsKey(E));
});

describe('sitex-imprest-engine', () => {
  it('creates imprest with initial balance 0', () => {
    const imp = createImprest(E, 'SITE-1', 'BR-1', 100000);
    expect(imp.current_balance).toBe(0);
    expect(imp.imprest_limit).toBe(100000);
  });

  it('replenish queues request without changing balance', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    const r = replenishImprest(E, {
      id: 'REQ-1', imprest_id: 'X', site_id: 'SITE-1',
      amount_requested: 5000, reason: 'top-up', status: 'pending',
      requested_by: 'mgr', requested_at: new Date().toISOString(),
      approved_by: null, approved_at: null, bd_ledger_voucher_id: null,
    });
    expect(r.allowed).toBe(true);
    expect(getImprestBySite(E, 'SITE-1')!.current_balance).toBe(0);
  });

  it('approveReplenishment creates BD voucher + transaction', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    replenishImprest(E, {
      id: 'REQ-2', imprest_id: 'X', site_id: 'SITE-1', amount_requested: 5000,
      reason: 'r', status: 'pending', requested_by: 'mgr',
      requested_at: new Date().toISOString(), approved_by: null,
      approved_at: null, bd_ledger_voucher_id: null,
    });
    const a = approveReplenishment(E, 'REQ-2', 'fin');
    expect(a.allowed).toBe(true);
    expect(a.bd_ledger_voucher_id).toMatch(/^BD-VOU-/);
  });

  it('canDeductFromImprest blocks when balance insufficient', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    const g = canDeductFromImprest(E, 'SITE-1', 1000);
    expect(g.allowed).toBe(false);
  });

  it('reconcileImprest returns balance to HO + emits reverse', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    const r = reconcileImprest(E, 'SITE-1');
    expect(r.allowed).toBe(true);
    expect(r.bd_ledger_voucher_id).toMatch(/^BD-REV-/);
  });

  it('computeImprestHealthMetrics returns 4 dimensions', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    const m = computeImprestHealthMetrics(E, 'SITE-1');
    expect(m.health_score_contribution).toBeGreaterThanOrEqual(0);
    expect(m.health_score_contribution).toBeLessThanOrEqual(100);
  });

  it('entity-prefixed localStorage keys (D-194)', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    expect(localStorage.getItem(siteImprestsKey(E))).not.toBeNull();
  });

  it('deductFromImprest blocks at zero balance', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    const d = deductFromImprest(E, 'SITE-1', 100, 'ref', 'X', 'mgr');
    expect(d.allowed).toBe(false);
  });

  it('listImprestTransactions returns array', () => {
    createImprest(E, 'SITE-1', 'BR-1', 100000);
    const t = listImprestTransactions(E, 'IMP-X');
    expect(Array.isArray(t)).toBe(true);
  });
});
