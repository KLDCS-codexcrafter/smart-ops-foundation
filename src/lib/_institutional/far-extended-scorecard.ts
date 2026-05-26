/**
 * @file        src/lib/_institutional/far-extended-scorecard.ts
 * @purpose     24-FAR-CAP scorecard (FAR-extended capabilities) · separate from canonical 28-CAP
 * @sprint      T-Phase-4.FAR-0 · Theme 7 · D-FAR-v4-23 · Q-LOCK-6 A
 */

export type FARCapabilityState = 'absent' | 'schema-staged' | 'partial' | 'full';

export interface FARCapability {
  id: string;
  name: string;
  state: FARCapabilityState;
  lastChangedSprint: number | null;
  evidenceFiles: string[];
  parentTheme: 'far-0-seed' | 'far-1-statutory' | 'far-2-fk-ui' | 'far-3-compute' | 'far-4-ai-iot-mobile-dashboard';
}

export const FAR_CAPABILITIES: FARCapability[] = [
  // 🆕 Sprint 64 FAR-0 · 6 schema-staged
  { id: 'FAR-CAP-1', name: 'Universal FA category catalog (12 IT Act categories + Schedule II rates)', state: 'schema-staged', lastChangedSprint: 64, evidenceFiles: ['src/data/fa-universal-categories-seed-data.ts'], parentTheme: 'far-0-seed' },
  { id: 'FAR-CAP-2', name: 'FA location + department + vendor + document type catalogs', state: 'schema-staged', lastChangedSprint: 64, evidenceFiles: ['src/data/fa-universal-locations-seed-data.ts', 'src/data/fa-universal-departments-seed-data.ts', 'src/data/fa-universal-vendor-categories-seed-data.ts', 'src/data/fa-universal-document-types-seed-data.ts'], parentTheme: 'far-0-seed' },
  { id: 'FAR-CAP-3', name: '7-scenario FA seed depth across all entities', state: 'schema-staged', lastChangedSprint: 64, evidenceFiles: ['src/lib/demo-seed-orchestrator.ts'], parentTheme: 'far-0-seed' },
  { id: 'FAR-CAP-4', name: 'Sinha 9th manifest file · FA imported machinery', state: 'schema-staged', lastChangedSprint: 64, evidenceFiles: ['src/data/sinha-fa-imported-machinery-seed-data.ts'], parentTheme: 'far-0-seed' },
  { id: 'FAR-CAP-5', name: 'Cross-card bridge demo data', state: 'schema-staged', lastChangedSprint: 64, evidenceFiles: ['src/lib/demo-seed-orchestrator.ts'], parentTheme: 'far-0-seed' },
  { id: 'FAR-CAP-6', name: 'demo-seed-orchestrator wiring with seedFAUniverse entry point', state: 'schema-staged', lastChangedSprint: 64, evidenceFiles: ['src/lib/demo-seed-orchestrator.ts'], parentTheme: 'far-0-seed' },
  // FAR-CAP-7..24 absent
  { id: 'FAR-CAP-7', name: 'Indian Statutory Auto-Pack · CARO 2020 + 43B(h) + GST ITC reversal', state: 'full', lastChangedSprint: 65, evidenceFiles: ['src/lib/caro-2020-engine.ts', 'src/lib/msme-43bh-engine.ts', 'src/lib/gst-engine.ts'], parentTheme: 'far-1-statutory' },
  { id: 'FAR-CAP-8', name: 'Schedule III FA disclosure auto-generation', state: 'full', lastChangedSprint: 65, evidenceFiles: ['src/pages/erp/fincore/statutory-fa-pack/FALedgerPackReport.tsx'], parentTheme: 'far-1-statutory' },
  { id: 'FAR-CAP-9', name: 'Ind AS 116 ROU + Ind AS 16 PP&E disclosure', state: 'full', lastChangedSprint: 65, evidenceFiles: ['src/lib/ind-as-116-lease-engine.ts', 'src/pages/erp/fincore/statutory-fa-pack/IndAS116ROUSchedule.tsx'], parentTheme: 'far-1-statutory' },
  { id: 'FAR-CAP-10', name: 'Component accounting (Schedule II)', state: 'full', lastChangedSprint: 65, evidenceFiles: ['src/lib/caro-2020-engine.ts'], parentTheme: 'far-1-statutory' },
  { id: 'FAR-CAP-11', name: 'EPCG export-obligation bridge (FA ↔ EximX)', state: 'full', lastChangedSprint: 65, evidenceFiles: ['src/lib/epcg-fa-bridge.ts'], parentTheme: 'far-2-fk-ui' },
  { id: 'FAR-CAP-12', name: 'FA Register linked machines reverse-display', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-2-fk-ui' },
  { id: 'FAR-CAP-13', name: 'Custodian (Employee) picker on FA detail page', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-2-fk-ui' },
  { id: 'FAR-CAP-14', name: 'Pay Hub Asset ↔ FA bidirectional UI', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-2-fk-ui' },
  { id: 'FAR-CAP-15', name: 'Production sidebar Machine List + FA-linked report', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-2-fk-ui' },
  { id: 'FAR-CAP-16', name: 'UOP (units-of-production) depreciation method', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-3-compute' },
  { id: 'FAR-CAP-17', name: 'Campaign-based depreciation (API reactor)', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-3-compute' },
  { id: 'FAR-CAP-18', name: 'Impairment testing engine', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-3-compute' },
  { id: 'FAR-CAP-19', name: 'Revaluation reserve handler', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-3-compute' },
  { id: 'FAR-CAP-20', name: 'AI custodian-drift detector', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-4-ai-iot-mobile-dashboard' },
  { id: 'FAR-CAP-21', name: 'IoT meter ingest for UOP depreciation', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-4-ai-iot-mobile-dashboard' },
  { id: 'FAR-CAP-22', name: 'Mobile asset verification (QR scan)', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-4-ai-iot-mobile-dashboard' },
  { id: 'FAR-CAP-23', name: '/erp/dashboard FA card lane (4 tiles)', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-4-ai-iot-mobile-dashboard' },
  { id: 'FAR-CAP-24', name: 'FA audit trail viewer (CFR-11 e-sig integration)', state: 'absent', lastChangedSprint: null, evidenceFiles: [], parentTheme: 'far-4-ai-iot-mobile-dashboard' },
];

export function getFARCapabilityCount(): number {
  return FAR_CAPABILITIES.length;
}

export function getFARCapabilityScoreFullOnly(): string {
  const full = FAR_CAPABILITIES.filter(c => c.state === 'full').length;
  return `${full}/24`;
}

export function getFARCapabilityScoreSchemaStaged(): string {
  const staged = FAR_CAPABILITIES.filter(c => c.state === 'schema-staged').length;
  return `${staged}/24`;
}
