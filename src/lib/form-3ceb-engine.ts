/**
 * @file        src/lib/form-3ceb-engine.ts
 * @purpose     D-NEW-FE · 8th SIBLING application · Form 3CEB automated generation
 * @sprint      T-Phase-2.B-2-EximX-MediumDNEWs · Block C
 * @decisions   Q-LOCK-5(a) · 8th SIBLING · tp-benchmarking + form-15ca-15cb + import-po + export-po STAY 0-DIFF
 * @disciplines FR-30 · FR-50 · returns NEW Form3CEBSnapshot via spread · zero mutation
 */
import type { TPDocumentation, AssociatedEnterprise, ALPMethod } from '@/types/transfer-pricing';
import type { Form15CASubmission } from '@/types/form-15ca-15cb';
import { loadTPDocs, isAboveThreshold } from '@/lib/tp-benchmarking-engine';
import { loadForm15CAs } from '@/lib/form-15ca-15cb-engine';
import {
  type Form3CEBSnapshot,
  type RelatedPartyTransaction,
  type ALPMethodCode,
  form3CEBSnapshotKey,
  FORM_3CEB_THRESHOLD_INR,
  FORM_3CEB_FILING_MONTH_DAY,
} from '@/types/form-3ceb';

function mapALPMethod(method: ALPMethod | undefined): ALPMethodCode {
  if (!method) return 'OTHER';
  const m = String(method).toUpperCase();
  if (m === 'CUP' || m === 'RPM' || m === 'CPM' || m === 'PSM' || m === 'TNMM') return m;
  return 'OTHER';
}

function mapRelationship(rel: AssociatedEnterprise['relationship_type']): RelatedPartyTransaction['party_relationship'] {
  if (rel === 'parent') return 'parent';
  if (rel === 'subsidiary') return 'subsidiary';
  if (rel === 'sister' || rel === 'common_control') return 'associate';
  return 'other_related';
}

function buildTransactionsFromTPDoc(td: TPDocumentation): RelatedPartyTransaction[] {
  const aes = td.associated_enterprises ?? [];
  if (aes.length === 0) {
    return [{
      transaction_id: td.id,
      party_name: td.doc_ref,
      party_country: 'Unknown',
      party_relationship: 'other_related',
      transaction_type: 'goods_import',
      total_value_inr: td.total_international_transactions_inr,
      alp_method_used: mapALPMethod(td.alp_method_primary),
      is_at_arms_length: td.is_above_threshold,
      related_po_ids: [],
    }];
  }
  const perAeValue = Math.round(td.total_international_transactions_inr / aes.length);
  return aes.map((ae) => ({
    transaction_id: `${td.id}-${ae.id}`,
    party_name: ae.ae_name,
    party_country: ae.ae_country_code,
    party_relationship: mapRelationship(ae.relationship_type),
    transaction_type: 'goods_import',
    total_value_inr: perAeValue,
    alp_method_used: mapALPMethod(td.alp_method_primary),
    is_at_arms_length: true,
    related_po_ids: [],
  }));
}

function buildTransactionFromForm15CA(f15: Form15CASubmission): RelatedPartyTransaction {
  return {
    transaction_id: f15.id,
    party_name: f15.ca_name || f15.form_15ca_ref,
    party_country: f15.dtaa_country_code ?? 'Unknown',
    party_relationship: 'other_related',
    transaction_type: 'tt_payment_15ca',
    total_value_inr: f15.amount_inr,
    alp_method_used: 'OTHER',
    is_at_arms_length: true,
    related_po_ids: f15.related_import_po_id ? [f15.related_import_po_id] : [],
  };
}

function computeFilingDueDate(financialYear: string): string {
  const match = /FY(\d{4})-(\d{2})/.exec(financialYear);
  if (!match) return '';
  const endYearShort = match[2];
  const fullEndYear = `20${endYearShort}`;
  return `${fullEndYear}-${FORM_3CEB_FILING_MONTH_DAY}`;
}

export function buildForm3CEBSnapshot(
  entityCode: string,
  financialYear: string,
): Form3CEBSnapshot {
  const tpDocs = loadTPDocs(entityCode);
  const form15CAs = loadForm15CAs(entityCode).filter(
    (f) => f.status === 'ca_certified' || f.status === 'filed_with_efiling' || f.status === 'acknowledged',
  );

  const transactions: RelatedPartyTransaction[] = [
    ...tpDocs.flatMap((td) => buildTransactionsFromTPDoc(td)),
    ...form15CAs.map((f) => buildTransactionFromForm15CA(f)),
  ];

  const totalValue = transactions.reduce((s, t) => s + t.total_value_inr, 0);
  const aboveThreshold = isAboveThreshold(totalValue);
  const filingDueDate = computeFilingDueDate(financialYear);

  return {
    id: `form3ceb-${entityCode}-${financialYear}`,
    snapshot_no: `3CEB-${entityCode.toUpperCase()}-${financialYear}`,
    entity_id: entityCode,
    financial_year: financialYear,
    status: 'draft',
    total_international_transactions_inr: totalValue,
    threshold_inr: FORM_3CEB_THRESHOLD_INR,
    is_above_threshold: aboveThreshold,
    filing_due_date: filingDueDate,
    ca_membership_no: null,
    ca_signed_at: null,
    ca_digital_signature_hash: null,
    dgit_acknowledgment_no: null,
    filed_at: null,
    related_party_transactions: transactions,
    total_related_parties: new Set(transactions.map((t) => t.party_name)).size,
    notes: aboveThreshold
      ? 'Above ₹1 crore threshold · Form 3CEB filing mandatory under Section 92E'
      : 'Below threshold · Form 3CEB filing not required this FY',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

export function loadForm3CEBSnapshots(entityCode: string): Form3CEBSnapshot[] {
  try {
    const raw = localStorage.getItem(form3CEBSnapshotKey(entityCode));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as Form3CEBSnapshot[]) : [];
  } catch {
    return [];
  }
}

export function saveForm3CEBSnapshot(entityCode: string, snapshot: Form3CEBSnapshot): void {
  const existing = loadForm3CEBSnapshots(entityCode);
  const idx = existing.findIndex((s) => s.id === snapshot.id);
  if (idx >= 0 && existing[idx].status !== 'draft') return;
  const next = idx >= 0 ? existing.map((s, i) => (i === idx ? snapshot : s)) : [...existing, snapshot];
  localStorage.setItem(form3CEBSnapshotKey(entityCode), JSON.stringify(next));
}

export function summarizeForm3CEB(snapshot: Form3CEBSnapshot): {
  parties: number;
  transactions: number;
  total_value_inr: number;
  filing_required: boolean;
  days_until_due: number;
} {
  const dueDate = snapshot.filing_due_date ? new Date(snapshot.filing_due_date) : null;
  const daysUntil = dueDate
    ? Math.floor((dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : -1;
  return {
    parties: snapshot.total_related_parties,
    transactions: snapshot.related_party_transactions.length,
    total_value_inr: snapshot.total_international_transactions_inr,
    filing_required: snapshot.is_above_threshold,
    days_until_due: daysUntil,
  };
}
