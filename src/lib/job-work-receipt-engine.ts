/**
 * @file     job-work-receipt-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block H · D-535
 * @purpose  Job Work Receipt lifecycle: create / confirm / cancel.
 *           On confirm: updates JWO line received_qty (running tally) +
 *           transitions JWO 'sent' → 'partially_received' or 'received'.
 *
 * Corrections: C#1 · generateDocNo('JWR', entityCode) positional.
 */
import type {
  JobWorkReceipt,
  JobWorkReceiptLine,
} from '@/types/job-work-receipt';
import { jobWorkReceiptsKey } from '@/types/job-work-receipt';
import type {
  JobWorkOutOrder,
  JobWorkOutOrderStatus,
} from '@/types/job-work-out-order';
import { jobWorkOutOrdersKey } from '@/types/job-work-out-order';
import { generateDocNo } from '@/lib/finecore-engine';
import type { QualiCheckConfig } from '@/pages/erp/accounting/ComplianceSettingsAutomation.constants';

export interface CreateJobWorkReceiptInput {
  entity_id: string;
  job_work_out_order: JobWorkOutOrder;
  receipt_date: string;
  department_id: string;
  department_name: string;
  received_by_user_id: string;
  received_by_name: string;
  lines: Array<{
    job_work_out_order_line_id: string;
    item_id: string;
    item_code: string;
    item_name: string;
    uom: string;
    expected_qty: number;
    received_qty: number;
    rejected_qty: number;
    destination_godown_id: string;
    destination_godown_name: string;
    qc_required: boolean;
    batch_no: string | null;
    serial_nos: string[];
    remarks: string;
  }>;
  notes: string;
}

export function createJobWorkReceipt(
  input: CreateJobWorkReceiptInput,
  qcConfig: QualiCheckConfig,
): JobWorkReceipt {
  const jwo = input.job_work_out_order;
  if (jwo.status !== 'sent' && jwo.status !== 'partially_received') {
    throw new Error(`Cannot receive against JWO in ${jwo.status} status`);
  }
  if (input.lines.length === 0) throw new Error('At least one line required');
  for (const l of input.lines) {
    if (l.received_qty < 0 || l.rejected_qty < 0)
      throw new Error(`Quantities must be >= 0 for ${l.item_code}`);
    if (l.received_qty + l.rejected_qty <= 0)
      throw new Error(`At least one of received/rejected qty must be > 0 for ${l.item_code}`);
  }

  const doc_no = generateDocNo('JWR', input.entity_id);
  const now = new Date().toISOString();

  const lines: JobWorkReceiptLine[] = input.lines.map((l, i) => {
    const routed_to_quarantine = qcConfig.enableIncomingInspection && l.qc_required;
    return {
      id: `jwr-line-${doc_no.replace(/\//g, '-')}-${i + 1}`,
      line_no: i + 1,
      job_work_out_order_line_id: l.job_work_out_order_line_id,
      item_id: l.item_id,
      item_code: l.item_code,
      item_name: l.item_name,
      uom: l.uom,
      expected_qty: l.expected_qty,
      received_qty: l.received_qty,
      rejected_qty: l.rejected_qty,
      destination_godown_id: routed_to_quarantine
        ? qcConfig.quarantineGodownId || l.destination_godown_id
        : l.destination_godown_id,
      destination_godown_name: routed_to_quarantine
        ? 'Quarantine (auto-routed · QC pending)'
        : l.destination_godown_name,
      qc_required: l.qc_required,
      routed_to_quarantine,
      batch_no: l.batch_no,
      serial_nos: l.serial_nos,
      remarks: l.remarks,
    };
  });

  const total_received_qty = lines.reduce((s, l) => s + l.received_qty, 0);
  const total_rejected_qty = lines.reduce((s, l) => s + l.rejected_qty, 0);

  // marks_jwo_complete: every JWO line's received_qty (running) + this batch >= expected
  const marks_jwo_complete = jwo.lines.every(jwoLine => {
    const thisBatch = lines
      .filter(rl => rl.job_work_out_order_line_id === jwoLine.id)
      .reduce((s, rl) => s + rl.received_qty, 0);
    return jwoLine.received_qty + thisBatch >= jwoLine.expected_output_qty;
  });

  const jwr: JobWorkReceipt = {
    id: `jwr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,
    status: 'draft',
    receipt_date: input.receipt_date,
    job_work_out_order_id: jwo.id,
    job_work_out_order_no: jwo.doc_no,
    vendor_id: jwo.vendor_id,
    vendor_name: jwo.vendor_name,
    department_id: input.department_id,
    department_name: input.department_name,
    received_by_user_id: input.received_by_user_id,
    received_by_name: input.received_by_name,
    lines,
    total_received_qty,
    total_rejected_qty,
    marks_jwo_complete,
    status_history: [
      {
        id: `jwrs-${Date.now()}`,
        from_status: null,
        to_status: 'draft',
        changed_by_id: input.received_by_user_id,
        changed_by_name: input.received_by_name,
        changed_at: now,
        note: 'Job Work Receipt created',
      },
    ],
    notes: input.notes,
    created_at: now,
    created_by: input.received_by_name,
    updated_at: now,
    updated_by: input.received_by_name,
    linked_test_report_ids: [],
    qc_scenario: null,
  };

  persist(input.entity_id, jwr);
  return jwr;
}

/**
 * Confirm: DRAFT → RECEIVED
 *   - Updates JWO lines' received_qty (running tally)
 *   - Transitions JWO to 'received' (full) or 'partially_received'
 */
export function confirmJobWorkReceipt(
  jwr: JobWorkReceipt,
  user: { id: string; name: string },
): JobWorkReceipt {
  if (jwr.status !== 'draft') throw new Error('Only DRAFT receipts can be confirmed');

  updateJWOReceivedQty(jwr, user);

  const now = new Date().toISOString();
  const updated: JobWorkReceipt = {
    ...jwr,
    status: 'received',
    status_history: [
      ...jwr.status_history,
      {
        id: `jwrs-${Date.now()}`,
        from_status: 'draft',
        to_status: 'received',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: jwr.marks_jwo_complete
          ? 'Confirmed · JWO marked received'
          : 'Confirmed · JWO partially received',
      },
    ],
    updated_at: now,
    updated_by: user.name,
  };
  persist(jwr.entity_id, updated);
  return updated;
}

export function cancelJobWorkReceipt(
  jwr: JobWorkReceipt,
  user: { id: string; name: string },
  reason: string,
): JobWorkReceipt {
  if (jwr.status !== 'draft') throw new Error('Only DRAFT receipts can be cancelled');
  const now = new Date().toISOString();
  const updated: JobWorkReceipt = {
    ...jwr,
    status: 'cancelled',
    status_history: [
      ...jwr.status_history,
      {
        id: `jwrs-${Date.now()}`,
        from_status: 'draft',
        to_status: 'cancelled',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: `Cancelled: ${reason}`,
      },
    ],
    updated_at: now,
    updated_by: user.name,
  };
  persist(jwr.entity_id, updated);
  return updated;
}

export function listJobWorkReceipts(entityCode: string): JobWorkReceipt[] {
  try {
    // [JWT] GET /api/production/job-work-receipts?entityCode=...
    const raw = localStorage.getItem(jobWorkReceiptsKey(entityCode));
    return raw ? (JSON.parse(raw) as JobWorkReceipt[]) : [];
  } catch {
    return [];
  }
}

// ─── Private helpers ─────────────────────────────────────────────────

function persist(entityCode: string, jwr: JobWorkReceipt): void {
  const all = listJobWorkReceipts(entityCode);
  const idx = all.findIndex(x => x.id === jwr.id);
  if (idx >= 0) all[idx] = jwr;
  else all.push(jwr);
  // [JWT] PUT /api/production/job-work-receipts/:entityCode
  localStorage.setItem(jobWorkReceiptsKey(entityCode), JSON.stringify(all));
}

function updateJWOReceivedQty(
  jwr: JobWorkReceipt,
  user: { id: string; name: string },
): void {
  const key = jobWorkOutOrdersKey(jwr.entity_id);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const all = JSON.parse(raw) as JobWorkOutOrder[];
    const idx = all.findIndex(j => j.id === jwr.job_work_out_order_id);
    if (idx < 0) return;
    const jwo = all[idx];
    const now = new Date().toISOString();

    const updatedLines = jwo.lines.map(line => {
      const matching = jwr.lines.filter(rl => rl.job_work_out_order_line_id === line.id);
      if (matching.length === 0) return line;
      const addQty = matching.reduce((s, rl) => s + rl.received_qty, 0);
      return { ...line, received_qty: line.received_qty + addQty };
    });

    const total_received_qty = updatedLines.reduce((s, l) => s + l.received_qty, 0);
    const allComplete = updatedLines.every(l => l.received_qty >= l.expected_output_qty);
    const newStatus: JobWorkOutOrderStatus = allComplete ? 'received' : 'partially_received';

    all[idx] = {
      ...jwo,
      lines: updatedLines,
      total_received_qty,
      status: newStatus,
      status_history: [
        ...jwo.status_history,
        {
          id: `jwos-${Date.now()}`,
          from_status: jwo.status,
          to_status: newStatus,
          changed_by_id: user.id,
          changed_by_name: user.name,
          changed_at: now,
          note: `Auto-transitioned via JWR ${jwr.doc_no}`,
        },
      ],
      updated_at: now,
      updated_by: user.name,
    };
    // [JWT] PATCH /api/production/job-work-out-orders/:entityCode/:id
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* silent */
  }
}
