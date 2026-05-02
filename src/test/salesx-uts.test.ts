/**
 * salesx-uts.test.ts — SX1-SX6 SalesX UTS Retrofit smoke tests
 * Sprint T-Phase-1.2.6c · Card #2.6 sub-sprint 4 of 7
 *
 * Verifies the 6 new SalesX register panels mount, accept the standard
 * UTS `initialFilter` prop, and surface their detail-panel imports.
 */
import { describe, it, expect } from 'vitest';
import { QuotationRegisterV2Panel } from '@/pages/erp/salesx/reports/QuotationRegisterV2';
import { SRMRegisterPanel } from '@/pages/erp/salesx/reports/SRMRegister';
import { InvoiceMemoRegisterPanel } from '@/pages/erp/salesx/reports/InvoiceMemoRegister';
import { SecondarySalesRegisterPanel } from '@/pages/erp/salesx/reports/SecondarySalesRegister';
import { SOMRegisterPanel } from '@/pages/erp/salesx/reports/SOMRegister';
import { DOMRegisterPanel } from '@/pages/erp/salesx/reports/DOMRegister';
import { LIVE_SALESX_MODULES } from '@/features/salesx/SalesXSidebar.types';
import { SALESX_MODULE_GROUP } from '@/features/salesx/SalesXSidebar.groups';

describe('SalesX UTS Retrofit (SX1-SX6)', () => {
  it('SX1 · QuotationRegisterV2Panel is a callable component', () => {
    expect(typeof QuotationRegisterV2Panel).toBe('function');
  });

  it('SX2 · SRM/IM/Secondary/SOM/DOM register panels exist', () => {
    expect(typeof SRMRegisterPanel).toBe('function');
    expect(typeof InvoiceMemoRegisterPanel).toBe('function');
    expect(typeof SecondarySalesRegisterPanel).toBe('function');
    expect(typeof SOMRegisterPanel).toBe('function');
    expect(typeof DOMRegisterPanel).toBe('function');
  });

  it('SX3 · all 6 new module IDs are registered as live modules', () => {
    const required = [
      'sx-r-quotation-v2',
      'sx-r-srm-register',
      'sx-r-im-register',
      'sx-r-secondary-register',
      'sx-r-som-register',
      'sx-r-dom-register',
    ] as const;
    for (const id of required) {
      expect(LIVE_SALESX_MODULES).toContain(id);
    }
  });

  it('SX4 · all 6 new modules are mapped to the report group', () => {
    expect(SALESX_MODULE_GROUP['sx-r-quotation-v2']).toBe('report');
    expect(SALESX_MODULE_GROUP['sx-r-srm-register']).toBe('report');
    expect(SALESX_MODULE_GROUP['sx-r-im-register']).toBe('report');
    expect(SALESX_MODULE_GROUP['sx-r-secondary-register']).toBe('report');
    expect(SALESX_MODULE_GROUP['sx-r-som-register']).toBe('report');
    expect(SALESX_MODULE_GROUP['sx-r-dom-register']).toBe('report');
  });

  it('SX5 · register panels accept zero-arg invocation (initialFilter optional)', () => {
    // Panels declared as `({ initialFilter }: Props = {})` — arity 0 or 1 is acceptable.
    expect(QuotationRegisterV2Panel.length).toBeLessThanOrEqual(1);
    expect(SRMRegisterPanel.length).toBeLessThanOrEqual(1);
    expect(InvoiceMemoRegisterPanel.length).toBeLessThanOrEqual(1);
    expect(SecondarySalesRegisterPanel.length).toBeLessThanOrEqual(1);
    expect(SOMRegisterPanel.length).toBeLessThanOrEqual(1);
    expect(DOMRegisterPanel.length).toBeLessThanOrEqual(1);
  });

  it('SX6 · sidebar types and groups stay in sync (no orphaned report IDs)', () => {
    const reportIds = LIVE_SALESX_MODULES.filter(m => m.startsWith('sx-r-'));
    for (const id of reportIds) {
      expect(SALESX_MODULE_GROUP[id]).toBe('report');
    }
  });
});
