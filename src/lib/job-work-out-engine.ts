/**
 * @file     job-work-out-engine.ts
 * @sprint   T-Phase-1.A.2.c-Job-Work-Tally-Parity (was T-Phase-1.3-3a-pre-2 · Block F · D-533)
 * @purpose  Job Work Out Order lifecycle: create / send / cancel.
 *           On send: appends JWO id to linked PO's linked_job_work_out_order_ids[].
 *           Stock physical movement (RM godown → job_work godown) modeled in Phase 2.
 *
 * Corrections: C#1 · generateDocNo('JWO', entityCode) positional.
 */
import type {
  JobWorkOutOrder,
  JobWorkOutOrderLine,
} from '@/types/job-work-out-order';
import { jobWorkOutOrdersKey } from '@/types/job-work-out-order';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import { generateDocNo } from '@/lib/finecore-engine';

export interface CreateJobWorkOutOrderInput {
  entity_id: string;
  jwo_date: string;
  expected_return_date: string;

  vendor_id: string;
  vendor_name: string;
  vendor_gstin: string | null;

  production_order_id: string | null;
  production_order_no: string | null;

  department_id: string;
  department_name: string;
  raised_by_user_id: string;
  raised_by_name: string;

  lines: Array<Omit<JobWorkOutOrderLine, 'id' | 'line_no' | 'received_qty' | 'job_work_value'>>;

  notes: string;
}

export function createJobWorkOutOrder(
  input: CreateJobWorkOutOrderInput,
): JobWorkOutOrder {
  if (!input.vendor_id || !input.vendor_name) throw new Error('Vendor required');
  if (input.lines.length === 0) throw new Error('At least one line required');
  if (new Date(input.expected_return_date) < new Date(input.jwo_date)) {
    throw new Error('Expected return date must be on/after JWO date');
  }
  for (const l of input.lines) {
    if (l.sent_qty <= 0) throw new Error(`Sent qty must be > 0 for ${l.item_code}`);
    if (l.expected_output_qty <= 0)
      throw new Error(`Expected output qty must be > 0 for ${l.item_code}`);
  }

  const doc_no = generateDocNo('JWO', input.entity_id);
  const now = new Date().toISOString();

  const lines: JobWorkOutOrderLine[] = input.lines.map((l, i) => ({
    ...l,
    id: `jwo-line-${doc_no.replace(/\//g, '-')}-${i + 1}`,
    line_no: i + 1,
    received_qty: 0,
    job_work_value: l.expected_output_qty * l.job_work_rate,
  }));

  const total_sent_qty = lines.reduce((s, l) => s + l.sent_qty, 0);
  const total_jw_value = lines.reduce((s, l) => s + l.job_work_value, 0);

  const jwo: JobWorkOutOrder = {
    id: `jwo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,
    status: 'draft',
    jwo_date: input.jwo_date,
    expected_return_date: input.expected_return_date,
    vendor_id: input.vendor_id,
    vendor_name: input.vendor_name,
    vendor_gstin: input.vendor_gstin,
    production_order_id: input.production_order_id,
    production_order_no: input.production_order_no,
    department_id: input.department_id,
    department_name: input.department_name,
    raised_by_user_id: input.raised_by_user_id,
    raised_by_name: input.raised_by_name,
    lines,
    total_sent_qty,
    total_received_qty: 0,
    total_jw_value,
    itc04_reference: null,
    itc04_quarter: null,
    approval_history: [],
    status_history: [
      {
        id: `jwos-${Date.now()}`,
        from_status: null,
        to_status: 'draft',
        changed_by_id: input.raised_by_user_id,
        changed_by_name: input.raised_by_name,
        changed_at: now,
        note: 'Job Work Out Order created',
      },
    ],
    notes: input.notes,
    created_at: now,
    created_by: input.raised_by_name,
    updated_at: now,
    updated_by: input.raised_by_name,
  };

  persist(input.entity_id, jwo);
  return jwo;
}

/**
 * Send: DRAFT → SENT
 *  - Appends JWO id to linked PO's linked_job_work_out_order_ids[] (if PO is linked)
 *  - Stock physical movement is a Phase 2 transactional concern
 */
export function sendJobWorkOutOrder(
  jwo: JobWorkOutOrder,
  user: { id: string; name: string },
): JobWorkOutOrder {
  if (jwo.status !== 'draft') throw new Error('Only DRAFT JWOs can be sent');

  if (jwo.production_order_id) {
    appendJWOToPO(jwo.entity_id, jwo.production_order_id, jwo.id, user);
  }

  const now = new Date().toISOString();
  const updated: JobWorkOutOrder = {
    ...jwo,
    status: 'sent',
    status_history: [
      ...jwo.status_history,
      {
        id: `jwos-${Date.now()}`,
        from_status: 'draft',
        to_status: 'sent',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: jwo.production_order_id
          ? `Sent · linked to PO ${jwo.production_order_no}`
          : 'Sent · standalone JWO',
      },
    ],
    updated_at: now,
    updated_by: user.name,
  };
  persist(jwo.entity_id, updated);
  return updated;
}

export function cancelJobWorkOutOrder(
  jwo: JobWorkOutOrder,
  user: { id: string; name: string },
  reason: string,
): JobWorkOutOrder {
  if (jwo.status !== 'draft') throw new Error('Only DRAFT JWOs can be cancelled');
  const now = new Date().toISOString();
  const updated: JobWorkOutOrder = {
    ...jwo,
    status: 'cancelled',
    status_history: [
      ...jwo.status_history,
      {
        id: `jwos-${Date.now()}`,
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
  persist(jwo.entity_id, updated);
  return updated;
}

export function listJobWorkOutOrders(entityCode: string): JobWorkOutOrder[] {
  try {
    // [JWT] GET /api/production/job-work-out-orders?entityCode=...
    const raw = localStorage.getItem(jobWorkOutOrdersKey(entityCode));
    return raw ? (JSON.parse(raw) as JobWorkOutOrder[]) : [];
  } catch {
    return [];
  }
}

// ─── Private helpers ─────────────────────────────────────────────────

function persist(entityCode: string, jwo: JobWorkOutOrder): void {
  const all = listJobWorkOutOrders(entityCode);
  const idx = all.findIndex(x => x.id === jwo.id);
  if (idx >= 0) all[idx] = jwo;
  else all.push(jwo);
  // [JWT] PUT /api/production/job-work-out-orders/:entityCode
  localStorage.setItem(jobWorkOutOrdersKey(entityCode), JSON.stringify(all));
}

function appendJWOToPO(
  entityCode: string,
  productionOrderId: string,
  jwoId: string,
  user: { id: string; name: string },
): void {
  const key = productionOrdersKey(entityCode);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const all = JSON.parse(raw) as ProductionOrder[];
    const idx = all.findIndex(p => p.id === productionOrderId);
    if (idx < 0) return;
    const po = all[idx];
    if (po.linked_job_work_out_order_ids.includes(jwoId)) return;

    all[idx] = {
      ...po,
      linked_job_work_out_order_ids: [...po.linked_job_work_out_order_ids, jwoId],
      updated_at: new Date().toISOString(),
      updated_by: user.name,
    };
    // [JWT] PATCH /api/production-orders/:entityCode/:id
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* silent */
  }
}
