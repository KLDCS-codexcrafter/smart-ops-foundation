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

// ─── Tally Export Config (moved from ComplianceSettingsAutomation.tsx) ───────
// Sprint T-Phase-1.1.1a-pre · lint hygiene · D-127 storage-key value preserved.
import type { TallyAction } from '@/lib/voucher-export-engine';

// [JWT] GET/PATCH /api/compliance/comply360/tally/:entityId
export interface TallyExportConfig {
  /** Default Tally export format. */
  export_format: 'xml' | 'json' | 'both';
  /** Default Tally action for new exports. */
  default_action: TallyAction;
  /** Whether to include <STATICVARIABLES><SVCURRENTCOMPANY> in envelope. */
  include_static_variables: boolean;
  /** Company name for <SVCURRENTCOMPANY> tag · pulls from entity master if blank. */
  company_name: string;
}

export const DEFAULT_TALLY_EXPORT_CONFIG: TallyExportConfig = {
  export_format: 'both',
  default_action: 'Create',
  include_static_variables: true,
  company_name: '',
};

// preserved bytes-identical from original (was ComplianceSettingsAutomation.tsx L262)
export const comply360TallyKey = (entityId: string | null | undefined): string =>
  `erp_comply360_tally_${entityId ?? 'default'}`;

// ─── Sprint T-Phase-2.7-a · RCM Auto-Post Policy (Q9 founder catch · existing infra) ───
// Per-voucher-type policy gate for finecore-engine RCM JV auto-posting.
// [JWT] GET/PATCH /api/compliance/comply360/rcm-auto-post/:entityId

export type RCMAutoPostMode = 'always' | 'report_only' | 'never';

export interface RCMAutoPostPolicy {
  voucher_type: string;       // 'purchase' | 'expense' | 'jv' | 'debit_note' | 'credit_note' | 'payment'
  voucher_type_label: string;
  mode: RCMAutoPostMode;
  active: boolean;
}

/** 6 voucher types · default ALL to report_only on first run (safe default · Q7-c). */
export const DEFAULT_RCM_AUTO_POST_POLICIES: RCMAutoPostPolicy[] = [
  { voucher_type: 'purchase',    voucher_type_label: 'Purchase',    mode: 'always',      active: true },
  { voucher_type: 'expense',     voucher_type_label: 'Expense',     mode: 'always',      active: true },
  { voucher_type: 'jv',          voucher_type_label: 'Journal',     mode: 'report_only', active: true },
  { voucher_type: 'debit_note',  voucher_type_label: 'Debit Note',  mode: 'report_only', active: true },
  { voucher_type: 'credit_note', voucher_type_label: 'Credit Note', mode: 'report_only', active: true },
  { voucher_type: 'payment',     voucher_type_label: 'Payment',     mode: 'report_only', active: true },
];

export const RCM_AUTO_POST_MODE_LABELS: Record<RCMAutoPostMode, string> = {
  always: 'Always Post',
  report_only: 'Report Only',
  never: 'Never Post',
};

export const comply360RCMAutoPostKey = (entityId: string | null | undefined): string =>
  `erp_comply360_rcm_autopost_${entityId ?? 'default'}`;

// ─── Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block H · D-334 + D-337 · QualiCheck ──
// Section 11 'QualiCheck' on ComplianceSettingsAutomation. Tally F11 cascade pattern.
// [JWT] GET/PATCH /api/compliance/comply360/qc/:entityId

export interface QualiCheckConfig {
  // Master gate (D-334)
  enableQualiCheck: boolean;
  // 4 cascading scope toggles
  enableIncomingInspection: boolean;
  enableInProcessInspection: boolean;
  enableOutgoingInspection: boolean;
  enableSampleInspection: boolean;
  // External / witnessed (D-335)
  enableExternalLab: boolean;
  enableCustomerWitnessed: boolean;
  // IS 2500 AQL toggle (D-323)
  enforceIS2500AQL: boolean;
  // CoA (Certificate of Analysis) toggles
  generateIncomingCoA: boolean;
  generateOutgoingCoA: boolean;
  // Bulk operations
  allowBulkInspectionEntry: boolean;
  // 4 godown picker fields (D-337 · routing logic in 5-pre-2)
  quarantineGodownId: string;
  sampleGodownId: string;
  rejectionGodownId: string;
  approvedGodownId: string;
  // Sprint 5-pre-3 · Block A · D-346 · 5-pre-2 Block I gap absorption (2 NEW fields)
  pendingAlertThresholdHours: number;   // single user-facing override for 3-tier severity (D-344)
  coaFooterText: string;                 // CoA print footer · entity-specific declaration line
  // Sprint 6-pre-2 · D-363 · auto Debit Note on QA rejection (Concern 6c · D-349 closure)
  enableAutoDebitNoteOnRejection?: boolean;
}

export const DEFAULT_QC_CONFIG: QualiCheckConfig = {
  enableQualiCheck: false,
  enableIncomingInspection: false,
  enableInProcessInspection: false,
  enableOutgoingInspection: false,
  enableSampleInspection: false,
  enableExternalLab: false,
  enableCustomerWitnessed: false,
  enforceIS2500AQL: false,
  generateIncomingCoA: false,
  generateOutgoingCoA: false,
  allowBulkInspectionEntry: false,
  quarantineGodownId: '',
  sampleGodownId: '',
  rejectionGodownId: '',
  approvedGodownId: '',
  pendingAlertThresholdHours: 24,
  coaFooterText: '',
  enableAutoDebitNoteOnRejection: false,
};

export const comply360QCKey = (entityId: string | null | undefined): string =>
  `erp_comply360_qc_${entityId ?? 'default'}`;


// ════════════════════════════════════════════════════════════════════
// Sprint T-Phase-1.3-3a-pre-1 · D-509.5 · ProductionConfig (CC SSOT · FR-54)
// ════════════════════════════════════════════════════════════════════

export const comply360ProductionKey = (entityId: string | null | undefined): string =>
  `erp_comply360_production_${entityId ?? 'default'}`;

export interface ProductionConfig {
  enableProduction: boolean;
  enableMakeToStock: boolean;
  enableMakeToOrder: boolean;
  enableEngineerToOrder: boolean;
  enableProcessManufacturing: boolean;
  enableContractManufacturingInward: boolean;
  enableJobWorkOutSubContracting: boolean;
  enableMultiLevelBOMExplosion: boolean;
  defaultBOMVersion: number;
  defaultCostingBasis: 'budget_rate' | 'last_purchase' | 'current_rate' | 'standard_cost';
  enableMaterialCostVariance: boolean;
  enableLabourCostAllocation: boolean;
  enableMachineCostAllocation: boolean;
  enableOverheadAllocation: boolean;
  enableShiftLinkage: boolean;
  enableOperatorAssignment: boolean;
  enableContractWorkerAssignment: boolean;
  enableMachineAssignment: boolean;
  enableProductionQC: boolean;
  qcFailureRoutingRule: 'block_dispatch' | 'allow_with_concession' | 'manual_review';
  enableMRA: boolean;
  defaultPlanningHorizonDays: number;
  includePendingPurchaseOrders: boolean;
  includeSalesPlan: boolean;
  includeProductionPlan: boolean;
  considerSafetyStock: boolean;
  productionOrderPrefix: string;
  productionOrderFormat: string;
  defaultProjectCentreId: string | null;
  enforceProjectIdForETO: boolean;
  enforceCustomerIdForContractMfg: boolean;
  enforceBusinessUnitForMultiBU: boolean;
  enableExportProductionTracking: boolean;
  productionDepartmentVisibility: 'department_scoped' | 'cross_department' | 'plant_wide';
  hideCostsFromOperators: boolean;
  requireApprovalForRelease: boolean;
  approvalThreshold: number;
  enableMobileCapture: boolean;
  enableShiftBasedCapture: boolean;
  enablePhotoCapture: boolean;
  defaultPrintFormat: 'standard' | 'detailed' | 'compact';
  printFooterText: string;
  enableLeakEmissionOnVariance: boolean;
  leakVarianceThresholdPct: number;
  leakAgingThresholdDays: number;

  // Sprint 3a-pre-2.5 · Block K · 6 feature flags
  enableProductionPlan: boolean;
  enableMultiOutputPO: boolean;
  enableBOMSubstitution: boolean;
  requireSubstitutionApproval: boolean;
  enableCapacityCheck: boolean;
  enableExportLineFlag: boolean;

  // Sprint 3a-pre-3 · Block K · v6.5 closure + variance + ITC-04
  varianceThresholdPct: number;
  enableMakerCheckerClosure: boolean;
  enableITC04Export: boolean;
  mobileOfflineQueueEnabled: boolean;
  closureAutoFreezeCost: boolean;
}

export const DEFAULT_PRODUCTION_CONFIG: ProductionConfig = {
  enableProduction: true,
  enableMakeToStock: true,
  enableMakeToOrder: true,
  enableEngineerToOrder: false,
  enableProcessManufacturing: false,
  enableContractManufacturingInward: false,
  enableJobWorkOutSubContracting: false,
  enableMultiLevelBOMExplosion: false,
  defaultBOMVersion: 1,
  defaultCostingBasis: 'last_purchase',
  enableMaterialCostVariance: true,
  enableLabourCostAllocation: false,
  enableMachineCostAllocation: false,
  enableOverheadAllocation: false,
  enableShiftLinkage: true,
  enableOperatorAssignment: false,
  enableContractWorkerAssignment: false,
  enableMachineAssignment: false,
  enableProductionQC: true,
  qcFailureRoutingRule: 'block_dispatch',
  enableMRA: false,
  defaultPlanningHorizonDays: 60,
  includePendingPurchaseOrders: true,
  includeSalesPlan: true,
  includeProductionPlan: true,
  considerSafetyStock: true,
  productionOrderPrefix: 'MO',
  productionOrderFormat: 'MO/{FY}/{NNNN}',
  defaultProjectCentreId: null,
  enforceProjectIdForETO: false,
  enforceCustomerIdForContractMfg: false,
  enforceBusinessUnitForMultiBU: false,
  enableExportProductionTracking: false,
  productionDepartmentVisibility: 'department_scoped',
  hideCostsFromOperators: true,
  requireApprovalForRelease: false,
  approvalThreshold: 100000,
  enableMobileCapture: false,
  enableShiftBasedCapture: false,
  enablePhotoCapture: false,
  defaultPrintFormat: 'standard',
  printFooterText: '',
  enableLeakEmissionOnVariance: true,
  leakVarianceThresholdPct: 10,
  leakAgingThresholdDays: 7,

  // Sprint 3a-pre-2.5 · Block K
  enableProductionPlan: true,
  enableMultiOutputPO: false,
  enableBOMSubstitution: true,
  requireSubstitutionApproval: true,
  enableCapacityCheck: true,
  enableExportLineFlag: false,

  // Sprint 3a-pre-3 · v6.5
  varianceThresholdPct: 10,
  enableMakerCheckerClosure: true,
  enableITC04Export: true,
  mobileOfflineQueueEnabled: false,
  closureAutoFreezeCost: true,
};
