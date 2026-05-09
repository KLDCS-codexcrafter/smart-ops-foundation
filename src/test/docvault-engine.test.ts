/**
 * @file src/test/docvault-engine.test.ts
 * @sprint T-Phase-1.A.8.α-a-DocVault-Foundation · Block E.3
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDocument, submitVersion, approveVersion, findDocumentsByForeignKey,
} from '@/lib/docvault-engine';

describe('docvault-engine · D-NEW-CJ canonical · Q-LOCK-15 cross-card linkage', () => {
  beforeEach(() => { localStorage.clear(); });

  it('full state machine flow: draft → submitted → approved', () => {
    const doc = createDocument(
      'ACME',
      {
        entity_id: 'ACME', document_type: 'drawing', title: 'Test Drawing',
        tags: { iso_clause: 'ISO 9001:2015 §7.5.3' },
        originating_department_id: 'eng', project_id: 'PRJ-001',
      },
      {
        version_no: 'A', file_url: 'mock://test.pdf', file_size_bytes: 1024,
        uploaded_at: new Date().toISOString(), uploaded_by: 'eng-1',
      },
      'eng-1',
    );
    expect(doc.id).toBeDefined();
    expect(doc.versions[0].version_status).toBe('draft');

    const r1 = submitVersion('ACME', doc.id, 'A', 'eng-1');
    expect(r1.ok).toBe(true);
    expect(r1.document?.versions[0].version_status).toBe('submitted');

    const r2 = approveVersion('ACME', doc.id, 'A', 'mgr-1');
    expect(r2.ok).toBe(true);
    expect(r2.document?.versions[0].version_status).toBe('approved');
    expect(r2.document?.current_version).toBe('A');
  });

  it('Q-LOCK-15 · findDocumentsByForeignKey filters correctly', () => {
    createDocument(
      'ACME',
      { entity_id: 'ACME', document_type: 'drawing', title: 'D1', tags: {}, originating_department_id: 'eng', project_id: 'PRJ-001' },
      { version_no: 'A', file_url: 'mock://d1.pdf', file_size_bytes: 100, uploaded_at: new Date().toISOString(), uploaded_by: 'u1' },
      'u1',
    );
    createDocument(
      'ACME',
      { entity_id: 'ACME', document_type: 'mom', title: 'M1', tags: {}, originating_department_id: 'projx', customer_id: 'CUST-1' },
      { version_no: 'A', file_url: 'mock://m1.pdf', file_size_bytes: 100, uploaded_at: new Date().toISOString(), uploaded_by: 'u1' },
      'u1',
    );

    const projDocs = findDocumentsByForeignKey('ACME', 'project_id', 'PRJ-001');
    expect(projDocs).toHaveLength(1);
    expect(projDocs[0].title).toBe('D1');

    const custDocs = findDocumentsByForeignKey('ACME', 'customer_id', 'CUST-1');
    expect(custDocs).toHaveLength(1);
    expect(custDocs[0].title).toBe('M1');
  });
});
