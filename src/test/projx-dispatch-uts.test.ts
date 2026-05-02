/**
 * projx-dispatch-uts.test.ts — PD1-PD6 ProjX + Dispatch UTS Retrofit smoke tests.
 * Sprint T-Phase-1.2.6d · Card #2.6 sub-sprint 5 of 7.
 */
import { describe, it, expect } from 'vitest';
import { ProjectRegisterPanel } from '@/pages/erp/projx/reports/ProjectRegister';
import { MilestoneRegisterPanel } from '@/pages/erp/projx/reports/MilestoneRegister';
import { TimeEntryRegisterPanel } from '@/pages/erp/projx/reports/TimeEntryRegister';
import { ProjectDetailPanel } from '@/pages/erp/projx/reports/detail/ProjectDetailPanel';
import { MilestoneDetailPanel } from '@/pages/erp/projx/reports/detail/MilestoneDetailPanel';
import { TimeEntryDetailPanel } from '@/pages/erp/projx/reports/detail/TimeEntryDetailPanel';
import { ProjectStatusPrint } from '@/pages/erp/projx/reports/print/ProjectStatusPrint';
import { MilestonePrint } from '@/pages/erp/projx/reports/print/MilestonePrint';
import { TimeEntryPrint } from '@/pages/erp/projx/reports/print/TimeEntryPrint';
import { DeliveryMemoRegisterPanel } from '@/pages/erp/dispatch/reports/DeliveryMemoRegister';
import { DeliveryMemoDetailPanel } from '@/pages/erp/dispatch/reports/detail/DeliveryMemoDetailPanel';
import { DeliveryMemoPrint } from '@/pages/erp/dispatch/reports/print/DeliveryMemoPrint';
import { PackingSlipPrintPanel } from '@/pages/erp/dispatch/transactions/PackingSlipPrint';
import { PROJX_MODULE_GROUP } from '@/pages/erp/projx/ProjXSidebar.groups';

describe('ProjX + Dispatch UTS Retrofit (PD1-PD6)', () => {
  it('PD1 · ProjX 3 register modules export', () => {
    expect(typeof ProjectRegisterPanel).toBe('function');
    expect(typeof MilestoneRegisterPanel).toBe('function');
    expect(typeof TimeEntryRegisterPanel).toBe('function');
  });

  it('PD2 · ProjX 3 detail panels export', () => {
    expect(typeof ProjectDetailPanel).toBe('function');
    expect(typeof MilestoneDetailPanel).toBe('function');
    expect(typeof TimeEntryDetailPanel).toBe('function');
  });

  it('PD3 · ProjX 3 print components export', () => {
    expect(typeof ProjectStatusPrint).toBe('function');
    expect(typeof MilestonePrint).toBe('function');
    expect(typeof TimeEntryPrint).toBe('function');
  });

  it('PD4 · Dispatch DM register + detail + print export', () => {
    expect(typeof DeliveryMemoRegisterPanel).toBe('function');
    expect(typeof DeliveryMemoDetailPanel).toBe('function');
    expect(typeof DeliveryMemoPrint).toBe('function');
  });

  it('PD5 · ProjX module union includes 3 new register IDs (mapped to reports)', () => {
    expect(PROJX_MODULE_GROUP['r-project-register']).toBe('reports');
    expect(PROJX_MODULE_GROUP['r-milestone-register']).toBe('reports');
    expect(PROJX_MODULE_GROUP['r-time-entry-register']).toBe('reports');
  });

  it('PD6 · Q2-a sibling discipline · PackingSlipPrint untouched + DeliveryMemoPrint distinct module', () => {
    expect(typeof PackingSlipPrintPanel).toBe('function');
    expect(typeof DeliveryMemoPrint).toBe('function');
    expect(PackingSlipPrintPanel).not.toBe(DeliveryMemoPrint);
  });
});
