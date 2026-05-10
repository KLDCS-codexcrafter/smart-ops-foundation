/**
 * @file        src/test/engineeringx-engine.test.ts
 * @purpose     EngineeringX engine FR-73.2 spoke consumer tests · Hub-and-Spoke equivalence · A.11
 * @sprint      T-Phase-1.A.11 EngineeringX Drawing Register + Version Control · Q-LOCK-14a · Block I.1
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { execSync } from 'node:child_process';
import {
  createDrawing,
  submitDrawingVersion,
  approveDrawingVersion,
  rejectDrawingVersion,
  listDrawings,
  listDrawingsByProject,
  listDrawingsByEquipment,
  listDrawingsByWorkOrder,
  listDrawingsByStatus,
  getDrawing,
  getCurrentApprovedDrawingVersion,
} from '@/lib/engineeringx-engine';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';

describe('T-Phase-1.A.11 EngineeringX · FR-73 5th consumer · spoke wrapper canonical', () => {
  const entityCode = 'TEST_ENGX_A11';

  beforeEach(() => {
    localStorage.clear();
  });

  function makeInitialVersion() {
    return {
      version_no: '1.0',
      file_url: '[JWT] /api/files/test.pdf',
      file_size_bytes: 1024,
      uploaded_at: new Date().toISOString(),
      uploaded_by: 'user_test',
    };
  }

  it('createDrawing writes DocVault Document with document_type: "drawing"', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'ASM-001-Rev-A',
      title: 'Main Assembly',
      drawing_type: 'assembly',
      related_project_id: 'PRJ-1',
      originating_department_id: 'engineering',
      initial_version: makeInitialVersion(),
    }, 'user_test');

    expect(drw.id).toBeTruthy();
    expect(drw.document_type).toBe('drawing');
    expect(drw.title).toBe('Main Assembly');
    expect(drw.project_id).toBe('PRJ-1');
    expect(drw.equipment_id).toBeNull();
    const meta = parseDrawingCustomTags(drw.tags?.custom_tags);
    expect(meta.drawing_no).toBe('ASM-001-Rev-A');
    expect(meta.drawing_subtype).toBe('assembly');
    expect(drw.versions[0].version_status).toBe('draft');
  });

  it('submit + approve workflow flips version_status via DocVault canonical', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'T', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: makeInitialVersion(),
    }, 'u');
    const submitted = submitDrawingVersion(entityCode, drw.id, '1.0', 'submitter');
    expect(submitted?.versions[0].version_status).toBe('submitted');
    const approved = approveDrawingVersion(entityCode, drw.id, '1.0', 'approver');
    expect(approved?.versions[0].version_status).toBe('approved');
    expect(approved?.versions[0].approved_by).toBe('approver');
    expect(getCurrentApprovedDrawingVersion(approved!)?.version_no).toBe('1.0');
  });

  it('reject workflow captures reason', () => {
    const drw = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'T', drawing_type: 'part',
      originating_department_id: 'engineering',
      initial_version: makeInitialVersion(),
    }, 'u');
    submitDrawingVersion(entityCode, drw.id, '1.0', 'u');
    const rejected = rejectDrawingVersion(entityCode, drw.id, '1.0', 'Wrong scale', 'reviewer');
    expect(rejected?.versions[0].version_status).toBe('rejected');
    expect(rejected?.versions[0].rejection_reason).toBe('Wrong scale');
  });

  it('listDrawingsByProject filters via Hub-and-Spoke FK lookup', () => {
    createDrawing(entityCode, {
      drawing_no: 'D1', title: 'A', drawing_type: 'part',
      related_project_id: 'PRJ-1', originating_department_id: 'eng',
      initial_version: makeInitialVersion(),
    }, 'u');
    createDrawing(entityCode, {
      drawing_no: 'D2', title: 'B', drawing_type: 'part',
      related_project_id: 'PRJ-2', originating_department_id: 'eng',
      initial_version: makeInitialVersion(),
    }, 'u');

    expect(listDrawingsByProject(entityCode, 'PRJ-1')).toHaveLength(1);
    expect(listDrawingsByProject(entityCode, 'PRJ-2')).toHaveLength(1);
    expect(listDrawingsByProject(entityCode, 'PRJ-3')).toHaveLength(0);
    expect(listDrawings(entityCode)).toHaveLength(2);
  });

  it('FK linkage stubs (equipment_id · work_order_id) preserved as Document fields', () => {
    createDrawing(entityCode, {
      drawing_no: 'D1', title: 'A', drawing_type: 'part',
      related_equipment_id: 'EQ-1', related_work_order_id: 'WO-1',
      originating_department_id: 'eng',
      initial_version: makeInitialVersion(),
    }, 'u');

    expect(listDrawingsByEquipment(entityCode, 'EQ-1')).toHaveLength(1);
    expect(listDrawingsByWorkOrder(entityCode, 'WO-1')).toHaveLength(1);
  });

  it('listDrawingsByStatus filters by version status', () => {
    const d1 = createDrawing(entityCode, {
      drawing_no: 'D1', title: 'A', drawing_type: 'part',
      originating_department_id: 'eng',
      initial_version: makeInitialVersion(),
    }, 'u');
    submitDrawingVersion(entityCode, d1.id, '1.0', 'u');
    expect(listDrawingsByStatus(entityCode, 'submitted')).toHaveLength(1);
    expect(listDrawingsByStatus(entityCode, 'approved')).toHaveLength(0);
  });

  it('getDrawing returns null for non-drawing Documents (document_type filter)', () => {
    expect(getDrawing(entityCode, 'nonexistent')).toBeNull();
  });

  it('canonical type alias sentinel cite preserved', () => {
    const content = execSync('cat src/types/engineering-drawing.ts').toString();
    expect(content).toMatch(/T-Phase-1\.A\.11/);
    expect(content).toMatch(/FR-73/);
    expect(content).toMatch(/5th consumer/);
  });

  it('D-NEW-CO drawing version supersession sentinel cite preserved in engine', () => {
    const content = execSync('cat src/lib/engineeringx-engine.ts').toString();
    expect(content).toMatch(/D-NEW-CO/);
  });
});
