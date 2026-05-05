/**
 * @file        requestx-cancel.test.ts
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-2 · Block F · D-410
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { createMaterialIndent, createServiceRequest, cancelIndent, submitIndent, type CreateMaterialIndentInput, type CreateServiceRequestInput } from '@/lib/request-engine';
import { materialIndentsKey, type MaterialIndentLine } from '@/types/material-indent';

const ENTITY = 'TEST-CARD8P2';

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
  date: '2026-05-05', branch_id: 'main', division_id: 'default',
  originating_department_id: 'production', originating_department_name: 'Production',
  cost_center_id: 'cc-prod', category: 'raw_material', sub_type: 'general',
  priority: 'normal', requested_by_user_id: 'mobile-staff', requested_by_name: 'Mobile Staff',
  hod_user_id: 'hod-prod', project_id: null, preferred_vendor_id: null, payment_terms: null,
  lines: [mkLine()], parent_indent_id: null, cascade_reason: null,
  created_by: 'mobile-staff', updated_by: 'mobile-staff',
});

beforeEach(() => { localStorage.clear(); });

describe('Card #8 8-pre-2 · cancelIndent (D-410)', () => {
  it('cancelIndent from DRAFT succeeds + pushes ApprovalEvent to history', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    const result = cancelIndent(indent.id, 'material', 'user-1', 'department_head', 'no longer needed', ENTITY);
    expect(result.ok).toBe(true);
    const stored = JSON.parse(localStorage.getItem(materialIndentsKey(ENTITY)) ?? '[]');
    expect(stored[0].status).toBe('cancelled');
    expect(stored[0].approval_history).toHaveLength(1);
    expect(stored[0].approval_history[0].action).toBe('cancelled');
    expect(stored[0].approval_history[0].remarks).toBe('no longer needed');
  });

  it('cancelIndent rejects non-DRAFT (D-128 boundary respect)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    submitIndent(indent.id, 'material', ENTITY, 'hod-prod');
    const result = cancelIndent(indent.id, 'material', 'user-1', 'department_head', 'reason', ENTITY);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cancel-only-allowed-for-draft');
  });

  it('cancelIndent requires non-empty reason (Q5=a · validation)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    const result = cancelIndent(indent.id, 'material', 'user-1', 'department_head', '   ', ENTITY);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cancel-reason-required');
  });

  it('cancelIndent enforces max reason length (500 chars · Q5=a)', () => {
    const indent = createMaterialIndent(sampleInput(), ENTITY);
    const longReason = 'x'.repeat(501);
    const result = cancelIndent(indent.id, 'material', 'user-1', 'department_head', longReason, ENTITY);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe('cancel-reason-too-long');
  });

  it('cancelIndent supports all 3 IndentKind via keyFor helper', () => {
    const mat = createMaterialIndent(sampleInput(), ENTITY);
    const matResult = cancelIndent(mat.id, 'material', 'user-1', 'department_head', 'duplicate', ENTITY);
    expect(matResult.ok).toBe(true);

    const srvInput: CreateServiceRequestInput = {
      entity_id: ENTITY,
      voucher_type_id: 'vt-service-request',
      date: '2026-05-05', branch_id: 'main', division_id: 'default',
      originating_department_id: 'maintenance', originating_department_name: 'Maintenance',
      cost_center_id: 'cc-maint', category: 'maintenance', sub_type: 'amc',
      priority: 'normal', service_track: 'standard_enquiry', vendor_id: null,
      requested_by_user_id: 'mobile-staff', requested_by_name: 'Mobile Staff',
      hod_user_id: 'hod-maint', project_id: null,
      lines: [{
        id: 'srl-1', line_no: 1, service_id: 'svc-1', service_name: 'Cleaning',
        description: '', uom: 'job', qty: 1, estimated_rate: 1000, estimated_value: 1000,
        required_date: '2026-05-05', sla_days: 7, remarks: '',
      }],
      created_by: 'mobile-staff', updated_by: 'mobile-staff',
    };
    const srv = createServiceRequest(srvInput, ENTITY);
    const srvResult = cancelIndent(srv.id, 'service', 'user-1', 'department_head', 'no longer needed', ENTITY);
    expect(srvResult.ok).toBe(true);

    const nfResult = cancelIndent('non-existent', 'capital', 'user-1', 'department_head', 'reason', ENTITY);
    expect(nfResult.ok).toBe(false);
    expect(nfResult.reason).toBe('not-found');
  });
});
