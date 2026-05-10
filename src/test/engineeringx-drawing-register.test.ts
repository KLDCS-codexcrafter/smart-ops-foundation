/**
 * @file        src/test/engineeringx-drawing-register.test.ts
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-14a · Block I.2
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  createDrawing, listDrawings, listDrawingsByProject,
  submitDrawingVersion, approveDrawingVersion, listDrawingsByStatus,
  listDrawingVersions,
} from '@/lib/engineeringx-engine';
import { parseDrawingCustomTags, buildDrawingCustomTags } from '@/types/engineering-drawing';

describe('T-Phase-1.A.11 · DrawingRegister + DrawingEntry + workflow · panel-level', () => {
  const entityCode = 'TEST_ENGX_PANEL';
  beforeEach(() => { localStorage.clear(); });

  const initialVersion = {
    version_no: '1.0',
    file_url: '[JWT] /api/files/x.pdf',
    file_size_bytes: 100,
    uploaded_at: '2026-05-01',
    uploaded_by: 'u',
  };

  it('listDrawings returns empty by default', () => {
    expect(listDrawings(entityCode)).toEqual([]);
  });

  it('Drawing Entry workflow: create → submit → approve via DocVault canonical', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'P-100', title: 'Panel test', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: initialVersion,
    }, 'u');
    expect(listDrawingsByStatus(entityCode, 'draft')).toHaveLength(1);
    submitDrawingVersion(entityCode, drw.id, '1.0', 'u');
    expect(listDrawingsByStatus(entityCode, 'submitted')).toHaveLength(1);
    approveDrawingVersion(entityCode, drw.id, '1.0', 'approver');
    expect(listDrawingsByStatus(entityCode, 'approved')).toHaveLength(1);
  });

  it('Project filter limits results to project FK', () => {
    createDrawing(entityCode, {
      drawing_no: 'A', title: 'a', drawing_type: 'part', related_project_id: 'PR-A',
      originating_department_id: 'engineering', initial_version: initialVersion,
    }, 'u');
    createDrawing(entityCode, {
      drawing_no: 'B', title: 'b', drawing_type: 'part', related_project_id: 'PR-B',
      originating_department_id: 'engineering', initial_version: initialVersion,
    }, 'u');
    expect(listDrawingsByProject(entityCode, 'PR-A')).toHaveLength(1);
    expect(listDrawingsByProject(entityCode, 'PR-B')).toHaveLength(1);
  });

  it('buildDrawingCustomTags + parseDrawingCustomTags round-trip', () => {
    const tags = buildDrawingCustomTags({ drawing_no: 'X-1', drawing_subtype: 'civil' });
    expect(tags).toContain('drawing_no:X-1');
    const parsed = parseDrawingCustomTags(tags);
    expect(parsed.drawing_no).toBe('X-1');
    expect(parsed.drawing_subtype).toBe('civil');
  });

  it('listDrawingVersions delegates to DocVault canonical loadVersions', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'V-1', title: 'v', drawing_type: 'part',
      originating_department_id: 'engineering', initial_version: initialVersion,
    }, 'u');
    const vs = listDrawingVersions(entityCode, drw.id);
    expect(vs).toHaveLength(1);
    expect(vs[0].version_no).toBe('1.0');
  });

  it('DrawingEntry panel uses D-NEW-CE FormCarryForwardKit (15th consumer cite)', () => {
    const content = execSync('cat src/pages/erp/engineeringx/transactions/DrawingEntry.tsx').toString();
    expect(content).toMatch(/useFormCarryForwardChecklist/);
    expect(content).toMatch(/D-NEW-CE/);
    expect(content).toMatch(/15th consumer/);
  });

  it('DrawingRegister panel reuses useProjects hook (ProjX zero-touch)', () => {
    const content = execSync('cat src/pages/erp/engineeringx/transactions/DrawingRegister.tsx').toString();
    expect(content).toMatch(/from '@\/hooks\/useProjects'/);
    expect(content).toMatch(/listDrawingsByProject/);
  });

  it('Approvals panel uses canonical approve/reject wrappers', () => {
    const content = execSync('cat src/pages/erp/engineeringx/approvals/DrawingApprovalsPending.tsx').toString();
    expect(content).toMatch(/approveDrawingVersion/);
    expect(content).toMatch(/rejectDrawingVersion/);
  });
});
