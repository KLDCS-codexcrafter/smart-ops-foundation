/**
 * @file        src/test/projx-documents-engine.test.ts
 * @purpose     Projx documents engine tests · D-NEW-CJ Hub-and-Spoke 2nd consumer verification
 * @sprint      T-Phase-1.SM.ProjX-Documents · Q-LOCK-14a · Block F
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  listProjectDocuments,
  listAllProjectDocuments,
  createProjectDocument,
} from '@/lib/projx-documents-engine';
import { findDocumentsByForeignKey } from '@/lib/docvault-engine';

describe('T-Phase-1.SM.ProjX-Documents · Engine · D-NEW-CJ Hub-and-Spoke 2nd consumer', () => {
  const entityCode = 'TEST_PROJX_DOCS';

  beforeEach(() => {
    localStorage.clear();
  });

  it('Q-LOCK-2a · createProjectDocument writes Document with project_id FK', () => {
    const doc = createProjectDocument(entityCode, {
      projectId: 'proj_001',
      title: 'Test Drawing',
      documentType: 'drawing',
      originatingDepartmentId: 'projx',
      initialVersion: {
        version_no: '1.0',
        file_url: '/test.pdf',
        file_size_bytes: 100,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'user_test',
      },
    }, 'user_test');

    expect(doc.project_id).toBe('proj_001');
    expect(doc.title).toBe('Test Drawing');
    expect(doc.versions[0].version_status).toBe('draft');
    expect(doc.customer_id).toBeNull();
    expect(doc.vendor_id).toBeNull();
  });

  it('Q-LOCK-5a · listProjectDocuments uses findDocumentsByForeignKey (D-NEW-CJ canonical)', () => {
    createProjectDocument(entityCode, {
      projectId: 'proj_A', title: 'Doc A', documentType: 'drawing',
      originatingDepartmentId: 'projx',
      initialVersion: { version_no: '1.0', file_url: '/a.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    createProjectDocument(entityCode, {
      projectId: 'proj_B', title: 'Doc B', documentType: 'mom',
      originatingDepartmentId: 'projx',
      initialVersion: { version_no: '1.0', file_url: '/b.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    const docsA = listProjectDocuments(entityCode, 'proj_A');
    const docsB = listProjectDocuments(entityCode, 'proj_B');
    expect(docsA).toHaveLength(1);
    expect(docsA[0].title).toBe('Doc A');
    expect(docsB).toHaveLength(1);

    const directA = findDocumentsByForeignKey(entityCode, 'project_id', 'proj_A');
    expect(directA).toEqual(docsA);
  });

  it('Q-LOCK-8b · listAllProjectDocuments filters out non-project documents', () => {
    createProjectDocument(entityCode, {
      projectId: 'proj_X', title: 'P-Doc', documentType: 'drawing',
      originatingDepartmentId: 'projx',
      initialVersion: { version_no: '1.0', file_url: '/x.pdf', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    const all = listAllProjectDocuments(entityCode);
    expect(all.every((d) => d.project_id != null)).toBe(true);
    expect(all).toHaveLength(1);
  });

  it('Q-LOCK-13a · D-NEW-CJ pattern reuse · 2nd consumer institutional crystallization (sentinel · cite preserved)', () => {
    const content = execSync('cat src/lib/projx-documents-engine.ts').toString();
    expect(content).toMatch(/D-NEW-CJ-docvault-file-metadata-schema/);
    expect(content).toMatch(/2nd CONSUMER/);
  });
});
