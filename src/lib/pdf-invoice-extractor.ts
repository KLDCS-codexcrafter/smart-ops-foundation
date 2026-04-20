/**
 * pdf-invoice-extractor.ts — Extract transporter invoice lines from PDF text
 * Sprint 15c-3. Pure (no React, no localStorage). Uses pdfjs-dist via dynamic import.
 *
 * SCOPE: digital PDFs (computer-generated). Scanned PDFs explicitly NOT supported.
 */

import type {
  TransporterInvoiceLine, MappableField,
} from '@/types/transporter-invoice';

export interface PDFTextSpan {
  text: string;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FieldConfidence {
  field: MappableField;
  value: string | number;
  confidence: number;
  source_span?: PDFTextSpan;
  notes?: string;
}

export interface ExtractedInvoiceLine {
  line_no: number;
  fields: FieldConfidence[];
  overall_confidence: number;
}

export interface ExtractionResult {
  ok: true;
  total_pages: number;
  total_spans: number;
  header: {
    invoice_no?: FieldConfidence;
    invoice_date?: FieldConfidence;
    transporter_name?: FieldConfidence;
  };
  lines: ExtractedInvoiceLine[];
  warnings: string[];
}

export type ExtractionFailure =
  | { ok: false; reason: 'not_a_pdf' }
  | { ok: false; reason: 'scanned_pdf_not_supported' }
  | { ok: false; reason: 'empty_pdf' }
  | { ok: false; reason: 'parse_error'; error: string };

export type ExtractionOutcome = ExtractionResult | ExtractionFailure;

const PATTERNS = {
  lr_no: /\b(?:LR(?:\s*(?:No\.?|#|Number))?\s*[:.]?\s*)([A-Z0-9][-A-Z0-9/]{3,20})\b/i,
  lr_no_standalone: /\b([A-Z]{2,4}[-/]?\d{4,10})\b/,
  date_ddmmyyyy: /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/,
  amount: /(?:Rs\.?|INR|₹)\s*([0-9,]+(?:\.\d{1,2})?)/i,
  amount_plain: /\b([0-9]{1,3}(?:,\d{3})*(?:\.\d{1,2})?)\b/,
  weight_kg: /\b([\d.]+)\s*(?:kg|kgs|kilogram)/i,
  gst_pct: /(\d+(?:\.\d+)?)\s*%\s*(?:GST|CGST|SGST|IGST)/i,
  invoice_no: /(?:Invoice|Bill)\s*(?:No\.?|#|Number)?\s*[:.]?\s*([A-Z0-9][-A-Z0-9/]{2,30})/i,
};

/** Parse PDF buffer into spans via pdfjs-dist (dynamic import). */
export async function parsePDFToSpans(buffer: ArrayBuffer): Promise<{
  spans: PDFTextSpan[]; pages: number;
} | { error: string }> {
  try {
    // Dynamic import keeps pdfjs out of main chunk.
    const pdfjs = await import('pdfjs-dist');
    pdfjs.GlobalWorkerOptions.workerSrc =
      `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

    const loadingTask = pdfjs.getDocument({ data: buffer });
    const pdf = await loadingTask.promise;
    const spans: PDFTextSpan[] = [];

    for (let p = 1; p <= pdf.numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      for (const item of content.items) {
        const i = item as { str?: string; transform?: number[]; width?: number; height?: number };
        if (!i.str || !i.transform) continue;
        spans.push({
          text: i.str,
          page: p,
          x: i.transform[4] ?? 0,
          y: i.transform[5] ?? 0,
          width: i.width ?? 0,
          height: i.height ?? 0,
        });
      }
    }
    return { spans, pages: pdf.numPages };
  } catch (err) {
    return { error: err instanceof Error ? err.message : String(err) };
  }
}

function isLikelyScanned(spans: PDFTextSpan[], pages: number): boolean {
  if (pages === 0) return false;
  const avgCharsPerPage = spans.reduce((s, sp) => s + sp.text.length, 0) / pages;
  return avgCharsPerPage < 20;
}

function groupIntoRows(spans: PDFTextSpan[], yTolerance: number = 3): PDFTextSpan[][] {
  const byPage = new Map<number, PDFTextSpan[]>();
  for (const s of spans) {
    if (!byPage.has(s.page)) byPage.set(s.page, []);
    byPage.get(s.page)!.push(s);
  }
  const rows: PDFTextSpan[][] = [];
  byPage.forEach(pageSpans => {
    pageSpans.sort((a, b) => b.y - a.y || a.x - b.x);
    let currentRow: PDFTextSpan[] = [];
    let currentY: number | null = null;
    for (const span of pageSpans) {
      if (currentY === null || Math.abs(span.y - currentY) <= yTolerance) {
        currentRow.push(span);
        currentY = span.y;
      } else {
        if (currentRow.length > 0) rows.push(currentRow);
        currentRow = [span];
        currentY = span.y;
      }
    }
    if (currentRow.length > 0) rows.push(currentRow);
  });
  return rows;
}

function extractLRFromRow(row: PDFTextSpan[]): FieldConfidence | null {
  const joined = row.map(s => s.text).join(' ');
  let m = joined.match(PATTERNS.lr_no);
  if (m) {
    return { field: 'lr_no', value: m[1], confidence: 85, notes: 'Matched labeled LR pattern' };
  }
  m = joined.match(PATTERNS.lr_no_standalone);
  if (m) {
    return { field: 'lr_no', value: m[1], confidence: 55, notes: 'Matched standalone code (lower confidence)' };
  }
  return null;
}

function extractAmountFromRow(row: PDFTextSpan[]): FieldConfidence | null {
  const joined = row.map(s => s.text).join(' ');
  const m = joined.match(PATTERNS.amount);
  if (m) {
    const num = parseFloat(m[1].replace(/,/g, ''));
    if (Number.isFinite(num) && num > 0) {
      return { field: 'total', value: num, confidence: 90, notes: 'Currency symbol matched' };
    }
  }
  const numbers = joined.match(/[\d,]+(?:\.\d{1,2})?/g) ?? [];
  const valid = numbers
    .map(n => parseFloat(n.replace(/,/g, '')))
    .filter(n => Number.isFinite(n) && n > 0);
  if (valid.length > 0) {
    const max = Math.max(...valid);
    return { field: 'total', value: max, confidence: 50, notes: 'Inferred from largest number in row' };
  }
  return null;
}

function extractWeightFromRow(row: PDFTextSpan[]): FieldConfidence | null {
  const joined = row.map(s => s.text).join(' ');
  const m = joined.match(PATTERNS.weight_kg);
  if (m) {
    const num = parseFloat(m[1]);
    if (Number.isFinite(num) && num > 0) {
      return {
        field: 'transporter_declared_weight_kg', value: num,
        confidence: 75, notes: 'Kg unit matched',
      };
    }
  }
  return null;
}

function extractDateFromRow(row: PDFTextSpan[]): FieldConfidence | null {
  const joined = row.map(s => s.text).join(' ');
  const m = joined.match(PATTERNS.date_ddmmyyyy);
  if (m) {
    const [, d, mo, y] = m;
    const year = y.length === 2 ? `20${y}` : y;
    const iso = `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
    return { field: 'lr_date', value: iso, confidence: 70, notes: 'DD/MM/YYYY pattern' };
  }
  return null;
}

export async function extractInvoiceFromPDF(
  buffer: ArrayBuffer,
): Promise<ExtractionOutcome> {
  const parseResult = await parsePDFToSpans(buffer);
  if ('error' in parseResult) {
    return { ok: false, reason: 'parse_error', error: parseResult.error };
  }

  const { spans, pages } = parseResult;
  if (pages === 0) return { ok: false, reason: 'empty_pdf' };
  if (isLikelyScanned(spans, pages)) {
    return { ok: false, reason: 'scanned_pdf_not_supported' };
  }

  const headerText = spans.filter(s => s.page === 1).slice(0, 30).map(s => s.text).join(' ');
  const header: ExtractionResult['header'] = {};
  const invMatch = headerText.match(PATTERNS.invoice_no);
  if (invMatch) {
    header.invoice_no = {
      field: 'notes', value: invMatch[1], confidence: 80,
      notes: 'Invoice # from header',
    };
  }
  const dateMatch = headerText.match(PATTERNS.date_ddmmyyyy);
  if (dateMatch) {
    const [, d, mo, y] = dateMatch;
    const year = y.length === 2 ? `20${y}` : y;
    header.invoice_date = {
      field: 'lr_date',
      value: `${year}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`,
      confidence: 70,
    };
  }

  const rows = groupIntoRows(spans);
  const lines: ExtractedInvoiceLine[] = [];
  const warnings: string[] = [];

  let lineNo = 0;
  for (const row of rows) {
    const lr = extractLRFromRow(row);
    if (!lr) continue;
    lineNo++;

    const fields: FieldConfidence[] = [lr];
    const amount = extractAmountFromRow(row);
    if (amount) fields.push(amount);
    const weight = extractWeightFromRow(row);
    if (weight) fields.push(weight);
    const date = extractDateFromRow(row);
    if (date) fields.push(date);

    const criticalConfidences = fields
      .filter(f => f.field === 'lr_no' || f.field === 'total')
      .map(f => f.confidence);
    const overall = criticalConfidences.length > 0 ? Math.min(...criticalConfidences) : 0;

    if (!amount) warnings.push(`Line ${lineNo}: no amount detected for LR ${lr.value}`);

    lines.push({ line_no: lineNo, fields, overall_confidence: overall });
  }

  if (lines.length === 0) {
    warnings.push('No invoice lines detected. PDF may use unsupported format.');
  }

  return {
    ok: true, total_pages: pages, total_spans: spans.length,
    header, lines, warnings,
  };
}

/** Convert ExtractedInvoiceLine into a TransporterInvoiceLine for storage. */
export function toInvoiceLine(
  extracted: ExtractedInvoiceLine, invoiceId: string,
): Partial<TransporterInvoiceLine> {
  const getField = (f: MappableField): unknown => {
    const match = extracted.fields.find(x => x.field === f);
    return match?.value;
  };

  const lrNo = String(getField('lr_no') ?? '');
  const total = Number(getField('total') ?? 0);
  const weight = Number(getField('transporter_declared_weight_kg') ?? 0);
  const lrDate = String(getField('lr_date') ?? '');

  return {
    id: `til-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    invoice_id: invoiceId,
    line_no: extracted.line_no,
    lr_no: lrNo,
    lr_date: lrDate || null,
    transporter_declared_weight_kg: weight,
    transporter_declared_rate: 0,
    transporter_declared_amount: total,
    fuel_surcharge: 0, fov: 0, statistical: 0, cod: 0, demurrage: 0, oda: 0,
    gst_amount: 0,
    total: total,
  };
}
