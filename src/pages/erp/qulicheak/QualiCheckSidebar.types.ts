/**
 * QualiCheckSidebar.types.ts
 * Sprint T-Phase-1.2.6f-d-2-card5-5-pre-1 · Block E · D-326 (5 base modules)
 * Sprint 5-pre-2 · Block G · adds 5 operational modules (closure-log, scorecard,
 *   coa-register, pending-alerts, bulk-plan-assignment).
 */
export type QualiCheckModule =
  | 'welcome'
  | 'pending-inspections'
  | 'quality-plans'
  | 'quality-specs'
  | 'inspection-register'
  // 5-pre-2 additions
  | 'closure-log'
  | 'vendor-scorecard'
  | 'coa-register'
  | 'pending-alerts'
  | 'bulk-plan-assignment'
  // Sprint 3b-pre-1 · D-624 · production-context QC pending list
  | 'production-qc-pending'
  // Sprint 3b-pre-2 · D-638 · QC Entry route (accessed via setActiveInspectionId)
  | 'qc-entry'
  // Sprint 3b-pre-3 · D-649 · Q58=c QC Dashboard (Trend + Pareto)
  | 'qc-dashboard'
  // α-a-bis · D-NEW-AV · NCR Foundation
  | 'ncr-capture'
  | 'ncr-register';
