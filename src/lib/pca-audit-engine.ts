/**
 * @file        src/lib/pca-audit-engine.ts
 * @purpose     PCA Audit workflow · v7 Gap #5 · consumes EX-6 BoE RMS lane
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q5=b FOUNDATION · 7-state workflow · bill-of-entry-engine READ-ONLY
 */
import type { PCAAudit, PCAAuditStatus } from '@/types/pca-audit';
import { pcaAuditKey, PCA_VALID_TRANSITIONS } from '@/types/pca-audit';
import { loadBoEs } from '@/lib/bill-of-entry-engine';

const SEED_PCA_AUDITS: PCAAudit[] = [
  { id: 'pca-001', pca_case_no: 'PCA-MUM-2026-001', entity_id: 'sinha-steel', status: 'document_request', trigger_source: 'rms_yellow_lane', related_boe_id: 'boe-sinha-002', related_boe_no: 'BOE-SINHA-2026-002', customs_zone: 'Mumbai Custom Zone', audit_initiated_date: '2026-05-08', document_request_date: '2026-05-08', document_response_date: null, findings_date: null, findings_summary: '', duty_short_paid_inr: 0, interest_payable_inr: 0, penalty_inr: 0, total_demand_inr: 0, appeal_filed: false, closed_date: null, notes: 'BoE-002 Yellow RMS lane · routine document audit', created_at: '2026-05-08T00:00:00.000Z', updated_at: '2026-05-08T00:00:00.000Z' },
  { id: 'pca-002', pca_case_no: 'PCA-MUM-2026-002', entity_id: 'sinha-steel', status: 'closed', trigger_source: 'cbic_random_selection', related_boe_id: 'boe-sinha-001', related_boe_no: 'BOE-SINHA-2026-001', customs_zone: 'Mumbai Custom Zone', audit_initiated_date: '2026-04-10', document_request_date: '2026-04-12', document_response_date: '2026-04-22', findings_date: '2026-05-02', findings_summary: 'No discrepancies · classification correct · duty paid in order', duty_short_paid_inr: 0, interest_payable_inr: 0, penalty_inr: 0, total_demand_inr: 0, appeal_filed: false, closed_date: '2026-05-05', notes: 'Random selection · clean closure', created_at: '2026-04-10T00:00:00.000Z', updated_at: '2026-05-05T00:00:00.000Z' },
  { id: 'pca-003', pca_case_no: 'PCA-MUM-2026-003', entity_id: 'sinha-steel', status: 'findings_issued', trigger_source: 'rms_yellow_lane', related_boe_id: 'boe-sinha-003', related_boe_no: 'BOE-SINHA-2026-003', customs_zone: 'Mumbai Custom Zone', audit_initiated_date: '2026-04-25', document_request_date: '2026-04-26', document_response_date: '2026-05-03', findings_date: '2026-05-15', findings_summary: 'Minor classification dispute · short duty ₹12,500 + interest ₹450', duty_short_paid_inr: 12500, interest_payable_inr: 450, penalty_inr: 0, total_demand_inr: 12950, appeal_filed: false, closed_date: null, notes: 'BoE-003 · classification dispute · contemplating appeal', created_at: '2026-04-25T00:00:00.000Z', updated_at: '2026-05-15T00:00:00.000Z' },
];

export function loadPCAAudits(entityCode: string): PCAAudit[] {
  try {
    const raw = localStorage.getItem(pcaAuditKey(entityCode));
    if (!raw) { localStorage.setItem(pcaAuditKey(entityCode), JSON.stringify(SEED_PCA_AUDITS)); return SEED_PCA_AUDITS; }
    return JSON.parse(raw) as PCAAudit[];
  } catch { return SEED_PCA_AUDITS; }
}

export function savePCAAudits(entityCode: string, list: PCAAudit[]): void {
  localStorage.setItem(pcaAuditKey(entityCode), JSON.stringify(list));
}

export function getEligibleBoEsForPCA(entityCode: string): { boe_id: string; boe_no: string; lane: 'yellow' | 'red' }[] {
  const bills = loadBoEs(entityCode);
  return bills
    .filter((b) => b.icegate_simulated_lane === 'yellow' || b.icegate_simulated_lane === 'red')
    .map((b) => ({ boe_id: b.id, boe_no: b.boe_no, lane: b.icegate_simulated_lane as 'yellow' | 'red' }));
}

export function transitionPCA(entityCode: string, id: string, next: PCAAuditStatus): PCAAudit {
  const list = loadPCAAudits(entityCode);
  const p = list.find((x) => x.id === id);
  if (!p) throw new Error(`PCA Audit not found: ${id}`);
  if (!PCA_VALID_TRANSITIONS[p.status].includes(next)) {
    throw new Error(`Invalid PCA transition: ${p.status} → ${next}`);
  }
  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const updated: PCAAudit = { ...p, status: next, updated_at: now };
  if (next === 'document_request') updated.document_request_date = today;
  if (next === 'response_received') updated.document_response_date = today;
  if (next === 'findings_issued') updated.findings_date = today;
  if (next === 'closed') updated.closed_date = today;
  savePCAAudits(entityCode, list.map((x) => (x.id === id ? updated : x)));
  return updated;
}
