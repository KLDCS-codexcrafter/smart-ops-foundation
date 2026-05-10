/**
 * @file        src/lib/engineeringx-engine.ts
 * @purpose     Canonical EngineeringX engine · drawing CRUD + version workflow · localStorage Phase 1 mock
 * @who         Engineering Lead · Document Controller · Production · Procurement
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-3a · Block B
 * @iso         ISO 9001:2015 §7.5 · ISO 25010 Maintainability + Reliability + Auditability
 * @whom        Audit Owner · Engineering Lead
 * @decisions   D-NEW-BV Phase 1 mock pattern · FR-11 · FR-13 · FR-23 · FR-25 · FR-50
 * @disciplines FR-21 · FR-29 · FR-30 · FR-33
 * @reuses      types/engineering-drawing.ts (canonical · ZERO TOUCH after A.10)
 * @[JWT]       /api/engineeringx/drawings (Phase 2 backend)
 */
import type {
  EngineeringDrawing,
  DrawingId,
  DrawingType,
  DrawingVersion,
  DrawingAuditEntry,
} from '@/types/engineering-drawing';
import { drawingsKey } from '@/types/engineering-drawing';

export function loadDrawings(entityCode: string): EngineeringDrawing[] {
  try {
    // [JWT] GET /api/engineeringx/drawings?entity={entityCode}
    const raw = localStorage.getItem(drawingsKey(entityCode));
    if (!raw) return [];
    return JSON.parse(raw) as EngineeringDrawing[];
  } catch {
    return [];
  }
}

function saveDrawings(entityCode: string, drawings: EngineeringDrawing[]): void {
  // [JWT] PUT /api/engineeringx/drawings (bulk persist · Phase 2)
  localStorage.setItem(drawingsKey(entityCode), JSON.stringify(drawings));
}

export function getDrawing(entityCode: string, id: string): EngineeringDrawing | null {
  return loadDrawings(entityCode).find((d) => d.id === id) ?? null;
}

export function findDrawingsByProject(entityCode: string, projectId: string): EngineeringDrawing[] {
  return loadDrawings(entityCode).filter((d) => d.related_project_id === projectId);
}

export function findDrawingsByEquipment(entityCode: string, equipmentId: string): EngineeringDrawing[] {
  return loadDrawings(entityCode).filter((d) => d.related_equipment_id === equipmentId);
}

export function findDrawingsByWorkOrder(entityCode: string, workOrderId: string): EngineeringDrawing[] {
  return loadDrawings(entityCode).filter((d) => d.related_work_order_id === workOrderId);
}

export function loadDrawingsByStatus(
  entityCode: string,
  status: 'draft' | 'submitted' | 'approved' | 'rejected',
): EngineeringDrawing[] {
  return loadDrawings(entityCode).filter((d) => {
    const current = d.versions.find((v) => v.version_no === d.current_version);
    return current?.version_status === status;
  });
}

export interface CreateDrawingInput {
  drawing_no: string;
  title: string;
  description?: string;
  drawing_type: DrawingType;
  related_project_id?: string | null;
  related_equipment_id?: string | null;
  related_work_order_id?: string | null;
  related_party_id?: string | null;
  originating_department_id: string;
  initial_version: Omit<DrawingVersion, 'version_status'>;
  tags?: Record<string, string>;
}

export function createDrawing(
  entityCode: string,
  input: CreateDrawingInput,
  createdBy: string,
): EngineeringDrawing {
  const id = `DRW-${Date.now()}-${Math.floor(Math.random() * 1000)}` as DrawingId;
  const now = new Date().toISOString();

  const initialVersion: DrawingVersion = {
    ...input.initial_version,
    version_status: 'draft',
  };

  const auditEntry: DrawingAuditEntry = {
    at: now,
    by: createdBy,
    action: 'create',
  };

  const drawing: EngineeringDrawing = {
    id,
    entity_id: entityCode,
    drawing_no: input.drawing_no,
    title: input.title,
    description: input.description,
    drawing_type: input.drawing_type,
    related_project_id: input.related_project_id ?? null,
    related_equipment_id: input.related_equipment_id ?? null,
    related_work_order_id: input.related_work_order_id ?? null,
    related_party_id: (input.related_party_id ?? null) as EngineeringDrawing['related_party_id'],
    originating_department_id: input.originating_department_id,
    current_version: initialVersion.version_no,
    versions: [initialVersion],
    tags: input.tags ?? {},
    created_at: now,
    created_by: createdBy,
    audit_log: [auditEntry],
  };

  const drawings = loadDrawings(entityCode);
  drawings.push(drawing);
  saveDrawings(entityCode, drawings);
  return drawing;
}

export function addDrawingVersion(
  entityCode: string,
  id: string,
  newVersion: Omit<DrawingVersion, 'version_status'>,
  changeNotes: string | undefined,
  addedBy: string,
): EngineeringDrawing | null {
  const drawings = loadDrawings(entityCode);
  const idx = drawings.findIndex((d) => d.id === id);
  if (idx < 0) return null;

  const drawing = drawings[idx];
  const versionToAdd: DrawingVersion = {
    ...newVersion,
    version_status: 'draft',
    change_notes: changeNotes,
  };

  drawing.versions.push(versionToAdd);
  drawing.current_version = versionToAdd.version_no;
  drawing.audit_log.push({
    at: new Date().toISOString(),
    by: addedBy,
    action: 'add_version',
    note: changeNotes,
  });

  drawings[idx] = drawing;
  saveDrawings(entityCode, drawings);
  return drawing;
}

export function submitDrawingVersion(
  entityCode: string,
  id: string,
  versionNo: string,
  submittedBy: string,
): EngineeringDrawing | null {
  return updateVersionStatus(entityCode, id, versionNo, 'submitted', submittedBy, 'submit');
}

export function approveDrawingVersion(
  entityCode: string,
  id: string,
  versionNo: string,
  approvedBy: string,
): EngineeringDrawing | null {
  return updateVersionStatus(entityCode, id, versionNo, 'approved', approvedBy, 'approve');
}

export function rejectDrawingVersion(
  entityCode: string,
  id: string,
  versionNo: string,
  reason: string,
  rejectedBy: string,
): EngineeringDrawing | null {
  return updateVersionStatus(entityCode, id, versionNo, 'rejected', rejectedBy, 'reject', reason);
}

function updateVersionStatus(
  entityCode: string,
  id: string,
  versionNo: string,
  newStatus: 'submitted' | 'approved' | 'rejected',
  actor: string,
  action: 'submit' | 'approve' | 'reject',
  reason?: string,
): EngineeringDrawing | null {
  const drawings = loadDrawings(entityCode);
  const idx = drawings.findIndex((d) => d.id === id);
  if (idx < 0) return null;

  const drawing = drawings[idx];
  const vIdx = drawing.versions.findIndex((v) => v.version_no === versionNo);
  if (vIdx < 0) return null;

  const now = new Date().toISOString();
  drawing.versions[vIdx] = {
    ...drawing.versions[vIdx],
    version_status: newStatus,
    ...(newStatus === 'approved' ? { approved_at: now, approved_by: actor } : {}),
    ...(newStatus === 'rejected' ? { rejection_reason: reason } : {}),
  };

  drawing.audit_log.push({ at: now, by: actor, action, note: reason });
  drawings[idx] = drawing;
  saveDrawings(entityCode, drawings);
  return drawing;
}

export function getCurrentApprovedVersion(drawing: EngineeringDrawing): DrawingVersion | null {
  return drawing.versions.find((v) => v.version_status === 'approved') ?? null;
}
