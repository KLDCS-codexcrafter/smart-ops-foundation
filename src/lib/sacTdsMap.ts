/**
 * sacTdsMap.ts — SAC to TDS section mapping
 * Used by Payment voucher intelligence when PO has service lines.
 * [JWT] Replace with GET /api/compliance/sac-tds-map
 */

export function mapSACtoTDSSection(sac: string): string {
  const s = sac.substring(0, 4);
  if (s === '9983') return '194J(a)'; // IT/tech services
  if (s === '9985') return '194C';     // manpower/labour
  if (s === '9997') return '194J(b)';  // legal/professional
  if (s === '9993') return '194J(b)';  // healthcare
  if (s === '9972') return '194I(b)';  // rental real estate
  if (s === '9967') return '194C';     // transport/freight
  if (s === '9954') return '194C';     // construction
  if (s === '9989') return '194J(a)';  // repair/maintenance
  return ''; // not deterministic — user must select
}
