export interface CompanySettings {
  id: string;
  entity_id: string;
  // MRP Tax Setting — set during company creation
  mrp_tax_treatment: 'inclusive' | 'exclusive';
  mrp_tax_treatment_label: string; // 'Tax Inclusive (MRP includes GST)' etc.
  // Rate change settings
  rate_change_requires_reason: boolean; // always true — enforced in UI
  // Currency
  base_currency: string;  // ISO code — dynamic from erp_currencies
  /**
   * [Precision Arc · Stage 1] Entity-level money decimal-places override.
   * null = inherit from base_currency's decimal_places (RC-2 option c).
   * A non-null value is this entity's explicit override.
   */
  money_decimal_places: number | null;
  // Stock valuation
  default_costing_method: string;
  /**
   * Sprint W1C-5 · Block 3 · audit B-02
   * When true, stock-issue OUT lines may exceed available qty (override is audit-logged).
   * Default false (absent) = strict availability guard throws on shortage.
   */
  allow_negative_stock?: boolean;
  created_at: string;
  updated_at: string;
}
