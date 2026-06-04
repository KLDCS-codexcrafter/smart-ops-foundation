/**
 * @file        src/pages/erp/taskflow/TaskFlowSidebar.types.ts
 * @purpose     TaskFlowModule discriminated union for activeModule state
 * @sprint      Sprint 138 · T-TaskFlow-A641.2 · Pillar A.6.4 · TaskFlow Arc · Governance Slice
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
  | 'compliance-sources';
