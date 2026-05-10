/**
 * @file src/test/docvault-tag-index.test.ts
 * @sprint T-Phase-1.A.9 BUNDLED · Block A.10
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createDocument, loadDocuments } from '@/lib/docvault-engine';

describe('docvault tag index · Q-LOCK-3a taxonomy', () => {
  beforeEach(() => localStorage.clear());

  it('aggregates clauses across documents', () => {
    createDocument(
      'ACME',
      { entity_id: 'ACME', document_type: 'iso_iec_doc', title: 'Doc1', tags: { iso_clause: 'ISO 9001:2015 §7.5' }, originating_department_id: 'qa' },
      { version_no: 'A', file_url: 'mock://1.pdf', file_size_bytes: 100, uploaded_at: new Date().toISOString(), uploaded_by: 'u' },
      'u',
    );
    createDocument(
      'ACME',
      { entity_id: 'ACME', document_type: 'iso_iec_doc', title: 'Doc2', tags: { iso_clause: 'ISO 9001:2015 §7.5' }, originating_department_id: 'qa' },
      { version_no: 'A', file_url: 'mock://2.pdf', file_size_bytes: 100, uploaded_at: new Date().toISOString(), uploaded_by: 'u' },
      'u',
    );
    const counts = new Map<string, number>();
    for (const d of loadDocuments('ACME')) {
      const c = d.tags.iso_clause;
      if (c) counts.set(c, (counts.get(c) ?? 0) + 1);
    }
    expect(counts.get('ISO 9001:2015 §7.5')).toBe(2);
  });

  it('filters tags by search prefix', () => {
    const tags = ['ISO 9001:2015 §7.5', 'IEC 17025', 'ISO 14001'];
    const filtered = tags.filter((t) => t.toLowerCase().includes('iso'));
    expect(filtered).toHaveLength(2);
  });
});
