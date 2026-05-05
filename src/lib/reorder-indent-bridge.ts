/**
 * @file        reorder-indent-bridge.ts
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-2 · Block A · D-385 (Q3=a)
 * @purpose     Sibling wrapper for Card #3 createMaterialIndent. Promotes
 *              D-298 ReorderSuggestion → MaterialIndent.
 *              Pattern: matches Card #6 gateflow-inward-bridge sibling discipline (D-309).
 * @decisions   D-385 · D-309 (sibling pattern) · D-128 (uses existing Card #3 'MI' prefix)
 */

import type { ReorderSuggestion } from '@/lib/store-hub-engine';
import { createMaterialIndent, type CreateMaterialIndentInput } from '@/lib/request-engine';
import type { MaterialIndent, MaterialIndentLine, Priority, IndentCategory } from '@/types/material-indent';
import { appendAuditEntry } from '@/lib/audit-trail-hash-chain';

export interface PromoteReorderToIndentInput {
  suggestion: ReorderSuggestion;
  department_id: string;
  department_name: string;
  approver_hint?: string | null;
  notes: string;
  created_by: string;
  priority?: Priority;
  category?: IndentCategory;
}

export interface PromoteReorderToIndentResult {
  ok: boolean;
  indent_id: string | null;
  voucher_no: string | null;
  reason?: string;
}

/**
 * Promotes a Reorder Suggestion to a Material Indent.
 * Pure consumer · ZERO modifications to Card #3 request-engine.
 */
export function promoteReorderToIndent(
  input: PromoteReorderToIndentInput,
  entityCode: string,
): PromoteReorderToIndentResult {
  // [JWT] POST /api/store-hub/reorder/promote-to-indent
  const { suggestion, department_id, department_name, notes, created_by } = input;

  if (suggestion.shortfall <= 0) {
    return { ok: false, indent_id: null, voucher_no: null, reason: 'no-shortfall' };
  }

  const now = new Date().toISOString();
  const today = now.slice(0, 10);
  const line = {
    id: `mil-rs-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    line_no: 1,
    item_id: suggestion.item_id,
    item_name: suggestion.item_name,
    description: `Reorder · auto-promoted from ${suggestion.godown_name} (current ${suggestion.current_balance} ${suggestion.uom} · reorder ${suggestion.reorder_level} · suggested ${suggestion.reorder_qty})`,
    uom: suggestion.uom,
    qty: suggestion.reorder_qty,
    current_stock_qty: suggestion.current_balance,
    estimated_rate: 0,
    estimated_value: 0,
    required_date: today,
    schedule_qty: null,
    schedule_date: null,
    remarks: '',
    target_godown_id: suggestion.godown_id,
    target_godown_name: suggestion.godown_name,
    is_stocked: true,
    stock_check_status: 'unavailable',
    store_action: null,
    store_actor_id: null,
    store_action_at: null,
    parent_indent_line_id: null,
    cascade_reason: null,
  } as MaterialIndentLine;

  try {
    const indentInput = {
      entity_id: entityCode,
      voucher_type_id: 'vt-mi',
      date: today,
      branch_id: '',
      division_id: '',
      originating_department_id: department_id,
      originating_department_name: department_name,
      cost_center_id: '',
      category: input.category ?? 'raw_material',
      sub_type: '',
      priority: input.priority ?? 'normal',
      requested_by_user_id: created_by,
      requested_by_name: created_by,
      hod_user_id: input.approver_hint ?? '',
      project_id: null,
      preferred_vendor_id: null,
      payment_terms: null,
      lines: [line],
      parent_indent_id: null,
      cascade_reason: null,
      created_by,
      updated_by: created_by,
    } as unknown as CreateMaterialIndentInput;

    const indent: MaterialIndent = createMaterialIndent(indentInput, entityCode);

    // Annotate with REORDER provenance + notes (post-create patch in storage)
    try {
      const key = `erp_material_indents_${entityCode}`;
      const list = JSON.parse(localStorage.getItem(key) ?? '[]') as MaterialIndent[];
      const idx = list.findIndex(i => i.id === indent.id);
      if (idx >= 0) {
        const annotated = {
          ...list[idx],
          reference_no: `REORDER:${suggestion.item_id}:${suggestion.godown_id}`,
          notes: notes || `Auto-promoted from Reorder Suggestion · ${suggestion.item_name}`,
          status: 'submitted',
        } as MaterialIndent & { reference_no?: string; notes?: string };
        list[idx] = annotated;
        localStorage.setItem(key, JSON.stringify(list));
      }
    } catch { /* silent */ }

    // Fire audit (async · fire-and-forget)
    void appendAuditEntry({
      entityCode,
      entityId: entityCode,
      voucherId: indent.id,
      voucherKind: 'material',
      action: 'reorder_promoted_to_indent',
      actorUserId: created_by,
      payload: {
        item_id: suggestion.item_id,
        godown_id: suggestion.godown_id,
        shortfall: suggestion.shortfall,
        reorder_qty: suggestion.reorder_qty,
        indent_voucher_no: indent.voucher_no,
      },
    });

    return { ok: true, indent_id: indent.id, voucher_no: indent.voucher_no };
  } catch (e) {
    return { ok: false, indent_id: null, voucher_no: null, reason: `create-failed: ${String(e)}` };
  }
}
