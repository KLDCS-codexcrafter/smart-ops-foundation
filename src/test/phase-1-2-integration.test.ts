/**
 * @file        phase-1-2-integration.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-3 · Block E · D-419
 * @purpose     5 cross-card integration tests validating Phase 1.2 P2P→Store flow integrity.
 * @decisions   D-419 · Phase 1.2 LANDMARK closure (D-418)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMaterialIndent, submitIndent, approveIndent, cancelIndent,
  type CreateMaterialIndentInput,
} from '@/lib/request-engine';
import { promoteReorderToIndent } from '@/lib/reorder-indent-bridge';
import { findInwardReceiptByGatePass } from '@/lib/gateflow-inward-bridge';
import { decideLineRouting } from '@/lib/inward-receipt-engine';
import { materialIndentsKey, type MaterialIndentLine } from '@/types/material-indent';
import { inwardReceiptsKey } from '@/types/inward-receipt';
import type { ReorderSuggestion } from '@/lib/store-hub-engine';

const ENTITY = 'TEST-PHASE1-2-INTEG';

const mkLine = (over: Partial<MaterialIndentLine> = {}): MaterialIndentLine => ({
  id: 'mil-1', line_no: 1, item_id: 'steel', item_name: 'Steel Rod',
  description: '', uom: 'kg', qty: 100, current_stock_qty: 0,
  estimated_rate: 75, estimated_value: 7500, required_date: '2026-05-05',
  schedule_qty: null, schedule_date: null, remarks: '',
  target_godown_id: 'gd-main', target_godown_name: 'Main Stores',
  is_stocked: true, stock_check_status: 'pending',
  store_action: null, store_actor_id: null, store_action_at: null,
  parent_indent_line_id: null, cascade_reason: null, ...over,
});

const sampleIndentInput = (): CreateMaterialIndentInput => ({
  entity_id: ENTITY,
  voucher_type_id: 'vt-material-indent',
  date: '2026-05-05', branch_id: 'main', division_id: 'default',
  originating_department_id: 'production', originating_department_name: 'Production',
  cost_center_id: 'cc-prod', category: 'raw_material', sub_type: 'general',
  priority: 'normal', requested_by_user_id: 'mobile-staff', requested_by_name: 'Mobile Staff',
  hod_user_id: 'hod-prod', project_id: null, preferred_vendor_id: null, payment_terms: null,
  lines: [mkLine()], parent_indent_id: null, cascade_reason: null,
  created_by: 'mobile-staff', updated_by: 'mobile-staff',
});

beforeEach(() => { localStorage.clear(); });

describe('Phase 1.2 Cross-Card Integration · 8-pre-3 · D-419', () => {
  // TEST 1 · Card #3 RequestX · Full state machine flow
  it('TEST 1 · RequestX createMaterialIndent → submitIndent → approveIndent (Card #3 state machine)', () => {
    const indent = createMaterialIndent(sampleIndentInput(), ENTITY);
    expect(indent.status).toBe('draft');

    const submitted = submitIndent(indent.id, 'material', ENTITY, 'hod-prod');
    expect(submitted).toBe(true);

    const approved = approveIndent(indent.id, 'material', 'mgr-1', 'department_head', ENTITY, 'approved');
    expect(approved).toBe(true);

    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored[0].status).toBe('approved');
    expect(stored[0].approval_history).toHaveLength(1);
    expect(stored[0].approval_history[0].action).toBe('approved');
  });

  // TEST 2 · Card #8 8-pre-2 · DRAFT-only cancellation lifecycle
  it('TEST 2 · cancelIndent DRAFT lifecycle (Card #8 D-410 · approval_history audit)', () => {
    const indent = createMaterialIndent(sampleIndentInput(), ENTITY);
    expect(indent.status).toBe('draft');

    const result = cancelIndent(indent.id, 'material', 'user-1', 'department_head', 'duplicate request', ENTITY);
    expect(result.ok).toBe(true);

    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored[0].status).toBe('cancelled');
    expect(stored[0].approval_history[0].action).toBe('cancelled');
    expect(stored[0].approval_history[0].remarks).toBe('duplicate request');

    const recancel = cancelIndent(indent.id, 'material', 'user-1', 'department_head', 'reason', ENTITY);
    expect(recancel.ok).toBe(false);
    expect(recancel.reason).toBe('already-cancelled');
  });

  // TEST 3 · Card #7 → Card #3 cross-card · Reorder → Indent promotion (D-385)
  it('TEST 3 · Store Hub reorder → promoteToIndent (Card #7 D-385 · cross-card)', () => {
    const suggestion: ReorderSuggestion = {
      item_id: 'steel-rod-12mm',
      item_name: 'Steel Rod 12mm',
      godown_id: 'gd-main',
      godown_name: 'Main Stores',
      current_balance: 50,
      reorder_level: 100,
      reorder_qty: 100,
      shortfall: 50,
      uom: 'kg',
      urgency: 'warning',
      safety_stock: 20,
    };
    const result = promoteReorderToIndent({
      suggestion,
      department_id: 'production',
      department_name: 'Production',
      notes: 'Auto-reorder from Store Hub D-298 panel',
      created_by: 'store-keeper',
    }, ENTITY);

    expect(result.ok).toBe(true);
    expect(result.indent_id).toBeTruthy();
    expect(result.voucher_no).toMatch(/^MI\/\d{4}\/\d+/);

    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored[0].reference_no).toMatch(/^REORDER:/);
  });

  // TEST 4 · Card #4 → Card #6 cross-card · GateFlow ↔ InwardReceipt linkage
  it('TEST 4 · GateFlow → InwardReceipt linkage (Card #4 → Card #6 via gateflow-inward-bridge)', () => {
    const irKey = inwardReceiptsKey(ENTITY);
    const ir = {
      id: 'ir-test-1', receipt_no: 'IR/2526/0001', entity_id: ENTITY,
      vendor_id: 'v1', vendor_name: 'Test Vendor', date: '2026-05-05',
      status: 'arrived', lines: [],
      gate_entry_id: 'gp-test-1', gate_entry_no: 'GP/2526/0001',
      created_at: '2026-05-05', created_by: 'sk', updated_at: '2026-05-05', updated_by: 'sk',
    };
    localStorage.setItem(irKey, JSON.stringify([ir]));

    const found = findInwardReceiptByGatePass('gp-test-1', ENTITY);
    expect(found).not.toBeNull();
    expect(found?.id).toBe('ir-test-1');
    expect(found?.gate_entry_id).toBe('gp-test-1');

    const notFound = findInwardReceiptByGatePass('gp-missing', ENTITY);
    expect(notFound).toBeNull();
  });

  // TEST 5 · Card #5 → Card #6 cross-card · QA-driven routing decision
  it('TEST 5 · QualiCheck routing decision flow (Card #5 → Card #6 via decideLineRouting)', () => {
    // Case A: QA plan attached → inspection_required
    const r1 = decideLineRouting({ expected_qty: 100, received_qty: 100, has_qa_plan: true });
    expect(r1.decision).toBe('inspection_required');

    // Case B: Full receipt + no QA plan → auto_release
    const r2 = decideLineRouting({ expected_qty: 100, received_qty: 100, has_qa_plan: false });
    expect(r2.decision).toBe('auto_release');

    // Case C: Over-receipt >5% (no QA plan) → quarantine
    const r3 = decideLineRouting({ expected_qty: 100, received_qty: 110, has_qa_plan: false });
    expect(r3.decision).toBe('quarantine');

    // Case D: Zero receipt → rejected
    const r4 = decideLineRouting({ expected_qty: 100, received_qty: 0, has_qa_plan: true });
    expect(r4.decision).toBe('rejected');
  });
});
