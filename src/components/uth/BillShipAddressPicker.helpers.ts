/**
 * BillShipAddressPicker.helpers.ts — Bill/Ship value type + empty constant
 * Sprint T-Phase-2.7-a · extracted from BillShipAddressPicker.tsx to satisfy
 *   react-refresh/only-export-components (lesson · 1.2.6d-hdr-fix).
 */

export interface BillShipValue {
  bill_to_address_id: string | null;
  bill_to_address_snapshot: string | null;
  bill_to_state_code: string | null;
  bill_to_gstin: string | null;
  ship_to_address_id: string | null;
  ship_to_address_snapshot: string | null;
  ship_to_state_code: string | null;
  ship_to_gstin: string | null;
}

export const EMPTY_BILL_SHIP: BillShipValue = {
  bill_to_address_id: null,
  bill_to_address_snapshot: null,
  bill_to_state_code: null,
  bill_to_gstin: null,
  ship_to_address_id: null,
  ship_to_address_snapshot: null,
  ship_to_state_code: null,
  ship_to_gstin: null,
};
