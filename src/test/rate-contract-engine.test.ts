/**
 * rate-contract-engine.test.ts — Sprint T-Phase-1.2.6f-c-3 · Blocks E-G coverage
 * Validates create · status transition · active-window lookup (D-293).
 */
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createRateContract, listRateContracts, listActiveRateContracts,
  transitionRateContractStatus, findActiveRate, getRateContract,
} from '@/lib/rate-contract-engine';
import { rateContractKey } from '@/types/rate-contract';

const E = 'TST';

const today = (): string => new Date().toISOString().slice(0, 10);
const offsetDays = (days: number): string =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

beforeEach(() => {
  localStorage.removeItem(rateContractKey(E));
});

function seed(opts?: { vendorId?: string; itemId?: string; from?: string; to?: string }) {
  return createRateContract({
    entity_id: 'ent-1',
    entity_code: E,
    vendor_id: opts?.vendorId ?? 'V-1',
    vendor_name: 'Acme Steels',
    valid_from: opts?.from ?? today(),
    valid_to: opts?.to ?? offsetDays(30),
    payment_terms: 'NET30',
    delivery_terms: 'FOR-DEST',
    lines: [{
      item_id: opts?.itemId ?? 'I-1', item_name: 'TMT 12mm', hsn_sac: '7214',
      uom: 'KG', agreed_rate: 65, ceiling_rate: 70, min_qty: 100,
      max_qty: 1000, tax_pct: 18, notes: '',
    }],
    notes: '',
    created_by: 'u-1',
  });
}

describe('rate-contract-engine · create', () => {
  it('generates contract_no, computes total_value, defaults to active', () => {
    const rc = seed();
    expect(rc.contract_no).toMatch(/RC/);
    expect(rc.status).toBe('active');
    expect(rc.total_value).toBe(65 * 1000);
    expect(rc.lines[0].id).toMatch(/^rcl-/);
    expect(listRateContracts(E)).toHaveLength(1);
  });
});

describe('rate-contract-engine · status transitions', () => {
  it('moves active → expired and persists', () => {
    const rc = seed();
    const updated = transitionRateContractStatus(rc.id, 'expired', E);
    expect(updated?.status).toBe('expired');
    expect(getRateContract(rc.id, E)?.status).toBe('expired');
  });

  it('returns null for unknown id', () => {
    expect(transitionRateContractStatus('missing', 'cancelled', E)).toBeNull();
  });
});

describe('rate-contract-engine · findActiveRate', () => {
  it('returns matching line for active vendor+item today', () => {
    seed();
    const hit = findActiveRate(E, 'V-1', 'I-1');
    expect(hit?.line.agreed_rate).toBe(65);
    expect(hit?.line.ceiling_rate).toBe(70);
  });

  it('skips contracts outside validity window', () => {
    seed({ from: offsetDays(-60), to: offsetDays(-30) });
    expect(findActiveRate(E, 'V-1', 'I-1')).toBeNull();
  });

  it('skips non-active status contracts', () => {
    const rc = seed();
    transitionRateContractStatus(rc.id, 'cancelled', E);
    expect(findActiveRate(E, 'V-1', 'I-1')).toBeNull();
    expect(listActiveRateContracts(E)).toHaveLength(0);
  });

  it('returns null for unknown vendor or item', () => {
    seed();
    expect(findActiveRate(E, 'V-X', 'I-1')).toBeNull();
    expect(findActiveRate(E, 'V-1', 'I-X')).toBeNull();
  });
});
