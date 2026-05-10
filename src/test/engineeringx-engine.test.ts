/**
 * @file        src/test/engineeringx-engine.test.ts
 * @purpose     EngineeringX engine canonical tests · A.10 Foundation
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-14a · Block F.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  createDrawing,
  addDrawingVersion,
  submitDrawingVersion,
  approveDrawingVersion,
  rejectDrawingVersion,
  findDrawingsByProject,
  findDrawingsByEquipment,
  findDrawingsByWorkOrder,
  loadDrawingsByStatus,
} from '@/lib/engineeringx-engine';

describe('T-Phase-1.A.10 EngineeringX Foundation · engine canonical', () => {
  const entityCode = 'TEST_ENGX';

  beforeEach(() => {
    localStorage.clear();
  });

  it('Q-LOCK-3a · createDrawing writes Drawing with FK linkage stubs', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'ASM-001-Rev-A',
      title: 'Main Assembly',
      drawing_type: 'assembly',
      related_project_id: 'PRJ-1',
      originating_department_id: 'engineering',
      initial_version: {
        version_no: '1.0',
        file_url: '[JWT] /api/files/test.pdf',
        file_size_bytes: 1024,
        uploaded_at: new Date().toISOString(),
        uploaded_by: 'user_test',
      },
    }, 'user_test');

    expect(drw.id).toMatch(/^DRW-/);
    expect(drw.drawing_no).toBe('ASM-001-Rev-A');
    expect(drw.related_project_id).toBe('PRJ-1');
    expect(drw.related_equipment_id).toBeNull();
    expect(drw.versions[0].version_status).toBe('draft');
    expect(drw.audit_log).toHaveLength(1);
    expect(drw.audit_log[0].action).toBe('create');
  });

  it('Q-LOCK-3a · addDrawingVersion appends + updates current_version', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'T', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: { version_no: '1.0', file_url: '/a', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    const updated = addDrawingVersion(entityCode, drw.id, {
      version_no: '2.0',
      file_url: '/b',
      file_size_bytes: 2,
      uploaded_at: new Date().toISOString(),
      uploaded_by: 'u2',
    }, 'Revised dim 5', 'u2');
    expect(updated?.current_version).toBe('2.0');
    expect(updated?.versions).toHaveLength(2);
    expect(updated?.audit_log).toHaveLength(2);
  });

  it('Q-LOCK-3a · approve workflow flips version_status', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'T', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: { version_no: '1.0', file_url: '/a', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    submitDrawingVersion(entityCode, drw.id, '1.0', 'submitter');
    const approved = approveDrawingVersion(entityCode, drw.id, '1.0', 'approver');
    expect(approved?.versions[0].version_status).toBe('approved');
    expect(approved?.versions[0].approved_by).toBe('approver');
  });

  it('Q-LOCK-3a · reject workflow captures reason', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'T', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: { version_no: '1.0', file_url: '/a', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    const rejected = rejectDrawingVersion(entityCode, drw.id, '1.0', 'Wrong scale', 'reviewer');
    expect(rejected?.versions[0].version_status).toBe('rejected');
    expect(rejected?.versions[0].rejection_reason).toBe('Wrong scale');
  });

  it('Q-LOCK-3a · findDrawingsByProject filters correctly', () => {
    createDrawing(entityCode, {
      drawing_no: 'D1', title: 'A', drawing_type: 'part',
      related_project_id: 'PRJ-1', originating_department_id: 'eng',
      initial_version: { version_no: '1.0', file_url: '/a', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    createDrawing(entityCode, {
      drawing_no: 'D2', title: 'B', drawing_type: 'part',
      related_project_id: 'PRJ-2', originating_department_id: 'eng',
      initial_version: { version_no: '1.0', file_url: '/b', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    expect(findDrawingsByProject(entityCode, 'PRJ-1')).toHaveLength(1);
    expect(findDrawingsByProject(entityCode, 'PRJ-2')).toHaveLength(1);
    expect(findDrawingsByProject(entityCode, 'PRJ-3')).toHaveLength(0);
  });

  it('Q-LOCK-3a · FK linkage stubs (equipment_id · work_order_id) for A.11+ consumers', () => {
    createDrawing(entityCode, {
      drawing_no: 'D1', title: 'A', drawing_type: 'part',
      related_equipment_id: 'EQ-1', related_work_order_id: 'WO-1',
      originating_department_id: 'eng',
      initial_version: { version_no: '1.0', file_url: '/a', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');

    expect(findDrawingsByEquipment(entityCode, 'EQ-1')).toHaveLength(1);
    expect(findDrawingsByWorkOrder(entityCode, 'WO-1')).toHaveLength(1);
  });

  it('Q-LOCK-3a · loadDrawingsByStatus filters by current version status', () => {
    const d1 = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'A', drawing_type: 'part',
      originating_department_id: 'eng',
      initial_version: { version_no: '1.0', file_url: '/a', file_size_bytes: 1, uploaded_at: '2026-01-01', uploaded_by: 'u' },
    }, 'u');
    submitDrawingVersion(entityCode, d1.id, '1.0', 'u');
    expect(loadDrawingsByStatus(entityCode, 'submitted')).toHaveLength(1);
    expect(loadDrawingsByStatus(entityCode, 'draft')).toHaveLength(0);
  });

  it('Q-LOCK-13a · canonical type sentinel cite preserved', () => {
    const content = execSync(`cat src/types/engineering-drawing.ts`).toString();
    expect(content).toMatch(/T-Phase-1\.A\.10/);
    expect(content).toMatch(/EngineeringX Foundation/);
    expect(content).toMatch(/related_project_id/);
    expect(content).toMatch(/related_equipment_id/);
    expect(content).toMatch(/related_work_order_id/);
  });
});
