/**
 * place-of-supply-engine.ts — Section 10 IGST Act PoS determination
 * Sprint T-Phase-2.7-a · Q1-a · ship-to drives PoS for goods.
 *
 * STATE_CODE_NAMES: 36 Indian states/UTs + 97 (OIDAR) + 99 (Centre).
 * determinePlaceOfSupply: input ship-to state_code (preferred) or bill-to state_code fallback.
 * [JWT] Pure engine · no I/O.
 */

/** 2-digit state code → name. */
export const STATE_CODE_NAMES: Record<string, string> = {
  '01': 'Jammu and Kashmir',
  '02': 'Himachal Pradesh',
  '03': 'Punjab',
  '04': 'Chandigarh',
  '05': 'Uttarakhand',
  '06': 'Haryana',
  '07': 'Delhi',
  '08': 'Rajasthan',
  '09': 'Uttar Pradesh',
  '10': 'Bihar',
  '11': 'Sikkim',
  '12': 'Arunachal Pradesh',
  '13': 'Nagaland',
  '14': 'Manipur',
  '15': 'Mizoram',
  '16': 'Tripura',
  '17': 'Meghalaya',
  '18': 'Assam',
  '19': 'West Bengal',
  '20': 'Jharkhand',
  '21': 'Odisha',
  '22': 'Chhattisgarh',
  '23': 'Madhya Pradesh',
  '24': 'Gujarat',
  '25': 'Daman and Diu',
  '26': 'Dadra and Nagar Haveli',
  '27': 'Maharashtra',
  '28': 'Andhra Pradesh (Old)',
  '29': 'Karnataka',
  '30': 'Goa',
  '31': 'Lakshadweep',
  '32': 'Kerala',
  '33': 'Tamil Nadu',
  '34': 'Puducherry',
  '35': 'Andaman and Nicobar Islands',
  '36': 'Telangana',
  '37': 'Andhra Pradesh',
  '97': 'Other Territory',
  '99': 'Centre Jurisdiction',
};

export interface PlaceOfSupplyResult {
  state_code: string;
  state_name: string;
  is_interstate: boolean;
  source: 'ship_to' | 'bill_to' | 'unknown';
}

/** Section 10 IGST Act: ship-to drives PoS for goods movement. */
export function determinePlaceOfSupply(
  supplier_state_code: string | null | undefined,
  ship_to_state_code: string | null | undefined,
  bill_to_state_code: string | null | undefined,
): PlaceOfSupplyResult {
  const supplier = (supplier_state_code ?? '').trim().padStart(2, '0');
  const ship = (ship_to_state_code ?? '').trim();
  const bill = (bill_to_state_code ?? '').trim();
  let chosen = ship || bill;
  const source: PlaceOfSupplyResult['source'] =
    ship ? 'ship_to' : bill ? 'bill_to' : 'unknown';
  chosen = chosen.padStart(2, '0');
  const name = STATE_CODE_NAMES[chosen] ?? '';
  return {
    state_code: chosen,
    state_name: name,
    is_interstate: Boolean(supplier && chosen) && supplier !== chosen,
    source,
  };
}

/** Convenience: list of (code, label) for dropdowns. */
export function stateCodeOptions(): Array<{ code: string; label: string }> {
  return Object.entries(STATE_CODE_NAMES).map(([code, label]) => ({ code, label }));
}
