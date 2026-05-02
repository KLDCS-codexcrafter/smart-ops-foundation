/**
 * gst-bill-ship.helpers.ts — adapter helpers for GSTBillShipSection mounts
 * Sprint T-Phase-2.7-a · Batch C2 · Decimal-safe line normalisation.
 *
 * Each transaction form carries its own line shape (qty + rate + ad-hoc tax/disc fields).
 * `toSimpleGSTLines` projects any subset onto SimpleGSTLine for consumption by SimpleGSTPanel.
 *
 * [JWT] Pure adapter · no I/O.
 */

import type { SimpleGSTLine } from './SimpleGSTPanel';

interface AdapterInput {
  id?: string | null;
  qty?: number | null;
  rate?: number | null;
  /** Discount % (0–100). Use any of these field names common across forms. */
  discount_pct?: number | null;
  disc_pct?: number | null;
  /** GST rate % (0–28). Use any of these field names. */
  gst_rate?: number | null;
  gst_pct?: number | null;
  tax_pct?: number | null;
}

/** Normalise heterogeneous item rows to the SimpleGSTLine shape consumed by SimpleGSTPanel. */
export function toSimpleGSTLines(items: AdapterInput[] | null | undefined): SimpleGSTLine[] {
  if (!items || items.length === 0) return [];
  return items.map((it, idx) => ({
    id: it.id ?? `gstln-${idx}`,
    qty: Number(it.qty ?? 0),
    rate: Number(it.rate ?? 0),
    discount_pct: Number(it.discount_pct ?? it.disc_pct ?? 0),
    gst_rate: Number(it.gst_rate ?? it.gst_pct ?? it.tax_pct ?? 0),
  }));
}
