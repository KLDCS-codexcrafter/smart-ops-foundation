/**
 * GateFlowSidebar.types.ts
 * @sprint  T-Phase-1.A.1.a-GateFlow-Patterns-Features (was 4-pre-1 · 4-pre-2 · 4-pre-3)
 * @purpose GateFlowModule union · 12 modules · referenced by gateflow-sidebar-config.ts and GateFlowPage.renderModule()
 * Sprint 4-pre-1 · Block D · per D-301 (Q1=A 4-panel)
 * EXTENDED Sprint 4-pre-2 · Block H · 5 NEW modules (Vehicle/Master/Weighbridge)
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
