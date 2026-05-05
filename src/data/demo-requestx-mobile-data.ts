/**
 * @file        demo-requestx-mobile-data.ts
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block F · D-408
 * @purpose     Demo seed for RequestX mobile flow first-run experience.
 */
import type { MaterialIndent, MaterialIndentLine } from '@/types/material-indent';

const today = (): string => new Date().toISOString().slice(0, 10);
const isoMinus = (ms: number): string => new Date(Date.now() - ms).toISOString();

const line = (over: Partial<MaterialIndentLine>): MaterialIndentLine => ({
  id: 'mil-x', line_no: 1, item_id: 'item-x', item_name: 'Item', description: '', uom: 'nos',
  qty: 0, current_stock_qty: 0, estimated_rate: 0, estimated_value: 0, required_date: today(),
  schedule_qty: null, schedule_date: null, remarks: '', target_godown_id: 'gd-main',
  target_godown_name: 'Main Stores', is_stocked: true, stock_check_status: 'pending',
  store_action: null, store_actor_id: null, store_action_at: null,
  parent_indent_line_id: null, cascade_reason: null, ...over,
});

export const DEMO_REQUESTX_MOBILE_INDENTS: Omit<MaterialIndent, 'entity_id'>[] = [
  {
    id: 'mi-demo-mobile-1',
    voucher_type_id: 'vt-material-indent',
    voucher_no: 'MI/2526/D001',
    date: today(),
    branch_id: 'branch-default',
    division_id: 'div-default',
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
    lines: [line({ id: 'mil-d1', item_id: 'steel-rod', item_name: 'Steel Rod 12mm', uom: 'kg', qty: 100, estimated_rate: 75, estimated_value: 7500, remarks: 'IS 1786 grade', description: 'IS 1786 grade' })],
    total_estimated_value: 7500,
    status: 'draft',
    approval_tier: 1,
    pending_approver_user_id: null,
    approval_history: [],
    parent_indent_id: null,
    cascade_reason: null,
    created_at: isoMinus(3600000),
    created_by: 'mobile-staff',
    updated_at: isoMinus(3600000),
    updated_by: 'mobile-staff',
  },
  {
    id: 'mi-demo-mobile-2',
    voucher_type_id: 'vt-material-indent',
    voucher_no: 'MI/2526/D002',
    date: today(),
    branch_id: 'branch-default',
    division_id: 'div-default',
    originating_department_id: 'maintenance',
    originating_department_name: 'Maintenance',
    cost_center_id: 'cc-maint',
    category: 'electrical',
    sub_type: 'general',
    priority: 'urgent',
    requested_by_user_id: 'mobile-staff',
    requested_by_name: 'Mobile Staff',
    hod_user_id: 'hod-maint',
    project_id: null,
    preferred_vendor_id: null,
    payment_terms: null,
    lines: [line({ id: 'mil-d2', item_id: 'bearing-skf', item_name: 'SKF Bearing 6203', uom: 'nos', qty: 5, estimated_rate: 450, estimated_value: 2250, remarks: 'urgent · machine down', description: 'urgent · machine down' })],
    total_estimated_value: 2250,
    status: 'pending_hod',
    approval_tier: 1,
    pending_approver_user_id: 'hod-maint',
    approval_history: [],
    parent_indent_id: null,
    cascade_reason: null,
    created_at: isoMinus(7200000),
    created_by: 'mobile-staff',
    updated_at: isoMinus(7200000),
    updated_by: 'mobile-staff',
  },
];
