/**
 * W1C-7b · Vendor-Portal — vendorActivityKey populates with activity rows
 * mirroring vendor-side flows the portal + mobile vendor app render.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { seedFinanceProcurementTxnsForDemo } from '@/data/demo-transactions-finance-procurement';
import { vendorActivityKey } from '@/types/vendor-portal';

const ENTITY = 'SMRT';

describe('W1C-7b · Vendor-Portal demo seed', () => {
  beforeEach(() => { localStorage.clear(); });

  it('writes vendor activity rows under vendorActivityKey', () => {
    seedFinanceProcurementTxnsForDemo(ENTITY);
    const rows = JSON.parse(localStorage.getItem(vendorActivityKey(ENTITY))!);
    expect(rows.length).toBeGreaterThanOrEqual(3);
    expect(rows.some((r: { kind: string }) => r.kind === 'quotation_submit')).toBe(true);
    expect(rows.every((r: { vendor_id: string }) => r.vendor_id.startsWith('demo-w1c7b-'))).toBe(true);
  });
});
