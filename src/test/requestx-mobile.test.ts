/**
 * @file        requestx-mobile.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block H
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMaterialIndent, approveIndent, rejectIndent, submitIndent, type CreateMaterialIndentInput } from '@/lib/request-engine';
import { materialIndentsKey, type MaterialIndentLine } from '@/types/material-indent';

const ENTITY = 'TEST-CARD8P1';

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

const sampleInput = (): CreateMaterialIndentInput => ({
  entity_id: ENTITY,
  voucher_type_id: 'vt-material-indent',
  date: '2026-05-05',
  branch_id: 'main',
  division_id: 'default',
  originating_department_id: 'production',
  originating_department_name: 'Production',
  cost_center_id: 'cc-prod',
  category: 'raw_material',
  sub_type: 'general',
  priority: 'normal',
  requested_by_user_id: 'mobile-staff',
  requested_by_name: 'Mobile Staff',
  hod_user_id: 'hod-prod',
  project_id: null,
  preferred_vendor_id: null,
  payment_terms: null,
  lines: [mkLine()],
  parent_indent_id: null,
  cascade_reason: null,
  created_by: 'mobile-staff',
  updated_by: 'mobile-staff',
});

beforeEach(() => { localStorage.clear(); });

describe('Card #8 8-pre-1 · RequestX Mobile Foundation', () => {
  it('createMaterialIndent from mobile capture creates DRAFT (D-403)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    expect(indent.status).toBe('draft');
    expect(indent.voucher_no).toMatch(/^MI\/\d{4}\/\d+/);
    expect(indent.total_estimated_value).toBe(7500);
    expect(indent.approval_tier).toBe(1);
  });

  it('createMaterialIndent persists to localStorage with entity-scoped key (D-408)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored).toHaveLength(1);
    expect(stored[0].id).toBe(indent.id);
  });

  it('approveIndent transitions pending → approved with audit trail (D-405)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    submitIndent(indent.id, 'material', ENTITY, 'hod-prod');
    const ok = approveIndent(indent.id, 'material', 'mobile-approver', 'department_head', ENTITY, 'looks good');
    expect(ok).toBe(true);
    const after = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(after[0].status).toBe('approved');
    expect(after[0].approval_history).toHaveLength(1);
    expect(after[0].approval_history[0].action).toBe('approved');
  });

  it('rejectIndent transitions pending → rejected with reason (D-405)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    submitIndent(indent.id, 'material', ENTITY, 'hod-prod');
    const ok = rejectIndent(indent.id, 'material', 'mobile-approver', 'department_head', 'budget exceeded', ENTITY);
    expect(ok).toBe(true);
    const after = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(after[0].status).toBe('rejected');
  });

  it('approveIndent rejects if state machine forbids (closed indents)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    const list = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    list[0].status = 'closed';
    localStorage.setItem(materialIndentsKey(ENTITY), JSON.stringify(list));
    const ok = approveIndent(indent.id, 'material', 'mobile-approver', 'department_head', ENTITY);
    expect(ok).toBe(false);
  });
});
