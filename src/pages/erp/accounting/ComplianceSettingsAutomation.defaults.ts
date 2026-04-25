/**
 * @file     ComplianceSettingsAutomation.defaults.ts
 * @purpose  Configuration default values extracted from ComplianceSettingsAutomation.tsx
 *           to satisfy react-refresh/only-export-components. Component file imports
 *           these defaults at module top.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-b-a
 * @iso      Maintainability (HIGH+ component file scope cleaned · config separated from component)
 *           Performance (HIGH+ HMR fast-refresh works on ComplianceSettingsAutomation page)
 * @whom     ComplianceSettingsAutomation.tsx · any future config-default consumer
 * @depends  ./ComplianceSettingsAutomation (for type definitions: GroupConfig, SettlementConfig, etc.)
 *
 * NOTE: Type definitions (GroupConfig, SettlementConfig, etc.) remain in
 * ComplianceSettingsAutomation.tsx because moving them would require additional
 * importer updates not in scope for this sprint. Cleanup-1c-b-b OR a later
 * sprint may extract types to .types.ts if needed.
 *
 * All 5 object literals are preserved bytes-identical from the original.
 */
import type {
  GroupConfig, SettlementConfig, OutstandingConfig, RCMLedgerConfig, LandedCostConfig,
} from './ComplianceSettingsAutomation';

// preserved bytes-identical from original (was L65 in ComplianceSettingsAutomation.tsx)
export const DEFAULT_GROUP_CONFIG: GroupConfig = {
  enableAdvancedGST: false, enableAutoRCM: false, enableQRMPScheme: false,
  enableAutoTDSPayable: false, enableAutoTDSReceivable: false, enableDiscountAutoPosting: false,
  enableTaxAuditReport: false,
  enableDomesticLandedCost: false, enableEximManagement: false, enableSAMModule: false,
  enableWhatsAppTrigger: false,
  enableInventory: true, enableBillByBill: true, enableCostCentres: false,
  enableOrderProcessing: false, enableJobWork: false, enableBudgets: false,
  enableInterestCalc: false, itemInvoiceByDefault: true, defaultReceiveGodown: '',
};

// preserved bytes-identical from original (was L89)
export const DEFAULT_SETTLEMENT: SettlementConfig = {
  settlementMethod: 'fifo', allowManualOverride: true, advanceAutoAdjust: true,
  discountOnSettlement: false, discountLedger: '', overdueInterest: false,
  interestRate: 24, interestLedger: '',
};

// preserved bytes-identical from original (was L104)
export const DEFAULT_OUTSTANDING: OutstandingConfig = {
  creditLimitMode: 'warn', overdueBlockNewOrders: false,
  agingBuckets: [30, 60, 90, 180, 999], showMSMEFlag: true,
};

// preserved bytes-identical from original (was L123)
export const DEFAULT_RCM: RCMLedgerConfig = {
  rcmJournalVCH: '', rcmCGSTLedger: '', rcmSGSTLedger: '', rcmIGSTLedger: '',
  inputCGSTLedger: '', inputSGSTLedger: '', inputIGSTLedger: '',
  inputCessLedger: '', taxPaidAgainstRCMLedger: '', reverseChargeInputLedger: '',
};

// preserved bytes-identical from original (was L154)
export const DEFAULT_LC: LandedCostConfig = {
  defaultAllocationMethod: 'by_value', autoTrackingNumber: true,
  freightLedger: '', insuranceLedger: '', portCHAChargesLedger: '',
};
