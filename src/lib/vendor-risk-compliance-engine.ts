/**
 * @file        src/lib/vendor-risk-compliance-engine.ts
 * @purpose     VP-GAPS sole SIBLING · zones · alerts · CC-editable thresholds · compliance checklists · DCN intent registry · doc requests · payment batches
 * @sprint      T-VPG-VendorPortal-Gaps · Wave-1 tail
 * @decisions   D-NEW-DN (Vendor Portal canonical) · D-NEW-DP (ccc reference shapes) ·
 *              FR-79 (FY-stamping at birth) · P8.6 retention floor honored at birth
 * @disciplines FR-19 (single new SIBLING this sprint) · FR-30 · FR-50 (entity-scoped) ·
 *              Honest-study canon (NEVER fabricate scores · explicit no_source_data path)
 * @reuses      vendor-reliability-score (READ-ONLY) · vendor-financial-health (READ-ONLY) ·
 *              vendor-risk-score (READ-ONLY) · vendor-compliance-record (READ-ONLY)
 * @walls       audit-trail-engine (0-DIFF · we maintain an internal append-only edit log
 *              for threshold edits · NEVER mutate the central chain) · vendor-scoring-engine ·
 *              vendor-reliability-engine · FinCore voucher engines · PayOut disbursement engines
 * @[JWT]       Phase-2: server-side alert dispatch · payment batch release wiring to bank API
 */

import type { VendorZone, VendorZoneColor } from '@/types/vendor-zone';
import { vendorZoneKey } from '@/types/vendor-zone';
import type {
  VendorRiskAlert, VendorRiskAlertSource, VendorRiskAlertSeverity, VendorRiskAlertStatus,
} from '@/types/vendor-risk-alert';
import { vendorRiskAlertKey } from '@/types/vendor-risk-alert';
import type {
  VendorRiskThreshold, VendorRiskThresholdEdit, VendorThresholdKind,
} from '@/types/vendor-risk-threshold';
import {
  vendorRiskThresholdKey, vendorRiskThresholdEditKey,
} from '@/types/vendor-risk-threshold';
import type {
  VendorComplianceChecklist, VendorChecklistItem, ChecklistItemStatus,
} from '@/types/vendor-compliance-checklist';
import { vendorComplianceChecklistKey } from '@/types/vendor-compliance-checklist';
import type { VendorDcn, DcnKind, DcnReason, DcnStatus } from '@/types/vendor-dcn';
import { vendorDcnKey } from '@/types/vendor-dcn';
import type {
  VendorDocumentRequest, DocumentRequestStatus,
} from '@/types/vendor-document-request';
import { vendorDocumentRequestKey } from '@/types/vendor-document-request';
import type {
  VendorPaymentBatch, VendorPaymentBatchLine, PaymentBatchStatus, PaymentBatchChannel,
} from '@/types/vendor-payment-batch';
import { vendorPaymentBatchKey } from '@/types/vendor-payment-batch';

import type { VendorReliabilityScore } from '@/types/vendor-reliability-score';
import { vendorReliabilityKey } from '@/types/vendor-reliability-score';
import type { VendorFinancialHealth } from '@/types/vendor-financial-health';
import { vendorFinancialHealthKey } from '@/types/vendor-financial-health';
import type { VendorRiskScore } from '@/types/vendor-risk-score';
import { vendorRiskScoreKey } from '@/types/vendor-risk-score';
import type { VendorComplianceRecord } from '@/types/vendor-compliance-record';
import { vendorComplianceRecordKey } from '@/types/vendor-compliance-record';

// ─── safe LS helpers ──────────────────────────────────────────────────────
function readLS<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback;
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}
function writeLS(key: string, value: unknown): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, JSON.stringify(value));
  } catch { /* swallow */ }
}

function nowISO(): string { return new Date().toISOString(); }
function uuid(): string {
  return `vrc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── FY helper (April-March IST) ──────────────────────────────────────────
export function currentFinancialYear(at: Date = new Date()): string {
  const y = at.getUTCFullYear();
  const m = at.getUTCMonth() + 1; // 1-12
  const startYear = m >= 4 ? y : y - 1;
  return `${startYear}-${String((startYear + 1) % 100).padStart(2, '0')}`;
}

// ═════════════════════════════════════════════════════════════════════════
// THRESHOLDS (CC-editable)
// ═════════════════════════════════════════════════════════════════════════

const DEFAULT_THRESHOLDS: Array<Pick<VendorRiskThreshold, 'kind' | 'value' | 'label' | 'description'>> = [
  { kind: 'reliability_min_green', value: 85, label: 'Reliability · Green floor', description: 'Composite reliability ≥ this value → Green zone candidate' },
  { kind: 'reliability_min_amber', value: 60, label: 'Reliability · Amber floor', description: 'Composite reliability ≥ this and < green → Amber zone' },
  { kind: 'financial_risk_max_green', value: 30, label: 'Financial risk · Green ceiling', description: 'financial_risk_score ≤ this → Green' },
  { kind: 'financial_risk_max_amber', value: 60, label: 'Financial risk · Amber ceiling', description: 'financial_risk_score > green and ≤ this → Amber' },
  { kind: 'compliance_expiry_warn_days', value: 30, label: 'Compliance expiry warn window', description: 'Alert when any compliance doc expires within N days' },
  { kind: 'overall_risk_max_green', value: 35, label: 'Overall risk · Green ceiling', description: 'overall_score ≤ this → Green' },
  { kind: 'overall_risk_max_amber', value: 65, label: 'Overall risk · Amber ceiling', description: 'overall_score > green and ≤ this → Amber' },
];

export function listThresholds(entityCode: string): VendorRiskThreshold[] {
  const existing = readLS<VendorRiskThreshold[]>(vendorRiskThresholdKey(entityCode), []);
  if (existing.length > 0) return existing;
  const now = nowISO();
  const seeded: VendorRiskThreshold[] = DEFAULT_THRESHOLDS.map((d) => ({
    id: uuid(), entity_code: entityCode, ...d, created_at: now, updated_at: now,
  }));
  writeLS(vendorRiskThresholdKey(entityCode), seeded);
  return seeded;
}

export function getThreshold(entityCode: string, kind: VendorThresholdKind): number | null {
  const t = listThresholds(entityCode).find((x) => x.kind === kind);
  return t ? t.value : null;
}

export function updateThreshold(
  entityCode: string,
  kind: VendorThresholdKind,
  newValue: number,
  editedBy?: string,
  reason?: string,
): VendorRiskThreshold | null {
  const all = listThresholds(entityCode);
  const idx = all.findIndex((x) => x.kind === kind);
  if (idx < 0) return null;
  const prev = all[idx].value;
  if (prev === newValue) return all[idx];
  const updated: VendorRiskThreshold = {
    ...all[idx], value: newValue, edited_by: editedBy, edited_at: nowISO(), updated_at: nowISO(),
  };
  all[idx] = updated;
  writeLS(vendorRiskThresholdKey(entityCode), all);
  // Append-only internal edit log · DOES NOT touch audit-trail wall
  const log = readLS<VendorRiskThresholdEdit[]>(vendorRiskThresholdEditKey(entityCode), []);
  log.push({
    id: uuid(), threshold_id: updated.id, entity_code: entityCode, kind,
    previous_value: prev, new_value: newValue,
    edited_by: editedBy, edited_at: nowISO(), reason,
  });
  writeLS(vendorRiskThresholdEditKey(entityCode), log);
  return updated;
}

export function listThresholdEdits(entityCode: string): VendorRiskThresholdEdit[] {
  return readLS<VendorRiskThresholdEdit[]>(vendorRiskThresholdEditKey(entityCode), []);
}

// ═════════════════════════════════════════════════════════════════════════
// ZONES (Green/Amber/Red derived from CONSUMED scores · NEVER fabricated)
// ═════════════════════════════════════════════════════════════════════════

interface SourceScores {
  reliability_composite?: number;
  financial_risk_score?: number;
  overall_risk_score?: number;
  has_any_signal: boolean;
}

function readSourceScoresForVendor(entityCode: string, partyId: string): SourceScores {
  const rel = readLS<VendorReliabilityScore[]>(vendorReliabilityKey(entityCode), [])
    .find((r) => r.related_foreign_vendor_id === partyId);
  const fin = readLS<VendorFinancialHealth[]>(vendorFinancialHealthKey(entityCode), [])
    .find((f) => f.party_id === partyId);
  const risk = readLS<VendorRiskScore[]>(vendorRiskScoreKey(entityCode), [])
    .find((r) => r.party_id === partyId);
  const reliability_composite = rel?.components.composite_score;
  const financial_risk_score = fin?.financial_risk_score;
  const overall_risk_score = risk?.overall_score;
  const has_any_signal =
    reliability_composite !== undefined ||
    financial_risk_score !== undefined ||
    overall_risk_score !== undefined;
  return { reliability_composite, financial_risk_score, overall_risk_score, has_any_signal };
}

export function computeZone(entityCode: string, partyId: string): VendorZone {
  const src = readSourceScoresForVendor(entityCode, partyId);
  const now = nowISO();
  if (!src.has_any_signal) {
    return {
      id: uuid(), party_id: partyId, entity_code: entityCode,
      zone: 'unrated', reason: 'no_source_data · honest study: no reliability/financial/risk score present',
      source_scores: {}, computed_at: now, created_at: now, updated_at: now,
    };
  }
  const relGreen = getThreshold(entityCode, 'reliability_min_green') ?? 85;
  const relAmber = getThreshold(entityCode, 'reliability_min_amber') ?? 60;
  const finGreen = getThreshold(entityCode, 'financial_risk_max_green') ?? 30;
  const finAmber = getThreshold(entityCode, 'financial_risk_max_amber') ?? 60;
  const ovrGreen = getThreshold(entityCode, 'overall_risk_max_green') ?? 35;
  const ovrAmber = getThreshold(entityCode, 'overall_risk_max_amber') ?? 65;

  // Worst-of: if any signal lands in Red, zone=Red. Else if any Amber, zone=Amber. Else Green.
  let band: VendorZoneColor = 'green';
  const reasons: string[] = [];

  if (src.reliability_composite !== undefined) {
    if (src.reliability_composite < relAmber) { band = 'red'; reasons.push(`reliability=${src.reliability_composite} < amber=${relAmber}`); }
    else if (src.reliability_composite < relGreen && band !== 'red') { band = 'amber'; reasons.push(`reliability=${src.reliability_composite} < green=${relGreen}`); }
  }
  if (src.financial_risk_score !== undefined) {
    if (src.financial_risk_score > finAmber) { band = 'red'; reasons.push(`financial_risk=${src.financial_risk_score} > amber=${finAmber}`); }
    else if (src.financial_risk_score > finGreen && band !== 'red') { band = 'amber'; reasons.push(`financial_risk=${src.financial_risk_score} > green=${finGreen}`); }
  }
  if (src.overall_risk_score !== undefined) {
    if (src.overall_risk_score > ovrAmber) { band = 'red'; reasons.push(`overall_risk=${src.overall_risk_score} > amber=${ovrAmber}`); }
    else if (src.overall_risk_score > ovrGreen && band !== 'red') { band = 'amber'; reasons.push(`overall_risk=${src.overall_risk_score} > green=${ovrGreen}`); }
  }
  return {
    id: uuid(), party_id: partyId, entity_code: entityCode,
    zone: band, reason: reasons.length ? reasons.join(' · ') : 'all signals within green thresholds',
    source_scores: {
      reliability_composite: src.reliability_composite,
      financial_risk_score: src.financial_risk_score,
      overall_risk_score: src.overall_risk_score,
    },
    computed_at: now, created_at: now, updated_at: now,
  };
}

export function recomputeAllZones(entityCode: string, partyIds: string[]): VendorZone[] {
  const zones = partyIds.map((pid) => computeZone(entityCode, pid));
  writeLS(vendorZoneKey(entityCode), zones);
  return zones;
}

export function listZones(entityCode: string): VendorZone[] {
  return readLS<VendorZone[]>(vendorZoneKey(entityCode), []);
}

// ═════════════════════════════════════════════════════════════════════════
// ALERTS
// ═════════════════════════════════════════════════════════════════════════

function createAlert(
  entityCode: string, partyId: string,
  source: VendorRiskAlertSource, severity: VendorRiskAlertSeverity,
  title: string, detail: string,
  thresholdValue?: number, observedValue?: number,
): VendorRiskAlert {
  return {
    id: uuid(), party_id: partyId, entity_code: entityCode,
    source, severity, status: 'open',
    title, detail,
    threshold_value: thresholdValue, observed_value: observedValue,
    created_at: nowISO(), updated_at: nowISO(),
  };
}

export function evaluateAlertsForVendor(entityCode: string, partyId: string): VendorRiskAlert[] {
  const out: VendorRiskAlert[] = [];
  const src = readSourceScoresForVendor(entityCode, partyId);
  if (!src.has_any_signal) return out; // honest: no signal → no alerts (NEVER fabricated)

  const zone = computeZone(entityCode, partyId);
  if (zone.zone === 'red') {
    out.push(createAlert(entityCode, partyId, 'zone_transition', 'critical',
      'Vendor entered Red zone', zone.reason));
  } else if (zone.zone === 'amber') {
    out.push(createAlert(entityCode, partyId, 'zone_transition', 'warning',
      'Vendor in Amber zone', zone.reason));
  }
  const warnDays = getThreshold(entityCode, 'compliance_expiry_warn_days') ?? 30;
  const compliance = readLS<VendorComplianceRecord[]>(vendorComplianceRecordKey(entityCode), [])
    .filter((c) => c.party_id === partyId);
  const cutoff = Date.now() + warnDays * 86400000;
  for (const c of compliance) {
    if (!c.expiry_date) continue;
    const exp = Date.parse(c.expiry_date);
    if (Number.isNaN(exp)) continue;
    if (exp < Date.now()) {
      out.push(createAlert(entityCode, partyId, 'compliance_expiry', 'critical',
        `${c.document_name} expired`, `Document expired on ${c.expiry_date}`));
    } else if (exp <= cutoff) {
      out.push(createAlert(entityCode, partyId, 'compliance_expiry', 'warning',
        `${c.document_name} expiring soon`, `Expires on ${c.expiry_date} (within ${warnDays}d window)`,
        warnDays));
    }
  }
  return out;
}

export function persistAlerts(entityCode: string, alerts: VendorRiskAlert[]): void {
  const existing = readLS<VendorRiskAlert[]>(vendorRiskAlertKey(entityCode), []);
  writeLS(vendorRiskAlertKey(entityCode), [...existing, ...alerts]);
}

export function listAlerts(entityCode: string, status?: VendorRiskAlertStatus): VendorRiskAlert[] {
  const all = readLS<VendorRiskAlert[]>(vendorRiskAlertKey(entityCode), []);
  return status ? all.filter((a) => a.status === status) : all;
}

export function updateAlertStatus(
  entityCode: string, alertId: string, status: VendorRiskAlertStatus,
  actorId?: string, note?: string,
): VendorRiskAlert | null {
  const all = readLS<VendorRiskAlert[]>(vendorRiskAlertKey(entityCode), []);
  const idx = all.findIndex((a) => a.id === alertId);
  if (idx < 0) return null;
  const now = nowISO();
  const cur = all[idx];
  const next: VendorRiskAlert = { ...cur, status, updated_at: now };
  if (status === 'acknowledged') { next.acknowledged_by = actorId; next.acknowledged_at = now; }
  if (status === 'resolved') { next.resolved_by = actorId; next.resolved_at = now; next.resolution_note = note; }
  all[idx] = next;
  writeLS(vendorRiskAlertKey(entityCode), all);
  return next;
}

// ═════════════════════════════════════════════════════════════════════════
// COMPLIANCE CHECKLISTS (rollup of VendorComplianceRecord — read-only consume)
// ═════════════════════════════════════════════════════════════════════════

const DEFAULT_CHECKLIST_TEMPLATE: Array<Pick<VendorChecklistItem, 'key' | 'label' | 'is_mandatory'>> = [
  { key: 'gst', label: 'GST Registration', is_mandatory: true },
  { key: 'pan', label: 'PAN Card', is_mandatory: true },
  { key: 'msme', label: 'MSME Certificate', is_mandatory: false },
  { key: 'bank', label: 'Bank Account Proof', is_mandatory: true },
  { key: 'address', label: 'Address Proof', is_mandatory: true },
  { key: 'iso', label: 'ISO Certification', is_mandatory: false },
];

export function buildChecklistForVendor(entityCode: string, partyId: string): VendorComplianceChecklist {
  const records = readLS<VendorComplianceRecord[]>(vendorComplianceRecordKey(entityCode), [])
    .filter((r) => r.party_id === partyId);
  const items: VendorChecklistItem[] = DEFAULT_CHECKLIST_TEMPLATE.map((tpl) => {
    const match = records.find((r) => r.compliance_type === tpl.key);
    let status: ChecklistItemStatus = 'pending';
    if (match) {
      if (match.verification_status === 'verified') status = 'satisfied';
      else if (match.verification_status === 'expired') status = 'expired';
      else if (match.verification_status === 'not_applicable') status = 'not_applicable';
      else status = 'pending';
    }
    return {
      key: tpl.key, label: tpl.label, is_mandatory: tpl.is_mandatory, status,
      ref_compliance_record_id: match?.id, expiry_date: match?.expiry_date,
    };
  });
  const mandatoryItems = items.filter((i) => i.is_mandatory);
  const mandatory_satisfied_count = mandatoryItems.filter((i) => i.status === 'satisfied').length;
  const mandatory_total_count = mandatoryItems.length;
  const completion_percent = mandatory_total_count === 0
    ? 100
    : Math.round((mandatory_satisfied_count / mandatory_total_count) * 100);
  const now = nowISO();
  return {
    id: uuid(), party_id: partyId, entity_code: entityCode, items,
    mandatory_satisfied_count, mandatory_total_count, completion_percent,
    last_evaluated_at: now, created_at: now, updated_at: now,
  };
}

export function refreshAllChecklists(entityCode: string, partyIds: string[]): VendorComplianceChecklist[] {
  const all = partyIds.map((pid) => buildChecklistForVendor(entityCode, pid));
  writeLS(vendorComplianceChecklistKey(entityCode), all);
  return all;
}

export function listChecklists(entityCode: string): VendorComplianceChecklist[] {
  return readLS<VendorComplianceChecklist[]>(vendorComplianceChecklistKey(entityCode), []);
}

// ═════════════════════════════════════════════════════════════════════════
// DCN intent registry (FY-stamped · 8yr retention at birth)
// ═════════════════════════════════════════════════════════════════════════

export function createDcn(input: {
  entity_code: string;
  party_id: string;
  kind: DcnKind;
  reason: DcnReason;
  amount_paise: number;
  reference_voucher_id?: string;
  reference_voucher_no?: string;
  tax_amount_paise?: number;
  reason_note?: string;
  notes?: string;
  created_by?: string;
}): VendorDcn {
  const now = nowISO();
  const dcn: VendorDcn = {
    id: uuid(), party_id: input.party_id, entity_code: input.entity_code,
    financial_year: currentFinancialYear(),
    retention_policy: 'gst_8yr',
    kind: input.kind, reason: input.reason, reason_note: input.reason_note,
    reference_voucher_id: input.reference_voucher_id,
    reference_voucher_no: input.reference_voucher_no,
    amount_paise: Math.trunc(input.amount_paise),
    tax_amount_paise: input.tax_amount_paise === undefined ? undefined : Math.trunc(input.tax_amount_paise),
    status: 'draft',
    created_by: input.created_by,
    notes: input.notes,
    created_at: now, updated_at: now,
  };
  const list = readLS<VendorDcn[]>(vendorDcnKey(input.entity_code), []);
  list.push(dcn);
  writeLS(vendorDcnKey(input.entity_code), list);
  return dcn;
}

export function updateDcnStatus(
  entityCode: string, dcnId: string, status: DcnStatus,
  actorId?: string, note?: string,
): VendorDcn | null {
  const list = readLS<VendorDcn[]>(vendorDcnKey(entityCode), []);
  const idx = list.findIndex((d) => d.id === dcnId);
  if (idx < 0) return null;
  const now = nowISO();
  const cur = list[idx];
  const next: VendorDcn = { ...cur, status, updated_at: now };
  if (status === 'submitted') next.submitted_at = now;
  if (status === 'approved') { next.approved_by = actorId; next.approved_at = now; }
  if (status === 'cancelled') { next.cancelled_at = now; next.cancelled_reason = note; }
  list[idx] = next;
  writeLS(vendorDcnKey(entityCode), list);
  return next;
}

export function listDcns(entityCode: string): VendorDcn[] {
  return readLS<VendorDcn[]>(vendorDcnKey(entityCode), []);
}

// ═════════════════════════════════════════════════════════════════════════
// DOCUMENT REQUESTS
// ═════════════════════════════════════════════════════════════════════════

export function createDocumentRequest(input: {
  entity_code: string;
  party_id: string;
  document_type: string;
  document_label: string;
  reason?: string;
  due_date?: string;
  requested_by?: string;
}): VendorDocumentRequest {
  const now = nowISO();
  const req: VendorDocumentRequest = {
    id: uuid(), party_id: input.party_id, entity_code: input.entity_code,
    document_type: input.document_type, document_label: input.document_label,
    reason: input.reason, due_date: input.due_date,
    status: 'pending',
    requested_by: input.requested_by, requested_at: now,
    reminder_count: 0,
    created_at: now, updated_at: now,
  };
  const list = readLS<VendorDocumentRequest[]>(vendorDocumentRequestKey(input.entity_code), []);
  list.push(req);
  writeLS(vendorDocumentRequestKey(input.entity_code), list);
  return req;
}

export function updateDocumentRequestStatus(
  entityCode: string, requestId: string, status: DocumentRequestStatus,
  actorId?: string, note?: string,
): VendorDocumentRequest | null {
  const list = readLS<VendorDocumentRequest[]>(vendorDocumentRequestKey(entityCode), []);
  const idx = list.findIndex((r) => r.id === requestId);
  if (idx < 0) return null;
  const now = nowISO();
  const cur = list[idx];
  const next: VendorDocumentRequest = { ...cur, status, updated_at: now };
  if (status === 'sent') next.sent_at = now;
  if (status === 'submitted') next.submitted_at = now;
  if (status === 'verified') { next.verified_by = actorId; next.verified_at = now; }
  if (status === 'rejected') next.rejection_reason = note;
  list[idx] = next;
  writeLS(vendorDocumentRequestKey(entityCode), list);
  return next;
}

export function recordDocumentRequestReminder(entityCode: string, requestId: string): VendorDocumentRequest | null {
  const list = readLS<VendorDocumentRequest[]>(vendorDocumentRequestKey(entityCode), []);
  const idx = list.findIndex((r) => r.id === requestId);
  if (idx < 0) return null;
  const next: VendorDocumentRequest = {
    ...list[idx], reminder_count: list[idx].reminder_count + 1,
    last_reminder_at: nowISO(), updated_at: nowISO(),
  };
  list[idx] = next;
  writeLS(vendorDocumentRequestKey(entityCode), list);
  return next;
}

export function listDocumentRequests(entityCode: string): VendorDocumentRequest[] {
  return readLS<VendorDocumentRequest[]>(vendorDocumentRequestKey(entityCode), []);
}

// ═════════════════════════════════════════════════════════════════════════
// PAYMENT BATCHES (grouping metadata · NEVER mutates accounting/disbursement)
// ═════════════════════════════════════════════════════════════════════════

export function createPaymentBatch(input: {
  entity_code: string;
  batch_no: string;
  scheduled_date: string;
  channel: PaymentBatchChannel;
  lines: VendorPaymentBatchLine[];
  notes?: string;
  created_by?: string;
}): VendorPaymentBatch {
  const now = nowISO();
  const total = input.lines.reduce((s, l) => s + Math.trunc(l.amount_paise), 0);
  const batch: VendorPaymentBatch = {
    id: uuid(), entity_code: input.entity_code,
    financial_year: currentFinancialYear(),
    retention_policy: 'gst_8yr',
    batch_no: input.batch_no,
    scheduled_date: input.scheduled_date,
    channel: input.channel,
    lines: input.lines.map((l) => ({ ...l, amount_paise: Math.trunc(l.amount_paise) })),
    line_count: input.lines.length,
    total_amount_paise: total,
    status: 'draft',
    created_by: input.created_by,
    notes: input.notes,
    created_at: now, updated_at: now,
  };
  const list = readLS<VendorPaymentBatch[]>(vendorPaymentBatchKey(input.entity_code), []);
  list.push(batch);
  writeLS(vendorPaymentBatchKey(input.entity_code), list);
  return batch;
}

export function updatePaymentBatchStatus(
  entityCode: string, batchId: string, status: PaymentBatchStatus,
  actorId?: string, note?: string,
): VendorPaymentBatch | null {
  const list = readLS<VendorPaymentBatch[]>(vendorPaymentBatchKey(entityCode), []);
  const idx = list.findIndex((b) => b.id === batchId);
  if (idx < 0) return null;
  const now = nowISO();
  const cur = list[idx];
  const next: VendorPaymentBatch = { ...cur, status, updated_at: now };
  if (status === 'released') { next.released_by = actorId; next.released_at = now; }
  if (status === 'failed') next.failure_reason = note;
  if (status === 'cancelled') { next.cancelled_at = now; next.cancelled_reason = note; }
  list[idx] = next;
  writeLS(vendorPaymentBatchKey(entityCode), list);
  return next;
}

export function listPaymentBatches(entityCode: string): VendorPaymentBatch[] {
  return readLS<VendorPaymentBatch[]>(vendorPaymentBatchKey(entityCode), []);
}
