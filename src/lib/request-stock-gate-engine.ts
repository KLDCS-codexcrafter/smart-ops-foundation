/**
 * @file        request-stock-gate-engine.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @card        Card #3 · P2P arc · RequestX
 * @purpose     Q-Final-1 stock-gate router · STORE-FIRST routing for stocked lines.
 *              Reuses existing useMaterialIssueNotes (D-223 · NO new SIV voucher).
 * @decisions   D-218, D-220, D-223, D-231
 * @disciplines SD-15
 * @reuses      stockBalanceKey, useMaterialIssueNotes (read-side)
 * @[JWT]       /api/inventory/stock-gate/check
 */
import { materialIndentsKey, type MaterialIndent, type MaterialIndentLine } from '@/types/material-indent';

export interface StockGateResult {
  available: boolean;
  godown_id: string;
  qty_available: number;
}

interface StockBalanceRow {
  item_id: string;
  godown_id?: string;
  qty?: number;
  available_qty?: number;
}

export function evaluateStockGate(line: MaterialIndentLine, entityCode: string): StockGateResult {
  // [JWT] GET /api/inventory/stock-gate/check?entity=...&item=...&godown=...
  try {
    const raw = localStorage.getItem(`stockBalance_${entityCode}`);
    const list = (raw ? JSON.parse(raw) : []) as StockBalanceRow[];
    const match = list.find(
      r => r.item_id === line.item_id && (!line.target_godown_id || r.godown_id === line.target_godown_id),
    );
    const qty = match?.available_qty ?? match?.qty ?? line.current_stock_qty ?? 0;
    return {
      available: qty >= line.qty,
      godown_id: line.target_godown_id,
      qty_available: qty,
    };
  } catch {
    return { available: false, godown_id: line.target_godown_id, qty_available: 0 };
  }
}

interface MinDraft {
  id: string;
  entity_id: string;
  source_indent_id: string;
  source_line_id: string;
  item_id: string;
  qty: number;
  godown_id: string;
  status: 'draft';
  created_at: string;
}

/** Routes a stocked, available line to a Material Issue Note draft.
 *  Reuses existing useMaterialIssueNotes storage key (Q-Final-4). */
export function routeToStore(line: MaterialIndentLine, indent: MaterialIndent, entityCode: string): MinDraft | null {
  // [JWT] POST /api/inventory/material-issue-notes
  try {
    const key = `erp_material_issue_notes_${entityCode}`;
    const raw = localStorage.getItem(key);
    const list = (raw ? JSON.parse(raw) : []) as MinDraft[];
    const min: MinDraft = {
      id: `min-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      entity_id: indent.entity_id,
      source_indent_id: indent.id,
      source_line_id: line.id,
      item_id: line.item_id,
      qty: line.qty,
      godown_id: line.target_godown_id,
      status: 'draft',
      created_at: new Date().toISOString(),
    };
    list.push(min);
    localStorage.setItem(key, JSON.stringify(list));
    return min;
  } catch {
    return null;
  }
}

/** Promotes a short/unavailable line into a child Indent (cascade lineage · D-220). */
export function promoteToIndent(line: MaterialIndentLine, parent: MaterialIndent, entityCode: string): MaterialIndent | null {
  // [JWT] POST /api/requestx/material-indents/promote
  try {
    const childLine: MaterialIndentLine = {
      ...line,
      id: `mil-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      parent_indent_line_id: line.id,
      cascade_reason: 'short_supply',
      stock_check_status: 'unavailable',
      store_action: 'promoted_to_indent',
      store_action_at: new Date().toISOString(),
      store_actor_id: null,
    };
    const child: MaterialIndent = {
      ...parent,
      id: `mi-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      voucher_no: `${parent.voucher_no}-C`,
      lines: [childLine],
      total_estimated_value: childLine.estimated_value,
      status: 'submitted',
      approval_history: [],
      pending_approver_user_id: null,
      parent_indent_id: parent.id,
      cascade_reason: 'short_supply',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    const k = materialIndentsKey(entityCode);
    const raw = localStorage.getItem(k);
    const list = (raw ? JSON.parse(raw) : []) as MaterialIndent[];
    list.push(child);
    localStorage.setItem(k, JSON.stringify(list));
    return child;
  } catch {
    return null;
  }
}
