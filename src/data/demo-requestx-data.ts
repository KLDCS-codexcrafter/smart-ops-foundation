/**
 * @file        demo-requestx-data.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Demo seed data for RequestX (Material/Service/Capital indents).
 *              Optional · used by entity setup when autoSeedDemo === true.
 * @[JWT]       POST /api/requestx/demo-seed
 */
import type { MaterialIndent } from '@/types/material-indent';
import type { ServiceRequest } from '@/types/service-request';
import type { CapitalIndent } from '@/types/capital-indent';

const now = new Date().toISOString();

export const DEMO_MATERIAL_INDENTS: MaterialIndent[] = [
  {
    id: 'mi-demo-001',
    entity_id: '',
    voucher_type_id: 'vt-material-indent',
    voucher_no: 'MI/2026/0001',
    date: '2026-04-02',
    branch_id: '', division_id: '',
    originating_department_id: 'dept-production',
    originating_department_name: 'Production',
    cost_center_id: '',
    category: 'raw_material',
    sub_type: 'standard',
    priority: 'normal',
    requested_by_user_id: 'demo-user',
    requested_by_name: 'Production Supervisor',
    hod_user_id: 'demo-hod',
    project_id: null,
    preferred_vendor_id: null,
    payment_terms: null,
    lines: [
      {
        id: 'mil-001', line_no: 1, item_id: 'item-001',
        item_name: 'Mild Steel Rod 12mm', description: 'Construction grade',
        uom: 'KG', qty: 500, current_stock_qty: 100, estimated_rate: 75,
        estimated_value: 37500, required_date: '2026-04-15',
        schedule_qty: null, schedule_date: null, remarks: '',
        target_godown_id: 'gd-main', target_godown_name: 'Main Store',
        is_stocked: true, stock_check_status: 'partial',
        store_action: null, store_actor_id: null, store_action_at: null,
        parent_indent_line_id: null, cascade_reason: null,
      },
    ],
    total_estimated_value: 37500,
    status: 'submitted',
    approval_tier: 1,
    pending_approver_user_id: 'demo-hod',
    approval_history: [],
    parent_indent_id: null,
    cascade_reason: null,
    created_at: now, created_by: 'demo-seed',
    updated_at: now, updated_by: 'demo-seed',
  },
];

export const DEMO_SERVICE_REQUESTS: ServiceRequest[] = [
  {
    id: 'sr-demo-001',
    entity_id: '',
    voucher_type_id: 'vt-service-request',
    voucher_no: 'SR/2026/0001',
    date: '2026-04-04',
    branch_id: '', division_id: '',
    originating_department_id: 'dept-maintenance',
    originating_department_name: 'Maintenance',
    cost_center_id: '',
    category: 'maintenance',
    sub_type: 'breakdown',
    priority: 'high',
    service_track: 'direct_po',
    vendor_id: null,
    requested_by_user_id: 'demo-user',
    requested_by_name: 'Maintenance Officer',
    hod_user_id: 'demo-hod',
    project_id: null,
    lines: [
      {
        id: 'srl-001', line_no: 1, service_id: 'svc-001',
        service_name: 'Compressor Repair', description: 'Air compressor breakdown',
        qty: 1, uom: 'JOB', estimated_rate: 25000, estimated_value: 25000,
        required_date: '2026-04-08', sla_days: 4, remarks: 'Urgent',
      },
    ],
    total_estimated_value: 25000,
    status: 'submitted',
    approval_tier: 2,
    pending_approver_user_id: 'demo-hod',
    approval_history: [],
    created_at: now, created_by: 'demo-seed',
    updated_at: now, updated_by: 'demo-seed',
  },
];

export const DEMO_CAPITAL_INDENTS: CapitalIndent[] = [
  {
    id: 'ci-demo-001',
    entity_id: '',
    voucher_type_id: 'vt-capital-indent',
    voucher_no: 'CAP/2026/0001',
    date: '2026-04-06',
    branch_id: '', division_id: '',
    originating_department_id: 'dept-it',
    originating_department_name: 'Information Technology',
    cost_center_id: '',
    capital_sub_type: 'computer',
    priority: 'normal',
    requested_by_user_id: 'demo-user',
    requested_by_name: 'IT Manager',
    hod_user_id: 'demo-hod',
    project_id: null,
    preferred_vendor_id: null,
    lines: [
      {
        id: 'cil-001', line_no: 1, item_id: 'asset-001',
        item_name: 'Workstation Laptop', description: 'Dev machine',
        uom: 'NOS', qty: 5, current_stock_qty: 0, estimated_rate: 90000,
        estimated_value: 450000, required_date: '2026-04-30',
        schedule_qty: null, schedule_date: null, remarks: '',
        target_godown_id: '', target_godown_name: '',
        is_stocked: false, stock_check_status: 'pending',
        store_action: null, store_actor_id: null, store_action_at: null,
        parent_indent_line_id: null,
        fixed_asset_pre_link_pending: true,
        cwip_account_id: 'cwip-it-equip',
        expected_useful_life_years: 3,
        depreciation_method: 'wdv',
      },
    ],
    total_estimated_value: 450000,
    status: 'pending_finance',
    approval_tier: 3,
    pending_approver_user_id: 'demo-finance-head',
    approval_history: [],
    finance_gate_required: true,
    parent_indent_id: null,
    cascade_reason: null,
    created_at: now, created_by: 'demo-seed',
    updated_at: now, updated_by: 'demo-seed',
  },
];
