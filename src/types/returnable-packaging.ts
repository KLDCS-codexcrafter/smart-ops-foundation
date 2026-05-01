/**
 * returnable-packaging.ts — Track packaging units sent with goods that need return.
 * Sprint T-Phase-1.2.5
 */

export type PackagingKind =
  | 'pallet' | 'drum' | 'crate' | 'cylinder'
  | 'tooling_box' | 'display_unit' | 'other';

export type PackagingStatus =
  | 'in_stock' | 'with_customer' | 'returned' | 'damaged' | 'lost';

export interface ReturnablePackaging {
  id: string;
  entity_id: string;
  unit_no: string;
  kind: PackagingKind;
  description: string;

  acquisition_cost: number;
  expected_lifetime_cycles: number | null;
  current_cycle_count: number;

  status: PackagingStatus;
  current_location: string | null;
  current_godown_id: string | null;
  current_customer_id: string | null;

  sent_with_dln_id: string | null;
  sent_to_customer_id: string | null;
  sent_to_customer_name: string | null;
  sent_at: string | null;
  return_due_date: string | null;

  returned_at: string | null;
  return_grn_id: string | null;
  return_condition: 'good' | 'damaged' | 'requires_repair' | null;

  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const returnablePackagingKey = (entityCode: string): string =>
  `erp_returnable_packaging_${entityCode}`;

export const PACKAGING_KIND_LABELS: Record<PackagingKind, string> = {
  pallet: 'Pallet',
  drum: 'Drum',
  crate: 'Crate',
  cylinder: 'Gas Cylinder',
  tooling_box: 'Tooling Box',
  display_unit: 'Display Unit',
  other: 'Other',
};

export const PACKAGING_STATUS_LABELS: Record<PackagingStatus, string> = {
  in_stock:      'In Stock',
  with_customer: 'With Customer',
  returned:      'Returned',
  damaged:       'Damaged',
  lost:          'Lost',
};
