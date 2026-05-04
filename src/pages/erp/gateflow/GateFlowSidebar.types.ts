/**
 * GateFlowSidebar.types.ts
 * Sprint T-Phase-1.2.6f-d-2-card4-4-pre-1 · Block D · per D-301 (Q1=A 4-panel)
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
