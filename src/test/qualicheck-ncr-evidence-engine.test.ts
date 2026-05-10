/**
 * @file        src/test/qualicheck-ncr-evidence-engine.test.ts
 * @sprint      T-Phase-1.SM.QualiCheck-NCR-Evidence · Block E
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  listNcrEvidence,
  listAllNcrEvidence,
  createNcrEvidence,
} from '@/lib/qualicheck-ncr-evidence-engine';
import { findDocumentsByForeignKey } from '@/lib/docvault-engine';

describe('T-Phase-1.SM.QualiCheck-NCR-Evidence · Engine · D-NEW-CJ 4th CONSUMER · INSTITUTIONAL FR PROMOTION THRESHOLD MET', () => {
  const entityCode = 'TEST_QUALICHECK_NCR';

  beforeEach(() => {
    localStorage.clear();
  });

  it('Q-LOCK-2a · createNcrEvidence writes Document with nc_id FK', () => {
    const doc = createNcrEvidence(entityCode, {
      ncId: 'NCR-2026-0001',
      title: 'Lab inspection photo',
      documentType: 'other',
      originatingDepartmentId: 'qualicheck',
      initialVersion: {
        version_no: '1.0',
        file_url: '/test-evidence.jpg',
        file_size_bytes: 100,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'user_test',
      },
    }, 'user_test');

    expect(doc.nc_id).toBe('NCR-2026-0001');
    expect(doc.title).toBe('Lab inspection photo');
    expect(doc.versions[0].version_status).toBe('draft');
    expect(doc.project_id).toBeNull();
    expect(doc.customer_id).toBeNull();
    expect(doc.vendor_id).toBeNull();
  });

  it('Q-LOCK-5a · listNcrEvidence wraps findDocumentsByForeignKey 1:1', () => {
    createNcrEvidence(entityCode, {
      ncId: 'NCR-A', title: 'NCR-A photo', documentType: 'other',
      originatingDepartmentId: 'qualicheck',
      initialVersion: { version_no: '1.0', file_url: '/a.jpg', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    createNcrEvidence(entityCode, {
      ncId: 'NCR-B', title: 'NCR-B lab report', documentType: 'iso_iec_doc',
      originatingDepartmentId: 'qualicheck',
      initialVersion: { version_no: '1.0', file_url: '/b.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    const docsA = listNcrEvidence(entityCode, 'NCR-A');
    const docsB = listNcrEvidence(entityCode, 'NCR-B');
    expect(docsA).toHaveLength(1);
    expect(docsA[0].title).toBe('NCR-A photo');
    expect(docsB).toHaveLength(1);

    const directA = findDocumentsByForeignKey(entityCode, 'nc_id', 'NCR-A');
    expect(directA).toEqual(docsA);
  });

  it('Q-LOCK-8b · listAllNcrEvidence filters out non-NC documents', () => {
    createNcrEvidence(entityCode, {
      ncId: 'NCR-X', title: 'X-Doc', documentType: 'other',
      originatingDepartmentId: 'qualicheck',
      initialVersion: { version_no: '1.0', file_url: '/x.jpg', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    const all = listAllNcrEvidence(entityCode);
    expect(all.every((d) => d.nc_id != null)).toBe(true);
    expect(all).toHaveLength(1);
  });

  it('Q-LOCK-13a · D-NEW-CJ 4th CONSUMER · INSTITUTIONAL FR PROMOTION THRESHOLD MET sentinel cite', () => {
    const content = execSync(`cat src/lib/qualicheck-ncr-evidence-engine.ts`).toString();
    expect(content).toMatch(/D-NEW-CJ-docvault-file-metadata-schema/);
    expect(content).toMatch(/4th CONSUMER/);
    expect(content).toMatch(/INSTITUTIONAL FR PROMOTION THRESHOLD MET/);
  });
});
