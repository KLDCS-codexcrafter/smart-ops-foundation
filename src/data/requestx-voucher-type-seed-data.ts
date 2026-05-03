/**
 * @file        requestx-voucher-type-seed-data.ts
 * @sprint      T-Phase-1.2.6f-pre-1
 * @purpose     Seed 3 RequestX voucher types (sibling to non-finecore registry · D-128 discipline).
 */
import type { NonFineCoreVoucherType, NonFineCoreVoucherFamily } from '@/lib/non-finecore-voucher-type-registry';

// 'request' family is added contextually here; registry uses string-typed family.
const REQUEST_FAMILY = 'request' as NonFineCoreVoucherFamily;

export const REQUESTX_VOUCHER_TYPE_SEEDS: NonFineCoreVoucherType[] = [
  {
    id: 'vt-material-indent',
    family: REQUEST_FAMILY,
    display_name: 'Material Indent',
    prefix: 'MI',
    is_default: true,
    is_active: true,
    approval_threshold_value: 10000,
    approval_role: 'department_head',
    field_rules: [
      { field_path: 'originating_department_id', field_label: 'Department', rule: 'mandatory', enforce_on: 'always' },
      { field_path: 'lines[].required_date', field_label: 'Required Date', rule: 'mandatory', enforce_on: 'posted' },
      { field_path: 'priority', field_label: 'Priority', rule: 'mandatory', enforce_on: 'posted' },
      { field_path: 'lines[].is_stocked', field_label: 'Stocked Item Flag', rule: 'mandatory', enforce_on: 'always' },
      { field_path: 'lines[].target_godown_id', field_label: 'Target Godown', rule: 'mandatory', enforce_on: 'always' },
    ],
  },
  {
    id: 'vt-service-request',
    family: REQUEST_FAMILY,
    display_name: 'Service Request',
    prefix: 'SR',
    is_default: true,
    is_active: true,
    approval_threshold_value: 10000,
    approval_role: 'department_head',
    field_rules: [
      { field_path: 'originating_department_id', field_label: 'Department', rule: 'mandatory', enforce_on: 'always' },
      { field_path: 'service_track', field_label: 'Service Track', rule: 'mandatory', enforce_on: 'always' },
      { field_path: 'lines[].sla_days', field_label: 'SLA Days', rule: 'mandatory', enforce_on: 'posted' },
    ],
  },
  {
    id: 'vt-capital-indent',
    family: REQUEST_FAMILY,
    display_name: 'Capital Indent',
    prefix: 'CAP',
    is_default: true,
    is_active: true,
    approval_threshold_value: 1,
    approval_role: 'finance_head',
    field_rules: [
      { field_path: 'originating_department_id', field_label: 'Department', rule: 'mandatory', enforce_on: 'always' },
      { field_path: 'lines[].is_stocked', field_label: 'Stocked Capital Flag', rule: 'mandatory', enforce_on: 'always' },
      { field_path: 'lines[].cwip_account_id', field_label: 'CWIP Account', rule: 'mandatory', enforce_on: 'posted' },
    ],
  },
];
