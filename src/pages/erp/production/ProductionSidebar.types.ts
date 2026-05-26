/**
 * @file        ProductionSidebar.types.ts
 * @purpose     ProductionModule type union · used by ProductionPage renderModule switch
 * @sprint      T-Phase-1.A.2.c-Job-Work-Tally-Parity (was T-Phase-1.A.2.b-Production-Reports)
 * @iso         Maintainability
 * @decisions   D-NEW-J (sidebar component DELETED · types kept for renderModule discriminator)
 * @reuses      Used by ProductionPage.tsx
 * @[JWT]       N/A (types only)
 */
export type ProductionModule =
  | 'welcome'
  | 'tx-production-plan-entry'
  | 'tx-production-order-entry'
  | 'tx-material-issue'
  | 'tx-production-confirmation'
  | 'tx-job-work-out'
  | 'tx-job-work-receipt'
  | 'tx-job-card-entry'
  | 'rpt-production-order-register'
  | 'rpt-production-plan-register'
  | 'rpt-variance-dashboard'
  | 'rpt-plan-actual-rolling'
  | 'rpt-itc04-export'
  | 'rpt-wip'
  | 'rpt-daily-work-register'
  | 'rpt-capacity-planning'
  | 'rpt-oee-dashboard'
  | 'rpt-wastage-dashboard'
  | 'rpt-scheduling-board'
  | 'rpt-shiftwise-production'
  | 'rpt-manpower-production'
  | 'rpt-production-trace'
  | 'rpt-jw-out-register'
  | 'rpt-jw-stock-with-worker'
  | 'rpt-jw-variance'
  | 'rpt-jw-ageing'
  | 'rpt-jw-in-register'
  | 'rpt-jw-components-summary'
  | 'rpt-jw-material-movement'
  | 'rpt-job-card-register'
  | 'rpt-production-confirmation-register'
  | 'rpt-material-issue-note-register'
  // ST12 · PASS 3 · Process Mfg
  | 'tx-process-batch-entry'
  | 'mst-recipe-master'
  | 'rpt-process-batch-register'
  | 'rpt-process-genealogy-tracker'
  // Sprint 61 PROD-4 · AI & Predictive
  | 'demand-forecast-entry'
  | 'demand-forecast-dashboard'
  | 'forecast-vs-actual'
  // 🆕 Sprint 62 PROD-4.5 · Theme A + B
  | 'prod-t-repetitive-line-run-entry'
  | 'prod-r-repetitive-line-oee'
  | 'prod-r-mixed-mode-bu-dashboard'
  // 🆕 Sprint 63 PROD-5 · ESG + Carbon + Closeout
  | 'carbon-aware-production-planner'
  | 'production-carbon-dashboard'
  | 'phase3v2-closure-dashboard'
  // 🆕 Sprint 66 FAR-2 · Block 5 · FK-CAP-6
  | 'rpt-fa-linked-machines';

