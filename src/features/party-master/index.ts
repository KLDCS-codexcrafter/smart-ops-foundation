/**
 * @file     index.ts
 * @purpose  Barrel exports for party-master feature.
 * @sprint   T-H1.5-C-S4
 */
export { PartyTreeList } from './components/PartyTreeList';
export type { PartyTreeListProps } from './components/PartyTreeList';
export { PartyStepSidebar } from './components/PartyStepSidebar';
export { ContactDetailsModal } from './components/ContactDetailsModal';
export type { ContactRow } from './components/ContactDetailsModal';
export { BankDetailsModal } from './components/BankDetailsModal';
export { CompanyInfoModal } from './components/CompanyInfoModal';
export type { CompanyInfoFields } from './components/CompanyInfoModal';
export { BillWiseBreakupModal } from './components/BillWiseBreakupModal';
export { CreditScoreBadge } from './components/CreditScoreBadge';
export { KPIBadgeGroup } from './components/KPIBadgeGroup';
export { CrossSellPanel } from './components/CrossSellPanel';
export { CustomerIntelligenceDashboard } from './components/CustomerIntelligenceDashboard';
export { useIfscLookup } from './hooks/useIfscLookup';
export type { IfscLookupResult } from './hooks/useIfscLookup';
export { useCreditScoring } from './hooks/useCreditScoring';
export type { CreditBand, CreditScoreInput, CreditScoreResult } from './hooks/useCreditScoring';
export { useCustomerKPIs } from './hooks/useCustomerKPIs';
export {
  computeCustomerKPIs, rollupFromLeaves,
} from './lib/customer-kpi-engine';
export type { CustomerKPI, NodeRollup } from './lib/customer-kpi-engine';
export {
  findCrossSellCandidates,
} from './lib/cross-sell-finder';
export type {
  CrossSellCandidate, CandidateReason, CrossSellInput, CrossSellInputCustomer,
} from './lib/cross-sell-finder';
export {
  buildPartyTree,
} from './lib/party-tree-builder';
export type {
  PartyLeaf, PartyTreeL1, PartyTreeL2, PartyTreeL3,
  PartyTreeConfig, BankAccount, OpeningBill, ComputeRollupFn,
} from './lib/party-tree-builder';
