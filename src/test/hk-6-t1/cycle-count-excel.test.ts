/** HK-6.T1 · §20 closure · Cycle Count Excel round-trip */
import { describe, it, expect } from 'vitest';
import {
  exportCycleCountToExcel,
  parseExcelToCycleCount,
  validateImportedCycleCount,
  applyExcelImportToVoucher,
  type CycleCountExcelRow,
} from '@/lib/cycle-count-voucher-engine';
import type { CycleCount } from '@/types/cycle-count';

function makeCount(): CycleCount {
  return {
    id: 'cc-test-1',
    entity_id: 'SINHA',
    count_no: 'CC-2026-0001',
    count_kind: 'random',
    count_date: '2026-03-15',
    godown_id: 'gd-main',
    godown_name: 'Main Godown',
    bin_filter: null,
    abc_class_filter: null,
    counter_id: null, counter_name: null,
    reviewer_id: null, reviewer_name: null,
    approver_id: null, approver_name: null,
    status: 'draft',
    submitted_at: null, approved_at: null, rejected_at: null,
    rejection_reason: null, posted_at: null,
    cancelled_at: null, cancellation_reason: null,
    lines: [
      {
        id: 'l-1', item_id: 'i-1', item_code: 'IT-001', item_name: 'Steel Rod 10mm',
        uom: 'KG', godown_id: 'gd-main', godown_name: 'Main Godown',
        bin_id: null, bin_code: null,
        system_qty: 100, physical_qty: 0, variance_qty: 0,
        weighted_avg_rate: 65, variance_value: 0,
        variance_reason: null, variance_notes: null,
        recount_qty: null, recount_at: null, recount_by_id: null, recount_by_name: null,
      },
      {
        id: 'l-2', item_id: 'i-2', item_code: 'IT-002', item_name: 'Steel Plate 5mm',
        uom: 'KG', godown_id: 'gd-main', godown_name: 'Main Godown',
        bin_id: null, bin_code: null,
        system_qty: 50, physical_qty: 0, variance_qty: 0,
        weighted_avg_rate: 80, variance_value: 0,
        variance_reason: null, variance_notes: null,
        recount_qty: null, recount_at: null, recount_by_id: null, recount_by_name: null,
      },
    ],
    total_lines: 2, variance_lines: 0,
    total_variance_qty_abs: 0, total_variance_value: 0, net_shrinkage_pct: 0,
    notes: null,
    created_at: '2026-03-15T00:00:00Z', updated_at: '2026-03-15T00:00:00Z',
  };
}

describe('Cycle Count Excel round-trip (HK-6.T1 · §20)', () => {
  it('exportCycleCountToExcel returns Blob with filename ending .xlsx', () => {
    const { blob, filename } = exportCycleCountToExcel(makeCount());
    expect(blob).toBeInstanceOf(Blob);
    expect(filename).toMatch(/\.xlsx$/);
  });

  it('parseExcelToCycleCount round-trips exported data', async () => {
    const count = makeCount();
    const { blob } = exportCycleCountToExcel(count);
    // jsdom Blob lacks arrayBuffer(); shim from internal buffer
    const buf = await new Response(blob).arrayBuffer();
    const shim = { arrayBuffer: async () => buf } as unknown as Blob;
    const rows = await parseExcelToCycleCount(shim);
    expect(rows.length).toBe(count.lines.length);
    expect(rows[0]['Item Code']).toBe(count.lines[0].item_code);
  });

  it('validateImportedCycleCount flags unknown item codes', () => {
    const rows: CycleCountExcelRow[] = [
      { 'Item Code': 'BAD-CODE', 'Description': '', 'UOM': 'KG',
        'Godown': 'Main Godown', 'System Qty': 0, 'Physical Qty': 5,
        'Variance Qty': -5 },
    ];
    const errors = validateImportedCycleCount(makeCount(), rows);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0].error).toContain('not in voucher draft');
  });

  it('applyExcelImportToVoucher applies valid rows · skips invalid', () => {
    const count = makeCount();
    const rows: CycleCountExcelRow[] = [
      { 'Item Code': 'IT-001', 'Description': 'Steel Rod 10mm', 'UOM': 'KG',
        'Godown': 'Main Godown', 'System Qty': 100, 'Physical Qty': 95,
        'Variance Qty': 5, 'Notes': 'Found 5 short' },
      { 'Item Code': 'BAD', 'Description': '', 'UOM': 'KG',
        'Godown': 'Main Godown', 'System Qty': 0, 'Physical Qty': 1,
        'Variance Qty': -1 },
    ];
    const result = applyExcelImportToVoucher(count, rows);
    expect(result.applied_count).toBe(1);
    expect(result.skipped_count).toBe(0);
    expect(result.validation_errors.length).toBe(1);
    const updated = result.updated_lines.find(l => l.item_code === 'IT-001');
    expect(updated?.physical_qty).toBe(95);
    expect(updated?.variance_qty).toBe(5);
    expect(updated?.variance_value).toBe(5 * 65);
  });
});
