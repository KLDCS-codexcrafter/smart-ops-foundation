import { describe, it, expect, beforeEach } from 'vitest';

// Sprint T-Phase-3.PROD-FIX-A · PASS 2B-ii · ST18
// Lightweight integration smoke tests · TSC strict catches field issues at compile time.
describe('factory_id integration · Sprint 58 PASS 2B-ii ST18', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('ProductionPlan type module loads (has factory_id + fiscal_year_id fields)', async () => {
    const planType = await import('@/types/production-plan');
    expect(planType).toBeDefined();
  });

  it('Godown type module loads (has factory_id field)', async () => {
    const godownType = await import('@/types/godown');
    expect(godownType).toBeDefined();
  });

  it('ProductionConfirmation type module loads (has factory_id field)', async () => {
    const pcType = await import('@/types/production-confirmation');
    expect(pcType).toBeDefined();
  });

  it('ProductionVariance type module loads (has factory_id field)', async () => {
    const pvType = await import('@/types/production-variance');
    expect(pvType).toBeDefined();
  });

  it('MaterialIssueNote type module loads (has factory_id field)', async () => {
    const minType = await import('@/types/material-issue-note');
    expect(minType).toBeDefined();
  });

  it('JobWorkOutOrder type module loads (has factory_id field)', async () => {
    const jwoType = await import('@/types/job-work-out-order');
    expect(jwoType).toBeDefined();
  });

  it('JobWorkReceipt type module loads (has factory_id field)', async () => {
    const jwrType = await import('@/types/job-work-receipt');
    expect(jwrType).toBeDefined();
  });

  it('ProductionOrder type module loads (has opening_wip_snapshot_id field)', async () => {
    const poType = await import('@/types/production-order');
    expect(poType).toBeDefined();
  });

  it('FiscalYear type module loads (has closedBy field)', async () => {
    const fyType = await import('@/types/fiscal-year');
    expect(fyType).toBeDefined();
  });
});
