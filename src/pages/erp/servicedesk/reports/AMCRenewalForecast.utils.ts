/**
 * @file        src/pages/erp/servicedesk/reports/AMCRenewalForecast.utils.ts
 * @purpose     Pure helper for 6-month renewal forecast computation · extracted from .tsx for react-refresh compliance
 * @sprint      T-Phase-1.C.1b.T1 · Block A
 * @iso        Functional Suitability + Maintainability
 */
import type { AMCRecord } from '@/types/servicedesk';

export type GroupBy = 'oem' | 'branch' | 'service_tier';

export function buildForecast(
  records: AMCRecord[],
  groupBy: GroupBy,
  now: Date = new Date(),
): { month: string; total: number; risk_adjusted: number; group: Record<string, number> }[] {
  const buckets: { month: string; total: number; risk_adjusted: number; group: Record<string, number>; ids: string[] }[] = [];
  for (let i = 0; i < 6; i += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    buckets.push({
      month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
      total: 0,
      risk_adjusted: 0,
      group: {},
      ids: [],
    });
  }
  records.forEach((r) => {
    if (!r.contract_end) return;
    const end = new Date(r.contract_end);
    const monthDiff = (end.getFullYear() - now.getFullYear()) * 12 + (end.getMonth() - now.getMonth());
    if (monthDiff < 0 || monthDiff > 5) return;
    const b = buckets[monthDiff];
    const value = r.contract_value_paise / 100;
    b.total += value;
    b.risk_adjusted += value * ((r.renewal_probability || 50) / 100);
    const key = groupBy === 'oem' ? (r.oem_name || 'unknown') : groupBy === 'branch' ? r.branch_id : 'tier';
    b.group[key] = (b.group[key] ?? 0) + value;
    b.ids.push(r.id);
  });
  return buckets;
}
