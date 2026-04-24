/**
 * @file     index.ts
 * @purpose  Barrel exports for ledger-master feature.
 * @sprint   T-H1.5-C-S6.5a · extended in S6.5b (modals + emi builder)
 */
export { LedgerTreeList } from './components/LedgerTreeList';
export type { LedgerTreeListProps } from './components/LedgerTreeList';
export { LedgerStepSidebar } from './components/LedgerStepSidebar';
export { useLedgerStore } from './hooks/useLedgerStore';
export type { LedgerStoreType } from './hooks/useLedgerStore';
export { buildLedgerTree } from './lib/ledger-tree-builder';
export type {
  LedgerLeaf, LedgerTreeL1, LedgerTreeL2, LedgerTreeConfig,
} from './lib/ledger-tree-builder';

// S6.5b — modals + EMI builder
export { LoanAgreementModal } from './components/modals/LoanAgreementModal';
export type { LoanAgreementValue, LenderType, LoanType }
  from './components/modals/LoanAgreementModal';
export { EMIPreviewModal } from './components/modals/EMIPreviewModal';
export { buildEMISchedule, calculateEMIAmount }
  from './lib/emi-schedule-builder';
export type { EMIScheduleRow, BuildScheduleInput }
  from './lib/emi-schedule-builder';
