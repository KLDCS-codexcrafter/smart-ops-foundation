/**
 * @file        GateFlowSidebar.types.ts
 * @purpose     GateFlowModule union · 12 modules · referenced by gateflow-sidebar-config.ts and GateFlowPage.renderModule()
 * @sprint      T-Phase-1.A.1.b-GateFlow-T1-Fix (was T-Phase-1.A.1.a · was 4-pre-1 · 4-pre-2 · 4-pre-3)
 * @iso         Maintainability
 * @decisions   D-301 (Q1=A 4-panel base) · D-NEW (Sprint 1 Shell migration · type preserved) · D-NEW-H (Sprint 1.A.1.b T1 cosmetic header refresh)
 * @reuses      None (type-only file)
 * @[JWT]       N/A (type definitions only)
 */
export type GateFlowModule =
  | 'welcome'
  | 'gate-inward-queue'
  | 'gate-outward-queue'
  | 'gate-pass-register'
  // Sprint 4-pre-2 · Block H · 5 NEW modules
  | 'vehicle-inward'
  | 'vehicle-outward'
  | 'vehicle-master'
  | 'driver-master'
  | 'weighbridge-register'
  // Sprint 4-pre-3 · Block G · 3 NEW alert modules · D-314
  | 'alert-vehicle-expiry'
  | 'alert-driver-expiry'
  | 'alert-gate-dwell';
