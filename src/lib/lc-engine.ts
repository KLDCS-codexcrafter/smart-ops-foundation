/**
 * @file        src/lib/lc-engine.ts
 * @purpose     D-NEW-FJ · Letter of Credit lifecycle engine · 10th SIBLING + 8th D-NEW-FG consumer
 * @sprint      T-Phase-2.A-EX-12-LC-PackingCredit · Block A
 * @decisions   Q-LOCK-3(a) 10th SIBLING · Q-LOCK-6(a) 8th D-NEW-FG consumer
 *              ExportPO + ExportRealisation + TTPayment + HedgeContract STAY 0-DIFF · READ-ONLY consumers
 * @disciplines FR-30 · FR-50 · FR-26 entity-scoped · returns NEW objects via spread · zero mutation
 */
import type { LetterOfCredit, LCStatus } from '@/types/letter-of-credit';
import {
  LC_VALID_TRANSITIONS,
  STANDARD_LC_DOCUMENT_SET,
  lcKey,
} from '@/types/letter-of-credit';

const now = '2026-05-21T00:00:00.000Z';

const SEED_LCS: LetterOfCredit[] = [
  {
    id: 'lc-sinha-001',
    lc_no: 'LC-CITI-USA-2026-001',
    entity_id: 'sinha-trading',
    status: 'advised',
    lc_type: 'irrevocable_sight',
    related_export_po_id: 'expo-sinha-001',
    related_export_po_no: 'EXPO-SINHA-2026-001',
    related_foreign_customer_id: 'fc-sinha-usa-001',
    issuing_bank_swift: 'CITIUS33',
    issuing_bank_name: 'Citibank N.A. New York',
    issuing_bank_country: 'US',
    advising_bank_swift: 'SBININBB',
    advising_bank_name: 'State Bank of India',
    advising_ad_bank_code: 'SBININBB',
    confirming_bank_swift: null,
    confirming_bank_name: null,
    negotiating_bank_swift: null,
    negotiating_bank_name: null,
    currency_code: 'USD',
    lc_amount_foreign: 12000,
    lc_amount_inr_at_open: 1020000,
    tolerance_pct: 10,
    open_date: '2026-05-15',
    expiry_date: '2026-08-15',
    latest_shipment_date: '2026-07-15',
    payment_terms_days: 0,
    presentation_period_days: 21,
    required_documents: STANDARD_LC_DOCUMENT_SET,
    partial_shipment_allowed: false,
    transshipment_allowed: false,
    amendments: [],
    documents_presented_at: null,
    negotiated_at: null,
    settled_at: null,
    notes: 'USA buyer LC · sight payment · standard UCP 600 document set',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'lc-sinha-002',
    lc_no: 'LC-HDFC-UAE-2026-002',
    entity_id: 'sinha-trading',
    status: 'confirmed',
    lc_type: 'irrevocable_usance',
    related_export_po_id: 'expo-sinha-002',
    related_export_po_no: 'EXPO-SINHA-2026-002',
    related_foreign_customer_id: 'fc-sinha-uae-001',
    issuing_bank_swift: 'EBILAEAD',
    issuing_bank_name: 'Emirates NBD',
    issuing_bank_country: 'AE',
    advising_bank_swift: 'HDFCINBB',
    advising_bank_name: 'HDFC Bank',
    advising_ad_bank_code: 'HDFCINBB',
    confirming_bank_swift: 'HDFCINBB',
    confirming_bank_name: 'HDFC Bank (confirming)',
    negotiating_bank_swift: null,
    negotiating_bank_name: null,
    currency_code: 'USD',
    lc_amount_foreign: 6900,
    lc_amount_inr_at_open: 586500,
    tolerance_pct: 10,
    open_date: '2026-05-18',
    expiry_date: '2026-09-30',
    latest_shipment_date: '2026-08-31',
    payment_terms_days: 90,
    presentation_period_days: 21,
    required_documents: [...STANDARD_LC_DOCUMENT_SET, 'embassy_legalized_coo'],
    partial_shipment_allowed: true,
    transshipment_allowed: false,
    amendments: [],
    documents_presented_at: null,
    negotiated_at: null,
    settled_at: null,
    notes: 'UAE buyer · 90-day usance · CEPA preferential · embassy legalization required',
    created_at: now,
    updated_at: now,
  },
  {
    id: 'lc-sinha-003',
    lc_no: 'LC-SMBC-JP-2026-003',
    entity_id: 'sinha-trading',
    status: 'opened',
    lc_type: 'transferable',
    related_export_po_id: 'expo-sinha-003',
    related_export_po_no: 'EXPO-SINHA-2026-003',
    related_foreign_customer_id: 'fc-sinha-jp-001',
    issuing_bank_swift: 'SMBCJPJT',
    issuing_bank_name: 'Sumitomo Mitsui Banking Corp',
    issuing_bank_country: 'JP',
    advising_bank_swift: 'BARBINBB',
    advising_bank_name: 'Bank of Baroda',
    advising_ad_bank_code: 'BARBINBB',
    confirming_bank_swift: null,
    confirming_bank_name: null,
    negotiating_bank_swift: null,
    negotiating_bank_name: null,
    currency_code: 'JPY',
    lc_amount_foreign: 8500000,
    lc_amount_inr_at_open: 4845000,
    tolerance_pct: 5,
    open_date: '2026-05-20',
    expiry_date: '2026-10-15',
    latest_shipment_date: '2026-09-15',
    payment_terms_days: 60,
    presentation_period_days: 14,
    required_documents: STANDARD_LC_DOCUMENT_SET,
    partial_shipment_allowed: false,
    transshipment_allowed: true,
    amendments: [],
    documents_presented_at: null,
    negotiated_at: null,
    settled_at: null,
    notes: 'Japan buyer · 60-day usance · JPY · transferable for sub-contract export',
    created_at: now,
    updated_at: now,
  },
];

export function loadLCs(entityCode: string): LetterOfCredit[] {
  try {
    const raw = localStorage.getItem(lcKey(entityCode));
    if (!raw) {
      localStorage.setItem(lcKey(entityCode), JSON.stringify(SEED_LCS));
      return SEED_LCS;
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? (parsed as LetterOfCredit[]) : SEED_LCS;
  } catch {
    return SEED_LCS;
  }
}

export function saveLCs(entityCode: string, lcs: LetterOfCredit[]): void {
  localStorage.setItem(lcKey(entityCode), JSON.stringify(lcs));
}

export function getLC(entityCode: string, id: string): LetterOfCredit | null {
  return loadLCs(entityCode).find((lc) => lc.id === id) ?? null;
}

export function transitionLC(entityCode: string, id: string, newStatus: LCStatus): LetterOfCredit {
  const current = getLC(entityCode, id);
  if (!current) throw new Error(`LC ${id} not found`);
  const validNexts = LC_VALID_TRANSITIONS[current.status];
  if (!validNexts.includes(newStatus)) {
    throw new Error(`Invalid LC transition ${current.status} → ${newStatus}`);
  }
  const nowIso = new Date().toISOString();
  const next: LetterOfCredit = {
    ...current,
    status: newStatus,
    updated_at: nowIso,
    ...(newStatus === 'documents_presented' && { documents_presented_at: nowIso }),
    ...(newStatus === 'negotiated' && { negotiated_at: nowIso }),
    ...(newStatus === 'settled' && { settled_at: nowIso }),
  };
  const all = loadLCs(entityCode);
  saveLCs(entityCode, all.map((lc) => (lc.id === id ? next : lc)));
  return next;
}

export interface LCVoucherEntry {
  lc_id: string;
  lc_no: string;
  event_type: 'lc_open' | 'lc_negotiate' | 'lc_settle';
  voucher_routing_target: 'voucher_runtime_engine';
  debit_inr: number;
  credit_inr: number;
  ledger_account: string;
  narration: string;
  generated_at: string;
}

export function generateLCVoucherEntries(lc: LetterOfCredit): LCVoucherEntry[] {
  const entries: LCVoucherEntry[] = [];
  if (lc.status === 'opened' || lc.status === 'advised') {
    entries.push({
      lc_id: lc.id,
      lc_no: lc.lc_no,
      event_type: 'lc_open',
      voucher_routing_target: 'voucher_runtime_engine',
      debit_inr: 0,
      credit_inr: 0,
      ledger_account: 'LC_OPEN_MEMO',
      narration: `LC opened · ${lc.lc_no} · ${lc.currency_code} ${lc.lc_amount_foreign}`,
      generated_at: new Date().toISOString(),
    });
  }
  if (lc.status === 'negotiated' && lc.negotiated_at) {
    entries.push({
      lc_id: lc.id,
      lc_no: lc.lc_no,
      event_type: 'lc_negotiate',
      voucher_routing_target: 'voucher_runtime_engine',
      debit_inr: lc.lc_amount_inr_at_open,
      credit_inr: lc.lc_amount_inr_at_open,
      ledger_account: 'LC_NEGOTIATION_RECEIVABLE',
      narration: `LC negotiated · ${lc.lc_no} · debit Bank · credit Export Realisation`,
      generated_at: new Date().toISOString(),
    });
  }
  if (lc.status === 'settled' && lc.settled_at) {
    entries.push({
      lc_id: lc.id,
      lc_no: lc.lc_no,
      event_type: 'lc_settle',
      voucher_routing_target: 'voucher_runtime_engine',
      debit_inr: lc.lc_amount_inr_at_open,
      credit_inr: lc.lc_amount_inr_at_open,
      ledger_account: 'LC_SETTLEMENT',
      narration: `LC settled · ${lc.lc_no} · close LC Negotiation Receivable`,
      generated_at: new Date().toISOString(),
    });
  }
  return entries;
}

export function summarizeLCs(lcs: readonly LetterOfCredit[]): {
  total: number;
  open: number;
  documents_pending: number;
  negotiated: number;
  settled: number;
  total_outstanding_inr: number;
} {
  let open = 0;
  let docsPending = 0;
  let negotiated = 0;
  let settled = 0;
  let outstanding = 0;
  for (const lc of lcs) {
    if (['opened', 'advised', 'confirmed', 'amended'].includes(lc.status)) {
      open += 1;
      outstanding += lc.lc_amount_inr_at_open;
    }
    if (lc.status === 'documents_presented') docsPending += 1;
    if (lc.status === 'negotiated') negotiated += 1;
    if (lc.status === 'settled') settled += 1;
  }
  return {
    total: lcs.length,
    open,
    documents_pending: docsPending,
    negotiated,
    settled,
    total_outstanding_inr: outstanding,
  };
}
