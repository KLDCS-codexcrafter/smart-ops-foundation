/**
 * voucher-print-shared.ts — Shared helpers for all voucher print engines.
 *
 * Used by: receipt-print-engine, payment-print-engine, contra-print-engine,
 *   journal-print-engine (T10-pre.2b.1) and forthcoming GL/inventory engines.
 *
 * Principle: payload-shape is per-voucher. Utilities are shared.
 * SalesInvoice print (invoice-print-engine.ts) is NOT refactored here; it will
 * be migrated in a later sub-sprint.
 *
 * [JWT] No API calls in this file — pure functions + localStorage reads.
 */

import type { EntityGSTConfig } from '@/types/entity-gst';
import { entityGstKey, DEFAULT_ENTITY_GST_CONFIG } from '@/types/entity-gst';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
import { amountInWordsIN } from '@/lib/invoice-print-engine';
import { formatDDMMMYYYY } from '@/lib/customer-address-lookup';

// ── Types ──────────────────────────────────────────────────────

/** Standard supplier block — top-right of every voucher print. */
export interface PrintSupplierBlock {
  legal_name: string;
  trade_name: string;
  gstin: string;
  pan: string;
  address_line_1: string;
  address_line_2: string | null;
  city: string;
  pincode: string;
  state_code: string;
}

/** Standard party block — top-left for receivable/payable vouchers. */
export interface PrintPartyBlock {
  name: string;
  gstin: string | null;
  address: string;
  state_code: string;
}

/** Each voucher type declares its copy set. */
export interface PrintCopyConfig {
  keys: string[];
  labels: Record<string, string>;
  default: string;
}

// ── Loaders (read-only) ────────────────────────────────────────

export function loadOne<T>(key: string, fallback: T): T {
  try {
    // [JWT] GET-equivalent
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch { return fallback; }
}

export function loadList<T>(key: string): T[] {
  try {
    // [JWT] GET-equivalent
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

/** Loads a voucher by id from localStorage. Returns null on any failure. */
export function loadVoucher(entityCode: string, voucherId: string): Voucher | null {
  const all = loadList<Voucher>(vouchersKey(entityCode));
  return all.find(v => v.id === voucherId) ?? null;
}

/** Loads the entity's GST config (supplier block source of truth). */
export function loadEntityGst(entityCode: string): EntityGSTConfig {
  return loadOne<EntityGSTConfig>(
    entityGstKey(entityCode),
    { ...DEFAULT_ENTITY_GST_CONFIG, entity_id: entityCode },
  );
}

// ── Supplier block builder ─────────────────────────────────────

export function buildSupplierBlock(gst: EntityGSTConfig): PrintSupplierBlock {
  return {
    legal_name: gst.legal_name || gst.entity_id,
    trade_name: gst.trade_name || '',
    gstin: gst.gstin || '',
    pan: gst.pan || '',
    address_line_1: gst.address_line_1 || '',
    address_line_2: gst.address_line_2 ?? null,
    city: gst.city || '',
    pincode: gst.pincode || '',
    state_code: gst.state_code || '',
  };
}

/** Concatenates supplier address lines into a single string. */
export function formatSupplierAddress(s: PrintSupplierBlock): string {
  const parts: string[] = [s.address_line_1];
  if (s.address_line_2) parts.push(s.address_line_2);
  const cityPincode = [s.city, s.pincode].filter(Boolean).join(' — ');
  if (cityPincode) parts.push(cityPincode);
  if (s.state_code) parts.push(`State: ${s.state_code}`);
  return parts.filter(Boolean).join(', ');
}

// ── Number / date formatters ───────────────────────────────────

/** Indian number formatting with 2-decimal currency output. */
export function formatINR(n: number): string {
  const rounded = Math.round(n * 100) / 100;
  return rounded.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Amount in words (Indian system: Lakh, Crore). Re-exports invoice engine helper. */
export const amountInWords = amountInWordsIN;

/** Re-export date formatter for consistency across prints. */
export { formatDDMMMYYYY };

// ── Totals helpers ─────────────────────────────────────────────

/** Sum of debits from ledger lines (defensive — some vouchers might be malformed). */
export function sumDebits(voucher: Voucher): number {
  return (voucher.ledger_lines ?? []).reduce((s, l) => s + (l.dr_amount || 0), 0);
}

/** Sum of credits from ledger lines. */
export function sumCredits(voucher: Voucher): number {
  return (voucher.ledger_lines ?? []).reduce((s, l) => s + (l.cr_amount || 0), 0);
}
