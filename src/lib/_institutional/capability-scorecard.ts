/**
 * @file        src/lib/_institutional/capability-scorecard.ts
 * @purpose     Source-of-truth register for the 28-capability scorecard
 * @sprint      T-Phase-3.HK-D14-InstitutionalRegisters
 * @disciplines NOT FR-19 SIBLING · institutional reference data
 *              Capabilities sourced from Master Strategy v2 §3.1 + State Handoff v45 §4
 *              See getCapabilityScoreFullOnly() for the canonical full-count framing.
 */

export type CapabilityState = 'full' | 'partial' | 'absent';

export interface Capability {
  id: string;
  name: string;
  state: CapabilityState;
  lastChangedSprint: number | null;
  evidenceFiles: string[];
}

export const CAPABILITIES: Capability[] = [
  { id: 'CAP-01', name: 'Multi-entity Indian-statutory accounting', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-02', name: 'Voucher-type registry (Indian + custom)', state: 'full', lastChangedSprint: null, evidenceFiles: ['src/data/voucher-type-seed-data.ts'] },
  { id: 'CAP-03', name: 'GST + EWB compliance', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-04', name: 'Multi-factory + FY-close discipline', state: 'full', lastChangedSprint: 58, evidenceFiles: [] },
  { id: 'CAP-05', name: 'Procurement-to-pay 100% production-ready', state: 'full', lastChangedSprint: 46, evidenceFiles: [] },
  { id: 'CAP-06', name: 'Sales + distributor + customer hub', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-07', name: 'Inventory + main store + department stores', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-08', name: 'Production discrete mode (BOM + routing)', state: 'full', lastChangedSprint: null, evidenceFiles: ['src/lib/production-engine.ts'] },
  { id: 'CAP-09', name: 'Production engine 6-state machine', state: 'full', lastChangedSprint: 55, evidenceFiles: ['src/lib/production-engine.ts'] },
  { id: 'CAP-10', name: 'EngineeringX BOM + ECN cascade', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-11', name: 'Maintenance card scaffold', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-12', name: 'Quality (QualiCheck) inspection', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-13', name: 'Service desk (C.1)', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-14', name: 'Vendor portal + sub-portal pattern', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-15', name: 'Document vault + master-data integrity', state: 'full', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-16', name: 'Process manufacturing (batch · recipe · genealogy)', state: 'full', lastChangedSprint: 60, evidenceFiles: ['src/lib/process-batch-engine.ts','src/lib/recipe-formula-engine.ts','src/lib/process-genealogy-engine.ts'] },
  { id: 'CAP-17', name: 'SPC quality analytics (Nelson rules · Cpk)', state: 'full', lastChangedSprint: 60, evidenceFiles: ['src/lib/spc-quality-engine.ts'] },
  { id: 'CAP-18', name: 'Tank/flow volumetric inventory', state: 'full', lastChangedSprint: 60, evidenceFiles: ['src/lib/tank-flow-inventory-engine.ts'] },
  { id: 'CAP-19', name: 'Cross-card bridges (sales-production · iot-machine)', state: 'full', lastChangedSprint: 59, evidenceFiles: ['src/lib/sales-production-bridge.ts','src/lib/iot-machine-bridge.ts'] },
  { id: 'CAP-20', name: 'Mobile shop-floor + IoT telemetry', state: 'full', lastChangedSprint: 59, evidenceFiles: ['src/lib/iot-machine-bridge.ts'] },
  { id: 'CAP-21', name: 'Manufacturing mode foundation (per-BU mode tagging)', state: 'full', lastChangedSprint: 57, evidenceFiles: [] },
  { id: 'CAP-22', name: 'Repetitive manufacturing (rate-based scheduling)', state: 'partial', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-23', name: 'Mixed-mode manufacturing (multi-mode BU)', state: 'partial', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-24', name: 'FY-close + period-lock automation', state: 'full', lastChangedSprint: 58, evidenceFiles: [] },
  { id: 'CAP-25', name: 'Real-time predictive machine condition', state: 'absent', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-26', name: 'AI-driven demand forecast', state: 'absent', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-27', name: 'Carbon-aware production planning (world-first)', state: 'absent', lastChangedSprint: null, evidenceFiles: [] },
  { id: 'CAP-28', name: '21 CFR Part 11 electronic audit trail (pharma)', state: 'absent', lastChangedSprint: null, evidenceFiles: [] },
];

export interface CapabilityScore {
  full: number;
  partial: number;
  absent: number;
  total: number;
}

export function getCapabilityScore(): CapabilityScore {
  const full = CAPABILITIES.filter((c) => c.state === 'full').length;
  const partial = CAPABILITIES.filter((c) => c.state === 'partial').length;
  const absent = CAPABILITIES.filter((c) => c.state === 'absent').length;
  return { full, partial, absent, total: CAPABILITIES.length };
}

export function getCapabilityScoreFullOnly(): string {
  const { full, total } = getCapabilityScore();
  return `${full}/${total}`;
}
