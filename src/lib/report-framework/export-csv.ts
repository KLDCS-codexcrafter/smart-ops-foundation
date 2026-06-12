/**
 * @file        export-csv.ts
 * @sprint      RPT-12a · Block 2 · Shared CSV export utility
 * @purpose     React-free, dependency-free CSV builder + browser download helper.
 *              Used by ReportBuilder preview + the 6 RPT-10 cockpit pages.
 *
 * Rules: no engine import, no business logic. Pure string assembly + a Blob link
 * download (the ONLY DOM API touched).
 */

export interface CsvColumn {
  key: string;
  label?: string;
}

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  let s: string;
  if (typeof value === 'string') s = value;
  else if (typeof value === 'number' || typeof value === 'boolean') s = String(value);
  else {
    try { s = JSON.stringify(value); } catch { s = String(value); }
  }
  // Always quote; double inner quotes (RFC 4180).
  const escaped = s.replace(/"/g, '""');
  return `"${escaped}"`;
}

/** Build a CSV string from rows. Columns inferred from first row when omitted. */
export function toCsv(
  rows: ReadonlyArray<Record<string, unknown>>,
  columns?: ReadonlyArray<CsvColumn>,
): string {
  if (rows.length === 0 && (!columns || columns.length === 0)) return '';
  const cols: CsvColumn[] = columns?.length
    ? [...columns]
    : Object.keys(rows[0] ?? {}).map((k) => ({ key: k }));

  const header = cols.map((c) => escapeCell(c.label ?? c.key)).join(',');
  const body = rows
    .map((r) => cols.map((c) => escapeCell(r[c.key])).join(','))
    .join('\r\n');
  return body ? `${header}\r\n${body}` : header;
}

/** Parse a CSV produced by toCsv. Used by tests for round-trip checks. */
export function parseCsv(text: string): string[][] {
  const out: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cur += '"'; i++; }
        else { inQuotes = false; }
      } else {
        cur += ch;
      }
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ',') { row.push(cur); cur = ''; }
      else if (ch === '\r') { /* ignore */ }
      else if (ch === '\n') { row.push(cur); out.push(row); row = []; cur = ''; }
      else cur += ch;
    }
  }
  if (cur.length > 0 || row.length > 0) { row.push(cur); out.push(row); }
  return out;
}

/** Trigger a CSV download in the browser. Safe no-op when document is missing. */
export function downloadCsv(
  filename: string,
  rows: ReadonlyArray<Record<string, unknown>>,
  columns?: ReadonlyArray<CsvColumn>,
): void {
  const csv = toCsv(rows, columns);
  if (typeof document === 'undefined' || typeof URL === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
