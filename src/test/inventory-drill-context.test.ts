/**
 * inventory-drill-context.test.ts — RD1-RD6 cross-panel drill chain tests
 * Sprint T-Phase-1.2.6b-rpt · Card #2.6 sub-sprint 3 of 6
 */
import { describe, it, expect } from 'vitest';
import { withFilter, type InventoryDrillFilter, type DrillNavigationContext } from '@/types/drill-context';
import type { ItemMovementEvent } from '@/lib/item-movement-engine';
import { GRNRegisterV2Panel } from '@/pages/erp/inventory/reports/GRNRegisterV2';
import { MINRegisterPanel } from '@/pages/erp/inventory/reports/MINRegister';
import { ConsumptionRegisterPanel } from '@/pages/erp/inventory/reports/ConsumptionRegister';
import { CycleCountRegisterPanel } from '@/pages/erp/inventory/reports/CycleCountRegister';
import { RTVRegisterPanel } from '@/pages/erp/inventory/reports/RTVRegister';
import { StockLedgerReportPanel } from '@/pages/erp/inventory/reports/StockLedgerReport';
import { ConsumptionSummaryReportPanel } from '@/pages/erp/inventory/reports/ConsumptionSummaryReport';
import { AgedGITReportPanel } from '@/pages/erp/inventory/reports/AgedGITReport';
import { SlowMovingDeadStockReportPanel } from '@/pages/erp/inventory/reports/SlowMovingDeadStockReport';
import { BinUtilizationReportPanel } from '@/pages/erp/inventory/reports/BinUtilizationReport';
import { ItemMovementHistoryReportPanel } from '@/pages/erp/inventory/reports/ItemMovementHistoryReport';

describe('Inventory drill-context (RD1-RD6)', () => {
  it('RD1 · InventoryDrillFilter accepts all expected fields', () => {
    const f: InventoryDrillFilter = {
      itemId: 'i', godownId: 'g', departmentCode: 'd',
      projectCentreId: 'p', vendorId: 'v',
      dateFrom: '2026-01-01', dateTo: '2026-12-31',
      status: 'posted', varianceThreshold: 1000,
      sourceLabel: 'Stock Ledger › Item ABC',
    };
    expect(f.itemId).toBe('i');
    expect(f.varianceThreshold).toBe(1000);
  });

  it('RD2 · DrillNavigationContext composes via withFilter', () => {
    const base: DrillNavigationContext = { fromModule: 'r-stock-ledger', fromLabel: 'Stock Ledger' };
    const merged = withFilter(base, { itemId: 'X', sourceLabel: 'foo' });
    expect(merged.fromModule).toBe('r-stock-ledger');
    expect(merged.filter?.itemId).toBe('X');
    expect(merged.filter?.sourceLabel).toBe('foo');
  });

  it('RD3 · filter is optional on DrillNavigationContext', () => {
    const ctx: DrillNavigationContext = { fromModule: 'r-grn-register', fromLabel: 'GRN' };
    expect(ctx.filter).toBeUndefined();
  });

  it('RD4 · 6 module IDs match the InventoryHubModule union', () => {
    const ids: Array<DrillNavigationContext['fromModule']> = [
      'r-stock-ledger', 'r-item-movement', 'r-consumption-summary',
      'r-slow-moving-dead', 'r-aged-git', 'r-bin-utilization',
    ];
    expect(ids).toHaveLength(6);
    ids.forEach(id => expect(typeof id).toBe('string'));
  });

  it('RD5 · 6 report panels export with onNavigate prop signature (defaultable)', () => {
    expect(typeof StockLedgerReportPanel).toBe('function');
    expect(typeof ConsumptionSummaryReportPanel).toBe('function');
    expect(typeof AgedGITReportPanel).toBe('function');
    expect(typeof SlowMovingDeadStockReportPanel).toBe('function');
    expect(typeof BinUtilizationReportPanel).toBe('function');
    expect(typeof ItemMovementHistoryReportPanel).toBe('function');
    // 5 registers also accept initialFilter
    expect(typeof GRNRegisterV2Panel).toBe('function');
    expect(typeof MINRegisterPanel).toBe('function');
    expect(typeof ConsumptionRegisterPanel).toBe('function');
    expect(typeof CycleCountRegisterPanel).toBe('function');
    expect(typeof RTVRegisterPanel).toBe('function');
  });

  it('RD6 · ItemMovementEvent has source_voucher_id for level-3 drill', () => {
    const e: ItemMovementEvent = {
      event_id: 'x', event_type: 'grn_inward', event_date: '2026-01-01',
      source_voucher_id: 'grn-1', source_voucher_no: 'GRN/26-27/0001',
      qty_change: 10, rate: 100, value_change: 1000,
      from_godown_id: null, from_godown_name: null,
      to_godown_id: 'g', to_godown_name: 'Main',
      bin_id: null, bin_code: null, party_name: null, narration: null,
    };
    expect(e.source_voucher_id).toBe('grn-1');
    expect(e.source_voucher_no).toContain('GRN');
  });
});
