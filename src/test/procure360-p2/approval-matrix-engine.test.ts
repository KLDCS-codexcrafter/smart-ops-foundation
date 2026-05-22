/**
 * @file        approval-matrix-engine.test.ts
 * @sprint      T-Phase-2.HK-5 · Block A · D-NEW-GK
 * @purpose     21st SIBLING engine coverage · approval routing + recording + isPoFullyApproved
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  findApplicableTemplate,
  routeForApproval,
  recordApproval,
  listApprovalsForPO,
  isPoFullyApproved,
  listPosAwaitingApproval,
} from '@/lib/approval-matrix-engine';
import { approvalMatrixTemplatesKey } from '@/types/approval-matrix-template';
import type { ApprovalMatrixTemplate } from '@/types/approval-matrix-template';
import type { PurchaseOrderRecord } from '@/types/po';
import { purchaseOrdersKey } from '@/types/po';

const ENTITY = 'TEST-HK5-A';

const mkTemplate = (overrides: Partial<ApprovalMatrixTemplate> = {}): ApprovalMatrixTemplate => ({
  id: 't1',
  entity_id: ENTITY,
  voucher_kind: 'po',
  name: 'PO Standard',
  is_default: true,
  is_active: true,
  tiers: [
    {
      tier_no: 1,
      threshold_min: 0,
      threshold_max: 50000,
      required_approvals: [{ role: 'HOD', is_mandatory: true, avg_response_hours: 4 }],
    },
    {
      tier_no: 2,
      threshold_min: 50001,
      threshold_max: 500000,
      required_approvals: [
        { role: 'HOD', is_mandatory: true, avg_response_hours: 4 },
        { role: 'Finance', is_mandatory: true, avg_response_hours: 8 },
      ],
    },
  ],
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

const mkPo = (overrides: Partial<PurchaseOrderRecord> = {}): PurchaseOrderRecord => ({
  id: 'PO-1',
  po_no: 'PO/2026/0001',
  po_date: '2026-05-22',
  entity_id: ENTITY,
  branch_id: null,
  division_id: null,
  department_id: null,
  cost_center_id: null,
  source_quotation_id: 'Q1',
  source_enquiry_id: 'E1',
  vendor_id: 'V1',
  vendor_name: 'Acme',
  lines: [],
  total_basic_value: 100000,
  total_tax_value: 18000,
  total_after_tax: 118000,
  expected_delivery_date: '2026-06-22',
  delivery_address: 'Mumbai',
  approved_by_user_id: null,
  approved_at: null,
  status: 'pending_approval',
  followups: [],
  notes: '',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
});

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('approval-matrix-engine · findApplicableTemplate', () => {
  it('returns null when no templates exist', () => {
    expect(findApplicableTemplate(ENTITY, 'po', 100000).template).toBeNull();
  });

  it('matches voucher_kind exactly', () => {
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([mkTemplate()]));
    const { template } = findApplicableTemplate(ENTITY, 'po', 100000);
    expect(template?.id).toBe('t1');
  });

  it('matches "all" voucher_kind', () => {
    localStorage.setItem(
      approvalMatrixTemplatesKey(ENTITY),
      JSON.stringify([mkTemplate({ voucher_kind: 'all' })]),
    );
    expect(findApplicableTemplate(ENTITY, 'po', 100000).template?.id).toBe('t1');
  });

  it('ignores inactive templates', () => {
    localStorage.setItem(
      approvalMatrixTemplatesKey(ENTITY),
      JSON.stringify([mkTemplate({ is_active: false })]),
    );
    expect(findApplicableTemplate(ENTITY, 'po', 100000).template).toBeNull();
  });

  it('prefers is_default template', () => {
    const t1 = mkTemplate({ id: 'a', is_default: false });
    const t2 = mkTemplate({ id: 'b', is_default: true });
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([t1, t2]));
    expect(findApplicableTemplate(ENTITY, 'po', 100000).template?.id).toBe('b');
  });

  it('returns tier matching amount', () => {
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([mkTemplate()]));
    expect(findApplicableTemplate(ENTITY, 'po', 100000).tier?.tier_no).toBe(2);
    expect(findApplicableTemplate(ENTITY, 'po', 10000).tier?.tier_no).toBe(1);
  });

  it('returns null tier when amount exceeds all thresholds', () => {
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([mkTemplate()]));
    expect(findApplicableTemplate(ENTITY, 'po', 9999999).tier).toBeNull();
  });

  it('filters by rate_contract voucher_kind', () => {
    localStorage.setItem(
      approvalMatrixTemplatesKey(ENTITY),
      JSON.stringify([mkTemplate({ voucher_kind: 'rate_contract' })]),
    );
    expect(findApplicableTemplate(ENTITY, 'po', 100000).template).toBeNull();
    expect(findApplicableTemplate(ENTITY, 'rate_contract', 100000).template?.id).toBe('t1');
  });
});

describe('approval-matrix-engine · routeForApproval', () => {
  it('returns no_template when PO missing', () => {
    const r = routeForApproval(ENTITY, 'nope');
    expect(r.status).toBe('no_template');
  });

  it('routes to tier 2 for ₹1L PO', () => {
    localStorage.setItem(purchaseOrdersKey(ENTITY), JSON.stringify([mkPo()]));
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([mkTemplate()]));
    const r = routeForApproval(ENTITY, 'PO-1');
    expect(r.status).toBe('awaiting_approval');
    expect(r.applicable_tier?.tier_no).toBe(2);
    expect(r.required_approvers).toHaveLength(2);
  });

  it('auto_approve_below_threshold when amount exceeds all tiers', () => {
    localStorage.setItem(
      purchaseOrdersKey(ENTITY),
      JSON.stringify([mkPo({ total_basic_value: 9999999 })]),
    );
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([mkTemplate()]));
    expect(routeForApproval(ENTITY, 'PO-1').status).toBe('auto_approve_below_threshold');
  });
});

describe('approval-matrix-engine · record + isPoFullyApproved', () => {
  beforeEach(() => {
    localStorage.setItem(purchaseOrdersKey(ENTITY), JSON.stringify([mkPo()]));
    localStorage.setItem(approvalMatrixTemplatesKey(ENTITY), JSON.stringify([mkTemplate()]));
  });

  it('isPoFullyApproved false when no records', () => {
    expect(isPoFullyApproved(ENTITY, 'PO-1')).toBe(false);
  });

  it('isPoFullyApproved false with only one mandatory role recorded', () => {
    recordApproval(ENTITY, 'PO-1', 'HOD');
    expect(isPoFullyApproved(ENTITY, 'PO-1')).toBe(false);
  });

  it('isPoFullyApproved true when all mandatory roles recorded', () => {
    recordApproval(ENTITY, 'PO-1', 'HOD');
    recordApproval(ENTITY, 'PO-1', 'Finance');
    expect(isPoFullyApproved(ENTITY, 'PO-1')).toBe(true);
  });

  it('listApprovalsForPO returns recorded approvals', () => {
    recordApproval(ENTITY, 'PO-1', 'HOD', 'looks good');
    const records = listApprovalsForPO(ENTITY, 'PO-1');
    expect(records).toHaveLength(1);
    expect(records[0].notes).toBe('looks good');
  });

  it('listPosAwaitingApproval surfaces unapproved pending POs', () => {
    expect(listPosAwaitingApproval(ENTITY)).toHaveLength(1);
    recordApproval(ENTITY, 'PO-1', 'HOD');
    recordApproval(ENTITY, 'PO-1', 'Finance');
    expect(listPosAwaitingApproval(ENTITY)).toHaveLength(0);
  });
});
