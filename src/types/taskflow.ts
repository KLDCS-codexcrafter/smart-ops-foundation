/**
 * @file        src/types/taskflow.ts
 * @purpose     TaskFlow MVP types · Task / Comment / Notification (TYPE ONLY · NO STORE)
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Phase 8 OPENER · Block 2
 * @decisions   DP-P7-2 additive · DESIGN-DECISION-FLAG #3 Notification type only · B.4 future
 * @[JWT]       GET/POST/PUT/DELETE /api/taskflow/tasks
 */

export type TaskPriority = 'p0' | 'p1' | 'p2' | 'p3';
export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'done';

export interface Task {
  id: string;
  code: string;                       // auto-gen TSK-000001
  title: string;
  description: string;
  assignee_id: string | null;
  assignee_name: string;
  department_code: string | null;     // resolved against useOrgStructure / DEPARTMENTS_KEY
  customer_id: string | null;         // resolved against party-master-engine.loadPartiesByType('customer')
  vendor_id: string | null;           // resolved against party-master-engine.loadPartiesByType('vendor')
  priority: TaskPriority;
  status: TaskStatus;
  due_at: string | null;              // ISO 8601 IST-aware
  entity_id: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface TaskComment {
  id: string;
  task_id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

/**
 * Notification — TYPE DEFINITION ONLY per Block-5 ruling.
 * NO store, NO persistence, NO new notification rail. TaskFlow rides
 * sonner toast() + computed Due-Soon strip pending B.4 Notifications
 * Consolidation (future work). push-notification-bridge.ts UNTOUCHED.
 */
export interface TaskNotification {
  task_id: string;
  type: 'assigned' | 'status_changed' | 'due_soon';
  message: string;
  created_at: string;
}

// [JWT] GET/POST /api/taskflow/tasks?entityCode={e}
export const taskflowKey = (entityCode: string): string =>
  entityCode ? `taskflow_v1_${entityCode}` : 'taskflow_v1';

// [JWT] GET/POST /api/taskflow/comments?entityCode={e}
export const taskflowCommentsKey = (entityCode: string): string =>
  entityCode ? `taskflow_comments_v1_${entityCode}` : 'taskflow_comments_v1';

/** Valid status transitions (engine-enforced). */
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ['in_progress', 'blocked', 'done'],
  in_progress: ['blocked', 'done', 'open'],
  blocked: ['in_progress', 'open'],
  done: [], // terminal
};
