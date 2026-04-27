/**
 * @file     bulk-pay-engine.ts
 * @purpose  Bulk Payment Batch orchestrator · Maker-Checker state machine ·
 *           executes batches by looping existing payment-engine.processVendorPayment.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.7-SmartAP (Group B Sprint B.7)
 * @sprint   T-T8.7-SmartAP
 * @phase    Phase 1 · localStorage · same engine API for Phase 2 backend swap.
 * @whom     SmartAPHub · BulkPayBuilder · smartap-N smoke checks
 * @depends  payment-engine (B.2 · processVendorPayment called in loop · DO NOT MODIFY) ·
 *           payment-requisition (B.4 · READ approved reqs · DO NOT MODIFY) ·
 *           payment-requisition-engine (B.4 · markAsPaid via direct read · DO NOT MODIFY) ·
 *           auth-helpers (getCurrentUser).
 *
 * IMPORTANT — This is a thin orchestrator · executeBatch CALLS existing
 *   payment-engine.processVendorPayment in a LOOP · NO duplicate voucher creation.
 *
 * Maker-Checker is SOFT separation-of-duties via field check
 *   `maker_user_id !== checker_user_id` (throws if same).
 *
 * [DEFERRED · Support & Back Office] Hard RBAC enforcement (currently soft separation
 *   via maker_user_id !== checker_user_id field check) · email/SMS/WhatsApp batch
 *   notifications · scheduled batch executions · delegation/escalation.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capabilities 1, 2, 3
 */

import type {
  BulkPaymentBatch, BulkBatchStatus, BatchApprovalEntry,
  BatchExecutionResult, BankCode, BankFileFormat,
} from '@/types/smart-ap';
import { smartApBatchesKey } from '@/types/smart-ap';
import type { PaymentRequisition } from '@/types/payment-requisition';
import { paymentRequisitionsKey } from '@/types/payment-requisition';
import { processVendorPayment } from '@/lib/payment-engine';
import { getCurrentUser } from '@/lib/auth-helpers';

// ── Storage helpers (single key per entity · per I-49) ─────────────────

function readAll(entityCode: string): BulkPaymentBatch[] {
  // [JWT] GET /api/smart-ap/batches?entity={entityCode}
  try {
    const raw = localStorage.getItem(smartApBatchesKey(entityCode));
    return raw ? (JSON.parse(raw) as BulkPaymentBatch[]) : [];
  } catch { return []; }
}

function writeAll(entityCode: string, items: BulkPaymentBatch[]): void {
  // [JWT] PUT /api/smart-ap/batches/bulk
  localStorage.setItem(smartApBatchesKey(entityCode), JSON.stringify(items));
}

function readReqs(entityCode: string): PaymentRequisition[] {
  // [JWT] GET /api/payment-requisitions?entity={entityCode}
  try {
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch { return []; }
}

function writeReqs(entityCode: string, items: PaymentRequisition[]): void {
  // [JWT] PUT /api/payment-requisitions/bulk
  localStorage.setItem(paymentRequisitionsKey(entityCode), JSON.stringify(items));
}

function nowIso(): string { return new Date().toISOString(); }
function newBatchId(): string {
  return `bpb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
function newBatchNo(entityCode: string, count: number): string {
  const yy = new Date().getFullYear().toString().slice(-2);
  return `BPB/${entityCode}/${yy}/${String(count + 1).padStart(4, '0')}`;
}

function persist(entityCode: string, batch: BulkPaymentBatch): void {
  const all = readAll(entityCode);
  const idx = all.findIndex(b => b.id === batch.id);
  batch.updated_at = nowIso();
  if (idx === -1) all.push(batch);
  else all[idx] = batch;
  writeAll(entityCode, all);
}

// ── State machine ──────────────────────────────────────────────────────

const ALLOWED_TRANSITIONS: Record<BulkBatchStatus, BulkBatchStatus[]> = {
  draft:                    ['maker_signed', 'rejected_at_maker'],
  maker_signed:             ['checker_approved', 'rejected_at_checker'],
  checker_approved:         ['executed', 'failed_during_execution'],
  executed:                 [],
  failed_during_execution:  [],
  rejected_at_maker:        [],
  rejected_at_checker:      [],
};

function assertTransition(from: BulkBatchStatus, to: BulkBatchStatus): void {
  if (!ALLOWED_TRANSITIONS[from].includes(to)) {
    throw new Error(`[bulk-pay-engine] Invalid transition: ${from} → ${to}`);
  }
}

function appendEntry(
  batch: BulkPaymentBatch,
  level: BatchApprovalEntry['level'],
  action: BatchApprovalEntry['action'],
  comment: string,
  userId?: string,
  userName?: string,
): void {
  const u = getCurrentUser();
  batch.approval_chain.push({
    level,
    user_id: userId ?? u.id,
    user_name: userName ?? u.displayName,
    action,
    comment,
    timestamp: nowIso(),
  });
}

// ── Reads ──────────────────────────────────────────────────────────────

export function listBatches(entityCode: string): BulkPaymentBatch[] {
  return readAll(entityCode).sort((a, b) =>
    (b.created_at || '').localeCompare(a.created_at || ''));
}

export function getBatch(entityCode: string, batchId: string): BulkPaymentBatch | null {
  return readAll(entityCode).find(b => b.id === batchId) ?? null;
}

/** Approved PaymentRequisitions available to be queued into a new batch. */
export function getApprovedRequisitions(entityCode: string): PaymentRequisition[] {
  return readReqs(entityCode).filter(r => r.status === 'approved');
}

// ── Writes (state machine) ─────────────────────────────────────────────

export interface CreateBulkBatchInput {
  entityCode: string;
  requisitionIds: string[];
  source_bank_ledger_id?: string;
  source_bank_ledger_name?: string;
  target_bank_code?: BankCode;
  file_format?: BankFileFormat;
  notes?: string;
}

/** Create a draft batch from an array of approved requisition IDs. */
export function createBulkBatch(input: CreateBulkBatchInput): BulkPaymentBatch {
  const reqs = readReqs(input.entityCode);
  const reqMap = new Map(reqs.map(r => [r.id, r] as const));

  const errors: string[] = [];
  const validReqs: PaymentRequisition[] = [];
  for (const id of input.requisitionIds) {
    const r = reqMap.get(id);
    if (!r) { errors.push(`Requisition ${id} not found`); continue; }
    if (r.status !== 'approved') {
      errors.push(`Requisition ${r.id} status is ${r.status} · only 'approved' allowed`);
      continue;
    }
    validReqs.push(r);
  }
  if (errors.length) {
    throw new Error(`[bulk-pay-engine] createBulkBatch validation failed: ${errors.join(' · ')}`);
  }
  if (validReqs.length === 0) {
    throw new Error('[bulk-pay-engine] At least one approved requisition required');
  }

  const all = readAll(input.entityCode);
  const totalAmount = validReqs.reduce((s, r) => s + r.amount, 0);
  const u = getCurrentUser();

  const batch: BulkPaymentBatch = {
    id: newBatchId(),
    entity_id: input.entityCode,
    batch_no: newBatchNo(input.entityCode, all.length),
    created_by: u.id,
    created_by_name: u.displayName,
    requisition_ids: validReqs.map(r => r.id),
    total_amount: totalAmount,
    count: validReqs.length,
    status: 'draft',
    approval_chain: [],
    individual_results: [],
    target_bank_code: input.target_bank_code,
    file_format: input.file_format,
    source_bank_ledger_id: input.source_bank_ledger_id,
    source_bank_ledger_name: input.source_bank_ledger_name,
    notes: input.notes,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  appendEntry(batch, 'system', 'create',
    `Batch created with ${validReqs.length} requisitions · ₹${totalAmount.toLocaleString('en-IN')}`);
  persist(input.entityCode, batch);
  return batch;
}

/** Maker signs the batch · transitions draft → maker_signed. */
export function signByMaker(
  entityCode: string, batchId: string, comment: string,
): BulkPaymentBatch {
  const batch = getBatch(entityCode, batchId);
  if (!batch) throw new Error(`[bulk-pay-engine] Batch ${batchId} not found`);
  assertTransition(batch.status, 'maker_signed');
  const u = getCurrentUser();
  batch.maker_user_id = u.id;
  batch.maker_user_name = u.displayName;
  batch.maker_signed_at = nowIso();
  batch.status = 'maker_signed';
  appendEntry(batch, 'maker', 'maker_sign', comment || 'Signed by maker');
  persist(entityCode, batch);
  return batch;
}

/** Checker approves the batch · transitions maker_signed → checker_approved.
 *  CRITICAL INVARIANT: throws if checker is the same user as the maker
 *  (soft separation-of-duties · DEFERRED to S&BO for hard RBAC). */
export function approveByChecker(
  entityCode: string, batchId: string, comment: string,
): BulkPaymentBatch {
  const batch = getBatch(entityCode, batchId);
  if (!batch) throw new Error(`[bulk-pay-engine] Batch ${batchId} not found`);
  assertTransition(batch.status, 'checker_approved');
  const u = getCurrentUser();
  // Maker-Checker separation enforcement · maker_user_id !== checker (this user)
  if (batch.maker_user_id && batch.maker_user_id === u.id) {
    throw new Error(
      '[bulk-pay-engine] Separation-of-duties violation: maker_user_id !== checker_user_id required',
    );
  }
  batch.checker_user_id = u.id;
  batch.checker_user_name = u.displayName;
  batch.checker_approved_at = nowIso();
  batch.status = 'checker_approved';
  appendEntry(batch, 'checker', 'checker_approve', comment || 'Approved by checker');
  persist(entityCode, batch);
  return batch;
}

/** Reject batch · level=maker rejects from draft, level=checker from maker_signed. */
export function rejectBatch(
  entityCode: string,
  batchId: string,
  level: 'maker' | 'checker',
  reason: string,
): BulkPaymentBatch {
  const batch = getBatch(entityCode, batchId);
  if (!batch) throw new Error(`[bulk-pay-engine] Batch ${batchId} not found`);
  const target: BulkBatchStatus = level === 'maker' ? 'rejected_at_maker' : 'rejected_at_checker';
  assertTransition(batch.status, target);
  batch.status = target;
  appendEntry(batch, level, 'reject', reason || 'Rejected');
  persist(entityCode, batch);
  return batch;
}

/** Execute the batch · loop over requisition_ids · call existing payment-engine
 *  processVendorPayment per requisition · capture per-row result · transition
 *  to 'executed' (all ok) or 'failed_during_execution' (any failures).
 *  Marks individual PaymentRequisitions as 'paid' on success. */
export function executeBatch(
  entityCode: string,
  batchId: string,
  paymentDate?: string,
): BulkPaymentBatch {
  const batch = getBatch(entityCode, batchId);
  if (!batch) throw new Error(`[bulk-pay-engine] Batch ${batchId} not found`);
  if (batch.status !== 'checker_approved') {
    throw new Error(
      `[bulk-pay-engine] executeBatch requires status 'checker_approved' · current=${batch.status}`,
    );
  }

  const reqs = readReqs(entityCode);
  const reqMap = new Map(reqs.map(r => [r.id, r] as const));
  const date = paymentDate ?? new Date().toISOString().slice(0, 10);
  const results: BatchExecutionResult[] = [];
  let anyFailure = false;

  for (const reqId of batch.requisition_ids) {
    const req = reqMap.get(reqId);
    if (!req) {
      results.push({ requisition_id: reqId, ok: false, error: 'Requisition not found' });
      anyFailure = true;
      continue;
    }
    try {
      // Loop call to EXISTING B.2 payment-engine.processVendorPayment · NO duplicate logic.
      const result = processVendorPayment({
        entityCode,
        vendorId: req.vendor_id ?? req.requested_by,
        vendorName: req.vendor_name ?? req.requested_by_name,
        bankCashLedgerId: batch.source_bank_ledger_id ?? '',
        bankCashLedgerName: batch.source_bank_ledger_name ?? 'Bank',
        amount: req.amount,
        date,
        paymentMode: 'bank',
        instrumentType: (batch.file_format === 'IMPS') ? 'IMPS'
          : (batch.file_format === 'RTGS') ? 'RTGS' : 'NEFT',
        instrumentRef: `${batch.batch_no}/${reqId.slice(-6)}`,
        narration: `Bulk payment · ${batch.batch_no} · ${req.purpose.slice(0, 80)}`,
        billReferences: req.linked_purchase_invoice_id ? [{
          voucher_id: req.linked_purchase_invoice_id,
          voucher_no: req.linked_purchase_invoice_no ?? '',
          voucher_date: date,
          amount: req.amount,
          type: 'against_ref',
        }] : [],
        applyTDS: false,                 // TDS already handled at requisition stage
        deducteeType: 'company',
        departmentId: req.department_id,
        divisionId: req.division_id,
      });
      if (result.ok) {
        results.push({
          requisition_id: reqId,
          ok: true,
          voucher_id: result.voucherId,
          voucher_no: result.voucherNo,
        });
        // Mark requisition as paid (B.4 status transition) · direct write
        // since payment-requisition-engine markAsPaid is internal · we update minimal.
        const idx = reqs.findIndex(r => r.id === reqId);
        if (idx >= 0) {
          reqs[idx] = {
            ...reqs[idx],
            status: 'paid',
            linked_payment_voucher_id: result.voucherId,
            linked_payment_voucher_no: result.voucherNo,
            updated_at: nowIso(),
            approval_chain: [
              ...reqs[idx].approval_chain,
              {
                level: 99,
                approver_id: getCurrentUser().id,
                approver_name: getCurrentUser().displayName,
                approver_role: 'system',
                action: 'paid',
                comment: `Paid via Bulk Batch ${batch.batch_no}`,
                timestamp: nowIso(),
              },
            ],
          };
        }
      } else {
        anyFailure = true;
        results.push({
          requisition_id: reqId,
          ok: false,
          error: result.errors?.join(' · ') ?? 'Unknown error',
        });
      }
    } catch (err) {
      anyFailure = true;
      results.push({
        requisition_id: reqId,
        ok: false,
        error: err instanceof Error ? err.message : 'Exception during payment',
      });
    }
  }

  writeReqs(entityCode, reqs);
  batch.individual_results = results;
  const newStatus: BulkBatchStatus = anyFailure ? 'failed_during_execution' : 'executed';
  assertTransition(batch.status, newStatus);
  batch.status = newStatus;
  appendEntry(batch, 'system', 'execute',
    `Executed · ${results.filter(r => r.ok).length}/${results.length} succeeded`);
  persist(entityCode, batch);
  return batch;
}
