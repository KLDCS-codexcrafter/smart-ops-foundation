/**
 * @file     material-issue-engine.ts
 * @sprint   T-Phase-1.3-3a-pre-2 · Block B · D-529
 * @purpose  Material Issue lifecycle: create / issue / cancel.
 *           On issue: releases PO reservations (active → released) and
 *           updates PO line issued_qty + transitions PO released → in_progress.
 *
 * Corrections applied (per CORRECTIONS-v2):
 *   C#1 · generateDocNo positional signature (no fyShort helper)
 *   C#3 · uses exported releaseProductionOrderReservations sibling helper
 *         (no direct localStorage manipulation · no 'consumed' status)
 */
import type {
  MaterialIssueNote,
  MaterialIssueLine,
} from '@/types/material-issue-note';
import { materialIssueNotesKey } from '@/types/material-issue-note';
import type { ProductionOrder } from '@/types/production-order';
import { productionOrdersKey } from '@/types/production-order';
import { generateDocNo } from '@/lib/finecore-engine';
import { releaseProductionOrderReservations } from '@/lib/stock-reservation-engine';

export interface CreateMaterialIssueInput {
  entity_id: string;
  production_order: ProductionOrder;
  issue_date: string;
  department_id: string;
  department_name: string;
  issued_by_user_id: string;
  issued_by_name: string;
  lines: Array<{
    production_order_line_id: string;
    item_id: string;
    item_code: string;
    item_name: string;
    required_qty: number;
    issued_qty: number;
    uom: string;
    source_godown_id: string;
    source_godown_name: string;
    destination_godown_id: string;
    destination_godown_name: string;
    reservation_id: string | null;
    batch_no: string | null;
    serial_nos: string[];
    heat_no: string | null;
    unit_rate: number;
    remarks: string;
  }>;
  notes: string;
}

export function createMaterialIssue(
  input: CreateMaterialIssueInput,
): MaterialIssueNote {
  if (
    input.production_order.status !== 'released' &&
    input.production_order.status !== 'in_progress'
  ) {
    throw new Error(
      `Cannot issue material against PO in ${input.production_order.status} status`,
    );
  }
  if (input.lines.length === 0) throw new Error('At least one line required');
  for (const l of input.lines) {
    if (l.issued_qty <= 0) throw new Error(`Issued qty must be > 0 for ${l.item_code}`);
  }

  const doc_no = generateDocNo('MIN', input.entity_id);

  const now = new Date().toISOString();
  const lines: MaterialIssueLine[] = input.lines.map((l, i) => ({
    id: `min-line-${doc_no.replace(/\//g, '-')}-${i + 1}`,
    line_no: i + 1,
    ...l,
    line_value: l.issued_qty * l.unit_rate,
  }));

  const total_qty = lines.reduce((s, l) => s + l.issued_qty, 0);
  const total_value = lines.reduce((s, l) => s + l.line_value, 0);

  const min: MaterialIssueNote = {
    id: `min-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entity_id: input.entity_id,
    doc_no,
    status: 'draft',
    issue_date: input.issue_date,
    production_order_id: input.production_order.id,
    production_order_no: input.production_order.doc_no,
    department_id: input.department_id,
    department_name: input.department_name,
    issued_by_user_id: input.issued_by_user_id,
    issued_by_name: input.issued_by_name,
    lines,
    total_qty,
    total_value,
    approval_history: [],
    status_history: [
      {
        id: `mis-${Date.now()}`,
        from_status: null,
        to_status: 'draft',
        changed_by_id: input.issued_by_user_id,
        changed_by_name: input.issued_by_name,
        changed_at: now,
        note: 'Material Issue created',
      },
    ],
    notes: input.notes,
    created_at: now,
    created_by: input.issued_by_name,
    updated_at: now,
    updated_by: input.issued_by_name,
    qc_required: false,
    qc_scenario: null,
    linked_test_report_ids: [],
    routed_to_quarantine: false,
  };

  persistMIN(input.entity_id, min);
  return min;
}

/**
 * Issue the MIN:
 *  - Status DRAFT → ISSUED
 *  - Release reservations (active → released) via exported sibling helper
 *  - Update PO lines' issued_qty (running tally · supports multiple MINs)
 *  - Transition PO 'released' → 'in_progress' on first issue
 */
export function issueMaterialIssue(
  min: MaterialIssueNote,
  user: { id: string; name: string },
): MaterialIssueNote {
  if (min.status !== 'draft') throw new Error('Only DRAFT MINs can be issued');

  const reservationIdsConsumed = min.lines
    .map(l => l.reservation_id)
    .filter((id): id is string => id !== null);

  if (reservationIdsConsumed.length > 0) {
    releaseProductionOrderReservations(
      min.entity_id,
      min.production_order_id,
      reservationIdsConsumed,
    );
  }

  updatePOIssuedQty(min);

  const now = new Date().toISOString();
  const updated: MaterialIssueNote = {
    ...min,
    status: 'issued',
    status_history: [
      ...min.status_history,
      {
        id: `mis-${Date.now()}`,
        from_status: 'draft',
        to_status: 'issued',
        changed_by_id: user.id,
        changed_by_name: user.name,
        changed_at: now,
        note: `Issued · ${reservationIdsConsumed.length} reservation(s) released`,
      },
    ],
    updated_at: now,
    updated_by: user.name,
  };
  persistMIN(min.entity_id, updated);
  return updated;
}

export function cancelMaterialIssue(
  min: MaterialIssueNote,
  user: { id: string; name: string },
  reason: string,
): MaterialIssueNote {
  if (min.status !== 'draft') throw new Error('Only DRAFT MINs can be cancelled');
  const now = new Date().toISOString();
  const updated: MaterialIssueNote = {
    ...min,
    status: 'cancelled',
    status_history: [
      ...min.status_history,
      {
        id: `mis-${Date.now()}`,
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
  persistMIN(min.entity_id, updated);
  return updated;
}

export function listMaterialIssues(entityCode: string): MaterialIssueNote[] {
  try {
    // [JWT] GET /api/production/material-issues?entityCode=...
    const raw = localStorage.getItem(materialIssueNotesKey(entityCode));
    return raw ? (JSON.parse(raw) as MaterialIssueNote[]) : [];
  } catch {
    return [];
  }
}

// ─── Private helpers ─────────────────────────────────────────────────

function persistMIN(entityCode: string, min: MaterialIssueNote): void {
  const all = listMaterialIssues(entityCode);
  const idx = all.findIndex(m => m.id === min.id);
  if (idx >= 0) all[idx] = min;
  else all.push(min);
  // [JWT] PUT /api/production/material-issues/:entityCode
  localStorage.setItem(materialIssueNotesKey(entityCode), JSON.stringify(all));
}

function updatePOIssuedQty(min: MaterialIssueNote): void {
  const key = productionOrdersKey(min.entity_id);
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return;
    const all = JSON.parse(raw) as ProductionOrder[];
    const idx = all.findIndex(p => p.id === min.production_order_id);
    if (idx < 0) return;
    const po = all[idx];

    const updatedLines = po.lines.map(line => {
      const matchingMinLine = min.lines.find(ml => ml.production_order_line_id === line.id);
      if (!matchingMinLine) return line;
      return { ...line, issued_qty: line.issued_qty + matchingMinLine.issued_qty };
    });

    const wasFirstIssue = po.status === 'released';
    const updatedPO: ProductionOrder = {
      ...po,
      lines: updatedLines,
      status: wasFirstIssue ? 'in_progress' : po.status,
      status_history: wasFirstIssue
        ? [
            ...po.status_history,
            {
              id: `pose-${Date.now()}`,
              from_status: 'released',
              to_status: 'in_progress',
              changed_by_id: min.issued_by_user_id,
              changed_by_name: min.issued_by_name,
              changed_at: new Date().toISOString(),
              note: `Auto-transitioned via Material Issue ${min.doc_no}`,
            },
          ]
        : po.status_history,
      updated_at: new Date().toISOString(),
      updated_by: min.issued_by_name,
    };
    all[idx] = updatedPO;
    // [JWT] PATCH /api/production-orders/:entityCode/:id
    localStorage.setItem(key, JSON.stringify(all));
  } catch {
    /* silent */
  }
}
