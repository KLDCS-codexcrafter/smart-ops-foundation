/**
 * W1C-7b · PayOut card — register key populates AND round-trips
 * through the canonical vendorPaymentBatchKey + vendorAdvancesKey shapes.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFinanceProcurementTxnsForDemo } from '@/data/demo-transactions-finance-procurement';
import { vendorPaymentBatchKey } from '@/types/vendor-payment-batch';
import { vendorAdvancesKey } from '@/types/vendor-advance';

const ENTITY = 'SMRT';

describe('W1C-7b · PayOut demo seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('writes payment batches under vendorPaymentBatchKey', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const raw = localStorage.getItem(vendorPaymentBatchKey(ENTITY));
    expect(raw).not.toBeNull();
    const batches = JSON.parse(raw!);
    expect(batches.length).toBeGreaterThanOrEqual(2);
    expect(batches.find((b: { status: string }) => b.status === 'released')).toBeTruthy();
  });

  it('writes vendor advances under vendorAdvancesKey', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const adv = JSON.parse(localStorage.getItem(vendorAdvancesKey(ENTITY))!);
    expect(adv.length).toBeGreaterThanOrEqual(1);
    expect(adv[0].vendor_id).toMatch(/^demo-w1c7b-/);
  });

  it('payment batch line references a seeded bill id (referential consistency)', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const batches = JSON.parse(localStorage.getItem(vendorPaymentBatchKey(ENTITY))!);
    const released = batches.find((b: { status: string }) => b.status === 'released')!;
    expect(released.lines[0].payment_requisition_id).toBe('demo-w1c7b-bp-1');
  });
});
