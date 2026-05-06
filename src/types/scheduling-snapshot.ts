/**
 * scheduling-snapshot.ts — Scheduling Board data model (Q38=ALL + Q41=c + Q42=c)
 * Sprint T-Phase-1.3-3-PlantOps-pre-3b · D-606
 *
 * Polymorphic interactivity · view-only / click-to-reschedule / drag-drop stub.
 * Q41=c · unified Plans + POs Gantt · Q42=c · smart cascade reschedule.
 *
 * [JWT] PUT /api/plant-ops/production-orders/:id/reschedule
 * [JWT] PUT /api/plant-ops/production-plans/:id/reschedule
 */

export type SchedulingViewMode = 'view_only' | 'click_to_reschedule' | 'drag_drop_stub';

export type GanttBarType = 'plan' | 'production_order';

export type GanttBarStatus =
  | 'draft' | 'released' | 'in_progress' | 'completed' | 'closed' | 'cancelled'
  | 'planned' | 'approved' | 'in_execution';

export interface GanttBar {
  id: string;
  type: GanttBarType;
  source_id: string;
  source_doc_no: string;

  start_ms: number;
  end_ms: number;
  duration_days: number;

  label: string;
  status: GanttBarStatus;
  status_color: string;

  machine_id: string | null;
  machine_label: string;
  factory_id: string;

  linked_po_ids: string[];
  linked_jc_ids: string[];

  is_locked: boolean;
  warnings: string[];
}

export interface RescheduleResult {
  success: boolean;
  cascaded: boolean;
  affected_ids: string[];
  conflicts: string[];
  warnings: string[];
  audit_event_id: string;
}
