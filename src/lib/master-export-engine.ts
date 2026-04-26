/**
 * @file     master-export-engine.ts
 * @purpose  Generic CSV/Excel export for master data entities. Generates
 *           file blob from records + downloads via existing downloadBlob utility.
 *           Also generates empty templates for users to fill.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Z9
 * @iso      Maintainability (HIGH+ uses existing export-helpers utilities · no duplication)
 *           Compatibility (HIGH+ universal CSV/Excel formats)
 * @whom     CustomerMaster · VendorMaster · LedgerMaster · LogisticMaster · SchemeMaster
 * @depends  xlsx@0.18.5 · downloadBlob + csvEscapeCell from export-helpers
 */

import * as XLSX from 'xlsx';
import { downloadBlob, csvEscapeCell } from './export-helpers';
import type { ImportSchema } from './master-import-engine';

/**
 * Generate empty CSV template with column headers · for users to fill in.
 */
export function exportTemplate<T>(schema: ImportSchema<T>): void {
  const headers = schema.columns.map(c => csvEscapeCell(c.header)).join(',');
  const requiredNote = schema.columns
    .filter(c => c.required)
    .map(c => c.header)
    .join(', ');
  const csv = [
    headers,
    `# Required fields: ${requiredNote}`,
  ].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${schema.entityName}_template.csv`);
}

/**
 * Export current data as CSV.
 */
export function exportToCSV<T extends Record<string, unknown>>(
  records: T[],
  schema: ImportSchema<T>,
): void {
  const headers = schema.columns.map(c => csvEscapeCell(c.header)).join(',');
  const rows = records.map(rec =>
    schema.columns.map(c => csvEscapeCell(rec[c.field])).join(','),
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${schema.entityName}_export_${new Date().toISOString().slice(0, 10)}.csv`);
}

/**
 * Export current data as Excel xlsx.
 */
export function exportToExcel<T extends Record<string, unknown>>(
  records: T[],
  schema: ImportSchema<T>,
): void {
  const data = records.map(rec => {
    const row: Record<string, unknown> = {};
    schema.columns.forEach(c => {
      row[c.header] = rec[c.field];
    });
    return row;
  });
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, schema.entityName);
  const buffer = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadBlob(blob, `${schema.entityName}_export_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

/**
 * Export per-row error report as CSV (for users to fix).
 */
export function exportErrorReport(
  entityName: string,
  errors: Array<{ line: number; field?: string; message: string }>,
): void {
  const headers = ['Line', 'Field', 'Error'].join(',');
  const rows = errors.map(e =>
    [csvEscapeCell(e.line), csvEscapeCell(e.field ?? ''), csvEscapeCell(e.message)].join(','),
  );
  const csv = [headers, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, `${entityName}_import_errors_${new Date().toISOString().slice(0, 10)}.csv`);
}
