/**
 * @file     bill-settlement-engine.ts
 * @purpose  Post-hoc allocation of On-Account Payment vouchers to open Purchase
 *           Invoices. Updates Payment voucher's bill_references · writes
 *           AdvanceAdjustment · updates AdvanceEntry balance + status · writes
 *           audit trail entry.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-T8.3-AdvanceIntel · Group B Sprint B.3
 * @phase    Phase 1 · localStorage · Phase 2 swap to backend with same contract.
 *
 * IMPORTANT: This is the ONLY mutator of advance-settlement state.
 * - applyAdvanceToInvoice is idempotent · re-call with same advance+invoice
 *   no-ops with a clear message
 * - bill_references[].type flips 'advance' → 'against_ref' on full match
 *   OR a new against_ref entry is appended on partial match
 * - AdvanceEntry.adjustments[] gets new entry · balance_amount decreases ·
 *   status updates to 'partial' or 'adjusted'
 * - Audit trail entry written (best-effort) to erp_audit_log_{entity}
 *
 * [DEFERRED · Support & Back Office] settlement approval workflow ·
 *   maker-checker for high-value settlements · email/SMS/WhatsApp
 *   notifications. See: /Future_Task_Register_Support_BackOffice.md ·
 *   Capability 1
 */
import type { AdvanceEntry, AdvanceAdjustment } from '@/types/compliance';
import { advancesKey } from '@/types/compliance';
import type { Voucher } from '@/types/voucher';
import { vouchersKey } from '@/lib/finecore-engine';
import { getCurrentUserId } from '@/lib/auth-helpers';

// ── Storage helpers ──────────────────────────────────────────────

function loadAdvances(entityCode: string): AdvanceEntry[] {
  try {
    // [JWT] GET /api/compliance/advances/:entity
    const raw = localStorage.getItem(advancesKey(entityCode));
    return raw ? (JSON.parse(raw) as AdvanceEntry[]) : [];
  } catch { return []; }
}

function saveAdvances(entityCode: string, advances: AdvanceEntry[]): void {
  // [JWT] PUT /api/compliance/advances/:entity
  localStorage.setItem(advancesKey(entityCode), JSON.stringify(advances));
}

function loadVouchers(entityCode: string): Voucher[] {
  try {
    // [JWT] GET /api/accounting/vouchers/:entity
    const raw = localStorage.getItem(vouchersKey(entityCode));
    return raw ? (JSON.parse(raw) as Voucher[]) : [];
  } catch { return []; }
}

function saveVouchers(entityCode: string, vouchers: Voucher[]): void {
  // [JWT] PUT /api/accounting/vouchers/:entity
  localStorage.setItem(vouchersKey(entityCode), JSON.stringify(vouchers));
}

// ── Public API: Apply Advance ────────────────────────────────────

export interface ApplyAdvanceInput {
  entityCode: string;
  advanceId: string;
  invoiceId: string;
  amountToApply: number;
  notes?: string;
}

export interface ApplyAdvanceResult {
  ok: boolean;
  errors?: string[];
  newBalance?: number;
  newStatus?: 'open' | 'partial' | 'adjusted' | 'cancelled';
  noOp?: boolean;
}

/**
 * Apply advance balance to invoice · idempotent · audit-trail-creating.
 *  1) AdvanceEntry.adjustments + balance + status updated
 *  2) Source Payment voucher's bill_references updated (advance→against_ref
 *     on full match, new against_ref entry on partial)
 *  3) Audit log entry written (best-effort)
 */
export function applyAdvanceToInvoice(input: ApplyAdvanceInput): ApplyAdvanceResult {
  const advances = loadAdvances(input.entityCode);
  const vouchers = loadVouchers(input.entityCode);

  const adv = advances.find(a => a.id === input.advanceId);
  if (!adv) return { ok: false, errors: ['Advance not found'] };
  if (adv.balance_amount <= 0) return { ok: false, errors: ['Advance has no balance to apply'] };
  if (input.amountToApply <= 0) return { ok: false, errors: ['Amount to apply must be > 0'] };
  if (input.amountToApply > adv.balance_amount) {
    return { ok: false, errors: [`Amount ${input.amountToApply} exceeds available balance ${adv.balance_amount}`] };
  }

  const invoice = vouchers.find(v => v.id === input.invoiceId);
  if (!invoice) return { ok: false, errors: ['Invoice not found'] };

  // Idempotency: if advance already has an adjustment for this invoice with
  // the same amount, no-op (don't double-apply).
  const existingAdj = adv.adjustments.find(a => a.invoice_id === input.invoiceId);
  if (existingAdj && existingAdj.amount_adjusted === input.amountToApply) {
    return {
      ok: true,
      noOp: true,
      newBalance: adv.balance_amount,
      newStatus: adv.status,
    };
  }

  // 1. Update AdvanceEntry
  const newAdjustment: AdvanceAdjustment = {
    invoice_id: invoice.id,
    invoice_no: invoice.voucher_no,
    amount_adjusted: input.amountToApply,
    tds_adjusted: 0, // B.3 simplicity · TDS already deducted at advance creation
    date: new Date().toISOString().slice(0, 10),
  };
  adv.adjustments.push(newAdjustment);
  adv.balance_amount = Math.max(0, adv.balance_amount - input.amountToApply);
  adv.status = adv.balance_amount === 0 ? 'adjusted' : 'partial';
  adv.updated_at = new Date().toISOString();

  // 2. Update source Payment voucher's bill_references
  const sourceVoucher = vouchers.find(v => v.id === adv.source_voucher_id);
  if (sourceVoucher) {
    if (!sourceVoucher.bill_references) sourceVoucher.bill_references = [];

    const existing = sourceVoucher.bill_references.find(b => b.type === 'advance');
    if (existing && existing.amount === input.amountToApply) {
      // Full settlement of this advance line · flip the type
      existing.type = 'against_ref';
      existing.voucher_id = invoice.id;
      existing.voucher_no = invoice.voucher_no;
      existing.voucher_date = invoice.date;
    } else {
      // Partial settlement · append a new against_ref entry
      sourceVoucher.bill_references.push({
        voucher_id: invoice.id,
        voucher_no: invoice.voucher_no,
        voucher_date: invoice.date,
        amount: input.amountToApply,
        type: 'against_ref',
      });
    }
  }

  // 3. Persist
  saveAdvances(input.entityCode, advances);
  saveVouchers(input.entityCode, vouchers);

  // 4. Audit trail (best-effort · don't fail settlement if audit log breaks)
  try {
    const auditKey = `erp_audit_log_${input.entityCode}`;
    const auditLog: Array<Record<string, unknown>> = JSON.parse(
      localStorage.getItem(auditKey) ?? '[]',
    );
    auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'BILL_SETTLEMENT',
      entity_code: input.entityCode,
      advance_id: input.advanceId,
      invoice_id: input.invoiceId,
      amount: input.amountToApply,
      notes: input.notes ?? '',
      user_id: getCurrentUserId(),
      timestamp: new Date().toISOString(),
    });
    // [JWT] POST /api/audit/log
    localStorage.setItem(auditKey, JSON.stringify(auditLog));
  } catch { /* best-effort */ }

  return { ok: true, newBalance: adv.balance_amount, newStatus: adv.status };
}

// ── Public API: History + Reverse ────────────────────────────────

/**
 * Returns settlement history (adjustments) · either for one advance or
 * across all advances for the entity.
 */
export function getSettlementHistory(
  entityCode: string,
  advanceId?: string,
): AdvanceAdjustment[] {
  const advances = loadAdvances(entityCode);
  if (advanceId) {
    return advances.find(a => a.id === advanceId)?.adjustments ?? [];
  }
  return advances.flatMap(a => a.adjustments);
}

export interface ReverseSettlementResult {
  ok: boolean;
  errors?: string[];
}

/**
 * Reverses a previously-applied settlement · restores balance · removes
 * adjustment · updates status · writes audit reverse entry.
 * NOTE: Does not flip back the Payment voucher's bill_references[] entry
 *       (would require tracking the reverse mapping · deferred to B.7).
 */
export function reverseSettlement(
  entityCode: string,
  advanceId: string,
  invoiceId: string,
  reason: string,
): ReverseSettlementResult {
  const advances = loadAdvances(entityCode);
  const adv = advances.find(a => a.id === advanceId);
  if (!adv) return { ok: false, errors: ['Advance not found'] };

  const adjIdx = adv.adjustments.findIndex(a => a.invoice_id === invoiceId);
  if (adjIdx < 0) return { ok: false, errors: ['Settlement not found'] };

  const adj = adv.adjustments[adjIdx];
  adv.balance_amount += adj.amount_adjusted;
  adv.adjustments.splice(adjIdx, 1);
  adv.status = adv.adjustments.length === 0 ? 'open' : 'partial';
  adv.updated_at = new Date().toISOString();
  saveAdvances(entityCode, advances);

  try {
    const auditKey = `erp_audit_log_${entityCode}`;
    const auditLog: Array<Record<string, unknown>> = JSON.parse(
      localStorage.getItem(auditKey) ?? '[]',
    );
    auditLog.push({
      id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'BILL_SETTLEMENT_REVERSE',
      entity_code: entityCode,
      advance_id: advanceId,
      invoice_id: invoiceId,
      reason,
      user_id: getCurrentUserId(),
      timestamp: new Date().toISOString(),
    });
    // [JWT] POST /api/audit/log
    localStorage.setItem(auditKey, JSON.stringify(auditLog));
  } catch { /* best-effort */ }

  return { ok: true };
}
