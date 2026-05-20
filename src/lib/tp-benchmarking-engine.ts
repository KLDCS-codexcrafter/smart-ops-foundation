/**
 * @file        src/lib/tp-benchmarking-engine.ts
 * @purpose     Transfer Pricing FOUNDATION · ALP 5-method · Form 3CEB · v7 Gap #6
 * @sprint      T-Phase-1.EX-9-Compliance-Suite
 * @decisions   EX-9-Q6=b FOUNDATION
 */
import type { TPDocumentation, ALPMethod } from '@/types/transfer-pricing';
import { tpDocumentationKey } from '@/types/transfer-pricing';

const TP_THRESHOLD_INR = 200000000;

const SEED_TP_DOCS: TPDocumentation[] = [
  { id: 'tpd-001', doc_ref: 'TPD-SINHA-FY2025-26', entity_id: 'sinha-trading', status: 'local_file_done', fy: '2025-26', total_international_transactions_inr: 280000000, is_above_threshold: true, associated_enterprises: [{ id: 'ae-001', ae_name: 'Sinha Holdings USA Inc.', ae_country_code: 'US', relationship_type: 'parent', shareholding_pct: 100, is_specified_domestic: false }], alp_method_primary: 'TNMM', alp_method_rationale: 'Most commonly used for distribution functions · arms-length net margin benchmarking', benchmarking_study_ref: 'BS-2025-TNMM-001', master_file_filed_at: '2026-04-15T00:00:00.000Z', local_file_filed_at: '2026-05-10T00:00:00.000Z', cbcr_filed_at: null, form_3ceb_filed_at: null, form_3ceb_deadline: '2026-10-31', ca_name: 'CA Sunita Iyer', ca_membership_no: '108754', notes: 'AE-001 parent USA · TNMM primary · Form 3CEB filing window open', created_at: '2026-04-01T00:00:00.000Z', updated_at: '2026-05-10T00:00:00.000Z' },
];

export function loadTPDocs(entityCode: string): TPDocumentation[] {
  try {
    const raw = localStorage.getItem(tpDocumentationKey(entityCode));
    if (!raw) { localStorage.setItem(tpDocumentationKey(entityCode), JSON.stringify(SEED_TP_DOCS)); return SEED_TP_DOCS; }
    return JSON.parse(raw) as TPDocumentation[];
  } catch { return SEED_TP_DOCS; }
}

export function saveTPDocs(entityCode: string, list: TPDocumentation[]): void {
  localStorage.setItem(tpDocumentationKey(entityCode), JSON.stringify(list));
}

export function recommendALPMethod(transactionType: 'distribution' | 'manufacturing' | 'services' | 'intangibles' | 'integrated'): ALPMethod {
  if (transactionType === 'distribution') return 'RPM';
  if (transactionType === 'manufacturing') return 'CPM';
  if (transactionType === 'services' || transactionType === 'integrated') return 'TNMM';
  if (transactionType === 'intangibles') return 'PSM';
  return 'TNMM';
}

export function isAboveThreshold(totalInternationalTransactionsInr: number): boolean {
  return totalInternationalTransactionsInr >= TP_THRESHOLD_INR;
}

export function getDaysUntilForm3CEBDeadline(fy: string): number {
  const endYear = parseInt(fy.split('-')[1], 10) + 2000;
  const deadline = new Date(endYear, 9, 31).getTime();
  return Math.ceil((deadline - Date.now()) / (1000 * 60 * 60 * 24));
}
