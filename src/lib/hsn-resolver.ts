/**
 * hsn-resolver.ts — HSN/SAC lookup + auto-resolve from item master
 * Sprint T-Phase-2.7-a · Q2-a · Q8-c
 *
 * Reads HSN_CODES seed (~100 codes) + entity extensions from
 *   localStorage key `erp_hsn_extensions_{entityCode}`.
 * Item master HSN preference:
 *   item.hsn_sac_code → item.hsn → item.hsn_code (loose lookup · varies by master).
 * [JWT] GET /api/masters/hsn-extensions/:entityCode
 */

import { HSN_CODES, SAC_CODES, type HSNSACCode } from '@/data/hsn-sac-seed-data';

/** Entity extension layer · operator can flag additional codes as RCM-notified. */
export interface HSNExtension {
  code: string;
  is_rcm_notified: boolean;
  updated_at: string;
}

export const hsnExtensionsKey = (entityCode: string): string =>
  `erp_hsn_extensions_${entityCode}`;

/** Read extension overrides for an entity. */
export function loadHSNExtensions(entityCode: string): HSNExtension[] {
  try {
    const raw = localStorage.getItem(hsnExtensionsKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as HSNExtension[]) : [];
  } catch {
    return [];
  }
}

/** Persist extension overrides for an entity. */
export function saveHSNExtensions(entityCode: string, exts: HSNExtension[]): void {
  try {
    localStorage.setItem(hsnExtensionsKey(entityCode), JSON.stringify(exts));
  } catch {
    /* localStorage unavailable */
  }
}

/** Lookup HSN/SAC by exact code · returns merged record with RCM extension applied. */
export function lookupHSN(
  code: string | null | undefined,
  entityCode?: string,
): HSNSACCode | null {
  const c = (code ?? '').trim();
  if (!c) return null;
  const base =
    HSN_CODES.find((r) => r.code === c) ??
    SAC_CODES.find((r) => r.code === c) ??
    null;
  if (!base) return null;
  if (entityCode) {
    const ext = loadHSNExtensions(entityCode).find((e) => e.code === c);
    if (ext) return { ...base, reverseCharge: ext.is_rcm_notified || base.reverseCharge };
  }
  return base;
}

export interface ResolvedHSN {
  hsn_sac_code: string;
  gst_rate: number;
  is_rcm_eligible: boolean;
  source: 'item_master' | 'hsn_seed' | 'fallback';
}

/** Read HSN code off an item master record (shape varies). */
function readHSNFromItem(item: Record<string, unknown> | null | undefined): string | null {
  if (!item) return null;
  const candidates = ['hsn_sac_code', 'hsn_code', 'hsn', 'sac_code', 'sac'];
  for (const k of candidates) {
    const v = item[k];
    if (typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Resolve HSN/SAC + GST rate + RCM flag for a line item.
 * Priority: item master → HSN seed lookup → fallback {empty + 0% + non-RCM}.
 */
export function resolveHSNForItem(
  item: Record<string, unknown> | null | undefined,
  entityCode?: string,
): ResolvedHSN {
  const code = readHSNFromItem(item);
  if (!code) {
    return { hsn_sac_code: '', gst_rate: 0, is_rcm_eligible: false, source: 'fallback' };
  }
  const rec = lookupHSN(code, entityCode);
  if (!rec) {
    return { hsn_sac_code: code, gst_rate: 0, is_rcm_eligible: false, source: 'item_master' };
  }
  return {
    hsn_sac_code: rec.code,
    gst_rate: rec.igstRate,
    is_rcm_eligible: rec.reverseCharge,
    source: 'hsn_seed',
  };
}
