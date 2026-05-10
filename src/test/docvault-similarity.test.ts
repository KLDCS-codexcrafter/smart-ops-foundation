/**
 * @file src/test/docvault-similarity.test.ts
 * @sprint T-Phase-1.A.9 BUNDLED · Block A.10
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { findDuplicates, findSimilar } from '@/lib/docvault-similarity-engine';
import { createDocument } from '@/lib/docvault-engine';

describe('docvault similarity engine · Q-LOCK-4a', () => {
  beforeEach(() => localStorage.clear());

  it('findDuplicates groups by file_hash', () => {
    createDocument(
      'ACME',
      { entity_id: 'ACME', document_type: 'drawing', title: 'D1', tags: {}, originating_department_id: 'eng' },
      { version_no: 'A', file_url: 'mock://1.pdf', file_size_bytes: 100, uploaded_at: new Date().toISOString(), uploaded_by: 'u1', file_hash: 'abc123' },
      'u1',
    );
    createDocument(
      'ACME',
      { entity_id: 'ACME', document_type: 'drawing', title: 'D2', tags: {}, originating_department_id: 'eng' },
      { version_no: 'A', file_url: 'mock://2.pdf', file_size_bytes: 100, uploaded_at: new Date().toISOString(), uploaded_by: 'u2', file_hash: 'abc123' },
      'u2',
    );
    const groups = findDuplicates('ACME');
    expect(groups).toHaveLength(1);
    expect(groups[0].documents).toHaveLength(2);
  });

  it('findSimilar returns empty in Phase 1 mock', () => {
    expect(findSimilar('ACME', 'doc-1')).toEqual([]);
  });
});
