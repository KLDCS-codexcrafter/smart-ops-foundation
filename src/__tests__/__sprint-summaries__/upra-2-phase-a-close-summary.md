# UPRA-2 Phase A · Production/JobWork Additive · Close Summary

## Single named commit
- Phase A: <hash> · "UPRA-2 Phase A · 3 Tier-1 NEW Registers + 2 Tier-2 V2 display-only · Production+RequestX cross-domain wiring"

## Diff scope (~21 files)

### NEW files (13)
- src/pages/erp/production/reports/JobCardRegister.tsx (T1-1)
- src/pages/erp/production/reports/detail/JobCardDetailPanel.tsx
- src/pages/erp/production/reports/print/JobCardPrint.tsx
- src/pages/erp/requestx/reports/ServiceRequestRegister.tsx (T1-2 · RequestX domain)
- src/pages/erp/requestx/reports/detail/ServiceRequestDetailPanel.tsx
- src/pages/erp/requestx/reports/print/ServiceRequestPrint.tsx
- src/pages/erp/production/reports/ProductionConfirmationRegister.tsx (T1-3)
- src/pages/erp/production/reports/detail/ProductionConfirmationDetailPanel.tsx
- src/pages/erp/production/reports/print/ProductionConfirmationPrint.tsx
- src/pages/erp/production/reports/detail/JobWorkOutDetailPanel.tsx (T2-3)
- src/pages/erp/production/reports/print/JobWorkOutPrint.tsx
- src/__tests__/__sprint-summaries__/upra-2-phase-a-close-summary.md
- (T2-4 intentionally no Detail/Print)

### REPLACED in-place (2)
- src/pages/erp/production/reports/JobWorkOutRegister.tsx (160 → ~125 LOC; export name preserved; 4 filters retained: date-range + search + status + vendor; vendor moved to customFilters slot)
- src/pages/erp/production/reports/JobWorkInRegister.tsx (51 → ~95 LOC; export name preserved; vendor filter preserved via customFilters)

### MODIFIED wiring (6)
- src/pages/erp/production/ProductionSidebar.types.ts: +2 enum values
- src/apps/erp/configs/production-sidebar-config.ts: +2 Reports entries
- src/pages/erp/production/ProductionPage.tsx: +2 imports +2 case handlers
- src/pages/erp/requestx/RequestXSidebar.types.ts: +1 enum value
- src/pages/erp/requestx/RequestXSidebar.groups.ts: +1 entry to reports group
- src/pages/erp/requestx/RequestXSidebar.tsx: +1 ICONS entry
- src/pages/erp/requestx/RequestXPage.tsx: +1 import +1 case handler

## SUPPLEMENT 7 reconciliation
| # | Record | Register file | Detail | Print | Wired |
|---|---|---|---|---|---|
| T1-1 | job-card | JobCardRegister.tsx | ✓ | ✓ | ProductionPage `rpt-job-card-register` |
| T1-2 | service-request | requestx/reports/ServiceRequestRegister.tsx | ✓ | ✓ | RequestXPage `rpt-service-request-register` (cross-domain Q1=(A)) |
| T1-3 | production-confirmation | ProductionConfirmationRegister.tsx | ✓ | ✓ | ProductionPage `rpt-production-confirmation-register` |
| T2-3 | job-work-out-order | JobWorkOutRegister.tsx (V2 in-place) | ✓ | ✓ | route `rpt-jw-out-register` preserved |
| T2-4 | job-work-receipt | JobWorkInRegister.tsx (V2 in-place) | — | — | route `rpt-jw-in-register` preserved |

## Triple Gate before/after (STRICT app config)
| Gate | Baseline | After Phase A | Status |
|---|---|---|---|
| TSC (tsconfig.app.json) | 0 | 0 | IDENTICAL |
| TSC (root tsconfig) | 0 | 0 | IDENTICAL |
| ESLint | 0/0 | 0/0 | IDENTICAL (no rules touched) |
| Vitest | 1209/165 | 1209/165 | IDENTICAL (no new tests) |
| Build | clean | clean | IDENTICAL |

## 0-diff confirmations
- All 4 protected zones: 0-diff (voucher-type.ts · cc-masters.ts · operix-core/applications.ts · cc-compliance-settings.ts)
- decimal-helpers.ts: 0-diff · vite.config.ts: 0-diff · package.json + package-lock.json: 0-diff
- All 33 fy-stamped record-type interfaces: 0-diff (including job-card.ts, service-request.ts, production-confirmation.ts, job-work-out-order.ts, job-work-receipt.ts)
- All 8 engine helpers byte-identical
- UniversalRegisterGrid + UniversalRegisterTypes + DrillBreadcrumb + DrillSourceBanner: 0-diff
- FinCore RegisterGrid: 0-diff
- 24 already-canonical V2 register consumers from sprint 1.2.6 + UPRA-1: 0-diff
- ProductionTraceRegister.tsx: 0-diff (sibling-untouched per Q2=(B))
- ProductionOrderRegister.tsx: 0-diff (deferred to Phase B)
- All UPRA-1 banked files: 0-diff (SalesXPage, DispatchHub*, 18 Phase A files, Phase B trio, Phase C trio, AgentInvoiceDialog)
- Form-page entry components: 0-diff (JobCardEntry.tsx, ServiceRequestEntry.tsx, etc.)

## Q-LOCK adherence
- Q1=(A) ✓ ServiceRequestRegister mounted ONLY in RequestX (not Production)
- Q2=(B) ✓ ProductionTraceRegister untouched · ProductionConfirmationRegister built fresh
- Q3=(A) ✓ ProductionOrder V2 deferred to Phase B (no touch)
- Q4=(B) ✓ 5 NEW Detail/Print pairs created except T2-4 (intentionally skipped)
- Q5 ✓ Best-domain-fit (SR in RequestX, JC/PC/JWO/JWR in Production)
- Q6=(C) ✓ Inline self-seed per sub-block in each Tier-1 register
- Q7=(A) ✓ FR-79 cascade deferred

## Notes on T2-3 filter count
The audit memo references "8 custom_filter usages" in the old JobWorkOutRegister. The actual old file (160 LOC) had 4 filter inputs: dateFrom, dateTo, vendorFilter, statusFilter. All 4 are preserved in V2:
- date-range (dateFrom/dateTo): native to UniversalRegisterGrid
- status: native via statusOptions/statusKey
- vendor: preserved via `customFilters` extension point

## STOP-AND-RAISE log
(empty — all deliverables shipped clean, STRICT TSC passes)

## HALT for §2.4 audit
Not self-certifying. Not proceeding to Phase B.
