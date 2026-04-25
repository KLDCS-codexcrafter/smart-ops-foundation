/**
 * @file     TargetMaster.types.ts
 * @purpose  SalesTarget interface and `targetsKey` storage-key getter extracted
 *           from TargetMaster.tsx to satisfy react-refresh/only-export-components.
 *           D-127 storage-key preservation: template literal `erp_sam_targets_${e}`
 *           is preserved BYTES-IDENTICALLY from the original site.
 * @who      Operix Engineering
 * @when     Apr-2026
 * @sprint   T-H1.5-Z-Cleanup-1c-a
 * @iso      Maintainability (HIGH+ component file scope cleaned)
 *           Compatibility (HIGH+ storage key invariant preserved)
 * @whom     TargetMaster.tsx · SalesX target-consuming reports/dashboards
 * @depends  none
 */
export interface SalesTarget {
  id: string;
  entity_id: string;
  financial_year: string;
  target_type: 'company' | 'salesman' | 'agent';
  person_id: string | null;
  person_name: string | null;
  period: 'monthly' | 'quarterly' | 'annual';
  period_label: string;
  dimension: 'sales_value' | 'collection' | 'new_customers' | 'order_volume';
  target_value: number;
  stock_group_id: string | null;
  stock_group_name: string | null;
  territory: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// D-127 — storage-key template preserved bytes-identical to the original.
export const targetsKey = (e: string) => `erp_sam_targets_${e}`;
