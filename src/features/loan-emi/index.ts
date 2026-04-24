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
// ── T-H1.5-D-D3 ──
export { detectDuplicatePayments } from './lib/duplicate-detector';
export type { DuplicateHit, DuplicateDetectorInput } from './lib/duplicate-detector';
export { computeAlerts } from './lib/alert-engine';
export type { EMIAlert, AlertSeverity } from './lib/alert-engine';
export { useEMIAlerts } from './hooks/useEMIAlerts';
export type { EMIAlertSummary } from './hooks/useEMIAlerts';
export { EMICalendar } from './components/EMICalendar';
export { EMIDashboardWidget } from './components/EMIDashboardWidget';
export { DuplicatePaymentWarningModal } from './components/DuplicatePaymentWarningModal';
// ── T-H1.5-D-D4 ──
export { computeTDSForAccrual } from './engines/tds-194a-engine';
export type { TDSLineSpec, TDSBorrowingRow } from './engines/tds-194a-engine';
export { splitChargeWithGST } from './engines/gst-charge-engine';
export type { GSTSplitLineSpec, GSTBorrowingRow } from './engines/gst-charge-engine';
export { postProcessingFee } from './engines/processing-fee-engine';
export type { ProcessingFeePostResult } from './engines/processing-fee-engine';
export { PostProcessingFeeModal } from './components/PostProcessingFeeModal';
export { TaxComplianceLog } from './components/TaxComplianceLog';
