/**
 * uqcMap.ts — Maps Fin Core UOM strings to GSTN UQC codes
 * [JWT] No API needed — static mapping
 */
export function mapUOMtoUQC(uom: string): string {
  const m: Record<string, string> = {
    'KG': 'KGS', 'KGS': 'KGS', 'KILO': 'KGS', 'KILOGRAM': 'KGS',
    'MTR': 'MTR', 'M': 'MTR', 'METER': 'MTR', 'METRE': 'MTR',
    'NOS': 'NOS', 'NO': 'NOS', 'PCS': 'NOS', 'PIECE': 'NOS', 'PIECES': 'NOS', 'UNIT': 'NOS',
    'LTR': 'LTR', 'L': 'LTR', 'LITRE': 'LTR', 'LITER': 'LTR',
    'SQM': 'SQM', 'SQF': 'SQF', 'CBM': 'CBM', 'TON': 'TON', 'MT': 'TON',
    'GM': 'GMS', 'GMS': 'GMS', 'GRAM': 'GMS',
    'PKT': 'PAC', 'PAC': 'PAC', 'BOX': 'BOX', 'SET': 'SET', 'PAIR': 'PAR',
    'DZ': 'DOZ', 'DOZEN': 'DOZ', 'ROLL': 'ROL', 'BAG': 'BAG', 'BTL': 'BTL',
  };
  return m[uom.toUpperCase().trim()] ?? 'OTH';
}
