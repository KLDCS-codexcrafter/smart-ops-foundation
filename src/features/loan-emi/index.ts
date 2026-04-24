/**
 * @file     index.ts
 * @purpose  Barrel exports for loan-emi feature (H1.5-D D1 + D2).
 * @sprint   T-H1.5-D-D1 (extended in T-H1.5-D-D2)
 */
export { EMIScheduleTable } from './components/EMIScheduleTable';
export { LoanChargesMaster } from './components/LoanChargesMaster';
export type { LoanChargesValue } from './components/LoanChargesMaster';
export { EMIRowActionsMenu } from './components/EMIRowActionsMenu';
export { AccrualRunModal } from './components/AccrualRunModal';
export { LoanAccrualLog } from './components/LoanAccrualLog';
export { useEMISchedule } from './hooks/useEMISchedule';
export type { EMISummary } from './hooks/useEMISchedule';
export {
  canTransition, transitionEMI, enrichRow, upgradeSchedule,
} from './lib/emi-lifecycle-engine';
export type {
  EMIScheduleLiveRow, EMIStatus,
} from './lib/emi-lifecycle-engine';
// ── T-H1.5-D-D2 ──
export {
  resolveExpenseLedger, resolveAllExpenseLedgers,
} from './lib/ledger-resolver';
export type { ExpenseLedgerKind } from './lib/ledger-resolver';
export { findDuplicate, appendLogEntry } from './lib/accrual-log';
export type { AccrualLogEntry, AccrualAction } from './lib/accrual-log';
export {
  planMonthlyAccrual, commitMonthlyAccrual,
} from './engines/accrual-engine';
export type { AccrualPlanItem, AccrualRunResult } from './engines/accrual-engine';
export {
  planDailyPenal, commitDailyPenal,
} from './engines/penal-engine';
export type { PenalPlanItem, PenalRunResult } from './engines/penal-engine';
export { postBounceCharge } from './engines/bounce-engine';
export type { BouncePostResult } from './engines/bounce-engine';
