/**
 * @file src/lib/capa-engine.ts
 * @purpose CAPA lifecycle engine · pure compute · consumes NCR via public API · feeds NcrRegister via CustomEvent
 * @who Lovable on behalf of Operix Founder
 * @when 2026-05-09
 * @sprint T-Phase-1.A.5.b-Qulicheak-CAPA-MTC-FAI
 * @iso 25010 Maintainability + Reliability + Performance Efficiency · ISO 9001:2015 Clause 10.2.1
 * @whom Quality Manager · Quality Engineer
 * @decisions D-NEW-BD · D-NEW-BE · D-NEW-BH (verification 30/60/90 milestones) ·
 *            D-NEW-BJ (3-arg userId-2nd signature alignment with α-a-bis ncr-engine)
 * @disciplines FR-19 (NCR consume-only · transitionNcr / getNcrById public API only) ·
 *              FR-21 (Banned patterns · 0 any · 0 console.log · 0 float-money · 0 TODO) ·
 *              FR-22 (ActivityItemKind 'voucher' · CrossCardActivityItem shape)
 * @reuses ncr-engine.transitionNcr · ncr-engine.getNcrById · cross-card-activity-engine.recordActivity
 * @[JWT] GET/POST /api/qulicheak/capas · localStorage key: erp_capa_${entityCode}
 */
import type {
  CorrectiveAndPreventiveAction,
  CapaId,
  CapaStatus,
  CapaSeverity,
  CapaSource,
  CapaOutcome,
  CapaAction,
  CapaVerification,
  EightDStep,
  EightDStepNum,
  EightDStepStatus,
  VerificationMilestone,
} from '@/types/capa';
import { DEFAULT_8D_LABELS, capaKey } from '@/types/capa';
import type { NcrId } from '@/types/ncr';
import { getNcrById, transitionNcr } from '@/lib/ncr-engine';
import { recordActivity } from '@/lib/cross-card-activity-engine';

function readAll(entityCode: string): CorrectiveAndPreventiveAction[] {
  try {
    // [JWT] GET /api/qulicheak/capas
    const raw = localStorage.getItem(capaKey(entityCode));
    return raw ? (JSON.parse(raw) as CorrectiveAndPreventiveAction[]) : [];
  } catch {
    return [];
  }
}

function writeAll(entityCode: string, list: CorrectiveAndPreventiveAction[]): void {
  try {
    // [JWT] PUT /api/qulicheak/capas (bulk)
    localStorage.setItem(capaKey(entityCode), JSON.stringify(list));
  } catch {
    /* quota / private-mode · silent */
  }
}

function upsert(entityCode: string, capa: CorrectiveAndPreventiveAction): void {
  const all = readAll(entityCode);
  const idx = all.findIndex((c) => c.id === capa.id);
  if (idx >= 0) all[idx] = capa; else all.unshift(capa);
  writeAll(entityCode, all);
}

function emit(eventName: string, detail: unknown): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventName, { detail }));
  }
}

function defaultEightDSteps(): EightDStep[] {
  return ([1, 2, 3, 4, 5, 6, 7, 8] as EightDStepNum[]).map((n) => ({
    step: n,
    label: DEFAULT_8D_LABELS[n],
    status: 'pending' as EightDStepStatus,
  }));
}

function defaultVerifications(raisedAt: string): CapaVerification[] {
  const base = new Date(raisedAt).getTime();
  return ([30, 60, 90] as VerificationMilestone[]).map((m) => ({
    milestone: m,
    scheduled_at: new Date(base + m * 24 * 60 * 60 * 1000).toISOString(),
    effective: null,
  }));
}

export function listCapas(entityCode: string): CorrectiveAndPreventiveAction[] {
  return readAll(entityCode);
}

export function getCapaById(entityCode: string, id: CapaId): CorrectiveAndPreventiveAction | null {
  return readAll(entityCode).find((c) => c.id === id) ?? null;
}

/**
 * raise CAPA · 3-arg signature aligned with α-a-bis raiseNcr (D-NEW-BJ).
 */
export function raiseCapa(
  entityCode: string,
  userId: string,
  draft: Omit<CorrectiveAndPreventiveAction,
    'id' | 'audit_log' | 'status' | 'raised_at' | 'raised_by' |
    'eight_d_steps' | 'verifications' | 'actions'
  >,
): CorrectiveAndPreventiveAction {
  const id = `CAPA-${Date.now().toString(36).toUpperCase()}` as CapaId;
  const now = new Date().toISOString();
  const capa: CorrectiveAndPreventiveAction = {
    ...draft,
    id,
    status: 'open',
    raised_at: now,
    raised_by: userId,
    eight_d_steps: defaultEightDSteps(),
    actions: [],
    verifications: defaultVerifications(now),
    audit_log: [{ at: now, by: userId, action: 'raise' }],
  };
  upsert(entityCode, capa);

  // FR-22 · ActivityItemKind = 'voucher' · CrossCardActivityItem shape per α-a-bis
  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'voucher',
    ref_id: id,
    title: `CAPA ${id}`,
    subtitle: draft.title.slice(0, 80),
    deep_link: `/erp/qulicheak#capa-register/${id}`,
  });

  return capa;
}

/**
 * Q-LOCK-4(b) · raise CAPA from NCR · transitions NCR to capa_pending via public API.
 */
export function raiseCapaFromNcr(
  entityCode: string,
  userId: string,
  ncrId: NcrId,
  draft: Omit<CorrectiveAndPreventiveAction,
    'id' | 'audit_log' | 'status' | 'raised_at' | 'raised_by' |
    'eight_d_steps' | 'verifications' | 'actions' | 'related_ncr_id' | 'source'
  >,
): CorrectiveAndPreventiveAction | null {
  const ncr = getNcrById(entityCode, ncrId);
  if (!ncr) return null;
  // Public-API-only · ZERO ncr-engine mutation (FR-19)
  transitionNcr(entityCode, userId, ncrId, 'capa_pending', 'CAPA created');
  const capa = raiseCapa(entityCode, userId, {
    ...draft,
    source: 'ncr' as CapaSource,
    related_ncr_id: ncrId,
    severity: ncr.severity as CapaSeverity,
    related_party_id: ncr.related_party_id ?? null,
    related_party_name: ncr.related_party_name ?? null,
  });
  emit('capa:linked-to-ncr', { capa_id: capa.id, ncr_id: ncrId });
  return capa;
}

export function updateEightDStep(
  entityCode: string,
  userId: string,
  capaId: CapaId,
  stepNum: EightDStepNum,
  patch: Partial<EightDStep>,
  note?: string,
): CorrectiveAndPreventiveAction | null {
  const capa = getCapaById(entityCode, capaId);
  if (!capa) return null;
  const now = new Date().toISOString();
  const steps = capa.eight_d_steps.map((s) =>
    s.step === stepNum ? { ...s, ...patch } : s,
  );
  const updated: CorrectiveAndPreventiveAction = {
    ...capa,
    eight_d_steps: steps,
    audit_log: [...capa.audit_log, { at: now, by: userId, action: 'update_step', note: note ?? `Step ${stepNum}` }],
  };
  upsert(entityCode, updated);
  return updated;
}

export function addAction(
  entityCode: string,
  userId: string,
  capaId: CapaId,
  action: Omit<CapaAction, 'id'>,
): CorrectiveAndPreventiveAction | null {
  const capa = getCapaById(entityCode, capaId);
  if (!capa) return null;
  const id = `CAPA-A-${Date.now().toString(36).toUpperCase()}`;
  const newAction: CapaAction = { ...action, id };
  const updated: CorrectiveAndPreventiveAction = {
    ...capa,
    actions: [...capa.actions, newAction],
    audit_log: [...capa.audit_log, { at: new Date().toISOString(), by: userId, action: 'add_action', note: id }],
  };
  upsert(entityCode, updated);
  return updated;
}

export function updateAction(
  entityCode: string,
  userId: string,
  capaId: CapaId,
  actionId: string,
  patch: Partial<CapaAction>,
): CorrectiveAndPreventiveAction | null {
  const capa = getCapaById(entityCode, capaId);
  if (!capa) return null;
  const updated: CorrectiveAndPreventiveAction = {
    ...capa,
    actions: capa.actions.map((a) => (a.id === actionId ? { ...a, ...patch } : a)),
    audit_log: [...capa.audit_log, { at: new Date().toISOString(), by: userId, action: 'update_action', note: actionId }],
  };
  upsert(entityCode, updated);
  return updated;
}

export function recordVerification(
  entityCode: string,
  userId: string,
  capaId: CapaId,
  milestone: VerificationMilestone,
  effective: boolean,
  evidence?: string,
): CorrectiveAndPreventiveAction | null {
  const capa = getCapaById(entityCode, capaId);
  if (!capa) return null;
  const now = new Date().toISOString();
  const verifications = capa.verifications.map((v) =>
    v.milestone === milestone
      ? { ...v, effective, verified_at: now, verified_by: userId, evidence: evidence ?? null }
      : v,
  );
  const updated: CorrectiveAndPreventiveAction = {
    ...capa,
    verifications,
    audit_log: [
      ...capa.audit_log,
      { at: now, by: userId, action: 'verify', note: `${milestone}-day=${effective ? 'effective' : 'ineffective'}` },
    ],
  };
  upsert(entityCode, updated);
  return updated;
}

/**
 * Q-LOCK-4(b) · close CAPA · effective EMITS event but does NOT auto-close NCR ·
 * ineffective_re_open_ncr transitions NCR back to investigating.
 */
export function closeCapa(
  entityCode: string,
  userId: string,
  capaId: CapaId,
  outcome: CapaOutcome,
): CorrectiveAndPreventiveAction | null {
  const capa = getCapaById(entityCode, capaId);
  if (!capa) return null;
  if (capa.status === 'closed' || capa.status === 'cancelled') return null;
  const now = new Date().toISOString();
  const nextStatus: CapaStatus =
    outcome === 'cancelled' ? 'cancelled' :
    outcome === 'effective' ? 'effective' :
    'ineffective';
  const updated: CorrectiveAndPreventiveAction = {
    ...capa,
    status: nextStatus,
    closed_at: now,
    closed_by: userId,
    outcome,
    audit_log: [...capa.audit_log, { at: now, by: userId, action: 'close', note: `outcome=${outcome}` }],
  };
  upsert(entityCode, updated);

  if (capa.related_ncr_id) {
    if (outcome === 'effective') {
      // NCR stays in capa_pending until human acks closure (Q-LOCK-4 b)
      emit('capa:effective:applied', { capa_id: capaId, ncr_id: capa.related_ncr_id });
    } else if (outcome === 'ineffective_re_open_ncr') {
      transitionNcr(entityCode, userId, capa.related_ncr_id, 'investigating', 'CAPA ineffective · re-investigating');
      emit('capa:ineffective:reopened', { capa_id: capaId, ncr_id: capa.related_ncr_id });
    }
  }

  // [JWT] POST /api/activity/recent
  recordActivity(entityCode, userId, {
    card_id: 'qulicheak',
    kind: 'voucher',
    ref_id: capaId,
    title: `CAPA ${capaId} closed`,
    subtitle: `Outcome: ${outcome}`,
    deep_link: `/erp/qulicheak#capa-register/${capaId}`,
  });

  return updated;
}

export interface CapaFilter {
  status?: CapaStatus[];
  severity?: CapaSeverity[];
  source?: CapaSource[];
  fromDate?: string;
  toDate?: string;
  ncrId?: NcrId;
  effectiveOnly?: boolean;
}

export function filterCapas(entityCode: string, filter: CapaFilter): CorrectiveAndPreventiveAction[] {
  return listCapas(entityCode).filter((c) => {
    if (filter.status && !filter.status.includes(c.status)) return false;
    if (filter.severity && !filter.severity.includes(c.severity)) return false;
    if (filter.source && !filter.source.includes(c.source)) return false;
    if (filter.fromDate && c.raised_at < filter.fromDate) return false;
    if (filter.toDate && c.raised_at > filter.toDate) return false;
    if (filter.ncrId && c.related_ncr_id !== filter.ncrId) return false;
    if (filter.effectiveOnly && c.outcome !== 'effective') return false;
    return true;
  });
}

/**
 * Block F.2 · EffectivenessVerificationDue helper · D-NEW-BH.
 */
export function listVerificationsDueWithin(
  entityCode: string,
  withinDays: number,
): Array<{ capa: CorrectiveAndPreventiveAction; verification: CapaVerification }> {
  const cutoff = Date.now() + withinDays * 24 * 60 * 60 * 1000;
  const out: Array<{ capa: CorrectiveAndPreventiveAction; verification: CapaVerification }> = [];
  for (const capa of listCapas(entityCode)) {
    if (capa.status === 'closed' || capa.status === 'cancelled') continue;
    for (const v of capa.verifications) {
      if (v.effective !== null) continue;
      const sched = new Date(v.scheduled_at).getTime();
      if (sched <= cutoff) out.push({ capa, verification: v });
    }
  }
  return out.sort(
    (a, b) =>
      new Date(a.verification.scheduled_at).getTime() -
      new Date(b.verification.scheduled_at).getTime(),
  );
}
