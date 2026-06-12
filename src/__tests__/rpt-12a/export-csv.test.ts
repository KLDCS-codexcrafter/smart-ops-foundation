/**
 * @file        export-csv.test.ts
 * @sprint      RPT-12a · Block 2 · CSV utility
 */
import { describe, it, expect } from 'vitest';
import { toCsv, parseCsv } from '@/lib/report-framework/export-csv';

describe('RPT-12a · export-csv', () => {
  it('builds header from row keys when columns omitted', () => {
    const csv = toCsv([{ a: 1, b: 2 }]);
    expect(csv.split('\r\n')[0]).toBe('"a","b"');
  });

  it('escapes embedded quotes by doubling', () => {
    const csv = toCsv([{ x: 'he said "hi"' }]);
    expect(csv).toContain('"he said ""hi"""');
  });

  it('quotes commas, newlines, and quotes safely', () => {
    const csv = toCsv([{ s: 'a,b\nc' }]);
    const parsed = parseCsv(csv);
    expect(parsed[1][0]).toBe('a,b\nc');
  });

  it('round-trips numeric and string values', () => {
    const rows = [{ a: 'x', b: 10 }, { a: 'y', b: 20 }];
    const parsed = parseCsv(toCsv(rows));
    expect(parsed[0]).toEqual(['a', 'b']);
    expect(parsed[1]).toEqual(['x', '10']);
    expect(parsed[2]).toEqual(['y', '20']);
  });

  it('empty rows + empty columns → empty string', () => {
    expect(toCsv([])).toBe('');
  });

  it('uses provided column labels', () => {
    const csv = toCsv([{ k: 1 }], [{ key: 'k', label: 'Key' }]);
    expect(csv.split('\r\n')[0]).toBe('"Key"');
  });
});
