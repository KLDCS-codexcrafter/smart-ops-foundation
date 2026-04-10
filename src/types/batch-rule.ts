export interface BatchRule {
  id: string;
  rule_name: string;
  prefix: string;
  include_year: boolean;
  include_month: boolean;
  sequence_digits: number;
  fefo_enforcement: boolean;
  expiry_warning_days: number;
  qc_hold_on_receipt: boolean;
  is_default: boolean;
  is_active: boolean;
}

export const DEFAULT_BATCH_RULES: BatchRule[] = [
  {
    id: 'rule-001',
    rule_name: 'Default Batch Rule',
    prefix: 'BATCH',
    include_year: true,
    include_month: true,
    sequence_digits: 4,
    fefo_enforcement: true,
    expiry_warning_days: 30,
    qc_hold_on_receipt: false,
    is_default: true,
    is_active: true,
  },
];
