/**
 * bulk-paste-engine · Sprint T-Phase-2.7-d-2 · Q3-d format auto-detection + Q2-d hybrid trigger
 *
 * Accepts TSV (raw Excel paste) · CSV · JSON array.
 * Auto-detects format by header row OR first-line analysis.
 * Resolves item_id + HSN + rate from item master via existing findItemByName helper (2.7-a-fix).
 *
 * [JWT] No remote calls · operates on clipboard text + local item master.
 */
import { findItemByName, resolveHSNForItem } from '@/lib/hsn-resolver';

export type PasteFormat = 'tsv' | 'csv' | 'json' | 'unknown';

export interface PasteRow {
  item_name: string;
  qty: number;
  rate: number;
  uom?: string;
  hsn_sac_code?: string;
  description?: string;
  matched: boolean;
  matched_item_id?: string;
  resolved_hsn?: string;
  resolved_gst_rate?: number;
  warnings: string[];
}

export interface PasteParseResult {
  format: PasteFormat;
  totalLines: number;
  rows: PasteRow[];
  matchedCount: number;
  unmatchedCount: number;
  errors: string[];
}

const HEADER_KEYWORDS = ['item', 'name', 'code', 'qty', 'quantity', 'rate', 'price', 'uom', 'unit', 'hsn', 'sac', 'gst', 'description', 'desc'];

export function detectPasteFormat(rawText: string): PasteFormat {
  const t = (rawText ?? '').trim();
  if (!t) return 'unknown';
  if (t.startsWith('[')) {
    try {
      const parsed = JSON.parse(t);
      if (Array.isArray(parsed)) return 'json';
    } catch {
      /* not json */
    }
  }
  const firstLine = t.split(/\r?\n/)[0] ?? '';
  if (firstLine.includes('\t')) return 'tsv';
  if (firstLine.includes(',')) return 'csv';
  return 'unknown';
}

export function shouldAutoTriggerBulkPaste(rawText: string): boolean {
  const t = (rawText ?? '').trim();
  if (!t) return false;
  const lines = t.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 3) return false;
  return lines.some((l) => l.includes('\t') || l.includes(','));
}

function splitLine(line: string, sep: string): string[] {
  if (sep !== ',') return line.split(sep);
  // Minimal CSV with quote handling
  const out: string[] = [];
  let cur = '';
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cur += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ',') { out.push(cur); cur = ''; }
      else cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function isHeaderRow(cells: string[]): boolean {
  const lower = cells.map((c) => c.trim().toLowerCase());
  let hits = 0;
  for (const c of lower) {
    if (HEADER_KEYWORDS.some((k) => c === k || c.includes(k))) hits++;
  }
  return hits >= 2;
}

const COLUMN_ALIASES: Record<string, keyof PasteRow> = {
  item: 'item_name', item_name: 'item_name', name: 'item_name', product: 'item_name',
  qty: 'qty', quantity: 'qty', q: 'qty',
  rate: 'rate', price: 'rate', unit_price: 'rate',
  uom: 'uom', unit: 'uom',
  hsn: 'hsn_sac_code', sac: 'hsn_sac_code', hsn_code: 'hsn_sac_code', hsn_sac: 'hsn_sac_code', hsn_sac_code: 'hsn_sac_code',
  description: 'description', desc: 'description', remarks: 'description',
};

function aliasFor(header: string): keyof PasteRow | null {
  const k = header.trim().toLowerCase().replace(/\s+/g, '_');
  return COLUMN_ALIASES[k] ?? null;
}

function parseDelimited(text: string, sep: string, entityCode: string): { rows: PasteRow[]; totalLines: number; errors: string[] } {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  const errors: string[] = [];
  if (lines.length === 0) return { rows: [], totalLines: 0, errors };

  const firstCells = splitLine(lines[0], sep);
  const hasHeader = isHeaderRow(firstCells);
  let columnMap: Array<keyof PasteRow | null>;
  let dataStart = 0;

  if (hasHeader) {
    columnMap = firstCells.map(aliasFor);
    dataStart = 1;
  } else {
    // default: item_name, qty, rate, uom, hsn_sac_code, description
    const def: Array<keyof PasteRow> = ['item_name', 'qty', 'rate', 'uom', 'hsn_sac_code', 'description'];
    columnMap = firstCells.map((_, i) => def[i] ?? null);
  }

  const rows: PasteRow[] = [];
  for (let i = dataStart; i < lines.length; i++) {
    const cells = splitLine(lines[i], sep);
    const row: PasteRow = { item_name: '', qty: 0, rate: 0, matched: false, warnings: [] };
    for (let c = 0; c < cells.length; c++) {
      const target = columnMap[c];
      if (!target) continue;
      const val = cells[c].trim();
      if (target === 'qty' || target === 'rate') {
        const n = parseFloat(val.replace(/,/g, ''));
        if (Number.isFinite(n)) (row as Record<string, unknown>)[target] = n;
      } else if (target === 'matched' || target === 'warnings') {
        // ignore · derived
      } else {
        (row as Record<string, unknown>)[target] = val;
      }
    }
    if (!row.item_name) row.warnings.push('Missing item name');
    if (!(row.qty > 0)) row.warnings.push('Missing or invalid qty');
    if (!(row.rate >= 0)) row.warnings.push('Missing or invalid rate');
    if (row.qty < 0) row.warnings.push('Negative qty');
    if (row.rate < 0) row.warnings.push('Negative rate');

    // Resolve from master
    if (row.item_name) {
      const master = findItemByName(row.item_name, entityCode);
      if (master) {
        row.matched = true;
        const id = master.id ?? master.item_id;
        if (typeof id === 'string') row.matched_item_id = id;
        const hsn = resolveHSNForItem(master, entityCode);
        if (hsn.hsn_sac_code) {
          row.resolved_hsn = hsn.hsn_sac_code;
          if (!row.hsn_sac_code) row.hsn_sac_code = hsn.hsn_sac_code;
        }
        if (hsn.gst_rate) row.resolved_gst_rate = hsn.gst_rate;
      } else {
        row.warnings.push('Item not found in master');
      }
    }
    rows.push(row);
  }
  return { rows, totalLines: lines.length, errors };
}

function parseJsonArray(text: string, entityCode: string): { rows: PasteRow[]; totalLines: number; errors: string[] } {
  const errors: string[] = [];
  let arr: unknown;
  try { arr = JSON.parse(text); } catch (err) {
    errors.push(`Invalid JSON: ${err instanceof Error ? err.message : 'parse error'}`);
    return { rows: [], totalLines: 0, errors };
  }
  if (!Array.isArray(arr)) {
    errors.push('JSON is not an array');
    return { rows: [], totalLines: 0, errors };
  }
  const rows: PasteRow[] = [];
  for (const raw of arr) {
    if (!raw || typeof raw !== 'object') continue;
    const o = raw as Record<string, unknown>;
    const row: PasteRow = {
      item_name: typeof o.item_name === 'string' ? o.item_name : (typeof o.name === 'string' ? o.name : ''),
      qty: typeof o.qty === 'number' ? o.qty : (typeof o.quantity === 'number' ? o.quantity : 0),
      rate: typeof o.rate === 'number' ? o.rate : (typeof o.price === 'number' ? o.price : 0),
      uom: typeof o.uom === 'string' ? o.uom : undefined,
      hsn_sac_code: typeof o.hsn_sac_code === 'string' ? o.hsn_sac_code : (typeof o.hsn === 'string' ? o.hsn : undefined),
      description: typeof o.description === 'string' ? o.description : undefined,
      matched: false, warnings: [],
    };
    if (!row.item_name) row.warnings.push('Missing item name');
    if (!(row.qty > 0)) row.warnings.push('Missing or invalid qty');
    if (!(row.rate >= 0)) row.warnings.push('Missing or invalid rate');
    if (row.item_name) {
      const master = findItemByName(row.item_name, entityCode);
      if (master) {
        row.matched = true;
        const id = master.id ?? master.item_id;
        if (typeof id === 'string') row.matched_item_id = id;
        const hsn = resolveHSNForItem(master, entityCode);
        if (hsn.hsn_sac_code) {
          row.resolved_hsn = hsn.hsn_sac_code;
          if (!row.hsn_sac_code) row.hsn_sac_code = hsn.hsn_sac_code;
        }
        if (hsn.gst_rate) row.resolved_gst_rate = hsn.gst_rate;
      } else {
        row.warnings.push('Item not found in master');
      }
    }
    rows.push(row);
  }
  return { rows, totalLines: arr.length, errors };
}

export function parseBulkPaste(rawText: string, entityCode: string): PasteParseResult {
  const fmt = detectPasteFormat(rawText);
  let parsed: { rows: PasteRow[]; totalLines: number; errors: string[] };
  if (fmt === 'tsv') parsed = parseDelimited(rawText, '\t', entityCode);
  else if (fmt === 'csv') parsed = parseDelimited(rawText, ',', entityCode);
  else if (fmt === 'json') parsed = parseJsonArray(rawText, entityCode);
  else parsed = { rows: [], totalLines: 0, errors: ['Unrecognized paste format'] };

  const matchedCount = parsed.rows.filter((r) => r.matched).length;
  const unmatchedCount = parsed.rows.length - matchedCount;
  return {
    format: fmt,
    totalLines: parsed.totalLines,
    rows: parsed.rows,
    matchedCount,
    unmatchedCount,
    errors: parsed.errors,
  };
}
