/**
 * @file     bin-slip-auto-generator.ts — OOB-6 · Auto-generate bin slips on GRN post
 * @sprint   T-Phase-1.2.6d-hdr
 *
 * When a GRN posts, prepares bin slip data for each accepted line item.
 * Stores the prepared data in localStorage under `erp_pending_bin_slips_${entityCode}`.
 * The Stores team's BinSlipPrint component reads this queue and prints labels.
 *
 * Fire-and-forget · catches its own errors · never breaks the GRN post flow.
 *
 * [JWT] POST /api/inventory/bin-slips/queue (Phase 2)
 */

import type { GRN } from '@/types/grn';

export interface PendingBinSlip {
  grn_id: string;
  grn_no: string;
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  batch_no: string | null;
  heat_no: string | null;
  godown_name: string;
  bin_code: string | null;
  generated_at: string;
}

export const pendingBinSlipsKey = (entityCode: string): string =>
  `erp_pending_bin_slips_${entityCode}`;

export function queueBinSlipsForGRN(grn: GRN, entityCode: string): void {
  try {
    const key = pendingBinSlipsKey(entityCode);
    const existing: PendingBinSlip[] = JSON.parse(localStorage.getItem(key) ?? '[]');
    const newSlips: PendingBinSlip[] = grn.lines
      .filter(line => line.accepted_qty > 0)
      .map(line => ({
        grn_id: grn.id,
        grn_no: grn.grn_no,
        item_code: line.item_code,
        item_name: line.item_name,
        qty: line.accepted_qty,
        uom: line.uom,
        batch_no: line.batch_no,
        heat_no: line.heat_no ?? null,
        godown_name: grn.godown_name,
        bin_code: line.bin_id ?? null,
        generated_at: new Date().toISOString(),
      }));
    localStorage.setItem(key, JSON.stringify([...existing, ...newSlips]));
  } catch {
    // Silent failure · bin slips are non-critical · don't break GRN post flow
  }
}

export function readPendingBinSlips(entityCode: string): PendingBinSlip[] {
  try {
    return JSON.parse(localStorage.getItem(pendingBinSlipsKey(entityCode)) ?? '[]');
  } catch {
    return [];
  }
}

export function clearPendingBinSlips(entityCode: string): void {
  try {
    localStorage.removeItem(pendingBinSlipsKey(entityCode));
  } catch {
    // ignore
  }
}
