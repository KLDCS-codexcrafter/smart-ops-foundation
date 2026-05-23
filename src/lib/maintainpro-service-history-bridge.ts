/**
 * @file        src/lib/maintainpro-service-history-bridge.ts
 * @purpose     MaintainPro → FA service-history bridge · 29th SIBLING ⭐
 *              Bridges Work Orders, PM Tickets, Calibration entries, AMC actuals from
 *              MaintainPro to AssetUnitRecord.expense_history (FA module · D-127 safe).
 * @sprint      T-Phase-2.HK-6 · Pass 2 · Theme 2 v2 · B-4 · Q-LOCK-17(i)
 * @decisions   D-NEW · Path A 50-year-architect · RAT-2 ratified
 * @disciplines FR-19 SIBLING (single-source: maintenance → asset cost trail)
 *              · FR-26 entity-scoped · FR-73.1 absolute · D-10 soft-link (no breaking type changes)
 *              · D-127/128a 139 ABSOLUTE: NO new voucher types · reuses canonical vt-revenue-expense
 * @closes      LEAK-9 (Maintenance cost drift) · GAP-21 (Service-history continuity)
 * @reuses      physical-asset-unit-bridge (3-shape lookup) · fincore-engine (postVoucher)
 * @[JWT]       Phase 2: POST /api/maintainpro/service-history/sync
 */

import type { AssetUnitRecord } from '@/types/fixed-asset';
import type { Voucher } from '@/types/voucher';
import { faUnitsKey } from '@/types/fixed-asset';
import { findPhysicalAssetUnit } from './physical-asset-unit-bridge';
import { postVoucher, generateVoucherNo } from './fincore-engine';

// ============================================================================
// TYPES · MaintainPro source events
// ============================================================================

export type MaintenanceEventKind =
  | 'work_order_close'      // breakdown · corrective work order completion
  | 'pm_tickoff'            // preventive maintenance schedule tickoff
  | 'calibration_done'      // periodic calibration entry
  | 'amc_actual'            // realised AMC invoice cost
  | 'spare_consumption';    // spares issued against asset

export interface MaintenanceCostEvent {
  type: MaintenanceEventKind;
  entity_id: string;
  /** Source identifier: WO-2025-001 · PMT-2025-042 · CAL-2025-007 · AMC-2025-003 · SI-2025-019 */
  source_ref: string;
  /** Equipment ID from MaintainPro · joined to AssetUnitRecord via hr_asset_id, asset_tag_id or fallback name */
  equipment_id: string;
  equipment_name: string;
  amount: number;                  // ₹ paise · service value
  date: string;                    // YYYY-MM-DD
  description: string;
  vendor_id?: string;              // AMC vendor or spares supplier
  vendor_name?: string;
  expense_ledger_id?: string;      // GL ledger for revenue-expense voucher
  expense_ledger_name?: string;
  cash_ledger_id?: string;         // cash/bank/vendor payable ledger
  cash_ledger_name?: string;
  emitted_at: string;
}

export interface ServiceHistorySyncResult {
  asset_unit_id: string | null;
  expense_history_id: string | null;
  voucher_id: string | null;
  resolution: 'matched_pau' | 'matched_name' | 'unmatched';
}

export interface ServiceHistorySummary {
  asset_unit_id: string;
  asset_id: string;
  total_cost: number;
  event_count: number;
  by_kind: Record<MaintenanceEventKind, { count: number; total: number }>;
  last_event_date: string | null;
}

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

// ============================================================================
// I/O HELPERS · entity-scoped
// ============================================================================

function readFAUnits(entityCode: string): AssetUnitRecord[] {
  try {
    // [JWT] GET /api/fa-units?entityCode=...
    const raw = localStorage.getItem(faUnitsKey(entityCode));
    return raw ? (JSON.parse(raw) as AssetUnitRecord[]) : [];
  } catch { return []; }
}

function writeFAUnits(entityCode: string, list: AssetUnitRecord[]): void {
  try {
    // [JWT] POST /api/fa-units
    localStorage.setItem(faUnitsKey(entityCode), JSON.stringify(list));
  } catch { /* quota */ }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Resolve a MaintainPro equipment_id → AssetUnitRecord using:
 *   1. PhysicalAssetUnit 3-shape bridge (hr_asset_id match)
 *   2. AssetUnitRecord.hr_asset_id direct soft-link
 *   3. Name-only fallback (matches `equipment_name` against item_name)
 */
export function resolveAssetUnitForEquipment(
  entityCode: string,
  equipmentId: string,
  equipmentName: string,
): { unit: AssetUnitRecord | null; resolution: ServiceHistorySyncResult['resolution'] } {
  // Path 1 · PhysicalAssetUnit bridge
  const pau = findPhysicalAssetUnit(entityCode, { hr_asset_id: equipmentId });
  const units = readFAUnits(entityCode);
  if (pau) {
    const u = units.find(x => x.id === pau.asset_unit_record_id);
    if (u) return { unit: u, resolution: 'matched_pau' };
  }
  // Path 2 · direct hr_asset_id on AssetUnitRecord
  const direct = units.find(u => u.hr_asset_id === equipmentId);
  if (direct) return { unit: direct, resolution: 'matched_pau' };
  // Path 3 · name fallback (demo-transactions-fincore.ts precedent)
  const named = units.find(u =>
    equipmentName && u.item_name &&
    u.item_name.toLowerCase().trim() === equipmentName.toLowerCase().trim(),
  );
  if (named) return { unit: named, resolution: 'matched_name' };
  return { unit: null, resolution: 'unmatched' };
}

/**
 * Apply a maintenance cost event to FA service history.
 * - Appends to AssetUnitRecord.expense_history (additive · D-10 compliant)
 * - Optionally posts canonical vt-revenue-expense voucher (D-127 safe) if ledger refs provided
 * - Idempotent: skipped if expense_history already contains source_ref for this asset
 */
export function syncMaintenanceEventToFA(
  entityCode: string,
  event: MaintenanceCostEvent,
): ServiceHistorySyncResult {
  if (event.amount <= 0) {
    return { asset_unit_id: null, expense_history_id: null, voucher_id: null, resolution: 'unmatched' };
  }
  const { unit, resolution } = resolveAssetUnitForEquipment(
    entityCode, event.equipment_id, event.equipment_name,
  );
  if (!unit) {
    return { asset_unit_id: null, expense_history_id: null, voucher_id: null, resolution: 'unmatched' };
  }

  const units = readFAUnits(entityCode);
  const idx = units.findIndex(u => u.id === unit.id);
  if (idx < 0) {
    return { asset_unit_id: null, expense_history_id: null, voucher_id: null, resolution: 'unmatched' };
  }

  const existing = units[idx].expense_history ?? [];
  // Idempotency · same source_ref already recorded against this asset
  if (existing.some(e => e.description.includes(event.source_ref))) {
    return {
      asset_unit_id: unit.id,
      expense_history_id: null,
      voucher_id: null,
      resolution,
    };
  }

  // Optional voucher posting · skipped if ledger refs not provided (annotation-only event)
  let voucherId: string | null = null;
  if (event.expense_ledger_id && event.cash_ledger_id) {
    voucherId = newId('vch-re');
    const voucherNo = generateVoucherNo('RE', entityCode);
    const voucher: Voucher = {
      id: voucherId,
      voucher_no: voucherNo,
      voucher_type_id: 'vt-revenue-expense',
      voucher_type_name: 'Revenue Expense',
      base_voucher_type: 'Payment',
      entity_id: entityCode,
      date: event.date,
      party_id: event.vendor_id,
      party_name: event.vendor_name,
      ledger_lines: [
        {
          id: newId('vll'),
          ledger_id: event.expense_ledger_id,
          ledger_code: 'EXP',
          ledger_group_code: 'indirect_expenses',
          ledger_name: event.expense_ledger_name ?? 'Maintenance Expense',
          dr_amount: event.amount,
          cr_amount: 0,
          narration: `${event.type} · ${event.source_ref} · ${unit.asset_id}`,
        },
        {
          id: newId('vll'),
          ledger_id: event.cash_ledger_id,
          ledger_code: 'CASH',
          ledger_group_code: 'cash_in_hand',
          ledger_name: event.cash_ledger_name ?? 'Cash',
          dr_amount: 0,
          cr_amount: event.amount,
          narration: `Payment for ${event.source_ref}`,
        },
      ],
      gross_amount: event.amount,
      total_discount: 0,
      total_taxable: event.amount,
      total_cgst: 0,
      total_sgst: 0,
      total_igst: 0,
      total_cess: 0,
      total_tax: 0,
      round_off: 0,
      net_amount: event.amount,
      tds_applicable: false,
      narration: `MaintainPro ${event.type} · ${event.source_ref} · ${event.description}`,
      terms_conditions: '',
      payment_enforcement: '',
      payment_instrument: '',
      status: 'draft',
    } as Voucher;
    postVoucher(voucher, entityCode);
  }

  const ehId = newId('eh');
  const eh = {
    id: ehId,
    voucher_id: voucherId ?? '',
    date: event.date,
    amount: event.amount,
    description: `[${event.type}] ${event.source_ref} · ${event.description}`,
  };

  units[idx] = {
    ...units[idx],
    expense_history: [...existing, eh],
    updated_at: new Date().toISOString(),
  };
  writeFAUnits(entityCode, units);

  return {
    asset_unit_id: unit.id,
    expense_history_id: ehId,
    voucher_id: voucherId,
    resolution,
  };
}

/** Summarise service-history cost for an asset · powers FA detail panel + MaintainPro report */
export function getServiceHistorySummary(
  entityCode: string,
  assetUnitId: string,
): ServiceHistorySummary | null {
  const unit = readFAUnits(entityCode).find(u => u.id === assetUnitId);
  if (!unit) return null;
  const hist = unit.expense_history ?? [];
  const by_kind: ServiceHistorySummary['by_kind'] = {
    work_order_close: { count: 0, total: 0 },
    pm_tickoff: { count: 0, total: 0 },
    calibration_done: { count: 0, total: 0 },
    amc_actual: { count: 0, total: 0 },
    spare_consumption: { count: 0, total: 0 },
  };
  let total = 0;
  let lastDate: string | null = null;
  for (const e of hist) {
    total += e.amount;
    if (!lastDate || e.date > lastDate) lastDate = e.date;
    for (const k of Object.keys(by_kind) as MaintenanceEventKind[]) {
      if (e.description.includes(`[${k}]`)) {
        by_kind[k].count++;
        by_kind[k].total += e.amount;
        break;
      }
    }
  }
  return {
    asset_unit_id: unit.id,
    asset_id: unit.asset_id,
    total_cost: total,
    event_count: hist.length,
    by_kind,
    last_event_date: lastDate,
  };
}

/** Bulk sync · used by demo seed orchestrator and one-shot reconciliations */
export function bulkSyncMaintenanceEvents(
  entityCode: string,
  events: MaintenanceCostEvent[],
): { synced: number; skipped: number; unmatched: number } {
  let synced = 0, skipped = 0, unmatched = 0;
  for (const e of events) {
    const r = syncMaintenanceEventToFA(entityCode, e);
    if (r.resolution === 'unmatched') unmatched++;
    else if (r.expense_history_id) synced++;
    else skipped++;
  }
  return { synced, skipped, unmatched };
}
