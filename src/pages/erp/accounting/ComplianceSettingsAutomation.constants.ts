/**
 * @file     ComplianceSettingsAutomation.constants.ts
 * @purpose  Storage-key getters and SAMConfig type extracted from
 *           ComplianceSettingsAutomation.tsx to satisfy
 *           react-refresh/only-export-components. Component file imports
 *           constants at module top.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-b-b
 * @iso      Maintainability (HIGH+++ component file scope cleaned · cleanup horizon CLOSES)
 *           Compatibility (HIGH++ Phase 2 backend migration cleaner when localStorage replaced)
 *           Performance (HIGH++ HMR fast-refresh works on ComplianceSettingsAutomation page)
 * @whom     ComplianceSettingsAutomation.tsx · 11 cross-file importers of comply360SAMKey
 *           (SalesXSidebar, SalesInvoice, Receipt, DeliveryNote, SalesXHub,
 *           SAMPersonMaster, TargetMaster, CommissionRegister, CRMPipeline,
 *           EnquiryCapture, Telecaller) · 1 cross-file importer of comply360RCMKey
 *           (RCMRegister) · plus SAMConfig type consumers (commission-engine,
 *           sam-engine, SalesXGoMobile)
 * @depends  none
 *
 * D-127 STORAGE-KEY PRESERVATION:
 *   All 11 storage-key template strings preserved bytes-identical from original.
 *   Each is annotated with original line number for traceability.
 *   Phase 2 backend migration may replace these with REST endpoint constants
 *   while preserving the same naming scheme.
 *
 * NOTE on SAMConfig type:
 *   SAMConfig type definition is moved here from ComplianceSettingsAutomation.tsx
 *   so importers can import both `comply360SAMKey` and `SAMConfig` from a single
 *   path. Other type definitions (GroupConfig, SettlementConfig, etc.) remain in
 *   the source file per Cleanup-1c-b-a's NOTE.
 */

// SAMConfig type (moved with comply360SAMKey for clean co-imports · was L188 in ComplianceSettingsAutomation.tsx · shape preserved bytes-identical)
export interface SAMConfig {
  // Master gate
  enableSalesActivityModule: boolean;
  // Card 1 — Internal Sales Team
  enableCompanySalesMan: boolean;
  companySalesManSource: 'ledger' | 'payhub';
  commissionCalcMethod: 'item_amount' | 'item_qty' | 'both' | 'slab_based' | 'net_margin';
  enableCommissionOnService: boolean;
  enablePortfolioAssignment: boolean;
  portfolioMatchMethod: 'auto' | 'manual';
  allowMultipleSalesmenPerInvoice: boolean;
  // Card 2 — Reference
  enableReference: boolean;
  referenceCommission: boolean;
  // Card 3 — Sales Operations
  enableCRM: boolean;
  crmType: 'option_a' | 'option_b' | null;
  pipelineType: 'standard' | 'solutions' | null;
  enableTelecalling: boolean;
  // Card 4 — Agent Module
  enableAgentModule: boolean;
  enableReceiver: boolean;
  commissionRateMethod: 'all_items' | 'item_by_item' | 'stock_group';
  enableHierarchyMaster: boolean;
  // Card 5 — Voucher Scope (purchase excluded by design)
  enableInSalesOrder: boolean;
  enableInDeliveryNote: boolean;
  enableCommissionOnDeliveryNote: boolean; // book CommissionEntry at DN stage
  // Card 6 — Security
  hideCommissionInTransaction: boolean;
  slsmMandatoryOutward: boolean;
  slsmMandatoryInward: boolean;
  receiverMandatory: boolean;
  // Card 7 — Printing
  printAgentNameOnInvoice: boolean;
  agentPrintTitle: string;
  // Card 8 — Targets: Company
  enableCompanyTarget: boolean;
  companyTargetByStockGroup: boolean;
  companyTargetByStockItem: boolean;
  companyTargetByService: boolean;
  companyTargetByDivision: boolean;
  companyTargetByCustomer: boolean;
  companyTargetByCustomerCategory: boolean;
  companyTargetByTerritory: boolean;
  companyTargetByNewCustomerCount: boolean;
  companyTargetByCollection: boolean;
  // Card 8 — Targets: SLSM
  enableSLSMTarget: boolean;
  slsmTargetByStockGroup: boolean;
  slsmTargetByStockItem: boolean;
  slsmTargetByService: boolean;
  slsmTargetByDivision: boolean;
  slsmTargetByCustomer: boolean;
  slsmTargetByCustomerCategory: boolean;
  slsmTargetByTerritory: boolean;
  slsmTargetByNewCustomerCount: boolean;
  slsmTargetByCollection: boolean;
  slsmTargetByOrderVolume: boolean;
  slsmTargetByCallVisitActivity: boolean;
  // TDS on commission
  tdsOnCommissionSection: '194H' | '194J' | 'not_applicable';
  commissionLedgerSales: string;
  commissionLedgerPurchase: string;
  // Sprint 6B — Collection Bonus
  enableCollectionBonus: boolean;
  collectionBonusRate: number;                      // % of commission earned on this receipt
  collectionBonusWindowDays: number;                // days from invoice date
  collectionBonusAppliesTo: 'salesman' | 'all_persons';
  // Legacy fields kept for backward compat (unused in new screen)
  enableCompanySalesPerson: boolean;
  enableInPurchase: boolean;
  enableInPurchaseOrder: boolean;
  enableInReceiptNote: boolean;
}

// preserved bytes-identical from original (was L316 in ComplianceSettingsAutomation.tsx)
export const COMPLY360_GROUP_KEY = 'erp_comply360_group';
// preserved bytes-identical from original (was L317)
export const comply360RCMKey = (e: string) => `erp_comply360_rcm_${e}`;
// preserved bytes-identical from original (was L318)
export const comply360TDSPKey = (e: string) => `erp_comply360_tdsp_${e}`;
// preserved bytes-identical from original (was L319)
export const comply360TDSRKey = (e: string) => `erp_comply360_tdsr_${e}`;
// preserved bytes-identical from original (was L320)
export const comply360LCKey = (e: string) => `erp_comply360_lc_${e}`;
// preserved bytes-identical from original (was L321)
export const comply360EximKey = (e: string) => `erp_comply360_exim_${e}`;
// preserved bytes-identical from original (was L322 · 11 cross-file importers · D-127 sensitive)
export const comply360SAMKey = (e: string) => `erp_comply360_sam_${e}`;
// preserved bytes-identical from original (was L323)
export const comply360WAKey = (e: string) => `erp_comply360_wa_${e}`;
// preserved bytes-identical from original (was L324)
export const comply360FeaturesKey = (e: string) => `erp_comply360_features_${e}`;
// preserved bytes-identical from original (was L325)
export const comply360SettlementKey = (e: string) => `erp_comply360_settlement_${e}`;
// preserved bytes-identical from original (was L326)
export const comply360OutstandingKey = (e: string) => `erp_comply360_outstanding_${e}`;
