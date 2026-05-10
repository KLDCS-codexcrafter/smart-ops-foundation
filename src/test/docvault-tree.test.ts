/**
 * @file src/test/docvault-tree.test.ts
 * @sprint T-Phase-1.A.9 BUNDLED · Block A.10
 */
import { describe, it, expect } from 'vitest';
import { buildVersionTree } from '@/pages/erp/docvault/registers/DrawingRegisterTree';
import type { DocumentVersion } from '@/types/docvault';

const v = (no: string, supersedes?: string): DocumentVersion => ({
  version_no: no,
  version_status: 'approved',
  file_url: `mock://${no}.pdf`,
  file_size_bytes: 100,
  uploaded_at: new Date().toISOString(),
  uploaded_by: 'u1',
  supersedes_version: supersedes,
});

describe('docvault tree · D-NEW-CL canonical', () => {
  it('builds parent/child tree from supersedes_version', () => {
    const tree = buildVersionTree([v('A'), v('B', 'A'), v('C', 'B')]);
    expect(tree).toHaveLength(1);
    expect(tree[0].version.version_no).toBe('A');
    expect(tree[0].children[0].version.version_no).toBe('B');
    expect(tree[0].children[0].children[0].version.version_no).toBe('C');
  });

  it('orphan supersedes_version becomes a root', () => {
    const tree = buildVersionTree([v('A'), v('B', 'NONEXISTENT')]);
    expect(tree).toHaveLength(2);
  });
});
