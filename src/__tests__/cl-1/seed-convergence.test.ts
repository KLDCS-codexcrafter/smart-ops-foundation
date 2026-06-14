/**
 * CL-1 · Block 2 · B3-F1 + B4-F1 — seed convergence round-trip.
 * B3-F1: scenario seed path populates finance/procurement registers for any entity.
 * B4-F1: SRM register reads exactly the orchestrator's write key.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedEntityDemoData } from '@/lib/demo-seed-orchestrator';
import { supplyRequestMemosKey } from '@/types/supply-request-memo';

const ENTITY = 'CLTST';

describe('CL-1 · B3-F1 + B4-F1 · seed convergence', () => {
  beforeEach(() => localStorage.clear());

  it('B3-F1 — seedEntityDemoData populates finance/procurement registers for scenario entity', () => {
    seedEntityDemoData(ENTITY, 'trading');
    const bills = JSON.parse(localStorage.getItem(`erp_bill_passing_${ENTITY}`) || '[]');
    const pos   = JSON.parse(localStorage.getItem(`erp_purchase_orders_${ENTITY}`) || '[]');
    const grns  = JSON.parse(localStorage.getItem(`erp_grns_${ENTITY}`) || '[]');
    expect(bills.length + pos.length + grns.length).toBeGreaterThanOrEqual(1);
  });

  it('B4-F1 — orchestrator write key === SRM register read key (round-trip)', () => {
    const writeKey = `erp_supply_request_memos_${ENTITY}`;
    expect(supplyRequestMemosKey(ENTITY)).toBe(writeKey);
    seedEntityDemoData(ENTITY, 'trading');
    const srms = JSON.parse(localStorage.getItem(supplyRequestMemosKey(ENTITY)) || '[]');
    expect(srms.length).toBeGreaterThanOrEqual(1);
  });
});
