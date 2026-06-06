# P8.3 Audit Coverage Inventory

Scope: 11 page trees · enumerated via handleCreate|handleSave|handleSubmit|handleConfirm|onSubmit|onCreate|handleAdd|handlePost regex on .tsx

**Totals**: 97 create-handler pages · A (COVERED)=37 · B (SILENT-VIA-ENGINE)=28 · C (SILENT-DIRECT)=32

Architect baseline reconciliation: 91 create-pages / 88 page-silent. Our scan: 97 create-pages / 60 page-silent (page-level logAudit absent). Delta within ±10% — matches order of magnitude. Difference attributable to regex variance (we include handleConfirm/handlePost; architect may exclude pure-confirm dialogs).

| # | File | Class | Engine / Function | Fix-site |
|---|------|-------|-------------------|----------|
| 1 | `src/pages/erp/accounting/ComplianceSettingsAutomation.tsx` | C | (direct write) | page success path |
| 2 | `src/pages/erp/accounting/CurrencyMaster.tsx` | B | useCurrencies.ts, utils.ts | engine create-export |
| 3 | `src/pages/erp/accounting/FinFrame.tsx` | C | (direct write) | page success path |
| 4 | `src/pages/erp/accounting/FiscalYearMaster.tsx` | B | fiscal-year-engine.ts, fy-close-engine.ts, useEntityCode.ts | engine create-export |
| 5 | `src/pages/erp/accounting/LedgerMaster.tsx` | A | useVoucherTypes.ts | — |
| 6 | `src/pages/erp/accounting/PeriodLockSettings.tsx` | B | auth-helpers.ts, period-lock-engine.ts, useEntityCode.ts | engine create-export |
| 7 | `src/pages/erp/accounting/TransactionTemplates.tsx` | B | keyboard.ts, useEntityCode.ts, useTransactionTemplates.ts | engine create-export |
| 8 | `src/pages/erp/accounting/VoucherTypesMaster.tsx` | A | useVoucherTypes.ts | — |
| 9 | `src/pages/erp/accounting/capital-assets/DepreciationWorkings.tsx` | A | fincore-engine.ts | — |
| 10 | `src/pages/erp/accounting/capital-assets/FAAuditTrailViewer.tsx` | B | fa-audit-trail-engine.ts | engine create-export |
| 11 | `src/pages/erp/accounting/vouchers/ContraEntry.tsx` | A | fincore-engine.ts | — |
| 12 | `src/pages/erp/accounting/vouchers/CreditNote.tsx` | A | fincore-engine.ts | — |
| 13 | `src/pages/erp/accounting/vouchers/DebitNote.tsx` | A | fincore-engine.ts | — |
| 14 | `src/pages/erp/accounting/vouchers/DeliveryNote.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 15 | `src/pages/erp/accounting/vouchers/JournalEntry.tsx` | A | fincore-engine.ts | — |
| 16 | `src/pages/erp/accounting/vouchers/ManufacturingJournal.tsx` | A | fincore-engine.ts | — |
| 17 | `src/pages/erp/accounting/vouchers/Payment.tsx` | A | fincore-engine.ts | — |
| 18 | `src/pages/erp/accounting/vouchers/PurchaseInvoice.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 19 | `src/pages/erp/accounting/vouchers/Receipt.tsx` | A | fincore-engine.ts | — |
| 20 | `src/pages/erp/accounting/vouchers/ReceiptNote.tsx` | A | fincore-engine.ts | — |
| 21 | `src/pages/erp/accounting/vouchers/SalesInvoice.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 22 | `src/pages/erp/accounting/vouchers/StockAdjustment.tsx` | A | fincore-engine.ts | — |
| 23 | `src/pages/erp/accounting/vouchers/StockJournal.tsx` | A | fincore-engine.ts | — |
| 24 | `src/pages/erp/accounting/vouchers/StockTransferDispatch.tsx` | A | fincore-engine.ts | — |
| 25 | `src/pages/erp/bill-passing/RateContractListPanel.tsx` | B | rate-contract-engine.ts, useEntityCode.ts | engine create-export |
| 26 | `src/pages/erp/bill-passing/panels.tsx` | A | bill-passing-engine.ts, bill-passing-masters-bridge.ts, finance-pi-bridge.ts, gi | — |
| 27 | `src/pages/erp/eximx/atlas/BCDCalculator.tsx` | B | bcd-calculator-engine.ts | engine create-export |
| 28 | `src/pages/erp/eximx/atlas/FXWhatIf.tsx` | B | export-realisation-engine.ts, fx-what-if-engine.ts | engine create-export |
| 29 | `src/pages/erp/eximx/masters/IECMaster.tsx` | B | iec-engine.ts | engine create-export |
| 30 | `src/pages/erp/eximx/masters/LUTMaster.tsx` | B | lut-engine.ts | engine create-export |
| 31 | `src/pages/erp/fincore/PurchaseOrder.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 32 | `src/pages/erp/fincore/SalesOrder.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 33 | `src/pages/erp/fincore/masters/AssetCentreMaster.tsx` | C | (direct write) | page success path |
| 34 | `src/pages/erp/fincore/reports/ChallanRegister.tsx` | C | (direct write) | page success path |
| 35 | `src/pages/erp/fincore/reports/Form26AS.tsx` | A | fincore-engine.ts | — |
| 36 | `src/pages/erp/fincore/reports/Form3CD.tsx` | C | (direct write) | page success path |
| 37 | `src/pages/erp/fincore/reports/TDSAnalyticsReport.tsx` | A | fincore-engine.ts | — |
| 38 | `src/pages/erp/fincore/reports/gst/RCMRegister.tsx` | A | fincore-engine.ts | — |
| 39 | `src/pages/erp/fincore/settings/PrintConfigPage.tsx` | C | (direct write) | page success path |
| 40 | `src/pages/erp/fincore/settings/RegisterConfigPage.tsx` | B | register-config-storage.ts, useEntityCode.ts | engine create-export |
| 41 | `src/pages/erp/foundation/BranchOfficeForm.tsx` | C | (direct write) | page success path |
| 42 | `src/pages/erp/foundation/CompanyForm.tsx` | C | (direct write) | page success path |
| 43 | `src/pages/erp/foundation/OrgStructureHub.tsx` | B | decimal-helpers.ts, keyboard.ts, useOrgStructure.ts | engine create-export |
| 44 | `src/pages/erp/foundation/ParentCompany.tsx` | C | (direct write) | page success path |
| 45 | `src/pages/erp/foundation/geography/CityMaster.tsx` | C | (direct write) | page success path |
| 46 | `src/pages/erp/foundation/geography/CountryMaster.tsx` | C | (direct write) | page success path |
| 47 | `src/pages/erp/foundation/geography/DistrictMaster.tsx` | C | (direct write) | page success path |
| 48 | `src/pages/erp/foundation/geography/PortMaster.tsx` | C | (direct write) | page success path |
| 49 | `src/pages/erp/foundation/geography/RegionMaster.tsx` | C | (direct write) | page success path |
| 50 | `src/pages/erp/foundation/geography/StateMaster.tsx` | C | (direct write) | page success path |
| 51 | `src/pages/erp/masters/BusinessUnitMaster.tsx` | C | (direct write) | page success path |
| 52 | `src/pages/erp/masters/CustomerMaster.tsx` | C | (direct write) | page success path |
| 53 | `src/pages/erp/masters/CustomerSegmentMaster.tsx` | A | card-audit-engine.ts | — |
| 54 | `src/pages/erp/masters/LogisticMaster.tsx` | C | (direct write) | page success path |
| 55 | `src/pages/erp/masters/SchemeMaster.tsx` | A | card-audit-engine.ts | — |
| 56 | `src/pages/erp/masters/VendorMaster.tsx` | C | (direct write) | page success path |
| 57 | `src/pages/erp/masters/supporting/ModeOfPaymentMaster.tsx` | C | (direct write) | page success path |
| 58 | `src/pages/erp/masters/supporting/TermsOfDeliveryMaster.tsx` | C | (direct write) | page success path |
| 59 | `src/pages/erp/masters/supporting/TermsOfPaymentMaster.tsx` | C | (direct write) | page success path |
| 60 | `src/pages/erp/payout/AutoPayRulesEditor.tsx` | B | auto-pay-engine.ts, decimal-helpers.ts, useEntityCode.ts | engine create-export |
| 61 | `src/pages/erp/payout/BulkPayBuilder.tsx` | B | auth-helpers.ts, bank-file-engine.ts, bulk-pay-engine.ts | engine create-export |
| 62 | `src/pages/erp/payout/PaymentRequisitionEntry.tsx` | B | default-entity.ts, payment-requisition-engine.ts | engine create-export |
| 63 | `src/pages/erp/payout/VendorPaymentEntry.tsx` | A | fincore-engine.ts | — |
| 64 | `src/pages/erp/procure-hub/masters/BudgetAllocationMaster.tsx` | B | budget-allocation-engine.ts, useEntityCode.ts | engine create-export |
| 65 | `src/pages/erp/procure-hub/panels.tsx` | A | audit-trail-hash-chain.ts, bill-passing-engine.ts, finance-pi-bridge.ts, git-eng | — |
| 66 | `src/pages/erp/procure-hub/transactions/POEntryFromAwardDialog.tsx` | A | po-management-engine.ts | — |
| 67 | `src/pages/erp/procure-hub/transactions/Procure360VendorAgreementEntry.tsx` | B | form-carry-forward-kit.ts, procure360-vendor-agreements-engine.ts, useEntityCode | engine create-export |
| 68 | `src/pages/erp/procure-hub/transactions/VendorAdvanceEntry.tsx` | A | po-management-engine.ts | — |
| 69 | `src/pages/erp/receivx/masters/CollectionExecMaster.tsx` | C | (direct write) | page success path |
| 70 | `src/pages/erp/receivx/masters/IncentiveSchemeMaster.tsx` | C | (direct write) | page success path |
| 71 | `src/pages/erp/receivx/masters/ReceivXConfig.tsx` | C | (direct write) | page success path |
| 72 | `src/pages/erp/receivx/masters/ReminderTemplateMaster.tsx` | C | (direct write) | page success path |
| 73 | `src/pages/erp/salesx/DistributorBroadcast.tsx` | C | (direct write) | page success path |
| 74 | `src/pages/erp/salesx/masters/BeatRouteMaster.tsx` | C | (direct write) | page success path |
| 75 | `src/pages/erp/salesx/masters/CampaignMaster.tsx` | B | keyboard.ts, useCampaigns.ts, utils.ts | engine create-export |
| 76 | `src/pages/erp/salesx/masters/EnquirySourceMaster.tsx` | B | keyboard.ts, useEnquirySources.ts, utils.ts | engine create-export |
| 77 | `src/pages/erp/salesx/masters/HierarchyMaster.tsx` | B | keyboard.ts, useSAMPersons.ts | engine create-export |
| 78 | `src/pages/erp/salesx/masters/SAMPersonMaster.tsx` | B | keyboard.ts, useSAMPersons.ts, useStockGroups.ts | engine create-export |
| 79 | `src/pages/erp/salesx/masters/TargetMaster.tsx` | C | (direct write) | page success path |
| 80 | `src/pages/erp/salesx/masters/TerritoryMaster.tsx` | C | (direct write) | page success path |
| 81 | `src/pages/erp/salesx/reports/CommissionRegister.tsx` | A | fincore-engine.ts | — |
| 82 | `src/pages/erp/salesx/reports/actions/AgentInvoiceDialog.tsx` | C | (direct write) | page success path |
| 83 | `src/pages/erp/salesx/transactions/CallQualityHub.tsx` | B | keyboard.ts, useCallQuality.ts, useCallSessions.ts | engine create-export |
| 84 | `src/pages/erp/salesx/transactions/CampaignTemplatesPanel.tsx` | B | keyboard.ts, useCampaignTemplates.ts, utils.ts | engine create-export |
| 85 | `src/pages/erp/salesx/transactions/DemoOutwardMemo.tsx` | A | fincore-engine.ts | — |
| 86 | `src/pages/erp/salesx/transactions/EnquiryCapture.tsx` | B | auth-helpers.ts, breadcrumb-memory.ts, decimal-helpers.ts | engine create-export |
| 87 | `src/pages/erp/salesx/transactions/ExhibitionMaster.tsx` | B | decimal-helpers.ts, keyboard.ts, useCampaigns.ts | engine create-export |
| 88 | `src/pages/erp/salesx/transactions/InvoiceMemo.tsx` | A | fincore-engine.ts | — |
| 89 | `src/pages/erp/salesx/transactions/LeadAggregationHub.tsx` | B | keyboard.ts, useCampaigns.ts, useEnquiries.ts | engine create-export |
| 90 | `src/pages/erp/salesx/transactions/LeadDistributionHub.tsx` | B | keyboard.ts, useLeadDistribution.ts, useSAMPersons.ts | engine create-export |
| 91 | `src/pages/erp/salesx/transactions/QuotationEntry.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 92 | `src/pages/erp/salesx/transactions/SalesReturnMemo.tsx` | A | fincore-engine.ts | — |
| 93 | `src/pages/erp/salesx/transactions/SampleOutwardMemo.tsx` | A | fincore-engine.ts | — |
| 94 | `src/pages/erp/salesx/transactions/SecondarySales.tsx` | A | fincore-engine.ts | — |
| 95 | `src/pages/erp/salesx/transactions/SupplyRequestMemo.tsx` | A | fincore-engine.ts, useOrders.ts | — |
| 96 | `src/pages/erp/salesx/transactions/Telecaller.tsx` | C | (direct write) | page success path |
| 97 | `src/pages/erp/salesx/transactions/WebinarMaster.tsx` | B | decimal-helpers.ts, keyboard.ts, useCampaigns.ts | engine create-export |
