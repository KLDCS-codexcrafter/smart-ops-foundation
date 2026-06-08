/**
 * @file        src/lib/servicedesk-capstone-engine.ts
 * @purpose     ServiceDesk capstone engine · Pillar-A A.3 · aggregator across existing
 *              ServiceDesk surfaces (tickets · OEM claims · CSAT · SLA · marketplace)
 *              powering the 5 Tier-L production page promotions (S36–S40) + 3 new bridges.
 *              NO NEW DETECTION LOGIC. Reads existing engine/types/localStorage walls only.
 *
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone · Pass 1 of 3
 * @decisions   D-194 localStorage Phase 1 · D-216 pure compute · D-NEW-DJ FR-75 (bridges layer)
 * @iso         Functional Suitability + Maintainability + Reliability
 * @disciplines FR-19 sibling (NEW engine · separate file) · FR-50 entity-scoped reads
 *              FR-21 paise integers · FR-39 audit reuse (no new audit type)
 * @reuses      servicedesk-engine (READ-ONLY) · service-ticket / oem-claim / amc-record types
 * @[JWT]       Phase 2: server-side aggregation + tenant-network benchmark feeds
 *
 *  Wall: this engine NEVER mutates ServiceDesk records. It only reads + aggregates.
 *  Wall: NO new audit type. Bridge emits route through existing audit-trail-engine.
 *  Wall: NO S22 customer health score recomputation. Bridge #14 is SEAM-ONLY.
 */

import type { ServiceTicket, ServiceTicketSeverity } from '@/types/service-ticket';
import type { OEMClaimPacket } from '@/types/oem-claim';
import { serviceTicketKey } from '@/types/service-ticket';
import { oemClaimKey } from '@/types/oem-claim';

/* ────────────────────────────────────────────────────────────────────────── */
/* Capstone read helpers — entity-scoped honest reads                         */
/* ────────────────────────────────────────────────────────────────────────── */

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

export function readTickets(entityCode: string): ServiceTicket[] {
  return readJson<ServiceTicket>(serviceTicketKey(entityCode));
}

export function readOEMClaims(entityCode: string): OEMClaimPacket[] {
  return readJson<OEMClaimPacket>(oemClaimKey(entityCode));
}

/* ────────────────────────────────────────────────────────────────────────── */
/* S36 · PSU / Gov contract terms (Tier-L full)                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface PSUContractTerms {
  contract_template_id: string;
  template_label: string;
  sla_response_hours: number;
  sla_resolution_hours: number;
  escalation_levels: number;
  uptime_guarantee_pct: number;
  penalty_per_breach_paise: number;
  mandatory_audit_doc_types: string[];
}

export const PSU_CONTRACT_TEMPLATES: PSUContractTerms[] = [
  {
    contract_template_id: 'psu-tier-a',
    template_label: 'PSU Tier-A · Critical infra',
    sla_response_hours: 2,
    sla_resolution_hours: 8,
    escalation_levels: 4,
    uptime_guarantee_pct: 99.5,
    penalty_per_breach_paise: 50_000_00, // ₹50,000
    mandatory_audit_doc_types: ['signed_call_log', 'engineer_visit_proof', 'completion_certificate', 'csat_otp_log'],
  },
  {
    contract_template_id: 'psu-tier-b',
    template_label: 'PSU Tier-B · Office equipment',
    sla_response_hours: 8,
    sla_resolution_hours: 48,
    escalation_levels: 3,
    uptime_guarantee_pct: 97.0,
    penalty_per_breach_paise: 10_000_00, // ₹10,000
    mandatory_audit_doc_types: ['signed_call_log', 'completion_certificate'],
  },
  {
    contract_template_id: 'gov-dept-standard',
    template_label: 'Gov Dept · Standard',
    sla_response_hours: 24,
    sla_resolution_hours: 120,
    escalation_levels: 3,
    uptime_guarantee_pct: 95.0,
    penalty_per_breach_paise: 5_000_00, // ₹5,000
    mandatory_audit_doc_types: ['signed_call_log', 'completion_certificate'],
  },
];

export function getPSUContractTemplate(id: string): PSUContractTerms | null {
  return PSU_CONTRACT_TEMPLATES.find((t) => t.contract_template_id === id) ?? null;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* S37 · Multi-currency service export quote (Tier-L full)                     */
/*  Compute-only: applies caller-supplied FX rate. NO live FX API.             */
/* ────────────────────────────────────────────────────────────────────────── */

export type ExportCurrency = 'USD' | 'EUR' | 'GBP' | 'AED' | 'SGD';

export interface ExportQuoteInput {
  base_amount_paise: number;        // INR paise
  target_currency: ExportCurrency;
  fx_rate_inr_per_unit: number;     // operator-supplied · honest
  withholding_pct: number;          // FEMA/DTAA caller-supplied · honest
}

export interface ExportQuoteResult {
  target_currency: ExportCurrency;
  gross_in_target: number;          // 2dp
  withholding_in_target: number;
  net_in_target: number;
  realised_paise_at_quote: number;
  fema_note: string;
}

export function computeExportQuote(input: ExportQuoteInput): ExportQuoteResult {
  const rate = input.fx_rate_inr_per_unit > 0 ? input.fx_rate_inr_per_unit : 1;
  const gross = input.base_amount_paise / 100 / rate;
  const wh = gross * (input.withholding_pct / 100);
  const net = gross - wh;
  return {
    target_currency: input.target_currency,
    gross_in_target: Math.round(gross * 100) / 100,
    withholding_in_target: Math.round(wh * 100) / 100,
    net_in_target: Math.round(net * 100) / 100,
    realised_paise_at_quote: Math.round(net * rate * 100),
    fema_note:
      'FEMA + DTAA reporting required at realisation. Rate is operator-entered; Wave-2 wires real-time FX feed.',
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* S38 · IoT-ready foundation (Tier-L full · ingestion + threshold rules)      */
/*  Stores threshold rules in localStorage. Telemetry ingestion runs at        */
/*  Wave-2 (server). The foundation page demonstrates rule CRUD + dry-run.     */
/* ────────────────────────────────────────────────────────────────────────── */

export type IoTSignal = 'temperature_c' | 'vibration_mm_s' | 'runtime_hours' | 'pressure_kpa';
export type IoTComparator = 'gt' | 'lt' | 'eq';

export interface IoTThresholdRule {
  id: string;
  asset_id: string;
  signal: IoTSignal;
  comparator: IoTComparator;
  threshold_value: number;
  severity: ServiceTicketSeverity;
  auto_ticket: boolean;
  created_at: string;
}

const IOT_RULE_KEY = (e: string): string => `servicedesk_v1_iot_threshold_rule_${e}`;

export function listIoTRules(entityCode: string): IoTThresholdRule[] {
  return readJson<IoTThresholdRule>(IOT_RULE_KEY(entityCode));
}

export function saveIoTRule(entityCode: string, rule: IoTThresholdRule): IoTThresholdRule {
  try {
    const list = listIoTRules(entityCode);
    const idx = list.findIndex((r) => r.id === rule.id);
    if (idx >= 0) list[idx] = rule;
    else list.push(rule);
    localStorage.setItem(IOT_RULE_KEY(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
  return rule;
}

export function deleteIoTRule(entityCode: string, id: string): void {
  try {
    const list = listIoTRules(entityCode).filter((r) => r.id !== id);
    localStorage.setItem(IOT_RULE_KEY(entityCode), JSON.stringify(list));
  } catch {
    /* quota silent */
  }
}

export interface IoTDryRunSample {
  asset_id: string;
  signal: IoTSignal;
  value: number;
}

export function evaluateIoTRules(
  rules: IoTThresholdRule[],
  samples: IoTDryRunSample[],
): { rule_id: string; asset_id: string; signal: IoTSignal; observed: number; would_raise_ticket: boolean }[] {
  const breaches: { rule_id: string; asset_id: string; signal: IoTSignal; observed: number; would_raise_ticket: boolean }[] = [];
  for (const r of rules) {
    for (const s of samples) {
      if (s.asset_id !== r.asset_id || s.signal !== r.signal) continue;
      const breach =
        (r.comparator === 'gt' && s.value > r.threshold_value) ||
        (r.comparator === 'lt' && s.value < r.threshold_value) ||
        (r.comparator === 'eq' && s.value === r.threshold_value);
      if (breach) {
        breaches.push({
          rule_id: r.id,
          asset_id: r.asset_id,
          signal: r.signal,
          observed: s.value,
          would_raise_ticket: r.auto_ticket,
        });
      }
    }
  }
  return breaches;
}

/* ────────────────────────────────────────────────────────────────────────── */
/* S39 · Service performance benchmark (Tier-L-foundation · Wave-2 network)    */
/*  Compute the tenant's OWN metrics now. Anonymised network benchmark waits   */
/*  for Wave-2 cross-tenant data plane. Foundation banner is HONEST.           */
/* ────────────────────────────────────────────────────────────────────────── */

export interface OwnPerformanceMetrics {
  tickets_total: number;
  tickets_resolved: number;
  avg_response_minutes: number | null;
  avg_resolution_hours: number | null;
  reopened_pct: number;
  first_time_fix_pct: number;
}

export function computeOwnPerformance(entityCode: string): OwnPerformanceMetrics {
  const tickets = readTickets(entityCode);
  const total = tickets.length;
  const resolved = tickets.filter((t) => t.status === 'resolved' || t.status === 'closed');
  const respDeltas: number[] = [];
  const resDeltas: number[] = [];
  for (const t of resolved) {
    if (t.acked_at) {
      respDeltas.push((new Date(t.acked_at).getTime() - new Date(t.raised_at).getTime()) / 60_000);
    }
    if (t.resolved_at) {
      resDeltas.push((new Date(t.resolved_at).getTime() - new Date(t.raised_at).getTime()) / 3_600_000);
    }
  }
  const reopened = tickets.filter((t) => t.reopened_count > 0).length;
  const firstFix = resolved.length - reopened;
  return {
    tickets_total: total,
    tickets_resolved: resolved.length,
    avg_response_minutes:
      respDeltas.length === 0 ? null : Math.round(respDeltas.reduce((a, b) => a + b, 0) / respDeltas.length),
    avg_resolution_hours:
      resDeltas.length === 0 ? null : Math.round((resDeltas.reduce((a, b) => a + b, 0) / resDeltas.length) * 10) / 10,
    reopened_pct: total === 0 ? 0 : Math.round((reopened / total) * 1000) / 10,
    first_time_fix_pct: resolved.length === 0 ? 0 : Math.round((Math.max(firstFix, 0) / resolved.length) * 1000) / 10,
  };
}

/* ────────────────────────────────────────────────────────────────────────── */
/* S40 · Engineer reputation rating (Tier-L-foundation · Wave-2 cross-customer)*/
/*  Per-engineer rollup from local tickets only. Cross-customer aggregation    */
/*  awaits Wave-2 identity-linked engineer pool.                                */
/* ────────────────────────────────────────────────────────────────────────── */

export interface EngineerReputation {
  engineer_id: string;
  closed_count: number;
  reopened_count: number;
  on_time_pct: number;
  reputation_score: number; // 0-100
}

export function computeEngineerReputation(entityCode: string): EngineerReputation[] {
  const tickets = readTickets(entityCode);
  const byEng = new Map<string, ServiceTicket[]>();
  for (const t of tickets) {
    if (!t.assigned_engineer_id) continue;
    const arr = byEng.get(t.assigned_engineer_id) ?? [];
    arr.push(t);
    byEng.set(t.assigned_engineer_id, arr);
  }
  const result: EngineerReputation[] = [];
  byEng.forEach((list, engId) => {
    const closed = list.filter((t) => t.status === 'closed' || t.status === 'resolved').length;
    const reopened = list.filter((t) => t.reopened_count > 0).length;
    const onTime = list.filter(
      (t) =>
        t.resolved_at &&
        t.sla_resolution_due_at &&
        new Date(t.resolved_at).getTime() <= new Date(t.sla_resolution_due_at).getTime(),
    ).length;
    const onTimePct = closed === 0 ? 0 : Math.round((onTime / closed) * 1000) / 10;
    // Transparent rubric: 100 base · reopened -8 each (cap -40) · on-time-pct linear pull
    const penalty = Math.min(reopened * 8, 40);
    const score = Math.max(0, Math.min(100, Math.round(60 + (onTimePct - 50) * 0.8 - penalty)));
    result.push({
      engineer_id: engId,
      closed_count: closed,
      reopened_count: reopened,
      on_time_pct: onTimePct,
      reputation_score: score,
    });
  });
  return result.sort((a, b) => b.reputation_score - a.reputation_score);
}

/* ────────────────────────────────────────────────────────────────────────── */
/* (Service-trends aggregator removed in A.3 T1 remediation: not spec for      */
/*  bridge #15. Spec #15 = emitOEMPNLToFinCore SEAM-ONLY, declared in         */
/*  servicedesk-bridges.ts. No replacement aggregator is needed in A.3.)       */
/* ────────────────────────────────────────────────────────────────────────── */



/* ────────────────────────────────────────────────────────────────────────── */
/* OEM portal warranty claim packet builder (powers bridge #13)                */
/*  CONSUMES existing OEMClaimPacket shape · does NOT recreate claim data.     */
/* ────────────────────────────────────────────────────────────────────────── */

export interface OEMPortalWarrantyClaimPacket {
  oem_claim_packet_id: string;
  oem_claim_no: string;
  oem_name: string;
  spare_id: string;
  spare_name: string;
  qty: number;
  warranty_period_status: OEMClaimPacket['warranty_period_status'];
  total_claim_value_paise: number;
}

export function buildOEMPortalPacket(claim: OEMClaimPacket): OEMPortalWarrantyClaimPacket {
  return {
    oem_claim_packet_id: claim.id,
    oem_claim_no: claim.oem_claim_no,
    oem_name: claim.oem_name,
    spare_id: claim.spare_id,
    spare_name: claim.spare_name,
    qty: claim.qty,
    warranty_period_status: claim.warranty_period_status,
    total_claim_value_paise: claim.total_claim_value_paise,
  };
}
