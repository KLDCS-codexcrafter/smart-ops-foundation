/**
 * @file     bank-file-engine.ts
 * @purpose  PURE QUERY · 12-bank file format generators · NEFT/RTGS/IMPS file
 *           string returned for browser Blob download · validates batch vendor
 *           bank-detail completeness.
 * @who      Operix Engineering
 * @when     Apr-2026 · T-T8.7-SmartAP (Group B Sprint B.7)
 * @sprint   T-T8.7-SmartAP
 * @phase    Phase 1 · returns string for Blob download · NO HTTP. Phase 2 swap to
 *           HTTP POST with same engine API surface.
 * @whom     SmartAPHub · BulkPayBuilder
 * @depends  bank-format-specs (12 specs) · smart-ap types · payment-requisition (B.4 · READ) ·
 *           bulk-pay-engine (READ batch · NO MODIFICATION)
 *
 * Per Q-FF (a) Universal coverage · 12 Indian banks ship Phase 1.
 *
 * IMPORTANT: PURE QUERY engine · NO localStorage writes · NO HTTP/Promise · returns
 *   synchronous string for browser-side Blob download.
 *
 * [DEFERRED · Phase 2 backend] Actual bank REST API integration. Phase 1 returns
 *   FILE STRING for operator to upload to bank portal manually. Same engine API
 *   surface will be used Phase 2 with HTTP POST swapping in.
 *   See: /Future_Task_Register_Support_BackOffice.md · Capability 8
 */

import type {
  BankCode, BankFileFormat, BankFileSpec, BankFileColumnKey,
  GeneratedBankFile, BankFileValidationError, BulkPaymentBatch,
} from '@/types/smart-ap';
import { BANK_FORMAT_SPECS, BANK_SPEC_BY_CODE } from '@/data/bank-format-specs';
import { smartApBatchesKey } from '@/types/smart-ap';
import type { PaymentRequisition } from '@/types/payment-requisition';
import { paymentRequisitionsKey } from '@/types/payment-requisition';

// ── Vendor master read shape (subset · just what we need) ──────────────
interface VendorBankRow {
  id: string;
  name: string;
  bankAccountHolder?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
}

// ── Bank ledger read shape (subset of BankLedger) ──────────────────────
interface BankLedgerRow {
  id: string;
  ledgerType?: string;
  bankName?: string;
  accountNumber?: string;
  ifscCode?: string;
}

// ── Read helpers (read-only) ───────────────────────────────────────────

function loadVendors(): VendorBankRow[] {
  // [JWT] GET /api/masters/vendors
  try {
    const raw = localStorage.getItem('erp_group_vendor_master');
    return raw ? (JSON.parse(raw) as VendorBankRow[]) : [];
  } catch { return []; }
}

function loadRequisitions(entityCode: string): PaymentRequisition[] {
  // [JWT] GET /api/payment-requisitions?entity={entityCode}
  try {
    const raw = localStorage.getItem(paymentRequisitionsKey(entityCode));
    return raw ? (JSON.parse(raw) as PaymentRequisition[]) : [];
  } catch { return []; }
}

function loadBatch(entityCode: string, batchId: string): BulkPaymentBatch | null {
  // [JWT] GET /api/smart-ap/batches/:id
  try {
    const raw = localStorage.getItem(smartApBatchesKey(entityCode));
    if (!raw) return null;
    const arr = JSON.parse(raw) as BulkPaymentBatch[];
    return arr.find(b => b.id === batchId) ?? null;
  } catch { return null; }
}

function loadBankLedger(entityCode: string, ledgerId?: string): BankLedgerRow | null {
  if (!ledgerId) return null;
  try {
    const raw = localStorage.getItem(`erp_group_ledger_definitions_${entityCode}`);
    if (!raw) return null;
    const arr = JSON.parse(raw) as BankLedgerRow[];
    return arr.find(l => l.id === ledgerId) ?? null;
  } catch { return null; }
}

// ── Public API ─────────────────────────────────────────────────────────

/** Return the full list of 12 supported bank specs. */
export function listSupportedBanks(): BankFileSpec[] {
  return BANK_FORMAT_SPECS;
}

/** Get a specific bank spec or null. */
export function getBankSpec(code: BankCode): BankFileSpec | null {
  return BANK_SPEC_BY_CODE.get(code) ?? null;
}

/** Validate a batch is ready for the chosen bank · checks vendor bank fields exist.
 *  Returns array of errors · empty array means validated. */
export function validateBatchForBank(
  entityCode: string,
  batchId: string,
  bankCode: BankCode,
): BankFileValidationError[] {
  const errors: BankFileValidationError[] = [];
  const batch = loadBatch(entityCode, batchId);
  if (!batch) {
    return [{
      requisition_id: '',
      vendor_name: '',
      field: 'amount',
      message: `Batch ${batchId} not found`,
    }];
  }
  const spec = BANK_SPEC_BY_CODE.get(bankCode);
  if (!spec) {
    return [{
      requisition_id: '',
      vendor_name: '',
      field: 'amount',
      message: `Bank code ${bankCode} not supported`,
    }];
  }

  const reqs = loadRequisitions(entityCode);
  const vendors = loadVendors();
  const vendorMap = new Map(vendors.map(v => [v.id, v] as const));

  for (const reqId of batch.requisition_ids) {
    const req = reqs.find(r => r.id === reqId);
    if (!req) {
      errors.push({
        requisition_id: reqId,
        vendor_name: '(unknown)',
        field: 'amount',
        message: `Requisition ${reqId} not found`,
      });
      continue;
    }
    if (!req.amount || req.amount <= 0) {
      errors.push({
        requisition_id: reqId,
        vendor_name: req.vendor_name ?? req.requested_by_name,
        field: 'amount',
        message: 'Amount must be > 0',
      });
    }
    if (!req.vendor_id) continue;  // non-vendor requisition · skip bank checks
    const vendor = vendorMap.get(req.vendor_id);
    if (!vendor) {
      errors.push({
        requisition_id: reqId,
        vendor_name: req.vendor_name ?? '(unknown)',
        field: 'bankAccountNo',
        message: 'Vendor master row not found',
      });
      continue;
    }
    if (!vendor.bankAccountNo?.trim()) {
      errors.push({
        requisition_id: reqId,
        vendor_name: vendor.name,
        field: 'bankAccountNo',
        message: 'Missing vendor bank account number',
      });
    }
    if (!vendor.bankIfsc?.trim() || vendor.bankIfsc.length !== 11) {
      errors.push({
        requisition_id: reqId,
        vendor_name: vendor.name,
        field: 'bankIfsc',
        message: 'Missing or invalid vendor IFSC (11 chars required)',
      });
    }
    if (!vendor.bankAccountHolder?.trim()) {
      errors.push({
        requisition_id: reqId,
        vendor_name: vendor.name,
        field: 'bankAccountHolder',
        message: 'Missing vendor bank account holder name',
      });
    }
  }

  return errors;
}

// ── File generation ────────────────────────────────────────────────────

function escapeForDelimiter(value: string, delimiter: string): string {
  if (delimiter === ',' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  // For pipe/tab delimiters · just strip the delimiter from value to avoid breaking row.
  return value.replace(new RegExp(delimiter === '|' ? '\\|' : '\\t', 'g'), ' ');
}

function buildRow(
  spec: BankFileSpec,
  values: Partial<Record<BankFileColumnKey, string>>,
): string {
  return spec.column_order
    .map(key => escapeForDelimiter(values[key] ?? '', spec.delimiter))
    .join(spec.delimiter);
}

function buildHeader(spec: BankFileSpec): string {
  return spec.column_order
    .map(key => escapeForDelimiter(spec.column_mappings[key] ?? key, spec.delimiter))
    .join(spec.delimiter);
}

/** Generate the formatted bank file string for an executed/approved batch.
 *  PHASE 1: returns synchronous file string + filename + mime · operator
 *  downloads via Blob and uploads to bank portal manually. PHASE 2 will swap
 *  this signature to HTTP POST · same call site. */
export function generateBankFile(
  entityCode: string,
  batchId: string,
  bankCode: BankCode,
  format: BankFileFormat,
): GeneratedBankFile {
  const batch = loadBatch(entityCode, batchId);
  if (!batch) throw new Error(`[bank-file-engine] Batch ${batchId} not found`);

  const spec = BANK_SPEC_BY_CODE.get(bankCode);
  if (!spec) throw new Error(`[bank-file-engine] Bank ${bankCode} not supported`);
  if (!spec.supported_formats.includes(format)) {
    throw new Error(`[bank-file-engine] ${bankCode} does not support ${format}`);
  }

  const reqs = loadRequisitions(entityCode);
  const vendors = loadVendors();
  const vendorMap = new Map(vendors.map(v => [v.id, v] as const));
  const sourceLedger = loadBankLedger(entityCode, batch.source_bank_ledger_id);

  const lines: string[] = [];
  if (spec.header_required) lines.push(buildHeader(spec));

  let totalAmount = 0;
  let rowCount = 0;
  const today = new Date().toISOString().slice(0, 10);

  for (const reqId of batch.requisition_ids) {
    const req = reqs.find(r => r.id === reqId);
    if (!req) continue;
    const vendor = req.vendor_id ? vendorMap.get(req.vendor_id) : undefined;
    const values: Partial<Record<BankFileColumnKey, string>> = {
      beneficiary_name:       vendor?.bankAccountHolder ?? vendor?.name ?? req.vendor_name ?? '',
      beneficiary_account_no: vendor?.bankAccountNo ?? '',
      beneficiary_ifsc:       vendor?.bankIfsc ?? '',
      amount:                 req.amount.toFixed(2),
      remitter_name:          batch.source_bank_ledger_name ?? sourceLedger?.bankName ?? '',
      remitter_account_no:    sourceLedger?.accountNumber ?? '',
      remarks:                req.purpose.slice(0, 60),
      transaction_type:       format,
      value_date:             today,
      reference_no:           req.id,
    };
    lines.push(buildRow(spec, values));
    totalAmount += req.amount;
    rowCount += 1;
  }

  const ext = spec.file_extension ?? 'csv';
  const filename = `${spec.bank_code}-${format}-${batch.batch_no}.${ext}`;
  const mimeType = ext === 'csv' ? 'text/csv' : 'text/plain';
  return {
    filename,
    content: lines.join('\n'),
    mimeType,
    row_count: rowCount,
    total_amount: totalAmount,
  };
}

/** Trigger a browser-side download of the generated file using Blob (no library). */
export function downloadBankFile(file: GeneratedBankFile): void {
  try {
    const blob = new Blob([file.content], { type: file.mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  } catch (err) {
    console.error('[bank-file-engine] Download failed:', err);
  }
}
