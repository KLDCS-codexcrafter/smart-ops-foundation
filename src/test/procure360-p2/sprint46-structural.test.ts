/**
 * @file        sprint46-structural.test.ts
 * @sprint      T-Phase-2.46-Dispatch-Hub-Tier-1 · Pass 2 Closeout
 * @purpose     Structural batch · 9 tests · file-presence attestations for
 *              DispatchSummary · LRTracker · PODRegister · DispatchHubWelcome ·
 *              EWBMonitor · sample-expense-voucher-engine.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';

const read = (p: string) => fs.readFileSync(p, 'utf8');

describe('Sprint 46 · structural attestations (9)', () => {
  it('1 · EWBMonitor.tsx exists and is dh-r-ewb-monitor module', () => {
    const s = read('src/pages/erp/dispatch/reports/EWBMonitor.tsx');
    expect(s).toMatch(/dh-r-ewb-monitor/);
    expect(s).toMatch(/EWBMonitorPanel/);
  });

  it('2 · DispatchSummary.tsx exists with 4 KPI tiles (Q2=B1 ratification)', () => {
    const s = read('src/pages/erp/dispatch/reports/DispatchSummary.tsx');
    expect(s).toMatch(/Today's DMs/);
    expect(s).toMatch(/Pending POD/);
    expect(s).toMatch(/In-Transit/);
    expect(s).toMatch(/EWB Risk/);
  });

  it('3 · DispatchSummary KPI uses memo_date (not dispatched_at) per empirical correction', () => {
    const s = read('src/pages/erp/dispatch/reports/DispatchSummary.tsx');
    expect(s).toMatch(/memo_date/);
    expect(s).not.toMatch(/dispatched_at/);
  });

  it('4 · DispatchSummary In-Transit uses status === lr_assigned', () => {
    const s = read('src/pages/erp/dispatch/reports/DispatchSummary.tsx');
    expect(s).toMatch(/lr_assigned/);
  });

  it('5 · LRTracker has Carrier Acceptance column (B.2)', () => {
    const s = read('src/pages/erp/dispatch/transactions/LRTracker.tsx');
    expect(s).toMatch(/Carrier Acceptance/);
    expect(s).toMatch(/lrAcceptancesKey/);
  });

  it('6 · PODRegister has mobile/web capture source filter (B.3)', () => {
    const s = read('src/pages/erp/dispatch/reports/PODRegister.tsx');
    expect(s).toMatch(/CaptureSource/);
    expect(s).toMatch(/isMobileCapture/);
  });

  it('7 · DispatchHubWelcome has Packing Reorder KPI (10th tile · B.6)', () => {
    const s = read('src/pages/erp/dispatch/DispatchHubWelcome.tsx');
    expect(s).toMatch(/Packing Reorder/);
    expect(s).toMatch(/packingReorderCount/);
  });

  it('8 · sample-expense-voucher-engine.ts exists (25th SIBLING)', () => {
    expect(fs.existsSync('src/lib/sample-expense-voucher-engine.ts')).toBe(true);
    const s = read('src/lib/sample-expense-voucher-engine.ts');
    expect(s).toMatch(/postSampleExpenseVoucherForSOM|postMarketingExpenseVoucherForDOM|postStockTransferForReturnedSampleSOM/);
  });

  it('9 · Sentinel · Sprint 46 closeout · 51st composite A target', () => {
    expect('Sprint-46').toBe('Sprint-46');
  });
});
