/**
 * fixed-asset.ts — Fixed Asset types for FC Sprint 4
 * AssetUnitRecord, DepreciationEntry, ITActBlock, AssetUnitLine, AMCScheduleEntry
 * [JWT] Replace with GET/POST /api/fixed-assets/*
 */

export type ITActBlock =
  | 'Building'
  | 'Plant & Machinery'
  | 'Computers & Software'
  | 'Vehicles'
  | 'Furniture & Fixtures'
  | 'Intangibles'
  | 'Others';

export const IT_ACT_RATES: Record<ITActBlock, number> = {
  'Building': 10,
  'Plant & Machinery': 15,
  'Computers & Software': 40,
  'Vehicles': 15,
  'Furniture & Fixtures': 10,
  'Intangibles': 25,
  'Others': 15,
};

export const IT_ACT_BLOCK_LABELS: Record<ITActBlock, string> = {
  'Building': 'Building (10% WDV)',
  'Plant & Machinery': 'Plant & Machinery (15% WDV)',
  'Computers & Software': 'Computers & Software (40% WDV)',
  'Vehicles': 'Vehicles (15% WDV)',
  'Furniture & Fixtures': 'Furniture & Fixtures (10% WDV)',
  'Intangibles': 'Intangibles (25% WDV)',
  'Others': 'Others (15% WDV)',
};

export type AssetUnitStatus = 'active' | 'cwip' | 'disposed' | 'written_off' | 'transferred';

export interface AssetUnitRecord {
  id: string;
  entity_id: string;
  item_id: string;
  item_name: string;
  ledger_definition_id: string;
  ledger_name: string;
  asset_id: string;           // e.g. PPE/25-26/001
  asset_id_prefix: string;
  asset_id_suffix: string;
  asset_id_seq: number;
  gross_block_cost: number;
  salvage_value: number;
  accumulated_depreciation: number;
  net_book_value: number;
  opening_wdv: number;
  purchase_date: string;
  put_to_use_date: string;
  it_act_block: ITActBlock;
  it_act_depr_rate: number;
  location: string;
  department: string;
  custodian_name: string;
  status: AssetUnitStatus;
  capital_purchase_voucher_id: string;
  disposal_voucher_id?: string;
  warranty_expiry?: string;
  insurance_expiry?: string;
  amc_expiry?: string;
  hr_asset_id?: string;
  asset_tag_id?: string;
  expense_history?: Array<{
    id: string;
    voucher_id: string;
    date: string;
    amount: number;
    description: string;
  }>;
  created_at: string;
  updated_at: string;
}

export interface DepreciationEntry {
  id: string;
  entity_id: string;
  asset_unit_id: string;
  asset_id: string;
  ledger_definition_id: string;
  fy: string;
  period_from: string;
  period_to: string;
  method: 'slm' | 'wdv';
  opening_wdv: number;
  rate_applied: number;
  is_half_rate: boolean;
  depreciation_amount: number;
  closing_wdv: number;
  journal_id?: string;
  status: 'computed' | 'posted' | 'cancelled';
  created_at: string;
}

export interface AssetUnitLine {
  item_id: string;
  item_name: string;
  ledger_definition_id: string;
  asset_id_prefix: string;
  asset_id_suffix: string;
  asset_id_from: number;
  asset_id_count: number;
  location: string;
  department: string;
  custodian_name: string;
  cost_per_unit: number;
  salvage_value: number;
  it_act_block: ITActBlock;
  put_to_use_date?: string;
}

export interface AMCScheduleEntry {
  id: string;
  asset_unit_id: string;
  asset_id: string;
  vendor_name: string;
  contract_ref: string;
  start_date: string;
  end_date: string;
  amount: number;
  frequency: 'monthly' | 'quarterly' | 'half_yearly' | 'annual';
  last_service_date: string;
  next_service_date: string;
  status: 'active' | 'expired' | 'cancelled';
  notes: string;
}

export interface ITActReportRow {
  block: ITActBlock;
  rate: number;
  opening_wdv: number;
  additions_gt_180: number;
  additions_lt_180: number;
  wdv_plus_gt180: number;
  total: number;
  depr_full_rate: number;
  depr_half_rate: number;
  total_depreciation: number;
  closing_wdv: number;
}

export interface CompaniesActRow {
  ledger_name: string;
  gross_opening: number;
  additions: number;
  disposals: number;
  gross_closing: number;
  accum_opening: number;
  current_depr: number;
  accum_closing: number;
  net_block: number;
}

export const faUnitsKey = (e: string) => `erp_fa_units_${e}`;
export const faDeprKey = (e: string) => `erp_fa_depreciation_${e}`;
