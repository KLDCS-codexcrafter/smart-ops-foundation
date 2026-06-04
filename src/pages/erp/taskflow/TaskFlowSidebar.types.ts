/**
 * @file        src/pages/erp/taskflow/TaskFlowSidebar.types.ts
 * @purpose     TaskFlowModule discriminated union for activeModule state
 * @sprint      Sprint 140 · T-TaskFlow-A641.4 · OperixChat MVP adds chat · channels · S142 coming-soon entries
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
  | 'minutes'
  // ─ OperixChat MVP (S140) ───────────────────────────────────────────
  | 'chat'
  | 'channels'
  | 'email-threads'      // S142 coming-soon
  | 'voice-library'      // S142 coming-soon
  // ─ Accountability Payoff (S141) ────────────────────────────────────
  | 'accountability'
  | 'close-policies'
  | 'work-diary';
