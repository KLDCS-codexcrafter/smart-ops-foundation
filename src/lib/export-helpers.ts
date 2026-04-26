/**
 * @file     export-helpers.ts
 * @purpose  Low-level export utilities shared across voucher-export-engine and any future export caller. Download blob, CSV cell escape, filename templates.
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 * @when     Created Apr-2026 · T10-pre.2c
 * @sprint   T10-pre.2c
 * @iso      Maintainability (HIGH — single place for blob + CSV escape) · Reliability (HIGH — deterministic)
 * @whom     voucher-export-engine · any future exporter (registers, reports)
 * @depends  — (pure DOM + String utilities, no third-party)
 * @consumers voucher-export-engine.ts
 */

/**
 * @purpose   Trigger a browser download of the given Blob with the given filename.
 * @param     blob — file content as a Blob (text/csv, application/vnd.openxmlformats, etc.)
 * @param     filename — file name shown in browser's download prompt
 * @why-this-approach  [Convergent] One function used by all exporters. Matches the pattern
 *                     already used in gst-portal-service.ts and PayrollProcessing.tsx.
 * @iso       Reliability (HIGH — revokes ObjectURL after click to prevent leak)
 * @example
 *   downloadBlob(new Blob(['hello'], { type: 'text/plain' }), 'test.txt');
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // [Critical] Revoke after microtask to ensure download started. Prevents memory leak.
  setTimeout(() => URL.revokeObjectURL(url), 100);
}

/**
 * @purpose   Escape a cell value for CSV per RFC 4180 — quote if contains comma/quote/newline, double any embedded quotes.
 * @param     value — any value (null/undefined become empty string, numbers/dates get String()'d)
 * @returns   CSV-safe string, including wrapping quotes if needed
 * @why-this-approach  [Critical] Manual implementation rather than pulling Papa Parse for one function.
 *                     Papa is great for parsing CSV (complex); writing CSV is trivial when escape is right.
 * @iso       Reliability (HIGH — handles all edge cases: null, comma, quote, newline, number)
 * @example
 *   csvEscapeCell('Hello, World')  →  '"Hello, World"'
 *   csvEscapeCell('She said "hi"') →  '"She said ""hi"""'
 *   csvEscapeCell(1234.5)          →  '1234.5'
 *   csvEscapeCell(null)            →  ''
 */
export function csvEscapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * @purpose   Build a standardized export filename: '<voucher_type>_<voucher_no>_<YYYY-MM-DD>.<ext>'.
 *            Sanitizes voucher_no (replace / \ : * ? " < > | with _).
 * @param     voucherType — human-readable voucher type (e.g. 'Sales Invoice')
 * @param     voucherNo — voucher number (e.g. 'INV-2026-0012')
 * @param     ext — file extension WITHOUT dot ('csv', 'xlsx', 'pdf')
 * @returns   Sanitized filename
 * @iso       Maintainability (HIGH — consistent naming across all exports)
 * @example
 *   buildExportFilename('Sales Invoice', 'INV/2026/0012', 'xlsx')
 *     → 'Sales_Invoice_INV_2026_0012_2026-04-23.xlsx'
 */
export function buildExportFilename(voucherType: string, voucherNo: string, ext: string): string {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const safeType = voucherType.replace(/[^A-Za-z0-9]/g, '_');
  const safeNo = voucherNo.replace(/[/\\:*?"<>|\s]/g, '_');
  return `${safeType}_${safeNo}_${today}.${ext}`;
}
