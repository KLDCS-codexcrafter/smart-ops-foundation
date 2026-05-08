/**
 * @file        ProductionSidebar.types.ts
 * @purpose     ProductionModule type union · used by ProductionPage renderModule switch
 * @sprint      T-Phase-1.A.2.a-Production-Structural (was T-Phase-1.3-3-PlantOps-pre-2)
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
  | 'rpt-scheduling-board';
