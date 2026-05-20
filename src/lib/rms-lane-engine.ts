/**
 * @file        src/lib/rms-lane-engine.ts
 * @purpose     RMS lane prediction + actual lane assignment + variance · Moat #2 FULL ANCHOR
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 * @decisions   EX-6-Q3=a full workflow (prediction → ICEGATE → actual → variance)
 * @disciplines FR-30 · FR-50 · sibling to rms-declaration.ts (EX-3) · DO NOT modify that seed
 */
import type { RMSDeclaration, RMSLane } from '@/types/rms-declaration';
import { rmsDeclarationsKey } from '@/types/rms-declaration';

export function loadRMSDeclarations(entityCode: string): RMSDeclaration[] {
  try {
    const raw = localStorage.getItem(rmsDeclarationsKey(entityCode));
    return raw ? (JSON.parse(raw) as RMSDeclaration[]) : [];
  } catch { return []; }
}

export function saveRMSDeclarations(entityCode: string, decs: RMSDeclaration[]): void {
  localStorage.setItem(rmsDeclarationsKey(entityCode), JSON.stringify(decs));
}

export function predictLaneFromRiskFactors(
  riskFactors: string[],
  importerAEOTier: 'tier_1' | 'tier_2' | 'tier_3' | 'not_aeo',
): RMSLane {
  const has_red_flag = riskFactors.some((f) =>
    /sanctioned|dumped|prohibited|fake.coO/i.test(f),
  );
  if (has_red_flag) return 'red';
  if (importerAEOTier === 'tier_2' || importerAEOTier === 'tier_3') return 'green';
  if (riskFactors.length >= 3) return 'yellow';
  return 'green';
}

export function computeLaneVariance(declared: RMSLane, actual: RMSLane | null): {
  variance: 'none' | 'optimistic' | 'pessimistic' | 'pending';
  description: string;
} {
  if (actual === null) return { variance: 'pending', description: 'ICEGATE response pending' };
  if (declared === actual) return { variance: 'none', description: 'Predicted lane matched actual' };
  const rank: Record<RMSLane, number> = { green: 0, yellow: 1, red: 2 };
  if (rank[declared] < rank[actual]) {
    return { variance: 'optimistic', description: `Predicted ${declared} · actual ${actual} (operator under-estimated risk)` };
  }
  return { variance: 'pessimistic', description: `Predicted ${declared} · actual ${actual} (operator over-estimated risk · favorable)` };
}

export function createRMSDeclaration(
  entityCode: string,
  data: Omit<RMSDeclaration, 'id' | 'declared_at' | 'resolved_at' | 'actual_lane'>,
): RMSDeclaration {
  const rms: RMSDeclaration = {
    ...data,
    id: `rms-${Date.now()}`,
    declared_at: new Date().toISOString(),
    resolved_at: null,
    actual_lane: null,
  };
  const all = loadRMSDeclarations(entityCode);
  saveRMSDeclarations(entityCode, [...all, rms]);
  return rms;
}

export function resolveRMSDeclaration(
  entityCode: string,
  rmsId: string,
  actualLane: RMSLane,
  examinationNotes: string,
): RMSDeclaration {
  const all = loadRMSDeclarations(entityCode);
  const target = all.find((r) => r.id === rmsId);
  if (!target) throw new Error(`RMS not found: ${rmsId}`);
  const updated = { ...target, actual_lane: actualLane, examination_notes: examinationNotes, resolved_at: new Date().toISOString() };
  saveRMSDeclarations(entityCode, all.map((r) => (r.id === rmsId ? updated : r)));
  return updated;
}
