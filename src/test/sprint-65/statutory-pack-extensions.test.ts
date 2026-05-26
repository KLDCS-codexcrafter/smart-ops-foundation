/**
 * @file Sprint 65 FAR-1 · Statutory pack extension smoke · msme-43bh + gst additive surfaces
 * @sprint T-Phase-4.FAR-1.TFix
 */
import { describe, it, expect } from 'vitest';
import {
  computeMSMECapitalBreaches,
  getMSMECapitalDeadlineForAsset,
} from '@/lib/msme-43bh-engine';
import { computeITCReversalOnCapitalSale } from '@/lib/gst-engine';
import type { AssetUnitRecord } from '@/types/fixed-asset';

const E = 'AMITH';

function makeAsset(overrides: Partial<AssetUnitRecord> = {}): AssetUnitRecord {
  return {
    entity_id: E,
    asset_id: 'test-asset',
    purchase_date: '2025-04-01',
    put_to_use_date: '2025-04-01',
    gross_block_cost: 1000000,
    status: 'active',
    capital_purchase_voucher_id: 'vch-test',
    ...overrides,
  } as AssetUnitRecord;
}

describe('MSME 43B(h) FA capital extension · Q-LOCK-4 A', () => {
  it('computeMSMECapitalBreaches returns array', () => {
    const breaches = computeMSMECapitalBreaches(E, '2025-04-01', '2026-03-31');
    expect(Array.isArray(breaches)).toBe(true);
  });

  it('getMSMECapitalDeadlineForAsset returns Date 45 days after purchase', () => {
    const asset = makeAsset({ purchase_date: '2025-04-01' });
    const deadline = getMSMECapitalDeadlineForAsset(asset);
    expect(deadline).toBeInstanceOf(Date);
    const days = (deadline.getTime() - new Date('2025-04-01').getTime()) / (1000 * 60 * 60 * 24);
    expect(days).toBeCloseTo(45, 0);
  });
});

describe('GST ITC reversal Section 18(6) extension · Q-LOCK-5 A', () => {
  it('computeITCReversalOnCapitalSale returns reversalAmount + remainingMonths + itcAtPurchase', () => {
    const asset = makeAsset();
    const result = computeITCReversalOnCapitalSale(asset, 800000, '2027-04-01');
    expect(typeof result.reversalAmount).toBe('number');
    expect(typeof result.remainingMonths).toBe('number');
    expect(typeof result.itcAtPurchase).toBe('number');
  });

  it('ITC reversal scales with remaining months in 5-year window', () => {
    const asset = makeAsset();
    const earlySale = computeITCReversalOnCapitalSale(asset, 900000, '2025-10-01');
    const lateSale = computeITCReversalOnCapitalSale(asset, 500000, '2029-10-01');
    expect(earlySale.remainingMonths).toBeGreaterThan(lateSale.remainingMonths);
  });

  it('disposal beyond 5-year window yields zero remainingMonths', () => {
    const asset = makeAsset({
      purchase_date: '2020-04-01',
      put_to_use_date: '2020-04-01',
    });
    const result = computeITCReversalOnCapitalSale(asset, 500000, '2026-04-01');
    expect(result.remainingMonths).toBeLessThanOrEqual(0);
  });
});
