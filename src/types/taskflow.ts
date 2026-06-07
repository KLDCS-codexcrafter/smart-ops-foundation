/**
 * @file        src/types/taskflow.ts
 * @purpose     TaskFlow ratified model (S137.R1 corrective) · 12-state lifecycle
 * @sprint      Sprint 137.R1 · T-TaskFlow-A641.1 · Pillar A.6.4 · TaskFlow Arc opener (post-Phase-7)
 * @decisions   R1 corrective: full ratified Task model from
 *              TaskFlow_Step1_Alignment_v5_FINAL.md. CamelCase fields,
 *              12-state status lifecycle, supporting model TYPE-ONLY this sprint.
 *              Notification rail still B.4 future · push-notification-bridge.ts UNTOUCHED.
 * @[JWT]       GET/POST/PUT/DELETE /api/taskflow/tasks
 */

// Statuses — 12-state lifecycle (prudent-work-hub mirror · TF-1)
export type TaskStatus =
  | 'draft' | 'open' | 'in_progress' | 'in_review' | 'pending_approval'
  | 'approved' | 'rejected' | 'rework' | 'completed' | 'cancelled'
  | 'on_hold' | 'escalated';

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';

export type TaskCategory =
  | 'operations' | 'finance' | 'compliance' | 'hr' | 'it' | 'sales'
  | 'marketing' | 'support' | 'general'
  | 'internal_audit' | 'external_audit' // TF-9 Operix extension
  | 'approval'; // Sprint B1S1 · approval-rail-engine mirror tasks

export interface RecurringConfig {
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  interval: number;
  endDate?: string;
}

export interface Task {
  id: string;
  code: string;                    // keep TSK-###### auto-gen (S137 addition · good)
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  category: TaskCategory;
  assigneeId: string | null;
  assigneeName: string;            // keep denormalized name (S137 addition)
  creatorId: string;
  departmentId: string | null;
  clientId?: string | null;        // = customer_id (rename for mirror fidelity)
  vendorId?: string | null;
  projectId?: string | null;
  parentTaskId?: string | null;    // TF-14
  dependencyIds: string[];         // TF-14
  watcherIds: string[];
  dueDate: string | null;
  slaDate?: string | null;
  startDate?: string | null;
  completedDate?: string | null;
  estimatedHours?: number | null;
  actualHours?: number | null;
  tags: string[];
  isRecurring: boolean;
  recurringConfig?: RecurringConfig | null;
  templateId?: string | null;
  entityId: string;                // TF-10 (was entity_id — camelCase for mirror)
  branchId?: string | null;        // TF-10
  acknowledgedAt?: string | null;  // TF-29a
  acknowledgedBy?: string | null;  // TF-29a
  createdAt: string;
  updatedAt: string;
}

// Accountability Spine records (TF-29 b/c)
export interface ReassignmentRecord {
  id: string; taskId: string; fromUserId: string | null; toUserId: string;
  reason: string; byUserId: string; timestamp: string;
}
export interface DueDateChangeRecord {
  id: string; taskId: string; oldDate: string | null; newDate: string | null;
  reason: string; byUserId: string; timestamp: string;
}

// Hash-chained task audit (TF-36)
export interface TaskAuditEntry {
  id: string; taskId: string; action: string; userId: string;
  before?: Record<string, unknown>; after?: Record<string, unknown>;
  timestamp: string; prevHash: string; entryHash: string;
}

// Supporting model — TYPE DEFINITIONS ONLY this sprint (features S138+ · TF-1)
export interface TaskTemplate { id: string; name: string; description: string; category: TaskCategory; priority: TaskPriority; checklistItems: string[]; estimatedHours: number; departmentId?: string; createdBy: string; createdAt: string; }
export interface ChecklistItem { id: string; taskId: string; title: string; isCompleted: boolean; isMilestone: boolean; dependsOn?: string; completedBy?: string; completedAt?: string; notes?: string; order: number; }
export interface TaskCommentModel { id: string; taskId: string; userId: string; content: string; isInternal: boolean; parentCommentId?: string; mentions: string[]; createdAt: string; updatedAt: string; }
export interface TaskAttachment { id: string; taskId: string; fileName: string; fileType: string; fileSize: number; url: string; category: 'document' | 'evidence' | 'expense' | 'general'; uploadedBy: string; uploadedAt: string; notes?: string; }
export type ApprovalStatus = 'pending' | 'approved' | 'rejected' | 'rework';
export interface TaskApprovalStep { id: string; taskId: string; approverId: string; status: ApprovalStatus; order: number; comments?: string; decidedAt?: string; createdAt: string; }
export interface TaskApprovalChain { id: string; name: string; steps: { approverId: string; order: number }[]; isDefault: boolean; departmentId?: string; categoryId?: TaskCategory; }
export interface TaskSLARule { id: string; name: string; category?: TaskCategory; priority?: TaskPriority; maxHours: number; escalateAfterHours: number; escalateTo: 'manager' | 'dept_head' | 'admin'; isActive: boolean; }
export interface TaskWorkflowStage { id: string; name: string; order: number; type: 'task' | 'approval' | 'review' | 'notification'; assigneeRole?: string; autoTransition: boolean; }
export interface TaskWorkflowTemplate { id: string; name: string; stages: TaskWorkflowStage[]; isActive: boolean; createdAt: string; }
export interface TaskReminder { id: string; taskId: string; userId: string; reminderDate: string; message: string; isTriggered: boolean; }
export interface TaskEvidence { id: string; taskId: string; type: 'before' | 'after' | 'proof' | 'field'; fileUrl: string; fileName: string; fileType: string; notes?: string; timestamp: string; uploadedBy: string; location?: string; }
export interface TaskExpense { id: string; taskId: string; amount: number; currency: string; category: 'travel' | 'supplies' | 'services' | 'equipment' | 'communication' | 'other'; description: string; isReimbursable: boolean; taxAmount?: number; taxRate?: number; receiptUrl?: string; receiptFileName?: string; status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'reimbursed'; submittedBy: string; approvedBy?: string; financeNote?: string; gstin?: string; hsnSacCode?: string; gstRate?: number; cgst?: number; sgst?: number; igst?: number; isInterState?: boolean; isReverseCharge?: boolean; tdsSection?: string; tdsRate?: number; tdsAmount?: number; paymentMode?: string; paymentRef?: string; createdAt: string; updatedAt: string; }

// 12-state legal transition map
export const TASK_STATUS_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  draft: ['open', 'cancelled'],
  open: ['in_progress', 'on_hold', 'cancelled', 'escalated'],
  in_progress: ['in_review', 'on_hold', 'cancelled', 'escalated'],
  in_review: ['pending_approval', 'rework', 'completed', 'escalated'],
  pending_approval: ['approved', 'rejected', 'escalated'],
  approved: ['completed'],
  rejected: ['rework', 'cancelled'],
  rework: ['in_progress'],
  on_hold: ['open', 'in_progress', 'cancelled'],
  escalated: ['in_progress', 'in_review', 'cancelled'],
  completed: [],   // terminal
  cancelled: [],   // terminal
};

// ── Backward-compat alias (kept so existing addComment surface compiles) ──
/** @deprecated S138+ migrate consumers to TaskCommentModel */
export interface TaskComment {
  id: string;
  task_id: string;
  body: string;
  author_id: string;
  author_name: string;
  created_at: string;
}

/** @deprecated TYPE-ONLY · B.4 Notifications Consolidation owns runtime */
export interface TaskNotification {
  task_id: string;
  type: 'assigned' | 'status_changed' | 'due_soon';
  message: string;
  created_at: string;
}

// ── Entity-scoped storage keys (§O) ──
// [JWT] GET/POST /api/taskflow/tasks?entityCode={e}
export const taskflowKey = (entityCode: string): string =>
  entityCode ? `taskflow_v1_${entityCode}` : 'taskflow_v1';

// [JWT] GET/POST /api/taskflow/comments?entityCode={e}
export const taskflowCommentsKey = (entityCode: string): string =>
  entityCode ? `taskflow_comments_v1_${entityCode}` : 'taskflow_comments_v1';

// R1 additions — Accountability Spine + Hash-chain storage keys
export const taskflowReassignmentsKey = (entityCode: string): string =>
  entityCode ? `tf_reassignments_${entityCode}` : 'tf_reassignments';
export const taskflowDueDateChangesKey = (entityCode: string): string =>
  entityCode ? `tf_duedate_changes_${entityCode}` : 'tf_duedate_changes';
export const taskflowAuditChainKey = (entityCode: string): string =>
  entityCode ? `tf_task_audit_${entityCode}` : 'tf_task_audit';

// ── S141 · Accountability Payoff · TF-29 d/e/f · TF-31 (VERBATIM) ──────────
export interface TaskClosePolicy {
  id: string; entityId: string;
  category: TaskCategory;
  requireEvidence: boolean;            // TF-29d: completion blocked without ≥1 evidence
  minEvidenceCount: number;            // default 1
  isActive: boolean;
  createdAt: string; updatedAt: string;
}

export interface PersonAccountabilityMetrics {
  userId: string; userName: string; departmentId: string | null;
  openTasks: number; overdueTasks: number;
  avgTimeToAcknowledgeHours: number | null;   // null = nothing to measure
  unacknowledgedCount: number;
  ageingBuckets: { d0_2: number; d3_7: number; d8_14: number; d15_plus: number };
  reworkBounces: number;                      // transitions INTO 'rework'
  reassignmentsAway: number;                  // tasks this person reassigned to others
  blockedHoursOpen: number;
  slaBreaches: number;
  estimatedHoursTotal: number; actualHoursTotal: number;
}

export interface WorkDiaryEntry {
  userId: string; dateISO: string;            // YYYY-MM-DD (entity-local)
  acknowledged: { taskId: string; code: string; title: string }[];
  created: { taskId: string; code: string; title: string }[];
  statusChanges: { taskId: string; code: string; from: TaskStatus; to: TaskStatus }[];
  completed: { taskId: string; code: string; title: string }[];
  commentsPosted: number;
  wentOverdue: { taskId: string; code: string; title: string }[];
}

// S141 storage keys (§O)
export const tfExpensesKey = (entityCode: string): string =>
  entityCode ? `tf_expenses_${entityCode}` : 'tf_expenses';
export const tfEvidenceKey = (entityCode: string): string =>
  entityCode ? `tf_evidence_${entityCode}` : 'tf_evidence';
export const tfClosePoliciesKey = (entityCode: string): string =>
  entityCode ? `tf_close_policies_${entityCode}` : 'tf_close_policies';
