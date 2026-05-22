/**
 * @file        src/lib/vendor-advance-engine.ts
 * @purpose     D-NEW-GP · Vendor Advance Payment engine · 23rd SIBLING ⭐
 * @sprint      T-Phase-2.HK-5-2 · Block H
 * @decisions   Q-LOCK-3(a) FR-19 SIBLING · po-management-engine 0-DIFF · NEW SIBLING + NEW type isolated module
 * @disciplines FR-19 (SIBLING discipline · 23rd application) · FR-22 canonical · FR-26 entity-scoped · FR-54 CC SSOT
 * @[JWT]       erp_vendor_advances_<entityCode>
 */
import type { VendorAdvance, VendorAdvanceStatus } from '@/types/vendor-advance';
import { vendorAdvancesKey } from '@/types/vendor-advance';

export function loadVendorAdvances(entityCode: string): VendorAdvance[] {
  try {
    const raw = localStorage.getItem(vendorAdvancesKey(entityCode));
    return raw ? (JSON.parse(raw) as VendorAdvance[]) : [];
  } catch {
    return [];
  }
}

function saveVendorAdvances(entityCode: string, advances: VendorAdvance[]): void {
  try {
    localStorage.setItem(vendorAdvancesKey(entityCode), JSON.stringify(advances));
  } catch {
    /* quota silent */
  }
}

export interface CreateVendorAdvanceInput {
  entity_id: string;
  vendor_id: string;
  vendor_name: string;
  po_id?: string | null;
  po_no?: string | null;
  advance_amount: number;
  notes?: string;
}

export function createVendorAdvance(input: CreateVendorAdvanceInput): VendorAdvance {
  const now = new Date().toISOString();
  const advance: VendorAdvance = {
    id: `VA-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    po_id: input.po_id ?? null,
    po_no: input.po_no ?? null,
    advance_amount: input.advance_amount,
    advance_paid_at: now,
    advance_adjusted_amount: 0,
    status: 'paid',
    notes: input.notes,
    created_at: now,
    updated_at: now,
  };

  const all = loadVendorAdvances(input.entity_id);
  saveVendorAdvances(input.entity_id, [advance, ...all]);
  return advance;
}

export function listVendorAdvances(entityCode: string): VendorAdvance[] {
  return loadVendorAdvances(entityCode);
}

export function adjustAdvanceAgainstInvoice(
  entityCode: string,
  advanceId: string,
  adjustmentAmount: number,
): VendorAdvance | null {
  const all = loadVendorAdvances(entityCode);
  const idx = all.findIndex((a) => a.id === advanceId);
  if (idx === -1) return null;

  const current = all[idx];
  const newAdjusted = current.advance_adjusted_amount + adjustmentAmount;
  if (newAdjusted > current.advance_amount) return null;

  let newStatus: VendorAdvanceStatus = 'partial_adjusted';
  if (newAdjusted === current.advance_amount) newStatus = 'fully_adjusted';

  const updated: VendorAdvance = {
    ...current,
    advance_adjusted_amount: newAdjusted,
    status: newStatus,
    updated_at: new Date().toISOString(),
  };

  all[idx] = updated;
  saveVendorAdvances(entityCode, all);
  return updated;
}

export function refundUnusedAdvance(
  entityCode: string,
  advanceId: string,
): VendorAdvance | null {
  const all = loadVendorAdvances(entityCode);
  const idx = all.findIndex((a) => a.id === advanceId);
  if (idx === -1) return null;

  const updated: VendorAdvance = {
    ...all[idx],
    status: 'refunded',
    updated_at: new Date().toISOString(),
  };
  all[idx] = updated;
  saveVendorAdvances(entityCode, all);
  return updated;
}

export interface VendorAdvanceOutstanding {
  vendor_id: string;
  vendor_name: string;
  total_advances: number;
  adjusted_amount: number;
  outstanding_amount: number;
  count_active_advances: number;
}

export function getOutstandingAdvances(entityCode: string): VendorAdvanceOutstanding[] {
  const all = loadVendorAdvances(entityCode);
  const byVendor = new Map<string, VendorAdvanceOutstanding>();

  for (const a of all) {
    if (a.status === 'fully_adjusted' || a.status === 'refunded') continue;

    const existing = byVendor.get(a.vendor_id) ?? {
      vendor_id: a.vendor_id,
      vendor_name: a.vendor_name,
      total_advances: 0,
      adjusted_amount: 0,
      outstanding_amount: 0,
      count_active_advances: 0,
    };

    existing.total_advances += a.advance_amount;
    existing.adjusted_amount += a.advance_adjusted_amount;
    existing.outstanding_amount = existing.total_advances - existing.adjusted_amount;
    existing.count_active_advances += 1;

    byVendor.set(a.vendor_id, existing);
  }

  return Array.from(byVendor.values()).sort(
    (a, b) => b.outstanding_amount - a.outstanding_amount,
  );
}
