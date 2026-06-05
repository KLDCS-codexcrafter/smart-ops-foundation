/**
 * @file        src/pages/erp/ecomx/lib/ecomx-csv.ts
 * @purpose     Local CSV helper for EcomX panels (S154 Block-0.6 adaptive: no
 *              card-level helper exists). Quoted-field-safe. Delegates to
 *              shared `downloadBlob` + `csvEscapeCell` from voucher-export-engine's
 *              public partner module — no dup, no engine import.
 * @sprint      Sprint 154 · EcomX Money Suite
 */
import { downloadBlob, csvEscapeCell, buildExportFilename } from '@/lib/export-helpers';

export function exportEcomxCsv(
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
  baseName: string,
): void {
  const body = rows.map((r) => r.map((c) => csvEscapeCell(String(c ?? ''))).join(',')).join('\n');
  const filename = buildExportFilename(baseName, 'csv');
  downloadBlob(new Blob([body], { type: 'text/csv;charset=utf-8' }), filename);
}
