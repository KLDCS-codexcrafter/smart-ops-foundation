/**
 * @file     index.ts
 * @purpose  Barrel exports for loan-emi feature (H1.5-D D1).
 * @sprint   T-H1.5-D-D1
 */
export { EMIScheduleTable } from './components/EMIScheduleTable';
export { LoanChargesMaster } from './components/LoanChargesMaster';
export type { LoanChargesValue } from './components/LoanChargesMaster';
export { EMIRowActionsMenu } from './components/EMIRowActionsMenu';
export { useEMISchedule } from './hooks/useEMISchedule';
export type { EMISummary } from './hooks/useEMISchedule';
export {
  canTransition, transitionEMI, enrichRow, upgradeSchedule,
} from './lib/emi-lifecycle-engine';
export type {
  EMIScheduleLiveRow, EMIStatus,
} from './lib/emi-lifecycle-engine';
