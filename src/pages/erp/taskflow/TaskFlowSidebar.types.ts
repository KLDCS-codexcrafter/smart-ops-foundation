/**
 * @file        src/pages/erp/taskflow/TaskFlowSidebar.types.ts
 * @purpose     TaskFlowModule discriminated union for activeModule state
 * @sprint      Sprint 139 · T-TaskFlow-A641.3 · Structure Slice adds templates · workflows · decisions · minutes
 */
export type TaskFlowModule =
  | 'landing'
  | 'all-tasks'
  | 'my-tasks'
  | 'due-soon'
  | 'completed'
  // ─ Governance Slice (S138) ─────────────────────────────────────────
  | 'approval-chains'
  | 'sla-rules'
  | 'escalations'
  | 'blocked'
  | 'reminders'
  | 'compliance-sources'
  // ─ Structure Slice (S139) ──────────────────────────────────────────
  | 'templates'
  | 'workflows'
  | 'decisions'
  | 'minutes';
