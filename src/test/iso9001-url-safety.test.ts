/**
 * @file src/test/iso9001-url-safety.test.ts
 * @sprint T-Phase-1.A.5.c-T2-AuditFix · Block I
 * @decisions D-NEW-BU (URL allowlist · javascript:/data:/file: rejected)
 */
import { describe, it, expect } from 'vitest';
import { isSafeHttpUrl } from '@/lib/iso9001-engine';
import { parseLinkedRecordsTextarea } from '@/pages/erp/qulicheak/Iso9001Capture';

describe('iso9001 · URL safety + linked-records parser (Block I)', () => {
  it('isSafeHttpUrl accepts http/https and rejects dangerous schemes', () => {
    expect(isSafeHttpUrl('https://docs.company.com/audit.pdf')).toBe(true);
    expect(isSafeHttpUrl('http://intranet/file')).toBe(true);
    expect(isSafeHttpUrl('javascript:alert(1)')).toBe(false);
    expect(isSafeHttpUrl('data:text/html,<script>')).toBe(false);
    expect(isSafeHttpUrl('file:///etc/passwd')).toBe(false);
    expect(isSafeHttpUrl('not-a-url')).toBe(false);
    expect(isSafeHttpUrl('')).toBe(false);
  });

  it('parseLinkedRecordsTextarea drops invalid entries silently', () => {
    const out = parseLinkedRecordsTextarea('ncr:NCR-1, capa:CAPA-2, bogus:X-3, mtc:, fai:FAI-9');
    expect(out).toEqual([
      { type: 'ncr', id: 'NCR-1' },
      { type: 'capa', id: 'CAPA-2' },
      { type: 'fai', id: 'FAI-9' },
    ]);
  });

  it('parseLinkedRecordsTextarea returns [] for empty/blank input', () => {
    expect(parseLinkedRecordsTextarea('')).toEqual([]);
    expect(parseLinkedRecordsTextarea('   ,  ,  ')).toEqual([]);
  });
});
