/**
 * @file        src/types/engineering-drawing.ts
 * @purpose     Canonical Drawing entity schema for EngineeringX · version-controlled engineering drawings · BOM-from-drawing source · Reference Project Library participant
 * @who         Engineering · Production · Procurement (BOM material codes) · QualiCheck (drawing approval)
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-2a · Block A
 * @iso         ISO 9001:2015 §7.5 (drawing control · revision integrity) · ISO/IEC 27001 · ISO 25010 Maintainability + Compatibility
 * @whom        Audit Owner · Engineering Lead · Document Controller
 * @decisions   D-NEW-BV Phase 1 mock pattern · FR-11 SSOT · FR-13 Cards Render Replicas ·
 *              FR-50 multi-entity 6-point · FR-51 multi-branch · FR-25 dept-scoped
 * @disciplines FR-29 · FR-30 · FR-33
 * @reuses      Phase 2 backend per Master Plan §6.3 · DocVault canonical (potential FR-73 5th consumer at A.11+)
 * @[JWT]       Schema for /api/engineeringx/drawings/* (Phase 2)
 */
import type { Party } from './party';

export type DrawingId = `DRW-${string}`;

export type DrawingType =
  | 'assembly'
  | 'part'
  | 'p_and_id'
  | 'electrical'
  | 'civil'
  | 'other';

export type DrawingStatus =
  | 'draft'
  | 'submitted'
  | 'approved'
  | 'superseded'
  | 'rejected'
  | 'obsolete';

export interface DrawingVersion {
  version_no: string;
  version_status: DrawingStatus;
  file_url: string;
  file_size_bytes: number;
  uploaded_at: string;
  uploaded_by: string;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  change_notes?: string | null;
}

export interface DrawingAuditEntry {
  at: string;
  by: string;
  action:
    | 'create'
    | 'add_version'
    | 'submit'
    | 'approve'
    | 'reject'
    | 'supersede'
    | 'obsolete';
  note?: string;
}

export interface EngineeringDrawing {
  id: DrawingId;
  entity_id: string;
  branch_id?: string | null;
  drawing_no: string;
  title: string;
  description?: string;
  drawing_type: DrawingType;
  related_project_id?: string | null;
  related_equipment_id?: string | null;
  related_work_order_id?: string | null;
  related_party_id?: Party['id'] | null;
  originating_department_id: string;
  current_version: string;
  versions: DrawingVersion[];
  tags?: Record<string, string>;
  created_at: string;
  created_by: string;
  audit_log: DrawingAuditEntry[];
}

export const drawingsKey = (entityCode: string): string => `erp_engineeringx_drawings_${entityCode}`;

export const DRAWING_TYPE_LABELS: Record<DrawingType, string> = {
  assembly: 'Assembly',
  part: 'Part',
  p_and_id: 'P&ID',
  electrical: 'Electrical',
  civil: 'Civil',
  other: 'Other',
};

export const DRAWING_STATUS_COLORS: Record<DrawingStatus, string> = {
  draft:      'bg-slate-500/10 text-slate-700 border-slate-500/30',
  submitted:  'bg-blue-500/10 text-blue-700 border-blue-500/30',
  approved:   'bg-green-500/10 text-green-700 border-green-500/30',
  superseded: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  rejected:   'bg-red-500/10 text-red-700 border-red-500/30',
  obsolete:   'bg-gray-500/10 text-gray-700 border-gray-500/30',
};
