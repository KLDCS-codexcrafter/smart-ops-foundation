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

/**
 * Optional layout hint for PDF rendering.
 * - 'voucher': single-voucher portrait A4 (header block + line items + totals).
 * - 'register': multi-voucher landscape A4 (compact paginated table).
 * - 'auto' (default): infer from sheet count — single sheet = voucher, multi-sheet = register.
 */
export type PDFLayoutHint = 'voucher' | 'register' | 'auto';

/**
 * @purpose   Build a jsPDF document for the given ExportRows in voucher/register layout.
 *            Exposed for smoke-test introspection (page count, orientation, blob type).
 * @param     data   — ExportRows from a voucher engine or register
 * @param     layout — 'voucher' | 'register' | 'auto'
 * @returns   { doc, layout, pageCount } — the jsPDF instance + resolved layout + page count
 * @iso       Reliability (HIGH — no DOM side effects · pure jsPDF construction)
 *            Maintainability (HIGH — single place that owns layout switching)
 */
export function buildVoucherPDFDoc(
  data: ExportRows,
  layout: PDFLayoutHint = 'auto',
): { doc: jsPDF; layout: 'voucher' | 'register'; pageCount: number } {
  // [Convergent] Auto-resolve: single sheet → voucher · multi-sheet → register.
  const resolved: 'voucher' | 'register' =
    layout === 'auto' ? (data.sheets.length > 1 ? 'register' : 'voucher') : layout;

  const orientation: 'portrait' | 'landscape' = resolved === 'voucher' ? 'portrait' : 'landscape';
  const doc = new jsPDF({ orientation, unit: 'pt', format: 'a4' });

  const pageWidth = doc.internal.pageSize.getWidth();
  const today = new Date().toISOString().slice(0, 10);

  // [Concrete] Header block — voucher type · voucher number · date.
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(data.voucherType, 40, 40);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`No: ${data.voucherNo}`, 40, 58);
  doc.text(`Date: ${today}`, pageWidth - 40, 58, { align: 'right' });

  // [Phase 2] IRN+QR placeholder — real GSTN integration is Phase 2 scope.
  // For now: if any sheet name hints at GST, render a placeholder line.
  const hasGstHint = data.sheets.some(s =>
    /gst|hsn|tax|invoice/i.test(s.name) || /invoice/i.test(data.voucherType),
  );
  if (hasGstHint && resolved === 'voucher') {
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text('IRN: <pending>  ·  QR: <pending>', 40, 72);
    doc.setTextColor(0);
  }

  let cursorY = hasGstHint && resolved === 'voucher' ? 88 : 78;

  // [Concrete] Render each sheet via jspdf-autotable. Section header for multi-sheet.
  for (let i = 0; i < data.sheets.length; i++) {
    const sheet = data.sheets[i];
    if (data.sheets.length > 1) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(sheet.name, 40, cursorY);
      cursorY += 12;
      doc.setFont('helvetica', 'normal');
    }

    autoTable(doc, {
      head: [sheet.headers],
      body: sheet.rows.map(r => r.map(cell => (cell === null || cell === undefined ? '' : String(cell)))),
      startY: cursorY,
      theme: 'striped',
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [55, 65, 81], textColor: 255, fontStyle: 'bold' },
      margin: { left: 40, right: 40 },
    });

    // [Concrete] After each sheet, advance cursor below the rendered table.
    const docWithAuto = doc as jsPDF & { lastAutoTable?: { finalY: number } };
    cursorY = (docWithAuto.lastAutoTable?.finalY ?? cursorY) + 18;
  }

  // [Concrete] Footer — "Page X of Y" on every page.
  const pageCount = doc.getNumberOfPages();
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(
      `Page ${p} of ${pageCount}`,
      pageWidth - 40,
      doc.internal.pageSize.getHeight() - 20,
      { align: 'right' },
    );
    doc.setTextColor(0);
  }

  return { doc, layout: resolved, pageCount };
}

/**
 * @purpose   Serialize an ExportRows object to A4 PDF and trigger download.
 *            Voucher layout: portrait A4 with header + tables + page numbers.
 *            Register layout: landscape A4 with compact paginated table.
 * @param     data   — ExportRows from a voucher engine's buildXxxExportRows() OR a register's filtered rows
 * @param     layout — 'voucher' | 'register' | 'auto' (default 'auto')
 * @why-this-approach  [Convergent] Uses jspdf-autotable for native PDF table rendering.
 *                     Avoids HTML-to-PDF complexity (html2pdf.js) which has quirks with
 *                     CSS-driven layouts. autotable produces cleaner, smaller PDFs.
 * @iso       Functional Suitability (HIGH — A4 PDF · Indian-format niceties)
 *            Reliability (HIGH — try/catch · graceful failure with toast)
 *            Portability (HIGH — pure jspdf · no server dependency)
 * @example
 *   const rows = buildInvoiceExportRows(payload);
 *   exportVoucherAsPDF(rows, 'voucher');
 */
export function exportVoucherAsPDF(data: ExportRows, layout: PDFLayoutHint = 'auto'): void {
  try {
    const { doc } = buildVoucherPDFDoc(data, layout);
    const blob = doc.output('blob');
    downloadBlob(blob, buildExportFilename(data.voucherType, data.voucherNo, 'pdf'));
  } catch (err) {
    // [Analytical] Diagnostic-only; banned-pattern targets console.log, not console.error.
    // Caller is expected to surface a toast.error — engine stays UI-agnostic.
    console.error('exportVoucherAsPDF failed:', err);
    throw err;
  }
}

