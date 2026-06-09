/**
 * @file        src/lib/vendor-risk-compliance-engine.ts
 * @realizes    VP-GAPS · vendor risk-alert/threshold + compliance-checklist logic
 *              + DCN / document-request / payment-batch master CRUD.
 *              CONSUMES vendor-reliability-score + vendor-compliance-record + vendor-financial-health.
 *              ccc-aligned (field-name parity · NOT imported).
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail · sole new SIBLING
 * @canon       Honest no-alert when source scores absent · NEVER recomputes reliability/financial scores ·
 *              payment-batch CONSUMES PaymentRequisition (no duplicate accounting) ·
 *              NO credentials/secrets · NO ccc import.
 * @[JWT]       Wave-2: ccc-backend persistence (replace localStorage with REST per type)
 */
import type {
  VendorRiskAlert,
  VendorRiskAlertSeverity,
} from '@/types/vendor-risk-alert';
import { vendorRiskAlertsKey } from '@/types/vendor-risk-alert';
import type {
  VendorRiskThreshold,
  VendorRiskMetric,
  VendorRiskOperator,
} from '@/types/vendor-risk-threshold';
import { vendorRiskThresholdsKey } from '@/types/vendor-risk-threshold';
import type {
  VendorComplianceChecklist,
  ChecklistItemStatus,
  ChecklistOverallStatus,
} from '@/types/vendor-compliance-checklist';
import { vendorComplianceChecklistsKey } from '@/types/vendor-compliance-checklist';
import type { VendorDebitCreditNote, VendorDcnLine } from '@/types/vendor-dcn';
import { vendorDcnKey } from '@/types/vendor-dcn';
import type { VendorDocumentRequest, DocumentRequestStatus } from '@/types/vendor-document-request';
import { vendorDocRequestsKey } from '@/types/vendor-document-request';
import type { VendorPaymentBatch } from '@/types/vendor-payment-batch';
import { vendorPaymentBatchesKey } from '@/types/vendor-payment-batch';
import type { VendorZone } from '@/types/vendor-zone';
import { vendorZonesKey } from '@/types/vendor-zone';

// Read-only consumers (CANON · these scores are NEVER recomputed here)
import { loadVendorScores } from '@/lib/vendor-reliability-engine';
import type { VendorReliabilityScore } from '@/types/vendor-reliability-score';
import { vendorFinancialHealthKey } from '@/types/vendor-financial-health';
import type { VendorFinancialHealth } from '@/types/vendor-financial-health';
import { vendorComplianceRecordKey } from '@/types/vendor-compliance-record';
import type { VendorComplianceRecord } from '@/types/vendor-compliance-record';

// Payment requisition consume-only (FR-44 wall · grouping only · no accounting recompute)
import { listRequisitions } from '@/lib/payment-requisition-engine';

// ─── localStorage helpers ────────────────────────────────────────────────
function safeRead<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function safeWrite(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* swallow quota */ }
}

const nowIso = (): string => new Date().toISOString();
const mkId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// ─── ZONES ───────────────────────────────────────────────────────────────
// [JWT] Wave-2: GET/POST /api/vendor-portal/zones
export function listVendorZones(entityCode: string): VendorZone[] {
  return safeRead<VendorZone[]>(vendorZonesKey(entityCode), []);
}
export function createVendorZone(
  entityCode: string,
  input: Omit<VendorZone, 'id' | 'created_at' | 'updated_at'>,
): VendorZone {
  const zone: VendorZone = { ...input, id: mkId('vz'), created_at: nowIso(), updated_at: nowIso() };
  const list = listVendorZones(entityCode);
  safeWrite(vendorZonesKey(entityCode), [...list, zone]);
  return zone;
}
export function updateVendorZone(entityCode: string, id: string, patch: Partial<VendorZone>): void {
  const list = listVendorZones(entityCode).map(z =>
    z.id === id ? { ...z, ...patch, id: z.id, updated_at: nowIso() } : z
  );
  safeWrite(vendorZonesKey(entityCode), list);
}

// ─── THRESHOLD RULES (CC-editable) ───────────────────────────────────────
const DEFAULT_THRESHOLDS: Omit<VendorRiskThreshold, 'id' | 'created_at' | 'updated_at'>[] = [
  { metric: 'reliability',      operator: 'lt', value: 30, severity: 'critical', active: true, description: 'Reliability composite below 30 — block recommended' },
  { metric: 'reliability',      operator: 'lt', value: 50, severity: 'warning',  active: true, description: 'Reliability composite below 50 — probationary' },
  { metric: 'financial_health', operator: 'lt', value: 40, severity: 'warning',  active: true, description: 'Financial-health risk score below 40' },
  { metric: 'compliance',       operator: 'lt', value: 60, severity: 'warning',  active: true, description: 'Compliance verified-coverage below 60%' },
  { metric: 'on_time',          operator: 'lt', value: 70, severity: 'info',     active: true, description: 'On-time delivery score below 70' },
];

// [JWT] Wave-2: GET/PUT /api/vendor-portal/risk-thresholds
export function listRiskThresholds(entityCode: string): VendorRiskThreshold[] {
  const existing = safeRead<VendorRiskThreshold[]>(vendorRiskThresholdsKey(entityCode), []);
  if (existing.length > 0) return existing;
  const seeded: VendorRiskThreshold[] = DEFAULT_THRESHOLDS.map(t => ({
    ...t, id: mkId('vrt'), created_at: nowIso(), updated_at: nowIso(),
  }));
  safeWrite(vendorRiskThresholdsKey(entityCode), seeded);
  return seeded;
}

export function upsertRiskThreshold(
  entityCode: string,
  input: Partial<VendorRiskThreshold> & {
    metric: VendorRiskMetric; operator: VendorRiskOperator; value: number; severity: VendorRiskAlertSeverity; active: boolean;
  },
): VendorRiskThreshold {
  const list = listRiskThresholds(entityCode);
  const idx = input.id ? list.findIndex(r => r.id === input.id) : -1;
  const before = idx >= 0 ? list[idx] : null;
  const next: VendorRiskThreshold = {
    id: input.id ?? mkId('vrt'),
    metric: input.metric, operator: input.operator, value: input.value,
    severity: input.severity, active: input.active, description: input.description,
    created_at: before?.created_at ?? nowIso(), updated_at: nowIso(),
  };
  const updated = idx >= 0 ? list.map((r, i) => i === idx ? next : r) : [...list, next];
  safeWrite(vendorRiskThresholdsKey(entityCode), updated);
  appendThresholdAuditEntry(entityCode, before ? 'update' : 'create', next, before);
  return next;
}

export function deleteRiskThreshold(entityCode: string, id: string): void {
  const list = listRiskThresholds(entityCode);
  const target = list.find(r => r.id === id);
  if (!target) return;
  safeWrite(vendorRiskThresholdsKey(entityCode), list.filter(r => r.id !== id));
  appendThresholdAuditEntry(entityCode, 'delete', target, target);
}

// Internal audit log (does NOT touch types/audit-trail.ts wall · ccc-aligned for Wave-2 audit replication)
export interface VendorRiskThresholdAuditEntry {
  id: string;
  action: 'create' | 'update' | 'delete';
  threshold_id: string;
  before: VendorRiskThreshold | null;
  after: VendorRiskThreshold | null;
  at: string;
}
const thresholdAuditKey = (e: string): string => `erp_vendor_risk_threshold_audit_${e}`;
function appendThresholdAuditEntry(
  entityCode: string,
  action: 'create' | 'update' | 'delete',
  after: VendorRiskThreshold,
  before: VendorRiskThreshold | null,
): void {
  const log = safeRead<VendorRiskThresholdAuditEntry[]>(thresholdAuditKey(entityCode), []);
  log.push({
    id: mkId('vrta'),
    action,
    threshold_id: after.id,
    before,
    after: action === 'delete' ? null : after,
    at: nowIso(),
  });
  safeWrite(thresholdAuditKey(entityCode), log);
}
export function listThresholdAuditLog(entityCode: string): VendorRiskThresholdAuditEntry[] {
  return safeRead<VendorRiskThresholdAuditEntry[]>(thresholdAuditKey(entityCode), []);
}

// ─── RISK ALERT EVALUATION ───────────────────────────────────────────────
function operatorBreached(op: VendorRiskOperator, sample: number, value: number): boolean {
  switch (op) {
    case 'lt':  return sample <  value;
    case 'lte': return sample <= value;
    case 'gt':  return sample >  value;
    case 'gte': return sample >= value;
    case 'eq':  return sample === value;
  }
}

interface MetricSample { metric: VendorRiskMetric; value: number; vendorId: string; vendorLabel: string; }

function collectMetricSamples(entityCode: string): MetricSample[] {
  const out: MetricSample[] = [];

  // Reliability (CONSUME · do NOT recompute)
  const reliability: VendorReliabilityScore[] = loadVendorScores(entityCode);
  for (const r of reliability) {
    if (typeof r.components?.composite_score === 'number') {
      out.push({ metric: 'reliability', value: r.components.composite_score, vendorId: r.related_foreign_vendor_id, vendorLabel: r.vendor_name });
    }
    if (typeof r.components?.on_time_delivery_score === 'number') {
      out.push({ metric: 'on_time', value: r.components.on_time_delivery_score, vendorId: r.related_foreign_vendor_id, vendorLabel: r.vendor_name });
    }
  }

  // Financial health (CONSUME · do NOT recompute)
  const fhList = safeRead<VendorFinancialHealth[]>(vendorFinancialHealthKey(entityCode), []);
  for (const fh of fhList) {
    if (typeof fh.financial_risk_score === 'number') {
      out.push({ metric: 'financial_health', value: fh.financial_risk_score, vendorId: fh.party_id, vendorLabel: fh.party_id });
    }
  }

  // Compliance verified-coverage (CONSUME compliance records · derive % verified · NEVER fabricate)
  const cRecs = safeRead<VendorComplianceRecord[]>(vendorComplianceRecordKey(entityCode), []);
  const grouped = new Map<string, VendorComplianceRecord[]>();
  for (const r of cRecs) {
    if (!grouped.has(r.party_id)) grouped.set(r.party_id, []);
    grouped.get(r.party_id)!.push(r);
  }
  for (const [partyId, list] of grouped) {
    if (list.length === 0) continue;
    const verified = list.filter(r => r.verification_status === 'verified').length;
    const pct = Math.round((verified / list.length) * 100);
    out.push({ metric: 'compliance', value: pct, vendorId: partyId, vendorLabel: partyId });
  }

  return out;
}

// [JWT] Wave-2: POST /api/vendor-portal/risk-alerts/evaluate (server-side cron)
export function evaluateRiskThresholds(entityCode: string): VendorRiskAlert[] {
  const thresholds = listRiskThresholds(entityCode).filter(t => t.active);
  const samples = collectMetricSamples(entityCode);

  // CANON: honest no-alert when source data absent. No fabrication.
  if (samples.length === 0) return [];

  const existing = safeRead<VendorRiskAlert[]>(vendorRiskAlertsKey(entityCode), []);
  const openByRuleVendor = new Map<string, VendorRiskAlert>();
  for (const a of existing) {
    if (a.status === 'open') openByRuleVendor.set(`${a.rule_id}::${a.vendor_id}`, a);
  }

  const fresh: VendorRiskAlert[] = [];
  for (const t of thresholds) {
    const matching = samples.filter(s => s.metric === t.metric);
    for (const s of matching) {
      if (!operatorBreached(t.operator, s.value, t.value)) continue;
      const key = `${t.id}::${s.vendorId}`;
      if (openByRuleVendor.has(key)) continue; // dedupe — don't restamp existing open alert
      fresh.push({
        id: mkId('vra'),
        vendor_id: s.vendorId,
        severity: t.severity,
        rule_id: t.id,
        message: `${t.metric} ${t.operator} ${t.value} breached for ${s.vendorLabel} (sample=${s.value})`,
        raised_at: nowIso(),
        status: 'open',
      });
    }
  }

  if (fresh.length > 0) {
    safeWrite(vendorRiskAlertsKey(entityCode), [...existing, ...fresh]);
  }
  return fresh;
}

export function listRiskAlerts(entityCode: string): VendorRiskAlert[] {
  return safeRead<VendorRiskAlert[]>(vendorRiskAlertsKey(entityCode), []);
}

export function updateRiskAlertStatus(
  entityCode: string, id: string, status: VendorRiskAlert['status'], notes?: string,
): void {
  const list = listRiskAlerts(entityCode).map(a => {
    if (a.id !== id) return a;
    const stamp = nowIso();
    return {
      ...a,
      status,
      notes,
      acknowledged_at: status === 'acknowledged' ? stamp : a.acknowledged_at,
      resolved_at: status === 'resolved' ? stamp : a.resolved_at,
    };
  });
  safeWrite(vendorRiskAlertsKey(entityCode), list);
}

// ─── COMPLIANCE CHECKLIST ────────────────────────────────────────────────
// [JWT] Wave-2: GET/POST /api/vendor-portal/compliance-checklists
export function buildComplianceChecklist(entityCode: string, vendorId: string): VendorComplianceChecklist {
  const allRecs = safeRead<VendorComplianceRecord[]>(vendorComplianceRecordKey(entityCode), []);
  const recs = allRecs.filter(r => r.party_id === vendorId);

  const items = recs.map(r => {
    const status: ChecklistItemStatus =
      r.verification_status === 'verified' ? 'verified' :
      r.verification_status === 'pending'  ? 'pending'  :
      'submitted';
    return {
      label: `${r.compliance_type.toUpperCase()} · ${r.document_name}`,
      required: r.is_mandatory,
      status,
      doc_ref: r.id,
    };
  });

  const verified = items.filter(i => i.status === 'verified').length;
  const overall: ChecklistOverallStatus =
    items.length === 0 ? 'pending' :
    verified === items.length ? 'complete' :
    verified > 0 ? 'partial' : 'pending';

  const checklist: VendorComplianceChecklist = {
    id: mkId('vcl'),
    vendor_id: vendorId,
    items,
    overall_status: overall,
    created_at: nowIso(),
    updated_at: nowIso(),
  };

  // Persist most-recent build for the vendor (replace prior)
  const list = listComplianceChecklists(entityCode).filter(c => c.vendor_id !== vendorId);
  safeWrite(vendorComplianceChecklistsKey(entityCode), [...list, checklist]);
  return checklist;
}

export function listComplianceChecklists(entityCode: string): VendorComplianceChecklist[] {
  return safeRead<VendorComplianceChecklist[]>(vendorComplianceChecklistsKey(entityCode), []);
}

// ─── DCN ────────────────────────────────────────────────────────────────
// [JWT] Wave-2: POST /api/vendor-portal/dcn — does NOT post to ledger; accounting via existing voucher path
export function createDcn(
  entityCode: string,
  input: {
    vendor_id: string;
    type: VendorDebitCreditNote['type'];
    dcn_no: string;
    fiscal_year_id: string;
    reason: string;
    lines: VendorDcnLine[];
    created_by?: string;
  },
): VendorDebitCreditNote {
  const amount = input.lines.reduce((s, l) => s + (Number(l.amount) || 0), 0);
  const dcn: VendorDebitCreditNote = {
    id: mkId('dcn'),
    vendor_id: input.vendor_id,
    type: input.type,
    dcn_no: input.dcn_no,
    fiscal_year_id: input.fiscal_year_id,
    reason: input.reason,
    lines: input.lines,
    amount,
    status: 'draft',
    created_at: nowIso(),
    updated_at: nowIso(),
    created_by: input.created_by,
    retention_policy: 'companies_act_8yr',
  };
  const list = listDcn(entityCode);
  safeWrite(vendorDcnKey(entityCode), [...list, dcn]);
  return dcn;
}
export function listDcn(entityCode: string): VendorDebitCreditNote[] {
  return safeRead<VendorDebitCreditNote[]>(vendorDcnKey(entityCode), []);
}
export function updateDcnStatus(
  entityCode: string, id: string, status: VendorDebitCreditNote['status'],
): void {
  const list = listDcn(entityCode).map(d =>
    d.id === id ? { ...d, status, updated_at: nowIso() } : d
  );
  safeWrite(vendorDcnKey(entityCode), list);
}

// ─── DOCUMENT REQUESTS ──────────────────────────────────────────────────
// [JWT] Wave-2: POST /api/vendor-portal/document-requests
export function createDocumentRequest(
  entityCode: string,
  input: { vendor_id: string; doc_type: string; due_date?: string; notes?: string },
): VendorDocumentRequest {
  const req: VendorDocumentRequest = {
    id: mkId('vdr'),
    vendor_id: input.vendor_id,
    doc_type: input.doc_type,
    requested_at: nowIso(),
    due_date: input.due_date,
    status: 'requested',
    notes: input.notes,
  };
  const list = listDocumentRequests(entityCode);
  safeWrite(vendorDocRequestsKey(entityCode), [...list, req]);
  return req;
}
export function listDocumentRequests(entityCode: string): VendorDocumentRequest[] {
  return safeRead<VendorDocumentRequest[]>(vendorDocRequestsKey(entityCode), []);
}
export function updateDocumentRequestStatus(
  entityCode: string, id: string, status: DocumentRequestStatus, submittedRef?: string,
): void {
  const list = listDocumentRequests(entityCode).map(r => {
    if (r.id !== id) return r;
    const stamp = nowIso();
    return {
      ...r,
      status,
      submitted_ref: submittedRef ?? r.submitted_ref,
      submitted_at: status === 'submitted' ? stamp : r.submitted_at,
      verified_at: status === 'verified' ? stamp : r.verified_at,
    };
  });
  safeWrite(vendorDocRequestsKey(entityCode), list);
}
export function flagOverdueDocumentRequests(entityCode: string, asOfIso: string = nowIso()): number {
  const asOf = new Date(asOfIso).getTime();
  const list = listDocumentRequests(entityCode);
  let flagged = 0;
  const next = list.map(r => {
    if (r.status === 'requested' && r.due_date && new Date(r.due_date).getTime() < asOf) {
      flagged++;
      return { ...r, status: 'overdue' as DocumentRequestStatus };
    }
    return r;
  });
  if (flagged > 0) safeWrite(vendorDocRequestsKey(entityCode), next);
  return flagged;
}

// ─── PAYMENT BATCHES (GROUP existing requisitions · NO duplicate accounting) ──
// [JWT] Wave-2: POST /api/vendor-portal/payment-batches
export function createPaymentBatch(
  entityCode: string,
  input: { batch_no: string; fiscal_year_id: string; requisition_ids: string[]; created_by?: string; notes?: string },
): VendorPaymentBatch {
  const allReqs = listRequisitions(entityCode);
  const byId = new Map(allReqs.map(r => [r.id, r] as const));
  const total = input.requisition_ids.reduce((s, id) => {
    const r = byId.get(id);
    return s + (r ? Number((r as { amount?: number }).amount ?? 0) : 0);
  }, 0);
  const batch: VendorPaymentBatch = {
    id: mkId('vpb'),
    batch_no: input.batch_no,
    fiscal_year_id: input.fiscal_year_id,
    requisition_ids: input.requisition_ids,
    total_amount: total,
    status: 'draft',
    created_at: nowIso(),
    updated_at: nowIso(),
    created_by: input.created_by,
    notes: input.notes,
    retention_policy: 'companies_act_8yr',
  };
  const list = listPaymentBatches(entityCode);
  safeWrite(vendorPaymentBatchesKey(entityCode), [...list, batch]);
  return batch;
}
export function listPaymentBatches(entityCode: string): VendorPaymentBatch[] {
  return safeRead<VendorPaymentBatch[]>(vendorPaymentBatchesKey(entityCode), []);
}
export function updatePaymentBatchStatus(
  entityCode: string, id: string, status: VendorPaymentBatch['status'],
): void {
  const list = listPaymentBatches(entityCode).map(b => {
    if (b.id !== id) return b;
    const stamp = nowIso();
    return { ...b, status, updated_at: stamp, released_at: status === 'released' ? stamp : b.released_at };
  });
  safeWrite(vendorPaymentBatchesKey(entityCode), list);
}
