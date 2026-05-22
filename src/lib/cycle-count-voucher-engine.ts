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
        book_qty: line.book_qty ?? 0,
        physical_qty: line.physical_qty ?? 0,
        variance_qty: line.variance_qty ?? 0,
        variance_value_inr: Math.abs(line.variance_value_inr ?? 0),
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
  return voucher;
}
