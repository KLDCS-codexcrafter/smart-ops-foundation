/**
 * @file        src/lib/cth-resolver.ts
 * @purpose     Resolve (CTH × Country × BoE Date) → 3-bucket DutyStructure · Moat #8 anchor
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 * @decisions   EX-2-Q3=b date-range bands · EX-2-Q7=a discriminated union exhaustive switch
 * @disciplines FR-30 · FR-50 · FR-80
 */
import type { DutyStructure, DutyBucket } from '@/types/duty-structure';
import { DUTY_STRUCTURE_SEED } from '@/data/customs-tariff-head-seed-data';

const dutyStructuresKey = (entityCode: string): string => `erp_duty_structures_${entityCode}`;

// [JWT] GET /api/eximx/duty-structures?entityCode=...
export function loadDutyStructures(entityCode: string): DutyStructure[] {
  try {
    const raw = localStorage.getItem(dutyStructuresKey(entityCode));
    if (!raw) {
      localStorage.setItem(dutyStructuresKey(entityCode), JSON.stringify(DUTY_STRUCTURE_SEED));
      return DUTY_STRUCTURE_SEED;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as DutyStructure[]) : DUTY_STRUCTURE_SEED;
  } catch {
    return DUTY_STRUCTURE_SEED;
  }
}

// [JWT] PUT /api/eximx/duty-structures?entityCode=...
export function saveDutyStructures(entityCode: string, structures: DutyStructure[]): void {
  try {
    localStorage.setItem(dutyStructuresKey(entityCode), JSON.stringify(structures));
  } catch {
    /* localStorage unavailable */
  }
}

export function resolveDutyStructure(
  entityCode: string,
  cthCode: string,
  countryCode: string,
  boeDate: string,
): DutyStructure | null {
  const all = loadDutyStructures(entityCode);
  const candidates = all.filter(
    (ds) =>
      ds.cth_code === cthCode &&
      ds.country_code === countryCode &&
      ds.effective_from <= boeDate &&
      (ds.effective_until === null || boeDate < ds.effective_until),
  );
  if (candidates.length === 0) return null;
  return candidates.sort((a, b) => b.effective_from.localeCompare(a.effective_from))[0];
}

export function resolveDutyLabel(template: string, rate: number): string {
  return template.replace('{rate}', rate.toString());
}

export function totalBucketDuty(bucket: DutyBucket, ciValue: number): number {
  switch (bucket.kind) {
    case 'customs': {
      const bcd = ciValue * (bucket.bcd_rate / 100);
      const sws = bcd * (bucket.sws_rate / 100);
      const ad = (bucket.anti_dumping_rate ?? 0) > 0 ? ciValue * ((bucket.anti_dumping_rate ?? 0) / 100) : 0;
      const sg = (bucket.safeguard_rate ?? 0) > 0 ? ciValue * ((bucket.safeguard_rate ?? 0) / 100) : 0;
      return bcd + sws + ad + sg;
    }
    case 'other':
      return ciValue * ((bucket.cvd_rate + bucket.health_cess_rate + bucket.comp_cess_rate + bucket.nccd_rate) / 100);
    case 'gst':
      return ciValue * ((bucket.igst_rate + bucket.comp_cess_gst_rate) / 100);
    default: {
      const _exhaustive: never = bucket;
      return _exhaustive;
    }
  }
}
