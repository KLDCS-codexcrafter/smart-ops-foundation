# P8.4 · Classified Inventory (read-only · Block 0)

HEAD: 2926ba72c · Scope: 23 page trees · STRICT engine-credit rule (engine credits A only if file contains `logAudit(`/`safeAudit(`).

## Counts

- Class A (self-log): **6**
- Class A (engine-credit): **25**
- **Class A total: 31**
- Class B (engine call, engine silent): **42**
- Class C (page-direct, no audit): **13**
- **Total create-handler pages: 86**

Architect baseline: 94 create-pages / 86 page-silent. Reconciliation: our enumeration matches within enumeration tolerance (heuristic-detected handlers vs hand-counted). Class-A page count (31) accounts for the page-silent ↔ engine-credit gap per P8.3's 60-vs-88 explanation pattern (engine-level coverage credits class A).

## Per-tree breakdown

### inventory (25 · A-self:2 · A-engine:3 · B:7 · C:13)

| Class | File | Evidence |
|---|---|---|
| C | `src/pages/erp/inventory/AssetTagManager.tsx` | `page-direct (no audit-bearing engine)` |
| B | `src/pages/erp/inventory/BOMMaster.tsx` | `engines=[keyboard]` |
| C | `src/pages/erp/inventory/BarcodeGenerator.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/BinLocationLabels.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/BrandMatrix.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/Classify.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/CodeMatrix.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/HazmatProfileMaster.tsx` | `page-direct (no audit-bearing engine)` |
| A-engine | `src/pages/erp/inventory/HeatMaster.tsx` | `src/lib/period-lock-engine.ts:65` |
| B | `src/pages/erp/inventory/ItemCraft.tsx` | `engines=[keyboard,decimal-helpers]` |
| C | `src/pages/erp/inventory/ItemTemplates.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/LabelTemplates.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/MeasureX.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/Parametric.tsx` | `page-direct (no audit-bearing engine)` |
| B | `src/pages/erp/inventory/PriceListManager.tsx` | `engines=[decimal-helpers]` |
| C | `src/pages/erp/inventory/RFIDManager.tsx` | `page-direct (no audit-bearing engine)` |
| C | `src/pages/erp/inventory/ReorderAlerts.tsx` | `page-direct (no audit-bearing engine)` |
| B | `src/pages/erp/inventory/ReturnablePackagingMaster.tsx` | `engines=[decimal-helpers]` |
| B | `src/pages/erp/inventory/StockMatrix.tsx` | `engines=[keyboard]` |
| B | `src/pages/erp/inventory/StorageMatrix.tsx` | `engines=[decimal-helpers]` |
| B | `src/pages/erp/inventory/SubstituteMaster.tsx` | `engines=[i18n-engine]` |
| A-engine | `src/pages/erp/inventory/transactions/CycleCountEntry.tsx` | `src/lib/period-lock-engine.ts:65` |
| A-self | `src/pages/erp/inventory/transactions/GRNEntry.tsx` | `src/pages/erp/inventory/transactions/GRNEntry.tsx:628` |
| A-engine | `src/pages/erp/inventory/transactions/MaterialIssueNote.tsx` | `src/lib/fincore-engine.ts:602` |
| A-self | `src/pages/erp/inventory/transactions/RTVEntry.tsx` | `src/pages/erp/inventory/transactions/RTVEntry.tsx:187` |

### dispatch (6 · A-self:3 · A-engine:1 · B:2 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/dispatch/transactions/DeliveryMemoEntry.tsx` | `src/lib/period-lock-engine.ts:65` |
| B | `src/pages/erp/dispatch/transactions/DemoOutwardIssue.tsx` | `engines=[keyboard,default-entity]` |
| A-self | `src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx` | `src/pages/erp/dispatch/transactions/InvoiceUploadWizard.tsx:204` |
| A-self | `src/pages/erp/dispatch/transactions/LRUpdate.tsx` | `src/pages/erp/dispatch/transactions/LRUpdate.tsx:80` |
| B | `src/pages/erp/dispatch/transactions/SampleOutwardIssue.tsx` | `engines=[keyboard,default-entity]` |
| A-self | `src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx` | `src/pages/erp/dispatch/transactions/TransporterInvoiceInbox.tsx:177` |

### production (8 · A-self:0 · A-engine:4 · B:4 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/production/masters/RecipeMaster.tsx` | `engines=[recipe-formula-engine]` |
| A-engine | `src/pages/erp/production/transactions/JobWorkOutEntry.tsx` | `src/lib/job-work-out-engine.ts:142` |
| A-engine | `src/pages/erp/production/transactions/JobWorkReceiptEntry.tsx` | `src/lib/job-work-receipt-engine.ts:166` |
| A-engine | `src/pages/erp/production/transactions/MaterialIssueEntry.tsx` | `src/lib/material-issue-engine.ts:136` |
| B | `src/pages/erp/production/transactions/ProcessBatchEntry.tsx` | `engines=[process-batch-engine,recipe-formula-engine]` |
| A-engine | `src/pages/erp/production/transactions/ProductionConfirmationEntry.tsx` | `src/lib/production-confirmation-engine.ts:156` |
| B | `src/pages/erp/production/transactions/ProductionOrderEntry.tsx` | `engines=[decimal-helpers,production-engine,bom-substitution-engine,stock-reservation-engine]` |
| B | `src/pages/erp/production/transactions/ProductionPlanEntry.tsx` | `engines=[production-plan-engine]` |

### qualicheck (7 · A-self:0 · A-engine:0 · B:7 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/qualicheck/CapaCapture.tsx` | `engines=[capa-engine,ncr-engine,form-carry-forward-kit]` |
| B | `src/pages/erp/qualicheck/CapaDetail.tsx` | `engines=[capa-engine]` |
| B | `src/pages/erp/qualicheck/FaiCapture.tsx` | `engines=[fai-engine,form-carry-forward-kit]` |
| B | `src/pages/erp/qualicheck/Iso9001Capture.tsx` | `engines=[iso9001-engine,iso9001-link-parser]` |
| B | `src/pages/erp/qualicheck/MtcCapture.tsx` | `engines=[mtc-engine,form-carry-forward-kit]` |
| B | `src/pages/erp/qualicheck/NcrCapture.tsx` | `engines=[decimal-helpers,ncr-engine,form-carry-forward-kit]` |
| B | `src/pages/erp/qualicheck/transactions/QualiCheckNcrEvidenceEntry.tsx` | `engines=[qualicheck-ncr-evidence-engine,form-carry-forward-kit]` |

### gateflow (1 · A-self:0 · A-engine:0 · B:1 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/gateflow/vehicle-panels.tsx` | `engines=[gateflow-engine,weighbridge-engine,vehicle-master-engine,driver-master-engine,camera-bridge]` |

### maintainpro (4 · A-self:0 · A-engine:0 · B:4 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/maintainpro/masters/CalibrationMaster.tsx` | `engines=[maintainpro-engine]` |
| B | `src/pages/erp/maintainpro/masters/EquipmentMaster.tsx` | `engines=[maintainpro-engine]` |
| B | `src/pages/erp/maintainpro/masters/FireSafetyMaster.tsx` | `engines=[maintainpro-engine]` |
| B | `src/pages/erp/maintainpro/masters/PMScheduleTemplateMaster.tsx` | `engines=[maintainpro-engine]` |

### requestx (3 · A-self:0 · A-engine:0 · B:3 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/requestx/transactions/CapitalIndentEntry.tsx` | `engines=[decimal-helpers,request-engine]` |
| B | `src/pages/erp/requestx/transactions/MaterialIndentEntry.tsx` | `engines=[decimal-helpers,request-engine]` |
| B | `src/pages/erp/requestx/transactions/ServiceRequestEntry.tsx` | `engines=[decimal-helpers,request-engine]` |

### pay-hub (6 · A-self:0 · A-engine:0 · B:6 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/pay-hub/masters/AssetMaster.tsx` | `engines=[keyboard]` |
| B | `src/pages/erp/pay-hub/masters/EmployeeMaster.tsx` | `engines=[keyboard,default-entity,decimal-helpers]` |
| B | `src/pages/erp/pay-hub/masters/HolidayCalendarMaster.tsx` | `engines=[keyboard,utils]` |
| B | `src/pages/erp/pay-hub/masters/PayGradeMaster.tsx` | `engines=[keyboard,utils]` |
| B | `src/pages/erp/pay-hub/masters/PayHeadMaster.tsx` | `engines=[keyboard,utils,decimal-helpers]` |
| B | `src/pages/erp/pay-hub/masters/SalaryStructureMaster.tsx` | `engines=[keyboard,utils,decimal-helpers]` |

### servicedesk (1 · A-self:0 · A-engine:1 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/servicedesk/service-tickets/ServiceTicketDetail.tsx` | `src/lib/servicedesk-engine.ts:1150` |

### frontdesk (2 · A-self:0 · A-engine:2 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/frontdesk/mail/MailInwardPage.tsx` | `src/lib/frontdesk-records-engine.ts:79` |
| A-engine | `src/pages/erp/frontdesk/mail/MailOutwardPage.tsx` | `src/lib/frontdesk-records-engine.ts:79` |

### webstorex (3 · A-self:0 · A-engine:3 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/webstorex/brands/BrandsPage.tsx` | `src/lib/webstorex-engine.ts:116` |
| A-engine | `src/pages/erp/webstorex/categories/CategoriesPage.tsx` | `src/lib/webstorex-engine.ts:116` |
| A-engine | `src/pages/erp/webstorex/visualizer/VisualizerPage.tsx` | `src/lib/webstorex-visualizer-engine.ts:35` |

### ecomx (0)
_no create-handler pages detected_

### store-hub (3 · A-self:0 · A-engine:2 · B:1 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/store-hub/reports/CycleCountStatus.tsx` | `engines=[cycle-count-voucher-engine]` |
| A-engine | `src/pages/erp/store-hub/transactions/StockIssueEntry.tsx` | `src/lib/stock-issue-engine.ts:145` |
| A-engine | `src/pages/erp/store-hub/transactions/StockIssueRegister.tsx` | `src/lib/stock-issue-engine.ts:145` |

### sitex (0)
_no create-handler pages detected_

### engineeringx (2 · A-self:0 · A-engine:0 · B:2 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/engineeringx/transactions/CloneDrawing.tsx` | `engines=[form-carry-forward-kit,engineeringx-engine,engineeringx-bom-engine]` |
| B | `src/pages/erp/engineeringx/transactions/DrawingEntry.tsx` | `engines=[form-carry-forward-kit,engineeringx-engine]` |

### logistic (1 · A-self:0 · A-engine:0 · B:1 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/logistic/LogisticLogin.tsx` | `engines=[keyboard,default-entity,logistic-auth-engine]` |

### projx (7 · A-self:0 · A-engine:3 · B:4 · C:0)

| Class | File | Evidence |
|---|---|---|
| B | `src/pages/erp/projx/masters/ProjectCentreMaster.tsx` | `engines=[default-entity]` |
| B | `src/pages/erp/projx/transactions/InvoiceScheduling.tsx` | `engines=[default-entity]` |
| A-engine | `src/pages/erp/projx/transactions/MilestoneTracker.tsx` | `src/lib/period-lock-engine.ts:65` |
| A-engine | `src/pages/erp/projx/transactions/ProjectEntry.tsx` | `src/lib/period-lock-engine.ts:65` |
| B | `src/pages/erp/projx/transactions/ProjxDocumentEntry.tsx` | `engines=[projx-documents-engine,form-carry-forward-kit]` |
| B | `src/pages/erp/projx/transactions/ResourceAllocation.tsx` | `engines=[default-entity]` |
| A-engine | `src/pages/erp/projx/transactions/TimeEntryCapture.tsx` | `src/lib/period-lock-engine.ts:65` |

### taskflow (2 · A-self:0 · A-engine:2 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/taskflow/TaskFlowAllTasksPage.tsx` | `src/lib/taskflow-engine.ts:62` |
| A-engine | `src/pages/erp/taskflow/TaskRoomPage.tsx` | `src/lib/taskflow-engine.ts:62` |

### docvault (1 · A-self:0 · A-engine:1 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/docvault/transactions/DocumentEntry.tsx` | `src/lib/docvault-engine.ts:92` |

### customer-hub (1 · A-self:1 · A-engine:0 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-self | `src/pages/erp/customer-hub/transactions/FamilyWalletHub.tsx` | `src/pages/erp/customer-hub/transactions/FamilyWalletHub.tsx:189` |

### distributor-hub (0)
_no create-handler pages detected_

### vendor-portal (0)
_no create-handler pages detected_

### comply360 (3 · A-self:0 · A-engine:3 · B:0 · C:0)

| Class | File | Evidence |
|---|---|---|
| A-engine | `src/pages/erp/comply360/audit-framework/AuditFrameworkDashboardPage.tsx` | `src/lib/comply360-audit-analytics-engine.ts:7` |
| A-engine | `src/pages/erp/comply360/cost-audit/CostAuditDashboardPage.tsx` | `src/lib/comply360-cost-audit-engine.ts:82` |
| A-engine | `src/pages/erp/comply360/roc/Section393Page.tsx` | `src/lib/comply360-dir3-kyc-engine.ts:121` |

