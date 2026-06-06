/**
 * @file        src/lib/cycle-count-voucher-engine.ts
 * @purpose     D-NEW-FQ · Cycle Count Adjustment Voucher engine · 10th D-NEW-FG voucher-runtime SIBLING consumer ⭐
 * @sprint      T-Phase-2.A-DepartmentStore-Phase2-Expansion · Block D
 * @decisions   Q-LOCK-6(a) SIBLING engine · 10th D-NEW-FG consumer (institutional milestone)
 *              · voucher-runtime-engine STAYS 0-DIFF · we CONSUME via VoucherRuntimeRequest contract
 *              · CycleCount + cycle-count types STAY 0-DIFF · read-only consumers
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped · returns NEW objects via spread · zero mutation
 * @[JWT]       writes via cycleAdjustmentVoucherKey · localStorage erp_${entity}_cycle_adjustment_vouchers
 */
import type {
  CycleAdjustmentVoucher,
  CycleAdjustmentVoucherLine,
  AdjustmentDirection,
} from '@/types/cycle-count-voucher';
import { cycleAdjustmentVoucherKey } from '@/types/cycle-count-voucher';
import type { CycleCount } from '@/types/cycle-count';
import { logAudit } from '@/lib/audit-trail-engine'; // P8.4 · Block 1a-ii
import type { AuditEntityType } from '@/types/audit-trail';

export function generateCycleAdjustmentVoucher(
  cycleCount: CycleCount,
  entityId: string,
  createdBy: string,
): CycleAdjustmentVoucher {
  if (cycleCount.status !== 'posted') {
    throw new Error(
      `Cycle count ${cycleCount.count_no} must be 'posted' before voucher generation · current: ${cycleCount.status}`,
    );
  }

  const now = new Date().toISOString();

  const voucherLines: CycleAdjustmentVoucherLine[] = (cycleCount.lines ?? [])
    .filter((l) => (l.variance_qty ?? 0) !== 0)
    .map((line) => {
      const direction: AdjustmentDirection = (line.variance_qty ?? 0) > 0 ? 'gain' : 'loss';
      return {
        item_id: line.item_id,
        item_code: line.item_code,
        item_name: line.item_name,
        godown_id: cycleCount.godown_id ?? '',
        godown_name: cycleCount.godown_name ?? '',
        bin_code: line.bin_code ?? null,
        book_qty: line.system_qty ?? 0,
        physical_qty: line.physical_qty ?? 0,
        variance_qty: line.variance_qty ?? 0,
        variance_value_inr: Math.abs(line.variance_value ?? 0),
        direction,
        ledger_account: direction === 'gain' ? 'ADJUSTMENT_GAIN' : 'ADJUSTMENT_LOSS',
      };
    });

  const totalGain = voucherLines
    .filter((l) => l.direction === 'gain')
    .reduce((sum, l) => sum + l.variance_value_inr, 0);
  const totalLoss = voucherLines
    .filter((l) => l.direction === 'loss')
    .reduce((sum, l) => sum + l.variance_value_inr, 0);
  const netValue = totalGain - totalLoss;

  const voucherId = `cav-${cycleCount.id}`;
  const voucherNo = `CAV-${cycleCount.count_no.replace(/^CC-/, '')}`;

  return {
    id: voucherId,
    voucher_no: voucherNo,
    entity_id: entityId,
    related_cycle_count_id: cycleCount.id,
    related_cycle_count_no: cycleCount.count_no,
    voucher_date: cycleCount.posted_at?.slice(0, 10) ?? now.slice(0, 10),
    total_lines: voucherLines.length,
    total_gain_value_inr: totalGain,
    total_loss_value_inr: totalLoss,
    net_value_inr: netValue,
    voucher_routing_target: 'voucher_runtime_engine',
    lines: voucherLines,
    status: 'draft',
    posted_at: null,
    cancelled_at: null,
    cancellation_reason: null,
    notes: `Auto-generated from Cycle Count ${cycleCount.count_no}`,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  };
}

export function loadCycleAdjustmentVouchers(entityCode: string): CycleAdjustmentVoucher[] {
  try {
    // [JWT] GET /api/inventory/cycle-adjustment-vouchers?entityCode=...
    const raw = localStorage.getItem(cycleAdjustmentVoucherKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as CycleAdjustmentVoucher[]) : [];
  } catch {
    return [];
  }
}

export function saveCycleAdjustmentVouchers(
  entityCode: string,
  vouchers: CycleAdjustmentVoucher[],
): void {
  // [JWT] PUT /api/inventory/cycle-adjustment-vouchers?entityCode=...
  localStorage.setItem(cycleAdjustmentVoucherKey(entityCode), JSON.stringify(vouchers));
}

export function getCycleAdjustmentVoucher(
  entityCode: string,
  voucherId: string,
): CycleAdjustmentVoucher | null {
  return loadCycleAdjustmentVouchers(entityCode).find((v) => v.id === voucherId) ?? null;
}

export function postCycleAdjustmentVoucher(
  entityCode: string,
  voucherId: string,
): CycleAdjustmentVoucher {
  const current = getCycleAdjustmentVoucher(entityCode, voucherId);
  if (!current) throw new Error(`Voucher ${voucherId} not found`);
  if (current.status !== 'draft') {
    throw new Error(`Voucher ${voucherId} cannot be posted from status: ${current.status}`);
  }
  const updated: CycleAdjustmentVoucher = {
    ...current,
    status: 'posted',
    posted_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const all = loadCycleAdjustmentVouchers(entityCode);
  saveCycleAdjustmentVouchers(entityCode, all.map((v) => (v.id === voucherId ? updated : v)));
  return updated;
}

export function cancelCycleAdjustmentVoucher(
  entityCode: string,
  voucherId: string,
  reason: string,
): CycleAdjustmentVoucher {
  const current = getCycleAdjustmentVoucher(entityCode, voucherId);
  if (!current) throw new Error(`Voucher ${voucherId} not found`);
  if (current.status === 'cancelled') return current;
  const updated: CycleAdjustmentVoucher = {
    ...current,
    status: 'cancelled',
    cancelled_at: new Date().toISOString(),
    cancellation_reason: reason,
    updated_at: new Date().toISOString(),
  };
  const all = loadCycleAdjustmentVouchers(entityCode);
  saveCycleAdjustmentVouchers(entityCode, all.map((v) => (v.id === voucherId ? updated : v)));
  return updated;
}

export function summarizeCycleAdjustmentVouchers(
  vouchers: readonly CycleAdjustmentVoucher[],
): {
  total: number;
  draft: number;
  posted: number;
  cancelled: number;
  total_net_value_inr: number;
} {
  let draft = 0;
  let posted = 0;
  let cancelled = 0;
  let netValue = 0;
  for (const v of vouchers) {
    if (v.status === 'draft') draft += 1;
    if (v.status === 'posted') {
      posted += 1;
      netValue += v.net_value_inr;
    }
    if (v.status === 'cancelled') cancelled += 1;
  }
  return {
    total: vouchers.length,
    draft,
    posted,
    cancelled,
    total_net_value_inr: netValue,
  };
}

export function createDraftCycleAdjustmentVoucher(
  entityCode: string,
  cycleCount: CycleCount,
  createdBy: string,
): CycleAdjustmentVoucher {
  const voucher = generateCycleAdjustmentVoucher(cycleCount, entityCode, createdBy);
  const all = loadCycleAdjustmentVouchers(entityCode);
  const existing = all.find((v) => v.id === voucher.id);
  if (existing) return existing;
  saveCycleAdjustmentVouchers(entityCode, [...all, voucher]);
  logAudit({
    entityCode,
    action: 'create',
    entityType: 'storehub_event' as unknown as AuditEntityType,
    recordId: voucher.id,
    recordLabel: `Cycle Adjustment Voucher ${voucher.voucher_no}`,
    beforeState: null,
    afterState: { voucher_no: voucher.voucher_no, cycle_count_no: voucher.related_cycle_count_no, net_value_inr: voucher.net_value_inr, status: voucher.status },
    sourceModule: 'store-hub',
    reason: 'cycle_adjustment_voucher_created',
  });
  return voucher;
}

// ============================================================================
// Sprint HK-6.T1 · §20 closure · Excel round-trip exports
// xlsx 0.18.5 already in package.json · Q-LOCK-T1-4 ratified
// ============================================================================
import * as XLSX from 'xlsx';

export interface CycleCountExcelRow {
  'Item Code': string;
  'Description': string;
  'UOM': string;
  'Godown': string;
  'Bin'?: string;
  'System Qty': number;
  'Physical Qty': number;
  'Variance Qty': number;
  'Variance Value (₹)'?: number;
  'Variance Reason'?: string;
  'Notes'?: string;
}

export interface ExcelImportValidationError {
  row: number;
  field: string;
  error: string;
}

export interface ExcelImportResult {
  applied_count: number;
  skipped_count: number;
  validation_errors: ExcelImportValidationError[];
  updated_lines: CycleCount['lines'];
  voucher_updated_at: string;
}

/** Build Excel Blob (and suggested filename) from a CycleCount voucher. */
export function exportCycleCountToExcel(
  count: CycleCount,
): { blob: Blob; filename: string } {
  const rows: CycleCountExcelRow[] = count.lines.map(l => ({
    'Item Code': l.item_code,
    'Description': l.item_name,
    'UOM': l.uom,
    'Godown': l.godown_name,
    'Bin': l.bin_code ?? '',
    'System Qty': l.system_qty,
    'Physical Qty': l.physical_qty,
    'Variance Qty': l.variance_qty,
    'Variance Value (₹)': l.variance_value,
    'Variance Reason': l.variance_reason ?? '',
    'Notes': l.variance_notes ?? '',
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Cycle Count');
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([wbout], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  return { blob, filename: `${count.count_no}_${count.count_date}.xlsx` };
}

/** Parse uploaded Excel back to rows · does NOT mutate voucher. */
export async function parseExcelToCycleCount(blob: Blob): Promise<CycleCountExcelRow[]> {
  const arrayBuffer = await blob.arrayBuffer();
  const wb = XLSX.read(arrayBuffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) throw new Error('Excel file has no sheets');
  const ws = wb.Sheets[sheetName];
  return XLSX.utils.sheet_to_json<CycleCountExcelRow>(ws);
}

/** Validate imported rows against current voucher draft. Empty array = all valid. */
export function validateImportedCycleCount(
  count: CycleCount,
  rows: CycleCountExcelRow[],
): ExcelImportValidationError[] {
  const errors: ExcelImportValidationError[] = [];
  const lineByItemCode = new Map(count.lines.map(l => [l.item_code, l]));

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // header + 1-indexed
    const code = row['Item Code'];
    if (!code) {
      errors.push({ row: rowNum, field: 'Item Code', error: 'Missing item code' });
      return;
    }
    const line = lineByItemCode.get(code);
    if (!line) {
      errors.push({
        row: rowNum, field: 'Item Code',
        error: `Item code "${code}" not in voucher draft`,
      });
      return;
    }
    const physicalQty = Number(row['Physical Qty']);
    if (!Number.isFinite(physicalQty)) {
      errors.push({ row: rowNum, field: 'Physical Qty', error: 'Must be a number' });
    } else if (physicalQty < 0) {
      errors.push({ row: rowNum, field: 'Physical Qty', error: 'Cannot be negative' });
    }
    const expectedVariance = line.system_qty - physicalQty;
    const importedVariance = Number(row['Variance Qty']);
    if (
      Number.isFinite(importedVariance) &&
      Math.abs(importedVariance - expectedVariance) > 0.001
    ) {
      errors.push({
        row: rowNum, field: 'Variance Qty',
        error: `Mismatch: expected ${expectedVariance}, got ${importedVariance}`,
      });
    }
  });
  return errors;
}

/** Apply validated rows to voucher lines (immutable · returns new lines + meta). */
export function applyExcelImportToVoucher(
  count: CycleCount,
  rows: CycleCountExcelRow[],
): ExcelImportResult {
  const validation_errors = validateImportedCycleCount(count, rows);
  const errorRowNums = new Set(validation_errors.map(e => e.row));
  let applied_count = 0;
  let skipped_count = 0;

  const updated_lines = count.lines.map(line => {
    const matchIdx = rows.findIndex(r => r['Item Code'] === line.item_code);
    if (matchIdx === -1) return line;
    const rowNum = matchIdx + 2;
    if (errorRowNums.has(rowNum)) {
      skipped_count += 1;
      return line;
    }
    const row = rows[matchIdx];
    const physical = Number(row['Physical Qty']);
    const varianceQty = line.system_qty - physical;
    applied_count += 1;
    return {
      ...line,
      physical_qty: physical,
      variance_qty: varianceQty,
      variance_value: varianceQty * line.weighted_avg_rate,
      variance_notes: (row['Notes'] && String(row['Notes'])) || line.variance_notes,
    };
  });

  return {
    applied_count,
    skipped_count,
    validation_errors,
    updated_lines,
    voucher_updated_at: new Date().toISOString(),
  };
}
