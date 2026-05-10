/**
 * @file        src/test/engineeringx-fr73-consumer.test.ts
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-14a · Block I.3 · FR-73 5th consumer registration tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  listDrawingsByProject, createDrawing,
} from '@/lib/engineeringx-engine';
import { findDocumentsByForeignKey } from '@/lib/docvault-engine';

describe('T-Phase-1.A.11 · FR-73 5th consumer · institutional pattern compliance', () => {
  const entityCode = 'TEST_ENGX_FR73';
  beforeEach(() => { localStorage.clear(); });

  it('FR-73 · sentinel cite preserved in engineeringx-engine.ts (5th consumer)', () => {
    const content = execSync('cat src/lib/engineeringx-engine.ts').toString();
    expect(content).toMatch(/FR-73/);
    expect(content).toMatch(/5th CONSUMER|5th consumer/);
  });

  it('FR-73 · Hub-and-Spoke equivalence · listDrawingsByProject wraps findDocumentsByForeignKey 1:1', () => {
    createDrawing(entityCode, {
      drawing_no: 'D1', title: 'Assembly 1', drawing_type: 'assembly',
      related_project_id: 'PRJ-1',
      originating_department_id: 'engineering',
      initial_version: {
        version_no: '1.0', file_url: '[JWT] /api/files/d1.pdf',
        file_size_bytes: 1024, uploaded_at: '2026-05-01', uploaded_by: 'u1',
      },
    }, 'u1');

    const directDocs = findDocumentsByForeignKey(entityCode, 'project_id', 'PRJ-1')
      .filter((d) => d.document_type === 'drawing');
    const spokeDocs = listDrawingsByProject(entityCode, 'PRJ-1');

    expect(spokeDocs).toEqual(directDocs);
  });

  it('FR-73 · createDrawing writes DocVault Document with document_type: "drawing"', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'D-001', title: 'Test', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: {
        version_no: '1.0', file_url: '[JWT] /api/files/test.pdf',
        file_size_bytes: 2048, uploaded_at: '2026-05-01', uploaded_by: 'u1',
      },
    }, 'u1');

    expect(drw.document_type).toBe('drawing');
    expect(drw.tags?.custom_tags).toContain('drawing_no:D-001');
    expect(drw.tags?.custom_tags).toContain('drawing_subtype:part');
  });

  it('FR-73 · 5th consumer NO direct localStorage access for engineeringx_drawings (Hub-and-Spoke)', () => {
    const content = execSync('cat src/lib/engineeringx-engine.ts').toString();
    expect(content).not.toMatch(/localStorage\.(setItem|getItem)/);
  });

  it('FR-73 · 5th consumer uses canonical DocVault APIs', () => {
    const content = execSync('cat src/lib/engineeringx-engine.ts').toString();
    expect(content).toMatch(/from '@\/lib\/docvault-engine'/);
    expect(content).toMatch(/findDocumentsByForeignKey/);
    expect(content).toMatch(/createDocument/);
  });

  it('D-NEW-CO drawing version supersession · canonical workflow delegated to DocVault', () => {
    const content = execSync('cat src/lib/engineeringx-engine.ts').toString();
    expect(content).toMatch(/D-NEW-CO/);
    expect(content).toMatch(/approveVersion/);
  });
});
