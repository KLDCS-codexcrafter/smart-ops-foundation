/**
 * @file        src/lib/comply360-schedule-m-engine.ts
 * @sibling     NEW @ Sprint 77a · Comply360 Main Arc 1.9 · Pass A
 * @realizes    Schedule M (Drugs & Cosmetics Rules) Pharma GMP compliance
 * @approach    Greenfield · pure computation · 5 Schedule M parts (premises, personnel,
 *              equipment, documentation, QC). FR-26 entity-scoped storage.
 * @reads-from  (none · greenfield) · scopes localStorage `erp_schedule_m_${entityCode}`
 * [JWT] Phase 5: GET /api/comply360/schedule-m/:entity · POST /api/comply360/schedule-m/finding
 */

export type ScheduleMPart =
  | 'premises_design'
  | 'personnel_qualification'
  | 'equipment_qualification'
  | 'documentation_sop'
  | 'quality_control';

export type ScheduleMSeverity = 'minor' | 'major' | 'critical';

export interface ScheduleMFinding {
  id: string;
  entity_code: string;
  part: ScheduleMPart;
  area_ref: string;
  observation: string;
  severity: ScheduleMSeverity;
  observed_at: string;
  closed_at: string | null;
  capa_ref: string | null;
}

export interface ScheduleMPartScore {
  part: ScheduleMPart;
  open_minor: number;
  open_major: number;
  open_critical: number;
  closed: number;
  compliance_pct: number;
}

export interface ScheduleMAssessment {
  entity_code: string;
  generated_at: string;
  parts: ScheduleMPartScore[];
  overall_compliance_pct: number;
  gmp_certifiable: boolean;
}

const PARTS: ScheduleMPart[] = [
  'premises_design',
  'personnel_qualification',
  'equipment_qualification',
  'documentation_sop',
  'quality_control',
];

const SEVERITY_WEIGHT: Record<ScheduleMSeverity, number> = {
  minor: 1,
  major: 5,
  critical: 20,
};

export const scheduleMKey = (entityCode: string): string =>
  `erp_schedule_m_${entityCode}`;

export function loadScheduleMFindings(entityCode: string): ScheduleMFinding[] {
  try {
    const raw = localStorage.getItem(scheduleMKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as ScheduleMFinding[]) : [];
  } catch {
    return [];
  }
}

export function recordScheduleMFinding(
  entityCode: string,
  finding: Omit<ScheduleMFinding, 'id' | 'entity_code' | 'observed_at' | 'closed_at' | 'capa_ref'>,
): ScheduleMFinding {
  const list = loadScheduleMFindings(entityCode);
  const next: ScheduleMFinding = {
    id: `SCHM-${entityCode}-${Date.now()}`,
    entity_code: entityCode,
    observed_at: new Date().toISOString(),
    closed_at: null,
    capa_ref: null,
    ...finding,
  };
  localStorage.setItem(scheduleMKey(entityCode), JSON.stringify([...list, next]));
  return next;
}

export function closeScheduleMFinding(
  entityCode: string,
  findingId: string,
  capaRef: string,
): ScheduleMFinding | null {
  const list = loadScheduleMFindings(entityCode);
  const idx = list.findIndex((f) => f.id === findingId);
  if (idx < 0) return null;
  const closed: ScheduleMFinding = {
    ...list[idx],
    closed_at: new Date().toISOString(),
    capa_ref: capaRef,
  };
  const next = list.map((f, i) => (i === idx ? closed : f));
  localStorage.setItem(scheduleMKey(entityCode), JSON.stringify(next));
  return closed;
}

export function scorePart(findings: ScheduleMFinding[], part: ScheduleMPart): ScheduleMPartScore {
  const scoped = findings.filter((f) => f.part === part);
  const open = scoped.filter((f) => !f.closed_at);
  const closed = scoped.filter((f) => f.closed_at);
  const penalty = open.reduce((s, f) => s + SEVERITY_WEIGHT[f.severity], 0);
  const compliance = Math.max(0, 100 - penalty);
  return {
    part,
    open_minor: open.filter((f) => f.severity === 'minor').length,
    open_major: open.filter((f) => f.severity === 'major').length,
    open_critical: open.filter((f) => f.severity === 'critical').length,
    closed: closed.length,
    compliance_pct: compliance,
  };
}

export function assessScheduleMCompliance(entityCode: string): ScheduleMAssessment {
  const findings = loadScheduleMFindings(entityCode);
  const parts = PARTS.map((p) => scorePart(findings, p));
  const overall = parts.reduce((s, p) => s + p.compliance_pct, 0) / parts.length;
  const noOpenCritical = parts.every((p) => p.open_critical === 0);
  return {
    entity_code: entityCode,
    generated_at: new Date().toISOString(),
    parts,
    overall_compliance_pct: Math.round(overall),
    gmp_certifiable: overall >= 90 && noOpenCritical,
  };
}
