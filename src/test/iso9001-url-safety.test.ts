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

const ENTITY = 'TEST_ISO_T3';
const USER = 'iso_user';

beforeEach(() => { localStorage.clear(); });

describe('iso9001-engine · register coverage (T3 Block D)', () => {
  it('linkRecordToIso9001Doc is idempotent (linking same {type,id} twice keeps one)', () => {
    const doc = createIso9001Doc(ENTITY, USER, {
      entity_id: ENTITY, clause: '8_operation', title: 'Idem',
      description: null, audit_date: '2026-05-09', auditor: 'A',
      document_url: 'https://x.test/a.pdf', linked_records: [],
    })!;
    linkRecordToIso9001Doc(ENTITY, doc.id, { type: 'ncr', id: 'NCR-1' });
    const after = linkRecordToIso9001Doc(ENTITY, doc.id, { type: 'ncr', id: 'NCR-1' });
    expect(after?.linked_records.length).toBe(1);
  });

  it('filterIso9001Docs honors clause filter, date range, linkedType, and search', () => {
    createIso9001Doc(ENTITY, USER, {
      entity_id: ENTITY, clause: '8_operation', title: 'Process Audit',
      description: 'ops', audit_date: '2026-03-15', auditor: 'Asha',
      document_url: 'https://x.test/op.pdf',
      linked_records: [{ type: 'ncr', id: 'NCR-A' }],
    });
    createIso9001Doc(ENTITY, USER, {
      entity_id: ENTITY, clause: '9_performance', title: 'KPI Review',
      description: null, audit_date: '2026-04-20', auditor: 'Bina',
      document_url: 'https://x.test/kpi.pdf', linked_records: [],
    });
    createIso9001Doc(ENTITY, USER, {
      entity_id: ENTITY, clause: '10_improvement', title: 'CAPA Effectiveness',
      description: null, audit_date: '2026-05-01', auditor: 'Chetan',
      document_url: 'https://x.test/capa.pdf',
      linked_records: [{ type: 'capa', id: 'CAPA-Z' }],
    });
    expect(filterIso9001Docs(ENTITY, { clause: ['8_operation'] }).length).toBe(1);
    expect(filterIso9001Docs(ENTITY, { fromDate: '2026-04-01', toDate: '2026-04-30' }).length).toBe(1);
    expect(filterIso9001Docs(ENTITY, { linkedType: 'capa' }).length).toBe(1);
    expect(filterIso9001Docs(ENTITY, { search: 'kpi' }).length).toBe(1);
  });

  it('getIso9001DocById returns null for non-existent id', () => {
    expect(getIso9001DocById(ENTITY, 'ISO-NONE')).toBeNull();
  });
});
