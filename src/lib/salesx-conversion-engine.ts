/**
 * @file     salesx-conversion-engine.ts
 * @purpose  Pure helpers for forward-flow conversions in the SalesX revenue chain:
 *           Enquiry → Quotation (NEW · this sprint · push-side from EnquiryCapture)
 *           Quotation → Proforma (EXISTING · documented at QuotationEntry handleConvertToProforma)
 *           Quotation → Sales Order (EXISTING · documented at QuotationEntry handleConvertToSO)
 * @sprint   T-Phase-1.1.1a · Forward-Flow Conversion (D-185 gap closure)
 * @iso      Maintainability (HIGH+ · pure mapping · single source of truth)
 *           Auditability  (HIGH+ · every conversion logs an activity event)
 *           Compatibility (HIGH+ · backward-compatible · no schema migration)
 * @whom     EnquiryCapture.tsx (push-side button) · useEnquiries.ts (state mutation)
 * @depends  enquiry · quotation types · auth-helpers (read-only) · NO direct localStorage I/O
 *
 * D-194 PHASE 1/2 BOUNDARY (locked April 27, 2026):
 *   All localStorage reads/writes happen in the consuming hook (useEnquiries).
 *   This engine is pure mapping + validation + a single [JWT] activity-log stub.
 *   Phase 2 will add real REST calls in the hook layer · this engine stays unchanged.
 *
 * D-127/D-128 PRESERVATION (43-sprint zero-touch streak):
 *   This engine NEVER touches voucher .tsx forms · voucher.ts · or voucher-type.ts.
 *   Sales-Order creation goes through the existing useOrders.createOrder pathway
 *   (base_voucher_type='Sales Order') from QuotationEntry.tsx · unchanged.
 *
 * D-190 ANTI-DUPLICATION:
 *   This is a NEW engine · does NOT replace useEnquiries · useQuotations · useOrders.
 *   It composes them. No existing engine is modified.
 */

import type { Enquiry, EnquiryItem } from '@/types/enquiry';
import type { Quotation, QuotationItem, QuotationStage } from '@/types/quotation';

// ─────────────────────────────────────────────────────────────────
// Type · used to seed createQuotation() from an Enquiry
// ─────────────────────────────────────────────────────────────────
export type QuotationDraftFromEnquiry = Omit<
  Quotation,
  'id' | 'quotation_no' | 'entity_id' | 'created_at' | 'updated_at'
>;

// ─────────────────────────────────────────────────────────────────
// Mapper · Enquiry → Quotation draft
// Pure · idempotent · zero side effects · safe to call repeatedly
// ─────────────────────────────────────────────────────────────────
export function mapEnquiryToQuotationDraft(
  enquiry: Enquiry,
  validityDays = 30,
): QuotationDraftFromEnquiry {
  const items: QuotationItem[] = enquiry.items.map((it: EnquiryItem, idx) => {
    const qty = it.quantity ?? 0;
    const rate = it.rate ?? 0;
    const sub = it.amount ?? qty * rate;
    return {
      id: `qit-${Date.now()}-${idx}`,
      item_name: it.product_name,
      description: null,
      qty,
      uom: it.unit ?? null,
      rate,
      discount_pct: 0,
      sub_total: sub,
      tax_pct: 0,
      tax_amount: 0,
      amount: sub,
    };
  });

  const sub_total = items.reduce((s, i) => s + i.sub_total, 0);

  return {
    quotation_date: new Date().toISOString().slice(0, 10),
    quotation_type: 'original',
    quotation_stage: 'draft' as QuotationStage,
    enquiry_id: enquiry.id,
    enquiry_no: enquiry.enquiry_no,
    customer_id: enquiry.customer_id,
    customer_name: enquiry.customer_name,
    valid_until_days: validityDays,
    valid_until_date: addDaysISO(new Date(), validityDays),
    original_quotation_no: null,
    last_quotation_no: null,
    last_quotation_date: null,
    revision_number: 0,
    revision_history: [],
    items,
    sub_total,
    tax_amount: 0,
    total_amount: sub_total,
    notes:
      enquiry.items.length === 0
        ? 'No items in enquiry — add items before sending'
        : null,
    terms_conditions: null,
    proforma_no: null,
    proforma_date: null,
    proforma_converted_at: null,
    is_active: true,
    // ProjX hookpoint stub (D-171 dual-phase) · Phase 1.1.2 wires real
    project_id: null,
  };
}

// ─────────────────────────────────────────────────────────────────
// Validator · Enquiry conversion eligibility
// ─────────────────────────────────────────────────────────────────
export type ConversionEligibility = { ok: true } | { ok: false; reason: string };

export function canConvertEnquiryToQuotation(enquiry: Enquiry): ConversionEligibility {
  if (!enquiry.is_active) return { ok: false, reason: 'Enquiry is inactive' };
  if (enquiry.status === 'lost' || enquiry.status === 'sold') {
    return { ok: false, reason: `Enquiry is in '${enquiry.status}' state` };
  }
  if (!enquiry.customer_id && !enquiry.customer_name && !enquiry.contact_person) {
    return { ok: false, reason: 'Enquiry has no customer/prospect linked' };
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────
// Audit logger · per conversion event
// Phase 1: in-memory localStorage stub.  Phase 2: replace with real audit API.
// ─────────────────────────────────────────────────────────────────
export type ConversionType =
  | 'enquiry_to_quotation'
  | 'quotation_to_proforma'
  | 'quotation_to_sales_order';

export interface ConversionActivityEntry {
  id: string;
  entity_code: string;
  user_id: string;
  card_id: 'salesx';
  conversion_type: ConversionType;
  from_id: string;
  from_no: string;
  to_id: string;
  to_no: string;
  title: string;
  deep_link: string;
  created_at: string;
}

export const conversionActivityKey = (entityCode: string): string =>
  `erp_salesx_conversion_log_${entityCode}`;

export function logConversionEvent(
  entityCode: string,
  userId: string,
  conversionType: ConversionType,
  fromId: string,
  fromNo: string,
  toId: string,
  toNo: string,
): void {
  const now = new Date().toISOString();
  const entry: ConversionActivityEntry = {
    id: `conv-${Date.now()}`,
    entity_code: entityCode,
    user_id: userId,
    card_id: 'salesx',
    conversion_type: conversionType,
    from_id: fromId,
    from_no: fromNo,
    to_id: toId,
    to_no: toNo,
    title: `${conversionType.replace(/_/g, ' ')} · ${fromNo} → ${toNo}`,
    deep_link: `/erp/salesx/transactions?ref=${toId}`,
    created_at: now,
  };
  try {
    // [JWT] GET /api/salesx/activity?entityCode={entityCode}&card=salesx
    const raw = localStorage.getItem(conversionActivityKey(entityCode));
    const list: ConversionActivityEntry[] = raw ? JSON.parse(raw) : [];
    // [JWT] POST /api/salesx/activity
    localStorage.setItem(
      conversionActivityKey(entityCode),
      JSON.stringify([...list, entry].slice(-200)), // keep last 200
    );
  } catch {
    // best-effort logging · never block the user-visible conversion
  }
}

// ─────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────
function addDaysISO(d: Date, days: number): string {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}
