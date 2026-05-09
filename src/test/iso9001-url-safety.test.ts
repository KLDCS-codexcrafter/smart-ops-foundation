/**
 * @file        src/test/iso9001-url-safety.test.ts
 * @purpose     URL safety + link parser + register-engine coverage tests for ISO 9001
 * @sprint      T-Phase-1.A.5.c-T3-AuditFix · Block A + Block D
 * @decisions   D-NEW-BU (URL allowlist) · D-NEW-CB (parser extracted) · D-NEW-CA (silent-drop)
 * @disciplines FR-21 · FR-30 · FR-32
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  isSafeHttpUrl, createIso9001Doc, linkRecordToIso9001Doc,
  filterIso9001Docs, getIso9001DocById,
} from '@/lib/iso9001-engine';
import { parseLinkedRecordsTextarea } from '@/lib/iso9001-link-parser';

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
