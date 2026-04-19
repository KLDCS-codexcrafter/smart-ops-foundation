/**
 * packing-slip.ts — Packing slip entity (operational document, not a FineCore voucher)
 * Auto-generated when a Delivery Note is posted.
 * [JWT] GET/POST /api/dispatch/packing-slips
 */

export interface PackingSlipLine {
  id: string;
  dln_line_id: string;
  item_id: string;
  item_code: string;
  item_name: string;
  qty: number;
  uom: string;
  godown_id: string;
  batch_id?: string | null;
  serial_ids?: string[] | null;
  full_cartons: number;
  loose_packs: number;
  total_gross_kg: number;
  total_volumetric_kg?: number;
  carton_dimensions?: { l: number; w: number; h: number; unit: 'cm' | 'inch' };
}

export type PackingSlipStatus = 'draft' | 'printed' | 'packed' | 'dispatched';

export interface PackingSlip {
  id: string;
  entity_id: string;
  dln_voucher_id: string;
  dln_voucher_no: string;
  dln_date: string;
  party_id?: string | null;
  party_name: string;
  ship_to_address: string;
  ship_to_city: string;
  ship_to_state: string;
  ship_to_pincode: string;
  lines: PackingSlipLine[];
  total_full_cartons: number;
  total_loose_packs: number;
  total_gross_kg: number;
  total_volumetric_kg: number;
  transporter_id?: string | null;
  transporter_name?: string | null;
  vehicle_no?: string;
  generated_at: string;
  generated_by: string;
  printed_count: number;
  status: PackingSlipStatus;
}

export const packingSlipsKey = (e: string) => `erp_packing_slips_${e}`;
