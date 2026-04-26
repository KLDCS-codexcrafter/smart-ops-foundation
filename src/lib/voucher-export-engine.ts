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
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, Footer, PageNumber,
  PageOrientation, BorderStyle,
} from 'docx';
import { downloadBlob, csvEscapeCell, buildExportFilename } from '@/lib/export-helpers';
import {
  mapVoucherToTallySchema,
  type TallyAction,
  type TallyVoucherSchema,
  type TallyLedgerEntry,
  type TallyInventoryEntry,
  type TallyBillAllocation,
  type TallyBatchAllocation,
} from '@/lib/tally-export/voucher-to-tally-schema';
import type { Voucher } from '@/types/voucher';

// Re-export TallyAction so consumers can import it from the engine alongside other export types.
export type { TallyAction } from '@/lib/tally-export/voucher-to-tally-schema';

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

/**
 * Optional layout hint for Word/Docx rendering.
 * - 'voucher': single-voucher portrait A4 (header block + line items table + totals + signature)
 * - 'register': multi-voucher landscape A4 (compact paginated table for register exports)
 * - 'auto' (default): infer from sheet count — single sheet = voucher, multi-sheet = register
 */
export type WordLayoutHint = 'voucher' | 'register' | 'auto';

/**
 * @purpose   Build a docx Document from ExportRows. Auto-resolves layout (voucher vs register).
 *            Mirrors buildVoucherPDFDoc pattern from T-T10-pre.2c-PDF (Sprint A.2).
 * @param     data — ExportRows from a voucher engine OR a register's filtered rows
 * @param     layout — Layout hint (default 'auto')
 * @returns   { doc, layout } — the docx Document instance + resolved layout
 * @iso       Reliability (HIGH — no DOM side effects · pure docx construction)
 *            Maintainability (HIGH — single place that owns layout switching for Word)
 */
export function buildVoucherWordDoc(
  data: ExportRows,
  layout: WordLayoutHint = 'auto',
): { doc: Document; layout: 'voucher' | 'register' } {
  // [Convergent] Auto-resolve: single sheet → voucher · multi-sheet → register.
  const resolved: 'voucher' | 'register' =
    layout === 'auto' ? (data.sheets.length > 1 ? 'register' : 'voucher') : layout;

  const today = new Date().toISOString().slice(0, 10);
  const orientation = resolved === 'voucher' ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE;

  // [Concrete] Standard cell border — light grey grid for default Word table look.
  const cellBorder = { style: BorderStyle.SINGLE, size: 4, color: '999999' };
  const cellBorders = {
    top: cellBorder, bottom: cellBorder, left: cellBorder, right: cellBorder,
  };

  // [Concrete] Build the document body — header block, then per-sheet content.
  const children: (Paragraph | Table)[] = [];

  // [Concrete] Header block — voucher type centered, then No / Date row.
  children.push(new Paragraph({
    heading: HeadingLevel.HEADING_1,
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: data.voucherType, bold: true, size: 32 })],
  }));
  children.push(new Paragraph({
    children: [new TextRun({ text: `No: ${data.voucherNo}`, size: 22 })],
  }));
  children.push(new Paragraph({
    alignment: AlignmentType.RIGHT,
    children: [new TextRun({ text: `Date: ${today}`, size: 22 })],
  }));
  // [Phase 1.5] Logo placeholder — image embedding is Phase 1.5 polish.
  children.push(new Paragraph({
    children: [new TextRun({ text: '[Company Logo]', italics: true, color: '888888', size: 18 })],
  }));
  children.push(new Paragraph({ children: [new TextRun('')] }));

  // [Concrete] Render each sheet — section heading + Word Table.
  for (const sheet of data.sheets) {
    if (data.sheets.length > 1) {
      children.push(new Paragraph({
        heading: HeadingLevel.HEADING_2,
        children: [new TextRun({ text: sheet.name, bold: true, size: 26 })],
      }));
    }

    const headerRow = new TableRow({
      tableHeader: true,
      children: sheet.headers.map(h => new TableCell({
        borders: cellBorders,
        children: [new Paragraph({ children: [new TextRun({ text: h, bold: true, size: 20 })] })],
      })),
    });

    const bodyRows = sheet.rows.map(row => new TableRow({
      children: row.map(cell => new TableCell({
        borders: cellBorders,
        children: [new Paragraph({
          children: [new TextRun({
            text: cell === null || cell === undefined ? '' : String(cell), size: 20,
          })],
        })],
      })),
    }));

    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
    }));
    children.push(new Paragraph({ children: [new TextRun('')] }));
  }

  // [Phase 1.5] Voucher layout: signature line at the end. Register layout omits.
  if (resolved === 'voucher') {
    children.push(new Paragraph({ children: [new TextRun('')] }));
    children.push(new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [new TextRun({ text: 'Authorized Signatory: ___________________', size: 20 })],
    }));
  }

  // [Concrete] Footer with "Page X of Y" via PageNumber field.
  const footer = new Footer({
    children: [new Paragraph({
      alignment: AlignmentType.RIGHT,
      children: [
        new TextRun({ text: 'Page ', size: 18 }),
        new TextRun({ children: [PageNumber.CURRENT], size: 18 }),
        new TextRun({ text: ' of ', size: 18 }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18 }),
      ],
    })],
  });

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          size: {
            // [Concrete] A4 in DXA: 11906 x 16838. docx swaps for landscape internally.
            width: 11906, height: 16838, orientation,
          },
          margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 },
        },
      },
      footers: { default: footer },
      children,
    }],
  });

  return { doc, layout: resolved };
}

/**
 * @purpose   Serialize an ExportRows object to A4 .docx and trigger download.
 *            Voucher layout: portrait, header + line items table + totals + signature.
 *            Register layout: landscape, compact paginated table.
 * @param     data — ExportRows from a voucher engine's buildXxxExportRows() OR register's filtered rows
 * @param     layout — Layout hint (default 'auto')
 * @why-this-approach  [Convergent] Uses 'docx' npm package for native .docx generation.
 *                     Avoids HTML-to-Word complexity (which produces fragile .docx via fake headers).
 *                     'docx' produces clean .docx that Word/LibreOffice/Google Docs all open natively.
 * @iso       Functional Suitability (HIGH — A4 .docx · matches Word/LibreOffice/Google Docs)
 *            Reliability (HIGH — try/catch · graceful failure with toast at caller)
 *            Portability (HIGH — pure docx · no server dependency)
 * @example
 *   const rows = buildInvoiceExportRows(payload);
 *   exportVoucherAsWord(rows, 'voucher');
 */
export function exportVoucherAsWord(data: ExportRows, layout: WordLayoutHint = 'auto'): void {
  try {
    const { doc } = buildVoucherWordDoc(data, layout);
    // [Concrete] Packer.toBlob is async — chain via .then so callers stay sync-friendly.
    Packer.toBlob(doc).then(blob => {
      downloadBlob(blob, buildExportFilename(data.voucherType, data.voucherNo, 'docx'));
    }).catch(err => {
      // [Analytical] Diagnostic-only; banned-pattern targets console.log, not console.error.
      console.error('exportVoucherAsWord (Packer) failed:', err);
      throw err;
    });
  } catch (err) {
    // [Analytical] Engine stays UI-agnostic — caller surfaces toast.error.
    console.error('exportVoucherAsWord failed:', err);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// T-T10-pre.2c-TallyNative · Tally Prime native export (XML + JSON)
// Reference: https://help.tallysolutions.com/xml-integration/ (envelope structure)
//            https://help.tallysolutions.com/tally-prime-integration-using-json-1/ (JSON 7.0+)
// ──────────────────────────────────────────────────────────────────────────

/** XML special-character escape (RFC-compliant: & < > " '). */
function escapeXML(value: string): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Serialize a single Tally ledger entry as an XML fragment. */
function ledgerEntryToXML(e: TallyLedgerEntry): string {
  const parts: string[] = ['<ALLLEDGERENTRIES.LIST>'];
  parts.push(`<LEDGERNAME>${escapeXML(e.LEDGERNAME)}</LEDGERNAME>`);
  parts.push(`<ISDEEMEDPOSITIVE>${e.ISDEEMEDPOSITIVE}</ISDEEMEDPOSITIVE>`);
  parts.push(`<AMOUNT>${escapeXML(e.AMOUNT)}</AMOUNT>`);
  if (e.GSTCLASS) parts.push(`<GSTCLASS>${escapeXML(e.GSTCLASS)}</GSTCLASS>`);
  if (e.BILLALLOCATIONS_LIST) {
    for (const b of e.BILLALLOCATIONS_LIST) parts.push(billAllocToXML(b));
  }
  parts.push('</ALLLEDGERENTRIES.LIST>');
  return parts.join('');
}

function billAllocToXML(b: TallyBillAllocation): string {
  return [
    '<BILLALLOCATIONS.LIST>',
    `<NAME>${escapeXML(b.NAME)}</NAME>`,
    `<BILLTYPE>${escapeXML(b.BILLTYPE)}</BILLTYPE>`,
    `<AMOUNT>${escapeXML(b.AMOUNT)}</AMOUNT>`,
    '</BILLALLOCATIONS.LIST>',
  ].join('');
}

function batchAllocToXML(b: TallyBatchAllocation): string {
  const parts = ['<BATCHALLOCATIONS.LIST>'];
  parts.push(`<GODOWNNAME>${escapeXML(b.GODOWNNAME)}</GODOWNNAME>`);
  if (b.BATCHNAME) parts.push(`<BATCHNAME>${escapeXML(b.BATCHNAME)}</BATCHNAME>`);
  parts.push(`<ACTUALQTY>${escapeXML(b.ACTUALQTY)}</ACTUALQTY>`);
  parts.push(`<BILLEDQTY>${escapeXML(b.BILLEDQTY)}</BILLEDQTY>`);
  parts.push(`<AMOUNT>${escapeXML(b.AMOUNT)}</AMOUNT>`);
  parts.push('</BATCHALLOCATIONS.LIST>');
  return parts.join('');
}

function inventoryEntryToXML(e: TallyInventoryEntry): string {
  const parts: string[] = ['<ALLINVENTORYENTRIES.LIST>'];
  parts.push(`<STOCKITEMNAME>${escapeXML(e.STOCKITEMNAME)}</STOCKITEMNAME>`);
  parts.push(`<ACTUALQTY>${escapeXML(e.ACTUALQTY)}</ACTUALQTY>`);
  parts.push(`<BILLEDQTY>${escapeXML(e.BILLEDQTY)}</BILLEDQTY>`);
  parts.push(`<RATE>${escapeXML(e.RATE)}</RATE>`);
  parts.push(`<AMOUNT>${escapeXML(e.AMOUNT)}</AMOUNT>`);
  if (e.GODOWNNAME) parts.push(`<GODOWNNAME>${escapeXML(e.GODOWNNAME)}</GODOWNNAME>`);
  if (e.BATCHALLOCATIONS_LIST) {
    for (const b of e.BATCHALLOCATIONS_LIST) parts.push(batchAllocToXML(b));
  }
  if (e.ACCOUNTINGALLOCATIONS_LIST) {
    for (const l of e.ACCOUNTINGALLOCATIONS_LIST) {
      // Reuse ledger-entry shape inside ACCOUNTINGALLOCATIONS.LIST per Tally schema.
      parts.push('<ACCOUNTINGALLOCATIONS.LIST>');
      parts.push(`<LEDGERNAME>${escapeXML(l.LEDGERNAME)}</LEDGERNAME>`);
      parts.push(`<ISDEEMEDPOSITIVE>${l.ISDEEMEDPOSITIVE}</ISDEEMEDPOSITIVE>`);
      parts.push(`<AMOUNT>${escapeXML(l.AMOUNT)}</AMOUNT>`);
      parts.push('</ACCOUNTINGALLOCATIONS.LIST>');
    }
  }
  parts.push('</ALLINVENTORYENTRIES.LIST>');
  return parts.join('');
}

/** Serialize a TallyVoucherSchema object as an XML <VOUCHER> fragment. */
function voucherSchemaToXML(v: TallyVoucherSchema): string {
  const attrs: string[] = [`VCHTYPE="${escapeXML(v['@VCHTYPE'])}"`, `ACTION="${v['@ACTION']}"`];
  if (v['@TAGNAME']) attrs.push(`TAGNAME="${escapeXML(v['@TAGNAME'])}"`);
  if (v['@TAGVALUE']) attrs.push(`TAGVALUE="${escapeXML(v['@TAGVALUE'])}"`);
  const parts: string[] = [`<VOUCHER ${attrs.join(' ')}>`];
  // Scalar fields in Tally's preferred order.
  const scalar = (tag: string, val: string | undefined) => {
    if (val === undefined || val === null || val === '') return;
    parts.push(`<${tag}>${escapeXML(val)}</${tag}>`);
  };
  scalar('DATE', v.DATE);
  scalar('GUID', v.GUID);
  scalar('VOUCHERNUMBER', v.VOUCHERNUMBER);
  scalar('VOUCHERTYPENAME', v.VOUCHERTYPENAME);
  scalar('PARTYLEDGERNAME', v.PARTYLEDGERNAME);
  scalar('PARTYNAME', v.PARTYNAME);
  scalar('PLACEOFSUPPLY', v.PLACEOFSUPPLY);
  scalar('REFERENCE', v.REFERENCE);
  scalar('REFERENCEDATE', v.REFERENCEDATE);
  scalar('NARRATION', v.NARRATION);
  scalar('EFFECTIVEDATE', v.EFFECTIVEDATE);
  scalar('PERSISTEDVIEW', v.PERSISTEDVIEW);
  scalar('GSTREGISTRATIONTYPE', v.GSTREGISTRATIONTYPE);
  scalar('COUNTRYOFRESIDENCE', v.COUNTRYOFRESIDENCE);
  scalar('ISDEDUCTEDFLAG', v.ISDEDUCTEDFLAG);
  scalar('TDSCATEGORY', v.TDSCATEGORY);
  scalar('TDSAMOUNT', v.TDSAMOUNT);
  scalar('DEDUCTEEPAN', v.DEDUCTEEPAN);
  scalar('BOMNAME', v.BOMNAME);
  scalar('INSTRUMENTNUMBER', v.INSTRUMENTNUMBER);
  scalar('INSTRUMENTDATE', v.INSTRUMENTDATE);
  scalar('SOURCEGODOWN', v.SOURCEGODOWN);
  scalar('DESTINATIONGODOWN', v.DESTINATIONGODOWN);
  if (v.ALLLEDGERENTRIES_LIST) {
    for (const e of v.ALLLEDGERENTRIES_LIST) parts.push(ledgerEntryToXML(e));
  }
  if (v.ALLINVENTORYENTRIES_LIST) {
    for (const e of v.ALLINVENTORYENTRIES_LIST) parts.push(inventoryEntryToXML(e));
  }
  parts.push('</VOUCHER>');
  return parts.join('');
}

/**
 * @purpose   Build a Tally Prime XML envelope for one or more Operix Vouchers.
 *            Wraps voucher schema(s) in TALLYMESSAGE → DATA → BODY → ENVELOPE.
 * @param     voucher     — Operix Voucher OR array of Vouchers (batch mode)
 * @param     action      — TallyAction (default 'Create')
 * @param     companyName — value for <SVCURRENTCOMPANY> tag (empty omits STATICVARIABLES)
 * @returns   { xml, action }
 * @reference https://help.tallysolutions.com/xml-integration/
 */
export function buildTallyVoucherXML(
  voucher: Voucher | Voucher[],
  action: TallyAction = 'Create',
  companyName = '',
): { xml: string; action: TallyAction } {
  const list = Array.isArray(voucher) ? voucher : [voucher];
  const messages = list
    .map(v => `<TALLYMESSAGE xmlns:UDF="TallyUDF">${voucherSchemaToXML(mapVoucherToTallySchema(v, action))}</TALLYMESSAGE>`)
    .join('');
  const desc = companyName
    ? `<DESC><STATICVARIABLES><SVCURRENTCOMPANY>${escapeXML(companyName)}</SVCURRENTCOMPANY></STATICVARIABLES></DESC>`
    : '<DESC></DESC>';
  const xml =
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<ENVELOPE>' +
      '<HEADER>' +
        '<VERSION>1</VERSION>' +
        '<TALLYREQUEST>Import</TALLYREQUEST>' +
        '<TYPE>Data</TYPE>' +
        '<ID>Vouchers</ID>' +
      '</HEADER>' +
      '<BODY>' +
        desc +
        `<DATA>${messages}</DATA>` +
      '</BODY>' +
    '</ENVELOPE>';
  return { xml, action };
}

/**
 * @purpose   Trigger browser download of a Tally XML envelope file.
 * @example   exportVoucherAsTallyXML(salesVoucher, 'Create', 'Acme Pvt Ltd');
 */
export function exportVoucherAsTallyXML(
  voucher: Voucher | Voucher[],
  action: TallyAction = 'Create',
  companyName = '',
): void {
  try {
    const { xml } = buildTallyVoucherXML(voucher, action, companyName);
    const blob = new Blob([xml], { type: 'application/xml' });
    const filename = Array.isArray(voucher)
      ? buildExportFilename('Tally Batch', new Date().toISOString().slice(0, 10), 'xml')
      : buildExportFilename(voucher.voucher_type_name, voucher.voucher_no, 'xml');
    downloadBlob(blob, filename);
  } catch (err) {
    // [Analytical] Diagnostic-only · banned-pattern targets console.log not console.error.
    console.error('exportVoucherAsTallyXML failed:', err);
    throw err;
  }
}

/**
 * Build a Tally Prime native JSON object for one or more Operix Vouchers.
 * Mirrors the XML envelope hierarchy with `@`-prefixed attribute keys and
 * `.LIST` arrays preserved (always arrays, even for single entries — Tally
 * round-trip safe per https://help.tallysolutions.com/json-based-export-import/).
 */
export function buildTallyVoucherJSON(
  voucher: Voucher | Voucher[],
  action: TallyAction = 'Create',
  companyName = '',
): { json: object; action: TallyAction } {
  const list = Array.isArray(voucher) ? voucher : [voucher];
  const messages = list.map(v => {
    const schema = mapVoucherToTallySchema(v, action);
    return { VOUCHER: schemaToJSON(schema) };
  });
  const desc = companyName
    ? { STATICVARIABLES: { SVCURRENTCOMPANY: companyName } }
    : {};
  const json = {
    ENVELOPE: {
      HEADER: {
        VERSION: '1',
        TALLYREQUEST: 'Import',
        TYPE: 'Data',
        ID: 'Vouchers',
      },
      BODY: {
        DESC: desc,
        DATA: { TALLYMESSAGE: messages },
      },
    },
  };
  return { json, action };
}

/** Convert a TallyVoucherSchema to its JSON representation (with `.LIST` keys). */
function schemaToJSON(v: TallyVoucherSchema): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  // Attributes first.
  obj['@VCHTYPE'] = v['@VCHTYPE'];
  obj['@ACTION'] = v['@ACTION'];
  if (v['@TAGNAME']) obj['@TAGNAME'] = v['@TAGNAME'];
  if (v['@TAGVALUE']) obj['@TAGVALUE'] = v['@TAGVALUE'];
  const passthrough: Array<keyof TallyVoucherSchema> = [
    'DATE', 'GUID', 'VOUCHERNUMBER', 'VOUCHERTYPENAME', 'PARTYLEDGERNAME', 'PARTYNAME',
    'PLACEOFSUPPLY', 'REFERENCE', 'REFERENCEDATE', 'NARRATION', 'EFFECTIVEDATE',
    'PERSISTEDVIEW', 'GSTREGISTRATIONTYPE', 'COUNTRYOFRESIDENCE',
    'ISDEDUCTEDFLAG', 'TDSCATEGORY', 'TDSAMOUNT', 'DEDUCTEEPAN',
    'BOMNAME', 'INSTRUMENTNUMBER', 'INSTRUMENTDATE', 'SOURCEGODOWN', 'DESTINATIONGODOWN',
  ];
  for (const k of passthrough) {
    const val = v[k];
    if (val !== undefined && val !== null && val !== '') obj[k] = val;
  }
  if (v.ALLLEDGERENTRIES_LIST) {
    obj['ALLLEDGERENTRIES.LIST'] = v.ALLLEDGERENTRIES_LIST.map(le => {
      const o: Record<string, unknown> = {
        LEDGERNAME: le.LEDGERNAME,
        ISDEEMEDPOSITIVE: le.ISDEEMEDPOSITIVE,
        AMOUNT: le.AMOUNT,
      };
      if (le.GSTCLASS) o.GSTCLASS = le.GSTCLASS;
      if (le.BILLALLOCATIONS_LIST) {
        o['BILLALLOCATIONS.LIST'] = le.BILLALLOCATIONS_LIST.map(b => ({
          NAME: b.NAME, BILLTYPE: b.BILLTYPE, AMOUNT: b.AMOUNT,
        }));
      }
      return o;
    });
  }
  if (v.ALLINVENTORYENTRIES_LIST) {
    obj['ALLINVENTORYENTRIES.LIST'] = v.ALLINVENTORYENTRIES_LIST.map(ie => {
      const o: Record<string, unknown> = {
        STOCKITEMNAME: ie.STOCKITEMNAME,
        ACTUALQTY: ie.ACTUALQTY,
        BILLEDQTY: ie.BILLEDQTY,
        RATE: ie.RATE,
        AMOUNT: ie.AMOUNT,
      };
      if (ie.GODOWNNAME) o.GODOWNNAME = ie.GODOWNNAME;
      if (ie.BATCHALLOCATIONS_LIST) {
        o['BATCHALLOCATIONS.LIST'] = ie.BATCHALLOCATIONS_LIST.map(b => {
          const bo: Record<string, unknown> = {
            GODOWNNAME: b.GODOWNNAME,
            ACTUALQTY: b.ACTUALQTY,
            BILLEDQTY: b.BILLEDQTY,
            AMOUNT: b.AMOUNT,
          };
          if (b.BATCHNAME) bo.BATCHNAME = b.BATCHNAME;
          return bo;
        });
      }
      if (ie.ACCOUNTINGALLOCATIONS_LIST) {
        o['ACCOUNTINGALLOCATIONS.LIST'] = ie.ACCOUNTINGALLOCATIONS_LIST.map(le => ({
          LEDGERNAME: le.LEDGERNAME,
          ISDEEMEDPOSITIVE: le.ISDEEMEDPOSITIVE,
          AMOUNT: le.AMOUNT,
        }));
      }
      return o;
    });
  }
  return obj;
}

/**
 * Trigger browser download of a Tally Prime native JSON file.
 */
export function exportVoucherAsTallyJSON(
  voucher: Voucher | Voucher[],
  action: TallyAction = 'Create',
  companyName = '',
): void {
  try {
    const { json } = buildTallyVoucherJSON(voucher, action, companyName);
    const blob = new Blob([JSON.stringify(json, null, 2)], { type: 'application/json' });
    const filename = Array.isArray(voucher)
      ? buildExportFilename('Tally Batch', new Date().toISOString().slice(0, 10), 'json')
      : buildExportFilename(voucher.voucher_type_name, voucher.voucher_no, 'json');
    downloadBlob(blob, filename);
  } catch (err) {
    // [Analytical] Diagnostic-only · banned-pattern targets console.log not console.error.
    console.error('exportVoucherAsTallyJSON failed:', err);
    throw err;
  }
}

