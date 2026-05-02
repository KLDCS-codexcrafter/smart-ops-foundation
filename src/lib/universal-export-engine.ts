/**
 * universal-export-engine.ts — Excel/PDF/Word/CSV export for UniversalRegisterGrid<T>
 *
 * Sprint T-Phase-1.2.6a · Card #2.6 sub-sprint 1 of 5 · D-226 UTS Foundation
 *
 * Sibling to voucher-export-engine.ts (which stays bound to Voucher). This
 * engine is generic over <T extends { id: string }> and serves non-voucher
 * UTS consumers (GRN, MIN, RTV, Quotation, ...).
 *
 * Reuses the same xlsx / jspdf / jspdf-autotable / docx libs already in
 * package.json — zero new deps.
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel,
} from 'docx';
import { downloadBlob, csvEscapeCell, buildExportFilename } from '@/lib/export-helpers';
import type { RegisterColumn, SummaryCard } from '@/components/registers/UniversalRegisterTypes';

export interface ExportOptions {
  /** Filename stem; extension is appended by helper. */
  filename: string;
  /** Document title shown in PDF/Word headers and CSV banner. */
  title: string;
  /** Optional summary strip rendered above the table. */
  summary?: SummaryCard[];
}

/**
 * Resolve a column's export value for a row. Handles keyof T and function accessors.
 */
export function getCellValue<T extends { id: string }>(
  row: T,
  col: RegisterColumn<T>,
): string | number | null {
  if (col.exportKey === undefined) return '';
  if (typeof col.exportKey === 'function') return col.exportKey(row);
  const v = row[col.exportKey];
  if (v === null || v === undefined) return '';
  if (typeof v === 'string' || typeof v === 'number') return v;
  return String(v);
}

function exportableColumns<T extends { id: string }>(columns: RegisterColumn<T>[]): RegisterColumn<T>[] {
  return columns.filter(c => c.exportKey !== undefined);
}

function headerRow<T extends { id: string }>(cols: RegisterColumn<T>[]): string[] {
  return cols.map(c => c.exportLabel ?? c.label);
}

function bodyMatrix<T extends { id: string }>(rows: T[], cols: RegisterColumn<T>[]): (string | number | null)[][] {
  return rows.map(r => cols.map(c => getCellValue(r, c)));
}

// ── CSV ────────────────────────────────────────────────────────────────────

export function exportRegisterAsCSV<T extends { id: string }>(
  rows: T[],
  columns: RegisterColumn<T>[],
  opts: ExportOptions,
): void {
  const cols = exportableColumns(columns);
  const lines: string[] = [];
  lines.push(`# ${opts.title}`);
  if (opts.summary && opts.summary.length > 0) {
    lines.push(`# ${opts.summary.map(s => `${s.label}: ${s.value}`).join(' | ')}`);
  }
  lines.push(headerRow(cols).map(csvEscapeCell).join(','));
  for (const row of bodyMatrix(rows, cols)) {
    lines.push(row.map(csvEscapeCell).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  downloadBlob(blob, buildExportFilename(opts.filename, '', 'csv'));
}

// ── XLSX ───────────────────────────────────────────────────────────────────

export function exportRegisterAsXLSX<T extends { id: string }>(
  rows: T[],
  columns: RegisterColumn<T>[],
  opts: ExportOptions,
): void {
  const cols = exportableColumns(columns);
  const aoa: (string | number | null)[][] = [];
  aoa.push([opts.title]);
  if (opts.summary && opts.summary.length > 0) {
    aoa.push(opts.summary.map(s => `${s.label}: ${s.value}`));
  }
  aoa.push([]);
  aoa.push(headerRow(cols));
  for (const r of bodyMatrix(rows, cols)) aoa.push(r);
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Register');
  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  downloadBlob(blob, buildExportFilename(opts.filename, '', 'xlsx'));
}

// ── PDF ────────────────────────────────────────────────────────────────────

export function exportRegisterAsPDF<T extends { id: string }>(
  rows: T[],
  columns: RegisterColumn<T>[],
  opts: ExportOptions,
): void {
  const cols = exportableColumns(columns);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
  doc.setFontSize(14);
  doc.text(opts.title, 40, 40);
  if (opts.summary && opts.summary.length > 0) {
    doc.setFontSize(9);
    doc.text(opts.summary.map(s => `${s.label}: ${s.value}`).join('   |   '), 40, 58);
  }
  autoTable(doc, {
    startY: 72,
    head: [headerRow(cols)],
    body: bodyMatrix(rows, cols).map(r => r.map(v => (v === null ? '' : String(v)))),
    styles: { fontSize: 8, cellPadding: 4 },
    headStyles: { fillColor: [55, 65, 81] },
  });
  const blob = doc.output('blob');
  downloadBlob(blob, buildExportFilename(opts.filename, '', 'pdf'));
}

// ── Word ───────────────────────────────────────────────────────────────────

export async function exportRegisterAsWord<T extends { id: string }>(
  rows: T[],
  columns: RegisterColumn<T>[],
  opts: ExportOptions,
): Promise<void> {
  const cols = exportableColumns(columns);
  const headerCells = headerRow(cols).map(h => new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text: h, bold: true })] })],
  }));
  const bodyRows = bodyMatrix(rows, cols).map(r => new TableRow({
    children: r.map(v => new TableCell({
      children: [new Paragraph({ children: [new TextRun(v === null ? '' : String(v))] })],
    })),
  }));
  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [new TableRow({ children: headerCells }), ...bodyRows],
  });
  const summaryParas: Paragraph[] = opts.summary && opts.summary.length > 0
    ? [new Paragraph({
        alignment: AlignmentType.LEFT,
        children: [new TextRun({
          text: opts.summary.map(s => `${s.label}: ${s.value}`).join('   |   '),
          italics: true, size: 18,
        })],
      })]
    : [];
  const docx = new Document({
    sections: [{
      children: [
        new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(opts.title)] }),
        ...summaryParas,
        new Paragraph({ children: [new TextRun('')] }),
        table,
      ],
    }],
  });
  const blob = await Packer.toBlob(docx);
  downloadBlob(blob, buildExportFilename(opts.filename, '', 'docx'));
}
