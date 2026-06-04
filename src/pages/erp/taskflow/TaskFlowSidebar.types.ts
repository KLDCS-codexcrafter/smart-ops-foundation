/**
 * @file        src/pages/erp/taskflow/TaskFlowSidebar.types.ts
 * @purpose     TaskFlowModule discriminated union for activeModule state
 * @sprint      Sprint 137 · T-TaskFlow-A641.1 · Pillar A.6.4 · TaskFlow Arc · Block 3
 */
export type TaskFlowModule =
  | 'landing'
  | 'all-tasks'
  | 'my-tasks'
  | 'due-soon'
  | 'completed';
