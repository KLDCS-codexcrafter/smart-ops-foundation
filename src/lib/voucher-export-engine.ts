/**
 * @file     voucher-export-engine.ts
 * @purpose  Shared CSV + XLSX serializers for voucher exports. Reads ExportRows from per-voucher engines and produces downloadable files.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2c
 * @sprint   T10-pre.2c
 * @iso      Maintainability (HIGH — single serializer) · Functional Suitability (HIGH — all 14 vouchers supported) · Portability (HIGH — uses xlsx@0.18.5 already installed)
 * @whom     VoucherFormFooter · (future) batch export modules · (future) voucher registers
 * @depends  xlsx (existing) · export-helpers.ts
 * @consumers VoucherFormFooter.tsx (the "Export → Excel/CSV" dropdown)
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { downloadBlob, csvEscapeCell, buildExportFilename } from '@/lib/export-helpers';

/**
 * A single sheet worth of export data.
 * - `name` is the sheet name (for XLSX) or section label (for CSV; becomes a comment row).
 * - `headers` is the top row of column labels.
 * - `rows` is the body; each sub-array is one row; cell values may be string | number | null.
 */
export interface ExportSheet {
  name: string;
  headers: string[];
  rows: (string | number | null)[][];
}

/**
 * One or more sheets representing an entire voucher export.
 * Single-sheet for GL vouchers; multi-sheet for GST vouchers (lines + HSN summary).
 */
export interface ExportRows {
  voucherType: string;  // e.g. 'Sales Invoice' — used in filename
  voucherNo: string;    // e.g. 'INV-2026-0012' — used in filename
  sheets: ExportSheet[];
}

/**
 * @purpose   Serialize an ExportRows object to CSV and trigger download.
 *            Single-sheet → pure CSV. Multi-sheet → CSV with '# Sheet: <name>' separator rows.
 * @param     data — ExportRows from a voucher engine's buildXxxExportRows()
 * @iso       Reliability (HIGH — RFC 4180 escape via csvEscapeCell)
 * @example
 *   const rows = buildInvoiceExportRows(payload);
 *   exportVoucherAsCSV(rows);
 */
export function exportVoucherAsCSV(data: ExportRows): void {
  const lines: string[] = [];
  for (let i = 0; i < data.sheets.length; i++) {
    const sheet = data.sheets[i];
    if (data.sheets.length > 1) {
      // [Convergent] Multi-sheet CSV: label each section with a comment-style marker.
      // Excel treats '#' as text, opens cleanly; scripts parsing section breaks can grep '^# Sheet:'.
      if (i > 0) lines.push(''); // blank separator
      lines.push(`# Sheet: ${sheet.name}`);
    }
    lines.push(sheet.headers.map(csvEscapeCell).join(','));
    for (const row of sheet.rows) {
      lines.push(row.map(csvEscapeCell).join(','));
    }
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, buildExportFilename(data.voucherType, data.voucherNo, 'csv'));
}

/**
 * @purpose   Serialize an ExportRows object to XLSX (multi-sheet) and trigger download.
 * @param     data — ExportRows from a voucher engine's buildXxxExportRows()
 * @why-this-approach  [Convergent] Uses the same XLSX.utils.aoa_to_sheet / book_new pattern
 *                     already proven in src/features/command-center/modules/ImportHubModule.tsx.
 * @iso       Functional Suitability (HIGH — native .xlsx · opens in Excel/Sheets/LibreOffice)
 * @example
 *   const rows = buildInvoiceExportRows(payload);
 *   exportVoucherAsXLSX(rows);
 */
export function exportVoucherAsXLSX(data: ExportRows): void {
  const wb = XLSX.utils.book_new();
  for (const sheet of data.sheets) {
    // [Concrete] Prepend headers to rows. aoa_to_sheet wants an array-of-arrays.
    const aoa: (string | number | null)[][] = [sheet.headers, ...sheet.rows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // Sheet names must be ≤31 chars and must not contain: \ / ? * [ ]
    const safeName = sheet.name.replace(/[\\/?*[\]]/g, '_').slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, safeName);
  }
  // writeFile triggers browser download directly (no manual blob needed).
  XLSX.writeFile(wb, buildExportFilename(data.voucherType, data.voucherNo, 'xlsx'));
}
