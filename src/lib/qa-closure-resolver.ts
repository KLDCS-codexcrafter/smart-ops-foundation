/**
 * @file        qa-closure-resolver.ts
 * @sprint      T-Phase-1.2.6f-d-2-card5-5-pre-2 · Block B · D-338 (Q1=a · Q2=a)
 * @purpose     Replaces 5-pre-1 triggerInspectionClosure stub. On QA inspection completion,
 *              creates up to 3 Stock Journal vouchers (Quarantine→Approved · Quarantine→Sample
 *              · Quarantine→Rejection) via finecore-engine.postVoucher API.
 *              SIBLING DISCIPLINE: matches D-309 gateflow-git-bridge pattern.
 *              D-128 voucher schema BYTE-IDENTICAL preserved.
 * @reuses      qa-inspection-engine.getQaInspection (read-only · CORE preserved)
 *              · finecore-engine.postVoucher (existing public API)
 *              · ComplianceSettingsAutomation.constants comply360QCKey + 4 godown IDs (D-337)
 *              · audit-trail-hash-chain.appendAuditEntry
 * @[JWT]       POST /api/qa/closure/route
 */

import type { Voucher, VoucherInventoryLine } from '@/types/voucher';
import type { QaInspectionRecord } from '@/types/qa-inspection';
import { postVoucher } from '@/lib/finecore-engine';
import { getQaInspection } from '@/lib/qa-inspection-engine';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';
import {
  comply360QCKey, DEFAULT_QC_CONFIG, type QualiCheckConfig,
} from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';
import { qaClosureLogKey, type QaClosureLogEntry } from '@/types/qa-closure-log';

const newId = (p: string): string =>
  `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export interface ClosureRouteResult {
  ok: boolean;
  reason?: string;
  log_entry_id?: string;
  approved_voucher_id?: string | null;
  sample_voucher_id?: string | null;
  rejection_voucher_id?: string | null;
}

function loadQcConfig(entityCode: string): QualiCheckConfig {
  try {
    // [JWT] GET /api/compliance/comply360/qc/:entityId
    const raw = localStorage.getItem(comply360QCKey(entityCode));
    return raw ? (JSON.parse(raw) as QualiCheckConfig) : DEFAULT_QC_CONFIG;
  } catch {
    return DEFAULT_QC_CONFIG;
  }
}

function buildStockJournal(opts: {
  entityCode: string;
  inspection: QaInspectionRecord;
  fromGodown: { id: string; name: string };
  toGodown: { id: string; name: string };
  qty: number;
  purpose: string;
  narration: string;
}): Voucher | null {
  if (opts.qty <= 0 || !opts.fromGodown.id || !opts.toGodown.id) return null;
  const inv = opts.inspection.lines?.[0];
  if (!inv) return null;

  const lineOut: VoucherInventoryLine = {
    id: newId('vil'),
    item_id: inv.item_id, item_code: '', item_name: inv.item_name,
    hsn_sac_code: '',
    godown_id: opts.fromGodown.id, godown_name: opts.fromGodown.name,
    qty: -opts.qty, uom: inv.uom ?? 'nos',
    rate: 0, discount_percent: 0, discount_amount: 0,
    taxable_value: 0, gst_rate: 0,
    cgst_rate: 0, sgst_rate: 0, igst_rate: 0, cess_rate: 0,
    cgst_amount: 0, sgst_amount: 0, igst_amount: 0, cess_amount: 0,
    total: 0, gst_type: 'non_gst', gst_source: 'none',
  };
  const lineIn: VoucherInventoryLine = {
    ...lineOut, id: newId('vil'),
    godown_id: opts.toGodown.id, godown_name: opts.toGodown.name,
    qty: opts.qty,
  };

  const voucher: Voucher = {
    id: newId('vch'),
    voucher_no: '',
    voucher_type_id: 'vt-stock-journal',
    voucher_type_name: 'Stock Journal',
    base_voucher_type: 'Stock Journal',
    entity_id: opts.entityCode,
    date: new Date().toISOString().slice(0, 10),
    purpose: opts.purpose,
    ledger_lines: [],
    inventory_lines: [lineOut, lineIn],
    tax_lines: [],
    gross_amount: 0, total_discount: 0, total_taxable: 0,
    total_cgst: 0, total_sgst: 0, total_igst: 0, total_cess: 0,
    total_tax: 0, round_off: 0, net_amount: 0,
    tds_applicable: false,
    narration: opts.narration,
    terms_conditions: '',
    payment_enforcement: '',
    payment_instrument: '',
    status: 'draft',
    created_by: 'system',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  return voucher;
}

export async function routeInspectionClosure(
  qaId: string,
  entityCode: string,
): Promise<ClosureRouteResult> {
  const inspection = getQaInspection(qaId, entityCode);
  if (!inspection) return { ok: false, reason: 'Inspection not found' };
  // Accept any terminal status set by completeInspection (passed/failed/partial_pass)
  const terminal = ['passed', 'failed', 'partial_pass'];
  if (!terminal.includes(inspection.status)) {
    return { ok: false, reason: 'Inspection not completed' };
  }

  const cfg = loadQcConfig(entityCode);
  const line = inspection.lines?.[0];
  if (!line) return { ok: false, reason: 'No inspection line' };

  const fromGodown = { id: cfg.quarantineGodownId, name: 'Quarantine' };
  if (!fromGodown.id) return { ok: false, reason: 'Quarantine godown not configured' };

  const approvedTo = { id: cfg.approvedGodownId, name: 'Approved Stores' };
  const sampleTo = { id: cfg.sampleGodownId, name: 'Sample' };
  const rejectionTo = { id: cfg.rejectionGodownId, name: 'Rejection' };

  const approvedVoucher = buildStockJournal({
    entityCode, inspection, fromGodown, toGodown: approvedTo,
    qty: line.qty_passed ?? 0,
    purpose: 'QC Approved · Stock Transfer',
    narration: `QC ${inspection.qa_no ?? qaId} · approved qty routed to stores`,
  });
  const sampleVoucher = buildStockJournal({
    entityCode, inspection, fromGodown, toGodown: sampleTo,
    qty: line.qty_sample ?? 0,
    purpose: 'QC Sample · Stock Transfer',
    narration: `QC ${inspection.qa_no ?? qaId} · sample qty routed to sample godown`,
  });
  const rejectionVoucher = buildStockJournal({
    entityCode, inspection, fromGodown, toGodown: rejectionTo,
    qty: line.qty_failed ?? 0,
    purpose: 'QC Rejection · Stock Transfer',
    narration: `QC ${inspection.qa_no ?? qaId} · rejected qty routed to rejection godown`,
  });

  const journalIds: string[] = [];
  try {
    if (approvedVoucher)  { postVoucher(approvedVoucher,  entityCode); journalIds.push(approvedVoucher.id); }
    if (sampleVoucher)    { postVoucher(sampleVoucher,    entityCode); journalIds.push(sampleVoucher.id); }
    if (rejectionVoucher) { postVoucher(rejectionVoucher, entityCode); journalIds.push(rejectionVoucher.id); }
  } catch (e) {
    return { ok: false, reason: `postVoucher failed: ${String(e)}` };
  }

  const logEntry: QaClosureLogEntry = {
    id: newId('qcl'), qa_id: qaId, qa_no: inspection.qa_no ?? '',
    closed_at: new Date().toISOString(), closed_by: 'system',
    approved_voucher_id: approvedVoucher?.id ?? null,
    approved_voucher_no: approvedVoucher?.voucher_no ?? null,
    approved_qty: line.qty_passed ?? 0,
    sample_voucher_id: sampleVoucher?.id ?? null,
    sample_voucher_no: sampleVoucher?.voucher_no ?? null,
    sample_qty: line.qty_sample ?? 0,
    rejection_voucher_id: rejectionVoucher?.id ?? null,
    rejection_voucher_no: rejectionVoucher?.voucher_no ?? null,
    rejection_qty: line.qty_failed ?? 0,
    entity_id: entityCode,
  };
  try {
    // [JWT] POST /api/qa/closure-log
    const raw = localStorage.getItem(qaClosureLogKey(entityCode));
    const list: QaClosureLogEntry[] = raw ? JSON.parse(raw) as QaClosureLogEntry[] : [];
    list.push(logEntry);
    localStorage.setItem(qaClosureLogKey(entityCode), JSON.stringify(list));
  } catch { /* quota silent */ }

  await appendAuditEntry({
    entityCode, entityId: entityCode, voucherId: qaId,
    voucherKind: 'material',
    action: 'qa_closure_routed',
    actorUserId: 'system',
    payload: { qa_id: qaId, journal_ids: journalIds, log_entry_id: logEntry.id },
  });

  return {
    ok: true, log_entry_id: logEntry.id,
    approved_voucher_id: approvedVoucher?.id ?? null,
    sample_voucher_id: sampleVoucher?.id ?? null,
    rejection_voucher_id: rejectionVoucher?.id ?? null,
  };
}

export function listClosureLog(entityCode: string): QaClosureLogEntry[] {
  // [JWT] GET /api/qa/closure-log
  try {
    const raw = localStorage.getItem(qaClosureLogKey(entityCode));
    return raw ? (JSON.parse(raw) as QaClosureLogEntry[]) : [];
  } catch { return []; }
}
