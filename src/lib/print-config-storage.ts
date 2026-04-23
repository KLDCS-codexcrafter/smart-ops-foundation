/**
 * @file     print-config-storage.ts
 * @purpose  Load, save, reset, and key-compute helpers for PrintConfig under localStorage.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2b.3b-A
 * @sprint   T10-pre.2b.3b-A
 * @iso      Reliability (HIGH — graceful fallback on missing/corrupt storage) · Maintainability (HIGH)
 * @whom     PrintConfigPage (editor) · (future: 14 print engines in 2b.3b-B1)
 * @depends  print-config.ts (types + defaults)
 * @consumers PrintConfigPage.tsx · (future) all 14 print engines
 */

import {
  type PrintConfig,
  type VoucherTypeCode,
  type PrintToggles,
  DEFAULT_PRINT_CONFIG,
  DEFAULT_TOGGLES,
} from '@/types/print-config';

/**
 * @purpose   Canonical localStorage key per entity.
 * @param     entityCode — entity identifier (e.g. 'ABDOS_HQ')
 * @returns   'printConfig:{entityCode}'
 * @iso       Maintainability — single-source key derivation
 */
export function printConfigKey(entityCode: string): string {
  return `printConfig:${entityCode}`;
}

/**
 * @purpose   Load PrintConfig for an entity; fall back to DEFAULT_PRINT_CONFIG on any failure.
 * @param     entityCode — entity identifier
 * @returns   PrintConfig (never throws, never returns null)
 * @why-this-approach  [Critical] Engines + editor must never crash on missing/corrupt config.
 *                     Try/catch here is the single point of failure-containment.
 * @iso       Reliability (HIGH)
 * @example
 *   const cfg = loadPrintConfig('ABDOS_HQ');
 *   const showRate = cfg.byVoucherType.invoice?.showRate ?? DEFAULT_TOGGLES.showRate;
 */
export function loadPrintConfig(entityCode: string): PrintConfig {
  try {
    // [JWT] GET /api/finecore/print-config/:entityCode
    const raw = localStorage.getItem(printConfigKey(entityCode));
    if (!raw) return DEFAULT_PRINT_CONFIG;
    const parsed = JSON.parse(raw) as PrintConfig;
    // [Critical] Version check — bump invalidates stale schema.
    if (parsed.version !== 1) return DEFAULT_PRINT_CONFIG;
    return parsed;
  } catch {
    return DEFAULT_PRINT_CONFIG;
  }
}

/**
 * @purpose   Persist a PrintConfig for an entity; updatedAt is stamped automatically.
 * @param     entityCode — entity identifier
 * @param     config — PrintConfig (version + byVoucherType required)
 * @iso       Integrity — updatedAt stamped at save time
 */
export function savePrintConfig(entityCode: string, config: PrintConfig): void {
  const stamped: PrintConfig = { ...config, updatedAt: new Date().toISOString() };
  try {
    // [JWT] PUT /api/finecore/print-config/:entityCode
    localStorage.setItem(printConfigKey(entityCode), JSON.stringify(stamped));
  } catch {
    // [Critical] localStorage quota or privacy-mode can fail — silent swallow is acceptable
    // at this phase; UI shows a toast on save-click.
  }
}

/**
 * @purpose   Remove an entity's PrintConfig — next load returns DEFAULT_PRINT_CONFIG.
 * @param     entityCode — entity identifier
 */
export function resetPrintConfig(entityCode: string): void {
  try {
    // [JWT] DELETE /api/finecore/print-config/:entityCode
    localStorage.removeItem(printConfigKey(entityCode));
  } catch {
    // [Critical] same as savePrintConfig — non-fatal
  }
}

/**
 * @purpose   Merge-read a specific voucher type's toggles, applying defaults for missing keys.
 * @param     config — full PrintConfig
 * @param     voucherType — which voucher's toggles to resolve
 * @returns   PrintToggles fully populated (every key present)
 * @why-this-approach  [Convergent] Single merge point means engines + UI both resolve the
 *                     same way. Avoids drift.
 * @iso       Reliability (HIGH) · Maintainability (HIGH)
 */
export function resolveToggles(
  config: PrintConfig,
  voucherType: VoucherTypeCode,
): PrintToggles {
  const partial = config.byVoucherType[voucherType] ?? {};
  return { ...DEFAULT_TOGGLES, ...partial };
}
