export interface CompanySettings {
  id: string;
  entity_id: string;
  // MRP Tax Setting — set during company creation
  mrp_tax_treatment: 'inclusive' | 'exclusive';
  mrp_tax_treatment_label: string; // 'Tax Inclusive (MRP includes GST)' etc.
  // Rate change settings
  rate_change_requires_reason: boolean; // always true — enforced in UI
  // Currency
  base_currency: 'INR' | 'USD' | 'EUR';
  // Stock valuation
  default_costing_method: string;
  created_at: string;
  updated_at: string;
}
