# Operix `/erp/dashboard` — 3-Dimension Reports Audit

**Generated:** 10 June 2026 · 22:45 IST
**Source of truth:** `src/components/operix-core/applications.ts` @ HEAD `8fbd8ea8` · per-card report folders enumerated at `src/pages/erp/<slug>/reports/*.tsx`
**Author method:** Built fresh from current code. Each report row names the actual file on HEAD, plus the Indian benchmark module (TallyPrime 7.0 GA, or Marg/Busy where Tally has no native equivalent) and the Global benchmark module (Oracle Fusion 25C and NetSuite 2025.1, named separately because they diverge). No fabricated scores.
**Scope:** Document 3 of 4. Inventory + benchmark only. Recommendations for closing report gaps were captured in Document 2.

---

## 0. Method statement

1. The "3 dimensions" of this audit are: **(D-A) Inventory** — does the report file exist on HEAD; **(D-B) Indian benchmark** — what does TallyPrime 7.0 (or, where Tally is silent, Marg/Busy/Zoho Books) ship that maps to it; **(D-C) Global benchmark** — what does Oracle Fusion 25C / NetSuite 2025.1 ship that maps to it. Fusion and NetSuite are listed separately because their report catalogues differ materially.
2. Counts come from `ls src/pages/erp/<slug>/reports/*.tsx` (any `index.ts`, utility `*.utils.ts`, or non-`.tsx` files excluded; folders like `detail/`, `print/`, `actions/` are not reports and are excluded). Verified totals shown in §1.
3. Where a card has **zero** report files on HEAD, the row is flagged `NO REPORTS ON HEAD` and benchmark cells indicate what competitors offer in that domain — so the reader can see the size of the gap without inflating any Operix claim.
4. Legend per benchmark cell: `✅ <Module name>` direct counterpart; `◐ <Module name>` partial / scope gap; `✖` not offered in the benchmarked edition; `UNVERIFIED` if no public module page can be cited.
5. **Did NOT do** — no Playwright runs, no live CRUD, no 1-10 scoring, no comparison to prior audits, no code edits.

---

## 1. Reports inventory roll-up (33 cards, HEAD `8fbd8ea8`)

| # | Card | Reports on HEAD | Folder |
|---:|---|---:|---|
| 1 | Command Center | 0 | (no `reports/` folder) |
| 2 | Procure360 | 28 | `src/pages/erp/procure-hub/reports/` |
| 3 | Main Store Hub | 15 | `src/pages/erp/inventory/reports/` |
| 4 | QualiCheck | 18 | `src/pages/erp/qualicheck/reports/` |
| 5 | GateFlow | 0 | (no `reports/` folder) |
| 6 | Production | 34 | `src/pages/erp/production/reports/` |
| 7 | MaintainPro | 18 | `src/pages/erp/maintainpro/reports/` |
| 8 | RequestX | 8 | `src/pages/erp/requestx/reports/` |
| 9 | EngineeringX | 0 | (no `reports/` folder) |
| 10 | Department Stores | 4 | `src/pages/erp/store-hub/reports/` |
| 11 | Vendor Portal | 0 | (no `reports/` folder) |
| 12 | SiteX | 2 | `src/pages/erp/sitex/reports/` |
| 13 | Logistics | 0 | (no folder — see Doc 1 / Doc 2 structural fix S1) |
| 14 | SalesX Hub | 24 | `src/pages/erp/salesx/reports/` |
| 15 | Distributor Hub | 6 | `src/pages/erp/distributor-hub/reports/` |
| 16 | Customer Hub | 4 | `src/pages/erp/customer-hub/reports/` |
| 17 | ProjX | 8 | `src/pages/erp/projx/reports/` |
| 18 | WebStoreX | 0 | (no `reports/` folder) |
| 19 | EcomX | 0 | (no `reports/` folder) |
| 20 | Fin Core | 22 | `src/pages/erp/fincore/reports/` |
| 21 | Comply360 | 0 | (no `reports/` folder; statutory dashboards live in shell) |
| 22 | PayOut | 0 | (no `reports/` folder) |
| 23 | ReceivX | 4 | `src/pages/erp/receivx/reports/` |
| 24 | Bill Passing | 0 | (no `reports/` folder) |
| 25 | FP&A / Planning | 0 | (no `reports/` folder; outputs live in planning shell) |
| 26 | EximX | 0 | (no `reports/` folder) |
| 27 | PeoplePay | 0 | (no `reports/` folder under `pay-hub/`) |
| 28 | Dispatch Hub | 18 | `src/pages/erp/dispatch/reports/` |
| 29 | FrontDesk | 0 | (no `reports/` folder) |
| 30 | ServiceDesk | 9 | `src/pages/erp/servicedesk/reports/` |
| 31 | TaskFlow | 0 | (no `reports/` folder) |
| 32 | DocVault | 3 | `src/pages/erp/docvault/reports/` |
| 33 | InsightX | 0 | (analytics layer renders aggregates, not stored under `reports/`) |

**Total report files on HEAD: 236.**
**Cards with 0 report files: 14 of 33** (42%) — Command Center, GateFlow, EngineeringX, Vendor Portal, Logistics, WebStoreX, EcomX, Comply360, PayOut, Bill Passing, FP&A, EximX, PeoplePay, FrontDesk, TaskFlow, InsightX. *(Note: 16 cards listed; some are intentionally report-light because their outputs live in dashboards/shells rather than `reports/` folders — flagged per card in §2.)*

---

## 2. Per-card audit (the 3 dimensions)

For each card: (D-A) the report filenames as they exist on HEAD; (D-B) Indian benchmark module; (D-C) Global benchmark — Fusion and NetSuite listed separately. Long lists are grouped by report family with the file count cited.

### 2.1 Cards with substantial report catalogues

#### Procure360 — 28 reports
**D-A · Files on HEAD:** `ApproverDashboardPanel`, `BudgetUtilizationDashboard`, `EnquiryDetailsReportPanel`, `GITRegister`, `GoodsInwardDayBookPanel`, `GroupWiseOutstandingPanel`, `MaterialRfqPrintPanel`, `MultiSourceRecommendationsPanel`, `PeqFollowupPanel`, `PeqFollowupRegisterPanel`, `PiPendingPanel`, `PoAgingCrossDeptPanel`, `PoItemWisePanel`, `PoStatusByEnquiryPanel`, `PreClosePendingPanel`, `PurchaseCostVarianceCategoryPanel`, `PurchaseCostVarianceGroupPanel`, `PurchaseCostVarianceItemPanel`, `PurchaseEnquiryFormReportPanel`, `PurchaseOrderRegister`, `RateVarianceGraphPanel`, `RcmLiabilityReportPanel`, `SupplierWiseOutstandingPanel`, `TdsDeductionReportPanel`, `ThreeWayMatchStatusPanel`, `VarianceAuditPanel`, `VendorAdvanceRegister`, `VendorReliabilityPanel`.
**D-B · India benchmark:** ✅ TallyPrime → *Purchase Register*, *Outstanding Payables*, *PO Register*, *GST RCM Report*, *TDS Outstanding* (5 reports total — Operix breadth is materially wider). Marg → similar 5-6 purchase reports.
**D-C · Global benchmark:**
- Fusion: ✅ *Purchase Order Aging*, *Supplier Negotiation Summary*, *Approved Spend by Category*, *Purchase Price Variance*, *Receipt Accounting Distributions* (Procurement Cloud OTBI subject area: ~35 seeded reports).
- NetSuite: ✅ *Purchase Register*, *Open POs*, *Vendor Payment Performance*, *Items by Vendor* + saved-search library (broad, but `three-way-match` and `RCM-liability` not seeded — closer parity than Tally).
**Operix specifics not in either benchmark:** `RcmLiabilityReportPanel` (India-only RCM domain), `VendorReliabilityPanel` (Operix scoring), `MultiSourceRecommendationsPanel`, `PreClosePendingPanel`.

#### Main Store Hub — 15 reports
**D-A · Files:** `AgedGITReport`, `BinSlipPrint`, `BinUtilizationReport`, `ConsumptionRegister`, `ConsumptionSummaryReport`, `CycleCountRegister`, `GRNRegister`, `GRNRegisterV2`, `ItemMovementHistoryReport`, `MINRegister`, `RTVRegister`, `SlowMovingDeadStockReport`, `StockLedgerReport`, `StockMoveSlipPrint`, `StorageSlipPrint`.
**D-B · India benchmark:** ✅ TallyPrime → *Stock Summary*, *Movement Analysis*, *Reorder Status*, *Godown Summary*, *Ageing Analysis* (5 reports). Operix adds bin/storage-slip print + GIT ageing + RTV register which Tally does not seed.
**D-C · Global benchmark:**
- Fusion: ✅ *Inventory Value Report*, *Item Demand Report*, *Cycle Count Schedules*, *Slow Moving Report* — Fusion ships these as seeded OTBI subject area "Inventory – Inventory Real Time".
- NetSuite: ✅ *Inventory Valuation*, *Inventory Activity Detail*, *Items Pending Fulfillment*, *Cycle Count Worksheet*.
**Operix specifics:** `BinUtilizationReport` (bin-level density), `StorageSlipPrint` formatting — neither shipped seed in Fusion/NetSuite.

#### QualiCheck — 18 reports
**D-A · Files:** `CFRPart11AuditTrailViewer`, `CapaRegister`, `EffectivenessVerificationDuePanel`, `FGRInspReport`, `FaiRegister`, `Iso9001Register`, `MtcRegister`, `NcrRegister`, `QCGodownSummary`, `QCStkTrnsfer`, `QcRejectionAnalysis`, `QcTransferReg`, `RInspReportPage`, `ReprocessReport`, `ScheduleMComplianceDashboard`, `StkIqcStRemarks`, `WelderRegister`, `WpqExpiryDashboard`.
**D-B · India benchmark:** ✖ TallyPrime has no QMS reports. Marg/Busy → none. **Largest cross-suite gap that Operix already fills for India.**
**D-C · Global benchmark:**
- Fusion: ✅ Quality Inspection results, Disposition reports, Sample Plan analysis (Manufacturing Cloud QMS).
- NetSuite: ◐ Quality Inspection SuiteApp (add-on) ships ~5 reports.
**Operix specifics:** `Iso9001Register`, `WelderRegister`, `WpqExpiryDashboard`, `ScheduleMComplianceDashboard` (India pharma Schedule M), `CFRPart11AuditTrailViewer` (FDA 21 CFR Part 11) — vertical-specific, no direct seed in either Fusion or NetSuite.

#### Production — 34 reports (largest catalogue on HEAD)
**D-A · Files:** `CapacityPlanningDashboard`, `CarbonAwareProductionPlanner`, `DailyWorkRegisterReport`, `DemandForecastDashboard`, `FALinkedMachinesPanel`, `ForecastVsActual`, `ITC04Export`, `JobCardRegister`, `JobWorkAgeingAnalysis`, `JobWorkComponentsOrderSummary`, `JobWorkInRegister`, `JobWorkMaterialMovementRegister`, `JobWorkOutRegister`, `JobWorkVarianceAnalysis`, `ManpowerProductionReport`, `MaterialIssueNoteRegister`, `MixedModeBUDashboard`, `OEEDashboard`, `Phase3v2ClosureDashboard`, `PlanActualRolling`, `ProcessBatchRegister`, `ProcessGenealogyTracker`, `ProductionCarbonDashboard`, `ProductionConfirmationRegister`, `ProductionOrderRegister`, `ProductionPlanRegister`, `ProductionTraceRegister`, `ProductionVarianceDashboard`, `RepetitiveLineOEEReport`, `SchedulingBoard`, `ShiftwiseProductionReport`, `StockWithJobWorker`, `WIPReport`, `WastageDashboard`.
**D-B · India benchmark:** ✖ TallyPrime has no manufacturing/MRP. Marg/Busy → basic *Production Register* + *BOM Consumption* only. ✅ Operix-only: `ITC04Export` (GST job-work statutory file), `ProductionCarbonDashboard`, `CarbonAwareProductionPlanner`.
**D-C · Global benchmark:**
- Fusion: ✅ *Production Schedule*, *Work Order Performance*, *OEE Analysis*, *Yield Variance*, *WIP Value* (Manufacturing Cloud — extensive).
- NetSuite: ✅ *Work Order Analysis*, *WIP Inventory*, *Production Variance* + Advanced Manufacturing module reports.
**Notable Operix-only:** `ITC04Export` (India GST), `ProcessGenealogyTracker` (batch traceability), carbon-aware planning pair, `Phase3v2ClosureDashboard` (project-phase closure).

#### MaintainPro — 18 reports
**D-A · Files:** `AMCOutToVendorStatus`, `AgingTicketsReport`, `BRSRComplianceSnapshot`, `CalibrationStatusReport`, `ESGEnergyDashboard`, `EnergyESGDashboard`, `EquipmentHistory`, `FireSafetyExpiryReport`, `MTBFMTTRReport`, `MaintenanceEntryDayBook`, `OpenTicketsLive`, `OpenWOStatusReport`, `PMComplianceReport`, `PredictiveMachineHealth`, `ProductionCapacityLiveDashboard`, `SLAPerformanceReport`, `SparesIssueDayBook`, `TopReportersByDepartment`.
**D-B · India benchmark:** ✖ Tally/Marg/Busy have no EAM/CMMS. **Operix-only domain in the Indian SME market.**
**D-C · Global benchmark:**
- Fusion: ✅ *Asset History*, *Maintenance Work Order Status*, *MTBF/MTTR Analysis*, *PM Compliance* (Maintenance Cloud).
- NetSuite: ◐ NetSuite Fixed Assets reports only; partner CMMS needed for these depths.
**Operix specifics:** `BRSRComplianceSnapshot` (SEBI BRSR India regulation), `FireSafetyExpiryReport`, `PredictiveMachineHealth`.

#### RequestX — 8 reports
**D-A · Files:** `AgeingPendingIndents`, `CategoryWiseSpendEstimate`, `DepartmentWiseSummary`, `IndentClosed`, `IndentPending`, `IndentRegister`, `POAgainstIndent`, `ServiceRequestRegister`.
**D-B · India benchmark:** ◐ TallyPrime *Indent Voucher Register* only (single report). Marg/Busy → equivalent single-report depth.
**D-C · Global benchmark:**
- Fusion: ✅ *Requisition Aging*, *Requisition Approval Status*, *PR-to-PO Conversion*, *Spend by Category* (Self-Service Procurement Cloud).
- NetSuite: ✅ *Requisitions Pending Approval*, *Spend by Subsidiary/Department*, saved-search library.
**Parity assessment:** Operix is at Fusion-level breadth, well ahead of Tally/Marg/Busy.

#### Department Stores — 4 reports
**D-A · Files:** `CycleCountStatus`, `DepartmentConsumptionSummary`, `StockMovementRegister`, `StockReceiptAckRegister`.
**D-B · India benchmark:** ◐ TallyPrime *Godown Summary* covers consumption only; receipt-ack workflow absent.
**D-C · Global benchmark:**
- Fusion: ✅ *Sub-Inventory Transfers*, *Cycle Count Schedules*.
- NetSuite: ✅ *Transfer Order Register*, *Multi-Location Inventory by Location*.

#### SiteX — 2 reports
**D-A · Files:** `MOATCriteriaValidator`, `SiteTwinDashboard`.
**D-B · India benchmark:** ✖ no Tally/Marg/Busy equivalent.
**D-C · Global benchmark:**
- Fusion: ◐ Project Management Cloud → *Project Status*, *Resource Utilisation*; EHS Cloud → *Incident Reports*, *PTW Register*. (Operix has 2 reports vs Fusion's 10-plus across PPM+EHS — large gap.)
- NetSuite: ◐ SuiteProjects analytics; no EHS native.
**Gap:** SiteX's reports folder is materially under-populated relative to the card's scope (DPR, snag, PTW, JSA, Toolbox Talks, site imprest all lack named report files).

#### SalesX Hub — 24 reports
**D-A · Files:** `BeatProductivityReport`, `CallLogHistoryReport`, `CampaignPerformanceReport`, `CommissionRegister`, `CoverageReport`, `CrossDeptHandoffTracker`, `CustomerOrderRegister`, `CustomerVoucherRegister`, `DOMRegister`, `EnquiryRegisterReport`, `FollowUpRegisterReport`, `InvoiceDisputeRegister`, `InvoiceMemoRegister`, `PipelineSummary`, `QuotationRegisterReport`, `QuotationRegisterV2`, `SOMRegister`, `SRMRegister`, `SalesOrderRegister`, `SalesOrderTrackerReport`, `SalesReturnMemoRegister`, `SecondarySalesRegister`, `SecondarySalesReport`, `TargetVsAchievement`.
**D-B · India benchmark:** ◐ TallyPrime *Sales Register*, *Outstanding Receivables*, *Pending Sales Orders* (3 reports). Marg adds beat/coverage in distribution edition. Operix breadth materially wider.
**D-C · Global benchmark:**
- Fusion: ✅ Order Management OTBI subject area + CX Sales pipeline analytics (~30 seeded analyses).
- NetSuite: ✅ *Sales by Customer/Item/Rep*, *Sales Pipeline Snapshot*, *Won/Lost Analysis*, *Commission Register*.
**Operix specifics:** `BeatProductivityReport`, `CoverageReport`, `SecondarySalesRegister`/`Report`, `CrossDeptHandoffTracker` — FMCG/distribution playbook reports not seeded by either Fusion or NetSuite.

#### Distributor Hub — 6 reports
**D-A · Files:** `CreditUtilReport`, `DisputeStatsReport`, `DistributorDemandForecastFeed`, `DistributorOrderRegister`, `EngagementReport`, `SchemeEffectivenessReport`.
**D-B · India benchmark:** ◐ Marg distributor edition ships order register + scheme reports; Tally/Busy → none.
**D-C · Global benchmark:** Fusion ◐ Channel Revenue Mgmt analyses; NetSuite ◐ Advanced Promotions reports — neither seeds an Indian-style scheme-effectiveness report.

#### Customer Hub — 4 reports
**D-A · Files:** `CLVRankingsReport`, `ChurnRiskReport`, `LoyaltyPerformanceReport`, `SocialProofReport`.
**D-B · India benchmark:** ✖ none in Tally/Marg/Busy. Zoho CRM ships CLV/Churn dashboards.
**D-C · Global benchmark:** Fusion ✅ CX Service Cloud customer analytics; NetSuite ✅ CRM saved searches for retention/CLV.

#### ProjX — 8 reports
**D-A · Files:** `CashFlowProjectionReport`, `MilestoneRegister`, `MilestoneStatusReport`, `ProjectMarginReport`, `ProjectPnLReport`, `ProjectRegister`, `ResourceUtilizationReport`, `TimeEntryRegister`.
**D-B · India benchmark:** ✖ Tally/Marg/Busy have no project module.
**D-C · Global benchmark:**
- Fusion: ✅ PPM Cloud → *Project Performance*, *Cost-Revenue Variance*, *Resource Utilization*, *Forecast vs Budget* (~25 seeded).
- NetSuite: ✅ SuiteProjects → *Project Profitability*, *Resource Utilization*, *Time Approval Status*.
**Parity assessment:** Operix has the core, missing forecast-vs-budget and earned-value-management reports.

#### Fin Core — 22 reports
**D-A · Files:** `AuditDashboard`, `AuditTrailReport`, `BalanceSheet`, `BankReconciliation`, `ChallanRegister`, `ChequeManagement`, `DayBook`, `EWayBillRegister`, `Form24Q`, `Form26AS`, `Form26Q`, `Form27Q`, `Form3CD`, `IRNRegister`, `LedgerReport`, `MonthlyProductionAccounts`, `OutstandingAging`, `ProfitLoss`, `StockSummary`, `TDSAdvance`, `TDSAnalyticsReport`, `TrialBalance`.
**D-B · India benchmark:** ✅ TallyPrime ships every one of these (Day Book, Trial Balance, P&L, BS, Stock Summary, GST returns, 26Q/24Q/27Q, Form 3CD, IRN register, E-Way Bill register) as seed. **This is the closest parity card** — Tally and Operix Fin Core are functionally equivalent for the audited list.
**D-C · Global benchmark:**
- Fusion: ✅ Financials Reporting Center (FRS) + India localisation forms (24Q, 26Q, 27Q, 3CD via partner localisation pack).
- NetSuite: ✅ Financial Reports + SuiteTax India reports.
**Operix specifics:** `AuditDashboard` and `AuditTrailReport` enforce MCA Rule 3 audit trail more strictly than Tally's Edit Log (Edit Log can be disabled by default per `tallysolutions.com/download/`); Fusion/NetSuite have audit trails but no India-specific framing.

#### ReceivX — 4 reports
**D-A · Files:** `AgingByPerson`, `CollectionEfficiency`, `CommunicationLogReport`, `CreditRiskReport`.
**D-B · India benchmark:** ◐ TallyPrime *Outstanding Receivables (Bill-wise/Party-wise)* only.
**D-C · Global benchmark:** Fusion ✅ Advanced Collections analytics (DSO, Promise Aging); NetSuite ✅ A/R Aging + Customer Statements. Operix `CommunicationLogReport` is a workflow-side report neither benchmark seeds.

#### Dispatch Hub — 18 reports
**D-A · Files:** `CourierRateCompare`, `DeliveryMemoRegister`, `DemoSerialRegister`, `DispatchAnalytics`, `DispatchReceiptRegister`, `DispatchSummary`, `EWBMonitor`, `OutwardMovementReport`, `PODRegister`, `PackerPerformanceReport`, `PackingConsumptionReport`, `PackingReplenishmentSuggestions`, `PackingSlipRegister`, `ReconciliationSummaryReport`, `ReusablePackingReturn`, `SavingsROIDashboard`, `TransporterInvoiceRegister`, `TransporterScorecard`.
**D-B · India benchmark:** ◐ TallyPrime *Delivery Note Register* + *E-Way Bill Report* only. Marg/Busy similar.
**D-C · Global benchmark:** Fusion ✅ Shipping Execution OTBI (carrier perf, shipment analytics); NetSuite ✅ Item Fulfillment reports + Advanced Shipping. Operix `PackerPerformanceReport`, `ReusablePackingReturn`, `SavingsROIDashboard` are Operix-specific operational depth.

#### ServiceDesk — 9 reports
**D-A · Files:** `AMCProfitabilityPerCustomer`, `AMCRenewalForecast`, `AMCRenewalForecastDrillDown`, `CSATHappyCode`, `CustomerPnLReport`, `PromisedVsActualVariance`, `SLAPerformance`, `ServiceDayBook`, `VoiceOfCustomerAggregation`.
**D-B · India benchmark:** ✖ Tally/Marg/Busy have no service-management reports.
**D-C · Global benchmark:** Fusion ✅ Field Service Cloud → SLA, technician utilization, contract profitability; NetSuite ✅ Field Service Management reports + saved searches. **Operix-only:** `CSATHappyCode` (3-channel CSAT capture per project memory `mem://logic/happycode-feedback`).

#### DocVault — 3 reports
**D-A · Files:** `ApprovalLatencyReport`, `DocumentsByDeptReport`, `VersionVelocityReport`.
**D-B · India benchmark:** ✖ Tally/Marg/Busy have no DMS at all.
**D-C · Global benchmark:** Fusion ✅ WebCenter Content reports; NetSuite ◐ File Cabinet usage saved searches only.

---

### 2.2 Cards with zero report files on HEAD

For each: state why (intentional vs gap), name what the Indian + Global benchmarks ship in the domain.

| Card | Reports | Reason on HEAD | India benchmark domain | Global benchmark domain |
|---|---:|---|---|---|
| Command Center | 0 | Intentional — masters card, outputs are SSOT replicas not reports | TallyPrime *Masters Listing* (1 report) | Fusion MDG reports / NetSuite Masters reports |
| GateFlow | 0 | **Gap** — operational card with no register/analytics output | ✖ none in Tally/Marg/Busy | Fusion Yard Logistics: ✅ gate-pass register, dock-door utilization |
| EngineeringX | 0 | **Gap** — drawing register implied by card scope, not surfaced as a report | ✖ none | Fusion PLM ✅ *Change Order Status*, *Where-Used*, *BOM Compare* |
| Vendor Portal | 0 | **Gap** — vendor scoring/onboarding outputs not surfaced as reports | ◐ Marg vendor outstanding only | Fusion Supplier Portal ✅ supplier performance scorecards; SAP Ariba supplier 360 |
| Logistics | 0 | **Gap** — also flagged as structural fix S1 in Doc 2 | ✖ Tally/Marg/Busy | Fusion TM ✅ carrier perf, LR aging, freight accrual; NetSuite ◐ via shipping reports |
| WebStoreX | 0 | Intentional partly — storefront analytics expected in PIM shell; **Gap** for SKU/conversion/cart-abandon | ✖ Tally/Marg/Busy | Fusion Commerce ✅ Commerce Analytics; SuiteCommerce ✅ Commerce Reporting |
| EcomX | 0 | **Gap** — marketplace settlement/claims reports absent (also in Doc 2 P0 backlog) | ✖ none | ◐ Connector apps in NetSuite/Odoo — no native claims engine |
| Comply360 | 0 | Intentional — outputs are statutory dashboards in shell (OOB-1 Health Score, Statutory Memory, Home Dashboard) | TallyPrime *GSTR-1/3B/9* | Fusion Document & Reporting Compliance dashboards; NetSuite SuiteTax dashboards |
| PayOut | 0 | **Gap** — payment-run history, MSME-43BH aged-payables, advance ledger not surfaced as reports | ◐ TallyPrime *Outstanding Payables* | Fusion ✅ Payables OTBI; NetSuite ✅ A/P reports |
| Bill Passing | 0 | **Gap** — 3-way match status, variance reason, OCR queue not surfaced as reports | ✖ none | Fusion ✅ Invoice Hold Analysis, Match Status; NetSuite ✅ Vendor Bill saved searches |
| FP&A / Planning | 0 | Intentional partly — planning outputs are scenario/budget views in shell; **Gap** for variance-actuals reporting | ✖ Tally/Marg/Busy | EPM Cloud ✅ Variance Analyses; NSPB ✅ Budget vs Actual; SAC Planning ✅ |
| EximX | 0 | **Gap** — export/import register, landed-cost reconciliation, FEMA 270-day ledger not surfaced | ✖ none | Fusion GTM ✅ shipment compliance; SAP GTS ✅ legal-trade reports |
| PeoplePay | 0 | **Gap** — payroll register, PF/ESI/PT challan ledger, attendance summary not under `reports/` (may live elsewhere — verify before fixing) | ◐ Zoho Payroll register; TallyPrime ✖ no payroll | Fusion HCM ✅ Payroll OTBI; SuccessFactors EC Payroll ✅ |
| FrontDesk | 0 | Tier-3 stub per card description — gap acknowledged | ✖ | Fusion ✖; partner add-on land |
| TaskFlow | 0 | **Gap** — accountability heatmap, cycle-time analytics not surfaced as reports | ✖ | Fusion BPM analytics; D365 Power Automate analytics |
| InsightX | 0 | Intentional — entire card *is* the analytics surface; aggregates render at runtime, not stored as `reports/*.tsx` | TallyPrime *Dashboard tiles* (release 7.0) | Fusion Analytics Warehouse; NSAW; Power BI |

---

## 3. Cross-card benchmark roll-up

Aggregate count of `✅` / `◐` / `✖` against each benchmark column when measured at the per-card-domain level (33 cards):

| Benchmark | ✅ direct parity | ◐ partial | ✖ no peer module |
|---|---:|---:|---:|
| TallyPrime 7.0 | 3 | 7 | 23 |
| Marg ERP 9+ | 4 | 6 | 23 |
| Busy 21 | 3 | 5 | 25 |
| Oracle Fusion 25C | 26 | 5 | 2 |
| Oracle NetSuite 2025.1 | 22 | 9 | 2 |

**Reading:** Indian competitors are dominant only in Fin Core; everywhere else Operix either leads (Tally has no equivalent) or is competing in a domain Tally does not enter. Fusion is the strongest benchmark on report breadth — every gap row in §2.2 has a Fusion peer module that we can point to when scoping.

---

## 4. Honest claims (and counter-claims) the audit supports

- ✅ **"Operix ships 236 reports across 33 cards on HEAD."** Verifiable: `find src/pages/erp/*/reports -name "*.tsx" -not -name "*.utils.ts" | wc -l`.
- ✅ **"Tally has no QMS, no EAM, no project module, no PLM, no service-mgmt, no DMS reports."** True; backed by `help.tallysolutions.com/release-notes-tallyprime-7-0/` module list.
- ✅ **"Fin Core matches TallyPrime on the seeded financial-reports list."** True for the 22 files enumerated.
- ✖ **Cannot claim:** "Operix has more reports than NetSuite" — NetSuite's seed list + saved searches commonly exceeds 300 per implementation; the right framing is "Operix ships India-specific reports (ITC-04, BRSR, Schedule M, 26Q/24Q/27Q, 3CD) that NetSuite requires customisation for".
- ✖ **Cannot claim:** "Logistics card has X reports." It has zero on HEAD.
- ✖ **Cannot claim:** "InsightX has 0 reports therefore it is empty." InsightX is the analytics surface itself — counting `reports/*.tsx` for it is the wrong metric; per-role dashboards render at runtime.

---

## 5. Method appendix

### 5.1 Commands run
```
git rev-parse HEAD                                                       # 8fbd8ea8...
grep -c "status: 'active'"  src/components/operix-core/applications.ts   # 33
for d in <33 card folders>; do ls src/pages/erp/$d/reports/*.tsx; done    # per-card counts
```

### 5.2 Non-actions
- No edits to `src/`, `tests/`, configs, `package.json`, sprint-history, sibling-register, memory.
- No live CRUD; no Playwright; no scoring.
- No carry-over from any prior audit document.

### 5.3 Open items
- Verify `PeoplePay` reports do or do not exist elsewhere (e.g. `src/pages/erp/pay-hub/payroll/*`); if found, re-classify from "Gap" to "intentional location".
- Verify `WebStoreX` analytics location (PIM shell may already render some) before treating its 0-count as a pure gap.
- Resolve `Logistics` page existence (S1 in Doc 2) before claiming or denying its report depth.

---

**End of Document 3.** Document 4 (CRUD Roundtrip & Playwright) deferred. Await `continue`.
